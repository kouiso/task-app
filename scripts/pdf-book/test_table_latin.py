import unittest
from html.parser import HTMLParser

from inline_layout import annotate_inline_code, validate_annotated_html
from table_latin import protect_table_latin
from table_structure import restructure_tables, measured_tables_to_stack


class Text(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.parts = []
        self.feed(source)
    def handle_data(self, data):
        self.parts.append(data)


class TableLatinTest(unittest.TestCase):
    def test_plain_identifiers_are_audited_without_changing_text(self):
        tokens = ['DeleteConfirmDialog', 'task.getById.invalidate', 'ResponsiveContainer',
                  'PageLoadingSpinner', 'api.auth.getCurrentUser', 'api.user.changePassword',
                  'POSTGRES_PASSWORD']
        source = '<table><tr><td>日本語 ' + ' '.join(tokens) + '</td></tr></table>'
        protected = protect_table_latin(source)
        result, manifest = annotate_inline_code(protected, 'fixture')
        self.assertEqual(''.join(i['expected_text'] for i in manifest['entries']), ''.join(tokens))
        self.assertTrue(all(i['context'] == 'table' for i in manifest['entries']))
        self.assertEqual(Text(source).parts, ['日本語 ' + ' '.join(tokens)])
        self.assertEqual(''.join(Text(source).parts), ''.join(Text(result).parts))
        validate_annotated_html(result, manifest)

    def test_entities_links_backticks_and_outside_prose(self):
        source = '<p>OutsideName</p><table><tr><td><a href="/a">Array&lt;T&gt;/path.ts</a> &amp; <code>existing.code</code></td></tr></table>'
        protected = protect_table_latin(source)
        self.assertIn('<p>OutsideName</p>', protected)
        self.assertIn('<code>existing.code</code>', protected)
        self.assertIn('>Array&lt;T&gt;/</span><wbr><span class="pdf-table-latin">path.</span>', protected)
        result, manifest = annotate_inline_code(protected, 'fixture')
        self.assertEqual([i['expected_text'] for i in manifest['entries']], ['Array<T>/', 'path.', 'ts', 'existing.code'])
        self.assertEqual(''.join(Text(source).parts), ''.join(Text(result).parts))
        validate_annotated_html(result, manifest)

    def test_forced_stacked_rows_retain_protection_and_flow_audit(self):
        source = '<table><tr><th>名前</th><th>説明</th></tr><tr><td>DeleteConfirmDialog</td><td>説明です</td></tr></table>'
        stacked, _ = restructure_tables(protect_table_latin(source), {0: 'measured_inline_code_needs_more_width'})
        result, manifest = annotate_inline_code(stacked, 'fixture')
        self.assertEqual(manifest['entries'][0]['expected_text'], 'DeleteConfirmDialog')
        self.assertEqual(manifest['entries'][0]['context'], 'flow')
        self.assertIn('<span', result)
        validate_annotated_html(result, manifest)

    def test_breaks_are_only_after_dots_and_slashes(self):
        source = '<table><tr><td>task.getById.invalidate/path-name</td></tr></table>'
        protected = protect_table_latin(source)
        _, manifest = annotate_inline_code(protected, 'fixture')
        self.assertEqual([i['expected_text'] for i in manifest['entries']],
                         ['task.', 'getById.', 'invalidate/', 'path-name'])
        self.assertEqual(protected.count('<wbr>'), 3)
        self.assertEqual(''.join(Text(source).parts), ''.join(Text(protected).parts))

    def test_repeated_header_requires_distinct_pages_and_own_table(self):
        source = '<table><thead><tr><th>prop</th></tr></thead><tbody><tr><td>説明</td></tr></tbody></table>'
        _, manifest = annotate_inline_code(protect_table_latin(source), 'fixture')
        entry = manifest['entries'][0]
        report = {'dom_audit': {'ready_state': 'complete', 'observed': [{
            'id': entry['id'], 'items': [
                {'page_index': 1, 'table_geometry': {'identity': {'value': entry['table_id']}, 'target': {'row_index': 0}}},
                {'page_index': 1, 'table_geometry': {'identity': {'value': entry['table_id']}, 'target': {'row_index': 0}}},
            ]}]}}
        with self.assertRaisesRegex(ValueError, '表とページ'):
            measured_tables_to_stack(manifest, report, [0])
        report['dom_audit']['observed'][0]['items'][1]['page_index'] = 2
        report['dom_audit']['observed'][0]['items'][1]['table_geometry']['identity']['value'] = 'wrong-table'
        with self.assertRaisesRegex(ValueError, '表とページ'):
            measured_tables_to_stack(manifest, report, [0])

    def test_punctuation_whitespace_and_original_typeface(self):
        source = '<table><tr><td>one-word (two_words) [x] 123\n次です</td></tr></table>'
        protected = protect_table_latin(source)
        self.assertNotIn('<code', protected)
        self.assertEqual(''.join(Text(source).parts), ''.join(Text(protected).parts))
        _, manifest = annotate_inline_code(protected, 'fixture')
        self.assertEqual([i['expected_text'] for i in manifest['entries']], ['one-word', '(two_words)', '[x]', '123'])

    def test_bare_symbol_runs_are_not_protected(self):
        source = '<table><tr><th>エラー / 問題</th><td>A -> B</td></tr></table>'
        protected = protect_table_latin(source)
        self.assertEqual(protected.count('pdf-table-latin'), 2)
        self.assertIn('<th>エラー / 問題</th>', protected)
        self.assertIn('</span> -&gt; <span', protected)
        self.assertEqual(''.join(Text(source).parts), ''.join(Text(protected).parts))

    def test_semicolon_less_character_references_keep_following_markup(self):
        # 「;」の無い文字参照の直後にタグが来ると、参照の長さを誤ると次のタグの「<」を本文として食ってしまう。
        for source in ['<table><tr><td>&amp<b>x</b> foo-bar</td></tr></table>',
                       '<table><tr><td>&#38<b>x</b> foo-bar</td></tr></table>',
                       '<table><tr><td>&#x26<b>x</b> foo-bar</td></tr></table>',
                       '<table><tr><td>a&#38</td></tr></table>']:
            protected = protect_table_latin(source)
            self.assertNotIn('&lt;', protected, source)
            self.assertEqual(''.join(Text(source).parts), ''.join(Text(protected).parts), source)
            annotated, manifest = annotate_inline_code(protected, 'fixture')
            validate_annotated_html(annotated, manifest)
        self.assertEqual([i['expected_text'] for i in manifest['entries']], ['a'])

if __name__ == '__main__':
    unittest.main()
