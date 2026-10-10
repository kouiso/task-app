#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import build_pdf_book


class ImageReferenceTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.sources = self.root / "material" / "30days-curriculum"
        self.sources.mkdir(parents=True)

    def source(self, text: str, name: str = "day14_日本語.md") -> Path:
        path = self.sources / name
        path.write_text(text, encoding="utf-8")
        return path

    def refs(self, source: Path, targets: list[str]) -> list[tuple[str, Path]]:
        with (
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(
                build_pdf_book,
                "_rendered_image_sources",
                return_value={source: targets},
            ),
        ):
            return build_pdf_book.local_image_references(source, "/fixed/vfm")

    def test_only_prose_images_are_inputs(self):
        image = self.sources / "screenshots" / "real.png"
        image.parent.mkdir()
        image.write_bytes(b"png")
        source = self.source(
            "\n".join([
                "![real](./screenshots/real.png)",
                "`![inline](./screenshots/inline.png)`",
                "<!-- ![comment](./screenshots/comment.png) -->",
                "```md",
                "![fenced](./screenshots/fenced.png)",
                "```",
                "~~~~md",
                "```md",
                "![nested](./screenshots/nested.png)",
                "```",
                "~~~~",
            ])
        )
        self.assertEqual(
            self.refs(source, ["./screenshots/real.png"]),
            [("./screenshots/real.png", image.resolve())],
        )

    def test_tilde_and_long_fence_image_examples_are_not_inputs(self):
        source = self.source(
            "~~~text\n![tilde](missing-a.png)\n~~~\n"
            "````text\n```md\n![nested](missing-b.png)\n```\n````\n"
        )
        self.assertEqual(self.refs(source, []), [])

    def test_html_comment_marker_inside_code_does_not_hide_later_prose(self):
        image = self.sources / "screenshots" / "after-code.png"
        image.parent.mkdir()
        image.write_bytes(b"png")
        source = self.source(
            "```text\n<!--\n```\n"
            "![after](./screenshots/after-code.png)\n"
            "-->\n"
        )
        self.assertEqual(
            self.refs(source, ["./screenshots/after-code.png"]),
            [("./screenshots/after-code.png", image.resolve())],
        )

    def test_inline_comment_marker_does_not_hide_later_prose_image(self):
        image = self.sources / "screenshots" / "after-inline.png"
        image.parent.mkdir()
        image.write_bytes(b"png")
        source = self.source(
            "`<!--`\n"
            "![after](./screenshots/after-inline.png)\n"
            "-->\n"
        )
        self.assertEqual(
            self.refs(source, ["./screenshots/after-inline.png"]),
            [("./screenshots/after-inline.png", image.resolve())],
        )

    def test_multiline_code_span_image_example_is_not_an_input(self):
        source = self.source(
            "`example\n"
            "![example](./screenshots/missing.png)\n"
            "end`\n"
        )
        self.assertEqual(self.refs(source, []), [])

    def test_encoded_path_query_and_fragment_resolve_to_file(self):
        image = self.sources / "screenshots" / "screen one.png"
        image.parent.mkdir()
        image.write_bytes(b"png")
        source = self.source("![screen](./screenshots/screen%20one.png?raw=1#preview)\n")
        self.assertEqual(
            self.refs(source, ["./screenshots/screen%20one.png?raw=1#preview"]),
            [("./screenshots/screen%20one.png?raw=1#preview", image.resolve())],
        )

    def test_multiline_alt_text_keeps_existing_inline_image_contract(self):
        image = self.sources / "screenshots" / "multiline.png"
        image.parent.mkdir()
        image.write_bytes(b"png")
        source = self.source("![first line\nsecond line](./screenshots/multiline.png)\n")
        self.assertEqual(
            self.refs(source, ["./screenshots/multiline.png"]),
            [("./screenshots/multiline.png", image.resolve())],
        )

    def test_remote_and_fragment_images_are_not_local_inputs(self):
        source = self.source(
            "![https](https://example.com/a.png)\n"
            "![protocol-relative](//cdn.example.com/a.png)\n"
            "![data](data:image/png;base64,AAAA)\n"
            "![fragment](#preview)\n"
        )
        self.assertEqual(
            self.refs(
                source,
                [
                    "https://example.com/a.png",
                    "//cdn.example.com/a.png",
                    "data:image/png;base64,AAAA",
                    "#preview",
                ],
            ),
            [],
        )

    def test_outside_path_names_owning_source(self):
        source = self.source("![outside](../../secret.png)\n")
        with self.assertRaisesRegex(ValueError, r"day14_日本語\.md: 教材外の画像参照: \.\./\.\./secret\.png"):
            self.refs(source, ["../../secret.png"])

    def test_symlink_outside_source_tree_is_rejected(self):
        outside = self.root / "secret.png"
        outside.write_bytes(b"secret")
        link = self.sources / "screenshots" / "link.png"
        link.parent.mkdir()
        link.symlink_to(outside)
        source = self.source("![link](./screenshots/link.png)\n")
        with self.assertRaisesRegex(ValueError, "教材外の画像参照"):
            self.refs(source, ["./screenshots/link.png"])

    def test_symlink_inside_source_tree_resolves_to_owned_file(self):
        image = self.sources / "screenshots" / "real.png"
        image.parent.mkdir()
        image.write_bytes(b"image")
        link = image.with_name("link.png")
        link.symlink_to(image)
        source = self.source("![link](./screenshots/link.png)\n")
        self.assertEqual(
            self.refs(source, ["./screenshots/link.png"]),
            [("./screenshots/link.png", image.resolve())],
        )

    def test_missing_image_names_owning_source(self):
        source = self.source("![missing](./screenshots/missing.png)\n")
        with (
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(
                build_pdf_book,
                "_rendered_image_sources",
                return_value={source: ["./screenshots/missing.png"]},
            ),
        ):
            with self.assertRaisesRegex(
                FileNotFoundError,
                r"day14_日本語\.md: 画像が見つからない: \./screenshots/missing\.png",
            ):
                build_pdf_book.validate_referenced_images([source], "/fixed/vfm")

    def test_release_snapshot_image_list_keeps_entire_screenshot_tree(self):
        referenced = self.sources / "screenshots" / "used.png"
        unreferenced = self.sources / "screenshots" / "unused.png"
        referenced.parent.mkdir()
        referenced.write_bytes(b"used")
        unreferenced.write_bytes(b"unused")
        source = self.source("![used](./screenshots/used.png)\n")
        with (
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(
                build_pdf_book,
                "_rendered_image_sources",
                return_value={source: ["./screenshots/used.png"]},
            ),
        ):
            self.assertEqual(
                build_pdf_book.referenced_images([source], "/fixed/vfm"),
                sorted([referenced.resolve(), unreferenced.resolve()]),
            )

    def test_subset_missing_image_stops_before_output_or_receipt_changes(self):
        source = self.source("# Book\n![missing](./screenshots/missing.png)\n")
        output = self.root / "dist/pdf/day14_日本語.pdf"
        output.parent.mkdir(parents=True)
        output.write_bytes(b"old-pdf")
        receipt = self.root / "dist/release-build-receipt.json"
        receipt.write_text("old-receipt", encoding="utf-8")
        prepare = unittest.mock.Mock()
        toolchain = unittest.mock.Mock(return_value={
            "vivliostyle_bin": "/fixed/vivliostyle",
            "vfm_bin": "/fixed/vfm",
            "mermaid_bin": "/fixed/mmdc",
            "theme_path": "/fixed/theme",
        })
        with (
            patch.object(build_pdf_book, "REPO_ROOT", self.root),
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(build_pdf_book, "OUT_DIR", output.parent),
            patch.object(build_pdf_book, "WORK_DIR", self.root / "dist/work"),
            patch.object(build_pdf_book, "RELEASE_RECEIPT", receipt),
            patch.object(build_pdf_book, "EXPECTED_RELEASE_BOOKS", 36),
            patch.object(build_pdf_book, "rewrite_book_links", side_effect=lambda text, *_: text),
            patch.object(build_pdf_book, "validate_override_document_catalog"),
            patch.object(build_pdf_book, "prepare_work_dir", prepare),
            patch.object(build_pdf_book, "prepare_release_toolchain", toolchain),
            patch.object(
                build_pdf_book,
                "validate_referenced_images",
                side_effect=FileNotFoundError(
                    "day14_日本語.md: 画像が見つからない: ./screenshots/missing.png"
                ),
            ),
            patch.dict(build_pdf_book.os.environ, {}, clear=True),
        ):
            result = build_pdf_book.main(["build_pdf_book.py", str(source)])
        self.assertEqual(result, 2)
        self.assertEqual(output.read_bytes(), b"old-pdf")
        self.assertEqual(receipt.read_text(), "old-receipt")
        prepare.assert_not_called()
        toolchain.assert_called_once()


