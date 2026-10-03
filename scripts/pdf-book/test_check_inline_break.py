import unittest

from check_inline_break import count_html_metrics, count_layout_metrics


class HtmlMetricsTest(unittest.TestCase):
    def test_tail_before_code_is_counted(self):
        counts = count_html_metrics(
            '<p>渡<span class="pdf-tail">します。</span><code>x</code></p>')
        self.assertEqual(counts['tail_before_code'], 1)

    def test_tail_not_before_code_is_not_counted(self):
        counts = count_html_metrics(
            '<p>渡<span class="pdf-tail">します。</span>そして<code>x</code></p>')
        self.assertEqual(counts['tail_before_code'], 0)

    def test_tail_then_code_through_inline_end_is_counted(self):
        # `<span pdf-tail>…</span></em><code>` も見た目は「直後」
        counts = count_html_metrics(
            '<p><em>a<span class="pdf-tail">bcde</span></em><code>x</code></p>')
        self.assertEqual(counts['tail_before_code'], 1)

    def test_tail_across_block_boundary_is_not_counted(self):
        # 前のブロックの末尾が pdf-tail でも、越えた先の code は
        # 「直後」ではない（tail の接着はブロックをまたげないので起きない）
        for source in (
            '<ul><li>x<span class="pdf-tail">あいうえ</span></li>'
            '<li><code>y</code></li></ul>',
            '<p>x<span class="pdf-tail">あいうえ</span></p>'
            '<p><code>y</code></p>',
        ):
            self.assertEqual(
                count_html_metrics(source)['tail_before_code'], 0, source)

    def test_wbr_severs_tail_immediacy(self):
        counts = count_html_metrics(
            '<p>x<span class="pdf-tail">あいうえ</span><wbr><code>y</code></p>')
        self.assertEqual(counts['tail_before_code'], 0)

    def test_prev_char_across_block_boundary_is_not_counted(self):
        # 前の段落の末尾の字と、次の段落の先頭の code は「直前・直後」ではない
        counts = count_html_metrics('<p>字</p><p><code>.x</code></p>')
        self.assertEqual(counts['missing_wbr'], 0)

    def test_tail_before_code_in_table_cell_is_not_counted(self):
        counts = count_html_metrics(
            '<table><tr><td>a<span class="pdf-tail">bcde</span>'
            '<code>x</code></td></tr></table>')
        self.assertEqual(counts['tail_before_code'], 0)

    def test_missing_wbr_is_counted(self):
        counts = count_html_metrics('<p>字<code>.foo</code></p>')
        self.assertEqual(counts['missing_wbr'], 1)

    def test_wbr_present_is_not_counted(self):
        counts = count_html_metrics('<p>字<wbr><code>.foo</code></p>')
        self.assertEqual(counts['missing_wbr'], 0)

    def test_wbr_conditions_follow_inserter(self):
        # ASCII の直前・開き括弧の直前・15字以外の先頭は対象外
        for source in ('<p>a<code>.x</code></p>',
                       '<p>「<code>.x</code></p>',
                       '<p>字<code>x.y</code></p>',
                       '<pre><code>.x</code></pre>'):
            self.assertEqual(
                count_html_metrics(source)['missing_wbr'], 0, source)

    def test_unsplit_target_is_counted(self):
        counts = count_html_metrics(
            '<p><code>alpha beta gamma delta epsilon zeta</code></p>')
        self.assertEqual(counts['unsplit_target'], 1)

    def test_command_and_short_and_nospace_are_not_counted(self):
        for source in (
            '<p><code>npm ' + 'x ' * 20 + '</code></p>',
            '<p><code>short code</code></p>',
            '<p><code>' + 'x' * 40 + '</code></p>',
            '<table><tr><td><code>alpha beta gamma delta epsilon zeta'
            '</code></td></tr></table>',
        ):
            self.assertEqual(
                count_html_metrics(source)['unsplit_target'], 0, source)

    def test_split_pieces_are_not_unsplit_targets(self):
        counts = count_html_metrics(
            '<p><code class="pdf-code-more">alpha</code>'
            '<span class="pdf-code-gap"> </span>'
            '<code class="pdf-code-cont">beta</code></p>')
        self.assertEqual(counts['unsplit_target'], 0)


