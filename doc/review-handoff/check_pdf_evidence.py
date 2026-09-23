#!/usr/bin/env python3
"""Check the 36-book inventory and bound HTML/DOM/PDF evidence, without a browser."""
from __future__ import annotations

import argparse
from collections import Counter
import html
import hashlib
from html.parser import HTMLParser
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/pdf-book'))
from inline_layout import validate_annotated_html


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def slug(stem):
    head = re.match(r'[A-Za-z0-9_-]*', stem).group(0)[:6].strip('_-') or 'book'
    return f'{head}-{hashlib.sha256(stem.encode()).hexdigest()[:6]}'


def token_pattern(token):
    # Only path separators permit a line break; spaces inside code remain significant.
    path_like = not re.search(r'\s', token) and ('/' in token or re.search(r'\w\.\w', token))
    pattern = ''.join(re.escape(char) + (r'(?:\r?\n[ \t]*)?' if path_like and char in '/.' else '')
                      for char in token)
    if token and re.match(r'[A-Za-z0-9_$]', token[0]):
        pattern = r'(?<![A-Za-z0-9_$])' + pattern
    if token and re.match(r'[A-Za-z0-9_$]', token[-1]):
        pattern += r'(?![A-Za-z0-9_$])'
    return re.compile(pattern)


def validate_audit_checks(dom, pdf_audit):
    checks = dom['dom_audit']['checks']
    unsupported = [name for name, check in checks.items() if check['status'] == 'unsupported']
    failed = [name for name, check in checks.items() if check['status'] not in ('pass', 'unsupported')]
    if (not checks or dom.get('result') != 'dom_pass_post_pdf_pending'
            or failed or set(unsupported) - {'post_pdf_text_and_geometry'}
            or dom['summary'].get('unsupported_checks') != len(unsupported)
            or dom['summary'].get('failed_checks') != 0
            or dom['dom_audit'].get('violations')
            or pdf_audit.get('result') != 'pass' or pdf_audit.get('issues') != []):
        raise ValueError('DOM/PDF check failed or unsupported check not resolved')


def parse_bbox_text(data):
    root = ET.fromstring(data)
    for node in root.iter():
        node.tag = node.tag.rsplit('}', 1)[-1]
    return [[[(word.text or '', tuple(float(word.attrib[k]) for k in
               ('xMin', 'yMin', 'xMax', 'yMax'))) for word in line.findall('word')]
             for line in page.iter('line')] for page in root.iter('page')]


def text_in_pdf_bbox(lines, rect):
    edges = [rect[k] for k in ('left', 'top', 'right', 'bottom')]
    if (any(not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v) for v in edges)
            or edges[2] <= edges[0] or edges[3] <= edges[1]):
        raise ValueError('invalid PDF token bbox')
    text, positions = '', []
    for line_index, words in enumerate(lines):
        selected = [(i, word) for i, (word, box) in enumerate(words)
                    if min(box[2], edges[2]) - max(box[0], edges[0]) > 0.5
                    and min(box[3], edges[3]) - max(box[1], edges[1]) > 0.5]
        if not selected:
            continue
        if text:
            text += '\n'
            positions.append(None)
        for index, (word_index, word) in enumerate(selected):
            if index:
                text += ' '
                positions.append(None)
            text += word
            positions.extend((line_index, word_index, c) for c in range(len(word)))
    return text, positions


