"""導入・ラベルの段落へ「次の要素と同じページに置く」印を付ける。

issue #475。紙面で `pre` `figure` などの塊が丸ごと次ページへ送られると、
その直前のラベルや導入文だけが前のページの末尾に取り残される
（36冊・3446ページ中964ページで実測）。読者はページをめくるまで
何を写すのか分からず、写経の手がそこで止まる。

ここで付ける `pdf-keep-next` は、book.css が `break-after: avoid` に
対応させるための印。見出しにテーマが掛けている指定と同じものを
段落へ掛ける。印の判定は HTML の構造だけで行う。文字の体裁
（太字・「:」終わり・案内の接頭辞）と、直前・直後の要素の組み合わせ。

段落と次の要素の間にある HTML コメント（原稿に書かれた
`<!-- code-block-length-exception: complete-copy-unit -->` など）は
飛ばして次の要素を見る。飛ばさないと完成コードの直前の段落に
印が付かない。
"""

from __future__ import annotations

import re
import unicodedata
from html.parser import HTMLParser

from inline_layout import HTML_VOID_ELEMENTS

# book.css で break-after: avoid を掛けるための印
KEEP_NEXT_CLASS = "pdf-keep-next"

# 文字数の上限。数えるのは NFKC 正規化のうえ空白と見えない文字を除いた
# 表示字数。「〜字以内」はこの値以下を指す
MAX_LABEL_CHARS = 90
MAX_INTRO_CHARS = 70

# 直後の要素がこれらの塊なら、より厳しい字数（MAX_INTRO_CHARS）で印を付ける。
# 塊は丸ごと次ページへ送られやすく、手前の導入文が残りやすい
NEXT_BLOCK_TAGS = {"pre", "table", "ul", "ol", "dl"}
STACKED_TABLE_CLASS = "pdf-stacked-table"
# この直後に来た段落が導入文になりやすい見出し
HEADING_TAGS = {"h2", "h3", "h4"}
# これらの中にある <p> はコードや雛形の一部で、導入文ではない
SKIP_ANCESTOR_TAGS = {"pre", "script", "style", "head", "template"}

# 生成側が差し込む改行制御用の不可視文字（ZWSP・WJ・BOM・SOFT HYPHEN）。
# check_page_layout.py の INVISIBLE_BREAK_MARKS と同じ集合
INVISIBLE_BREAK_MARKS = "\u200b\u2060\ufeff\u00ad"

CLASS_ATTR_RE = re.compile(r'class="([^"]*)"')


def normalize_text(text: str) -> str:
    """字数を数える形へそろえる。NFKC で全角半角を統一し、空白と見えない
    文字（ZWSP・WJ・BOM・SOFT HYPHEN）を取り除く。

    印の判定（keep_next）と紙面の突き合わせ（check_page_layout）で
    同じそろえ方を使う。片方だけ変えると、探せるはずの段落が見つからず
    「突き合わせ不可」が増えて検査が黙ってすり抜ける。
    """
    normalized = unicodedata.normalize("NFKC", text)
    return "".join(
        char for char in normalized
        if not char.isspace() and char not in INVISIBLE_BREAK_MARKS
    )


class _Element:
    """組版前 HTML の1要素。children は ('el', _Element) / ('text', str) /
    ('comment', str) の並びで、兄弟関係の判定に使う。"""

    __slots__ = ("tag", "attrs", "start", "open_end", "children", "parent")

    def __init__(self, tag: str, attrs: dict, parent: "_Element | None"):
        self.tag = tag
        self.attrs = attrs
        self.start = 0        # 開始タグの先頭の位置
        self.open_end = 0     # 開始タグの終わり（'>' の次）の位置
        self.children: list[tuple[str, object]] = []
        self.parent = parent


