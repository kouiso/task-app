"""実寸測定に基づいて、1ページを超える ``pre`` だけ分割可能にする。"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import math
import re
from typing import Any

from code_wrap import PRE_RE


BREAKABLE_CLASS = "pdf-breakable"
BREAK_BEFORE_CLASS = "pdf-break-before-oversized-complete-copy"
BREAK_BEFORE_MARKER = "<!-- pdf-book-layout: break-before-oversized-complete-copy -->"
COMPLETE_COPY_MARKER = "<!-- code-block-length-exception: complete-copy-unit -->"
PRE_ID_ATTRIBUTE = "data-pdf-pre-id"
CLASS_RE = re.compile(r'class="([^"]*)"')
PRE_ID_RE = re.compile(rf'{PRE_ID_ATTRIBUTE}="([^"]+)"')
SHA256_RE = re.compile(r"[0-9a-f]{64}")


@dataclass(frozen=True)
class PreSource:
    pre_id: str
    source_sha256: str
    break_before_oversized: bool


def _add_attribute(open_tag: str, name: str, value: str) -> str:
    return open_tag[:-1].rstrip() + f' {name}="{value}">'


def _replace_classes(open_tag: str, class_match: re.Match[str], classes: list[str]) -> str:
    """内部classだけを除去できるよう、class属性を一度正規化する。"""
    replacement = f'class="{" ".join(classes)}"' if classes else ""
    return open_tag.replace(class_match.group(0), replacement, 1)


def annotate_pres(html_text: str) -> tuple[str, list[PreSource]]:
    """全 ``pre`` に内容ハッシュ付きの一意な測定IDを付ける。"""

    sources: list[PreSource] = []

    def repl(match: re.Match[str]) -> str:
        block = match.group(0)
        open_end = block.index(">") + 1
        open_tag = block[:open_end]
        if PRE_ID_RE.search(open_tag):
            raise ValueError("測定前の pre に data-pdf-pre-id が既にあります")
        digest = hashlib.sha256(block.encode("utf-8")).hexdigest()
        pre_id = f"pdf-pre-{len(sources):05d}-{digest[:12]}"
        marker_pair = re.search(
            rf"{re.escape(BREAK_BEFORE_MARKER)}\s*"
            rf"{re.escape(COMPLETE_COPY_MARKER)}\s*$",
            html_text[: match.start()],
        )
        sources.append(
            PreSource(
                pre_id=pre_id,
                source_sha256=digest,
                break_before_oversized=marker_pair is not None,
            )
        )
        return _add_attribute(open_tag, PRE_ID_ATTRIBUTE, pre_id) + block[open_end:]

    annotated = PRE_RE.sub(repl, html_text)
    if annotated.count(f"{PRE_ID_ATTRIBUTE}=") != len(sources):
        raise ValueError("pre の測定IDを一意に付与できませんでした")
    marker_count = html_text.count(BREAK_BEFORE_MARKER)
    bound_marker_count = sum(source.break_before_oversized for source in sources)
    if marker_count != bound_marker_count:
        raise ValueError("改ページmarkerが直後のcomplete-copy-unit preに結び付いていません")
    return annotated, sources


def _measurement_map(report: dict[str, Any]) -> tuple[float, dict[str, dict[str, Any]]]:
    page = report.get("page")
    measurements = report.get("pres")
    if not isinstance(page, dict) or not isinstance(measurements, list):
        raise ValueError("pre 実寸レポートの page/pres が不正です")
    content_height = page.get("content_height_px")
    if (
        isinstance(content_height, bool)
        or not isinstance(content_height, (int, float))
        or not math.isfinite(content_height)
        or content_height <= 0
    ):
        raise ValueError("pre 実寸レポートの版面高さが不正です")
    by_id: dict[str, dict[str, Any]] = {}
    for measurement in measurements:
        if not isinstance(measurement, dict):
            raise ValueError("pre 実寸レポートにオブジェクト以外の測定値があります")
        pre_id = measurement.get("id")
        height = measurement.get("required_height_px")
        source_sha256 = measurement.get("source_sha256")
        if not isinstance(pre_id, str) or not pre_id:
            raise ValueError("pre 実寸レポートに空のIDがあります")
        if pre_id in by_id:
            raise ValueError(f"pre 実寸レポートでIDが重複しています: {pre_id}")
        if (
            isinstance(height, bool)
            or not isinstance(height, (int, float))
            or not math.isfinite(height)
            or height <= 0
        ):
            raise ValueError(f"pre の実寸高さが不正です: {pre_id}")
        if not isinstance(source_sha256, str) or not SHA256_RE.fullmatch(source_sha256):
            raise ValueError(f"pre の内容ハッシュが不正です: {pre_id}")
        by_id[pre_id] = measurement
    return float(content_height), by_id


def apply_breakable_measurements(
    html_text: str,
    sources: list[PreSource],
    report: dict[str, Any],
) -> str:
    """実寸が版面を超える ``pre`` だけへ ``pdf-breakable`` を付ける。"""

    content_height, measurements = _measurement_map(report)
    expected = {source.pre_id: source for source in sources}
    if len(expected) != len(sources):
        raise ValueError("pre 測定元のIDが重複しています")
    missing = sorted(expected.keys() - measurements.keys())
    extra = sorted(measurements.keys() - expected.keys())
    if missing or extra:
        raise ValueError(
            f"pre 実寸レポートのID集合が一致しません: missing={missing}, extra={extra}"
        )
    for pre_id, source in expected.items():
        if measurements[pre_id]["source_sha256"] != source.source_sha256:
            raise ValueError(f"pre の内容が測定後に変わっています: {pre_id}")

    seen: set[str] = set()

    def repl(match: re.Match[str]) -> str:
        block = match.group(0)
        open_end = block.index(">") + 1
        open_tag = block[:open_end]
        id_match = PRE_ID_RE.search(open_tag)
        if not id_match:
            raise ValueError("測定IDの無い pre が残っています")
        pre_id = id_match.group(1)
        if pre_id in seen:
            raise ValueError(f"HTML内でpre測定IDが重複しています: {pre_id}")
        seen.add(pre_id)
        source = expected[pre_id]
        class_match = CLASS_RE.search(open_tag)
        classes = class_match.group(1).split() if class_match else []
        if BREAKABLE_CLASS in classes:
            raise ValueError(f"実寸判定前の pre に分割クラスがあります: {pre_id}")
        classes = [name for name in classes if name != BREAK_BEFORE_CLASS]
        if class_match:
            open_tag = _replace_classes(open_tag, class_match, classes)
        sanitized_block = open_tag + block[open_end:]
        if float(measurements[pre_id]["required_height_px"]) <= content_height:
            return sanitized_block
        if classes:
            classes.append(BREAKABLE_CLASS)
            if source.break_before_oversized:
                classes.append(BREAK_BEFORE_CLASS)
            current_match = CLASS_RE.search(open_tag)
            if current_match is None:
                raise ValueError(f"pre のclass属性を読み戻せません: {pre_id}")
            new_tag = _replace_classes(open_tag, current_match, classes)
        else:
            classes = [BREAKABLE_CLASS]
            if source.break_before_oversized:
                classes.append(BREAK_BEFORE_CLASS)
            new_tag = _add_attribute(open_tag, "class", " ".join(classes))
        return new_tag + block[open_end:]

    marked = PRE_RE.sub(repl, html_text)
    if seen != set(expected):
        raise ValueError("測定済みpreをHTMLから全件読み戻せませんでした")
    return marked
