"""表の欧文を本文と同じ書体のまま改行不可の監査対象にする。"""
from __future__ import annotations

import html
import re
from html.parser import HTMLParser

from inline_layout import HTML_VOID_ELEMENTS

# 記号だけの並び(「/」「->」など)は欧文の語ではないので保護しない。英数字を1つ以上含む並びだけが対象。
LATIN_RUN = re.compile(r'[A-Za-z0-9_.()<>\[\]/-]*[A-Za-z0-9_][A-Za-z0-9_.()<>\[\]/-]*')


class TableLatinProtector(HTMLParser):
    def __init__(self, markup):
        super().__init__(convert_charrefs=False)
        self.markup = markup
        self.starts = [0] + [i + 1 for i, c in enumerate(markup) if c == '\n']
        self.stack = []
        self.pending = []
        self.edits = []

    def position(self):
        row, col = self.getpos()
        return self.starts[row - 1] + col

    def flush(self):
        if not self.pending:
            return
        start, end = self.pending[0][0], self.pending[-1][1]
        raw = self.markup[start:end]
        text = html.unescape(raw)
        if any(tag in {'td', 'th'} for tag in self.stack) and not any(tag in {'code', 'pre', 'script', 'style'} for tag in self.stack):
            def protect(match):
                segments = re.findall(r'[^./]*[./]|[^./]+', match.group())
                return '<wbr>'.join('<span class="pdf-table-latin">' + html.escape(segment, quote=False) + '</span>' for segment in segments)
            pieces, cursor = [], 0
            for match in LATIN_RUN.finditer(text):
                pieces += [html.escape(text[cursor:match.start()], quote=False), protect(match)]
                cursor = match.end()
            pieces.append(html.escape(text[cursor:], quote=False))
            self.edits.append((start, end, ''.join(pieces)))
        self.pending = []

    def handle_starttag(self, tag, attrs):
        self.flush()
        if tag not in HTML_VOID_ELEMENTS:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.flush()

    def handle_endtag(self, tag):
        self.flush()
        if not self.stack or self.stack[-1] != tag:
            raise ValueError('欧文保護前のHTMLタグが対応していません')
        self.stack.pop()

    def handle_data(self, data):
        self.pending.append((self.position(), self.position() + len(data)))

    def reference_end(self, prefix, name):
        # HTMLParser は末尾の「;」が無い参照も通知するので、原文を見て実際の長さを取る。
        start = self.position()
        if not self.markup.startswith(prefix + name, start):
            raise ValueError('欧文保護前の文字参照の位置が原文と一致しません')
        end = start + len(prefix) + len(name)
        return end + 1 if self.markup.startswith(';', end) else end

    def handle_entityref(self, name):
        self.pending.append((self.position(), self.reference_end('&', name)))

    def handle_charref(self, name):
        self.pending.append((self.position(), self.reference_end('&#', name)))

    def handle_comment(self, data):
        self.flush()

    def handle_decl(self, decl):
        self.flush()


def protect_table_latin(markup: str) -> str:
    parser = TableLatinProtector(markup)
    parser.feed(markup)
    parser.flush()
    parser.close()
    if parser.stack:
        raise ValueError('欧文保護前のHTML要素が閉じていません')
    for start, end, replacement in reversed(parser.edits):
        markup = markup[:start] + replacement + markup[end:]
    return markup