class _Tree(HTMLParser):
    """組版前 HTML を軽い木にほどく。

    厳密な検証は上流（restructure_tables など）が済ませている。
    ここでは対応しない閉じタグは無視し、閉じ忘れの要素は末尾まで
    伸びたものとして読む。印の判定を止めないことが目的。
    """

    def __init__(self, markup: str):
        super().__init__(convert_charrefs=True)
        self.markup = markup
        self.lines = [0] + [i + 1 for i, c in enumerate(markup) if c == "\n"]
        self.root = _Element("#root", {}, None)
        self.stack = [self.root]

    def _position(self) -> int:
        row, column = self.getpos()
        return self.lines[row - 1] + column

    def handle_starttag(self, tag: str, attrs):
        tag = tag.lower()
        node = _Element(tag, dict(attrs), self.stack[-1])
        node.start = self._position()
        node.open_end = node.start + len(self.get_starttag_text())
        self.stack[-1].children.append(("el", node))
        if tag not in HTML_VOID_ELEMENTS:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs):
        # 空要素の明示形。中身が無いので閉じるまでもなく畳む
        tag = tag.lower()
        node = _Element(tag, dict(attrs), self.stack[-1])
        node.start = self._position()
        node.open_end = node.start + len(self.get_starttag_text())
        self.stack[-1].children.append(("el", node))

    def handle_endtag(self, tag: str):
        tag = tag.lower()
        # 対応する開始タグまで畳む。対応が無い閉じタグは無視する
        for depth in range(len(self.stack) - 1, 0, -1):
            if self.stack[depth].tag == tag:
                del self.stack[depth:]
                return

    def handle_data(self, data: str):
        self.stack[-1].children.append(("text", data))

    def handle_comment(self, data: str):
        self.stack[-1].children.append(("comment", data))


def _classes(element: _Element) -> set[str]:
    return set((element.attrs.get("class") or "").split())


def _inner_text(element: _Element) -> str:
    """要素の中の可視テキストを全部つなぐ。コメントとタグは含まない。"""
    parts: list[str] = []
    stack = list(reversed(element.children))
    while stack:
        kind, value = stack.pop()
        if kind == "text":
            parts.append(value)
        elif kind == "el":
            stack.extend(reversed(value.children))
    return "".join(parts)


def _bold_text(element: _Element) -> str:
    """<strong> の内側にある可視テキストだけをつなぐ。"""
    parts: list[str] = []
    stack = [(element, False)]
    while stack:
        node, inside = stack.pop()
        for kind, value in reversed(node.children):
            if kind == "el":
                stack.append((value, inside or value.tag == "strong"))
            elif kind == "text" and inside:
                parts.append(value)
    return "".join(parts)


def _sibling(element: _Element, step: int) -> _Element | None:
    """前後の兄弟「要素」を返す。

    HTML コメントと空白だけのテキストは飛ばす。間に字のあるテキストが
    挟まっていたら要素ではない（'#text' を返す）。次の要素が無い
    （直後が親の閉じタグ）ときは None。
    """
    if element.parent is None:
        return None
    children = element.parent.children
    index = next(
        i for i, (kind, value) in enumerate(children)
        if kind == "el" and value is element
    )
    cursor = index + step
    while 0 <= cursor < len(children):
        kind, value = children[cursor]
        if kind == "el":
            return value
        if kind == "text" and str(value).strip():
            return _Element("#text", {}, None)
        cursor += step
    return None


def _next_element(element: _Element) -> _Element | None:
    return _sibling(element, +1)


def _prev_element(element: _Element) -> _Element | None:
    return _sibling(element, -1)


def _is_stacked_table(element: _Element) -> bool:
    return element.tag == "section" and STACKED_TABLE_CLASS in _classes(element)


