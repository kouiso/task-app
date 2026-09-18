import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent))
import build_pdf_book


class BuildReceiptTest(unittest.TestCase):
    def test_failed_html_conversion_removes_old_pdf(self):
        source = self.sources / "book.md"
        source.write_text("# Example\n\nBody\n", encoding="utf-8")
        old_pdf = self.outputs / "book.pdf"
        self.outputs.mkdir(exist_ok=True)
        old_pdf.write_bytes(b"old-output")
        work = self.root / "work"
        work.mkdir()
        with (
            patch.object(build_pdf_book, "OUT_DIR", self.outputs),
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(build_pdf_book, "WORK_DIR", work),
            patch.object(build_pdf_book, "rewrite_book_links", side_effect=lambda text, *_: text),
            patch.object(build_pdf_book.subprocess, "run") as run,
        ):
            run.return_value.returncode = 1
            run.return_value.stdout = ""
            run.return_value.stderr = "conversion failed"
            problems = build_pdf_book.build_one(source, None, {})
        self.assertTrue(any("HTML変換に失敗" in problem for problem in problems), problems)
        self.assertFalse(old_pdf.exists())
        self.assertEqual(run.call_count, 1)

    def test_html_books_use_separate_theme_configs(self):
        work = self.root / "work"
        work.mkdir()
        configs = []

        def run(command, **kwargs):
            if command[0] == "pdfinfo":
                return build_pdf_book.subprocess.CompletedProcess(command, 0, "Pages: 1", "")
            if build_pdf_book.VFM_CLI in command:
                return build_pdf_book.subprocess.CompletedProcess(
                    command, 0, "<html><head></head><body><p>Fixture</p></body></html>", ""
                )
            self.assertIn("-c", command)
            self.assertNotIn("-T", command)
            self.assertEqual(kwargs["cwd"], work)
            config_path = work / command[command.index("-c") + 1]
            text = config_path.read_text(encoding="utf-8")
            config = json.loads(text.removeprefix("module.exports = ").removesuffix(";\n"))
            self.assertEqual(config["theme"][0], build_pdf_book.THEME)
            for stylesheet in config["theme"][1:]:
                self.assertTrue((work / stylesheet).is_file())
            self.assertTrue((work / config["entry"][0]["path"]).is_file())
            self.assertEqual(config["entry"][0]["title"], config["title"])
            output = Path(command[command.index("-o") + 1])
            self.assertTrue(output.is_absolute())
            output.write_bytes(b"fixture-pdf")
            configs.append(config)
            return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")

        (work / "book.css").write_text("body {}", encoding="utf-8")
        with (
            patch.object(build_pdf_book, "OUT_DIR", self.outputs),
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(build_pdf_book, "WORK_DIR", work),
            patch.object(build_pdf_book, "rewrite_book_links", side_effect=lambda text, *_: text),
            patch.object(build_pdf_book.subprocess, "run", side_effect=run),
        ):
            for name, title in [("first", '日本語 "引用"'), ("second", "別の冊子")]:
                source = self.sources / f"{name}.md"
                source.write_text(f"# {title}\n\n本文\n", encoding="utf-8")
                self.assertEqual(build_pdf_book.build_one(source, None, {}), [])
        self.assertEqual(len(configs), 2)
        self.assertNotEqual(configs[0]["workspaceDir"], configs[1]["workspaceDir"])
        self.assertNotEqual(configs[0]["title"], configs[1]["title"])

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.sources = self.root / "material"
        self.outputs = self.root / "pdf"
        self.receipt = self.root / "release-build-receipt.json"
        self.sources.mkdir()
        self.outputs.mkdir()
        for number in range(36):
            (self.sources / f"book-{number:02}.md").write_text(
                f"# Book {number}\n", encoding="utf-8"
            )

    def run_main(
        self, snapshot_side_effect, targets=None, failure=False, after_build=None
    ):
        built = []

        def build(source, _browser, _env, _mapping):
            if failure:
                return [f"{source.name}: failed"]
            (self.outputs / source.with_suffix(".pdf").name).write_bytes(
                b"%PDF-1.7\n" + source.name.encode()
            )
            built.append(source)
            if after_build:
                after_build(source, built)
            return []

        args = ["build_pdf_book.py", *(str(path) for path in (targets or []))]
        with (
            patch.object(build_pdf_book, "REPO_ROOT", self.root),
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(build_pdf_book, "OUT_DIR", self.outputs),
            patch.object(build_pdf_book, "RELEASE_RECEIPT", self.receipt),
            patch.object(build_pdf_book, "find_browser", return_value="/browser"),
            patch.object(
                build_pdf_book,
                "prepare_release_toolchain",
                return_value={
                    "root": str(self.root / "toolchain"),
                    "vivliostyle_bin": "/toolchain/vivliostyle",
                    "vfm_bin": "/toolchain/vfm",
                    "mermaid_bin": "/toolchain/mmdc",
                    "theme_path": "/toolchain/theme",
                },
            ),
            patch.object(build_pdf_book, "prepare_work_dir"),
            patch.object(build_pdf_book, "rewrite_book_links", side_effect=lambda text, *_: text),
            patch.object(
                build_pdf_book,
                "release_input_snapshot",
                side_effect=snapshot_side_effect,
            ),
            patch.object(build_pdf_book, "build_one", side_effect=build),
        ):
            return build_pdf_book.main(args)

    def test_successful_full_build_mints_receipt_for_exact_outputs(self):
        snapshot = {
            "source_count": 36,
            "source_pdf_names": [f"book-{number:02}.pdf" for number in range(36)],
            "aggregate_sha256": "a" * 64,
        }
        self.assertEqual(self.run_main([snapshot, snapshot]), 0)

        data = json.loads(self.receipt.read_text(encoding="utf-8"))
        self.assertEqual(data["scope"], "full-36-book-build")
        self.assertEqual(len(data["outputs"]), 36)
        self.assertTrue(all(item["size"] > 0 for item in data["outputs"]))

    def test_input_hash_covers_image_font_tools_link_map_and_browser(self):
        source = self.sources / "book-00.md"
        image = self.sources / "screenshots" / "screen.png"
        image.parent.mkdir()
        image.write_bytes(b"image-v1")
        source.write_text("# Book\n![screen](./screenshots/screen.png)\n", encoding="utf-8")
        css = self.root / "book.css"
        css.write_text("body {}", encoding="utf-8")
        lock = self.root / "package-lock.json"
        lock.write_text("{}", encoding="utf-8")
        markdown_scan = self.root / "scripts" / "curriculum-qa" / "markdown_scan.py"
        markdown_scan.parent.mkdir(parents=True)
        markdown_scan.write_text("# helper", encoding="utf-8")
        font = self.root / "node_modules" / "font-package" / "font.ttf"
        font.parent.mkdir(parents=True)
        font.write_bytes(b"font")
        link_map = self.root / "links.json"
        link_map.write_text("{}", encoding="utf-8")
        browser = self.root / "browser"
        browser.write_bytes(b"browser")

        toolchain = self.root / "toolchain"
        for identifier in (
            build_pdf_book.VIVLIOSTYLE_CLI,
            build_pdf_book.VFM_CLI,
            build_pdf_book.THEME,
            build_pdf_book.MERMAID_CLI,
        ):
            package = toolchain / "node_modules" / identifier.rsplit("@", 1)[0]
            package.mkdir(parents=True, exist_ok=True)
            (package / "package.json").write_text(identifier, encoding="utf-8")
        resolved = {
            "root": str(toolchain),
            "vivliostyle_bin": str(toolchain / "node_modules/.bin/vivliostyle"),
            "vfm_bin": str(toolchain / "node_modules/.bin/vfm"),
            "mermaid_bin": str(toolchain / "node_modules/.bin/mmdc"),
            "theme_path": str(toolchain / "node_modules/@vivliostyle/theme-techbook"),
        }

        with (
            patch.object(build_pdf_book, "REPO_ROOT", self.root),
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(build_pdf_book, "BOOK_CSS", css),
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", toolchain),
            patch.object(
                build_pdf_book,
                "FONT_SOURCES",
                (("font-package", "font.ttf", "Font", 400, "truetype"),),
            ),
        ):
            first = build_pdf_book.release_input_snapshot(
                [source], str(link_map), str(browser), resolved
            )
            image.write_bytes(b"image-v2")
            second = build_pdf_book.release_input_snapshot(
                [source], str(link_map), str(browser), resolved
            )
            theme_file = toolchain / "node_modules/@vivliostyle/theme-techbook/package.json"
            theme_file.write_text("changed-theme-bytes", encoding="utf-8")
            third = build_pdf_book.release_input_snapshot(
                [source], str(link_map), str(browser), resolved
            )
            implicit = build_pdf_book.release_input_snapshot(
                [source], str(link_map), str(browser)
            )

        labels = {item["file"] for item in first["files"]}
        self.assertIn("material/screenshots/screen.png", labels)
        self.assertIn("node_modules/font-package/font.ttf", labels)
        self.assertIn("links.json", labels)
        self.assertEqual(len(first["tools"]), 4)
        self.assertTrue(all(item.get("resolved", {}).get("sha256") for item in first["tools"]))
        self.assertIsNotNone(first["resolved_toolchain"])
        self.assertIsNotNone(first["browser"]["sha256"])
        self.assertNotEqual(first["aggregate_sha256"], second["aggregate_sha256"])

        self.assertNotEqual(second["aggregate_sha256"], third["aggregate_sha256"])
        self.assertEqual(third["aggregate_sha256"], implicit["aggregate_sha256"])

    def test_build_uses_the_resolved_toolchain_paths(self):
        source = self.sources / "resolved.md"
        source.write_text("# Resolved\n\nBody\n", encoding="utf-8")
        work = self.root / "resolved-work"
        work.mkdir()
        (work / "book.css").write_text("body {}", encoding="utf-8")
        env = {
            "PDF_BOOK_VFM_BIN": "/resolved/bin/vfm",
            "PDF_BOOK_VIVLIOSTYLE_BIN": "/resolved/bin/vivliostyle",
            "PDF_BOOK_THEME_PATH": "/resolved/theme-techbook",
        }

        def run(command, **_kwargs):
            if command[0] == "/resolved/bin/vfm":
                return build_pdf_book.subprocess.CompletedProcess(
                    command, 0, "<html><head></head><body><p>Fixture</p></body></html>", ""
                )
            if command[0] == "/resolved/bin/vivliostyle":
                config_path = work / command[command.index("-c") + 1]
                config = json.loads(
                    config_path.read_text(encoding="utf-8")
                    .removeprefix("module.exports = ")
                    .removesuffix(";\n")
                )
                self.assertEqual(config["theme"][0], "/resolved/theme-techbook")
                Path(command[command.index("-o") + 1]).write_bytes(b"fixture-pdf")
                return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")
            return build_pdf_book.subprocess.CompletedProcess(command, 0, "Pages: 1", "")

        with (
            patch.object(build_pdf_book, "OUT_DIR", self.outputs),
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(build_pdf_book, "WORK_DIR", work),
            patch.object(build_pdf_book, "rewrite_book_links", side_effect=lambda text, *_: text),
            patch.object(build_pdf_book.subprocess, "run", side_effect=run),
        ):
            self.assertEqual(build_pdf_book.build_one(source, None, env), [])

    def test_prepare_release_toolchain_validates_exact_resolved_packages(self):
        destination = self.root / "resolved-toolchain"
        commands = []

        def install(command, **kwargs):
            commands.append(command)
            staging = Path(kwargs["cwd"])
            modules = staging / "node_modules"
            for identifier in (
                build_pdf_book.VIVLIOSTYLE_CLI,
                build_pdf_book.VFM_CLI,
                build_pdf_book.THEME,
                build_pdf_book.MERMAID_CLI,
            ):
                name, version = identifier.rsplit("@", 1)
                package = modules / name
                package.mkdir(parents=True, exist_ok=True)
                (package / "package.json").write_text(
                    json.dumps({"name": name, "version": version}), encoding="utf-8"
                )
            bins = modules / ".bin"
            bins.mkdir(parents=True)
            bin_targets = {
                "vivliostyle": (modules / "@vivliostyle/cli/dist/cli.js",
                                 "../@vivliostyle/cli/dist/cli.js"),
                "vfm": (modules / "@vivliostyle/vfm/lib/cli.js",
                        "../@vivliostyle/vfm/lib/cli.js"),
                "mmdc": (modules / "@mermaid-js/mermaid-cli/src/cli.js",
                         "../@mermaid-js/mermaid-cli/src/cli.js"),
            }
            for name, (target, relative_target) in bin_targets.items():
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text("fixture", encoding="utf-8")
                (bins / name).symlink_to(relative_target)
            (staging / "package-lock.json").write_text("{}", encoding="utf-8")
            return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")

        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book.subprocess, "run", side_effect=install),
        ):
            resolved = build_pdf_book.prepare_release_toolchain({})

        self.assertEqual(commands[0][:2], ["npm", "install"])
        self.assertEqual(resolved["root"], str(destination))
        self.assertTrue(Path(resolved["vivliostyle_bin"]).is_file())
        self.assertTrue(Path(resolved["theme_path"]).is_dir())

    def test_toolchain_tree_rejects_symlink_outside_its_root(self):
        toolchain = self.root / "toolchain-boundary"
        toolchain.mkdir()
        outside = self.root / "outside-cli.js"
        outside.write_text("version one", encoding="utf-8")
        (toolchain / "cli").symlink_to(outside)

        with self.assertRaisesRegex(OSError, "toolchain外"):
            build_pdf_book._hash_tree_stably(toolchain)

    def test_input_change_during_full_build_prevents_receipt(self):
        before = {"aggregate_sha256": "a" * 64}
        after = {"aggregate_sha256": "b" * 64}
        self.assertEqual(self.run_main([before, after]), 1)
        self.assertFalse(self.receipt.exists())

    def test_failed_full_build_does_not_leave_old_receipt(self):
        self.receipt.write_text("old", encoding="utf-8")
        self.assertEqual(self.run_main([{"aggregate_sha256": "a" * 64}], failure=True), 1)
        self.assertFalse(self.receipt.exists())

    def test_partial_build_invalidates_full_receipt_and_cannot_replace_it(self):
        self.receipt.write_text("old", encoding="utf-8")
        target = self.sources / "book-00.md"
        self.assertEqual(self.run_main([], targets=[target]), 0)
        self.assertFalse(self.receipt.exists())

    def test_symlink_aliases_cannot_turn_stale_expected_pdfs_into_full_receipt(self):
        aliases = self.root / "aliases"
        aliases.mkdir()
        targets = []
        for number, source in enumerate(sorted(self.sources.glob("*.md"))):
            alias = aliases / f"alias-{number:02}.md"
            alias.symlink_to(source)
            targets.append(alias)
            (self.outputs / source.with_suffix(".pdf").name).write_bytes(b"old")

        self.assertEqual(self.run_main([], targets=targets), 0)
        self.assertFalse(self.receipt.exists())

    def test_pdf_changed_after_its_build_prevents_receipt(self):
        first_output = self.outputs / "book-00.pdf"

        def replace_first(_source, built):
            if len(built) == 2:
                first_output.write_bytes(b"replaced-after-build")

        snapshot = {"aggregate_sha256": "a" * 64}
        self.assertEqual(self.run_main([snapshot, snapshot], after_build=replace_first), 1)
        self.assertFalse(self.receipt.exists())


if __name__ == "__main__":
    unittest.main()
