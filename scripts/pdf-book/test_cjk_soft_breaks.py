import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import build_pdf_book

join = build_pdf_book.join_cjk_soft_breaks


class JoinCjkSoftBreaksTest(unittest.TestCase):
    def test_removes_break_between_cjk_chars(self):
        self.assertEqual(join('<p>仕上げたら\nブラウザで確認する</p>'),
                         '<p>仕上げたらブラウザで確認する</p>')

    def test_removes_break_around_punctuation(self):
        self.assertEqual(join('<p>終わった。\n次はコミット、\nプッシュだ</p>'),
                         '<p>終わった。次はコミット、プッシュだ</p>')

    def test_removes_break_across_inline_tags(self):
        self.assertEqual(
            join('<p>漢字\n<strong>漢字</strong>漢字</p>'),
            '<p>漢字<strong>漢字</strong>漢字</p>')
        self.assertEqual(
            join('<p>漢<strong>字\n字</strong>字</p>'),
            '<p>漢<strong>字字</strong>字</p>')
        self.assertEqual(
            join('<p><a href="https://example.com">漢字</a>\n漢字</p>'),
            '<p><a href="https://example.com">漢字</a>漢字</p>')

    def test_removes_break_in_list_item_without_p(self):
        # vfm は箇条書き項目を <p> で包まず <li> に直接流す
        self.assertEqual(
            join('<ul>\n<li>コピーする\n（欄がないとき）</li>\n</ul>'),
            '<ul>\n<li>コピーする（欄がないとき）</li>\n</ul>')
        self.assertEqual(
            join('<ol>\n<li>\n  漢字\n  漢字\n</li>\n<li>漢字</li>\n</ol>'),
            '<ol>\n<li>\n  漢字漢字\n</li>\n<li>漢字</li>\n</ol>')

    def test_removes_break_in_heading_and_table_cell(self):
        self.assertEqual(join('<h2>漢\n字</h2>'), '<h2>漢字</h2>')
        self.assertEqual(
            join('<table><tr><td>漢\n字</td></tr></table>'),
            '<table><tr><td>漢字</td></tr></table>')

    def test_removes_run_with_leading_whitespace(self):
        # vfm は段落内の行をインデントして出すので、改行の直後に空白が来る
        self.assertEqual(
            join('<p>\n  漢字\n  漢字\n</p>'),
            '<p>\n  漢字漢字\n</p>')

    def test_keeps_break_next_to_latin(self):
        # 英語側は単語の区切りとして空白が要るので消さない
        self.assertEqual(join('<p>漢字\nabc</p>'), '<p>漢字\nabc</p>')
        self.assertEqual(join('<p>abc\n漢字</p>'), '<p>abc\n漢字</p>')

    def test_keeps_typed_space(self):
        # 原稿で打たれた半角空白は消すと字がくっつくので残す
        self.assertEqual(join('<p>漢字 漢字</p>'), '<p>漢字 漢字</p>')

    def test_joins_break_in_bare_text(self):
        # タグの外側に流れた本文も同じ欠陥を持つ
        self.assertEqual(join('漢字\n漢字'), '漢字漢字')

    def test_keeps_break_between_block_siblings(self):
        self.assertEqual(join('<p>漢字</p>\n<p>漢字</p>'),
                         '<p>漢字</p>\n<p>漢字</p>')
        self.assertEqual(join('<li>漢字</li>\n<li>漢字</li>'),
                         '<li>漢字</li>\n<li>漢字</li>')
        # ブロック要素が区切るテキスト区間はまたがない
        self.assertEqual(join('<li>漢\n<ul><li>字</li></ul>漢</li>'),
                         '<li>漢\n<ul><li>字</li></ul>漢</li>')

    def test_keeps_break_inside_raw_text_elements(self):
        self.assertEqual(
            join('<p>漢字</p><pre>漢字\n漢字</pre>'),
            '<p>漢字</p><pre>漢字\n漢字</pre>')

    def test_removes_break_around_br(self):
        # 明示的な改行は行を分けるまま残し、後続の整形用空白だけ消す
        self.assertEqual(
            join('<p>漢字<br>\n  漢字</p>'),
            '<p>漢字<br>漢字</p>')

    def test_handles_entity_refs_as_neighbors(self):
        # &amp; は非CJKの1文字。片側が非CJKなので改行は残る
        self.assertEqual(
            join('<p>漢字\n&amp;漢字</p>'), '<p>漢字\n&amp;漢字</p>')


if __name__ == '__main__':
    unittest.main()
