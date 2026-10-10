import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

import build_pdf_book


SCRIPT = Path(__file__).with_name("measure-breakable-code.mjs")


class MeasureBreakableCodeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.browser = os.environ.get("PDF_BOOK_BROWSER") or build_pdf_book.find_browser()
        cls.toolchain = os.environ.get("PDF_BOOK_TOOLCHAIN_DIR") or str(
            Path(__file__).resolve().parents[2]
        )
        if not cls.browser or not Path(cls.browser).is_file():
            raise unittest.SkipTest("PDF_BOOK_BROWSER is required for the DOM measurement test")
        if not cls.toolchain or not (Path(cls.toolchain) / "node_modules").is_dir():
            raise unittest.SkipTest(
                "PDF_BOOK_TOOLCHAIN_DIR is required for the DOM measurement test"
            )

    def run_measurement(self, body, source_entries, extra_css="", expect_ok=True):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            html = root / "input.html"
            sources = root / "sources.json"
            theme = root / "theme.css"
            book = root / "book.css"
            per_book = root / "per-book.css"
            report = root / "report.json"
            html.write_text(body, encoding="utf-8")
            sources.write_text(json.dumps(source_entries), encoding="utf-8")
            theme.write_text(
                """
:root {
  --vs-page--margin-top: 25mm;
  --vs-page--margin-bottom: 25mm;
  --vs-page--margin-inner: 22mm;
  --vs-page--margin-outer: 22mm;
}
pre[class*="language-"] {
  margin-block: 10px;
  padding: 12px;
  border: 2px solid black;
  background: rgb(40, 44, 52);
  font: 16px/20px monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
""",
                encoding="utf-8",
            )
            book.write_text(extra_css, encoding="utf-8")
            per_book.write_text("", encoding="utf-8")
            command = [
                "node", str(SCRIPT), "--html", str(html), "--theme-css", str(theme),
                "--book-css", str(book), "--per-book-css", str(per_book),
                "--sources", str(sources), "--report", str(report),
                "--browser", self.browser, "--toolchain-dir", self.toolchain,
                "--page-width-mm", "210", "--page-height-mm", "297",
            ]
            env = os.environ.copy()
            # puppeteer-core 25 は ESM 専用です。Node の任意互換機能で CommonJS
            # 読み込みの退行を隠さず、本番helperの動的importを直接検証します。
            env["NODE_OPTIONS"] = "--no-experimental-require-module"
            completed = subprocess.run(
                command, capture_output=True, text=True, timeout=30, env=env
            )
            if expect_ok:
                self.assertEqual(completed.returncode, 0, completed.stderr)
                return json.loads(report.read_text(encoding="utf-8"))
            self.assertNotEqual(completed.returncode, 0)
            self.assertFalse(report.exists())
            return completed.stderr

    def test_final_css_width_padding_and_wrapping_affect_natural_height(self):
        inner = "1234567890" * 18
        digest = hashlib.sha256(inner.encode()).hexdigest()
        pre_id = f"pdf-pre-00000-{digest[:12]}"
        html = (
            f'<pre class="language-ts" data-pdf-pre-id="{pre_id}">'
            f"<code>{inner}</code></pre>"
        )
        sources = [{"id": pre_id, "source_sha256": digest}]
        normal = self.run_measurement(html, sources)
        narrow = self.run_measurement(html, sources, "pre { inline-size: 220px; }")
        normal_pre = normal["pres"][0]
        narrow_pre = narrow["pres"][0]
        self.assertAlmostEqual(normal["page"]["content_height_px"], 933.54, delta=0.2)
        self.assertEqual(normal_pre["padding_block_start_px"], 12)
        self.assertEqual(normal_pre["border_block_start_px"], 2)
        self.assertEqual(normal_pre["background_color"], "rgb(40, 44, 52)")
        self.assertGreater(narrow_pre["required_height_px"], normal_pre["required_height_px"])

    def test_missing_or_duplicate_dom_id_fails_without_report(self):
        digest = hashlib.sha256(b"x").hexdigest()
        sources = [{"id": "expected", "source_sha256": digest}]
        missing = '<pre class="language-ts"><code>x</code></pre>'
        self.assertIn("missing data-pdf-pre-id", self.run_measurement(
            missing, sources, expect_ok=False
        ))
        duplicate = (
            '<pre class="language-ts" data-pdf-pre-id="expected"><code>x</code></pre>'
            '<pre class="language-ts" data-pdf-pre-id="expected"><code>x</code></pre>'
        )
        self.assertIn("duplicate DOM pre id", self.run_measurement(
            duplicate, sources, expect_ok=False
        ))

    def test_missing_final_code_style_and_sub_8pt_font_fail_closed(self):
        digest = hashlib.sha256(b"x").hexdigest()
        pre_id = f"pdf-pre-00000-{digest[:12]}"
        html = (
            f'<pre class="language-ts" data-pdf-pre-id="{pre_id}"><code>x</code></pre>'
        )
        sources = [{"id": pre_id, "source_sha256": digest}]
        self.assertIn("final code-block CSS is not active", self.run_measurement(
            html, sources,
            'pre[class*="language-"] { padding: 0; background: transparent; }',
            expect_ok=False,
        ))
        self.assertIn("below 8pt", self.run_measurement(
            html, sources, 'pre[class*="language-"] { font-size: 7.99pt; }',
            expect_ok=False,
        ))


if __name__ == "__main__":
    unittest.main()
