"""unescape_table_cell_pipes の回帰テスト。

表セル内コード片に残る `\\|` は復元し、本文側の本物のバックスラッシュと
セル外のコードは触らないことを fixture で固定する。
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_pdf_book import unescape_table_cell_pipes


class TableCellPipeUnescapeTest(unittest.TestCase):
    def test_plain_escape_already_restored_by_vfm_is_untouched(self):
        source = '<td>a | b</td>'
        self.assertEqual(unescape_table_cell_pipes(source), source)

    def test_plain_real_backslash_pipe_is_untouched(self):
        source = '<td>a \\| b</td>'
        self.assertEqual(unescape_table_cell_pipes(source), source)

    def test_code_span_escape_is_restored(self):
        self.assertEqual(
            unescape_table_cell_pipes('<td><code>a \\| b</code></td>'),
            '<td><code>a | b</code></td>')

    def test_code_span_multiple_backslashes_keep_real_ones(self):
        # `\\\|`（本物の `\\` + 表の `\|`）は `\\|` になるべきで
        # 本物のバックスラッシュまで消してはいけない。
        self.assertEqual(
            unescape_table_cell_pipes('<td><code>a \\\\\\| b</code></td>'),
            '<td><code>a \\\\| b</code></td>')

    def test_outside_cell_is_untouched(self):
        source = '<p><code>x \\| y</code></p>'
        self.assertEqual(unescape_table_cell_pipes(source), source)

    def test_header_cell_code_span_is_restored(self):
        self.assertEqual(
            unescape_table_cell_pipes(
                '<th><code>TaskStatus \\| "all"</code></th>'),
            '<th><code>TaskStatus | "all"</code></th>')

    def test_mixed_plain_and_code(self):
        self.assertEqual(
            unescape_table_cell_pipes(
                '<td>t \\| <code>c \\| d</code> u</td>'),
            '<td>t \\| <code>c | d</code> u</td>')

    def test_code_inside_pre_is_untouched(self):
        # <pre> 内のコードブロックは本物のバックスラッシュなので触らない。
        source = '<td><pre><code>/\\|/</code></pre></td>'
        self.assertEqual(unescape_table_cell_pipes(source), source)

    def test_code_attributes_are_untouched(self):
        # 属性値（data-original 等）の `\\|` はテキストではないので触らない。
        source = '<td><code data-original="\\|">x \\| y</code></td>'
        self.assertEqual(
            unescape_table_cell_pipes(source),
            '<td><code data-original="\\|">x | y</code></td>')


if __name__ == "__main__":
    unittest.main()