class LayoutMetricsTest(unittest.TestCase):
    def _fixture(self, *, shrunk=False, text='alpha beta gamma delta epsilon zeta'):
        manifest = {'entries': [
            {'id': 'code-1', 'expected_text': text, 'context': 'flow'},
        ]}
        item = {
            'page_index': 0,
            'text': text,
            'font_size_pt': 12.75,
            'line_rects': [
                {'left': 83.0, 'top': 100.0, 'right': 200.0,
                 'bottom': 117.0, 'width': 117.0, 'height': 17.0},
            ],
            'flow_geometry': {
                'tag': 'P',
                'dom_path': 'div > section > p:nth-of-type(1)',
                'rect': {'left': 83.0, 'top': 90.0, 'right': 710.0,
                         'bottom': 120.0, 'width': 627.0, 'height': 30.0},
                'content_rect': {'left': 83.0, 'top': 90.0, 'right': 710.0,
                                 'bottom': 120.0, 'width': 627.0, 'height': 30.0},
                'prose_lines': [
                    {'line_index': 0, 'text': '前の行はここで終わる',
                     'character_count': 9, 'japanese_character_count': 9,
                     'rect': {'left': 83.0, 'top': 80.0, 'right': 300.0,
                              'bottom': 97.0, 'width': 217.0, 'height': 17.0}},
                    {'line_index': 1, 'text': text,
                     'character_count': len(text), 'japanese_character_count': 0,
                     'rect': {'left': 83.0, 'top': 100.0, 'right': 200.0,
                              'bottom': 117.0, 'width': 117.0, 'height': 17.0}},
                ],
            },
        }
        layout = {'dom_audit': {'observed': [{'id': 'code-1', 'items': [item]}]}}
        adjustments = (
            [{'id': 'code-1', 'from_pt': 12.75, 'to_pt': 9.9}]
            if shrunk else []
        )
        return layout, manifest, adjustments

    def test_quarter_line_gap_is_counted(self):
        layout, manifest, adjustments = self._fixture()
        counts = count_layout_metrics(layout, manifest, adjustments)
        # 版面右端 710 - 前行の右端 300 = 410px ≈ 108mm ≥ 41.5mm
        self.assertEqual(counts['quarter_line_gap'], 1)

    def test_shrunk_split_target_is_counted(self):
        layout, manifest, adjustments = self._fixture(shrunk=True)
        counts = count_layout_metrics(layout, manifest, adjustments)
        self.assertEqual(counts['shrunk_split_target'], 1)

    def test_shrunk_command_is_not_counted(self):
        layout, manifest, adjustments = self._fixture(
            shrunk=True, text='npm run ' + 'x ' * 30)
        counts = count_layout_metrics(layout, manifest, adjustments)
        self.assertEqual(counts['shrunk_split_target'], 0)

    def test_short_line_before_code_is_counted(self):
        layout, manifest, adjustments = self._fixture()
        # 前行を「ます。」の3字（幅 51px = 12.75pt×4/3×3）に変える
        item = layout['dom_audit']['observed'][0]['items'][0]
        prev = item['flow_geometry']['prose_lines'][0]
        prev['rect']['right'] = 134.0
        prev['rect']['width'] = 51.0
        counts = count_layout_metrics(layout, manifest, adjustments)
        self.assertEqual(counts['short_line_before_code'], 1)
        # 空きのほうも大きいので一緒に数えられる
        self.assertEqual(counts['quarter_line_gap'], 1)

    def test_line_not_starting_with_code_counts_nothing(self):
        layout, manifest, adjustments = self._fixture()
        # コードが行の途中にあるだけなら「行頭がコード」ではない
        item = layout['dom_audit']['observed'][0]['items'][0]
        item['line_rects'][0]['left'] = 300.0
        counts = count_layout_metrics(layout, manifest, adjustments)
        self.assertEqual(counts['quarter_line_gap'], 0)
        self.assertEqual(counts['short_line_before_code'], 0)

    def test_code_pushing_text_right_counts_as_code_line_start(self):
        # 実際の組版では、行頭のコードの右に残った字だけがその行の
        # prose_lines に載る（day14「します。」→コード＋「は」の形）
        layout, manifest, adjustments = self._fixture()
        item = layout['dom_audit']['observed'][0]['items'][0]
        code_line = item['flow_geometry']['prose_lines'][1]
        code_line['text'] = 'は'
        code_line['rect']['left'] = 690.0
        code_line['rect']['right'] = 707.0
        code_line['rect']['width'] = 17.0
        counts = count_layout_metrics(layout, manifest, adjustments)
        self.assertEqual(counts['quarter_line_gap'], 1)

    def test_code_only_line_counts_as_code_line_start(self):
        # コードしか無い行は prose_lines に行が無いので、
        # コードの枠から行を足して行頭扱いする
        layout, manifest, adjustments = self._fixture()
        item = layout['dom_audit']['observed'][0]['items'][0]
        item['flow_geometry']['prose_lines'] = [
            item['flow_geometry']['prose_lines'][0]
        ]
        counts = count_layout_metrics(layout, manifest, adjustments)
        self.assertEqual(counts['quarter_line_gap'], 1)

    def test_plain_latin_spans_are_not_codes(self):
        layout, manifest, adjustments = self._fixture()
        manifest['entries'][0]['plain_latin'] = True
        counts = count_layout_metrics(layout, manifest, adjustments)
        self.assertEqual(counts['quarter_line_gap'], 0)
        self.assertEqual(counts['shrunk_split_target'], 0)


if __name__ == '__main__':
    unittest.main()