class ActualVfmImageGrammarTest(unittest.TestCase):
    def test_actual_vfm_decides_image_grammar(self):
        vfm_bin = os.environ.get("PDF_BOOK_TEST_VFM_BIN")
        if not vfm_bin:
            self.skipTest("PDF_BOOK_TEST_VFM_BIN is not set")
        cases = {
            "escaped-backticks.md": (
                "\\`before ![visible](./screenshots/visible.png) after \\`\n",
                ["./screenshots/visible.png"],
            ),
            "escaped-image.md": ("\\![literal](./screenshots/literal.png)\n", []),
            "eof-comment.md": ("<!--\n![hidden](./screenshots/hidden.png)\n", []),
            "angle-space.md": (
                "![space](<./screenshots/screen one.png>)\n",
                ["./screenshots/screen%20one.png"],
            ),
            "balanced.md": (
                "![paren](./screenshots/screen(one).png)\n",
                ["./screenshots/screen(one).png"],
            ),
            "escaped-paren.md": (
                "![escaped](./screenshots/screen\\(one\\).png)\n",
                ["./screenshots/screen(one).png"],
            ),
            "indented.md": ("    ![code](./screenshots/code.png)\n", []),
            "list-fence.md": (
                "- ```md\n  ![code](./screenshots/code.png)\n  ```\n",
                [],
            ),
            "raw-html.md": (
                '<img src="./screenshots/raw.png" alt="raw">\n',
                ["./screenshots/raw.png"],
            ),
            "reference.md": (
                "![ref][shot]\n\n[shot]: ./screenshots/reference.png\n",
                ["./screenshots/reference.png"],
            ),
            "remote.md": (
                "![remote](https://example.com/a.png)\n"
                "![fragment](#preview)\n",
                ["https://example.com/a.png", "#preview"],
            ),
        }
        with tempfile.TemporaryDirectory() as directory:
            sources = []
            expected = {}
            for name, (markdown, image_sources) in cases.items():
                source = Path(directory) / name
                source.write_text(markdown, encoding="utf-8")
                sources.append(source)
                expected[source] = image_sources
            self.assertEqual(
                build_pdf_book._rendered_image_sources(sources, vfm_bin),
                expected,
            )


