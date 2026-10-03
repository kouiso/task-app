"""行内コードの手前と途中に、ブラウザが折れる位置を作る。

本文の行内コードには NOWRAP_CSS で折返し禁止が当たるため、1行に入らない
コードは丸ごと次の行へ送られて手前の行の右へ大きな空きが残る。それでも
入らないコードは 8pt まで小さく縮む。組版へ渡す前の HTML を直して、
コードの手前と空白の位置に折れる余地を作る。

  - insert_wbr_before_code: 和文の字の直後に来る「前で改行できない字」で
    始まるコードの直前へ <wbr> を置く
  - split_long_inline_code: 半角空白を含む長いコードを空白の位置で複数の
    code に分ける。間の空白は背景色を付けた span に入れて見た目を1本に保つ

判定に使う一覧（改行できない15字・コマンド名・文字数の閾値）は
check_inline_break.py も同じものを読む。ここを2箇所で持つと、
変えたときに検査だけが旧い一覧で数えて組版と食い違う。
"""

from __future__ import annotations

import html
import re
from html.parser import HTMLParser

from inline_layout import HTML_VOID_ELEMENTS


class InlineBreakMarkupError(ValueError):
    """行内コードの組版前処理を安全に掛けられないHTMLを検出した。"""


# Chrome 148 での実測: 和文の字の直後では、これらの字で始まるコードの手前で
# 改行できない（直前の字がコードとくっついて一緒に次の行へ行く）。
NO_BREAK_BEFORE_CHARS = frozenset("!\"%'),-./:;?]|}")

# 直前の字が開き括弧なら <wbr> を置かない。行末に開き括弧だけが残る形になるため
OPENING_BRACKETS = frozenset("（「『【〔［｛〈《")

# 直前の字が和文かの判定下限。かな・漢字・全角の句読点と記号はすべて U+2E80 以上
CJK_CODEPOINT_FLOOR = 0x2E80

# 先頭の語がシェルのコマンド名なら分けない。PDF からコピーすると途中に改行が
# 入り、そこまでが実行されてしまうため
COMMAND_WORDS = frozenset(
    "git npm npx pnpm yarn cd unzip sudo bash sh ls mkdir docker gh biome "
    "lsof mise node cp mv rm cat curl psql chmod code echo kill brew apt "
    "tar touch find grep".split()
)

# 30字は本文1行（全角49字）のほぼ半分。これ以上で空白を含むコードを分ける
SPLIT_MIN_LENGTH = 30

# 分けた片どうしの間の空白を入れる span の class。book.css が背景色を当てる
GAP_CLASS = "pdf-code-gap"
# 分けた片の内側の端には余白と角丸を付けない目印。book.css が平らにする
MORE_CLASS = "pdf-code-more"  # この片の後に続きがある（右端）
CONT_CLASS = "pdf-code-cont"  # この片の前に続きがある（左端）

# 行内コードを集計するときの対象外の祖先。check_inline_break.py の
# 「HTMLの項目」の数え方と同じ範囲（pre・表のセル・見出しの外）
COUNT_EXCLUDED_ANCESTORS = frozenset(
    {"pre", "td", "th", "dt", "dd"} | {f"h{level}" for level in range(1, 7)}
)

# ③ の分割が効くのは段落と箇条書きの中だけ。表のセルと見出しは対象外。
# （この処理は restructure_tables の前に掛けるので、縦展開される表はまだ td/th）
_PROSE_ANCESTORS = frozenset({"p", "li"})
_SPLIT_EXCLUDED_ANCESTORS = frozenset(
    {"script", "style"} | COUNT_EXCLUDED_ANCESTORS
)

_ENTITY_RE = re.compile(r"&(?:#\d+|#x[0-9A-Fa-f]+|[A-Za-z][\w.-]*);")


