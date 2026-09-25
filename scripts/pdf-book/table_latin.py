"""表と本文の欧文を同じ書体のまま改行不可の監査対象にする。"""
from __future__ import annotations

import html
import re
from html.parser import HTMLParser

from inline_layout import HTML_VOID_ELEMENTS

# 記号だけの並び(「/」「->」など)は欧文の語ではないので保護しない。英数字を1つ以上含む並びだけが対象。
LATIN_RUN = re.compile(r'[A-Za-z0-9_.()<>\[\]/-]*[A-Za-z0-9_][A-Za-z0-9_.()<>\[\]/-]*')

# 欧文の保護を当てるブロック要素。表のセル（td/th）と、本文の段落・箇条書き・見出し。
# react-hook-form のようなハイフン入りの語が表だけでなく地の文でも途中で折れるのを防ぐ。
# セルは縦展開後に dt/dd へ入れ替わるが、中身はセル内で先に保護済みなので dd/dt は不要。
TABLE_TARGETS = {'td', 'th'}
PROSE_TARGETS = {'p', 'li', 'figcaption', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}
# code/pre/script/style は中身が原稿通り出る前提のため別系統（インラインコード監査）が受け持つ。
EXCLUDED_TAGS = {'code', 'pre', 'script', 'style'}
# 表紙は letter-spacing で字間を広げており、抽出では1文字ずつに分かれて語として
# 一致しない。監査対象にすると必ず不一致になるので、表紙の中では保護しない。
EXCLUDED_ANCESTOR_CLASSES = {'cover'}


class TableLatinProtector(HTMLParser):
    def __init__(self, markup, targets=TABLE_TARGETS):
        super().__init__(convert_charrefs=False)
        self.markup = markup
        self.targets = targets
        self.starts = [0] + [i + 1 for i, c in enumerate(markup) if c == '\n']
        self.stack: list[tuple[str, set, bool]] = []
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
        tags = [tag for tag, _ in self.stack]
        classes = set().union(*(c for _, c in self.stack))
        if (
            any(tag in self.targets for tag in tags)
            and not any(tag in EXCLUDED_TAGS for tag in tags)
            and not classes & EXCLUDED_ANCESTOR_CLASSES
        ):
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
            self.stack.append((tag, set((dict(attrs).get('class') or '').split())))

    def handle_startendtag(self, tag, attrs):
        self.flush()

    def handle_endtag(self, tag):
        self.flush()
        if not self.stack or self.stack[-1][0] != tag:
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


def _protect_latin(markup: str, targets: set) -> str:
    parser = TableLatinProtector(markup, targets)
    parser.feed(markup)
    parser.flush()
    parser.close()
    if parser.stack:
        raise ValueError('欧文保護前のHTML要素が閉じていません')
    for start, end, replacement in reversed(parser.edits):
        markup = markup[:start] + replacement + markup[end:]
    return markup


def protect_table_latin(markup: str) -> str:
    return _protect_latin(markup, TABLE_TARGETS)


def protect_prose_latin(markup: str) -> str:
    return _protect_latin(markup, PROSE_TARGETS)


# ブロック末尾で1〜3文字だけ次の行へ残る端切れを防ぐ。末尾この文字数を
# 折れないスパンで包み、これより短い末尾しか作れない切れ目を無くす。
TAIL_KEEP_CHARS = 4
# 短い末尾（N未満）は直前の兄弟要素ごと包んで文字数を足す。上限は
# タグ込みの原文の長さ。超えると版面（全角49字分）をはみ出す
# 折れない塊ができてしまうので、小さい要素だけを対象にする。
TAIL_GLUE_MAX_RAW = 40
# span の内側に包んでもHTMLが壊れない、行内要素だけを直前の兄弟として認める。
# br と wbr は nowrap の内側でも強制・推奨改行として働くので包む意味がない
INLINE_TAIL_SIBLINGS = {
    'a', 'abbr', 'b', 'cite', 'code', 'em', 'i', 'kbd', 'mark',
    'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time',
    'u', 'var',
}
TAIL_SPAN_OPEN = '<span class="pdf-tail">'
# code と pdf-table-latin の span は実測で断片数を数える監査対象。
# 接着スパンに入れるとページの境で箱が二つに分かれ、監査が
# 「1つのコードを一意に測定できません」で止まる。中に含む親要素も同じ。
AUDITED_TAIL_TAGS = {'code'}
AUDITED_TAIL_CLASSES = {'pdf-table-latin', 'pdf-tail'}