def match_tokens(entries, observations, text, bbox_pages=None):
    """Flow follows page order; table text follows its PDF-bound line group."""
    if len(entries) != len(observations):
        raise ValueError('inline observation count mismatch')
    pages = text.split('\f')
    cursors, matches, issues = {}, [], []
    previous_page = -1
    seen_ids, selected_keys, used_table_characters = set(), set(), set()
    for index, (entry, observed) in enumerate(zip(entries, observations)):
        if entry['source_order'] != index or entry['id'] in seen_ids:
            raise ValueError('inline manifest order or duplicate ID')
        seen_ids.add(entry['id'])
        if (observed.get('id') != entry['id'] or observed.get('source_order') != index
                or observed.get('expected_text') != entry['expected_text']):
            raise ValueError('inline observation identity/order/text mismatch')
        page = observed.get('page_index')
        selected = observed.get('selected')
        if type(page) is not int or page < previous_page or not 0 <= page < len(pages) or not selected:
            raise ValueError('inline page/order/selection missing')
        previous_page = page
        key = (page, selected['key'])
        if key in selected_keys:
            raise ValueError('PDF occurrence reused for duplicate inline code')
        selected_keys.add(key)
        token = entry['expected_text']
        if not token:
            issues.append({'id': entry['id'], 'reason': 'empty_inline_unsupported'})
            continue
        if entry.get('context') == 'table':
            if bbox_pages is None or page >= len(bbox_pages):
                raise ValueError('table token requires PDF bbox extraction')
            local_text, positions = text_in_pdf_bbox(bbox_pages[page], selected['bbox'])
            chosen = None
            for candidate in token_pattern(token).finditer(local_text):
                keys = {(page, *p) for p in positions[candidate.start():candidate.end()] if p is not None}
                if keys and not keys.intersection(used_table_characters):
                    chosen = candidate
                    used_table_characters.update(keys)
                    break
            if chosen is None:
                issues.append({'id': entry['id'], 'page': page + 1, 'token': token,
                               'reason': 'contiguous_text_missing_in_pdf_bbox', 'bbox': selected['bbox']})
            else:
                matches.append({'id': entry['id'], 'page': page + 1, 'bbox': selected['bbox'],
                                'basis': 'pdf_bbox_line_group', 'path_break': '\n' in chosen.group()})
            continue
        match = token_pattern(token).search(pages[page], cursors.get(page, 0))
        if not match:
            issues.append({'id': entry['id'], 'page': page + 1, 'reason': 'contiguous_ordered_text_missing'})
            continue
        cursors[page] = match.end()
        matches.append({'id': entry['id'], 'page': page + 1,
                        'start': match.start(), 'end': match.end(),
                        'path_break': '\n' in match.group()})
    return {'expected': len(entries), 'matched': len(matches), 'matches': matches, 'issues': issues}