def needs_wbr(prev_char: str | None, first_char: str | None) -> bool:
    """直前の字とコードの先頭の字から、<wbr> を置くべきかを返す。"""
    if prev_char is None or first_char is None:
        return False
    return (
        ord(prev_char) >= CJK_CODEPOINT_FLOOR
        and prev_char not in OPENING_BRACKETS
        and first_char in NO_BREAK_BEFORE_CHARS
    )


def is_split_target(text: str) -> bool:
    """コードの本文（実体参照を解いた文字列）が分割対象かを返す。"""
    if len(text) < SPLIT_MIN_LENGTH or " " not in text:
        return False
    return text.split(" ", 1)[0] not in COMMAND_WORDS


def _first_char(markup: str) -> str | None:
    """マークアップの先頭の表示文字を返す。先頭が実体参照なら解いた1字目。"""
    if not markup or markup.startswith("<"):
        return None
    match = _ENTITY_RE.match(markup)
    if match:
        decoded = html.unescape(match.group())
        return decoded[0] if decoded else None
    if markup.startswith("&"):
        return "&"
    return markup[0]


def _open_tag_with_classes(open_tag: str, classes: list[str]) -> str:
    """code 開始タグへ目印の class を足して返す。"""
    if not classes:
        return open_tag
    addition = " ".join(classes)
    match = re.search(r'\bclass="([^"]*)"', open_tag)
    if match:
        return (
            open_tag[: match.start()]
            + f'class="{match.group(1)} {addition}"'
            + open_tag[match.end() :]
        )
    return re.sub(r">$", f' class="{addition}">', open_tag)


def split_code_markup(open_tag: str, inner: str) -> str | None:
    """1つの code 要素を空白の位置で分けたマークアップを返す。対象外なら None。

    inner は code の中身の生のマークアップ（実体参照はそのまま）。
    空白は常にリテラルの半角空白として入っている前提で、gap の span は
    その空白をそのまま内側に持つ（実体参照が空白に化けることは無い）。
    """
    if "<" in inner:
        # code の内側に実タグがある原稿は分けない（vfm の行内コードは来ない）
        return None
    text = html.unescape(inner)
    if not is_split_target(text):
        return None
    pieces = re.split(r"( +)", inner)
    code_indexes = [i for i, piece in enumerate(pieces) if i % 2 == 0 and piece]
    if len(code_indexes) < 2:
        # 空白しか無い、または分けるほどの語が無い
        return None
    first, last = code_indexes[0], code_indexes[-1]
    parts: list[str] = []
    for index, piece in enumerate(pieces):
        if index % 2 == 1:
            parts.append(f'<span class="{GAP_CLASS}">{piece}</span>')
            continue
        if not piece:
            continue
        classes = []
        if index != first:
            classes.append(CONT_CLASS)
        if index != last:
            classes.append(MORE_CLASS)
        parts.append(
            _open_tag_with_classes(open_tag, classes) + piece + "</code>"
        )
    return "".join(parts)


