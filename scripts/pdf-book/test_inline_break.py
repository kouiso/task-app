import unittest
from html.parser import HTMLParser

from inline_break import (
    COMMAND_WORDS,
    GAP_CLASS,
    NO_BREAK_BEFORE_CHARS,
    OPENING_BRACKETS,
    SPLIT_MIN_LENGTH,
    insert_wbr_before_code,
    needs_wbr,
    split_code_markup,
    split_long_inline_code,
)


class Text(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.parts = []
        self.feed(source)
    def handle_data(self, data):
        self.parts.append(data)


class SplitTest(unittest.TestCase):
    def test_long_code_with_spaces_is_split_at_spaces(self):
        result = split_long_inline_code(
            '<p>その外側を <code>flex flex-col gap-4 items-start sm:flex-row</code> にします</p>'
        )
        self.assertIn(
            '<code class="pdf-code-more">flex</code>'
            f'<span class="{GAP_CLASS}"> </span>'
            '<code class="pdf-code-cont pdf-code-more">flex-col</code>',
            result,
        )
        self.assertIn('<code class="pdf-code-cont">sm:flex-row</code>', result)
        # 字の並びは変わらない（分けるのは要素の形だけ）
        self.assertEqual(
            ''.join(Text(result).parts),
            'その外側を flex flex-col gap-4 items-start sm:flex-row にします',
        )

    def test_split_needs_prose_scope(self):
        # 表のセルと見出しの中は対象外
        long_code = 'a' * 20 + ' ' + 'b' * 20
        for source in (
            f'<table><tr><td><code>{long_code}</code></td></tr></table>',
            f'<h2><code>{long_code}</code></h2>',
            f'<pre><code>{long_code}</code></pre>',
        ):
            self.assertEqual(split_long_inline_code(source), source, source)

    def test_split_needs_30_chars_and_a_space(self):
        source = '<p><code>short code here</code></p>'
        self.assertEqual(split_long_inline_code(source), source)
        nospace = '<p><code>' + 'x' * 40 + '</code></p>'
        self.assertEqual(split_long_inline_code(nospace), nospace)

    def test_commands_are_not_split(self):
        for word in ['npm', 'git', 'npx']:
            code = f'{word} ' + 'x ' * 20
            source = f'<p><code>{code}</code></p>'
            self.assertEqual(split_long_inline_code(source), source, word)

    def test_list_items_are_split(self):
        result = split_long_inline_code(
            '<ul><li><code>alpha beta gamma delta epsilon zeta</code></li></ul>'
        )
        self.assertIn(f'<span class="{GAP_CLASS}"> </span>', result)

    def test_split_preserves_attributes_and_entities(self):
        result = split_code_markup(
            '<code class="language-ts">', 'a &gt; bbbbbbbbbbbbbbbbbbbbbbbbb &amp;&amp; c',
        )
        self.assertIsNotNone(result)
        self.assertIn('class="language-ts', result)
        self.assertEqual(
            ''.join(Text(result).parts),
            'a > bbbbbbbbbbbbbbbbbbbbbbbbb && c',
        )

    def test_inner_markup_is_left_alone(self):
        # code の内側に実タグがある原稿は分けない
        source = '<p><code><b>word</b> ' + 'x ' * 20 + '</code></p>'
        self.assertEqual(split_long_inline_code(source), source)


class WbrTest(unittest.TestCase):
    def test_all_fifteen_chars_get_wbr_after_japanese(self):
        for char in NO_BREAK_BEFORE_CHARS:
            result = insert_wbr_before_code(
                f'<p>文字<code>{char}abc</code></p>'
            )
            self.assertIn(f'<wbr><code>{char}abc</code>', result, char)
        self.assertEqual(len(NO_BREAK_BEFORE_CHARS), 15)

    def test_no_wbr_for_other_first_chars(self):
        for char in 'abcABC（_*=':
            result = insert_wbr_before_code(f'<p>文字<code>{char}x</code></p>')
            self.assertNotIn('<wbr>', result, char)

    def test_no_wbr_after_ascii_or_opening_bracket(self):
        # 直前が英数字や半角記号なら語の途中で折れるので置かない
        self.assertNotIn('<wbr>', insert_wbr_before_code(
            '<p>abc<code>.def</code></p>'))
        # 開き括弧の直後に置くと行末に開き括弧だけが残る
        for bracket in OPENING_BRACKETS:
            result = insert_wbr_before_code(
                f'<p>{bracket}<code>.x</code></p>')
            self.assertNotIn('<wbr>', result, bracket)

    def test_wbr_goes_after_inline_boundaries(self):
        # 要素の境界を挟んでも直前の表示文字は変わらない
        result = insert_wbr_before_code('<p>渡します<em>。</em><code>.then()</code></p>')
        self.assertIn('</em><wbr><code>', result)

    def test_wbr_is_not_put_inside_code_or_pre(self):
        source = '<pre><code>.foo()</code></pre>'
        self.assertEqual(insert_wbr_before_code(source), source)

    def test_code_after_space_needs_no_wbr(self):
        result = insert_wbr_before_code('<p>字 <code>.x</code></p>')
        self.assertNotIn('<wbr>', result)

    def test_needs_wbr_contract(self):
        self.assertTrue(needs_wbr('。', '.'))
        self.assertTrue(needs_wbr('す', '?'))
        self.assertFalse(needs_wbr('a', '.'))
        self.assertFalse(needs_wbr('「', '.'))
        self.assertFalse(needs_wbr(None, '.'))
        self.assertFalse(needs_wbr('。', 'a'))
        self.assertFalse(needs_wbr('。', None))


if __name__ == '__main__':
    unittest.main()
