"""上流 helper の限定採用が既存の組版順・receipt 境界を壊さないことを固定する。"""
import ast
from pathlib import Path
import unittest


SOURCE = Path(__file__).with_name("build_pdf_book.py").read_text(encoding="utf-8")


class ReconciliationContractTest(unittest.TestCase):
    def test_html_stages_keep_semantic_order(self):
        stages = [
            "converted_markup = join_cjk_soft_breaks(converted.stdout)",
            "annotate_inline_code(converted_markup, slug)",
            "markup = wrap_code_in_html(annotated, residuals)",
            "markup, pre_sources = annotate_pres(markup)",
            "markup = apply_breakable_measurements(markup, pre_sources, pre_report)",
            "markup = number_external_link_footnotes(markup)",
            "validate_annotated_html(markup, inline_manifest)",
        ]
        positions = [SOURCE.index(stage) for stage in stages]
        self.assertEqual(positions, sorted(positions))

    def test_active_helpers_are_bound_by_receipt(self):
        start = SOURCE.index("def release_input_snapshot(")
        end = SOURCE.index("def write_release_receipt(", start)
        receipt = SOURCE[start:end]
        for active in (
            "Path(__file__).resolve()",
            "BREAKABLE_CODE.resolve()",
            "MEASURE_BREAKABLE_CODE.resolve()",
            'with_name("code_wrap.py")',
            'with_name("inline_layout.py")',
            'with_name("inline_layout_css.py")',
            'with_name("table_layout_override.py")',
            "TABLE_LAYOUT_OVERRIDES.resolve()",
        ):
            self.assertIn(active, receipt)

    def test_deferred_table_helpers_are_not_claimed_active(self):
        self.assertNotIn("from table_latin import", SOURCE)
        self.assertNotIn("from table_structure import", SOURCE)
        self.assertNotIn("protect_table_latin(", SOURCE)
        self.assertNotIn("restructure_tables(", SOURCE)

    def test_top_level_functions_are_not_defined_twice(self):
        functions = [
            node.name
            for node in ast.parse(SOURCE).body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        ]
        duplicates = sorted({name for name in functions if functions.count(name) > 1})
        self.assertEqual(duplicates, [])


if __name__ == "__main__":
    unittest.main()
