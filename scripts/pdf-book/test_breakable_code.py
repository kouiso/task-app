import hashlib
import math
import unittest

from breakable_code import (
    BREAK_BEFORE_CLASS,
    BREAK_BEFORE_MARKER,
    COMPLETE_COPY_MARKER,
    annotate_pres,
    apply_breakable_measurements,
)


def pre(body, attrs='class="language-ts"'):
    return f"<pre {attrs}><code>{body}</code></pre>"


def report(sources, heights, content_height=900):
    return {
        "page": {"content_height_px": content_height},
        "pres": [
            {
                "id": source.pre_id,
                "source_sha256": source.source_sha256,
                "required_height_px": height,
            }
            for source, height in zip(sources, heights, strict=True)
        ],
    }


class BreakableCodeTest(unittest.TestCase):
    def test_fit_is_based_on_measured_height_not_line_count(self):
        body = "\n".join(f"line{i}" for i in range(40))
        source, pres = annotate_pres(pre(body))
        result = apply_breakable_measurements(source, pres, report(pres, [899]))
        self.assertNotIn("pdf-breakable", result)

    def test_short_wrapped_block_can_be_breakable_when_measurement_is_tall(self):
        body = '<br class="cw-force">'.join(["日本語", "の折返し", "を測る"])
        source, pres = annotate_pres(pre(body))
        result = apply_breakable_measurements(source, pres, report(pres, [901]))
        self.assertIn('class="language-ts pdf-breakable"', result)

    def test_exact_page_height_stays_together(self):
        source, pres = annotate_pres(pre("one"))
        result = apply_breakable_measurements(source, pres, report(pres, [900]))
        self.assertNotIn("pdf-breakable", result)

    def test_block_without_class_gets_breakable_class(self):
        source, pres = annotate_pres(pre("one", attrs=""))
        result = apply_breakable_measurements(source, pres, report(pres, [901]))
        self.assertIn('class="pdf-breakable"', result)

    def test_ids_are_source_ordered_and_content_bound(self):
        html, sources = annotate_pres(pre("first") + pre("second"))
        self.assertEqual(len(sources), 2)
        self.assertTrue(sources[0].pre_id.startswith("pdf-pre-00000-"))
        self.assertTrue(sources[1].pre_id.startswith("pdf-pre-00001-"))
        self.assertEqual(
            sources[0].source_sha256,
            hashlib.sha256(pre("first").encode()).hexdigest(),
        )
        self.assertEqual(html.count("data-pdf-pre-id="), 2)

    def test_semantic_marker_breaks_only_its_oversized_complete_copy(self):
        first = pre("first")
        second = pre("second")
        html = (
            first
            + BREAK_BEFORE_MARKER
            + "\n"
            + COMPLETE_COPY_MARKER
            + "\n"
            + second
        )
        annotated, sources = annotate_pres(html)
        result = apply_breakable_measurements(annotated, sources, report(sources, [901, 901]))
        first_tag, second_tag = result.split("</pre>")[:2]
        self.assertNotIn(BREAK_BEFORE_CLASS, first_tag)
        self.assertIn(BREAK_BEFORE_CLASS, second_tag)
        self.assertIn("<code>first</code>", result)
        self.assertIn("<code>second</code>", result)

    def test_semantic_marker_does_not_break_a_fitting_complete_copy(self):
        html = BREAK_BEFORE_MARKER + COMPLETE_COPY_MARKER + pre("fits")
        annotated, sources = annotate_pres(html)
        result = apply_breakable_measurements(annotated, sources, report(sources, [900]))
        self.assertNotIn(BREAK_BEFORE_CLASS, result)
        self.assertNotIn("pdf-breakable", result)

    def test_reserved_break_class_is_scrubbed_from_unmarked_pre_and_stays_scrubbed(self):
        html = pre(
            "payload <>& stays byte-identical",
            attrs=f'class="language-ts keep-me {BREAK_BEFORE_CLASS}"',
        )
        annotated, sources = annotate_pres(html)
        fitting = apply_breakable_measurements(annotated, sources, report(sources, [900]))
        self.assertNotIn(BREAK_BEFORE_CLASS, fitting)
        self.assertIn("keep-me", fitting)
        self.assertIn("<code>payload <>& stays byte-identical</code>", fitting)

        oversized = apply_breakable_measurements(fitting, sources, report(sources, [901]))
        self.assertIn("pdf-breakable", oversized)
        self.assertNotIn(BREAK_BEFORE_CLASS, oversized)
        self.assertEqual(oversized.count("payload <>& stays byte-identical"), 1)

    def test_reserved_break_class_is_rederived_for_marked_pre_after_height_changes(self):
        html = (
            BREAK_BEFORE_MARKER
            + COMPLETE_COPY_MARKER
            + pre("complete payload", attrs=f'class="language-ts {BREAK_BEFORE_CLASS}"')
        )
        annotated, sources = annotate_pres(html)
        fitting = apply_breakable_measurements(annotated, sources, report(sources, [900]))
        self.assertNotIn(BREAK_BEFORE_CLASS, fitting)

        oversized = apply_breakable_measurements(fitting, sources, report(sources, [901]))
        self.assertIn("pdf-breakable", oversized)
        self.assertIn(BREAK_BEFORE_CLASS, oversized)
        self.assertEqual(oversized.count("complete payload"), 1)

    def test_semantic_marker_before_prose_fails_closed(self):
        html = (
            BREAK_BEFORE_MARKER
            + COMPLETE_COPY_MARKER
            + "<p>explanation</p>"
            + pre("later")
        )
        with self.assertRaisesRegex(ValueError, "結び付いていません"):
            annotate_pres(html)

    def test_layout_marker_without_complete_copy_marker_fails_closed(self):
        html = BREAK_BEFORE_MARKER + pre("ordinary")
        with self.assertRaisesRegex(ValueError, "結び付いていません"):
            annotate_pres(html)

    def test_existing_measurement_id_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "既にあります"):
            annotate_pres('<pre data-pdf-pre-id="old"><code>x</code></pre>')

    def test_missing_measurement_fails_closed(self):
        source, pres = annotate_pres(pre("first") + pre("second"))
        incomplete = report(pres[:1], [10])
        with self.assertRaisesRegex(ValueError, "ID集合"):
            apply_breakable_measurements(source, pres, incomplete)

    def test_extra_measurement_fails_closed(self):
        source, pres = annotate_pres(pre("first"))
        measured = report(pres, [10])
        measured["pres"].append(
            {"id": "extra", "source_sha256": "0" * 64, "required_height_px": 10}
        )
        with self.assertRaisesRegex(ValueError, "ID集合"):
            apply_breakable_measurements(source, pres, measured)

    def test_duplicate_measurement_fails_closed(self):
        source, pres = annotate_pres(pre("first"))
        measured = report(pres, [10])
        measured["pres"].append(dict(measured["pres"][0]))
        with self.assertRaisesRegex(ValueError, "重複"):
            apply_breakable_measurements(source, pres, measured)

    def test_changed_source_hash_fails_closed(self):
        source, pres = annotate_pres(pre("first"))
        measured = report(pres, [10])
        measured["pres"][0]["source_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "内容が測定後"):
            apply_breakable_measurements(source, pres, measured)

    def test_duplicate_html_id_fails_closed(self):
        source, pres = annotate_pres(pre("first"))
        duplicated = source + source
        with self.assertRaisesRegex(ValueError, "重複"):
            apply_breakable_measurements(duplicated, pres, report(pres, [10]))

    def test_nonpositive_page_or_pre_height_fails_closed(self):
        source, pres = annotate_pres(pre("first"))
        with self.assertRaisesRegex(ValueError, "版面高さ"):
            apply_breakable_measurements(source, pres, report(pres, [10], 0))
        with self.assertRaisesRegex(ValueError, "実寸高さ"):
            apply_breakable_measurements(source, pres, report(pres, [0]))

    def test_nonfinite_or_boolean_geometry_fails_closed(self):
        source, pres = annotate_pres(pre("first"))
        for invalid in (math.nan, math.inf, True):
            with self.subTest(invalid=invalid):
                with self.assertRaisesRegex(ValueError, "実寸高さ"):
                    apply_breakable_measurements(source, pres, report(pres, [invalid]))
        for invalid in (math.nan, math.inf, True):
            with self.subTest(content_height=invalid):
                with self.assertRaisesRegex(ValueError, "版面高さ"):
                    apply_breakable_measurements(
                        source, pres, report(pres, [10], invalid)
                    )

    def test_invalid_hash_and_preexisting_breakable_class_fail_closed(self):
        source, pres = annotate_pres(pre("first"))
        measured = report(pres, [10])
        measured["pres"][0]["source_sha256"] = "g" * 64
        with self.assertRaisesRegex(ValueError, "内容ハッシュ"):
            apply_breakable_measurements(source, pres, measured)
        already_breakable = source.replace(
            'class="language-ts"', 'class="language-ts pdf-breakable"'
        )
        with self.assertRaisesRegex(ValueError, "分割クラス"):
            apply_breakable_measurements(already_breakable, pres, report(pres, [10]))


if __name__ == "__main__":
    unittest.main()
