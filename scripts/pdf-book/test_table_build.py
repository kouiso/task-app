"""表の再構成を実測・再計測・成果物の証跡まで通す結合テスト。"""

import hashlib
import json
import re
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import build_pdf_book as builder


class TableBuildTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.work = self.root / 'work'
        self.work.mkdir()
        (self.work / 'book.css').write_bytes(builder.BOOK_CSS.read_bytes())
        self.output = self.root / 'pdf'
        self.source = self.root / 'book.md'
        self.source.write_text('# 本\n\n本文\n')
        self.overrides = self.root / 'override.json'
        self.overrides.write_text('{"schema_version":1,"overrides":[]}')
        self.html = ('<html><head></head><body>'
                     '<table><thead><tr><th>名前</th><th>説明</th><th>値</th></tr></thead>'
                     '<tbody><tr><td>状態</td><td>入力の説明です</td><td><code>task.id</code></td>'
                     '</tr></tbody></table></body></html>')
        self.rendered = []
        self.missing_prose = False
        self.mutate_source = False
        self.fail_final = False

    def report(self, manifest):
        inventory = []
        for table in manifest['tables']:
            cells = [{'column_index': i, 'row_index': 0, 'cell_index': i,
                      'column_span': 1, 'row_span': 1,
                      'has_prose': True, 'font_size_px': 16,
                      'content_rect': {'left': i * 100 + 5, 'right': (i + 1) * 100 - 5,
                                       'width': 90},
                      'box': {'horizontal_fixed': 10}}
                     for i in range(3)]
            if self.missing_prose:
                del cells[0]['has_prose']
            inventory.append({'id': table['id'], 'fragments': [{
                'page_index': 1,
                'page_content_rect': {'left': 0, 'right': 600, 'width': 600},
                'geometry': {'status': 'supported', 'column_count': 3,
                             'columns': [{'column_index': i, 'width': 100} for i in range(3)],
                             'unsupported_columns': [], 'cells': cells,
                             'rect': {'left': 0, 'right': 300, 'width': 300}}}]})
        observed = [{'id': entry['id'], 'items': [{
            'text': entry['expected_text'], 'font_size_pt': 12,
            'line_rects': [{'left': 0, 'right': 50, 'width': 50}],
            'code_rect': {'width': 50}, 'code_box': {'content_width': 50},
            'flow_geometry': {'status': 'supported', 'available_width': 600}}]}
            for entry in manifest['entries']]
        return {'document_id': manifest['document_id'], 'dom_audit': {
            'ready_state': 'complete', 'violations': [], 'observed': observed,
            'table_inventory': {'tables': inventory}}}

    def run_command(self, command, **kwargs):
        completed = lambda text='': subprocess.CompletedProcess(command, 0, text, '')
        if builder.VFM_CLI in command:
            return completed(self.html)
        if command[0] == 'pdfinfo':
            return completed('Pages: 1')
        if '--dom-report' in command:
            Path(command[command.index('--report') + 1]).write_text('{"result":"pass"}')
            return completed()
        manifest = json.loads(Path(kwargs['env']['PDF_BOOK_INLINE_LAYOUT_MANIFEST']).read_text())
        report_path = Path(kwargs['env']['PDF_BOOK_INLINE_LAYOUT_REPORT'])
        if report_path.name.endswith('.inline-measurement.json'):
            self.assertFalse(report_path.exists(), '前回の計測結果を残したまま再計測した')
        config = json.loads((self.work / command[command.index('-c') + 1]).read_text()
                            .removeprefix('module.exports = ').removesuffix(';\n'))
        html = (self.work / config['entry'][0]['path']).read_text()
        self.rendered.append((manifest, html))
        report_path.write_text(json.dumps(self.report(manifest)))
        output = Path(command[command.index('-o') + 1])
        output.write_bytes(b'fixture PDF: ' + str(len(self.rendered)).encode())
        if self.fail_final and not output.name.endswith('.inline-measurement.pdf'):
            return subprocess.CompletedProcess(command, 1, '', 'final render failed')
        if self.mutate_source and not output.name.endswith('.inline-measurement.pdf'):
            self.source.write_text('# 変更された本\n')
        return completed()

    def build(self):
        with (patch.object(builder, 'OUT_DIR', self.output),
              patch.object(builder, 'WORK_DIR', self.work),
              patch.object(builder, 'TABLE_LAYOUT_OVERRIDES', self.overrides),
              patch.object(builder, 'rewrite_book_links', side_effect=lambda text, *_: text),
              patch.object(builder.subprocess, 'run', side_effect=self.run_command)):
            return builder.build_one(self.source, None, {})

    def test_narrow_prose_reannotates_remeasures_and_binds_final_files(self):
        self.assertEqual(self.build(), [])
        self.assertEqual(len(self.rendered), 3)
        before, remeasured, final = self.rendered
        self.assertEqual(len(before[0]['tables']), 1)
        self.assertEqual(before[0]['entries'][0]['context'], 'table')
        self.assertEqual(remeasured[0]['tables'], [])
        self.assertEqual(remeasured[0]['entries'][0]['context'], 'flow')
        self.assertEqual(remeasured, final)
        self.assertIn('pdf-stacked-table', final[1])
        # 語尾接着のスパンが差し込まれるので、タグを外して本文を照合する
        self.assertIn('入力の説明です', re.sub(r'<[^>]+>', '', final[1]))
        self.assertEqual([x['expected_text'] for x in before[0]['entries']],
                         [x['expected_text'] for x in final[0]['entries']])
        binding = json.loads(next(self.work.glob('*.evidence-binding.json')).read_text())
        self.assertIn('table_structure', binding['artifacts'])
        for record in binding['artifacts'].values():
            self.assertEqual(hashlib.sha256(Path(record['path']).read_bytes()).hexdigest(),
                             record['sha256'])
        structure = json.loads(next(self.work.glob('*.table-structure.json')).read_text())
        self.assertEqual(structure['tables'][0]['reason'], 'measured_prose_width_below_10em')

    def test_plain_identifier_uses_existing_measured_stack_and_audit_path(self):
        self.html = self.html.replace('<code>task.id</code>', 'DeleteConfirmDialog')
        self.assertEqual(self.build(), [])
        before, remeasured, final = self.rendered
        self.assertEqual(before[0]['entries'][0]['expected_text'], 'DeleteConfirmDialog')
        self.assertEqual(before[0]['entries'][0]['context'], 'table')
        self.assertEqual(remeasured[0]['entries'][0]['context'], 'flow')
        self.assertIn('pdf-table-latin', final[1])
        self.assertEqual(remeasured, final)

    def test_repeated_plain_header_is_stacked_before_single_instance_audit(self):
        self.html = self.html.replace('<th>名前</th>', '<th>prop</th>')
        original_report = self.report
        def repeated_report(manifest):
            result = original_report(manifest)
            for table in result['dom_audit']['table_inventory']['tables']:
                for cell in table['fragments'][0]['geometry']['cells']:
                    cell['font_size_px'] = 8
            for entry, observed in zip(manifest['entries'], result['dom_audit']['observed']):
                if entry.get('table_header'):
                    observed['items'] = [dict(observed['items'][0], page_index=page,
                        table_geometry={'identity': {'value': entry['table_id']},
                                        'target': {'row_index': 0}}) for page in (53, 54)]
            return result
        self.report = repeated_report
        self.assertEqual(self.build(), [])
        self.assertEqual(len(self.rendered), 3)
        self.assertEqual(self.rendered[0][0]['entries'][0]['expected_text'], 'prop')
        self.assertTrue(self.rendered[0][0]['entries'][0]['table_header'])
        self.assertFalse(self.rendered[1][0]['entries'][0]['table_header'])
        structure = json.loads(next(self.work.glob('*.table-structure.json')).read_text())
        self.assertEqual(structure['tables'][0]['reason'], 'measured_repeated_latin_header')

    def test_duplicate_plain_body_observations_still_fail(self):
        self.html = self.html.replace('<code>task.id</code>', 'DeleteConfirmDialog')
        original_report = self.report
        def duplicate_report(manifest):
            result = original_report(manifest)
            for observed in result['dom_audit']['observed']:
                observed['items'] = [observed['items'][0], dict(observed['items'][0])]
            return result
        self.report = duplicate_report
        self.assertTrue(self.build())
        self.assertFalse((self.output / 'book.pdf').exists())
        self.assertFalse(list(self.work.glob('*.evidence-binding.json')))

    def test_four_column_code_table_is_stacked_before_first_measurement(self):
        self.html = self.html.replace('<th>値</th>', '<th>値</th><th>備考</th>')
        self.html = self.html.replace('</code></td>', '</code></td><td>最後の列も保持</td>')
        self.assertEqual(self.build(), [])
        self.assertEqual(len(self.rendered), 2)
        self.assertEqual(self.rendered[0][0]['tables'], [])
        self.assertIn('最後の列も保持', re.sub(r'<[^>]+>', '', self.rendered[0][1]))
        self.assertEqual(self.rendered[0], self.rendered[1])

    def test_failed_final_render_removes_old_output_and_binding(self):
        self.output.mkdir()
        (self.output / 'book.pdf').write_bytes(b'old PDF')
        old_binding = self.work / (builder.work_slug('book') + '.evidence-binding.json')
        old_binding.write_text('{}')
        self.fail_final = True
        problems = self.build()
        self.assertTrue(any('final render failed' in p for p in problems), problems)
        self.assertFalse((self.output / 'book.pdf').exists())
        self.assertFalse(old_binding.exists())

    def test_missing_prose_geometry_fails_before_final_pdf(self):
        self.missing_prose = True
        problems = self.build()
        self.assertTrue(any('本文有無' in p for p in problems), problems)
        self.assertEqual(len(self.rendered), 1)
        self.assertFalse((self.output / 'book.pdf').exists())
        self.assertFalse(list(self.work.glob('*.evidence-binding.json')))

    def test_unknown_table_error_is_not_reclassified_as_layout_change(self):
        original_report = self.report
        def adequate_width_report(manifest):
            result = original_report(manifest)
            for table in result['dom_audit']['table_inventory']['tables']:
                for cell in table['fragments'][0]['geometry']['cells']:
                    cell['content_rect']['width'] = 200
            return result
        self.report = adequate_width_report
        with patch.object(builder, 'derive_table_css', return_value=('', [], [
            {'table_id': 'unknown', 'reason': 'spanning_cell_not_supported'}
        ])):
            problems = self.build()
        self.assertTrue(any('寸法を証明できません' in p for p in problems), problems)
        self.assertEqual(len(self.rendered), 1)
        self.assertFalse((self.output / 'book.pdf').exists())

    def test_mutated_source_cannot_get_success_binding(self):
        self.mutate_source = True
        problems = self.build()
        self.assertTrue(any('原稿が変更' in p for p in problems), problems)
        self.assertFalse((self.output / 'book.pdf').exists())
        self.assertFalse(list(self.work.glob('*.evidence-binding.json')))


if __name__ == '__main__':
    unittest.main()