class _InlineCodeSplitter(HTMLParser):
    """段落と箇条書きの中の長い code を空白の位置で複数の code に分ける。"""

    def __init__(self, markup: str):
        super().__init__(convert_charrefs=False)
        self.markup = markup
        self.line_starts = [0]
        for index, character in enumerate(markup):
            if character == "\n":
                self.line_starts.append(index + 1)
        self.stack: list[str] = []
        self.edits: list[tuple[int, int, str]] = []
        self._code: dict | None = None

    def _pos(self) -> int:
        row, column = self.getpos()
        return self.line_starts[row - 1] + column

    def handle_starttag(self, tag, attrs):
        position = self._pos()
        if tag == "code" and "pre" not in self.stack and self._code is None:
            raw = self.get_starttag_text()
            if raw is None:
                raise InlineBreakMarkupError("code開始タグを取得できません")
            self._code = {
                "open": raw,
                "start": position,
                "inner_start": position + len(raw),
                "nested": False,
            }
        elif self._code is not None:
            # code の内側に実タグがある原稿は分けない
            self._code["nested"] = True
        if tag not in HTML_VOID_ELEMENTS:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        if self._code is not None:
            self._code["nested"] = True

    def handle_endtag(self, tag):
        position = self._pos()
        if tag == "code" and self._code is not None:
            if not self.stack or self.stack[-1] != "code":
                raise InlineBreakMarkupError("code終了タグの対応が崩れています")
            inner_end = position
            code_end = position + len(self.markup[position:].partition(">")[0]) + 1
            code = self._code
            self._code = None
            inner = self.markup[code["inner_start"] : inner_end]
            if (
                not code["nested"]
                and any(t in _PROSE_ANCESTORS for t in self.stack[:-1])
                and not any(t in _SPLIT_EXCLUDED_ANCESTORS for t in self.stack[:-1])
            ):
                replacement = split_code_markup(code["open"], inner)
                if replacement is not None:
                    self.edits.append((code["start"], code_end, replacement))
        if not self.stack or self.stack[-1] != tag:
            raise InlineBreakMarkupError("行内コード分割前のHTMLタグが対応していません")
        self.stack.pop()


def split_long_inline_code(markup: str) -> str:
    """30字以上で半角空白を含む行内コードを語ごとの code に分けて返す。"""
    parser = _InlineCodeSplitter(markup)
    parser.feed(markup)
    parser.close()
    if parser.stack:
        raise InlineBreakMarkupError("行内コード分割前のHTML要素が閉じていません")
    if parser._code is not None:
        raise InlineBreakMarkupError("code要素が閉じていません")
    for start, end, replacement in reversed(parser.edits):
        markup = markup[:start] + replacement + markup[end:]
    return markup


class _WbrInserter(HTMLParser):
    """前で改行できない字で始まる code の直前へ <wbr> を挿入する。"""

    def __init__(self, markup: str):
        super().__init__(convert_charrefs=False)
        self.markup = markup
        self.line_starts = [0]
        for index, character in enumerate(markup):
            if character == "\n":
                self.line_starts.append(index + 1)
        self.stack: list[str] = []
        self.edits: list[tuple[int, str]] = []
        # 直前の表示文字。ブラウザは要素の境界（`</em>` 等）を挟んでも
        # 直前の字とコードの1字目を連続した文字列として改行可否を決めるので、
        # タグでは戻さずに最後の表示文字をそのまま持つ。コメントは描画されない
        self.last_text_char: str | None = None

    def _pos(self) -> int:
        row, column = self.getpos()
        return self.line_starts[row - 1] + column

    def handle_starttag(self, tag, attrs):
        position = self._pos()
        if tag == "code" and "pre" not in self.stack:
            raw = self.get_starttag_text()
            if raw is None:
                raise InlineBreakMarkupError("code開始タグを取得できません")
            first = _first_char(self.markup[position + len(raw) :])
            if needs_wbr(self.last_text_char, first):
                self.edits.append((position, "<wbr>"))
        if tag not in HTML_VOID_ELEMENTS:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1] != tag:
            raise InlineBreakMarkupError("<wbr>挿入前のHTMLタグが対応していません")
        self.stack.pop()

    def handle_data(self, data):
        if data:
            self.last_text_char = data[-1]

    def handle_entityref(self, name):
        self.last_text_char = html.unescape(f"&{name};")[-1]

    def handle_charref(self, name):
        self.last_text_char = html.unescape(f"&#{name};")[-1]


def insert_wbr_before_code(markup: str) -> str:
    """和文の字の直後に来る、改行できない字で始まる code の手前へ <wbr> を置く。"""
    parser = _WbrInserter(markup)
    parser.feed(markup)
    parser.close()
    if parser.stack:
        raise InlineBreakMarkupError("<wbr>挿入前のHTML要素が閉じていません")
    for position, piece in sorted(parser.edits, reverse=True):
        markup = markup[:position] + piece + markup[position:]
    return markup