class MermaidSafetyTest(unittest.TestCase):
    def run_conversion(
        self,
        body,
        fake_run,
        *,
        stem="book",
        source_stem="",
        work=None,
    ):
        if work is None:
            directory = tempfile.TemporaryDirectory()
            self.addCleanup(directory.cleanup)
            work = Path(directory.name)
        with (
            patch.object(build_pdf_book.subprocess, "run", side_effect=fake_run),
            patch.object(build_pdf_book, "embed_font") as embed,
        ):
            result = build_pdf_book.convert_mermaid(
                body,
                stem,
                work,
                {},
                source_stem=source_stem,
            )
        return work, embed, result

    @staticmethod
    def diagnostic(work, stem="book", figure=1):
        return json.loads(
            (work / f"{stem}-{figure}.mermaid-diagnostic.json").read_text(
                encoding="utf-8"
            )
        )

    @staticmethod
    def successful_svg(command, **_kwargs):
        svg = Path(command[command.index("-o") + 1])
        svg.write_text('<svg xmlns="http://www.w3.org/2000/svg"></svg>', encoding="utf-8")
        return subprocess.CompletedProcess(command, 0, "", "")

    def test_closed_tilde_fence_uses_shared_scanner_and_renders(self):
        _, embed, (out, count, errors) = self.run_conversion(
            ["~~~mermaid", "flowchart LR", "  A --> B", "~~~~"],
            self.successful_svg,
        )
        self.assertEqual(count, 1)
        self.assertEqual(errors, [])
        self.assertTrue(any(line.startswith("![") for line in out))
        embed.assert_called_once()

    def test_long_fence_does_not_close_on_nested_short_fence(self):
        seen = {}
        def render(command, **kwargs):
            seen["source"] = Path(command[command.index("-i") + 1]).read_text()
            return self.successful_svg(command, **kwargs)
        body = ["````mermaid", "flowchart LR", "```", "A --> B", "```", "````"]
        _, _, (_, count, errors) = self.run_conversion(body, render)
        self.assertEqual(count, 1)
        self.assertEqual(errors, [])
        self.assertEqual(seen["source"], "flowchart LR\n```\nA --> B\n```\n")

    def test_unclosed_mermaid_is_preserved_and_reported(self):
        body = ["~~~mermaid", "flowchart LR", "  A --> B"]
        never = unittest.mock.Mock()
        _, embed, (out, count, errors) = self.run_conversion(body, never)
        self.assertEqual(out, body)
        self.assertEqual(count, 1)
        self.assertEqual(errors, ["図1 のmermaidフェンスが閉じていません"])
        never.assert_not_called()
        embed.assert_not_called()

    def test_nonzero_exit_with_partial_svg_preserves_original(self):
        def fail(command, **_kwargs):
            Path(command[command.index("-o") + 1]).write_text("<svg></svg>")
            return subprocess.CompletedProcess(command, 1, "", "render failed")
        body = ["```mermaid", "flowchart LR", "```"]
        work, embed, (out, count, errors) = self.run_conversion(
            body,
            fail,
            source_stem="day14_日本語",
        )
        self.assertEqual(out, body)
        self.assertEqual(count, 1)
        self.assertIn("render failed", errors[0])
        sidecar = work / "book-1.mermaid-diagnostic.json"
        self.assertIn(str(sidecar.resolve()), errors[0])
        diagnostic = self.diagnostic(work)
        self.assertEqual(
            set(diagnostic),
            {
                "argv",
                "failure_reason",
                "figure",
                "input_path",
                "input_sha256",
                "returncode",
                "source_stem",
                "stderr",
                "stdout",
                "timed_out",
                "work_stem",
            },
        )
        self.assertEqual(diagnostic["source_stem"], "day14_日本語")
        self.assertEqual(diagnostic["work_stem"], "book")
        self.assertEqual(diagnostic["figure"], 1)
        self.assertEqual(diagnostic["returncode"], 1)
        self.assertFalse(diagnostic["timed_out"])
        self.assertEqual(diagnostic["stdout"], "")
        self.assertEqual(diagnostic["stderr"], "render failed")
        source = work / "book-1.mmd"
        self.assertEqual(diagnostic["input_path"], str(source.resolve()))
        self.assertEqual(
            diagnostic["input_sha256"],
            hashlib.sha256(source.read_bytes()).hexdigest(),
        )
        self.assertEqual(diagnostic["argv"][:2], ["npx", "--yes"])
        self.assertIn(build_pdf_book.MERMAID_CLI, diagnostic["argv"])
        self.assertFalse((work / "book-1.svg").exists())
        self.assertFalse(sidecar.with_suffix(sidecar.suffix + ".tmp").exists())
        embed.assert_not_called()

    def test_long_diagnostics_are_full_in_sidecar_but_summary_uses_first_line(self):
        stdout = "complete stdout\nsecond stdout line"
        stderr = "FIRST diagnostic line\n" + ("x" * 1000) + "\nTAIL diagnostic"

        def fail(command, **_kwargs):
            return subprocess.CompletedProcess(command, 9, stdout, stderr)

        work, _, (_, _, errors) = self.run_conversion(
            ["```mermaid", "flowchart LR", "```"],
            fail,
            source_stem="day18_コメント",
        )
        diagnostic = self.diagnostic(work)
        self.assertEqual(diagnostic["stdout"], stdout)
        self.assertEqual(diagnostic["stderr"], stderr)
        self.assertIn("day18_コメント: 図1", errors[0])
        self.assertIn("FIRST diagnostic line", errors[0])
        self.assertNotIn("TAIL diagnostic", errors[0])
        self.assertIn(
            str((work / "book-1.mermaid-diagnostic.json").resolve()),
            errors[0],
        )

    def test_nonzero_exit_without_diagnostics_is_still_failure(self):
        def fail(command, **_kwargs):
            Path(command[command.index("-o") + 1]).write_text("<svg></svg>")
            return subprocess.CompletedProcess(command, 7, "", "")
        body = ["```mermaid", "flowchart LR", "```"]
        work, embed, (out, _, errors) = self.run_conversion(body, fail)
        self.assertEqual(out, body)
        self.assertIn("exit 7", errors[0])
        diagnostic = self.diagnostic(work)
        self.assertEqual(diagnostic["returncode"], 7)
        self.assertEqual(
            diagnostic["failure_reason"],
            "mermaid-cli がexit 7 で終了しました",
        )
        self.assertFalse((work / "book-1.svg").exists())
        embed.assert_not_called()

    def test_timeout_partial_svg_preserves_original(self):
        def timeout(command, **_kwargs):
            Path(command[command.index("-o") + 1]).write_text("<svg")
            raise subprocess.TimeoutExpired(
                command,
                60,
                output=b"partial stdout \xff",
                stderr=b"FIRST timeout diagnostic\ncomplete timeout stderr",
            )
        body = ["```mermaid", "flowchart LR", "```"]
        work, embed, (out, _, errors) = self.run_conversion(body, timeout)
        self.assertEqual(out, body)
        self.assertIn("秒を超えても描画が返りませんでした", errors[0])
        self.assertIn("FIRST timeout diagnostic", errors[0])
        diagnostic = self.diagnostic(work)
        self.assertIsNone(diagnostic["returncode"])
        self.assertTrue(diagnostic["timed_out"])
        self.assertEqual(diagnostic["stdout"], "partial stdout \ufffd")
        self.assertEqual(
            diagnostic["stderr"],
            "FIRST timeout diagnostic\ncomplete timeout stderr",
        )
        self.assertIn(
            "秒を超えても描画が返りませんでした",
            diagnostic["failure_reason"],
        )
        self.assertFalse((work / "book-1.svg").exists())
        embed.assert_not_called()

    def test_sidecar_write_failure_removes_partial_svg_and_keeps_input(self):
        def fail(command, **_kwargs):
            Path(command[command.index("-o") + 1]).write_text("<svg")
            return subprocess.CompletedProcess(command, 3, "partial stdout", "render failed")

        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        work = Path(directory.name)
        body = ["```mermaid", "flowchart LR", "```"]
        with patch.object(
            build_pdf_book,
            "_write_json_atomic",
            side_effect=OSError("diagnostic disk full"),
        ):
            with self.assertRaisesRegex(OSError, "diagnostic disk full"):
                self.run_conversion(body, fail, work=work)
        self.assertFalse((work / "book-1.svg").exists())
        self.assertEqual((work / "book-1.mmd").read_text(), "flowchart LR\n")
        self.assertFalse((work / "book-1.mermaid-diagnostic.json").exists())

    def test_success_removes_stale_diagnostic_and_writes_no_sidecar(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        work = Path(directory.name)
        sidecar = work / "book-1.mermaid-diagnostic.json"
        sidecar.write_text('{"stale": true}\n', encoding="utf-8")
        _, _, (_, count, errors) = self.run_conversion(
            ["```mermaid", "flowchart LR", "```"],
            self.successful_svg,
            work=work,
        )
        self.assertEqual(count, 1)
        self.assertEqual(errors, [])
        self.assertFalse(sidecar.exists())

    def test_two_books_figure_one_use_distinct_sidecars(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        work = Path(directory.name)

        def fail(command, **_kwargs):
            return subprocess.CompletedProcess(command, 2, "", "bad diagram")

        body = ["```mermaid", "flowchart LR", "```"]
        self.run_conversion(
            body,
            fail,
            stem="day01-aaaaaa",
            source_stem="day01_準備",
            work=work,
        )
        self.run_conversion(
            body,
            fail,
            stem="day02-bbbbbb",
            source_stem="day02_画面",
            work=work,
        )
        first = self.diagnostic(work, "day01-aaaaaa")
        second = self.diagnostic(work, "day02-bbbbbb")
        self.assertEqual(first["source_stem"], "day01_準備")
        self.assertEqual(second["source_stem"], "day02_画面")
        self.assertEqual(first["figure"], second["figure"])
        self.assertNotEqual(first["work_stem"], second["work_stem"])
        self.assertTrue((work / "day01-aaaaaa-1.mermaid-diagnostic.json").is_file())
        self.assertTrue((work / "day02-bbbbbb-1.mermaid-diagnostic.json").is_file())

    def test_zero_exit_invalid_svg_preserves_original(self):
        def invalid(command, **_kwargs):
            Path(command[command.index("-o") + 1]).write_text("not svg")
            return subprocess.CompletedProcess(command, 0, "", "")
        body = ["```mermaid", "flowchart LR", "```"]
        work, embed, (out, _, errors) = self.run_conversion(body, invalid)
        self.assertEqual(out, body)
        self.assertIn("SVGを解析できません", errors[0])
        self.assertFalse((work / "book-1.svg").exists())
        embed.assert_not_called()


if __name__ == "__main__":
    unittest.main()
