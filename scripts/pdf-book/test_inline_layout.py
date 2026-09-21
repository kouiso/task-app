#!/usr/bin/env python3
"""inline_layout のattribute-only注釈とfail-closed回帰。"""

from __future__ import annotations

import re
import sys
import unittest
from copy import deepcopy
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from code_wrap import wrap_code_in_html
from inline_layout import (
    InlineLayoutMarkupError,
    annotate_inline_code,
    validate_annotated_html,
)


GENERATED_ATTRIBUTE = re.compile(
    r' data-pdf-(?:inline|table)-id="pdf-(?:inline|table)-[0-9a-f]{12}-\d{5}"'
)


class InlineLayoutTest(unittest.TestCase):
    def test_entities_and_nested_spans_produce_browser_text(self):
        source = (
            '<p class="lead">before <code class="language-ts" title="keep">'
            '<span class="token keyword">const</span> x = &lt;日本語&gt; &amp; &#x1F600;'
            '</code> after</p>'
        )
        annotated, manifest = annotate_inline_code(source, "day01")

        self.assertEqual(len(manifest["entries"]), 1)
        self.assertEqual(
            manifest["entries"][0]["expected_text"], "const x = <日本語> & 😀"
        )
        self.assertIn('class="language-ts" title="keep"', annotated)
        self.assertEqual(GENERATED_ATTRIBUTE.sub("", annotated), source)

    def test_table_context_and_pre_exclusion(self):
        source = (
            "<main><pre><code>npm install &amp;&amp; npm test</code></pre>"
            '<table id="source-table"><tr><th><code>HeaderType</code></th>'
            "<td><code><span>src/task-app.ts</span></code></td></tr></table>"
            "<p><code>cd task-app</code></p></main>"
        )
        annotated, manifest = annotate_inline_code(source, "table-book")

        self.assertEqual([entry["source_order"] for entry in manifest["entries"]], [0, 1, 2])
        self.assertEqual([entry["context"] for entry in manifest["entries"]], ["table", "table", "flow"])
        self.assertEqual(
            [entry["expected_text"] for entry in manifest["entries"]],
            ["HeaderType", "src/task-app.ts", "cd task-app"],
        )
        self.assertEqual(
            manifest["tables"],
            [
                {
                    "id": manifest["tables"][0]["id"],
                    "source_order": 0,
                    "source_id": "source-table",
                }
            ],
        )
        self.assertRegex(
            annotated,
            r'<table data-pdf-table-id="pdf-table-[0-9a-f]{12}-00000" id="source-table">',
        )
        pre = annotated.split("</pre>", 1)[0]
        self.assertNotIn("data-pdf-inline-id", pre)
        self.assertEqual(GENERATED_ATTRIBUTE.sub("", annotated), source)

    def test_ids_are_stable_and_document_scoped(self):
        source = "<table><tr><td>x</td></tr></table><p><code>same</code> <code>same</code></p>"
        first_html, first_manifest = annotate_inline_code(source, "book-a")
        second_html, second_manifest = annotate_inline_code(source, "book-a")
        _, other_manifest = annotate_inline_code(source, "book-b")

        self.assertEqual(first_html, second_html)
        self.assertEqual(first_manifest, second_manifest)
        ids = [entry["id"] for entry in first_manifest["entries"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertNotEqual(ids[0], other_manifest["entries"][0]["id"])
        self.assertEqual(first_manifest["tables"], second_manifest["tables"])
        self.assertNotEqual(
            first_manifest["tables"][0]["id"], other_manifest["tables"][0]["id"]
        )
        self.assertEqual(first_manifest["schema_version"], 1)
        self.assertEqual(first_manifest["minimum_font_size_pt"], 8)
        self.assertEqual(
            first_manifest["page_content_selector"],
            '[data-vivliostyle-page-area-container="true"]',
        )

    def test_reserved_attribute_collision_fails_anywhere(self):
        for source in (
            '<p><code data-pdf-inline-id="user">x</code></p>',
            '<p data-pdf-inline-id="user"><code>x</code></p>',
            '<table data-pdf-table-id="user"><tr><td>x</td></tr></table>',
            '<p data-pdf-table-id="user"><code>x</code></p>',
        ):
            with self.subTest(source=source):
                with self.assertRaisesRegex(InlineLayoutMarkupError, "予約属性"):
                    annotate_inline_code(source, "book")

    def test_malformed_or_duplicate_attributes_fail_closed(self):
        malformed = (
            "<p><code>x</p></code>",
            "<p><code>x</code>",
            '<p><code class="a" class="b">x</code></p>',
            "<p><code><code>x</code></code></p>",
            "<code",
        )
        for source in malformed:
            with self.subTest(source=source):
                with self.assertRaises(InlineLayoutMarkupError):
                    annotate_inline_code(source, "book")

    def test_existing_markup_is_byte_preserved_apart_from_insertions(self):
        source = (
            '<!doctype html>\n<!-- keep -->\n<section data-x="a&amp;b">\n'
            '  <p>日本語 <code id="x" class="a  b">A&amp;B</code></p>\n'
            '  <p><code data-note="&quot;"> spaced\ttext </code></p>\n'
            '</section>\n'
        )
        annotated, manifest = annotate_inline_code(source, "byte-preserving")

        self.assertEqual(GENERATED_ATTRIBUTE.sub("", annotated), source)
        self.assertEqual(
            [entry["expected_text"] for entry in manifest["entries"]],
            ["A&B", " spaced\ttext "],
        )

    def test_validation_accepts_exact_wrap_output_and_regular_prism(self):
        source = (
            '<main><p><code>cd task-app</code></p><table><tr><td>'
            '<code>src/app/page.tsx</code></td></tr></table>'
            '<pre class="language-ts"><code><span class="token string">'
            + "x" * 75
            + '\nshort</span></code></pre></main>'
        )
        annotated, manifest = annotate_inline_code(source, "valid-prism")
        residuals: list[str] = []
        wrapped = wrap_code_in_html(annotated, residuals)

        self.assertEqual(residuals, [])
        validate_annotated_html(wrapped, manifest)

    def test_validation_rejects_missing_unknown_duplicate_and_tampered_ids(self):
        source = '<main><p><code>one</code></p><table><tr><td>x</td></tr></table></main>'
        annotated, manifest = annotate_inline_code(source, "tamper")
        inline_id = manifest["entries"][0]["id"]
        table_id = manifest["tables"][0]["id"]
        cases = (
            annotated.replace(f' data-pdf-inline-id="{inline_id}"', "", 1),
            annotated.replace(inline_id, inline_id[:-1] + "9", 1),
            annotated.replace(
                f' data-pdf-inline-id="{inline_id}"',
                f' data-pdf-inline-id="{inline_id}" data-pdf-inline-id="{inline_id}"',
                1,
            ),
            annotated.replace(
                "<main>", f'<main data-pdf-table-id="{table_id}">', 1
            ),
        )
        for candidate in cases:
            with self.subTest(candidate=candidate):
                with self.assertRaises(InlineLayoutMarkupError):
                    validate_annotated_html(candidate, manifest)

    def test_validation_rejects_manifest_or_visible_text_tampering(self):
        annotated, manifest = annotate_inline_code(
            "<p><code>original text</code></p>", "manifest-tamper"
        )
        changed_manifest = deepcopy(manifest)
        changed_manifest["entries"][0]["expected_text"] = "changed"

        with self.assertRaisesRegex(InlineLayoutMarkupError, "manifest"):
            validate_annotated_html(annotated, changed_manifest)
        with self.assertRaisesRegex(InlineLayoutMarkupError, "manifest"):
            validate_annotated_html(
                annotated.replace("original text", "changed text"), manifest
            )

    def test_validation_stops_known_code_wrap_malformed_outputs(self):
        fixtures = (
            (
                '<pre class="language-ts"><code>'
                '<span class="token string" title="a>b">'
                + "x" * 75
                + "\nshort</span></code></pre>"
            ),
            (
                '<pre class="language-ts"><code><span class="token string">'
                + "x" * 75
                + "\nshort</span >\nafter</code></pre>"
            ),
        )
        for source in fixtures:
            with self.subTest(source=source):
                annotated, manifest = annotate_inline_code(source, "malformed-wrap")
                residuals: list[str] = []
                wrapped = wrap_code_in_html(annotated, residuals)
                self.assertEqual(residuals, [])
                with self.assertRaises(InlineLayoutMarkupError):
                    validate_annotated_html(wrapped, manifest)


if __name__ == "__main__":
    unittest.main()