def finite_positive(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value > 0


def validate_structure(markup, manifest, structure):
    class Sections(HTMLParser):
        def __init__(self):
            super().__init__()
            self.orders = []

        def handle_starttag(self, tag, attrs):
            values = [value for key, value in attrs if key == 'data-pdf-source-table']
            if values:
                if tag != 'section' or len(values) != 1 or not re.fullmatch(r'0|[1-9][0-9]*', values[0] or ''):
                    raise ValueError('invalid stacked HTML identity')
                self.orders.append(int(values[0]))

    rows = structure['tables']
    if [r['source_order'] for r in rows] != list(range(len(rows))):
        raise ValueError('table structure order/duplicates')
    if any(row['layout'] not in ('table', 'stacked-definition-list') for row in rows):
        raise ValueError('unknown table structure')
    if sum(row['layout'] == 'table' for row in rows) != len(manifest['tables']):
        raise ValueError('surviving table structure count mismatch')
    parser = Sections()
    parser.feed(markup)
    parser.close()
    if parser.orders != [row['source_order'] for row in rows if row['layout'] == 'stacked-definition-list']:
        raise ValueError('stacked HTML and structure identities mismatch')


def validate_geometry(geometry):
    columns, cells = geometry.get('columns'), geometry.get('cells')
    count, rows = geometry.get('column_count'), geometry.get('row_count')
    if any(type(value) is not int or value < 1 for value in (count, rows)):
        raise ValueError('table row/column count missing')
    if not columns or not cells or [c['column_index'] for c in columns] != list(range(count)):
        raise ValueError('table columns/cells incomplete or duplicate')
    if any(not finite_positive(c['width']) for c in columns):
        raise ValueError('table column width nonpositive or nonfinite')
    occupied, row_indices = set(), {r: [] for r in range(rows)}
    previous = (-1, -1)
    for cell in cells:
        row, index, col, row_span, col_span = [cell.get(k) for k in
            ('row_index', 'cell_index', 'column_index', 'row_span', 'column_span')]
        if any(type(value) is not int for value in (row, index, col, row_span, col_span)):
            raise ValueError('table cell position missing')
        if (not 0 <= row < rows or index < 0 or not 0 <= col < count or row_span < 1 or col_span < 1
                or row + row_span > rows or col + col_span > count or (row, index) <= previous):
            raise ValueError('table cell position invalid or unordered')
        previous = (row, index)
        row_indices[row].append(index)
        for r in range(row, row + row_span):
            for c in range(col, col + col_span):
                if (r, c) in occupied:
                    raise ValueError('table cell grid overlap')
                occupied.add((r, c))
    if any(indices != list(range(len(indices))) for indices in row_indices.values()):
        raise ValueError('table cell indices incomplete')
    if len(occupied) != count * rows:
        raise ValueError('table cell grid incomplete')


def column_report(manifest, dom, structure):
    inventory = dom['dom_audit']['table_inventory']
    expected = [item['id'] for item in manifest['tables']]
    tables = inventory['tables']
    actual = [item['id'] for item in tables]
    if len(actual) != len(set(actual)) or set(expected) != set(actual):
        raise ValueError('table DOM inventory mismatch')
    if inventory.get('missing_ids') or inventory.get('unexpected_ids'):
        raise ValueError('table DOM coverage incomplete')
    rows, issues = [], []
    for table in tables:
        if not table['fragments']:
            raise ValueError('empty table geometry')
        for fragment in table['fragments']:
            geometry = fragment['geometry']
            validate_geometry(geometry)
            if geometry.get('status') != 'supported' or geometry.get('unsupported_columns'):
                issues.append({'id': table['id'], 'reason': 'unsupported_column_geometry'})
            for column in geometry.get('columns', []):
                rows.append({'id': table['id'], 'page': fragment['page_index'] + 1,
                             'column': column['column_index'], 'width_px': column['width']})
            for cell in geometry.get('cells', []):
                rect = cell['content_rect']
                width = rect['right'] - rect['left']
                font = cell.get('font_size_px')
                record = {'id': table['id'], 'page': fragment['page_index'] + 1,
                          'cell': [cell['row_index'], cell['cell_index']], 'content_width_px': width,
                          'font_size_px': font, 'has_prose': cell.get('has_prose'),
                          'full_width_capacity': width / font if finite_positive(font) else None}
                rows.append(record)
                if not finite_positive(width) or not finite_positive(font):
                    issues.append({'id': table['id'], 'reason': 'cell_width_or_font_unmeasured'})
                elif not isinstance(cell.get('has_prose'), bool):
                    issues.append({'id': table['id'], 'reason': 'cell_prose_presence_unmeasured'})
                elif cell['has_prose'] and width + 0.25 < font * 10:
                    issues.append({'id': table['id'], 'cell': record['cell'], 'reason': 'below_ten_full_width_characters'})
    stacked = [item for item in structure['tables'] if item['layout'] == 'stacked-definition-list']
    observed_stacked = dom['dom_audit'].get('stacked_inventory', [])
    if (len(observed_stacked) != len(stacked)
            or {i['source_order'] for i in observed_stacked} != {i['source_order'] for i in stacked}):
        issues.append({'reason': 'stacked_dom_measurement_missing_or_duplicate'})
    for item in observed_stacked:
        if not item.get('fragments'):
            issues.append({'reason': 'stacked_fragments_missing', 'source_order': item['source_order']})
        for fragment in item.get('fragments', []):
            if not fragment.get('cells'):
                issues.append({'reason': 'stacked_cells_missing', 'source_order': item['source_order']})
            for cell in fragment.get('cells', []):
                rect, font = cell['content_rect'], cell.get('font_size_px')
                width = rect['right'] - rect['left']
                rows.append({'source_order': item['source_order'], 'layout': 'stacked-definition-list',
                             'page': fragment['page_index'] + 1, 'role': cell['role'],
                             'content_width_px': width, 'font_size_px': font,
                             'full_width_capacity': width / font if finite_positive(font) else None})
                if not finite_positive(width) or not finite_positive(font) or width / font < 10:
                    issues.append({'reason': 'stacked_width_below_ten_or_unmeasured', 'source_order': item['source_order']})
    return {'measurements': rows, 'structure': structure['tables'], 'issues': issues}


# ビルド側の欧文保護 (scripts/pdf-book/table_latin.py の LATIN_RUN) と同じ字種にする。
# 片方だけ広いと、保護されない語や検査されない語が生まれる。test_pdf_evidence.py が一致を検査する。
IDENTIFIER = re.compile(r'[A-Za-z0-9_.()<>\[\]/-]*[A-Za-z0-9_][A-Za-z0-9_.()<>\[\]/-]*')
# CommonMark の HTML タグだけを落とす。`Record<string, number>` の `<string, number>` は
# タグ名に空白と記号を含むのでタグやなく、識別子の一部として残す。
HTML_TAG = re.compile(r'</?[A-Za-z][A-Za-z0-9-]*'
                      r'(?:\s+[A-Za-z_:][\w:.-]*(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s"\'=<>`]+))?)*'
                      r'\s*/?>')


def identifiers(text):
    return [m.group().rstrip('.') for m in IDENTIFIER.finditer(text)
            if len(m.group().rstrip('.')) >= 6]


def markdown_table_identifiers(source, role=None):
    tables, rows, fence = [], [], None
    def finish():
        if len(rows) >= 2 and re.fullmatch(r'[\s|:-]+', rows[1]):
            selected = rows[:1] if role == 'header' else rows[2:] if role == 'body' else rows[:1] + rows[2:]
            rendered = '\n'.join(selected)
            # バッククォート内の型表記は残し、表示されないHTML属性を除く。
            parts = re.split(r'(`+[^`]*`+)', rendered)
            rendered = ''.join(part if part.startswith('`') else HTML_TAG.sub('', part)
                               for part in parts)
            rendered = re.sub(r'\[([^]\n]+)\]\([^\n)]*\)', r'\1', rendered)
            tables.append(Counter(identifiers(html.unescape(rendered))))
        rows.clear()
    for line in source.splitlines():
        marker = re.match(r'^\s*(`{3,}|~{3,})', line)
        if marker:
            finish()
            if fence is None:
                fence = marker.group(1)
            elif marker.group(1)[0] == fence[0] and len(marker.group(1)) >= len(fence):
                fence = None
            continue
        if fence is not None:
            continue
        if line.strip().startswith('|'):
            rows.append(line.strip())
        else:
            finish()
    finish()
    return tables


def check_table_identifiers(source, manifest, dom, structure, bbox_data):
    expected = markdown_table_identifiers(source)
    body_expected = markdown_table_identifiers(source, 'body')
    if len(expected) != len(structure['tables']):
        raise ValueError('markdown/HTML table count mismatch for identifier coverage')
    bbox_pages = parse_bbox_text(bbox_data)
    xml = ET.fromstring(bbox_data)
    pdf_pages = [node for node in xml.iter() if node.tag.rsplit('}', 1)[-1] == 'page']
    page_boxes = {p['page_index']: p['rect'] for p in dom['dom_audit']['page_geometry']}
    ordinary = iter(manifest['tables'])
    inventory = {t['id']: t for t in dom['dom_audit']['table_inventory']['tables']}
    stacked = {t['source_order']: t for t in dom['dom_audit'].get('stacked_inventory', [])}
    records, issues, matched = [], [], 0
    used_pdf_characters = set()
    # 表のラテン文字保護 span (plain_latin) はセル本文そのものを分割した断片なので、
    # ここで独立トークンとして足すと `task.getById.invalidate` の `invalidate` が二重要求になる。
    inline_text = {e['id']: e['expected_text'] for e in manifest.get('entries', [])
                   if not e.get('plain_latin')}
    for table in structure['tables']:
        order = table['source_order']
        wanted, observed, body_observed = expected[order], Counter(), Counter()
        if table['layout'] == 'table':
            fragments = inventory[next(ordinary)['id']]['fragments']
        else:
            fragments = stacked[order]['fragments']
        for fragment in fragments:
            page = fragment['page_index']
            box = page_boxes[page]
            sx = float(pdf_pages[page].attrib['width']) / box['width']
            sy = float(pdf_pages[page].attrib['height']) / box['height']
            cells = fragment.get('geometry', {}).get('cells', fragment.get('cells', []))
            for cell_index, cell in enumerate(cells):
                tokens = Counter(t for t in identifiers(cell['text']) if t in wanted)
                rect = cell['content_rect']
                # textContentでは `checked`prop がcheckedpropへ連結されるため、
                # 同じセル内に実測されたインライン要素の境界を補う。
                inline_tokens = Counter()
                for group in dom['dom_audit'].get('observed', []):
                    value = inline_text.get(group['id'], '')
                    for item in group['items']:
                        code = item.get('code_rect', {})
                        if (item['page_index'] == page and code
                                and code['left'] >= rect['left'] - 0.25
                                and code['right'] <= rect['right'] + 0.25
                                and code['top'] >= rect['top'] - 0.25
                                and code['bottom'] <= rect['bottom'] + 0.25):
                            inline_tokens.update(t for t in identifiers(value) if t in wanted)
                tokens |= inline_tokens
                if not tokens:
                    continue
                pdf_rect = {k: (rect[k] - box['left' if k in ('left', 'right') else 'top'])
                            * (sx if k in ('left', 'right') else sy)
                            for k in ('left', 'top', 'right', 'bottom')}
                local_text, positions = text_in_pdf_bbox(bbox_pages[page], pdf_rect)
                is_header = cell.get('tag') == 'TH' or cell.get('role') == 'dt'
                for token in tokens.elements():
                    observed[token] += 1
                    if not is_header:
                        body_observed[token] += 1
                    record = {'source_table': order, 'page': page + 1, 'cell': cell_index,
                              'token': token, 'bbox': pdf_rect}
                    def occurrence_keys(match):
                        return {(page, *p) for p in positions[match.start():match.end()] if p is not None}
                    match = next((m for m in token_pattern(token).finditer(local_text)
                                  if occurrence_keys(m) and not used_pdf_characters.intersection(occurrence_keys(m))), None)
                    if match:
                        used_pdf_characters.update(occurrence_keys(match))
                        matched += 1
                        record['status'] = 'pass'
                    else:
                        record['reason'] = 'table_identifier_missing_or_midword_split'
                        issues.append(record.copy())
                    records.append(record)
        missing = (wanted - observed) | (body_expected[order] - body_observed)
        for token, count in missing.items():
            issues.append({'source_table': order, 'token': token, 'missing_occurrences': count,
                           'reason': 'markdown_identifier_missing_from_table_DOM'})
    return {'source_occurrences': sum(sum(c.values()) for c in expected),
            'checked_occurrences': len(records), 'matched': matched,
            'observations': records, 'issues': issues}


def check_book(root, source, pdf, work, extractor):
    book_slug = slug(source.stem)
    paths = {'source': source, 'pdf': pdf, 'html': work / f'{book_slug}.html',
             'inline_manifest': work / f'{book_slug}.inline-manifest.json',
             'inline_layout': work / f'{book_slug}.inline-layout.json',
             'inline_pdf': work / f'{book_slug}.inline-pdf.json',
             'table_structure': work / f'{book_slug}.table-structure.json',
             'per_book_css': work / f'{book_slug}.css',
             'config': work / f'{book_slug}.config.cjs',
             'book_css': work / 'book.css',
             'source_book_css': root / 'material/style/book.css'}
    result = {'name': pdf.name, 'status': 'incomplete', 'issues': [], 'artifacts': {}}
    for key, path in paths.items():
        if path.is_file():
            result['artifacts'][key] = {'path': str(path), 'sha256': digest(path)}
        else:
            result['issues'].append(f'missing:{key}')
    binding_path = work / f'{book_slug}.evidence-binding.json'
    if not binding_path.is_file():
        result['issues'].append('missing:build_evidence_binding')
    if result['issues']:
        return result
    try:
        binding = read_json(binding_path)
        if binding.get('schema_version') != 1 or binding.get('document_id') != book_slug:
            raise ValueError('binding schema/document mismatch')
        for key, path in paths.items():
            bound = binding['artifacts'][key]
            bound_path = Path(bound['path'])
            if not bound_path.is_absolute():
                bound_path = root / bound_path
            if bound_path.resolve() != path.resolve() or bound['sha256'] != digest(path):
                raise ValueError(f'stale_or_wrong_binding:{key}')
        if digest(paths['book_css']) != digest(paths['source_book_css']):
            raise ValueError('copied_book_css_differs_from_current_source')
        manifest, dom, pdf_audit, structure = [read_json(paths[k]) for k in
                                             ('inline_manifest', 'inline_layout', 'inline_pdf', 'table_structure')]
        for data in (manifest, dom, pdf_audit, structure):
            if data.get('schema_version') != 1 or data.get('document_id') != book_slug:
                raise ValueError('artifact schema/document mismatch')
        validate_annotated_html(paths['html'].read_text(encoding='utf-8'), manifest)
        if structure.get('source_sha256') != digest(source):
            raise ValueError('table structure source mismatch')
        validate_structure(paths['html'].read_text(encoding='utf-8'), manifest, structure)
        validate_audit_checks(dom, pdf_audit)
        for key, artifact in [('manifest', 'inline_manifest'), ('dom_report', 'inline_layout'), ('final_pdf', 'pdf')]:
            if pdf_audit['inputs'][key]['sha256'] != digest(paths[artifact]):
                raise ValueError(f'PDF audit binding mismatch:{key}')
        extracted = subprocess.run([extractor, '-layout', str(pdf), '-'], check=True,
                                   capture_output=True, timeout=120).stdout
        text = extracted.decode('utf-8', errors='strict')
        result['text_sha256'] = hashlib.sha256(extracted).hexdigest()
        bbox_pages = None
        if structure['tables'] or any(e.get('context') == 'table' for e in manifest['entries']):
            bbox_data = subprocess.run([extractor, '-bbox-layout', str(pdf), '-'], check=True,
                                       capture_output=True, timeout=120).stdout
            result['bbox_text_sha256'] = hashlib.sha256(bbox_data).hexdigest()
            bbox_pages = parse_bbox_text(bbox_data)
        result['inline'] = match_tokens(manifest['entries'], pdf_audit['observations'], text, bbox_pages)
        result['columns'] = column_report(manifest, dom, structure)
        result['table_identifiers'] = (check_table_identifiers(
            source.read_text(encoding='utf-8'), manifest, dom, structure, bbox_data)
            if structure['tables'] else {'source_occurrences': 0, 'checked_occurrences': 0,
                                         'matched': 0, 'observations': [], 'issues': []})
        result['issues'] += result['table_identifiers']['issues']
        result['issues'] += result['inline']['issues'] + result['columns']['issues']
        for key, path in paths.items():
            if digest(path) != result['artifacts'][key]['sha256']:
                raise ValueError(f'artifact_changed_during_check:{key}')
        result['status'] = 'fail' if result['issues'] else 'pass'
    except (ValueError, KeyError, TypeError, OSError, ET.ParseError, subprocess.SubprocessError) as error:
        result['status'] = 'fail'
        result['issues'].append(str(error))
    return result


def run(root, work, pdf_dir, extractor):
    sources = sorted((root / 'material/30days-curriculum').glob('*.md'))
    catalog = read_json(root / 'scripts/pdf-book/pdf-link-map.json')
    expected = [row['name'] for row in catalog]
    issues = []
    if len(expected) != 36 or len(set(expected)) != 36:
        issues.append('canonical_catalog_not_36_unique_books')
    if set(expected) != {s.with_suffix('.pdf').name for s in sources}:
        issues.append('source_catalog_mismatch')
    actual = {p.name for p in pdf_dir.glob('*.pdf')}
    missing, unexpected = sorted(set(expected) - actual), sorted(actual - set(expected))
    if missing or unexpected:
        issues.append('PDF_inventory_incomplete_or_unexpected')
    books = [check_book(root, source, pdf_dir / source.with_suffix('.pdf').name, work, extractor)
             for source in sources]
    return {'schema_version': 1, 'scope': 'bound-inline-and-plain-table-identifiers-and-column-measurements-not-full-visual-audit',
            'status': 'pass' if not issues and len(books) == 36 and all(b['status'] == 'pass' for b in books) else 'incomplete_or_failed',
            'expected_books': 36, 'available_pdfs': len(actual & set(expected)),
            'passed_books': sum(b['status'] == 'pass' for b in books),
            'missing_pdfs': missing, 'unexpected_pdfs': unexpected, 'issues': issues, 'books': books}


def report_summary(report, full_path):
    return {'schema_version': 1, 'scope': report['scope'], 'status': report['status'],
            'expected_books': report['expected_books'], 'available_pdfs': report['available_pdfs'],
            'passed_books': report['passed_books'],
            'full_report': {'path': str(full_path), 'sha256': digest(full_path)},
            'books': [{'name': b['name'], 'status': b['status'],
                       'pdf_sha256': b.get('artifacts', {}).get('pdf', {}).get('sha256'),
                       'issues': b['issues']} for b in report['books']]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--work-dir', type=Path)
    parser.add_argument('--pdf-dir', type=Path)
    parser.add_argument('--pdftotext', default='pdftotext')
    parser.add_argument('--report', type=Path, default=ROOT / 'dist/pdf-evidence-report.json')
    parser.add_argument('--summary', type=Path, help='Small tracked summary; full observations stay in --report')
    args = parser.parse_args()
    if args.summary and args.summary.resolve() == args.report.resolve():
        parser.error('--summary and --report must be different files')
    root = args.root.resolve()
    report = run(root, args.work_dir or root / 'dist/.pdf-book-build', args.pdf_dir or root / 'dist/pdf', args.pdftotext)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    if args.summary:
        args.summary.parent.mkdir(parents=True, exist_ok=True)
        args.summary.write_text(json.dumps(report_summary(report, args.report), ensure_ascii=False, indent=2) + '\n')
    print(f"{report['status']}: {report['passed_books']}/36 passed, {report['available_pdfs']}/36 PDFs; {args.report}")
    return 0 if report['status'] == 'pass' else 1


if __name__ == '__main__':
    raise SystemExit(main())
