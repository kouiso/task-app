"""生成HTMLのインラインコードへ、PDF組版監査用の安定IDを付ける。"""

from __future__ import annotations

import hashlib
import html
import re
from html.parser import HTMLParser


SCHEMA_VERSION = 1
MINIMUM_FONT_SIZE_PT = 8
PAGE_CONTENT_SELECTOR = '[data-vivliostyle-page-area-container="true"]'
INLINE_ID_ATTRIBUTE = "data-pdf-inline-id"
TABLE_ID_ATTRIBUTE = "data-pdf-table-id"
RESERVED_ATTRIBUTES = {INLINE_ID_ATTRIBUTE, TABLE_ID_ATTRIBUTE}
INLINE_ID_RE = re.compile(r"pdf-inline-[0-9a-f]{12}-[0-9]{5}")
TABLE_ID_RE = re.compile(r"pdf-table-[0-9a-f]{12}-[0-9]{5}")

HTML_VOID_ELEMENTS = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}
TAG_NAME_RE = re.compile(r"<([A-Za-z][A-Za-z0-9:-]*)")
UNFINISHED_TAG_RE = re.compile(r"<[A-Za-z][A-Za-z0-9:-]*(?:\s|$)")
TRAILING_UNFINISHED_TAG_RE = re.compile(r"<[A-Za-z][^<>]*\Z")


class InlineLayoutMarkupError(ValueError):
    """監査用IDを安全に付けられないHTMLを検出した。"""


class InlineCodeAnnotator(HTMLParser):
    """元HTMLを再構築せず、code開始タグへの属性挿入位置だけを集める。"""

    def __init__(self, markup: str, document_id: str):
        super().__init__(convert_charrefs=False)
        self.markup = markup
        self.document_key = hashlib.sha256(document_id.encode("utf-8")).hexdigest()[:12]
        self.line_starts = [0]
        for index, character in enumerate(markup):
            if character == "\n":
                self.line_starts.append(index + 1)
        self.stack: list[str] = []
        self.pre_depth = 0
        self.cell_depth = 0
        self.active_code: dict | None = None
        self.entries: list[dict] = []
        self.tables: list[dict] = []
        self.edits: list[tuple[int, str]] = []

    def _absolute_position(self) -> int:
        line, column = self.getpos()
        return self.line_starts[line - 1] + column

    @staticmethod
    def _attributes(tag: str, attrs: list[tuple[str, str | None]]) -> dict[str, str | None]:
        result: dict[str, str | None] = {}
        for name, value in attrs:
            lowered = name.lower()
            if lowered in result:
                raise InlineLayoutMarkupError(f"属性が重複しています: <{tag}> {lowered}")
            if lowered in RESERVED_ATTRIBUTES:
                raise InlineLayoutMarkupError(
                    f"予約属性 {lowered} は生成HTMLで使用できません"
                )
            result[lowered] = value
        return result

    def _start_code(self, raw_tag: str) -> None:
        if self.active_code is not None:
            raise InlineLayoutMarkupError("code要素を入れ子にできません")
        match = TAG_NAME_RE.match(raw_tag)
        if not match or match.group(1).lower() != "code":
            raise InlineLayoutMarkupError("code開始タグの位置を特定できません")
        source_order = len(self.entries)
        stable_id = f"pdf-inline-{self.document_key}-{source_order:05d}"
        insertion = self._absolute_position() + match.end()
        self.edits.append((insertion, f' {INLINE_ID_ATTRIBUTE}="{stable_id}"'))
        self.active_code = {
            "id": stable_id,
            "expected_text_parts": [],
            "source_order": source_order,
            "context": "table" if self.cell_depth else "flow",
        }

    def _annotate_table(
        self, raw_tag: str, attributes: dict[str, str | None]
    ) -> None:
        match = TAG_NAME_RE.match(raw_tag)
        if not match or match.group(1).lower() != "table":
            raise InlineLayoutMarkupError("table開始タグの位置を特定できません")
        source_order = len(self.tables)
        stable_id = f"pdf-table-{self.document_key}-{source_order:05d}"
        insertion = self._absolute_position() + match.end()
        self.edits.append((insertion, f' {TABLE_ID_ATTRIBUTE}="{stable_id}"'))
        self.tables.append(
            {
                "id": stable_id,
                "source_order": source_order,
                "source_id": attributes.get("id"),
            }
        )

    def _finish_code(self) -> None:
        if self.active_code is None:
            raise InlineLayoutMarkupError("対応するcode開始タグがありません")
        entry = self.active_code
        self.active_code = None
        self.entries.append(
            {
                "id": entry["id"],
                "expected_text": "".join(entry["expected_text_parts"]),
                "source_order": entry["source_order"],
                "context": entry["context"],
            }
        )

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attributes = self._attributes(tag, attrs)
        raw_tag = self.get_starttag_text()
        if raw_tag is None:
            raise InlineLayoutMarkupError(f"開始タグを取得できません: {tag}")
        if tag == "code" and self.pre_depth == 0:
            self._start_code(raw_tag)
        if tag == "table":
            self._annotate_table(raw_tag, attributes)
        if tag not in HTML_VOID_ELEMENTS:
            self.stack.append(tag)
            if tag == "pre":
                self.pre_depth += 1
            if tag in {"td", "th"}:
                self.cell_depth += 1

    def handle_startendtag(self, tag, attrs):
        tag = tag.lower()
        self._attributes(tag, attrs)
        if tag == "table":
            raise InlineLayoutMarkupError("table要素を自己終了できません")
        if tag == "code" and self.pre_depth == 0:
            raw_tag = self.get_starttag_text()
            if raw_tag is None:
                raise InlineLayoutMarkupError("自己終了codeタグを取得できません")
            self._start_code(raw_tag)
            self._finish_code()

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in HTML_VOID_ELEMENTS:
            raise InlineLayoutMarkupError(f"void要素に終了タグがあります: {tag}")
        if not self.stack or self.stack[-1] != tag:
            expected = self.stack[-1] if self.stack else "なし"
            raise InlineLayoutMarkupError(
                f"終了タグの対応が崩れています: </{tag}>（期待: </{expected}>）"
            )
        if tag == "code" and self.pre_depth == 0:
            self._finish_code()
        self.stack.pop()
        if tag == "pre":
            self.pre_depth -= 1
        if tag in {"td", "th"}:
            self.cell_depth -= 1

    def handle_data(self, data):
        if UNFINISHED_TAG_RE.search(data):
            raise InlineLayoutMarkupError("閉じていない開始タグがあります")
        if self.active_code is not None:
            self.active_code["expected_text_parts"].append(data)

    def handle_entityref(self, name):
        if self.active_code is not None:
            self.active_code["expected_text_parts"].append(html.unescape(f"&{name};"))

    def handle_charref(self, name):
        if self.active_code is not None:
            self.active_code["expected_text_parts"].append(html.unescape(f"&#{name};"))

    def finish(self) -> None:
        if self.rawdata:
            raise InlineLayoutMarkupError("解析されていないHTML断片が残っています")
        if self.active_code is not None:
            raise InlineLayoutMarkupError("code要素が閉じていません")
        if self.stack:
            raise InlineLayoutMarkupError(f"要素が閉じていません: <{self.stack[-1]}>")
        if self.pre_depth or self.cell_depth:
            raise InlineLayoutMarkupError("HTML要素の深さが不整合です")