class OrphanTailGlue(HTMLParser):
    """本文ノードの末尾を、折れないスパンで包んで端切れを防ぐ。

    直前が満行まで伸びた塊の最後が1文字だけだと、そこだけが次の行に残る
    （00_カリキュラム目次で「…を呼び出」→「す」が実際に出た）。
    段落末尾の数文字を一体にすれば、折返しは「末尾まとめて移動」にしかならない。
    不可視文字は pdftotext の語の結合を壊すので、スパンの開閉の挿入だけで済ませる。
    """

    def __init__(self, markup: str):
        super().__init__(convert_charrefs=False)
        self.markup = markup
        self.starts = [0] + [i + 1 for i, c in enumerate(markup) if c == '\n']
        self.stack: list[tuple[str, set, bool]] = []
        self.pending: list[tuple[int, int]] = []
        self.inserts: list[tuple[int, str]] = []
        # 深さごとに「最後に始まった兄弟要素」の (開始位置, タグ名, 監査対象を含むか) を
        # 覚える。`</em>す` のような短い末尾を、直前の要素ごと包むために使う。
        self.sibling_start: dict[int, list] = {}

    def position(self):
        row, col = self.getpos()
        return self.starts[row - 1] + col

    def flush(self):
        if self.pending:
            start, end = self.pending[0][0], self.pending[-1][1]
            skipped = any(
                tag in EXCLUDED_TAGS or 'pdf-table-latin' in classes
                for tag, classes, _ in self.stack
            )
            if not skipped:
                self.glue_tail(start, end)
        self.pending = []

    def glue_tail(self, start: int, end: int):
        # 末尾の空白は接着対象に含めない（閉じタグ直前の改行・インデントで誤判定しないため）
        while end > start and self.markup[end - 1].isspace():
            end -= 1
        if end <= start:
            return
        # 実体参照（&amp; 等）は1文字として数えながら、末尾から文字の先頭位置を拾う。
        positions = []
        cursor = end
        while cursor > start and len(positions) < TAIL_KEEP_CHARS:
            ref = re.search(r'&(?:#\d+|#x[0-9A-Fa-f]+|[A-Za-z][\w.-]*);$', self.markup[start:cursor])
            cursor -= len(ref.group()) if ref else 1
            positions.append(cursor)
        if len(positions) >= TAIL_KEEP_CHARS:
            # 末尾 N 文字を一体に包むと、N 文字未満の末尾は作れなくなる
            split = positions[TAIL_KEEP_CHARS - 1]
            self.inserts += [(split, TAIL_SPAN_OPEN), (end, '</span>')]
            return
        # ノード自体が N に足りないなら、直前の行内要素ごと包んで文字数を足す。
        # 監査対象の要素を含む兄弟は包まない（ページの境で箱が断片化するため）
        sibling = self.sibling_start.get(len(self.stack))
        if (
            sibling
            and sibling[1] in INLINE_TAIL_SIBLINGS
            and not sibling[2]
            and start - sibling[0] <= TAIL_GLUE_MAX_RAW
        ):
            self.inserts += [(sibling[0], TAIL_SPAN_OPEN), (end, '</span>')]

    def _discard_stale_siblings(self):
        # 深い位置の記録は閉じたブロックの中のもの。残すと次のブロックの
        # 短い末尾を別ブロックの要素まで跨いで包み、HTMLが壊れる
        self.sibling_start = {
            depth: value for depth, value in self.sibling_start.items()
            if depth <= len(self.stack)
        }

    def _audited(self, tag: str, classes: set) -> bool:
        return tag in AUDITED_TAIL_TAGS or bool(classes & AUDITED_TAIL_CLASSES)

    def handle_starttag(self, tag, attrs):
        self.flush()
        self._discard_stale_siblings()
        classes = set((dict(attrs).get('class') or '').split())
        audited = self._audited(tag, classes)
        self.sibling_start[len(self.stack)] = [self.position(), tag, audited]
        if tag not in HTML_VOID_ELEMENTS:
            self.stack.append((tag, classes, audited))

    def handle_startendtag(self, tag, attrs):
        self.flush()
        self._discard_stale_siblings()
        classes = set((dict(attrs).get('class') or '').split())
        self.sibling_start[len(self.stack)] = [
            self.position(), tag, self._audited(tag, classes)]

    def handle_endtag(self, tag):
        self.flush()
        if not self.stack or self.stack[-1][0] != tag:
            raise ValueError('語尾保護前のHTMLタグが対応していません')
        _, classes, audited = self.stack.pop()
        # 閉じた要素の中に監査対象があれば、その要素ごと包めないことを記録する。
        # 同時に親にも監査対象を含むことを伝える（`<em><code>…</code></em>が` 型）
        self.sibling_start[len(self.stack)] = [
            self.sibling_start.get(len(self.stack), [0, tag, audited])[0],
            tag, audited or bool(classes & AUDITED_TAIL_CLASSES)]
        if self.stack:
            tag0, classes0, audited0 = self.stack[-1]
            self.stack[-1] = (tag0, classes0, audited0 or audited)
        self._discard_stale_siblings()

    def handle_data(self, data):
        self.pending.append((self.position(), self.position() + len(data)))

    def reference_end(self, prefix, name):
        start = self.position()
        if not self.markup.startswith(prefix + name, start):
            raise ValueError('語尾保護前の文字参照の位置が原文と一致しません')
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


def keep_block_tails(markup: str) -> str:
    parser = OrphanTailGlue(markup)
    parser.feed(markup)
    parser.flush()
    parser.close()
    if parser.stack:
        raise ValueError('語尾保護前のHTML要素が閉じていません')
    for position, piece in sorted(parser.inserts, reverse=True):
        markup = markup[:position] + piece + markup[position:]
    return markup
