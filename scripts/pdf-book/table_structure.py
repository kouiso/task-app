"""表の情報を残したまま、幅不足の行をHTMLの定義リストへ展開する。"""

from __future__ import annotations

import hashlib
import html
import math
import re
from dataclasses import dataclass, field
from html.parser import HTMLParser

from inline_layout import HTML_VOID_ELEMENTS


@dataclass
class Element:
    tag: str
    attrs: dict
    start: int
    inner_start: int
    inner_end: int = 0
    end: int = 0
    children: list = field(default_factory=list)


class TableParser(HTMLParser):
    def __init__(self, markup):
        super().__init__(convert_charrefs=False)
        self.markup = markup
        self.lines = [0] + [i + 1 for i, c in enumerate(markup) if c == '\n']
        self.stack = []
        self.tables = []

    def position(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        start = self.position()
        node = Element(tag, dict(attrs), start, start + len(self.get_starttag_text()))
        if self.stack:
            self.stack[-1].children.append(node)
        if tag == 'table':
            if any(n.tag == 'table' for n in self.stack):
                raise ValueError('nested tableは自動変換できません')
            self.tables.append(node)
        if tag not in HTML_VOID_ELEMENTS:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in HTML_VOID_ELEMENTS:
            node = self.stack.pop()
            node.inner_end = node.end = node.inner_start

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1].tag != tag:
            raise ValueError('table変換前のHTMLタグが対応していません')
        node = self.stack.pop()
        node.inner_end = self.position()
        node.end = self.markup.index('>', node.inner_end) + 1


def _inner(source, node):
    return source[node.inner_start:node.inner_end]


def _attribute_text(attrs):
    return ''.join(f' {k}="{html.escape(v or "", quote=True)}"' for k, v in attrs.items())


def restructure_tables(markup: str, forced: dict[int, str] | None = None) -> tuple[str, list[dict]]:
    """原稿の表順を維持し、4列以上のコード入り表と実測指定の表を展開する。"""
    parser = TableParser(markup)
    parser.feed(markup)
    parser.close()
    if parser.stack:
        raise ValueError('table変換前のHTML要素が閉じていません')
    edits, report = [], []
    for order, table in enumerate(parser.tables):
        rows = []
        captions = []
        for child in table.children:
            if child.tag == 'tr':
                rows.append(child)
            elif child.tag in {'thead', 'tbody', 'tfoot'}:
                rows.extend(n for n in child.children if n.tag == 'tr')
            elif child.tag == 'caption':
                captions.append(child)
        columns = len(rows[0].children) if rows else 0
        has_code = bool(re.search(r'<code\b', markup[table.start:table.end]))
        reason = (forced or {}).get(order)
        if columns >= 4 and has_code:
            reason = 'four_or_more_columns_with_code'
        item = {'source_order': order, 'source_html_sha256': hashlib.sha256(markup[table.start:table.end].encode()).hexdigest(),
                'column_count': columns, 'has_code': has_code,
                'layout': 'stacked-definition-list' if reason else 'table', 'reason': reason}
        report.append(item)
        if not reason:
            continue
        if not rows or not columns or any(c.tag != 'th' for c in rows[0].children):
            raise ValueError('見出し行のない表は自動変換できません')
        if len(rows) < 2:
            raise ValueError('データ行のない表は自動変換できません')
        for child in table.children:
            if child.tag in {'thead', 'tbody', 'tfoot'}:
                if any(n.tag != 'tr' for n in child.children):
                    raise ValueError('未対応の行要素を省略できません')
                if child.attrs:
                    raise ValueError('属性付きの表グループは自動変換できません')
        for row in rows:
            if any(c.attrs.get('colspan', '1') != '1' or c.attrs.get('rowspan', '1') != '1' for c in row.children):
                raise ValueError('span付きの表は自動変換できません')
            if len(row.children) != columns or any(c.tag not in {'td', 'th'} for c in row.children):
                raise ValueError('列数が異なる表は自動変換できません')
        if rows[0].attrs:
            raise ValueError('属性付きの見出し行は自動変換できません')
        if any(c.tag not in {'caption', 'thead', 'tbody', 'tfoot', 'tr'} for c in table.children):
            raise ValueError('未対応の表要素を省略できません')
        attrs = dict(table.attrs)
        attrs['class'] = (attrs.get('class', '') + ' pdf-stacked-table').strip()
        attrs['data-pdf-source-table'] = str(order)
        parts = ['<section' + _attribute_text(attrs) + '>']
        for caption in captions:
            caption_attrs = dict(caption.attrs)
            caption_attrs['class'] = (caption_attrs.get('class', '') + ' pdf-table-caption').strip()
            parts.append('<div' + _attribute_text(caption_attrs) + '>' + _inner(markup, caption) + '</div>')
        headers = rows[0].children
        for row_index, row in enumerate(rows[1:]):
            row_attrs = dict(row.attrs)
            row_attrs['class'] = (row_attrs.get('class', '') + ' pdf-stacked-row').strip()
            parts.append('<div' + _attribute_text(row_attrs) + '><dl>')
            for header, cell in zip(headers, row.children):
                label = _inner(markup, header)
                # 元のアンカーは最初のラベルだけに残し、複製IDを作らない。
                if row_index:
                    label = re.sub(r'\s+id=(?:"[^"]*"|\x27[^\x27]*\x27)', '', label)
                h_attrs = {k: v for k, v in header.attrs.items() if k not in {'scope', 'style'} and (k != 'id' or not row_index)}
                parts += ['<dt' + _attribute_text(h_attrs) + '>' + label + '</dt>',
                          '<dd' + _attribute_text({k: v for k, v in cell.attrs.items() if k not in {'style', 'headers'}}) + '>' + _inner(markup, cell) + '</dd>']
            parts.append('</dl></div>')
        parts.append('</section>')
        item['data_rows'] = len(rows) - 1
        item['repeated_header_labels'] = max(0, len(rows) - 2) * columns
        edits.append((table.start, table.end, ''.join(parts)))
    for start, end, value in reversed(edits):
        markup = markup[:start] + value + markup[end:]
    return markup, report