class AnnotatedAttributeStripper(HTMLParser):
    """生成した監査属性だけを開始タグ上の既知位置から除去する。"""

    def __init__(self, markup: str):
        super().__init__(convert_charrefs=False)
        self.markup = markup
        self.line_starts = [0]
        for index, character in enumerate(markup):
            if character == "\n":
                self.line_starts.append(index + 1)
        self.stack: list[str] = []
        self.pre_depth = 0
        self.edits: list[tuple[int, int]] = []

    def _absolute_position(self) -> int:
        line, column = self.getpos()
        return self.line_starts[line - 1] + column

    def _strip_generated_attribute(
        self, tag: str, attrs: list[tuple[str, str | None]], raw_tag: str
    ) -> None:
        seen: set[str] = set()
        reserved: list[tuple[str, str | None]] = []
        for name, value in attrs:
            lowered = name.lower()
            if lowered in seen:
                raise InlineLayoutMarkupError(f"属性が重複しています: <{tag}> {lowered}")
            seen.add(lowered)
            if lowered in RESERVED_ATTRIBUTES:
                reserved.append((lowered, value))
        if not reserved:
            return
        if len(reserved) != 1:
            raise InlineLayoutMarkupError(f"監査属性が重複しています: <{tag}>")

        name, value = reserved[0]
        expected_name = None
        expected_pattern = None
        if tag == "code" and self.pre_depth == 0:
            expected_name = INLINE_ID_ATTRIBUTE
            expected_pattern = INLINE_ID_RE
        elif tag == "table":
            expected_name = TABLE_ID_ATTRIBUTE
            expected_pattern = TABLE_ID_RE
        if name != expected_name or value is None or not expected_pattern.fullmatch(value):
            raise InlineLayoutMarkupError(
                f"生成規則外の監査属性があります: <{tag}> {name}"
            )

        tag_match = TAG_NAME_RE.match(raw_tag)
        if not tag_match or tag_match.group(1).lower() != tag:
            raise InlineLayoutMarkupError(f"開始タグの位置を特定できません: {tag}")
        generated = f' {name}="{value}"'
        offset_in_tag = tag_match.end()
        if not raw_tag.startswith(generated, offset_in_tag):
            raise InlineLayoutMarkupError(
                f"監査属性の生成位置または引用形式が変わっています: <{tag}>"
            )
        self.edits.append(
            (self._absolute_position() + offset_in_tag, len(generated))
        )

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        raw_tag = self.get_starttag_text()
        if raw_tag is None:
            raise InlineLayoutMarkupError(f"開始タグを取得できません: {tag}")
        self._strip_generated_attribute(tag, attrs, raw_tag)
        if tag not in HTML_VOID_ELEMENTS:
            self.stack.append(tag)
            if tag == "pre":
                self.pre_depth += 1

    def handle_startendtag(self, tag, attrs):
        tag = tag.lower()
        raw_tag = self.get_starttag_text()
        if raw_tag is None:
            raise InlineLayoutMarkupError(f"自己終了タグを取得できません: {tag}")
        self._strip_generated_attribute(tag, attrs, raw_tag)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in HTML_VOID_ELEMENTS:
            raise InlineLayoutMarkupError(f"void要素に終了タグがあります: {tag}")
        if not self.stack or self.stack[-1] != tag:
            expected = self.stack[-1] if self.stack else "なし"
            raise InlineLayoutMarkupError(
                f"終了タグの対応が崩れています: </{tag}>（期待: </{expected}>）"
            )
        self.stack.pop()
        if tag == "pre":
            self.pre_depth -= 1

    def handle_data(self, data):
        if UNFINISHED_TAG_RE.search(data):
            raise InlineLayoutMarkupError("閉じていない開始タグがあります")

    def finish(self) -> None:
        if self.rawdata:
            raise InlineLayoutMarkupError("解析されていないHTML断片が残っています")
        if self.stack:
            raise InlineLayoutMarkupError(f"要素が閉じていません: <{self.stack[-1]}>")
        if self.pre_depth:
            raise InlineLayoutMarkupError("HTML要素の深さが不整合です")

    def stripped_markup(self) -> str:
        stripped = self.markup
        for offset, length in reversed(self.edits):
            stripped = stripped[:offset] + stripped[offset + length :]
        return stripped


