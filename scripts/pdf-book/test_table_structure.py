import unittest

from table_structure import restructure_tables, measured_tables_to_stack


class TableStructureTest(unittest.TestCase):
    def test_four_columns_with_code_become_labelled_rows_without_cell_loss(self):
        source = '<table id="target"><caption>比較</caption><thead><tr><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead><tbody><tr><td><code>a.b</code></td><td>説明</td><td><a href="#x">移動</a></td><td>最後</td></tr></tbody></table>'
        markup, report = restructure_tables(source)
        self.assertNotIn('<table', markup)
        self.assertIn('id="target"', markup)
        for value in ['比較', '<code>a.b</code>', '説明', '<a href="#x">移動</a>', '最後']:
            self.assertEqual(markup.count(value), 1)
        self.assertEqual(markup.count('<dt>'), 4)
        self.assertEqual(report[0]['layout'], 'stacked-definition-list')
        # 縦並び化した1行がページを跨いでいないか照合できるよう、行番号を属性で残す
        self.assertEqual(markup.count('data-pdf-stacked-row'), 1)
        self.assertIn('data-pdf-stacked-row="0-0"', markup)

    def test_small_comparison_is_retained_until_measured(self):
        source = '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td><code>x</code></td><td>説明</td></tr></tbody></table>'
        self.assertEqual(restructure_tables(source)[0], source)
        markup, report = restructure_tables(source, {0: 'measured_prose_width'})
        self.assertIn('<dl>', markup)
        self.assertEqual(report[0]['reason'], 'measured_prose_width')

    def test_unsupported_span_fails_instead_of_dropping_content(self):
        source = '<table><tr><th>A</th><th>B</th></tr><tr><td colspan="2">text</td></tr></table>'
        with self.assertRaisesRegex(ValueError, 'span'):
            restructure_tables(source, {0: 'measured'})

    def test_source_order_stays_stable_after_a_previous_table_is_stacked(self):
        small = '<table><tr><th>A</th><th>B</th></tr><tr><td>x</td><td>y</td></tr></table>'
        markup, report = restructure_tables(small + small, {0: 'narrow'})
        self.assertEqual([r['source_order'] for r in report], [0, 1])
        self.assertEqual(markup.count('<table'), 1)

    def test_header_only_and_unhandled_group_content_fail(self):
        for source in [
            '<table><tr><th>A</th></tr></table>',
            '<table><thead id="anchor"><tr><th>A</th></tr></thead><tr><td>B</td></tr></table>',
            '<table><thead><div>lost</div><tr><th>A</th></tr></thead><tr><td>B</td></tr></table>',
        ]:
            with self.subTest(source=source), self.assertRaises(ValueError):
                restructure_tables(source, {0: 'narrow'})

    def test_caption_row_and_nested_header_anchors_are_retained_once(self):
        source = ('<table id="table"><caption id="caption">表&amp;説明</caption>'
                  '<tr><th id="header"><span id="nested">項目</span></th></tr>'
                  '<tr id="row1"><td id="cell1">a&amp;b</td></tr>'
                  '<tr id="row2"><td>次</td></tr></table>')
        markup, _ = restructure_tables(source, {0: 'narrow'})
        for anchor in ['table', 'caption', 'header', 'nested', 'row1', 'cell1', 'row2']:
            self.assertEqual(markup.count(f'id="{anchor}"'), 1)
        self.assertIn('a&amp;b', markup)
        self.assertIn('表&amp;説明', markup)

    def test_all_fragment_cell_widths_are_checked_even_without_inline_overflow(self):
        manifest = {'tables': [{'id': 't', 'source_order': 0}]}
        report = {'dom_audit': {'ready_state': 'complete', 'table_inventory': {'tables': [
            {'id': 't', 'fragments': [{'geometry': {'cells': [
                {'content_rect': {'width': 100}, 'font_size_px': 17, 'text': '説明', 'has_prose': True}
            ]}}]}
        ]}}}
        self.assertEqual(measured_tables_to_stack(manifest, report, [3]), {3: 'measured_prose_width_below_10em'})



def _measured_report(cells, column_count, code_rects=None):
    table = {'id': 't', 'fragments': [{'geometry': {
        'column_count': column_count, 'cells': cells}}]}
    observed = []
    if code_rects:
        observed = [{'id': 'g', 'items': [
            {'table_geometry': {'identity': {'value': 't'}, 'target': {'row_index': 0}},
             'code_rect': rect} for rect in code_rects]}]
    return {'dom_audit': {'ready_state': 'complete',
                          'table_inventory': {'tables': [table]},
                          'observed': observed}}


def _narrow_cell(lines_tops):
    return {'has_prose': True, 'font_size_px': 17,
            'content_rect': {'left': 0, 'right': 100, 'width': 100},
            'rect': {'left': 0, 'right': 108, 'top': 0, 'bottom': 200},
            'prose_lines': [{'rect': {'left': 0, 'right': 90, 'top': top, 'bottom': top + 12}}
                            for top in lines_tops]}


