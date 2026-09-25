"""Regression checks for evidence false positives; no browser or PDF generator."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('evidence', Path(__file__).with_name('check_pdf_evidence.py'))
evidence = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(evidence)


def load_table_latin():
    pdf_book = Path(__file__).resolve().parents[2] / 'scripts/pdf-book'
    sys.path.insert(0, str(pdf_book))
    try:
        spec = importlib.util.spec_from_file_location('table_latin', pdf_book / 'table_latin.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    finally:
        sys.path.remove(str(pdf_book))
    return module


def fixture(tokens):
    entries = [{'id': f'i{x}', 'source_order': x, 'expected_text': text} for x, text in enumerate(tokens)]
    observations = [{**entry, 'page_index': 0, 'selected': {'key': str(x)}} for x, entry in enumerate(entries)]
    return entries, observations


class TokenTests(unittest.TestCase):
    def check(self, tokens, text):
        return evidence.match_tokens(*fixture(tokens), text)

    def test_contiguous_duplicate_instances(self):
        self.assertEqual(self.check(['userId', 'userId'], 'userId userId')['matched'], 2)

    def test_one_duplicate_cannot_cover_two(self):
        self.assertEqual(self.check(['userId', 'userId'], 'userId')['matched'], 1)

    def test_order_is_required(self):
        self.assertTrue(self.check(['alpha', 'beta'], 'beta alpha')['issues'])

    def test_midtoken_newline_is_not_stripped(self):
        self.assertTrue(self.check(['DATABASE_URL'], 'DATABASE_\nURL')['issues'])

    def test_midtoken_spaces_are_not_stripped(self):
        self.assertTrue(self.check(['userId'], 'user Id')['issues'])

    def test_path_breaks_only_after_separator(self):
        self.assertFalse(self.check(['src/app/page.tsx'], 'src/\n  app/page.\n tsx')['issues'])
        for text in ['src/ap\np/page.tsx', 'src/app/page\n.tsx', 'src/app/pa ge.tsx']:
            with self.subTest(text=text):
                self.assertTrue(self.check(['src/app/page.tsx'], text)['issues'])

    def test_substring_does_not_count(self):
        self.assertTrue(self.check(['userId'], 'other_userId2')['issues'])

    def test_command_whitespace_stays_significant(self):
        self.assertTrue(self.check(['npm run dev'], 'npm   run dev')['issues'])

    def test_wrong_physical_page_does_not_count(self):
        self.assertTrue(self.check(['userId'], '\fuserId')['issues'])

    def test_observation_reuse_rejected(self):
        entries, observed = fixture(['userId', 'userId'])
        observed[1]['selected']['key'] = observed[0]['selected']['key']
        with self.assertRaisesRegex(ValueError, 'reused'):
            evidence.match_tokens(entries, observed, 'userId userId')

    def test_missing_and_reordered_observation_rejected(self):
        entries, observed = fixture(['a', 'b'])
        for invalid in [observed[:1], observed[::-1]]:
            with self.assertRaises(ValueError):
                evidence.match_tokens(entries, invalid, 'a b')


class RoundThreeTests(unittest.TestCase):
    def test_named_deferred_check_requires_successful_pdf_audit(self):
        dom = {'result': 'dom_pass_post_pdf_pending',
               'summary': {'failed_checks': 0, 'unsupported_checks': 1},
               'dom_audit': {'violations': [], 'checks': {
                   'renderer_ready': {'status': 'pass'},
                   'post_pdf_text_and_geometry': {'status': 'unsupported'}}}}
        audit = {'result': 'pass', 'issues': []}
        evidence.validate_audit_checks(dom, audit)
        for name, status in [('other_check', 'unsupported'), ('renderer_ready', 'fail')]:
            bad = copy.deepcopy(dom)
            bad['dom_audit']['checks'][name] = {'status': status}
            with self.subTest(name=name), self.assertRaises(ValueError):
                evidence.validate_audit_checks(bad, audit)
        for bad in [{'result': 'fail', 'issues': []}, {'result': 'pass', 'issues': ['bad']}]:
            with self.assertRaises(ValueError):
                evidence.validate_audit_checks(dom, bad)

    def test_table_interleaving_uses_own_pdf_bbox(self):
        entries, obs = fixture(['Pie', 'Cell'])
        for e in entries:
            e['context'] = 'table'
        obs[0]['selected']['bbox'] = {'left': 10, 'top': 20, 'right': 30, 'bottom': 30}
        obs[1]['selected']['bbox'] = {'left': 100, 'top': 10, 'right': 125, 'bottom': 20}
        xml = b'<doc><page><flow><block><line><word xMin="100" yMin="10" xMax="125" yMax="20">Cell</word></line><line><word xMin="10" yMin="20" xMax="30" yMax="30">Pie</word></line><line><word xMin="100" yMin="30" xMax="145" yMax="40">wrapped</word></line></block></flow></page></doc>'
        bbox = evidence.parse_bbox_text(xml)
        result = evidence.match_tokens(entries, obs, '       Cell\nPie\n       wrapped\f', bbox)
        self.assertEqual(result['matched'], 2)
        self.assertFalse(result['issues'])
        obs[1]['selected']['bbox']['left'] = 150
        obs[1]['selected']['bbox']['right'] = 175
        self.assertTrue(evidence.match_tokens(entries, obs, 'Cell Pie\f', bbox)['issues'])

    def test_table_duplicate_bbox_cannot_cover_two_occurrences(self):
        entries, obs = fixture(['Cell', 'Cell'])
        for entry, observed in zip(entries, obs):
            entry['context'] = 'table'
            observed['selected']['bbox'] = {'left': 0, 'top': 0, 'right': 30, 'bottom': 10}
        xml = b'<doc><page><line><word xMin="0" yMin="0" xMax="30" yMax="10">Cell</word></line></page></doc>'
        result = evidence.match_tokens(entries, obs, 'Cell Cell\f', evidence.parse_bbox_text(xml))
        self.assertEqual(result['matched'], 1)


class PlainTableIdentifierTests(unittest.TestCase):
    def check_shape(self, lines):
        return self.check_cells('| 原因 | 解決方法 |\n|---|---|\n| DeleteConfirmDialog | task.getById.invalidate |',
                                ['DeleteConfirmDialog', 'task.getById.invalidate'], lines)

    def check_cells(self, source, texts, lines):
        manifest = {'tables': [{'id': 't'}]}
        cells = [{'text': texts[0], 'content_rect': {'left': 0, 'top': 0, 'right': 90, 'bottom': 60}},
                 {'text': texts[1], 'content_rect': {'left': 100, 'top': 0, 'right': 220, 'bottom': 60}}]
        dom = {'dom_audit': {'page_geometry': [{'page_index': 0, 'rect': {'left': 0, 'top': 0, 'width': 300, 'height': 300}}],
               'table_inventory': {'tables': [{'id': 't', 'fragments': [{'page_index': 0, 'geometry': {'cells': cells}}]}]},
               'stacked_inventory': []}}
        structure = {'tables': [{'source_order': 0, 'layout': 'table'}]}
        xml = ('<doc><page width="300" height="300">' + lines + '</page></doc>').encode()
        return evidence.check_table_identifiers(source, manifest, dom, structure, xml)

    def test_day19_wrapped_plain_identifiers_fail_then_safe_shape_passes(self):
        broken = '<line><word xMin="0" yMin="5" xMax="85" yMax="15">DeleteConfirmDialo</word></line><line><word xMin="0" yMin="25" xMax="8" yMax="35">g</word></line><line><word xMin="100" yMin="5" xMax="215" yMax="15">task.getById.invalid</word></line><line><word xMin="100" yMin="25" xMax="120" yMax="35">ate</word></line>'
        result = self.check_shape(broken)
        self.assertEqual({i['token'] for i in result['issues']}, {'DeleteConfirmDialog', 'task.getById.invalidate'})
        safe = '<line><word xMin="0" yMin="5" xMax="85" yMax="15">DeleteConfirmDialog</word></line><line><word xMin="100" yMin="5" xMax="150" yMax="15">task.getById.</word></line><line><word xMin="100" yMin="25" xMax="170" yMax="35">invalidate</word></line>'
        self.assertFalse(self.check_shape(safe)['issues'])

    def test_real_day19_page91_fixture_detects_both_reported_splits(self):
        path = Path(__file__).parent / 'fixture/day19-table-identifier.json'
        data = json.loads(path.read_text())
        result = evidence.check_table_identifiers(data['source'], data['manifest'], data['dom'],
                                                 data['structure'], data['bbox_xml'].encode())
        self.assertEqual({i['token'] for i in result['issues']},
                         {'task.getById.invalidate', 'DeleteConfirmDialog'})
        self.assertEqual(result['matched'], 0)

    def test_same_token_in_other_cell_does_not_cover_missing_token(self):
        text = '<line><word xMin="100" yMin="5" xMax="180" yMax="15">DeleteConfirmDialog</word></line><line><word xMin="100" yMin="25" xMax="215" yMax="35">task.getById.invalidate</word></line>'
        self.assertTrue(self.check_shape(text)['issues'])

    def test_repeated_header_cannot_cover_missing_body_identifier(self):
        source = '| Identifier |\n|---|\n| Identifier |'
        cell = {'tag': 'TH', 'text': 'Identifier',
                'content_rect': {'left': 0, 'top': 0, 'right': 100, 'bottom': 30}}
        dom = {'dom_audit': {
            'page_geometry': [{'page_index': i, 'rect': {'left': 0, 'top': 0, 'width': 300, 'height': 300}}
                              for i in range(2)],
            'table_inventory': {'tables': [{'id': 't', 'fragments': [
                {'page_index': i, 'geometry': {'cells': [cell]}} for i in range(2)]}]},
            'stacked_inventory': []}}
        xml = ('<doc>' + ''.join('<page width="300" height="300"><line><word xMin="0" yMin="0" '
                                'xMax="70" yMax="10">Identifier</word></line></page>' for _ in range(2))
               + '</doc>').encode()
        result = evidence.check_table_identifiers(source, {'tables': [{'id': 't'}]}, dom,
                                                   {'tables': [{'source_order': 0, 'layout': 'table'}]}, xml)
        self.assertEqual(result['matched'], 2)
        self.assertEqual(result['issues'], [{'source_table': 0, 'token': 'Identifier',
                                             'missing_occurrences': 1,
                                             'reason': 'markdown_identifier_missing_from_table_DOM'}])

    def test_markdown_fences_are_not_tables_and_backticks_are_included(self):
        text = '```text\n| FakeIdentifier |\n|---|\n```\n| 名前 |\n|---|\n| `RealIdentifier` PlainIdentifier |'
        tables = evidence.markdown_table_identifiers(text)
        self.assertEqual(len(tables), 1)
        self.assertEqual(tables[0], {'RealIdentifier': 1, 'PlainIdentifier': 1})
        self.assertEqual(evidence.markdown_table_identifiers('| 名前 |\n|---|\n| <input checked="checked"> `Array<string>` |')[0], {'Array<string>': 1})

    def test_generic_type_with_comma_is_not_stripped_as_html_tag(self):
        self.assertEqual(evidence.markdown_table_identifiers('| 型 |\n|---|\n| Record<string, number> |')[0],
                         {'Record<string': 1, 'number>': 1})
        self.assertEqual(evidence.markdown_table_identifiers('| 型 |\n|---|\n| <br/> <img src="a.png" alt="x"> Record<string, number> |')[0],
                         {'Record<string': 1, 'number>': 1})

    def test_plain_latin_segment_span_inside_cell_is_not_a_separate_token(self):
        # ビルド側が `task.getById.invalidate` を `task.` / `getById.` / `invalidate` の span に割る。
        # 断片 `invalidate` は別セルの識別子でもあるが、セル本文の照合で文字を使い切った後に
        # 断片を独立トークンとして再要求してはならない。
        source = '| 原因 | 解決方法 |\n|---|---|\n| invalidate 忘れ | task.getById.invalidate |'
        manifest = {'tables': [{'id': 't'}], 'entries': [
            {'id': 'seg-1', 'expected_text': 'task.', 'context': 'table', 'plain_latin': True},
            {'id': 'seg-2', 'expected_text': 'getById.', 'context': 'table', 'plain_latin': True},
            {'id': 'seg-3', 'expected_text': 'invalidate', 'context': 'table', 'plain_latin': True}]}
        cells = [{'text': 'invalidate 忘れ', 'content_rect': {'left': 0, 'top': 0, 'right': 90, 'bottom': 60}},
                 {'text': 'task.getById.invalidate', 'content_rect': {'left': 100, 'top': 0, 'right': 220, 'bottom': 60}}]
        observed = [{'id': i, 'items': [{'page_index': 0, 'code_rect': {'left': 105, 'top': 5, 'right': 200, 'bottom': 15}}]}
                    for i in ('seg-1', 'seg-2', 'seg-3')]
        dom = {'dom_audit': {'page_geometry': [{'page_index': 0, 'rect': {'left': 0, 'top': 0, 'width': 300, 'height': 300}}],
               'table_inventory': {'tables': [{'id': 't', 'fragments': [{'page_index': 0, 'geometry': {'cells': cells}}]}]},
               'stacked_inventory': [], 'observed': observed}}
        structure = {'tables': [{'source_order': 0, 'layout': 'table'}]}
        lines = ('<line><word xMin="0" yMin="5" xMax="60" yMax="15">invalidate</word></line>'
                 '<line><word xMin="100" yMin="5" xMax="215" yMax="15">task.getById.invalidate</word></line>')
        xml = ('<doc><page width="300" height="300">' + lines + '</page></doc>').encode()
        result = evidence.check_table_identifiers(source, manifest, dom, structure, xml)
        self.assertEqual(result['issues'], [])
        self.assertEqual(result['matched'], 2)
        # plain_latin 無しの補完 (本物のバッククォート要素) は引き続き独立トークンとして要求される。
        manifest['entries'].append({'id': 'code-1', 'expected_text': 'invalidate', 'context': 'table'})
        observed.append({'id': 'code-1', 'items': [{'page_index': 0, 'code_rect': {'left': 105, 'top': 20, 'right': 200, 'bottom': 30}}]})
        result = evidence.check_table_identifiers(source, manifest, dom, structure, xml)
        self.assertEqual([(i['cell'], i['token']) for i in result['issues']], [(1, 'invalidate')])

    def test_identifier_alphabet_matches_build_side_latin_run(self):
        self.assertEqual(evidence.IDENTIFIER.pattern, load_table_latin().LATIN_RUN.pattern)

    def test_hyphen_digit_and_slash_identifiers_are_covered(self):
        source = '| ライブラリ | 例 |\n|---|---|\n| date-fns 1024px | /lib/utils 2024-01-01 |'
        self.assertEqual(evidence.markdown_table_identifiers(source)[0],
                         {'date-fns': 1, '1024px': 1, '/lib/utils': 1, '2024-01-01': 1})
        texts = ['date-fns 1024px', '/lib/utils 2024-01-01']
        broken = ('<line><word xMin="0" yMin="5" xMax="40" yMax="15">date-</word></line>'
                  '<line><word xMin="0" yMin="25" xMax="20" yMax="35">fns</word>'
                  '<word xMin="25" yMin="25" xMax="60" yMax="35">1024p</word></line>'
                  '<line><word xMin="0" yMin="45" xMax="8" yMax="55">x</word></line>'
                  '<line><word xMin="100" yMin="5" xMax="160" yMax="15">/lib/uti</word></line>'
                  '<line><word xMin="100" yMin="25" xMax="115" yMax="35">ls</word>'
                  '<word xMin="120" yMin="25" xMax="180" yMax="35">2024-01-</word></line>'
                  '<line><word xMin="100" yMin="45" xMax="115" yMax="55">01</word></line>')
        result = self.check_cells(source, texts, broken)
        self.assertEqual({i['token'] for i in result['issues']}, {'date-fns', '1024px', '/lib/utils', '2024-01-01'})
        safe = ('<line><word xMin="0" yMin="5" xMax="60" yMax="15">date-fns</word>'
                '<word xMin="65" yMin="5" xMax="89" yMax="15">1024px</word></line>'
                '<line><word xMin="100" yMin="5" xMax="130" yMax="15">/lib/</word></line>'
                '<line><word xMin="100" yMin="25" xMax="140" yMax="35">utils</word>'
                '<word xMin="145" yMin="25" xMax="215" yMax="35">2024-01-01</word></line>')
        result = self.check_cells(source, texts, safe)
        self.assertFalse(result['issues'])
        self.assertEqual(result['matched'], 4)


class BoundEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.work = self.root / 'work'
        self.work.mkdir()
        self.source = self.root / 'day01.md'
        self.source.write_text('source')
        self.pdf = self.root / 'day01.pdf'
        self.pdf.write_bytes(b'fixture PDF; extractor mocked')
        self.slug = evidence.slug(self.source.stem)
        markup, manifest = evidence.validate_annotated_html.__globals__['annotate_inline_code']('<p><code>token</code></p>', self.slug)
        self.paths = {'source': self.source, 'pdf': self.pdf, 'html': self.work / f'{self.slug}.html'}
        self.paths['html'].write_text(markup)
        self.paths.update({'per_book_css': self.work / f'{self.slug}.css',
                           'config': self.work / f'{self.slug}.config.cjs',
                           'book_css': self.work / 'book.css',
                           'source_book_css': self.root / 'material/style/book.css'})
        self.paths['source_book_css'].parent.mkdir(parents=True)
        for name in ('book_css', 'source_book_css', 'per_book_css'):
            self.paths[name].write_text('body { color: black; }')
        self.paths['config'].write_text('module.exports = {};')
        entries, obs = fixture(['token'])
        obs[0].update(manifest['entries'][0])
        dom = {'schema_version': 1, 'document_id': self.slug, 'result': 'dom_pass_post_pdf_pending',
               'summary': {'unsupported_checks': 0, 'failed_checks': 0},
               'dom_audit': {'violations': [], 'checks': {'renderer_ready': {'status': 'pass'}}, 'table_inventory': {'tables': [], 'missing_ids': [], 'unexpected_ids': []}}}
        structure = {'schema_version': 1, 'document_id': self.slug, 'source_sha256': evidence.digest(self.source), 'tables': []}
        for key, suffix, data in [('inline_manifest', 'inline-manifest', manifest), ('inline_layout', 'inline-layout', dom),
                                  ('table_structure', 'table-structure', structure)]:
            self.paths[key] = self.work / f'{self.slug}.{suffix}.json'
            self.paths[key].write_text(json.dumps(data))
        audit = {'schema_version': 1, 'document_id': self.slug, 'result': 'pass', 'issues': [], 'observations': obs,
                 'inputs': {k: {'sha256': evidence.digest(self.paths[a])} for k, a in
                            [('manifest', 'inline_manifest'), ('dom_report', 'inline_layout'), ('final_pdf', 'pdf')]}}
        self.paths['inline_pdf'] = self.work / f'{self.slug}.inline-pdf.json'
        self.paths['inline_pdf'].write_text(json.dumps(audit))
        self.bind()

    def bind(self):
        self.binding = self.work / f'{self.slug}.evidence-binding.json'
        self.binding.write_text(json.dumps({'schema_version': 1, 'document_id': self.slug,
                                'artifacts': {k: {'path': str(p), 'sha256': evidence.digest(p)} for k, p in self.paths.items()}}))

    def check(self):
        with patch.object(evidence.subprocess, 'run') as runner:
            runner.return_value.stdout = b'token\n\f'
            return evidence.check_book(self.root, self.source, self.pdf, self.work, 'pdftotext')

    def test_fully_bound_fixture_passes(self):
        self.assertEqual(self.check()['status'], 'pass')

    def test_every_artifact_hash_is_enforced(self):
        for key, path in self.paths.items():
            original = path.read_bytes()
            with self.subTest(key=key):
                path.write_bytes(original + b' ')
                self.assertEqual(self.check()['status'], 'fail')
                path.write_bytes(original)

    def test_old_pdf_audit_cannot_be_rebound_to_new_pdf(self):
        self.pdf.write_bytes(b'changed')
        self.bind()
        self.assertEqual(self.check()['status'], 'fail')

    def test_rebound_stale_copied_stylesheet_cannot_pass(self):
        self.paths['source_book_css'].write_text('body { color: blue; }')
        self.bind()
        result = self.check()
        self.assertEqual(result['status'], 'fail')
        self.assertIn('copied_book_css_differs_from_current_source', result['issues'])

    def test_render_configuration_and_css_are_required(self):
        for name in ('per_book_css', 'config', 'book_css', 'source_book_css'):
            path = self.paths[name]
            original = path.read_bytes()
            with self.subTest(name=name):
                path.unlink()
                self.assertEqual(self.check()['status'], 'incomplete')
                path.write_bytes(original)

    def test_missing_binding_is_incomplete(self):
        self.binding.unlink()
        self.assertEqual(self.check()['status'], 'incomplete')

    def test_missing_pdf_is_incomplete(self):
        self.pdf.unlink()
        self.assertEqual(self.check()['status'], 'incomplete')

    def test_all36_inventory_required(self):
        material = self.root / 'material/30days-curriculum'
        material.mkdir(parents=True)
        catalog = self.root / 'scripts/pdf-book/pdf-link-map.json'
        catalog.parent.mkdir(parents=True)
        names = [f'day{x:02}.pdf' for x in range(36)]
        catalog.write_text(json.dumps([{'name': n} for n in names]))
        for name in names:
            (material / Path(name).with_suffix('.md')).write_text('source')
        pdfdir = self.root / 'pdf'
        pdfdir.mkdir()
        for name in names[:22]:
            (pdfdir / name).write_bytes(b'pdf')
        with patch.object(evidence, 'check_book', return_value={'status': 'pass'}):
            report = evidence.run(self.root, self.work, pdfdir, 'pdftotext')
        self.assertEqual(report['status'], 'incomplete_or_failed')
        self.assertEqual(len(report['missing_pdfs']), 14)


class SummaryTests(unittest.TestCase):
    def test_summary_binds_full_report_and_keeps_pdf_hash_without_observations(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'full.json'
            report = {'scope': 'fixture', 'status': 'pass', 'expected_books': 36,
                      'available_pdfs': 36, 'passed_books': 36,
                      'books': [{'name': 'book.pdf', 'status': 'pass', 'issues': [],
                                 'artifacts': {'pdf': {'sha256': 'pdf-hash'}},
                                 'observations': ['large-detail']}]}
            path.write_text(json.dumps(report))
            summary = evidence.report_summary(report, path)
            self.assertEqual(summary['full_report']['sha256'], evidence.digest(path))
            self.assertEqual(summary['books'][0]['pdf_sha256'], 'pdf-hash')
            self.assertNotIn('observations', summary['books'][0])


class ColumnTests(unittest.TestCase):
    def test_unmeasured_stacked_layout_is_not_green(self):
        result = evidence.column_report({'tables': []}, {'dom_audit': {'table_inventory': {'tables': []}}},
                                        {'tables': [{'source_order': 0, 'layout': 'stacked-definition-list'}]})
        self.assertTrue(result['issues'])

    def test_narrow_and_missing_font_are_failures(self):
        cell = {'row_index': 0, 'cell_index': 0, 'content_rect': {'left': 0, 'right': 32}, 'font_size_px': 16, 'has_prose': True}
        cell.update({'column_index': 0, 'column_span': 1, 'row_span': 1})
        geometry = {'status': 'supported', 'column_count': 1, 'row_count': 1,
                    'columns': [{'column_index': 0, 'width': 40}], 'cells': [cell]}
        dom = {'dom_audit': {'table_inventory': {'tables': [{'id': 't', 'fragments': [{'page_index': 0, 'geometry': geometry}]}]}}}
        for font in [16, None, 0, float('nan')]:
            cell['font_size_px'] = font
            result = evidence.column_report({'tables': [{'id': 't'}]}, dom, {'tables': []})
            self.assertTrue(result['issues'])

    def test_code_only_narrow_column_does_not_fail_prose_floor(self):
        cell = {'row_index': 0, 'cell_index': 0, 'content_rect': {'left': 0, 'right': 32},
                'font_size_px': 16, 'has_prose': False}
        cell.update({'column_index': 0, 'column_span': 1, 'row_span': 1})
        geometry = {'status': 'supported', 'column_count': 1, 'row_count': 1,
                    'columns': [{'column_index': 0, 'width': 40}], 'cells': [cell]}
        dom = {'dom_audit': {'table_inventory': {'tables': [{'id': 't', 'fragments': [{'page_index': 0, 'geometry': geometry}]}]}}}
        self.assertFalse(evidence.column_report({'tables': [{'id': 't'}]}, dom, {'tables': []})['issues'])

    def test_empty_supported_geometry_cannot_pass(self):
        dom = {'dom_audit': {'table_inventory': {'tables': [{'id': 't', 'fragments': [
            {'page_index': 0, 'geometry': {'status': 'supported', 'columns': [], 'cells': []}}
        ]}]}}}
        with self.assertRaises(ValueError):
            evidence.column_report({'tables': [{'id': 't'}]}, dom, {'tables': []})

    def test_incomplete_duplicate_or_nonfinite_columns_cannot_pass(self):
        base = {'status': 'supported', 'column_count': 1, 'row_count': 1,
                'columns': [{'column_index': 0, 'width': 100}], 'cells': [
                    {'row_index': 0, 'cell_index': 0, 'column_index': 0, 'column_span': 1, 'row_span': 1,
                     'content_rect': {'left': 0, 'right': 100}, 'font_size_px': 10, 'has_prose': True}]}
        variants = []
        for columns in [[], [{'column_index': 1, 'width': 100}], [{'column_index': 0, 'width': 0}],
                        [{'column_index': 0, 'width': float('nan')}], base['columns'] * 2]:
            variants.append({**base, 'columns': columns})
        variants += [{**base, 'cells': []}, {**base, 'cells': base['cells'] * 2}, {**base, 'row_count': 2}]
        for geometry in variants:
            dom = {'dom_audit': {'table_inventory': {'tables': [{'id': 't', 'fragments': [
                {'page_index': 0, 'geometry': geometry}]}]}}}
            with self.subTest(geometry=geometry), self.assertRaises(ValueError):
                evidence.column_report({'tables': [{'id': 't'}]}, dom, {'tables': []})

    def test_structure_cannot_hide_or_invent_stacked_html(self):
        for markup, rows, tables in [
            ('<section data-pdf-source-table="0"></section>', [], []),
            ('<p>missing stack</p>', [{'source_order': 0, 'layout': 'stacked-definition-list'}], []),
            ('<p>missing table</p>', [{'source_order': 0, 'layout': 'table'}], []),
            ('<section data-pdf-source-table="0"></section>' * 2,
             [{'source_order': 0, 'layout': 'stacked-definition-list'}], []),
        ]:
            with self.subTest(markup=markup), self.assertRaises(ValueError):
                evidence.validate_structure(markup, {'tables': tables}, {'tables': rows})


if __name__ == '__main__':
    unittest.main()