def annotate_inline_code(markup: str, document_id: str) -> tuple[str, dict]:
    """pre外のcodeへ安定IDを挿入し、監査manifestと共に返す。"""
    if not isinstance(markup, str):
        raise TypeError("markupはstrが必要です")
    if not isinstance(document_id, str) or not document_id:
        raise InlineLayoutMarkupError("document_idが必要です")
    if TRAILING_UNFINISHED_TAG_RE.search(markup):
        raise InlineLayoutMarkupError("閉じていない開始タグがあります")

    parser = InlineCodeAnnotator(markup, document_id)
    try:
        parser.feed(markup)
        parser.close()
        parser.finish()
    except InlineLayoutMarkupError:
        raise
    except Exception as error:
        raise InlineLayoutMarkupError(f"HTMLを解析できません: {error}") from error

    annotated = markup
    for offset, attribute in reversed(parser.edits):
        annotated = annotated[:offset] + attribute + annotated[offset:]

    manifest = {
        "schema_version": SCHEMA_VERSION,
        "document_id": document_id,
        "minimum_font_size_pt": MINIMUM_FONT_SIZE_PT,
        "page_content_selector": PAGE_CONTENT_SELECTOR,
        "entries": parser.entries,
        "tables": parser.tables,
    }
    return annotated, manifest


def validate_annotated_html(markup: str, manifest: dict) -> None:
    """wrap後HTMLの監査属性・本文・入れ子を元manifestと厳密比較する。"""
    if not isinstance(markup, str):
        raise TypeError("markupはstrが必要です")
    if not isinstance(manifest, dict):
        raise TypeError("manifestはdictが必要です")
    document_id = manifest.get("document_id")
    if not isinstance(document_id, str) or not document_id:
        raise InlineLayoutMarkupError("manifestにdocument_idが必要です")
    if TRAILING_UNFINISHED_TAG_RE.search(markup):
        raise InlineLayoutMarkupError("閉じていない開始タグがあります")

    stripper = AnnotatedAttributeStripper(markup)
    try:
        stripper.feed(markup)
        stripper.close()
        stripper.finish()
        regenerated_markup, regenerated_manifest = annotate_inline_code(
            stripper.stripped_markup(), document_id
        )
    except InlineLayoutMarkupError:
        raise
    except Exception as error:
        raise InlineLayoutMarkupError(f"注釈済みHTMLを検証できません: {error}") from error

    if regenerated_markup != markup:
        raise InlineLayoutMarkupError(
            "監査IDが欠落、追加、重複、改変、または移動しています"
        )
    if regenerated_manifest != manifest:
        raise InlineLayoutMarkupError("監査manifestとHTMLの内容が一致しません")