def measured_tables_to_stack(manifest: dict, report: dict, remaining_orders: list[int]) -> dict[int, str]:
    """実際の本文セルが全角10文字を収められない表を指定する。"""
    dom = report.get('dom_audit', {})
    if dom.get('ready_state') != 'complete':
        raise ValueError('表の変換判断には組版済みの計測が必要です')
    tables = manifest.get('tables', [])
    if len(tables) != len(remaining_orders):
        raise ValueError('原稿と計測の表順が一致しません')
    by_id = {t['id']: t for t in dom.get('table_inventory', {}).get('tables', [])}
    result = {}
    id_to_order = {table['id']: order for table, order in zip(tables, remaining_orders)}
    observed = {item['id']: item for item in dom.get('observed', [])}
    for entry in manifest.get('entries', []):
        if not entry.get('plain_latin') or not entry.get('table_header'):
            continue
        items = observed.get(entry['id'], {}).get('items', [])
        if len(items) < 2:
            continue
        table_id = entry.get('table_id')
        pages = [item.get('page_index') for item in items]
        if (table_id not in id_to_order or any(not isinstance(page, int) for page in pages)
                or len(set(pages)) != len(pages)
                or any(item.get('table_geometry', {}).get('identity', {}).get('value') != table_id
                       or item.get('table_geometry', {}).get('target', {}).get('row_index') != 0
                       for item in items)):
            raise ValueError('繰り返された欧文見出しの表とページを証明できません')
        result[id_to_order[table_id]] = 'measured_repeated_latin_header'
    for table, order in zip(tables, remaining_orders):
        record = by_id.get(table['id'])
        if not record or not record.get('fragments'):
            raise ValueError('表の全fragmentの計測がありません')
        for fragment in record['fragments']:
            cells = fragment.get('geometry', {}).get('cells', [])
            if not cells:
                raise ValueError('表セルの実寸がありません')
            for cell in cells:
                if not isinstance(cell.get('has_prose'), bool):
                    raise ValueError('表セルの本文有無が計測されていません')
                if not cell['has_prose']:
                    continue
                width = cell.get('content_rect', {}).get('width')
                font = cell.get('font_size_px')
                if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or v <= 0 for v in (width, font)):
                    raise ValueError('本文列幅と書体の実寸がありません')
                if width < font * 10:
                    result[order] = 'measured_prose_width_below_10em'
    return result
