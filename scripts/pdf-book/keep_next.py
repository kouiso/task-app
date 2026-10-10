"""明示的な前向き案内だけを、直後の組版ブロックと同じページへ置く。"""

from __future__ import annotations

from dataclasses import dataclass
from html.parser import HTMLParser
import re
import unicodedata

from inline_layout import HTML_VOID_ELEMENTS


KEEP_NEXT_CLASS = "pdf-keep-next"
ELIGIBLE_TAGS = {"pre", "figure", "table", "ul", "ol", "dl"}
STACKED_TABLE_CLASS = "pdf-stacked-table"
SKIP_ANCESTORS = {"pre", "script", "style", "head", "template", "figure", "figcaption", "blockquote"}
SKIP_CLASSES = {"footnote", "footnotes", "caption", "callout", "admonition"}
INVISIBLE = "\u200b\u2060\ufeff\u00ad"
NEGATIVE_FORWARD = re.compile(r"(?:ないでください|なくてよい|不要です|しません)")
TARGET_TERMS = {
    "pre": ("コード", "ブロック"),
    "figure": ("図",),
    "table": ("表",),
    "ul": ("一覧", "手順"),
    "ol": ("一覧", "手順"),
    "dl": ("一覧",),
    "section": ("表",),
}


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    return "".join(char for char in value if not char.isspace() and char not in INVISIBLE)


class _Element:
    __slots__ = ("tag", "attrs", "start", "open_end", "children", "parent")

    def __init__(self, tag: str, attrs: dict[str, str | None], parent: "_Element | None"):
        self.tag = tag
        self.attrs = attrs
        self.start = 0
        self.open_end = 0
        self.children: list[tuple[str, object]] = []
        self.parent = parent


class _Tree(HTMLParser):
    def __init__(self, markup: str):
        super().__init__(convert_charrefs=True)
        self.markup = markup
        self.lines = [0] + [index + 1 for index, char in enumerate(markup) if char == "\n"]
        self.root = _Element("#root", {}, None)
        self.stack = [self.root]

    def _position(self) -> int:
        row, column = self.getpos()
        return self.lines[row - 1] + column

    def _append(self, tag: str, attrs, push: bool) -> None:
        node = _Element(tag.lower(), dict(attrs), self.stack[-1])
        node.start = self._position()
        node.open_end = node.start + len(self.get_starttag_text())
        self.stack[-1].children.append(("element", node))
        if push and node.tag not in HTML_VOID_ELEMENTS:
            self.stack.append(node)

    def handle_starttag(self, tag: str, attrs) -> None:
        self._append(tag, attrs, True)

    def handle_startendtag(self, tag: str, attrs) -> None:
        self._append(tag, attrs, False)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for depth in range(len(self.stack) - 1, 0, -1):
            if self.stack[depth].tag == tag:
                del self.stack[depth:]
                return

    def handle_data(self, data: str) -> None:
        self.stack[-1].children.append(("text", data))

    def handle_entityref(self, name: str) -> None:
        self.stack[-1].children.append(("text", f"&{name};"))

    def handle_charref(self, name: str) -> None:
        self.stack[-1].children.append(("text", f"&#{name};"))

    def handle_comment(self, data: str) -> None:
        self.stack[-1].children.append(("comment", data))


def _classes(element: _Element) -> set[str]:
    return set((element.attrs.get("class") or "").split())


def _text(element: _Element) -> str:
    parts: list[str] = []
    stack = list(reversed(element.children))
    while stack:
        kind, value = stack.pop()
        if kind == "text":
            parts.append(str(value))
        elif kind == "element":
            stack.extend(reversed(value.children))
    return "".join(parts)


def _walk(root: _Element):
    stack = [root]
    while stack:
        node = stack.pop()
        yield node
        stack.extend(value for kind, value in reversed(node.children) if kind == "element")


def _next_element(element: _Element) -> _Element | None:
    if element.parent is None:
        return None
    children = element.parent.children
    index = next(index for index, item in enumerate(children) if item == ("element", element))
    for kind, value in children[index + 1:]:
        if kind == "element":
            return value
        if kind == "text" and str(value).strip():
            return None
    return None


def _previous_element(element: _Element) -> _Element | None:
    if element.parent is None:
        return None
    children = element.parent.children
    index = next(index for index, item in enumerate(children) if item == ("element", element))
    for kind, value in reversed(children[:index]):
        if kind == "element":
            return value
        if kind == "text" and str(value).strip():
            return None
    return None


def _has_ancestor(element: _Element, tags: set[str]) -> bool:
    parent = element.parent
    while parent is not None:
        if parent.tag in tags:
            return True
        parent = parent.parent
    return False


def _eligible(element: _Element) -> bool:
    return element.tag in ELIGIBLE_TAGS or (
        element.tag == "section" and STACKED_TABLE_CLASS in _classes(element)
    )


