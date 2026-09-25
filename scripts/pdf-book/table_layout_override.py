"""PDF教材で目視確認済みの表だけに列幅を適用します。"""

from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Mapping
from pathlib import Path
from typing import TypedDict, cast


class TableLayoutOverrideError(ValueError):
    """確認済みの列幅を厳密に適用できない場合のエラーです。"""


class ReviewedOverride(TypedDict):
    document_id: str
    source_sha256: str
    table_source_order: int
    table_id: str
    table_sha256: str
    column_percentages: list[int]
    evidence_pdf_sha256: str
    review: str


class TableLayoutConfig(TypedDict):
    schema_version: int
    overrides: list[ReviewedOverride]


_ROOT_KEYS = {"schema_version", "overrides"}
_OVERRIDE_KEYS = {
    "document_id",
    "source_sha256",
    "table_source_order",
    "table_id",
    "table_sha256",
    "column_percentages",
    "evidence_pdf_sha256",
    "review",
}
_IDENTIFIER = re.compile(r"^[A-Za-z0-9_-]+$")
_SHA256 = re.compile(r"^[0-9a-f]{64}$")
_TABLE_LINE = re.compile(rb"^\s*\|.*\|\s*(?:\r?\n)?$")
_SEPARATOR_LINE = re.compile(
    rb"^\s*\|(?:\s*:?-+:?\s*\|)+\s*(?:\r?\n)?$"
)
_FENCE = re.compile(rb"^\s*(`{3,}|~{3,})")


def _fail(message: str) -> None:
    raise TableLayoutOverrideError(message)


def _require_exact_keys(
    value: Mapping[str, object], expected: set[str], label: str
) -> None:
    actual = set(value)
    unknown = actual - expected
    missing = expected - actual
    if unknown:
        _fail(f"{label} has unknown keys: {sorted(unknown)}")
    if missing:
        _fail(f"{label} is missing keys: {sorted(missing)}")


def _require_sha256(value: object, label: str) -> str:
    if not isinstance(value, str) or not _SHA256.fullmatch(value):
        _fail(f"{label} must be a lowercase SHA-256 hex string")
    return value


def _validate_config(config: object) -> TableLayoutConfig:
    if not isinstance(config, dict):
        _fail("table layout config must be a JSON object")
    _require_exact_keys(config, _ROOT_KEYS, "config")
    schema_version = config["schema_version"]
    if (
        isinstance(schema_version, bool)
        or not isinstance(schema_version, int)
        or schema_version != 1
    ):
        _fail("config schema_version must be 1")
    overrides = config["overrides"]
    if not isinstance(overrides, list):
        _fail("config overrides must be an array")

    seen: set[tuple[str, int]] = set()
    for index, override in enumerate(overrides):
        label = f"overrides[{index}]"
        if not isinstance(override, dict):
            _fail(f"{label} must be an object")
        _require_exact_keys(override, _OVERRIDE_KEYS, label)

        document_id = override["document_id"]
        table_id = override["table_id"]
        if not isinstance(document_id, str) or not _IDENTIFIER.fullmatch(document_id):
            _fail(f"{label}.document_id is invalid")
        if not isinstance(table_id, str) or not _IDENTIFIER.fullmatch(table_id):
            _fail(f"{label}.table_id is invalid")
        source_order = override["table_source_order"]
        if isinstance(source_order, bool) or not isinstance(source_order, int) or source_order < 0:
            _fail(f"{label}.table_source_order must be a non-negative integer")
        key = (document_id, source_order)
        if key in seen:
            _fail(f"duplicate override for document/source order: {key}")
        seen.add(key)

        _require_sha256(override["source_sha256"], f"{label}.source_sha256")
        _require_sha256(override["table_sha256"], f"{label}.table_sha256")
        _require_sha256(
            override["evidence_pdf_sha256"], f"{label}.evidence_pdf_sha256"
        )
        review = override["review"]
        if not isinstance(review, str) or not review.strip() or len(review) > 300:
            _fail(f"{label}.review must be a non-empty string of at most 300 characters")

        percentages = override["column_percentages"]
        if not isinstance(percentages, list) or not percentages:
            _fail(f"{label}.column_percentages must be a non-empty array")
        if any(
            isinstance(value, bool)
            or not isinstance(value, int)
            or value <= 0
            or value > 100
            for value in percentages
        ):
            _fail(f"{label}.column_percentages must contain positive integers")
        if sum(percentages) != 100:
            _fail(f"{label}.column_percentages must sum to 100")
    return cast(TableLayoutConfig, config)


def load_table_layout_overrides(path: str | Path) -> TableLayoutConfig:
    """目視確認済みの列幅設定を読み込み、厳密に検証します。"""

    config_path = Path(path)
    try:
        raw = config_path.read_text(encoding="utf-8")
    except OSError as error:
        raise TableLayoutOverrideError(
            f"cannot read table layout config: {config_path}"
        ) from error
    try:
        config = json.loads(raw)
    except json.JSONDecodeError as error:
        raise TableLayoutOverrideError(
            f"invalid JSON in table layout config: {config_path}"
        ) from error
    return _validate_config(config)


