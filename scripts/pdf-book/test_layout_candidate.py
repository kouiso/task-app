import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CSS_PATH = ROOT / "material/style/book.css"
TABLE_CONFIG = Path(__file__).with_name("table-layout.json")

class LayoutCandidateTest(unittest.TestCase):
    def test_keep_next_prevents_internal_split_without_global_paragraph_rule(self) -> None:
        css = CSS_PATH.read_text(encoding="utf-8")
        rule = re.search(r"\.pdf-keep-next\s*\{([^}]+)\}", css, re.S)
        self.assertIsNotNone(rule)
        assert rule is not None
        self.assertIn("break-after: avoid", rule.group(1))
        self.assertIn("break-inside: avoid", rule.group(1))
        stripped = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
        paragraph = re.search(r"(?m)^\s*p\s*\{([^}]+)\}", stripped)
        self.assertIsNotNone(paragraph)
        assert paragraph is not None
        self.assertNotIn("break-inside", paragraph.group(1))

    def test_contents_keep_rule_is_exact_and_not_global(self) -> None:
        css = CSS_PATH.read_text(encoding="utf-8")
        selector = "h3#完成するアプリの機能 + ol > li"
        self.assertEqual(css.count(selector), 1)
        rule = re.search(rf"{re.escape(selector)}\s*\{{([^}}]+)\}}", css)
        self.assertIsNotNone(rule)
        assert rule is not None
        self.assertIn("break-inside: avoid", rule.group(1))
        stripped = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
        self.assertIsNone(re.search(r"(?m)^\s*(?:li|ol\s*>\s*li)\s*\{[^}]*break-inside", stripped))

    def test_table_trials_are_bound_to_only_safe_representative_tables(self) -> None:
        config = json.loads(TABLE_CONFIG.read_text(encoding="utf-8"))
        trials = [row for row in config["overrides"] if row["document_id"] in {"append-7f35ce", "day01-bf910a"}]
        expected = {"append-7f35ce": {0}, "day01-bf910a": {0}}
        self.assertEqual(len(trials), 2)
        self.assertEqual({doc: {row["table_source_order"] for row in trials if row["document_id"] == doc} for doc in expected}, expected)
        for row in trials:
            self.assertEqual(sum(row["column_percentages"]), 100)

    def test_day07_completed_code_table_has_a_bound_readable_width_override(self) -> None:
        config = json.loads(TABLE_CONFIG.read_text(encoding="utf-8"))
        matches = [
            row for row in config["overrides"]
            if row["document_id"] == "day07-ec8746" and row["table_source_order"] == 13
        ]
        self.assertEqual(len(matches), 1)
        row = matches[0]
        self.assertEqual(row["table_id"], "pdf-table-fd90476cd346-00013")
        self.assertEqual(
            row["table_sha256"],
            "225a6d62b6e6c0370f4bc36846fac0c8edd92ab82b4841a61b0816b1ee53136f",
        )
        self.assertGreaterEqual(row["column_percentages"][1], 35)
        self.assertGreaterEqual(row["column_percentages"][2], 14)
        self.assertEqual(sum(row["column_percentages"]), 100)
        css = CSS_PATH.read_text(encoding="utf-8")
        selector = (
            'table[data-pdf-table-id="pdf-table-fd90476cd346-00013"] '
            'td:first-child code'
        )
        rule = re.search(rf"{re.escape(selector)}\s*\{{([^}}]+)\}}", css, re.S)
        self.assertIsNotNone(rule)
        assert rule is not None
        self.assertIn("padding-inline: 0", rule.group(1))

    def test_fixed_layout_wrapping_and_font_floor_contracts_remain(self) -> None:
        css = CSS_PATH.read_text(encoding="utf-8")
        self.assertIsNotNone(re.search(r"table\s*\{[^}]*table-layout:\s*fixed", css, re.S))
        self.assertIsNotNone(re.search(r"td,\s*th\s*\{[^}]*overflow-wrap:\s*anywhere", css, re.S))
        table_code = re.search(r"td code,\s*th code\s*\{([^}]+)\}", css, re.S)
        self.assertIsNotNone(table_code)
        assert table_code is not None
        self.assertNotIn("white-space", table_code.group(1))
        inline_layout = Path(__file__).with_name("inline_layout.py").read_text(encoding="utf-8")
        self.assertIn("MINIMUM_FONT_SIZE_PT = 8", inline_layout)

if __name__ == "__main__":
    unittest.main()
