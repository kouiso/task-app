"""本文を改変せず段落幅に収める候補CSSの境界検査。"""

import copy
import unittest

from inline_layout_css import NOWRAP_CSS, derive_flow_css, derive_table_css


class FlowCssTest(unittest.TestCase):
    def setUp(self):
        self.identifier = "pdf-inline-0123456789ab-00000"
        self.manifest = {"schema_version": 1, "minimum_font_size_pt": 8,
                         "document_id": "one", "entries": [{"id": self.identifier,
                         "expected_text": "cd task-app", "context": "flow"}]}
        self.item = {"text": "cd task-app", "line_rects": [{}], "font_size_pt": 12,
                     "code_rect": {"width": 160}, "code_box": {"content_width": 150},
                     "flow_geometry": {"status": "supported", "available_width": 120}}
        self.report = {"document_id": "one", "dom_audit": {"ready_state": "complete",
                       "observed": [{"id": self.identifier, "items": [self.item]}]}}

    def test_long_flow_uses_full_width_and_preserves_inputs(self):
        before = copy.deepcopy((self.manifest, self.report))
        css, changes = derive_flow_css(self.manifest, self.report)
        self.assertIn("font-size:8.800pt", css)
        self.assertEqual(changes[0]["to_pt"], 8.8)
        self.assertEqual(before, (self.manifest, self.report))

    def test_short_code_and_tables_are_not_automatically_shrunk(self):
        self.item["code_rect"]["width"] = 100
        self.assertEqual(derive_flow_css(self.manifest, self.report), (NOWRAP_CSS, []))
        self.manifest["entries"][0]["context"] = "table"
        self.item["code_rect"]["width"] = 1000
        self.assertEqual(derive_flow_css(self.manifest, self.report), (NOWRAP_CSS, []))

    def test_below_floor_requires_layout_change(self):
        self.item["flow_geometry"]["available_width"] = 109
        with self.assertRaisesRegex(ValueError, "8ptでは"):
            derive_flow_css(self.manifest, self.report)

    def test_wrapped_missing_or_wrong_source_is_rejected(self):
        for key, value in [("line_rects", [{}, {}]), ("text", "cd taskapp")]:
            with self.subTest(key=key):
                report = copy.deepcopy(self.report)
                report["dom_audit"]["observed"][0]["items"][0][key] = value
                with self.assertRaises(ValueError):
                    derive_flow_css(self.manifest, report)
        self.report["document_id"] = "other"
        with self.assertRaises(ValueError):
            derive_flow_css(self.manifest, self.report)

    def test_unsupported_or_nonfinite_measurement_is_rejected(self):
        for flow in [{"status": "unsupported"}, {"status": "supported", "available_width": float("nan")}]:
            self.item["flow_geometry"] = flow
            with self.assertRaises(ValueError):
                derive_flow_css(self.manifest, self.report)


