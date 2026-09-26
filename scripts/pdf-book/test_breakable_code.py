import unittest

from breakable_code import BREAKABLE_MIN_LINES, mark_breakable_pres


def pre(lines, attrs='class="language-ts"'):
    return f"<pre {attrs}><code>" + "\n".join(lines) + "</code></pre>"


class BreakableCodeTest(unittest.TestCase):
    def test_short_block_is_left_alone(self):
        source = pre(["a", "b", "c"])
        self.assertEqual(mark_breakable_pres(source), source)

    def test_tall_block_gets_the_marker_class(self):
        source = pre([f"line{i}" for i in range(BREAKABLE_MIN_LINES)])
        self.assertIn('class="language-ts pdf-breakable"', mark_breakable_pres(source))

    def test_one_below_threshold_is_left_alone(self):
        source = pre([f"line{i}" for i in range(BREAKABLE_MIN_LINES - 1)])
        self.assertEqual(mark_breakable_pres(source), source)

    def test_trailing_newline_is_not_a_rendered_line(self):
        # 生成 HTML はコードの末尾を改行で閉じる（`...\n</code></pre>`）。
        # その改行は行を増やさないので、しきい値ちょうどの判定に入れない
        body = "\n".join(f"line{i}" for i in range(BREAKABLE_MIN_LINES - 1))
        source = f'<pre class="language-ts"><code>{body}\n</code></pre>'
        self.assertEqual(mark_breakable_pres(source), source)

    def test_trailing_newline_wrapped_in_span_is_not_a_rendered_line(self):
        # 実際の生成物では末尾の改行が <span class="token plain-text">\n</span>
        # のように包まれて出る。包みのタグは行を作らないので外して数える
        body = "\n".join(f"line{i}" for i in range(BREAKABLE_MIN_LINES - 1))
        tail = '<span class="token plain-text">\n</span>'
        source = f'<pre class="language-ts"><code>{body}{tail}</code></pre>'
        self.assertEqual(mark_breakable_pres(source), source)

    def test_block_without_class_attribute_gets_one(self):
        source = pre([f"line{i}" for i in range(BREAKABLE_MIN_LINES + 5)], attrs="")
        self.assertIn('<pre class="pdf-breakable">', mark_breakable_pres(source))

    def test_forced_breaks_count_toward_rendered_height(self):
        # 原文の行数はしきい値未満でも、cw-force の折返しで見た目の行数が
        # 増える塊は分割対象になる
        wrapped = "<br class=\"cw-force\">".join(
            [f"seg{i}" for i in range(BREAKABLE_MIN_LINES)])
        source = f"<pre><code>{wrapped}</code></pre>"
        self.assertIn('class="pdf-breakable"', mark_breakable_pres(source))

    def test_marker_is_not_duplicated(self):
        source = pre([f"line{i}" for i in range(BREAKABLE_MIN_LINES + 1)])
        once = mark_breakable_pres(source)
        self.assertEqual(once.count("pdf-breakable"), 1)
        self.assertEqual(mark_breakable_pres(once), once)


if __name__ == "__main__":
    unittest.main()