def validate_override_document_catalog(
    config: Mapping[str, object], canonical_document_ids: list[str]
) -> TableLayoutConfig:
    """設定先が正本冊子に存在し、正本IDも一意であることを検証します。"""

    validated = _validate_config(dict(config))
    if any(
        not isinstance(document_id, str) or not _IDENTIFIER.fullmatch(document_id)
        for document_id in canonical_document_ids
    ):
        _fail("canonical document catalog contains an invalid ID")
    if len(set(canonical_document_ids)) != len(canonical_document_ids):
        _fail("canonical document catalog contains duplicate IDs")
    canonical = set(canonical_document_ids)
    unknown = sorted(
        {
            override["document_id"]
            for override in validated["overrides"]
            if override["document_id"] not in canonical
        }
    )
    if unknown:
        _fail(f"override document_id is not in the canonical catalog: {unknown}")
    return validated


def _sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _split_pipe_row(line: bytes) -> list[bytes]:
    stripped = line.rstrip(b"\r\n").strip()
    if not stripped.startswith(b"|") or not stripped.endswith(b"|"):
        _fail("only leading-and-trailing-pipe Markdown tables are supported")
    cells: list[bytes] = []
    current = bytearray()
    escaped = False
    for byte in stripped[1:-1]:
        if escaped:
            current.append(byte)
            escaped = False
        elif byte == ord("\\"):
            current.append(byte)
            escaped = True
        elif byte == ord("|"):
            cells.append(bytes(current).strip())
            current.clear()
        else:
            current.append(byte)
    if escaped:
        current.append(ord("\\"))
    cells.append(bytes(current).strip())
    return cells


def _extract_supported_tables(source: bytes) -> list[tuple[bytes, int]]:
    lines = source.splitlines(keepends=True)
    tables: list[tuple[bytes, int]] = []
    fence_marker: bytes | None = None
    index = 0
    while index < len(lines):
        fence = _FENCE.match(lines[index])
        if fence:
            marker = fence.group(1)
            if fence_marker is None:
                fence_marker = marker[:1]
            elif marker.startswith(fence_marker):
                fence_marker = None
            index += 1
            continue
        if fence_marker is not None or not _TABLE_LINE.fullmatch(lines[index]):
            index += 1
            continue

        end = index
        while end < len(lines) and _TABLE_LINE.fullmatch(lines[end]):
            end += 1
        block = lines[index:end]
        if len(block) < 2 or not _SEPARATOR_LINE.fullmatch(block[1]):
            index = end
            continue
        column_count = len(_split_pipe_row(block[0]))
        if column_count == 0 or any(
            len(_split_pipe_row(row)) != column_count for row in block[1:]
        ):
            _fail(f"unsupported Markdown table shape at line {index + 1}")
        tables.append((b"".join(block), column_count))
        index = end
    return tables


def _manifest_table(
    manifest: Mapping[str, object], override: ReviewedOverride
) -> None:
    tables = manifest.get("tables")
    if not isinstance(tables, list):
        _fail("manifest.tables must be an array")
    pairs: set[tuple[int, str]] = set()
    for index, table in enumerate(tables):
        if not isinstance(table, Mapping):
            _fail(f"manifest.tables[{index}] must be an object")
        source_order = table.get("source_order")
        table_id = table.get("id")
        if isinstance(source_order, bool) or not isinstance(source_order, int):
            _fail(f"manifest.tables[{index}].source_order is invalid")
        if not isinstance(table_id, str):
            _fail(f"manifest.tables[{index}].id is invalid")
        pair = (source_order, table_id)
        if pair in pairs:
            _fail(f"duplicate table identity in manifest: {pair}")
        pairs.add(pair)
    expected = (override["table_source_order"], override["table_id"])
    same_order = [pair for pair in pairs if pair[0] == expected[0]]
    if same_order != [expected]:
        _fail(f"manifest table does not match reviewed override: {expected}")