class TableCssTest(unittest.TestCase):
    def setUp(self):
        self.table_id = "pdf-table-0123456789ab-00000"
        self.ids = [
            "pdf-inline-0123456789ab-00000",
            "pdf-inline-0123456789ab-00001",
            "pdf-inline-0123456789ab-00002",
        ]
        self.manifest = {
            "schema_version": 1,
            "minimum_font_size_pt": 8,
            "document_id": "table-book",
            "tables": [{"id": self.table_id, "source_order": 0, "source_id": None}],
            "entries": [
                {"id": identifier, "expected_text": text, "context": "table"}
                for identifier, text in zip(self.ids, ("short", "very long", "other"))
            ],
        }
        self.report = {
            "document_id": "table-book",
            "dom_audit": {
                "ready_state": "complete",
                "violations": [
                    {"check": "cell_content_bounds", "id": self.ids[1]}
                ],
                "observed": [
                    {"id": self.ids[0], "items": [self._item(0, 40, 1)]},
                    {"id": self.ids[1], "items": [self._item(1, 150, 1)]},
                    {"id": self.ids[2], "items": [self._item(2, 60, 2)]},
                ],
                "table_inventory": {
                    "tables": [
                        {
                            "id": self.table_id,
                            "fragments": [
                                {
                                    "page_index": 1,
                                    "page_content_rect": {
                                        "left": 0,
                                        "right": 300,
                                        "width": 300,
                                    },
                                    "geometry": self._geometry(1),
                                }
                            ],
                        }
                    ],
                },
            },
        }

    def _geometry(self, page=1, spans=False, widths=None, fixed=10):
        widths = widths or [100, 100, 100]
        left = 0
        columns = []
        cells = []
        for index, width in enumerate(widths):
            columns.append({"column_index": index, "width": width})
            cells.append(
                {
                    "row_index": 0,
                    "cell_index": index,
                    "column_index": index,
                    "column_span": 2 if spans and index == 0 else 1,
                    "row_span": 1,
                    "box": {"horizontal_fixed": fixed},
                    "content_rect": {
                        "left": left + fixed / 2,
                        "right": left + width - fixed / 2,
                        "width": width - fixed,
                    },
                }
            )
            left += width
        return {
            "status": "supported",
            "identity": {
                "status": "supported",
                "kind": "data-pdf-table-id",
                "value": self.table_id,
            },
            "rect": {
                "left": 0,
                "top": page * 100,
                "right": sum(widths),
                "bottom": page * 100 + 50,
                "width": sum(widths),
            },
            "column_count": 3,
            "columns": columns,
            "unsupported_columns": [],
            "cells": cells,
            "target": {
                "row_index": 0,
                "cell_index": 0,
                "column_index": 0,
                "row_span": 1,
                "column_span": 1,
            },
        }

    def _item(self, column, code_width, page, geometry=None):
        geometry = copy.deepcopy(geometry or self._geometry(page))
        geometry["target"].update({"cell_index": column, "column_index": column})
        return {
            "page_index": page,
            "text": ("short", "very long", "other")[column],
            "line_rects": [{}],
            "code_rect": {"width": code_width},
            "page_content_rect": {
                "left": 0,
                "right": sum(column["width"] for column in geometry["columns"]),
                "width": sum(column["width"] for column in geometry["columns"]),
            },
            "cell_content_rect": copy.deepcopy(
                geometry["cells"][column]["content_rect"]
            ),
            "table_geometry": geometry,
        }

    def test_overflow_simple_grid_reallocates_without_shrinking_code(self):
        before = copy.deepcopy((self.manifest, self.report))
        css, adjustments, unresolved = derive_table_css(self.manifest, self.report)

        self.assertEqual(unresolved, [])
        self.assertEqual(len(adjustments), 1)
        change = adjustments[0]
        self.assertEqual(change["minimum_widths"], [50, 160, 70])
        self.assertAlmostEqual(sum(change["target_widths"]), 300)
        self.assertGreaterEqual(change["target_widths"][1], 160)
        self.assertIn(f'data-pdf-table-id="{self.table_id}"', css)
        self.assertIn(":nth-child(2):nth-last-child(2)", css)
        self.assertNotIn("font-size", css)
        self.assertEqual(before, (self.manifest, self.report))

    def test_overflowing_initial_table_uses_floor_page_budget_and_ceil_minimum(self):
        geometry = self._geometry(widths=[210, 210, 210], fixed=17)
        items = [
            self._item(0, 364.072, 1, geometry),
            self._item(1, 40, 1, geometry),
            self._item(2, 60, 1, geometry),
        ]
        for item in items:
            item["page_content_rect"] = {"left": 0, "right": 627.4, "width": 627.4}
        self.report["dom_audit"]["observed"] = [
            {"id": identifier, "items": [item]}
            for identifier, item in zip(self.ids, items)
        ]
        self.report["dom_audit"]["violations"] = [
            {"check": "cell_content_bounds", "id": self.ids[0]}
        ]
        self.report["dom_audit"]["table_inventory"]["tables"][0]["fragments"] = [{
            "page_index": 1,
            "page_content_rect": {"left": 0, "right": 627.4, "width": 627.4},
            "geometry": copy.deepcopy(geometry),
        }]

        _, adjustments, unresolved = derive_table_css(self.manifest, self.report)

        self.assertEqual(unresolved, [])
        change = adjustments[0]
        self.assertEqual(change["measured_widths"], [210, 210, 210])
        self.assertEqual(change["available_width"], 627)
        self.assertEqual(change["current_widths"], [209, 209, 209])
        self.assertEqual(change["minimum_widths"], [382, 57, 77])
        self.assertGreaterEqual(change["target_widths"][0], 382)
        self.assertAlmostEqual(sum(change["target_widths"]), 627)

    def test_smallest_inventory_fragment_and_right_edge_bound_the_budget(self):
        narrow = self._geometry(2)
        narrow["rect"].update({"left": 5, "right": 305, "width": 300})
        self.report["dom_audit"]["table_inventory"]["tables"][0][
            "fragments"
        ].append({
            "page_index": 2,
            "page_content_rect": {"left": 0, "right": 295.8, "width": 295.8},
            "geometry": narrow,
        })

        _, adjustments, unresolved = derive_table_css(self.manifest, self.report)

        self.assertEqual(unresolved, [])
        self.assertEqual(adjustments[0]["available_width"], 290)
        self.assertAlmostEqual(sum(adjustments[0]["target_widths"]), 290)

    def test_code_free_column_receives_positive_candidate_width(self):
        self.manifest["entries"] = self.manifest["entries"][:2]
        self.report["dom_audit"]["observed"] = self.report["dom_audit"]["observed"][:2]
        self.report["dom_audit"]["observed"][1]["items"][0]["code_rect"]["width"] = 140

        _, adjustments, unresolved = derive_table_css(self.manifest, self.report)

        self.assertEqual(unresolved, [])
        self.assertEqual(adjustments[0]["minimum_widths"], [50, 150, 0])
        self.assertGreater(adjustments[0]["target_widths"][2], 0)
        self.assertEqual(adjustments[0]["code_free_columns"], [2])

    def test_unrelated_table_without_overflow_gets_no_rule(self):
        self.report["dom_audit"]["violations"] = []
        self.assertEqual(derive_table_css(self.manifest, self.report), ("", [], []))

    def test_all_fragments_must_have_the_same_simple_grid(self):
        second = self._item(1, 150, 2, self._geometry(2, widths=[90, 110, 100]))
        self.report["dom_audit"]["observed"][1]["items"] = [second]
        with self.assertRaisesRegex(ValueError, "1つのコード"):
            # 同じinline IDの複数fragmentはmanifest coverage違反なので先に拒否する。
            self.report["dom_audit"]["observed"][1]["items"].append(
                self._item(1, 150, 1)
            )
            derive_table_css(self.manifest, self.report)

        self.report["dom_audit"]["observed"][1]["items"] = [second]
        _, adjustments, unresolved = derive_table_css(self.manifest, self.report)
        self.assertEqual(adjustments, [])
        self.assertEqual(unresolved[0]["reason"], "inconsistent_fragment_column_widths")

    def test_spanning_cells_and_overwide_minimum_are_unresolved(self):
        geometry = self._geometry(1, spans=True)
        self.report["dom_audit"]["observed"][1]["items"] = [
            self._item(1, 150, 1, geometry)
        ]
        _, changes, unresolved = derive_table_css(self.manifest, self.report)
        self.assertEqual(changes, [])
        self.assertEqual(unresolved[0]["reason"], "spanning_cell_not_supported")

        self.report["dom_audit"]["observed"][1]["items"] = [self._item(1, 310, 1)]
        _, changes, unresolved = derive_table_css(self.manifest, self.report)
        self.assertEqual(changes, [])
        self.assertEqual(unresolved[0]["reason"], "minimum_width_sum_exceeds_table")

    def test_missing_target_measurement_is_structured_unresolved(self):
        item = self.report["dom_audit"]["observed"][1]["items"][0]
        item["table_geometry"]["target"]["cell_index"] = 99
        _, changes, unresolved = derive_table_css(self.manifest, self.report)
        self.assertEqual(changes, [])
        self.assertEqual(unresolved[0]["reason"], "target_cell_measurement_missing")

    def test_target_cell_position_and_content_rect_must_match(self):
        item = self.report["dom_audit"]["observed"][1]["items"][0]
        cell = item["table_geometry"]["cells"][1]
        cell["column_index"] = 0
        _, changes, unresolved = derive_table_css(self.manifest, self.report)
        self.assertEqual(changes, [])
        self.assertEqual(unresolved[0]["reason"], "target_cell_position_mismatch")

        item = self._item(1, 150, 1)
        item["cell_content_rect"]["width"] -= 1
        self.report["dom_audit"]["observed"][1]["items"] = [item]
        _, changes, unresolved = derive_table_css(self.manifest, self.report)
        self.assertEqual(changes, [])
        self.assertEqual(unresolved[0]["reason"], "target_cell_content_rect_mismatch")


if __name__ == "__main__":
    unittest.main()
