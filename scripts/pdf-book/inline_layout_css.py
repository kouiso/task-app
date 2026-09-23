"""実組版の寸法から、行内コードを収めるCSS候補だけを計算する。"""

from __future__ import annotations

import math
import re


NOWRAP_CSS = '[data-pdf-inline-id]{white-space:nowrap;overflow-wrap:normal;word-break:normal;hyphens:none;}\n'
# 等幅フォントの文字枠が小見出しの行高を超え、改ページ直後に版面から出るのを防ぐ。
HEADING_INLINE_CSS = (
    ",".join(f"h{level}:has([data-pdf-inline-id])" for level in range(1, 7))
    + "{line-height:1.6;}\n"
)
SAFE_ID = re.compile(r"pdf-inline-[0-9a-f]{12}-\d{5}")
SAFE_TABLE_ID = re.compile(r"pdf-table-[0-9a-f]{12}-\d{5}")
TABLE_OVERFLOW_CHECKS = {
    "cell_content_bounds",
    "page_content_bounds",
    "sibling_cell_overlap",
}


def _positive(value: object, label: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{label}: 数値がありません")
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"{label}: 正の有限値が必要です")
    return float(value)


def _nonnegative(value: object, label: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{label}: 数値がありません")
    if not math.isfinite(value) or value < 0:
        raise ValueError(f"{label}: 0以上の有限値が必要です")
    return float(value)


def derive_flow_css(manifest: dict, report: dict) -> tuple[str, list[dict]]:
    """候補CSSと縮小記録を返す。最終組版や表の合格は判定しない。"""
    if manifest.get("schema_version") != 1 or manifest.get("minimum_font_size_pt") != 8:
        raise ValueError("8pt下限のmanifest v1が必要です")
    if report.get("document_id") != manifest.get("document_id"):
        raise ValueError("別の冊子の計測結果です")
    dom = report.get("dom_audit", {})
    if dom.get("ready_state") != "complete":
        raise ValueError("組版完了後の計測結果が必要です")
    entries = manifest["entries"]
    observed = dom.get("observed", [])
    ids = [entry["id"] for entry in entries]
    if len(set(ids)) != len(ids) or [item["id"] for item in observed] != ids:
        raise ValueError("計測結果のIDまたは順序が原稿と異なります")
    css = [NOWRAP_CSS]
    changes = []
    for entry, group in zip(entries, observed):
        identifier = entry["id"]
        if not SAFE_ID.fullmatch(identifier):
            raise ValueError("生成属性ではないIDです")
        if len(group.get("items", [])) != 1:
            raise ValueError(f"{identifier}: 1つのコードを一意に測定できません")
        item = group["items"][0]
        if item.get("text") != entry["expected_text"] or len(item.get("line_rects", [])) != 1:
            raise ValueError(f"{identifier}: nowrapで本文を測定してください")
        if entry["context"] == "table":
            continue
        if entry["context"] != "flow":
            raise ValueError("未知のコード配置です")
        flow = item.get("flow_geometry") or {}
        if flow.get("status") != "supported":
            raise ValueError(f"{identifier}: 段落幅を証明できません")
        available = _positive(flow.get("available_width"), "段落幅")
        width = _positive(item.get("code_rect", {}).get("width"), "コード幅")
        font = _positive(item.get("font_size_pt"), "フォント")
        if font < 7.99:
            raise ValueError(f"{identifier}: 計測時点で8pt未満です")
        if width <= available:
            continue
        content = _positive(item.get("code_box", {}).get("content_width"), "文字幅")
        fixed = width - content
        if fixed < 0 or available <= fixed:
            raise ValueError(f"{identifier}: 縮小可能な幅がありません")
        target = math.floor(font * (available - fixed) / content * 1000) / 1000
        if target < 8:
            raise ValueError(f"{identifier}: 8ptでは収まりません。配置を変更してください")
        css.append(f'[data-pdf-inline-id="{identifier}"]{{font-size:{target:.3f}pt;}}\n')
        changes.append({"id": identifier, "from_pt": font, "to_pt": target})
    return "".join(css), changes


def _table_rule(table_id: str, percentages: list[float]) -> str:
    selectors = []
    rules = [f'[data-pdf-table-id="{table_id}"]{{table-layout:fixed;}}\n']
    column_count = len(percentages)
    for index, percentage in enumerate(percentages, 1):
        from_end = column_count - index + 1
        selectors[:] = [
            f'table[data-pdf-table-id="{table_id}"]>:is(thead,tbody,tfoot)>tr>'
            f':is(th,td):nth-child({index}):nth-last-child({from_end})',
            f'table[data-pdf-table-id="{table_id}"]>tr>'
            f':is(th,td):nth-child({index}):nth-last-child({from_end})',
        ]
        rules.append(
            ",".join(selectors) + f"{{width:{percentage:.6f}%;}}\n"
        )
    return "".join(rules)


def derive_table_css(manifest: dict, report: dict) -> tuple[str, list[dict], list[dict]]:
    """表の実測幅を再配分する候補を返す。合格判定や文字縮小は行わない。"""
    if manifest.get("schema_version") != 1 or manifest.get("minimum_font_size_pt") != 8:
        raise ValueError("8pt下限のmanifest v1が必要です")
    if report.get("document_id") != manifest.get("document_id"):
        raise ValueError("別の冊子の計測結果です")
    if not isinstance(manifest.get("tables"), list):
        raise ValueError("manifest tablesが必要です")
    dom = report.get("dom_audit", {})
    if dom.get("ready_state") != "complete":
        raise ValueError("組版完了後の計測結果が必要です")
    entries = manifest.get("entries")
    observed = dom.get("observed")
    if not isinstance(entries, list) or not isinstance(observed, list):
        raise ValueError("manifest entriesと計測結果が必要です")
    ids = [entry.get("id") for entry in entries]
    if len(set(ids)) != len(ids) or [group.get("id") for group in observed] != ids:
        raise ValueError("計測結果のIDまたは順序が原稿と異なります")
    table_ids = [table.get("id") for table in manifest["tables"]]
    if len(set(table_ids)) != len(table_ids) or any(
        not isinstance(table_id, str) or not SAFE_TABLE_ID.fullmatch(table_id)
        for table_id in table_ids
    ):
        raise ValueError("manifest table idが不正です")
    inventory = dom.get("table_inventory") or {}
    inventory_tables = inventory.get("tables")
    if inventory_tables is None and not table_ids:
        inventory_tables = []
    if not isinstance(inventory_tables, list):
        raise ValueError("全表fragmentの計測結果が必要です")
    inventory_by_id = {
        table.get("id"): table
        for table in inventory_tables
        if isinstance(table, dict) and isinstance(table.get("id"), str)
    }
    if (
        len(inventory_by_id) != len(inventory_tables)
        or set(inventory_by_id) != set(table_ids)
    ):
        raise ValueError("全表fragmentのIDがmanifestと一致しません")

    overflow_ids = {
        violation.get("id")
        for violation in dom.get("violations", [])
        if violation.get("check") in TABLE_OVERFLOW_CHECKS
        and isinstance(violation.get("id"), str)
    }
    measurements: dict[str, list[dict]] = {}
    unresolved: list[dict] = []
    unidentified_overflow_ids: set[str] = set()
    for entry, group in zip(entries, observed):
        identifier = entry.get("id")
        if not isinstance(identifier, str) or not SAFE_ID.fullmatch(identifier):
            raise ValueError("生成属性ではないIDです")
        items = group.get("items", [])
        if len(items) != 1:
            raise ValueError(f"{identifier}: 1つのコードを一意に測定できません")
        item = items[0]
        if item.get("text") != entry.get("expected_text") or len(item.get("line_rects", [])) != 1:
            raise ValueError(f"{identifier}: nowrapで本文を測定してください")
        if entry.get("context") != "table":
            continue
        geometry = item.get("table_geometry") or {}
        identity = geometry.get("identity") or {}
        table_id = identity.get("value")
        if (
            geometry.get("status") != "supported"
            or identity.get("status") != "supported"
            or identity.get("kind") != "data-pdf-table-id"
            or table_id not in table_ids
        ):
            if identifier in overflow_ids:
                unidentified_overflow_ids.add(identifier)
            continue
        measurements.setdefault(table_id, []).append(
            {"inline_id": identifier, "item": item, "geometry": geometry}
        )

    if unidentified_overflow_ids:
        unresolved.append(
            {
                "table_id": None,
                "reason": "stable_table_measurement_missing",
                "details": {"inline_ids": sorted(unidentified_overflow_ids)},
            }
        )

    css = []
    adjustments = []
    for table_id in table_ids:
        records = measurements.get(table_id, [])
        if not records or not any(
            record["inline_id"] in overflow_ids for record in records
        ):
            continue
        reason = None
        details: dict = {}
        inventory_fragments = inventory_by_id[table_id].get("fragments")
        if not isinstance(inventory_fragments, list) or not inventory_fragments:
            unresolved.append(
                {
                    "table_id": table_id,
                    "reason": "table_fragment_measurement_missing",
                    "details": {},
                }
            )
            continue
        fragments = [
            {
                "geometry": record["geometry"],
                "page_content_rect": record["item"].get("page_content_rect"),
            }
            for record in records
        ] + inventory_fragments
        column_counts = {
            (fragment.get("geometry") or {}).get("column_count")
            for fragment in fragments
        }
        if len(column_counts) != 1 or None in column_counts:
            reason = "inconsistent_fragment_column_count"
        else:
            column_count = column_counts.pop()
            if not isinstance(column_count, int) or column_count <= 0:
                reason = "invalid_column_count"
        if reason is None:
            current_width_sets = []
            available_widths = []
            for fragment_record in fragments:
                fragment = fragment_record.get("geometry") or {}
                if fragment.get("unsupported_columns"):
                    reason = "column_geometry_not_proven"
                    details = {"unsupported_columns": fragment["unsupported_columns"]}
                    break
                cells = fragment.get("cells", [])
                if any(
                    cell.get("column_span") != 1 or cell.get("row_span") != 1
                    for cell in cells
                ):
                    reason = "spanning_cell_not_supported"
                    break
                columns = fragment.get("columns", [])
                if [column.get("column_index") for column in columns] != list(range(column_count)):
                    reason = "column_geometry_not_proven"
                    break
                try:
                    current_width_sets.append(
                        [_positive(column.get("width"), "列幅") for column in columns]
                    )
                    table_rect = fragment.get("rect") or {}
                    page_rect = fragment_record.get("page_content_rect") or {}
                    table_left = _nonnegative(table_rect.get("left"), "表の左端")
                    available_widths.append(
                        math.floor(
                            min(
                                _positive(table_rect.get("width"), "表幅"),
                                _positive(page_rect.get("width"), "版面幅"),
                                _positive(
                                    _nonnegative(page_rect.get("right"), "版面の右端")
                                    - table_left,
                                    "表から版面右端までの幅",
                                ),
                            )
                        )
                    )
                except ValueError as error:
                    reason = "required_width_unknown"
                    details = {"error": str(error)}
                    break
            if reason is None:
                measured_widths = current_width_sets[0]
                if any(
                    any(abs(actual - expected) > 0.25 for actual, expected in zip(widths, measured_widths))
                    for widths in current_width_sets[1:]
                ):
                    reason = "inconsistent_fragment_column_widths"
                elif not available_widths or min(available_widths) <= 0:
                    reason = "required_width_unknown"
                    details = {"error": "利用可能な表幅を整数CSS pxで確定できません"}
                else:
                    available_width = min(available_widths)
                    measured_total = sum(measured_widths)
                    current_widths = [
                        width * available_width / measured_total
                        for width in measured_widths
                    ]
        minimum_widths = [0.0] * column_count if reason is None else []
        columns_with_code: set[int] = set()
        if reason is None:
            for record in records:
                item = record["item"]
                geometry = record["geometry"]
                target = geometry.get("target") or {}
                column_index = target.get("column_index")
                if (
                    not isinstance(column_index, int)
                    or not 0 <= column_index < column_count
                    or target.get("column_span") != 1
                ):
                    reason = "target_cell_position_not_proven"
                    break
                matching_cells = [
                    cell
                    for cell in geometry.get("cells", [])
                    if cell.get("row_index") == target.get("row_index")
                    and cell.get("cell_index") == target.get("cell_index")
                ]
                if len(matching_cells) != 1:
                    reason = "target_cell_measurement_missing"
                    break
                measured_cell = matching_cells[0]
                expected_position = (
                    target.get("row_index"),
                    target.get("cell_index"),
                    target.get("column_index"),
                    target.get("row_span"),
                    target.get("column_span"),
                )
                actual_position = (
                    measured_cell.get("row_index"),
                    measured_cell.get("cell_index"),
                    measured_cell.get("column_index"),
                    measured_cell.get("row_span"),
                    measured_cell.get("column_span"),
                )
                if actual_position != expected_position:
                    reason = "target_cell_position_mismatch"
                    details = {"inline_id": record["inline_id"]}
                    break
                item_cell_rect = item.get("cell_content_rect") or {}
                measured_cell_rect = measured_cell.get("content_rect") or {}
                rect_fields = ("left", "right", "width")
                try:
                    if any(
                        abs(
                            _nonnegative(item_cell_rect.get(field), "inline側セル寸法")
                            - _nonnegative(measured_cell_rect.get(field), "表側セル寸法")
                        )
                        > 0.25
                        for field in rect_fields
                    ):
                        reason = "target_cell_content_rect_mismatch"
                        details = {"inline_id": record["inline_id"]}
                        break
                except ValueError as error:
                    reason = "required_width_unknown"
                    details = {"inline_id": record["inline_id"], "error": str(error)}
                    break
                try:
                    code_width = _positive(item.get("code_rect", {}).get("width"), "コード外幅")
                    cell_fixed = _nonnegative(
                        measured_cell.get("box", {}).get("horizontal_fixed"),
                        "セル余白",
                    )
                except ValueError as error:
                    reason = "required_width_unknown"
                    details = {"inline_id": record["inline_id"], "error": str(error)}
                    break
                columns_with_code.add(column_index)
                minimum_widths[column_index] = max(
                    minimum_widths[column_index], math.ceil(code_width + cell_fixed)
                )
        if reason is not None:
            unresolved.append({"table_id": table_id, "reason": reason, "details": details})
            continue
        total_width = available_width
        minimum_sum = sum(minimum_widths)
        if minimum_sum > total_width + 0.25:
            unresolved.append(
                {
                    "table_id": table_id,
                    "reason": "minimum_width_sum_exceeds_table",
                    "details": {
                        "table_width": total_width,
                        "minimum_width_sum": minimum_sum,
                    },
                }
            )
            continue
        remaining = total_width - minimum_sum
        code_free_columns = [
            index for index in range(column_count) if index not in columns_with_code
        ]
        if code_free_columns and remaining <= 0.25:
            unresolved.append(
                {
                    "table_id": table_id,
                    "reason": "code_free_column_width_not_proven",
                    "details": {"columns": code_free_columns},
                }
            )
            continue
        deficits = [
            max(0.0, minimum - current)
            for minimum, current in zip(minimum_widths, current_widths)
        ]
        slacks = [
            max(0.0, current - minimum)
            for minimum, current in zip(minimum_widths, current_widths)
        ]
        needed = sum(deficits)
        available = sum(slacks)
        if needed <= 0.25:
            unresolved.append(
                {"table_id": table_id, "reason": "no_width_change_derived", "details": {}}
            )
            continue
        target_widths = [
            max(current, minimum)
            for minimum, current in zip(minimum_widths, current_widths)
        ]
        for index, slack in enumerate(slacks):
            if slack > 0:
                target_widths[index] -= needed * slack / available
        rounding_error = total_width - sum(target_widths)
        target_widths[-1] += rounding_error
        percentages = [width * 100 / total_width for width in target_widths]
        percentages[-1] += 100 - sum(percentages)
        css.append(_table_rule(table_id, percentages))
        adjustments.append(
            {
                "table_id": table_id,
                "column_count": column_count,
                "measured_widths": measured_widths,
                "available_width": available_width,
                "current_widths": current_widths,
                "minimum_widths": minimum_widths,
                "target_widths": target_widths,
                "percentages": percentages,
                "inline_ids": sorted(record["inline_id"] for record in records),
                "code_free_columns": code_free_columns,
                "allocation_basis": "minimum_change_proportional_to_current_width_slack",
                "requires_post_render_verification": True,
            }
        )
    return "".join(css), adjustments, unresolved