def _validate_table_geometry(
    geometry: object, override: ReviewedOverride, label: str
) -> tuple[object, ...]:
    if not isinstance(geometry, Mapping):
        _fail(f"{label}.table_geometry must be an object")
    identity = geometry.get("identity")
    if (
        geometry.get("status") != "supported"
        or not isinstance(identity, Mapping)
        or identity.get("status") != "supported"
        or identity.get("kind") != "data-pdf-table-id"
        or identity.get("value") != override["table_id"]
    ):
        _fail(f"{label} has unsupported or mismatched table identity")
    expected_columns = len(override["column_percentages"])
    if geometry.get("column_count") != expected_columns:
        _fail(f"{label} column_count does not match reviewed percentages")
    columns = geometry.get("columns")
    if not isinstance(columns, list) or len(columns) != expected_columns:
        _fail(f"{label}.columns does not describe every column")
    if geometry.get("unsupported_columns") not in ([], None):
        _fail(f"{label} contains unsupported columns")
    cells = geometry.get("cells")
    if not isinstance(cells, list) or not cells:
        _fail(f"{label}.cells must be a non-empty array")
    for cell_index, cell in enumerate(cells):
        if not isinstance(cell, Mapping):
            _fail(f"{label}.cells[{cell_index}] must be an object")
        if cell.get("row_span", 1) != 1 or cell.get("column_span", 1) != 1:
            _fail(f"{label} contains a row or column span")
    rect = geometry.get("rect")
    if not isinstance(rect, Mapping):
        _fail(f"{label}.rect must be an object")
    return tuple(rect.get(key) for key in ("left", "top", "right", "bottom"))


def _measurement_fragments(
    report: Mapping[str, object], override: ReviewedOverride
) -> int:
    dom_audit = report.get("dom_audit")
    observed = dom_audit.get("observed") if isinstance(dom_audit, Mapping) else None
    if not isinstance(observed, list):
        _fail("measurement_report.dom_audit.observed must be an array")
    fragments: set[tuple[object, ...]] = set()
    occurrence_count = 0
    for observed_index, observation in enumerate(observed):
        if not isinstance(observation, Mapping):
            _fail(f"observed[{observed_index}] must be an object")
        items = observation.get("items")
        if not isinstance(items, list):
            _fail(f"observed[{observed_index}].items must be an array")
        for item_index, item in enumerate(items):
            if not isinstance(item, Mapping):
                _fail(f"observed[{observed_index}].items[{item_index}] is invalid")
            geometry = item.get("table_geometry")
            identity = geometry.get("identity") if isinstance(geometry, Mapping) else None
            if not isinstance(identity, Mapping) or identity.get("value") != override["table_id"]:
                continue
            label = f"observed[{observed_index}].items[{item_index}]"
            rect_key = _validate_table_geometry(geometry, override, label)
            fragments.add((item.get("page_index"), *rect_key))
            occurrence_count += 1
    if occurrence_count == 0:
        _fail(f"reviewed table is absent from measurement report: {override['table_id']}")
    return len(fragments)


def _css_for_override(override: ReviewedOverride) -> str:
    table_id = override["table_id"]
    percentages = override["column_percentages"]
    count = len(percentages)
    return "\n".join(
        f'table[data-pdf-table-id="{table_id}"] '
        f"th:nth-child({index}):nth-last-child({count - index + 1})"
        f"{{width:{percentage}% !important;}}"
        for index, percentage in enumerate(percentages, start=1)
    )


def derive_reviewed_table_css(
    config: Mapping[str, object],
    source_path: str | Path,
    manifest: Mapping[str, object],
    measurement_report: Mapping[str, object],
) -> tuple[str, list[dict[str, object]]]:
    """ソース、manifest、DOMを照合して表単位のCSSを生成します。"""

    validated = _validate_config(dict(config))
    document_id = manifest.get("document_id")
    if not isinstance(document_id, str) or not document_id:
        _fail("manifest.document_id is required")
    overrides = [
        override
        for override in validated["overrides"]
        if override["document_id"] == document_id
    ]
    if not overrides:
        return "", []
    if measurement_report.get("document_id") != document_id:
        _fail("measurement report document_id does not match manifest")

    try:
        source = Path(source_path).read_bytes()
    except OSError as error:
        raise TableLayoutOverrideError(f"cannot read source: {source_path}") from error
    actual_source_sha = _sha256(source)
    tables = _extract_supported_tables(source)
    css_parts: list[str] = []
    applied: list[dict[str, object]] = []
    for override in overrides:
        if actual_source_sha != override["source_sha256"]:
            _fail(f"source SHA is stale for {document_id}")
        source_order = override["table_source_order"]
        if source_order >= len(tables):
            _fail(f"reviewed source table does not exist: {source_order}")
        raw_table, source_column_count = tables[source_order]
        if _sha256(raw_table) != override["table_sha256"]:
            _fail(f"table fragment SHA is stale for {override['table_id']}")
        if source_column_count != len(override["column_percentages"]):
            _fail(f"source column count does not match {override['table_id']}")
        _manifest_table(manifest, override)
        fragment_count = _measurement_fragments(measurement_report, override)
        css_parts.append(_css_for_override(override))
        applied.append(
            {
                "document_id": document_id,
                "table_id": override["table_id"],
                "table_source_order": source_order,
                "column_percentages": list(override["column_percentages"]),
                "source_sha256": actual_source_sha,
                "table_sha256": override["table_sha256"],
                "evidence_pdf_sha256": override["evidence_pdf_sha256"],
                "review": override["review"],
                "observed_fragment_count": fragment_count,
                "requires_final_dom_pdf_and_visual_review": True,
            }
        )
    return "\n".join(css_parts) + "\n", applied