def qualifies(element: _Element) -> bool:
    """この <p> に pdf-keep-next を付けるかを判定する。

    付けるのは次のどれかに当たる段落（字数は normalize_text の表示字数）。
    どれにも当たらなければ付けない。直後が親の閉じタグ（次の要素が無い）、
    hr、縦並びの表でない section のときはどの規則にも当てはまっていても
    付けない — 同じページに置く相手が無い、あるいは節の終わりだから。
    """
    if element.tag != "p":
        return False
    if KEEP_NEXT_CLASS in _classes(element):
        return False

    following = _next_element(element)
    if following is None:
        return False
    if following.tag == "hr":
        return False
    if following.tag == "section" and not _is_stacked_table(following):
        return False

    text = normalize_text(_inner_text(element))
    length = len(text)
    if length == 0:
        return False

    # 「実装:」「確認ポイント:」など「:」で終わるラベル
    if text.endswith(":") and length <= MAX_LABEL_CHARS:
        return True
    # 太字だけの段落（「なぜ Set を使うのか」など）
    if length <= MAX_LABEL_CHARS and normalize_text(_bold_text(element)) == text:
        return True
    # 「スクリーンショット: …」の案内行
    if text.startswith("スクリーンショット:") and length <= MAX_LABEL_CHARS:
        return True
    # 「原因: …」（付録 トラブルシューティング）
    if text.startswith("原因:") and length <= MAX_LABEL_CHARS:
        return True
    # 図の直前の導入文
    if following.tag == "figure" and length <= MAX_LABEL_CHARS:
        return True
    # コード・表・箇条書きの直前の導入文。
    # blockquote は例え話や補足で、段落が導入する中身ではないので対象外
    if length <= MAX_INTRO_CHARS and (
        following.tag in NEXT_BLOCK_TAGS or _is_stacked_table(following)
    ):
        return True
    # 見出しのすぐ後の導入段落（「ゴール: …」の行など）
    previous = _prev_element(element)
    if previous is not None and previous.tag in HEADING_TAGS \
            and length <= MAX_LABEL_CHARS:
        return True
    return False


def _has_skip_ancestor(element: _Element) -> bool:
    node = element.parent
    while node is not None:
        if node.tag in SKIP_ANCESTOR_TAGS:
            return True
        node = node.parent
    return False


def _parse(markup: str) -> _Element:
    parser = _Tree(markup)
    parser.feed(markup)
    parser.close()
    return parser.root


def _walk(root: _Element):
    stack = [root]
    while stack:
        node = stack.pop()
        yield node
        stack.extend(
            value for kind, value in reversed(node.children) if kind == "el"
        )


def _add_keep_next(open_tag: str) -> str:
    """<p> の開始タグに pdf-keep-next を足す。"""
    match = CLASS_ATTR_RE.search(open_tag)
    if match:
        return open_tag.replace(
            match.group(0),
            f'class="{match.group(1)} {KEEP_NEXT_CLASS}"',
            1,
        )
    return open_tag[:-1].rstrip() + f' class="{KEEP_NEXT_CLASS}">'


def mark_keep_next(markup: str) -> str:
    """導入・ラベルの <p> に pdf-keep-next を付けた文字列を返す。"""
    root = _parse(markup)
    edits: list[tuple[int, int, str]] = []
    for element in _walk(root):
        if element.tag != "p" or _has_skip_ancestor(element):
            continue
        if not qualifies(element):
            continue
        open_tag = markup[element.start:element.open_end]
        edits.append((element.start, element.open_end, _add_keep_next(open_tag)))
    for start, end, replacement in reversed(edits):
        markup = markup[:start] + replacement + markup[end:]
    return markup


class Paragraph:
    """検査で突き合わせる段落。text は出力用の文、norm は比較用の形。"""

    __slots__ = ("text", "norm", "marked")

    def __init__(self, text: str, marked: bool):
        self.text = text
        self.norm = normalize_text(text)
        self.marked = marked


def collect_paragraphs(markup: str) -> list[Paragraph]:
    """生成 HTML の <p> を文の順に並べる。check_page_layout が使う。

    印の付いた段落と付いていない段落の両方を返す。突き合わせは文の順に
    前から探すので、途中の段落を省くと同じ文が別の場所へずれて当たる。
    """
    root = _parse(markup)
    paragraphs: list[Paragraph] = []
    for element in _walk(root):
        if element.tag != "p" or _has_skip_ancestor(element):
            continue
        paragraphs.append(Paragraph(
            _inner_text(element), KEEP_NEXT_CLASS in _classes(element)))
    return paragraphs