def _excluded(element: _Element) -> bool:
    if _classes(element) & SKIP_CLASSES:
        return True
    parent = element.parent
    while parent is not None:
        if parent.tag in SKIP_ANCESTORS or _classes(parent) & SKIP_CLASSES:
            return True
        parent = parent.parent
    return False


def _affirmative_forward(text: str, following: _Element) -> bool:
    if NEGATIVE_FORWARD.search(text):
        return False
    terms = TARGET_TERMS[following.tag]
    term = "|".join(map(re.escape, terms))
    demonstrative = r"(?:(?:次|以下)の|この)" if following.tag in {"ul", "ol", "dl"} else r"(?:次|以下)の"
    boundary = r"(?=(?:を|へ|に|では|で|は|も|が|から|の|、|。|:|：|$))"
    return re.search(rf"{demonstrative}(?:{term}){boundary}", text) is not None


def _reason(element: _Element) -> str | None:
    if element.tag != "p" or KEEP_NEXT_CLASS in _classes(element):
        return None
    following = _next_element(element)
    if following is None or not _eligible(following):
        return None
    text = normalize_text(_text(element))
    if not text or len(text) > 180:
        return None
    if (
        following.tag == "figure"
        and element.parent is not None
        and element.parent.tag == "blockquote"
        and re.match(r"^スクリーンショット[:：]", text)
    ):
        return "screenshot-introduction"
    if _excluded(element):
        return None
    if text == "実装:":
        return "implementation-label"
    if text == "確認ポイント:":
        return "checkpoints-label"
    previous = _previous_element(element)
    if (
        following.tag == "pre"
        and previous is not None
        and previous.tag == "h4"
        and normalize_text(_text(previous)) == "期待される出力"
        and re.fullmatch(r"ターミナル出力\([^()]+\)", text)
        and not _has_ancestor(element, {"ul", "ol", "li", "dl", "dt", "dd"})
    ):
        return "terminal-output-label"
    if _affirmative_forward(text, following):
        return "explicit-forward-instruction"
    return None


def _class_value_span(open_tag: str) -> tuple[int, int, bool] | None:
    """開始タグの実属性だけを走査し、class 値の範囲と引用有無を返す。"""
    index = 1
    while index < len(open_tag) and not open_tag[index].isspace() and open_tag[index] not in "/>":
        index += 1
    while index < len(open_tag):
        while index < len(open_tag) and open_tag[index].isspace():
            index += 1
        if index >= len(open_tag) or open_tag[index] in "/>":
            return None
        name_start = index
        while index < len(open_tag) and not open_tag[index].isspace() and open_tag[index] not in "=/>":
            index += 1
        name = open_tag[name_start:index].lower()
        while index < len(open_tag) and open_tag[index].isspace():
            index += 1
        if index >= len(open_tag) or open_tag[index] != "=":
            continue
        index += 1
        while index < len(open_tag) and open_tag[index].isspace():
            index += 1
        if index >= len(open_tag):
            return None
        quote = open_tag[index]
        if quote in "\"'":
            value_start = index + 1
            value_end = open_tag.find(quote, value_start)
            if value_end < 0:
                return None
            if name == "class":
                return value_start, value_end, True
            index = value_end + 1
            continue
        value_start = index
        while index < len(open_tag) and not open_tag[index].isspace() and open_tag[index] not in "/>":
            index += 1
        if name == "class":
            return value_start, index, False
    return None


def _add_class(open_tag: str) -> str:
    span = _class_value_span(open_tag)
    if span is not None:
        start, end, quoted = span
        value = open_tag[start:end]
        classes = value.split()
        if KEEP_NEXT_CLASS in classes:
            return open_tag
        combined = f"{value} {KEEP_NEXT_CLASS}"
        if quoted:
            return open_tag[:start] + combined + open_tag[end:]
        return open_tag[:start] + f'"{combined}"' + open_tag[end:]
    prefix = open_tag[:-1]
    separator = "" if prefix[-1:].isspace() else " "
    return prefix + separator + f'class="{KEEP_NEXT_CLASS}">'


@dataclass(frozen=True)
class Decision:
    text: str
    reason: str
    target_tag: str


def collect_decisions(markup: str) -> list[Decision]:
    parser = _Tree(markup)
    parser.feed(markup)
    parser.close()
    decisions: list[Decision] = []
    for element in _walk(parser.root):
        reason = _reason(element)
        if reason is None:
            continue
        following = _next_element(element)
        assert following is not None
        decisions.append(Decision(_text(element), reason, following.tag))
    return decisions


def mark_keep_next(markup: str) -> str:
    parser = _Tree(markup)
    parser.feed(markup)
    parser.close()
    edits: list[tuple[int, int, str]] = []
    for element in _walk(parser.root):
        if _reason(element) is None:
            continue
        open_tag = markup[element.start:element.open_end]
        edits.append((element.start, element.open_end, _add_class(open_tag)))
    for start, end, replacement in reversed(edits):
        markup = markup[:start] + replacement + markup[end:]
    return markup
