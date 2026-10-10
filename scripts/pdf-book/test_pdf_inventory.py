import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import check_pdf_book as target


class PdfInventoryTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.sources = self.root / "material" / "30days-curriculum"
        self.pdfs = self.root / "dist" / "pdf"
        self.ledger = self.root / "material" / "release-correspondence.json"
        self.sources.mkdir(parents=True)
        self.pdfs.mkdir(parents=True)
        self.source_names = [
            *(f"day{number:02}_lesson.md" for number in range(1, 31)),
            "00_index.md",
            "00-1_roadmap.md",
            "appendix_glossary.md",
            "appendix_reference.md",
            "appendix_next.md",
            "appendix_troubleshooting.md",
        ]
        for name in self.source_names:
            (self.sources / name).write_text(f"# {name}\n", encoding="utf-8")
        self.ledger.write_text(
            json.dumps(
                {
                    "combinations": [
                        {
                            "id": "pdf-set",
                            "subject": "dist/pdf/*.pdf 全36冊",
                            "corresponds_to": {
                                "sources": (
                                    "material/30days-curriculum/<同名>.md（stem一致）"
                                )
                            },
                        }
                    ]
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

    def run_checker(
        self,
        names: list[str],
        allow_gaps: bool = False,
        use_default_directory: bool = False,
    ) -> tuple[int, str]:
        for old in self.pdfs.glob("*.pdf"):
            old.unlink()
        for name in names:
            (self.pdfs / name).touch()
        args = ["check_pdf_book.py"]
        if allow_gaps:
            args.append("--allow-gaps")
        if not use_default_directory:
            args.append(str(self.pdfs))
        output = io.StringIO()
        with (
            patch.object(target, "REQUIRED_TOOLS", ()),
            patch.object(target, "SRC_DIR", self.sources),
            patch.object(target, "CORRESPONDENCE_LEDGER", self.ledger),
            patch.object(target, "DEFAULT_PDF_DIR", self.pdfs),
            patch.object(target, "check_one", return_value=[]),
            contextlib.redirect_stdout(output),
        ):
            result = target.main(args)
        return result, output.getvalue()

    def test_strict_mode_requires_the_exact_36_source_derived_names(self):
        expected = [Path(name).with_suffix(".pdf").name for name in self.source_names]
        result, output = self.run_checker(expected)
        self.assertEqual(result, 0, output)

        result, output = self.run_checker(["day01_lesson.pdf"])
        self.assertEqual(result, 1)
        self.assertIn("販売用PDFが不足", output)

        days_only = [f"day{number:02}_lesson.pdf" for number in range(1, 31)]
        result, output = self.run_checker(days_only)
        self.assertEqual(result, 1)
        self.assertIn("appendix_glossary.pdf", output)

    def test_allow_gaps_is_an_explicit_subset_only_exception(self):
        result, output = self.run_checker(["day01_lesson.pdf"], allow_gaps=True)
        self.assertEqual(result, 0, output)
        self.assertIn("subset", output)
        self.assertIn("全36冊の販売用inventoryは未確認", output)
        self.assertNotIn("商品として出せる状態", output)

        result, output = self.run_checker(
            ["day01_lesson.pdf"],
            allow_gaps=True,
            use_default_directory=True,
        )
        self.assertEqual(result, 0, output)

    def test_strict_mode_rejects_an_unexpected_pdf(self):
        expected = [Path(name).with_suffix(".pdf").name for name in self.source_names]
        result, output = self.run_checker([*expected, "extra.pdf"])
        self.assertEqual(result, 1)
        self.assertIn("想定外のPDF", output)


if __name__ == "__main__":
    unittest.main()
