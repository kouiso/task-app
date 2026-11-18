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

    def test_each_logical_line_gets_an_unbreakable_wrapper(self):
        # 1文の途中に柱が入る事故を防ぎつつ両端4行（orphans/widows）も保つため、
        # 先頭4行・中間行・末尾4行がそれぞれ pdf-codeline の塊になる（issue #763 通し番号11）
        total = BREAKABLE_MIN_LINES + 2  # 20行 -> 先頭4行(1) + 中間12行(12) + 末尾4行(1) = 14塊
        source = pre([f"line{i};" for i in range(total)])
        result = mark_breakable_pres(source)
        self.assertEqual(result.count('class="pdf-codeline"'), total - 6)
        self.assertIn(
            '<span class="pdf-codeline">line0;\nline1;\nline2;\nline3;</span>',
            result,
        )
        self.assertIn('<span class="pdf-codeline">line4;</span>', result)

    def test_multi_line_statement_stays_in_one_wrapper(self):
        # 代入の右辺や論理式の続きが次行にある場合、同じ塊に束ねて間の改ページを防ぐ
        lines = (
            [f"s{i}();" for i in range(6)]
            + ["const [filterProject, setFilterProject] =", "  useState('all');"]
            + [f"t{i}();" for i in range(12)]
        )
        result = mark_breakable_pres(pre(lines))
        self.assertIn(
            '<span class="pdf-codeline">const [filterProject, setFilterProject] =\n'
            "  useState('all');</span>",
            result,
        )

    def test_prism_spans_inside_lines_are_preserved(self):
        # <span class="token"> を含む行でも装飾タグが消えない
        body = '<span class="token keyword">const</span> x = 1;\n' * (
            BREAKABLE_MIN_LINES + 1)
        source = f"<pre><code>{body}</code></pre>"
        result = mark_breakable_pres(source)
        self.assertIn('token keyword', result)
        self.assertIn(
            '<span class="pdf-codeline"><span class="token keyword">'
            'const</span> x = 1;</span>', result)

    def test_tag_spanning_newlines_is_closed_and_reopened_per_line(self):
        # 文字列リテラルの装飾タグが改行をまたぐとき、境目でいったん閉じて
        # 次行の先頭で開き直す。中間に置けば単独塊としても対応が取れている
        lines = (
            [f"a{i}();" for i in range(5)]
            + ['<span class="token string">\'multi', 'line\'</span>']
            + [f"x{i}();" for i in range(BREAKABLE_MIN_LINES)]
        )
        source = "<pre><code>" + "\n".join(lines) + "</code></pre>"
        result = mark_breakable_pres(source)
        self.assertIn(
            '<span class="pdf-codeline"><span class="token string">'
            "'multi</span></span>", result)
        self.assertIn(
            '<span class="pdf-codeline"><span class="token string">'
            "line'</span></span>", result)

    def test_empty_logical_line_keeps_its_height(self):
        # 空行を空 span にすると高さ 0 に潰れるので、改行を中身に残す
        lines = ["a"] * 10 + [""] + ["b"] * 10
        source = "<pre><code>" + "\n".join(lines) + "\n</code></pre>"
        result = mark_breakable_pres(source)
        self.assertIn('<span class="pdf-codeline">\n</span>', result)

    def test_closing_tags_stay_outside_the_last_wrapper(self):
        source = pre([f"line{i}" for i in range(BREAKABLE_MIN_LINES + 1)])
        result = mark_breakable_pres(source)
        self.assertTrue(result.endswith("</code></pre>"), result[-60:])


if __name__ == "__main__":
    unittest.main()
