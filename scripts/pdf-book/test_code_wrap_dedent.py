"""JSX字下げ除去を、書式変更側と独立した入力で確認する。"""
from __future__ import annotations

import html
import re
import unittest

from code_wrap import PRE_FONT_PT, SHRINK_MIN_PT, wrap_code_in_html
from test_code_wrap import copied_code, pre, ts_emit, ts_syntax_errors


TEXT = '8文字以上で、大文字・小文字・数字・特殊文字をそれぞれ1文字以上含めてください'


class DedentSemanticsTest(unittest.TestCase):
    def check_semantics(self, source: str) -> tuple[str, list[str]]:
        residuals: list[str] = []
        rendered = wrap_code_in_html(pre(html.escape(source)), residuals)
        copied = copied_code(rendered)
        self.assertEqual(ts_syntax_errors(source), [])
        self.assertEqual(ts_syntax_errors(copied), [])
        self.assertEqual(ts_emit(copied), ts_emit(source))
        for percentage in re.findall(r'font-size:(\d+)%', rendered):
            if PRE_FONT_PT * int(percentage) / 100 < SHRINK_MIN_PT:
                self.assertTrue(residuals, "8pt未満の行が残件として報告されていません")
        return copied, residuals

    def test_standalone_text_dedents_without_changing_words(self):
        copied, residuals = self.check_semantics(f'const view = <p>\n                  {TEXT}\n</p>;')
        self.assertFalse(residuals)
        self.assertIn('\n' + TEXT + '\n', copied)

    def test_same_line_text_spaces_are_not_trimmed(self):
        self.check_semantics(f'const view = <p>                  {TEXT}</p>;')

    def test_sibling_nodes_and_text_keep_their_children(self):
        self.check_semantics(f'const view = <p><b>前</b>\n                  {TEXT}\n<i>後</i></p>;')

    def test_blank_lines_and_tab_indent_preserve_text(self):
        self.check_semantics(f'const view = <p>\n\n\t                  {TEXT}\n\n</p>;')

    def test_adjacent_text_lines_keep_joining_spaces(self):
        self.check_semantics(f'const view = <p>前の文\n                  {TEXT}\n次の文</p>;')

    def test_entity_spaces_remain_explicit_text(self):
        for entity in ('&#32;', '&#9;', '&nbsp;'):
            with self.subTest(entity=entity):
                self.check_semantics(f'const view = <p>\n                  {entity}{TEXT}\n</p>;')

    def test_template_indentation_remains_part_of_literal(self):
        source = f'const text = `\n                  {TEXT}\n`;'
        copied, residuals = self.check_semantics(source)
        self.assertEqual(copied, source)
        self.assertTrue(residuals)

    def test_unshrinkable_text_still_fails_closed(self):
        copied, residuals = self.check_semantics('const view = <p>\n                  ' + '長' * 60 + '\n</p>;')
        self.assertTrue(residuals)
        self.assertIn('長' * 60, copied)


if __name__ == '__main__':
    unittest.main()
