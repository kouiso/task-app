import unittest

from keep_next import KEEP_NEXT_CLASS, mark_keep_next, normalize_text


def marked(source: str) -> bool:
    return KEEP_NEXT_CLASS in mark_keep_next(source)


class NormalizeTextTest(unittest.TestCase):
    def test_counts_ignore_space_and_invisible(self):
        # 空白・改行・ZWSP・WJ・BOM・SOFT HYPHEN は字数に入れない
        self.assertEqual(
            normalize_text(" 実 装\u200b\u2060\ufeff\u00ad:\n"),
            "実装:",
        )

    def test_nfkc_folds_full_width(self):
        # 全角の「：」と半角英数は NFKC でそろえる
        self.assertEqual(normalize_text("実装：ＡＢ"), "実装:AB")


class MarkKeepNextTest(unittest.TestCase):
    def test_colon_label_gets_marked(self):
        self.assertTrue(marked("<p>実装:</p><pre><code>x</code></pre>"))

    def test_full_width_colon_label_gets_marked(self):
        # 原稿の「：」は NFKC で半角にそろえて判定する
        self.assertTrue(marked("<p>実装：</p><pre><code>x</code></pre>"))

    def test_colon_label_over_limit_is_not_marked(self):
        text = "あ" * 90 + "："
        self.assertFalse(marked(f"<p>{text}</p><pre><code>x</code></pre>"))

    def test_bold_only_paragraph_gets_marked(self):
        source = "<p><strong>なぜ Set を使うのか</strong></p><p>説明です。</p>"
        self.assertTrue(marked(source))

    def test_partially_bold_paragraph_is_not_bold_only(self):
        # 太字を含むが太字だけではない段落は、直後の要素が普通なら付かない
        source = (
            "<p><strong>なぜ</strong> Set を使うのか</p><p>説明です。</p>"
        )
        self.assertFalse(marked(source))

    def test_screenshot_lead_gets_marked(self):
        source = "<p>スクリーンショット：画面です。</p><p>説明です。</p>"
        self.assertTrue(marked(source))

    def test_screenshot_lead_over_limit_is_not_marked(self):
        text = "スクリーンショット：" + "あ" * 80 + "。"
        source = f"<p>{text}</p><p>説明です。</p>"
        self.assertFalse(marked(source))

    def test_cause_lead_gets_marked(self):
        source = "<p>原因：権限がありません。</p><p>解決方法を書きます。</p>"
        self.assertTrue(marked(source))

    def test_cause_lead_over_limit_is_not_marked(self):
        text = "原因：" + "あ" * 87 + "。"
        source = f"<p>{text}</p><p>説明です。</p>"
        self.assertFalse(marked(source))

    def test_paragraph_before_figure_gets_marked(self):
        source = "<p>次の図を見ます。</p><figure><img></figure>"
        self.assertTrue(marked(source))

    def test_paragraph_before_figure_over_limit_is_not_marked(self):
        text = "あ" * 90 + "。"
        source = f"<p>{text}</p><figure><img></figure>"
        self.assertFalse(marked(source))

    def test_paragraph_before_pre_gets_marked(self):
        source = "<p>インポートを追加します。</p><pre><code>x</code></pre>"
        self.assertTrue(marked(source))

    def test_paragraph_before_block_tags_gets_marked(self):
        for tag in ("pre", "table", "ul", "ol", "dl"):
            inner = "<code>x</code>" if tag == "pre" else "<li>x</li>"
            source = f"<p>導入文です。</p><{tag}>{inner}</{tag}>"
            self.assertTrue(marked(source), tag)

    def test_paragraph_before_stacked_table_gets_marked(self):
        source = (
            "<p>理由の説明です。</p>"
            '<section class="pdf-stacked-table"><div>x</div></section>'
        )
        self.assertTrue(marked(source))

    def test_intro_rule_needs_seventy_or_less(self):
        # 直後の塊を導く段落の規則は 70 字まで。それを超えると付かない
        text = "あ" * 70 + "。"
        self.assertFalse(
            marked(f"<p>{text}</p><pre><code>x</code></pre>"))
        short = "あ" * 69 + "。"
        self.assertTrue(
            marked(f"<p>{short}</p><pre><code>x</code></pre>"))

    def test_blockquote_does_not_use_intro_rule(self):
        # 引用は例え話や補足なので、直前の段落が導入する中身ではない。
        # 70 字の規則は当てない（ほかの規則は当たる）
        self.assertFalse(
            marked("<p>短い導入文</p><blockquote><p>引用</p></blockquote>"))
        self.assertTrue(
            marked("<p>実装:</p><blockquote><p>引用</p></blockquote>"))

    def test_paragraph_after_heading_gets_marked(self):
        for tag in ("h2", "h3", "h4"):
            source = f"<{tag}>見出し</{tag}><p>短い段落です。</p><p>次</p>"
            self.assertTrue(marked(source), tag)

    def test_paragraph_after_heading_over_limit_is_not_marked(self):
        text = "あ" * 90 + "。"
        source = f"<h2>見出し</h2><p>{text}</p><p>次</p>"
        self.assertFalse(marked(source))

    def test_plain_paragraph_is_not_marked(self):
        source = "<p>説明文です。</p><p>次の段落です。</p>"
        self.assertFalse(marked(source))

    def test_closing_tag_right_after_is_not_marked(self):
        # 段落の直後が親の閉じタグなら、同じページに置く相手が無い
        self.assertFalse(marked("<ul><li><p>実装:</p></li></ul>"))
        self.assertFalse(marked("<section><p>実装:</p></section>"))

    def test_hr_or_section_next_is_not_marked(self):
        # 区切り線や節の終わりの直前は「前回の振り返り」などで、
        # 同じページに置く相手が無い
        self.assertFalse(marked("<p>実装:</p><hr><h2>次</h2>"))
        self.assertFalse(marked("<p>実装:</p><section><p>次</p></section>"))

    def test_html_comment_is_skipped_for_next_element(self):
        # 原稿に書かれた HTML コメントを挟んでも次の要素を見る。
        # 飛ばさないと完成コードの直前の段落に印が付かない
        source = (
            "<p>インポートを追加します。</p>"
            "<!-- code-block-length-exception: complete-copy-unit -->"
            "<pre><code>x</code></pre>"
        )
        self.assertTrue(marked(source))

    def test_marker_is_added_to_existing_class(self):
        out = mark_keep_next(
            '<p class="lead">実装:</p><pre><code>x</code></pre>')
        self.assertIn(f'class="lead {KEEP_NEXT_CLASS}"', out)

    def test_marker_is_not_duplicated(self):
        source = "<p>実装:</p><pre><code>x</code></pre>"
        once = mark_keep_next(source)
        self.assertEqual(once.count(KEEP_NEXT_CLASS), 1)
        self.assertEqual(mark_keep_next(once), once)

    def test_paragraph_inside_pre_is_not_touched(self):
        # コードの中に見える <p> は導入文ではない
        source = "<pre><code><p>実装:</p></code></pre><p>実装:</p>"
        self.assertEqual(mark_keep_next(source), source)


if __name__ == "__main__":
    unittest.main()
