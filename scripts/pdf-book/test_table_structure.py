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


if __name__ == '__main__':
    unittest.main()
