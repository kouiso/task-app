"""配布先へのリンク変換と、PDF内の中間URL検査を固定する。"""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import build_pdf_book

from build_pdf_book import load_link_map, number_external_link_footnotes, rewrite_book_links
from check_pdf_book import find_link_problems


class BookLinksTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.source = self.root / 'day01.md'
        self.source.write_text('# Day01')
        (self.root / 'day02.md').write_text('# Day02')
        self.mapping = {'day02.pdf': 'https://drive.google.com/file/d/existing-id/view'}

    def rewrite(self, text, mapping=None):
        return rewrite_book_links(text, self.source, self.mapping if mapping is None else mapping)

    def test_inline_and_reference_links_resolve_but_images_and_code_do_not(self):
        source = ('😀 [**次**](./day02.md "題名")\n\n[次][next]\n\n'
                  '[next]: ./day02.md\n\n![図](./day02.md)\n'
                  '`[例](missing.md)`\n\n~~~md\n[例](missing.md)\n~~~\n')
        result = self.rewrite(source)
        self.assertEqual(result.count(self.mapping['day02.pdf']), 2)
        self.assertIn('[**次**](<https://drive.google.com/file/d/existing-id/view> "題名")', result)
        self.assertIn('![図](./day02.md)', result)
        self.assertIn('`[例](missing.md)`', result)
        self.assertIn('~~~md\n[例](missing.md)\n~~~', result)

    def test_external_and_same_book_anchors_are_unchanged(self):
        source = '[外](https://example.com/a.md#x) [内](#section)'
        self.assertEqual(self.rewrite(source, {}), source)
        self.assertEqual(self.rewrite('[内](day01.md#section)', {}), '[内](<#section>)')

    def test_print_footnotes_preserve_markup_and_number_only_eligible_external_links(self):
        source = '''<p class="lead"><a class="cta" title="A &gt; B"
 href="https://example.com/?a=1&amp;b=2"><span>装飾</span></a></p>
<p><a href='http://example.net/x'>外部</a></p>
<p><a href="/relative">相対</a> <a href="#fragment">見出し</a>
<a href="mailto:a@example.com">メール</a> <a href="tel:123">電話</a></p>
<div class="note footnote compact"><a href="https://example.org/in-footnote">脚注内</a></div>
<pre><code>&lt;a href="https://example.invalid/code"&gt;</code></pre>'''
        expected = '''<p class="lead"><a data-pdf-footnote="1" class="cta" title="A &gt; B"
 href="https://example.com/?a=1&amp;b=2"><span>装飾</span></a></p>
<p><a data-pdf-footnote="2" href='http://example.net/x'>外部</a></p>
<p><a href="/relative">相対</a> <a href="#fragment">見出し</a>
<a href="mailto:a@example.com">メール</a> <a href="tel:123">電話</a></p>
<div class="note footnote compact"><a href="https://example.org/in-footnote">脚注内</a></div>
<pre><code>&lt;a href="https://example.invalid/code"&gt;</code></pre>'''
        self.assertEqual(number_external_link_footnotes(source), expected)

    def test_print_footnote_numbers_restart_for_each_book_and_survive_void_elements(self):
        source = '<p><br><a href="https://example.com">外部</a><img src="x"></p>'
        expected = ('<p><br><a data-pdf-footnote="1" href="https://example.com">外部</a>'
                    '<img src="x"></p>')
        self.assertEqual(number_external_link_footnotes(source), expected)
        self.assertEqual(number_external_link_footnotes(source), expected)

    def test_print_footnote_reserved_attribute_is_rejected(self):
        source = '<p><a data-pdf-footnote="99" href="https://example.com">外部</a></p>'
        with self.assertRaisesRegex(ValueError, '予約属性'):
            number_external_link_footnotes(source)

    def test_unknown_unmapped_and_cross_book_fragments_fail(self):
        for target in ('missing.md', '../other.md', 'day02.md#section', 'notes.txt', '/guide'):
            with self.subTest(target=target), self.assertRaises(ValueError):
                self.rewrite(f'[次]({target})')
        with self.assertRaisesRegex(ValueError, 'PDF_BOOK_LINK_MAP'):
            self.rewrite('[次](day02.md)', {})

    def test_raw_html_local_links_fail_instead_of_leaking(self):
        with self.assertRaises(ValueError):
            self.rewrite('<a href="day02.md">次</a>')

    def test_metadata_map_keeps_existing_url_and_rejects_duplicates(self):
        metadata = self.root / 'map.json'
        metadata.write_text(json.dumps([{'name': 'day02.pdf', 'id': 'existing-id',
                                       'url': self.mapping['day02.pdf']}]))
        self.assertEqual(load_link_map(str(metadata)), self.mapping)
        metadata.write_text(json.dumps([{'name': 'day02.pdf', 'url': self.mapping['day02.pdf']}] * 2))
        with self.assertRaises(ValueError):
            load_link_map(str(metadata))

    def test_map_cannot_reintroduce_intermediate_or_local_urls(self):
        metadata = self.root / 'map.json'
        for url in ('http://localhost:13000/x.pdf', 'https://example.com/x.md', 'x.pdf'):
            metadata.write_text(json.dumps({'day02.pdf': url}))
            with self.subTest(url=url), self.assertRaises(ValueError):
                load_link_map(str(metadata))

    def test_missing_mapping_stops_before_clearing_work_or_running_typesetter(self):
        self.source.write_text('# Day01\n[次](day02.md)')
        with patch.dict('os.environ', {'PDF_BOOK_LINK_MAP': ''}), \
                patch.object(build_pdf_book, 'prepare_work_dir') as prepare:
            self.assertEqual(build_pdf_book.main(['build_pdf_book.py', str(self.source)]), 2)
            prepare.assert_not_called()

    def test_generator_overrides_application_legacy_peer_deps_only_in_child_env(self):
        with patch.dict('os.environ', {'PDF_BOOK_LINK_MAP': '', 'npm_config_legacy_peer_deps': 'true'}), \
                patch.object(build_pdf_book, 'prepare_work_dir'), \
                patch.object(build_pdf_book, 'prepare_release_toolchain', return_value={
                    'vivliostyle_bin': '/fixture/vivliostyle',
                    'vfm_bin': '/fixture/vfm',
                    'mermaid_bin': '/fixture/mmdc',
                    'theme_path': '/fixture/theme',
                }) as prepare_toolchain, \
                patch.object(build_pdf_book, 'find_browser', return_value=None), \
                patch.object(build_pdf_book, 'build_one', return_value=[]) as build:
            self.assertEqual(build_pdf_book.main(['build_pdf_book.py', str(self.source)]), 0)
            self.assertEqual(prepare_toolchain.call_args.args[0]['npm_config_legacy_peer_deps'], 'false')
            self.assertEqual(build.call_args.args[2]['npm_config_legacy_peer_deps'], 'false')
            self.assertEqual(build_pdf_book.os.environ['npm_config_legacy_peer_deps'], 'true')

    def test_duplicate_json_keys_fail(self):
        metadata = self.root / 'map.json'
        metadata.write_text('{"day02.pdf":"https://example.com/a", "day02.pdf":"https://example.com/b"}')
        with self.assertRaisesRegex(ValueError, '重複'):
            load_link_map(str(metadata))

    def test_pdf_annotation_check_rejects_localhost_and_intermediate_markdown(self):
        for url in ('http://localhost:13000/vivliostyle/day.md',
                    'http://127.0.0.1:13000/x.pdf',
                    'https://example.com/vivliostyle/day%2Emd'):
            with self.subTest(url=url):
                self.assertTrue(find_link_problems(f'Page Type URL\n 3 Annotation {url}\n'))
        for url in ('https://drive.google.com/file/d/id/view', 'http://localhost:3000/login',
                    'https://github.com/example/project/blob/main/README.md'):
            self.assertEqual(find_link_problems(f'Page Type URL\n 3 Annotation {url}\n'), [])


if __name__ == '__main__':
    unittest.main()
