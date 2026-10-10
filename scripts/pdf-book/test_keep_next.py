import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

from keep_next import KEEP_NEXT_CLASS, collect_decisions, mark_keep_next


def marked(source: str) -> bool:
    return KEEP_NEXT_CLASS in mark_keep_next(source)


class KeepNextTest(unittest.TestCase):
    def test_build_order_keeps_measurement_before_structure_edit(self) -> None:
        source = Path(__file__).with_name("build_pdf_book.py").read_text(encoding="utf-8")
        apply_index = source.index("markup = apply_breakable_measurements(")
        keep_index = source.index("markup = mark_keep_next(markup)")
        footnote_index = source.index("markup = number_external_link_footnotes(markup)")
        validation_index = source.index("validate_annotated_html(markup, inline_manifest)")
        self.assertLess(apply_index, keep_index)
        self.assertLess(keep_index, footnote_index)
        self.assertLess(footnote_index, validation_index)

    def test_known_labels_before_eligible_blocks(self):
        for label in ("実装:", "実装：", "確認ポイント:", "確認ポイント："):
            self.assertTrue(marked(f"<p>{label}</p><pre><code>x</code></pre>"), label)

    def test_terminal_output_label_is_kept_only_for_exact_heading_adjacency(self):
        source = (
            "<h4>期待される出力</h4>"
            "<p><strong>ターミナル出力（<code>~/workspace/task-app</code>）</strong></p>"
            "<pre><code>npm test</code></pre>"
        )
        result = mark_keep_next(source)
        self.assertIn('<p class="pdf-keep-next"><strong>ターミナル出力', result)
        self.assertEqual(mark_keep_next(result), result)
        self.assertEqual(
            [(row.reason, row.target_tag) for row in collect_decisions(source)],
            [("terminal-output-label", "pre")],
        )

    def test_terminal_output_label_rejects_broader_contexts(self):
        samples = (
            (
                "<h4>期待される出力</h4><p>説明です。</p>"
                "<p><strong>ターミナル出力（ローカル）</strong></p><pre>x</pre>"
            ),
            "<h4>実行結果</h4><p><strong>ターミナル出力（ローカル）</strong></p><pre>x</pre>",
            "<p><strong>ターミナル出力（ローカル）</strong></p><pre>x</pre>",
            (
                "<ol><li><h4>期待される出力</h4>"
                "<p><strong>ターミナル出力（ローカル）</strong></p><pre>x</pre></li></ol>"
            ),
            (
                '<section class="footnotes"><h4>期待される出力</h4>'
                "<p><strong>ターミナル出力（ローカル）</strong></p><pre>x</pre></section>"
            ),
            (
                "<h4>期待される出力</h4>"
                "<p><strong>ターミナル出力（ローカル）</strong></p><p>x</p>"
            ),
            (
                "<h4>期待される出力</h4>"
                "<p><code>ターミナル出力（ローカル）</code>の説明です。</p><pre>x</pre>"
            ),
        )
        for source in samples:
            self.assertFalse(marked(source), source)

    def test_explicit_forward_phrases_before_eligible_blocks(self):
        cases = (
            ("次のコードを追加します。", "<pre><code>x</code></pre>"),
            ("次のブロックを貼り付けてください。", "<pre><code>x</code></pre>"),
            ("以下の図を確認します。", '<figure><img src="x.png"></figure>'),
            ("次の表を確認します。", "<table><tr><td>x</td></tr></table>"),
            ("この一覧を追加してください。", "<ul><li>x</li></ul>"),
            ("以下の手順を確認します。", "<ol><li>x</li></ol>"),
            ("次の一覧を確認します。", "<dl><dt>x</dt></dl>"),
            ("以下の表を確認します。", '<section class="pdf-stacked-table"><div>x</div></section>'),
        )
        for phrase, target in cases:
            self.assertTrue(marked(f"<p>{phrase}</p>{target}"), (phrase, target))

    def test_comment_and_whitespace_are_skipped(self):
        source = "<p>次のコードを追加します。</p>\n<!-- source note -->\n<pre>x</pre>"
        self.assertTrue(marked(source))

    def test_explanation_after_prior_pre_is_not_marked(self):
        source = (
            "<pre><code>old</code></pre>"
            "<p>このコードは送信済みの値を照合します。</p>"
            "<pre><code>next</code></pre>"
        )
        self.assertFalse(marked(source))

    def test_generic_heading_bold_and_unknown_colon_are_not_marked(self):
        samples = (
            "<h2>見出し</h2><p>概要です。</p><pre>x</pre>",
            "<p><strong>注意</strong></p><pre>x</pre>",
            "<p>背景:</p><pre>x</pre>",
            "<p>短い説明です。</p><pre>x</pre>",
        )
        for source in samples:
            self.assertFalse(marked(source), source)

    def test_ineligible_targets_are_not_marked(self):
        for target in ("<p>next</p>", "<blockquote>x</blockquote>", "<section>x</section>", "<hr>"):
            self.assertFalse(marked(f"<p>次のコードを追加します。</p>{target}"), target)

    def test_footnote_caption_callout_and_nested_contexts_are_excluded(self):
        samples = (
            '<p class="footnote">次のコードを追加します。</p><pre>x</pre>',
            '<section class="footnotes"><p>次のコードを確認します。</p><pre>x</pre></section>',
            '<p class="caption">次の図を確認します。</p><figure>x</figure>',
            '<aside class="callout"><p>次のコードを追加します。</p><pre>x</pre></aside>',
            '<blockquote><p>次のコードを追加します。</p><pre>x</pre></blockquote>',
            '<figure><p>次のコードを追加します。</p><pre>x</pre></figure>',
        )
        for source in samples:
            self.assertFalse(marked(source), source)

    def test_blockquote_screenshot_intro_is_kept_only_with_its_direct_figure(self):
        source = (
            "<blockquote><p>スクリーンショット: 編集ダイアログの画面</p>"
            '<figure><img src="dialog.png"></figure></blockquote>'
        )
        result = mark_keep_next(source)
        self.assertIn('<p class="pdf-keep-next">スクリーンショット:', result)
        self.assertEqual(
            [(row.reason, row.target_tag) for row in collect_decisions(source)],
            [("screenshot-introduction", "figure")],
        )
        for rejected in (
            '<blockquote><p>引用文です。</p><figure>x</figure></blockquote>',
            '<blockquote><p>スクリーンショット: 説明</p><p>間の説明</p><figure>x</figure></blockquote>',
            '<blockquote><p>スクリーンショット: 説明</p><pre>x</pre></blockquote>',
        ):
            self.assertFalse(marked(rejected), rejected)

    def test_adversarial_direction_target_and_polarity_cases(self):
        rejected = (
            "<p>直前のコードを貼り付けてください。</p><ul><li>別の確認事項</li></ul>",
            "<p>先ほどのコードに項目を追加してください。</p><pre>unrelated()</pre>",
            "<p>実装:先ほどのコードは入力を検証するために必要です。</p><ul><li>別の確認事項</li></ul>",
            '<section class="footnotes"><p>次のコードを確認します。</p><pre>x()</pre></section>',
            "<p>次のコードは貼り付けないでください。</p><pre>x()</pre>",
            "<p>次のコードを確認します。</p><ul><li>コードではない一覧</li></ul>",
        )
        for source in rejected:
            self.assertFalse(marked(source), source)
        self.assertTrue(marked("<p>次のコードを貼り付けてください。</p><pre>x()</pre>"))

    def test_named_target_does_not_mark_a_different_block_kind(self):
        mismatches = (
            ("次のコードを貼り付けてください。", "<figure>x</figure>"),
            ("以下の図を確認します。", "<table><tr><td>x</td></tr></table>"),
            ("次の表を確認します。", "<pre>x</pre>"),
            ("以下の手順で確認します。", "<pre>x</pre>"),
            ("次のブロックを続けます。", "<ol><li>x</li></ol>"),
        )
        for phrase, target in mismatches:
            self.assertFalse(marked(f"<p>{phrase}</p>{target}"), (phrase, target))

    def test_only_opening_p_class_changes(self):
        source = (
            '<p id="lead" data-note="a > b" class="lead  wide">'
            '次のブロックを貼り付けてください。<a data-pdf-footnote="7" href="x">資料</a>'
            '</p><!-- keep --><pre data-pdf-pre-id="pdf-pre-00001-abc" class="language-ts">'
            '<code><span class="pdf-inline-code" data-pdf-inline-id="inline-1">x &lt; y</span></code>'
            '</pre>'
        )
        result = mark_keep_next(source)
        expected = source.replace('class="lead  wide"', 'class="lead  wide pdf-keep-next"', 1)
        self.assertEqual(result, expected)
        self.assertIn('data-pdf-footnote="7"', result)
        self.assertIn('data-pdf-pre-id="pdf-pre-00001-abc"', result)
        self.assertIn('data-pdf-inline-id="inline-1"', result)
        self.assertEqual(re.sub(r" pdf-keep-next(?=[\"'])", "", result), source)

    def test_single_quoted_class_and_idempotence(self):
        source = "<p class='lead'>実装:</p><pre>x</pre>"
        once = mark_keep_next(source)
        self.assertIn("class='lead pdf-keep-next'", once)
        self.assertEqual(mark_keep_next(once), once)

    def test_data_class_is_not_mistaken_for_class_attribute(self):
        source = '<p data-class="lead">実装:</p><pre>x</pre>'
        self.assertEqual(
            mark_keep_next(source),
            '<p data-class="lead" class="pdf-keep-next">実装:</p><pre>x</pre>',
        )

    def test_class_text_inside_quoted_attribute_is_not_an_attribute(self):
        source = '<p title=" class=\'lead\'" data-note="x > y">実装:</p><pre>x</pre>'
        result = mark_keep_next(source)
        self.assertEqual(
            result,
            '<p title=" class=\'lead\'" data-note="x > y" class="pdf-keep-next">実装:</p><pre>x</pre>',
        )

        class AttributeParser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.paragraph: list[tuple[str, str | None]] = []

            def handle_starttag(self, tag, attrs):
                if tag == "p":
                    self.paragraph = attrs

        before = AttributeParser()
        before.feed(source)
        after = AttributeParser()
        after.feed(result)
        before_attrs = dict(before.paragraph)
        after_attrs = dict(after.paragraph)
        self.assertEqual(before_attrs, {"title": " class='lead'", "data-note": "x > y"})
        self.assertEqual(
            {key: value for key, value in after_attrs.items() if key != "class"},
            before_attrs,
        )
        self.assertEqual(after_attrs["class"], KEEP_NEXT_CLASS)
        self.assertEqual(mark_keep_next(result), result)

    def test_unquoted_actual_class_becomes_one_quoted_class_attribute(self):
        source = '<p title="keep" class=lead data-note="x">実装:</p><pre>x</pre>'
        result = mark_keep_next(source)
        self.assertEqual(
            result,
            '<p title="keep" class="lead pdf-keep-next" data-note="x">実装:</p><pre>x</pre>',
        )
        attributes: list[tuple[str, str | None]] = []

        class ParagraphParser(HTMLParser):
            def handle_starttag(self, tag, attrs):
                if tag == "p":
                    attributes.extend(attrs)

        parser = ParagraphParser()
        parser.feed(result)
        self.assertEqual(
            attributes,
            [("title", "keep"), ("class", "lead pdf-keep-next"), ("data-note", "x")],
        )
        self.assertEqual(mark_keep_next(result), result)

    def test_target_noun_requires_a_grammatical_boundary(self):
        self.assertFalse(marked("<p>次の表示を確認します。</p><table><tr><td>x</td></tr></table>"))
        self.assertTrue(marked("<p>次の表を確認します。</p><table><tr><td>x</td></tr></table>"))

    def test_decisions_expose_reason_and_target_for_coverage(self):
        rows = collect_decisions("<p>実装:</p><pre>x</pre><p>次の図を確認します。</p><figure>x</figure>")
        self.assertEqual(
            [(row.reason, row.target_tag) for row in rows],
            [("implementation-label", "pre"), ("explicit-forward-instruction", "figure")],
        )


if __name__ == "__main__":
    unittest.main()