class MeasuredStackThreeColumnTest(unittest.TestCase):
    def test_narrow_cell_wrapped_to_two_lines_stacks_three_column_table(self):
        manifest = {'tables': [{'id': 't', 'source_order': 0}]}
        report = _measured_report([_narrow_cell([10, 40])], 3)
        self.assertEqual(measured_tables_to_stack(manifest, report, [3]),
                         {3: 'measured_prose_width_below_10em'})

    def test_narrow_cell_on_one_line_keeps_three_column_table(self):
        manifest = {'tables': [{'id': 't', 'source_order': 0}]}
        report = _measured_report([_narrow_cell([10])], 3)
        self.assertEqual(measured_tables_to_stack(manifest, report, [3]), {})

    def test_footnote_split_prose_lines_with_same_top_count_as_one_line(self):
        cell = _narrow_cell([10, 15])  # 上端の差が6px以内なら同じ行（脚注番号が別行に分かれる形）
        manifest = {'tables': [{'id': 't', 'source_order': 0}]}
        report = _measured_report([cell], 3)
        self.assertEqual(measured_tables_to_stack(manifest, report, [3]), {})

    def test_code_rect_tops_count_toward_visual_lines(self):
        manifest = {'tables': [{'id': 't', 'source_order': 0}]}
        code_rect = {'left': 4, 'right': 60, 'top': 40, 'bottom': 52}
        report = _measured_report([_narrow_cell([10])], 3, [code_rect])
        self.assertEqual(measured_tables_to_stack(manifest, report, [3]),
                         {3: 'measured_prose_width_below_10em'})

    def test_four_column_table_still_stacks_on_narrow_width_alone(self):
        manifest = {'tables': [{'id': 't', 'source_order': 0}]}
        report = _measured_report([_narrow_cell([10])], 4)
        self.assertEqual(measured_tables_to_stack(manifest, report, [3]),
                         {3: 'measured_prose_width_below_10em'})


class ShortColumnWidthTest(unittest.TestCase):
    def test_short_columns_get_estimated_width_on_header_only(self):
        source = ('<table><thead><tr><th>項</th><th>作業内容の見出しです</th><th>時</th></tr></thead>'
                  '<tbody><tr><td>1</td><td>画面の骨組みを自分で書いて動かしてみる長い説明</td>'
                  '<td>5分</td></tr></tbody></table>')
        markup, report = restructure_tables(source)
        self.assertIn('<th style="width: 3em;">項</th>', markup)
        self.assertIn('<th style="width: 3.7em;">時</th>', markup)
        self.assertIn('<th>作業内容の見出しです</th>', markup)  # 長い列には幅を付けない
        self.assertEqual(report[0]['sized_columns'], {'0': 3.0, '2': 3.7})

    def test_table_without_short_columns_gets_no_width(self):
        source = ('<table><thead><tr><th>作業の内容です</th><th>作業内容の詳細な説明です</th></tr></thead>'
                  '<tbody><tr><td>画面を作る長めの説明文</td><td>補足の説明文です</td></tr></tbody></table>')
        markup, report = restructure_tables(source)
        self.assertEqual(markup, source)
        self.assertNotIn('sized_columns', report[0])

    def test_balanced_table_gets_no_width(self):
        source = ('<table><thead><tr><th>短い</th><th>短め</th></tr></thead>'
                  '<tbody><tr><td>短文</td><td>短文</td></tr></tbody></table>')
        markup, _ = restructure_tables(source)
        self.assertEqual(markup, source)

    def test_four_column_table_gets_no_estimated_width(self):
        source = ('<table><thead><tr><th>項</th><th>長い説明の列ですよ</th><th>時</th><th>備考</th></tr></thead>'
                  '<tbody><tr><td>1</td><td>画面の骨組みを自分で書いて動かしてみる長い説明</td>'
                  '<td>5分</td><td>なし</td></tr></tbody></table>')
        markup, _ = restructure_tables(source)
        self.assertEqual(markup, source)

    def test_widest_short_column_drops_width_when_unsized_would_shrink_below_13em(self):
        source = ('<table><thead><tr><th>手順の短い見出しですよね</th><th>作業内容の見出しです</th><th>時間の短い見出</th></tr></thead>'
                  '<tbody><tr><td>短い説明</td><td>画面の骨組みを自分で書いて動かしてみる長い説明ですよ</td>'
                  '<td>短い説明</td></tr></tbody></table>')
        markup, report = restructure_tables(source)
        # 12emと7emの短い列: 両方に幅を付けると残り12emで13emを割るので広いほうを外す
        # （外したあとは残り26em÷2列=13emで要件を満たす）
        sized = report[0].get('sized_columns', {})
        self.assertEqual(sized, {'2': 9.0})
        self.assertEqual(markup.count('width: 9em;'), 1)

    def test_br_splits_cell_width_estimate_per_line(self):
        source = ('<table><thead><tr><th>項</th><th>作業内容の見出しです</th></tr></thead>'
                  '<tbody><tr><td>短い<br>説明です</td>'
                  '<td>画面の骨組みを自分で書いて動かしてみる長い説明</td></tr></tbody></table>')
        markup, report = restructure_tables(source)
        self.assertIn('width: 6em;', markup)  # 「説明です」の4+2（<br>後の行で見積もる）
        self.assertEqual(report[0]['sized_columns'], {'0': 6.0})

if __name__ == '__main__':
    unittest.main()
