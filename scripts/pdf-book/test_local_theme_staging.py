import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent))
import build_pdf_book


class LocalThemeStagingTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.work = self.root / "work"
        self.sources = self.root / "material"
        self.sources.mkdir()
        self.book_css = self.root / "book.css"
        self.book_css.write_text("body {}\n", encoding="utf-8")
        self.font = self.root / "node_modules" / "font-package" / "font.ttf"
        self.font.parent.mkdir(parents=True)
        self.font.write_bytes(b"font")
        self.toolchain = self.root / "toolchain"
        self.techbook = (
            self.toolchain / "node_modules" / "@vivliostyle" / "theme-techbook"
        )
        self.theme_base = self.techbook.parent / "theme-base"

    def tearDown(self):
        self.temporary.cleanup()

    def write_theme_fixture(self):
        self.techbook.mkdir(parents=True)
        self.theme_base.mkdir()
        imports = "".join(
            f"@import url(../theme-base/{relative});\n"
            for relative in build_pdf_book.LOCAL_THEME_BASE_IMPORTS
        )
        (self.techbook / "theme.css").write_text(
            imports + "\n:root { --fixture: 1; }\n", encoding="utf-8"
        )
        (self.techbook / "nested").mkdir()
        (self.techbook / "nested" / "bytes.bin").write_bytes(b"\x00theme\xff")
        for relative in build_pdf_book.LOCAL_THEME_BASE_IMPORTS:
            target = self.theme_base / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(f"/* {relative} */\n", encoding="utf-8")
        (self.theme_base / "extra.css").write_bytes(b"extra\x00bytes")

    def prepare(self):
        with (
            patch.object(build_pdf_book, "REPO_ROOT", self.root),
            patch.object(build_pdf_book, "WORK_DIR", self.work),
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(build_pdf_book, "BOOK_CSS", self.book_css),
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", self.toolchain),
            patch.object(
                build_pdf_book,
                "FONT_SOURCES",
                (("font-package", "font.ttf", "Fixture Font", 400, "truetype"),),
            ),
        ):
            build_pdf_book.prepare_work_dir()

    def test_prepare_work_dir_stages_both_complete_theme_trees_byte_exact(self):
        self.write_theme_fixture()

        self.prepare()

        staged = self.work / "local-theme"
        self.assertEqual(
            build_pdf_book._hash_tree_stably(self.techbook),
            build_pdf_book._hash_tree_stably(staged / "theme-techbook"),
        )
        self.assertEqual(
            build_pdf_book._hash_tree_stably(self.theme_base),
            build_pdf_book._hash_tree_stably(staged / "theme-base"),
        )

    def test_staging_fails_before_build_when_theme_import_inputs_are_missing(self):
        cases = [
            ("theme stylesheet", "theme.css"),
            ("base stylesheet", "theme-all.css"),
            ("direct prism stylesheet", "css/lib/prism/base.css"),
            ("relative import", "import"),
        ]
        for label, missing in cases:
            with self.subTest(label=label):
                if self.work.exists():
                    build_pdf_book.shutil.rmtree(self.work)
                if self.toolchain.exists():
                    build_pdf_book.shutil.rmtree(self.toolchain)
                self.write_theme_fixture()
                if missing == "theme.css":
                    (self.techbook / missing).unlink()
                elif missing == "import":
                    theme_css = self.techbook / "theme.css"
                    theme_css.write_text(
                        theme_css.read_text(encoding="utf-8").replace(
                            "@import url(../theme-base/theme-all.css);\n", ""
                        ),
                        encoding="utf-8",
                    )
                else:
                    (self.theme_base / missing).unlink()

                with self.assertRaises((FileNotFoundError, OSError)):
                    self.prepare()

    def test_config_uses_only_staged_file_themes_and_copies_theme_assets(self):
        self.write_theme_fixture()
        self.prepare()
        output = self.root / "output"
        source = self.sources / "book.md"
        source.write_text("# Book\n\nBody\n", encoding="utf-8")
        configs = []

        def write_dom_report(environment):
            manifest = json.loads(
                Path(environment["PDF_BOOK_INLINE_LAYOUT_MANIFEST"]).read_text()
            )
            Path(environment["PDF_BOOK_INLINE_LAYOUT_REPORT"]).write_text(
                json.dumps({
                    "document_id": manifest["document_id"],
                    "result": "dom_pass_post_pdf_pending",
                    "dom_audit": {"ready_state": "complete", "observed": []},
                }),
                encoding="utf-8",
            )

        def run(command, **kwargs):
            if command[0] == "/fixed/vfm":
                return build_pdf_book.subprocess.CompletedProcess(
                    command, 0, "<html><body><p>Body</p></body></html>", ""
                )
            if command[0] == "pdfinfo":
                return build_pdf_book.subprocess.CompletedProcess(
                    command, 0, "Pages: 1", ""
                )
            if Path(command[1]).name == "verify-inline-pdf.mjs":
                report = Path(command[command.index("--report") + 1])
                report.write_text('{"result":"pass"}', encoding="utf-8")
                return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")

            config_path = self.work / command[command.index("-c") + 1]
            config = json.loads(
                config_path.read_text(encoding="utf-8")
                .removeprefix("module.exports = ")
                .removesuffix(";\n")
            )
            configs.append(config)
            Path(command[command.index("-o") + 1]).write_bytes(b"fixture-pdf")
            write_dom_report(kwargs["env"])
            return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")

        with (
            patch.object(build_pdf_book, "OUT_DIR", output),
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(build_pdf_book, "WORK_DIR", self.work),
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", self.toolchain),
            patch.object(
                build_pdf_book, "rewrite_book_links", side_effect=lambda text, *_: text
            ),
            patch.object(build_pdf_book, "load_table_layout_overrides", return_value={}),
            patch.object(
                build_pdf_book, "derive_reviewed_table_css", return_value=("", [])
            ),
            patch.object(build_pdf_book.subprocess, "run", side_effect=run),
        ):
            problems = build_pdf_book.build_one(
                source, None, {"PDF_BOOK_VFM_BIN": "/fixed/vfm"}
            )

        self.assertEqual(problems, [])
        self.assertEqual(len(configs), 2)
        for config in configs:
            self.assertEqual(config["theme"][0], build_pdf_book.LOCAL_THEME_CSS)
            self.assertTrue((self.work / config["theme"][0]).is_file())
            self.assertTrue(all(theme.endswith(".css") for theme in config["theme"]))
            self.assertEqual(
                config["copyAsset"], {"includes": ["local-theme/**"]}
            )


if __name__ == "__main__":
    unittest.main()
