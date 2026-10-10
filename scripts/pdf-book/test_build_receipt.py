import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

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
            if "--dom-report" in command:
                Path(command[command.index("--report") + 1]).write_text('{"result":"pass"}')
                return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")
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
            self.assertEqual(config["theme"][0], build_pdf_book.LOCAL_THEME_CSS)
            self.assertEqual(config["copyAsset"], {"includes": ["local-theme/**"]})
            for stylesheet in config["theme"][1:]:
                self.assertTrue((work / stylesheet).is_file())
            self.assertTrue((work / config["entry"][0]["path"]).is_file())
            self.assertEqual(config["entry"][0]["title"], config["title"])
            output = Path(command[command.index("-o") + 1])
            self.assertTrue(output.is_absolute())
            output.write_bytes(b"fixture-pdf")
            self.write_empty_dom_report(kwargs["env"])
            configs.append(config)
            return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")

        (work / "book.css").write_text("body {}", encoding="utf-8")
        with (
            patch.object(build_pdf_book, "OUT_DIR", self.outputs),
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(build_pdf_book, "WORK_DIR", work),
            patch.object(build_pdf_book, "rewrite_book_links", side_effect=lambda text, *_: text),
            patch.object(
                build_pdf_book,
                "annotate_pres",
                wraps=build_pdf_book.annotate_pres,
            ) as annotate_pres,
            patch.object(build_pdf_book.subprocess, "run", side_effect=run),
        ):
            for name, title in [("first", '日本語 "引用"'), ("second", "別の冊子")]:
                source = self.sources / f"{name}.md"
                source.write_text(f"# {title}\n\n本文\n", encoding="utf-8")
                self.assertEqual(build_pdf_book.build_one(source, None, {}), [])
        self.assertEqual(annotate_pres.call_count, 2)
        self.assertEqual(len(configs), 4)
        self.assertEqual(configs[0], configs[1])
        self.assertEqual(configs[2], configs[3])
        self.assertNotEqual(configs[0]["workspaceDir"], configs[2]["workspaceDir"])
        self.assertNotEqual(configs[0]["title"], configs[2]["title"])

    def write_empty_dom_report(self, env):
        manifest = json.loads(Path(env["PDF_BOOK_INLINE_LAYOUT_MANIFEST"]).read_text())
        self.assertEqual(manifest["entries"], [])
        Path(env["PDF_BOOK_INLINE_LAYOUT_REPORT"]).write_text(json.dumps({
            "document_id": manifest["document_id"],
            "result": "dom_pass_post_pdf_pending",
            "dom_audit": {"ready_state": "complete", "observed": []},
        }))

    def test_inline_gate_failures_never_leave_a_successful_pdf(self):
        derive_tables = build_pdf_book.derive_table_css
        load_overrides = build_pdf_book.load_table_layout_overrides
        for failure in [
            "measurement_missing", "measurement_setup",
            "measurement_noisy_stderr", "measurement_timeout",
            "measurement_oserror", "table_unresolved", "invalid_override",
            "final_dom", "pdf_fail", "pdf_missing",
        ]:
            with self.subTest(failure=failure):
                work = self.root / failure
                work.mkdir()
                source = self.sources / f"{failure}.md"
                source.write_text("# Fixture\n\nBody\n")
                calls = []
                noisy_stderr = (
                    "human-message-must-not-retain-this-prefix:"
                    + "x" * 2500
                    + ":retained-stderr-tail"
                )

                def table_candidate(manifest, report):
                    if failure == "table_unresolved":
                        return "", [], [{"table_id": "fixture-table", "reason": "width_exceeded"}]
                    return derive_tables(manifest, report)

                def reviewed_config(path):
                    if failure == "invalid_override":
                        raise ValueError("reviewed table override is stale")
                    return load_overrides(path)

                def run(command, **kwargs):
                    calls.append(command)
                    if build_pdf_book.VFM_CLI in command:
                        return build_pdf_book.subprocess.CompletedProcess(
                            command, 0, "<html><body><p>Body</p></body></html>", ""
                        )
                    if "--dom-report" in command:
                        if failure != "pdf_missing":
                            Path(command[command.index("--report") + 1]).write_text('{"result":"fail"}')
                        return build_pdf_book.subprocess.CompletedProcess(command, 1, "", "rejected")
                    self.assertIn("-o", command)
                    measure = kwargs["env"]["PDF_BOOK_INLINE_LAYOUT_REPORT"].endswith(".inline-measurement.json")
                    if failure == "measurement_timeout" and measure:
                        raise build_pdf_book.subprocess.TimeoutExpired(
                            command, build_pdf_book.BUILD_TIMEOUT,
                            output="partial measurement stdout",
                            stderr="original timeout stderr",
                        )
                    if failure == "measurement_oserror" and measure:
                        raise OSError("measurement executable unavailable")
                    Path(command[command.index("-o") + 1]).write_bytes(b"unverified-pdf")
                    if failure == "measurement_missing" and measure:
                        return build_pdf_book.subprocess.CompletedProcess(command, 1, "", "no report")
                    if failure in [
                        "measurement_setup", "measurement_noisy_stderr",
                    ] and measure:
                        Path(kwargs["env"]["PDF_BOOK_INLINE_LAYOUT_REPORT"]).write_text(json.dumps({
                            "result": "setup_or_hook_fail", "error": "margin glyph map hash不一致: fixture-hash",
                        }))
                    else:
                        self.write_empty_dom_report(kwargs["env"])
                    return build_pdf_book.subprocess.CompletedProcess(
                        command, 1 if failure == "final_dom" and not measure else 0,
                        "measurement stdout" if measure else "",
                        (
                            noisy_stderr
                            if failure == "measurement_noisy_stderr" and measure
                            else "original measurement stderr" if measure else ""
                        ),
                    )

                with (
                    patch.object(build_pdf_book, "OUT_DIR", self.outputs),
                    patch.object(build_pdf_book, "WORK_DIR", work),
                    patch.object(build_pdf_book, "rewrite_book_links", side_effect=lambda text, *_: text),
                    patch.object(build_pdf_book, "derive_table_css", side_effect=table_candidate),
                    patch.object(build_pdf_book, "load_table_layout_overrides", side_effect=reviewed_config),
                    patch.object(build_pdf_book.subprocess, "run", side_effect=run),
                ):
                    problems = build_pdf_book.build_one(source, None, {})
                    self.assertTrue(problems)
                    if failure == "measurement_setup":
                        self.assertTrue(any("margin glyph map hash不一致: fixture-hash" in item for item in problems), problems)
                        self.assertTrue(any("計測CLI returncode=0" in item for item in problems), problems)
                        self.assertTrue(any("original measurement stderr" in item for item in problems), problems)
                        self.assertFalse(any("別の冊子" in item for item in problems), problems)
                        self.assertEqual(len(calls), 2)
                    if failure in [
                        "measurement_setup", "measurement_noisy_stderr",
                        "measurement_timeout", "measurement_oserror",
                    ]:
                        self.assertEqual(len(calls), 2)
                        cli_receipt = json.loads(
                            next(work.glob("*.inline-measurement-cli.json")).read_text()
                        )
                        self.assertEqual(cli_receipt["schema"], 1)
                        self.assertEqual(
                            cli_receipt["kind"],
                            "PDF_BOOK_INLINE_MEASUREMENT_CLI_DIAGNOSTIC",
                        )
                        self.assertEqual(cli_receipt["argv"], calls[-1])
                        self.assertEqual(cli_receipt["cwd"], str(work))
                        self.assertEqual(set(cli_receipt["environment"]), {
                            "PDF_BOOK_TOOLCHAIN_DIR",
                            "PDF_BOOK_INLINE_LAYOUT_MANIFEST",
                            "PDF_BOOK_INLINE_LAYOUT_REPORT",
                            "PDF_BOOK_MARGIN_OUTLINE_GLYPHS",
                            "PDF_BOOK_MARGIN_OUTLINE_FONT",
                            "PDF_BOOK_MARGIN_OUTLINE_SOURCE",
                        })
                        self.assertTrue(all(
                            isinstance(value, str)
                            for value in cli_receipt["environment"].values()
                        ))
                        self.assertEqual(
                            cli_receipt["environment"][
                                "PDF_BOOK_MARGIN_OUTLINE_SOURCE"
                            ],
                            str(source.resolve()),
                        )
                        sidecar = next(work.glob("*.inline-measurement-cli.json"))
                        self.assertTrue(any(
                            str(sidecar) in item for item in problems
                        ), problems)
                    if failure == "measurement_setup":
                        self.assertEqual(cli_receipt["result"], "completed")
                        self.assertEqual(cli_receipt["returncode"], 0)
                        self.assertEqual(cli_receipt["stdout"], "measurement stdout")
                        self.assertEqual(cli_receipt["stderr"], "original measurement stderr")
                    if failure == "measurement_noisy_stderr":
                        self.assertEqual(cli_receipt["result"], "completed")
                        self.assertEqual(cli_receipt["returncode"], 0)
                        self.assertEqual(cli_receipt["stderr"], noisy_stderr)
                        self.assertTrue(any(
                            noisy_stderr[-2048:] in item for item in problems
                        ), problems)
                        self.assertFalse(any(
                            "human-message-must-not-retain-this-prefix" in item
                            for item in problems
                        ), problems)
                    if failure == "measurement_timeout":
                        self.assertEqual(cli_receipt["result"], "timeout")
                        self.assertIsNone(cli_receipt["returncode"])
                        self.assertEqual(cli_receipt["stdout"], "partial measurement stdout")
                        self.assertEqual(cli_receipt["stderr"], "original timeout stderr")
                        self.assertTrue(any("returncode=timeout" in item for item in problems), problems)
                    if failure == "measurement_oserror":
                        self.assertEqual(cli_receipt["result"], "launch_error")
                        self.assertEqual(cli_receipt["error_type"], "OSError")
                        self.assertEqual(cli_receipt["error"], "measurement executable unavailable")
                        self.assertTrue(any("returncode=not_started" in item for item in problems), problems)
                self.assertFalse((self.outputs / f"{failure}.pdf").exists())
                self.assertFalse(list(work.glob("*.inline-measurement.pdf")))
                if failure in ["measurement_missing", "table_unresolved", "invalid_override", "final_dom"]:
                    self.assertFalse(any("--dom-report" in call for call in calls))
                if failure == "invalid_override":
                    self.assertEqual(len(calls), 2)
                if failure == "table_unresolved":
                    self.assertEqual(len(calls), 2)
                    receipt = json.loads(next(work.glob("*.table-adjustment.json")).read_text())
                    self.assertEqual(receipt["unresolved"][0]["reason"], "width_exceeded")

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

    def make_release_toolchain(self, root, *, with_provenance=True):
        identifiers = (
            build_pdf_book.VIVLIOSTYLE_CLI,
            build_pdf_book.VFM_CLI,
            build_pdf_book.THEME,
            build_pdf_book.MERMAID_CLI,
        )
        dependencies = {}
        modules = root / "node_modules"
        for identifier in identifiers:
            name, version = identifier.rsplit("@", 1)
            dependencies[name] = version
            package = modules / name
            package.mkdir(parents=True, exist_ok=True)
            (package / "package.json").write_text(
                json.dumps({"name": name, "version": version}), encoding="utf-8"
            )
        (root / "package.json").write_text(
            json.dumps({"private": True, "dependencies": dependencies}), encoding="utf-8"
        )
        (root / "package-lock.json").write_text(
            json.dumps({
                "lockfileVersion": 3,
                "packages": {"": {"dependencies": dependencies}},
            }),
            encoding="utf-8",
        )
        bins = modules / ".bin"
        bins.mkdir()
        bin_targets = {
            "vivliostyle": (
                modules / "@vivliostyle/cli/dist/cli.js",
                "../@vivliostyle/cli/dist/cli.js",
            ),
            "vfm": (
                modules / "@vivliostyle/vfm/lib/cli.js",
                "../@vivliostyle/vfm/lib/cli.js",
            ),
            "mmdc": (
                modules / "@mermaid-js/mermaid-cli/src/cli.js",
                "../@mermaid-js/mermaid-cli/src/cli.js",
            ),
        }
        for name, (target, relative_target) in bin_targets.items():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("export const dispatchCli = () => {};", encoding="utf-8")
            target.chmod(0o755)
            (bins / name).symlink_to(relative_target)
        runtime = {
            "node_version": "22.22.2", "node_exec_path": "/runtime/node",
            "node_exec_sha256": "a" * 64, "npm_version": "10.9.7",
            "npm_exec_path": "/runtime/npm", "npm_exec_sha256": "b" * 64,
        }
        probe_relative = "node_modules/@vivliostyle/cli/dist/cli.js"
        payload = build_pdf_book._toolchain_payload_fingerprint(root)
        provenance = {
            **runtime,
            "probe_module": probe_relative,
            "probe_module_sha256": hashlib.sha256(
                (root / probe_relative).read_bytes()
            ).hexdigest(),
            "probe_export": "dispatchCli",
            "probe_node_exec_path": runtime["node_exec_path"],
            **{
                f"toolchain_payload_{key}": value
                for key, value in payload.items()
            },
        }
        if with_provenance:
            (root / build_pdf_book.TOOLCHAIN_RUNTIME).write_text(
                json.dumps(provenance, sort_keys=True) + "\n", encoding="utf-8"
            )
        return runtime

    def run_main(
        self, snapshot_side_effect, targets=None, failure=False, after_build=None,
        override_config=None,
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
            patch.object(build_pdf_book, "validate_referenced_images"),
            patch.object(
                build_pdf_book,
                "load_table_layout_overrides",
                return_value=(
                    {"schema_version": 1, "overrides": []}
                    if override_config is None
                    else override_config
                ),
            ),
            patch.object(
                build_pdf_book,
                "release_input_snapshot",
                side_effect=snapshot_side_effect,
            ),
            patch.object(build_pdf_book, "build_one", side_effect=build),
        ):
            return build_pdf_book.main(args)

    @staticmethod
    def override_for(document_id):
        return {
            "schema_version": 1,
            "overrides": [{
                "document_id": document_id,
                "source_sha256": "a" * 64,
                "table_source_order": 0,
                "table_id": "table-0",
                "table_sha256": "b" * 64,
                "column_percentages": [40, 60],
                "evidence_pdf_sha256": "c" * 64,
                "review": "Reviewed fixture.",
            }],
        }

    def test_override_catalog_rejects_unknown_id_but_allows_other_book_in_subset(self):
        unknown = self.override_for("missing-book")
        self.assertEqual(self.run_main([], override_config=unknown), 2)
        self.assertFalse(list(self.outputs.glob("*.pdf")))

        target = self.sources / "book-00.md"
        other_book = self.override_for(build_pdf_book.work_slug("book-01"))
        self.assertEqual(
            self.run_main([], targets=[target], override_config=other_book), 0
        )

    def test_symlink_overwrite_invalidates_existing_receipt_without_minting_one(self):
        self.receipt.write_text("old", encoding="utf-8")
        alias_dir = self.root / "aliases"
        alias_dir.mkdir()
        alias = alias_dir / "book-00.md"
        alias.symlink_to(self.sources / "book-00.md")
        output = self.outputs / "book-00.pdf"
        output.write_bytes(b"old-output")
        self.assertEqual(self.run_main([], targets=[alias]), 0)
        self.assertNotEqual(output.read_bytes(), b"old-output")
        self.assertFalse(self.receipt.exists())

    def test_dotdot_overwrite_invalidates_existing_receipt_without_minting_one(self):
        self.receipt.write_text("old", encoding="utf-8")
        alias = self.sources / ".." / self.sources.name / "book-00.md"
        output = self.outputs / "book-00.pdf"
        output.write_bytes(b"old-output")
        self.assertEqual(self.run_main([], targets=[alias]), 0)
        self.assertNotEqual(output.read_bytes(), b"old-output")
        self.assertFalse(self.receipt.exists())

    def test_unrelated_same_basename_overwrite_invalidates_existing_receipt(self):
        self.receipt.write_text("old", encoding="utf-8")
        alias_dir = self.root / "different-content"
        alias_dir.mkdir()
        source = alias_dir / "book-00.md"
        source.write_text("# Unrelated source\n", encoding="utf-8")
        output = self.outputs / "book-00.pdf"
        output.write_bytes(b"old-output")
        self.assertEqual(self.run_main([], targets=[source]), 0)
        self.assertNotEqual(output.read_bytes(), b"old-output")
        self.assertFalse(self.receipt.exists())

    def test_case_only_output_collision_conservatively_invalidates_receipt(self):
        self.receipt.write_text("old", encoding="utf-8")
        source = self.root / "BOOK-00.md"
        source.write_text("# Different source\n", encoding="utf-8")
        self.assertEqual(self.run_main([], targets=[source]), 0)
        self.assertFalse(self.receipt.exists())

    def test_unicode_equivalent_output_collision_conservatively_invalidates_receipt(self):
        (self.sources / "book-00.md").rename(self.sources / "book-é.md")
        self.receipt.write_text("old", encoding="utf-8")
        source = self.root / "book-e\u0301.md"
        source.write_text("# Different source\n", encoding="utf-8")
        self.assertEqual(self.run_main([], targets=[source]), 0)
        self.assertFalse(self.receipt.exists())

    def test_new_noncanonical_output_invalidates_exact_inventory_receipt(self):
        self.receipt.write_text("old", encoding="utf-8")
        source = self.root / "independent.md"
        source.write_text("# Additional PDF\n", encoding="utf-8")
        self.assertEqual(self.run_main([], targets=[source]), 0)
        self.assertTrue((self.outputs / "independent.pdf").is_file())
        self.assertFalse(self.receipt.exists())

    def test_retired_source_output_invalidates_existing_receipt(self):
        (self.sources / "book-00.md").unlink()
        self.receipt.write_text("old", encoding="utf-8")
        source = self.root / "book-00.md"
        source.write_text("# Retired output overwritten\n", encoding="utf-8")
        self.assertEqual(self.run_main([], targets=[source]), 0)
        self.assertTrue((self.outputs / "book-00.pdf").is_file())
        self.assertFalse(self.receipt.exists())

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
            patch.object(build_pdf_book, "referenced_images", return_value=[image]),
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

    def test_input_hash_covers_breakable_code(self):
        source = self.sources / "book-00.md"
        css = self.root / "book.css"
        css.write_text("body {}", encoding="utf-8")
        (self.root / "package-lock.json").write_text("{}", encoding="utf-8")
        markdown_scan = self.root / "scripts" / "curriculum-qa" / "markdown_scan.py"
        markdown_scan.parent.mkdir(parents=True)
        markdown_scan.write_text("# helper", encoding="utf-8")
        breakable = self.root / "scripts" / "pdf-book" / "breakable_code.py"
        breakable.parent.mkdir(parents=True)
        breakable.write_text("BREAKABLE_MIN_LINES = 18\n", encoding="utf-8")
        measurement = self.root / "scripts" / "pdf-book" / "measure-breakable-code.mjs"
        measurement.write_text("// measured-v1\n", encoding="utf-8")
        keep_next = self.root / "scripts" / "pdf-book" / "keep_next.py"
        keep_next.write_text("KEEP_NEXT_CLASS = 'pdf-keep-next-v1'\n", encoding="utf-8")
        toolchain_root = self.root / "toolchain"
        for identifier in (
            build_pdf_book.VIVLIOSTYLE_CLI,
            build_pdf_book.VFM_CLI,
            build_pdf_book.THEME,
            build_pdf_book.MERMAID_CLI,
        ):
            package = toolchain_root / "node_modules" / identifier.rsplit("@", 1)[0]
            package.mkdir(parents=True, exist_ok=True)
            (package / "package.json").write_text(identifier, encoding="utf-8")
        toolchain = {
            "root": str(toolchain_root),
            "vfm_bin": str(toolchain_root / "node_modules/.bin/vfm"),
        }

        with (
            patch.object(build_pdf_book, "REPO_ROOT", self.root),
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(build_pdf_book, "BOOK_CSS", css),
            patch.object(build_pdf_book, "BREAKABLE_CODE", breakable),
            patch.object(build_pdf_book, "MEASURE_BREAKABLE_CODE", measurement),
            patch.object(build_pdf_book, "KEEP_NEXT_HELPER", keep_next),
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", self.root / "no-toolchain"),
            patch.object(build_pdf_book, "FONT_SOURCES", ()),
            patch.object(build_pdf_book, "referenced_images", return_value=[]),
        ):
            first = build_pdf_book.release_input_snapshot(
                [source], None, None, toolchain
            )
            breakable.write_text("BREAKABLE_MIN_LINES = 19\n", encoding="utf-8")
            second = build_pdf_book.release_input_snapshot(
                [source], None, None, toolchain
            )
            measurement.write_text("// measured-v2\n", encoding="utf-8")
            third = build_pdf_book.release_input_snapshot(
                [source], None, None, toolchain
            )
            keep_next.write_text("KEEP_NEXT_CLASS = 'pdf-keep-next-v2'\n", encoding="utf-8")
            fourth = build_pdf_book.release_input_snapshot(
                [source], None, None, toolchain
            )

        labels = {item["file"] for item in first["files"]}
        self.assertIn("scripts/pdf-book/breakable_code.py", labels)
        self.assertIn("scripts/pdf-book/measure-breakable-code.mjs", labels)
        self.assertIn("scripts/pdf-book/keep_next.py", labels)
        self.assertNotEqual(first["aggregate_sha256"], second["aggregate_sha256"])
        self.assertNotEqual(second["aggregate_sha256"], third["aggregate_sha256"])
        self.assertNotEqual(third["aggregate_sha256"], fourth["aggregate_sha256"])

    def test_input_hash_covers_margin_outline_assets_and_rejects_mid_build_changes(self):
        source = self.sources / "book-00.md"
        css = self.root / "book.css"
        css.write_text("body {}", encoding="utf-8")
        (self.root / "package-lock.json").write_text("{}", encoding="utf-8")
        markdown_scan = self.root / "scripts" / "curriculum-qa" / "markdown_scan.py"
        markdown_scan.parent.mkdir(parents=True)
        markdown_scan.write_text("# helper", encoding="utf-8")
        margin_dir = self.root / "scripts" / "pdf-book"
        margin_dir.mkdir(parents=True, exist_ok=True)
        margin_helper = margin_dir / "decorative-margin-outline.mjs"
        margin_glyphs = margin_dir / "decorative-margin-glyph-map.json"
        margin_helper.write_text("// helper-v1\n", encoding="utf-8")
        margin_glyphs.write_text('{"schema_version":1}\n', encoding="utf-8")
        toolchain_root = self.root / "toolchain"
        for identifier in (
            build_pdf_book.VIVLIOSTYLE_CLI,
            build_pdf_book.VFM_CLI,
            build_pdf_book.THEME,
            build_pdf_book.MERMAID_CLI,
        ):
            package = toolchain_root / "node_modules" / identifier.rsplit("@", 1)[0]
            package.mkdir(parents=True, exist_ok=True)
            (package / "package.json").write_text(identifier, encoding="utf-8")
        toolchain = {
            "root": str(toolchain_root),
            "vfm_bin": str(toolchain_root / "node_modules/.bin/vfm"),
        }

        with (
            patch.object(build_pdf_book, "REPO_ROOT", self.root),
            patch.object(build_pdf_book, "SRC_DIR", self.sources),
            patch.object(build_pdf_book, "BOOK_CSS", css),
            patch.object(build_pdf_book, "DECORATIVE_MARGIN_OUTLINE", margin_helper),
            patch.object(build_pdf_book, "DECORATIVE_MARGIN_GLYPHS", margin_glyphs),
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", self.root / "no-toolchain"),
            patch.object(build_pdf_book, "FONT_SOURCES", ()),
            patch.object(build_pdf_book, "referenced_images", return_value=[]),
        ):
            first = build_pdf_book.release_input_snapshot([source], None, None, toolchain)
            margin_helper.write_text("// helper-v2\n", encoding="utf-8")
            second = build_pdf_book.release_input_snapshot([source], None, None, toolchain)
            margin_glyphs.write_text('{"schema_version":2}\n', encoding="utf-8")
            third = build_pdf_book.release_input_snapshot([source], None, None, toolchain)

        labels = {item["file"] for item in first["files"]}
        self.assertIn("scripts/pdf-book/decorative-margin-outline.mjs", labels)
        self.assertIn("scripts/pdf-book/decorative-margin-glyph-map.json", labels)
        self.assertNotEqual(first["aggregate_sha256"], second["aggregate_sha256"])
        self.assertNotEqual(second["aggregate_sha256"], third["aggregate_sha256"])
        self.assertEqual(self.run_main([first, second]), 1)
        self.assertEqual(self.run_main([second, third]), 1)

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

        def run(command, **kwargs):
            if command[0] == "/resolved/bin/vfm":
                return build_pdf_book.subprocess.CompletedProcess(
                    command, 0, "<html><head></head><body><p>Fixture</p></body></html>", ""
                )
            if "--dom-report" in command:
                Path(command[command.index("--report") + 1]).write_text('{"result":"pass"}')
                return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")
            if command[0] == "node":
                self.assertEqual(Path(command[1]).name, "verify-inline-layout.mjs")
                self.assertEqual(kwargs["env"]["PDF_BOOK_TOOLCHAIN_DIR"], str(build_pdf_book.TOOLCHAIN_DIR))
                self.assertEqual(
                    kwargs["env"]["PDF_BOOK_MARGIN_OUTLINE_GLYPHS"],
                    str(build_pdf_book.DECORATIVE_MARGIN_GLYPHS.resolve()),
                )
                self.assertEqual(
                    kwargs["env"]["PDF_BOOK_MARGIN_OUTLINE_FONT"],
                    str((work / "fonts" / "BIZUDPGothic_400Regular.ttf").resolve()),
                )
                self.assertEqual(
                    kwargs["env"]["PDF_BOOK_MARGIN_OUTLINE_SOURCE"],
                    str(source.resolve()),
                )
                config_path = work / command[command.index("-c") + 1]
                config = json.loads(
                    config_path.read_text(encoding="utf-8")
                    .removeprefix("module.exports = ")
                    .removesuffix(";\n")
                )
                self.assertEqual(config["theme"][0], build_pdf_book.LOCAL_THEME_CSS)
                self.assertEqual(
                    config["copyAsset"], {"includes": ["local-theme/**"]}
                )
                Path(command[command.index("-o") + 1]).write_bytes(b"fixture-pdf")
                self.write_empty_dom_report(kwargs["env"])
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
            if command[:2] == ["node", "-p"]:
                return build_pdf_book.subprocess.CompletedProcess(
                    command, 0,
                    '{"version":"22.22.2","execPath":"/runtime/node"}\n', "",
                )
            if command[0] == "/runtime/node":
                return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")
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
                target.chmod(0o755)
                (bins / name).symlink_to(relative_target)
            dependencies = json.loads(
                (staging / "package.json").read_text(encoding="utf-8")
            )["dependencies"]
            (staging / "package-lock.json").write_text(
                json.dumps({"packages": {"": {"dependencies": dependencies}}}),
                encoding="utf-8",
            )
            return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")

        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value={
                "node_version": "22.22.2", "node_exec_path": "/runtime/node",
                "node_exec_sha256": "a" * 64, "npm_version": "10.9.7",
                "npm_exec_path": "/runtime/npm", "npm_exec_sha256": "b" * 64,
            }),
            patch.object(build_pdf_book.subprocess, "run", side_effect=install),
        ):
            resolved = build_pdf_book.prepare_release_toolchain({})

        self.assertEqual(commands[0][:2], ["/runtime/npm", "install"])
        self.assertIn("--include=optional", commands[0])
        self.assertEqual(commands[1][0], "/runtime/node")
        self.assertEqual(resolved["root"], str(destination))
        self.assertEqual(resolved["node_exec_path"], "/runtime/node")
        self.assertEqual(resolved["node_version"], "22.22.2")
        self.assertTrue(Path(resolved["vivliostyle_bin"]).is_file())
        self.assertTrue(Path(resolved["theme_path"]).is_dir())
        self.assertEqual(
            resolved["probe_module"], "node_modules/@vivliostyle/cli/dist/cli.js"
        )
        probe_path = destination / resolved["probe_module"]
        self.assertTrue(probe_path.is_file())
        self.assertEqual(
            resolved["probe_module_sha256"],
            hashlib.sha256(probe_path.read_bytes()).hexdigest(),
        )
        payload = build_pdf_book._toolchain_payload_fingerprint(destination)
        self.assertEqual(
            {
                key: resolved[f"toolchain_payload_{key}"]
                for key in ("file_count", "size", "sha256")
            },
            payload,
        )

    def test_prepare_release_toolchain_reuses_verified_cache_without_writing(self):
        shared = self.root / "shared-toolchain"
        runtime = self.make_release_toolchain(shared)
        destination = self.root / "toolchain-link"
        destination.symlink_to(shared, target_is_directory=True)
        before = build_pdf_book._hash_tree_stably(destination)
        provenance = shared / build_pdf_book.TOOLCHAIN_RUNTIME
        before_mtime = provenance.stat().st_mtime_ns
        commands = []

        def probe(command, **_kwargs):
            commands.append(command)
            return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")

        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(build_pdf_book.subprocess, "run", side_effect=probe),
        ):
            resolved = build_pdf_book.prepare_release_toolchain({
                "PDF_BOOK_REUSE_TOOLCHAIN": "1",
            })
            active_toolchain = build_pdf_book.TOOLCHAIN_DIR

        self.assertEqual(resolved["root"], str(shared.resolve()))
        self.assertEqual(active_toolchain, shared.resolve())
        self.assertEqual(len(commands), 1)
        self.assertEqual(commands[0][0], runtime["node_exec_path"])
        self.assertFalse(any("install" in command for command in commands))
        self.assertEqual(build_pdf_book._hash_tree_stably(destination), before)
        self.assertEqual(provenance.stat().st_mtime_ns, before_mtime)
        self.assertEqual(list(self.root.glob(".pdf-book-toolchain-*")), [])

    def test_attest_existing_toolchain_once_then_reuse_without_writing(self):
        shared = self.root / "existing-toolchain"
        runtime = self.make_release_toolchain(shared, with_provenance=False)
        alias = self.root / "existing-toolchain-link"
        alias.symlink_to(shared, target_is_directory=True)
        payload_before = build_pdf_book._toolchain_payload_fingerprint(shared)
        commands = []

        def probe(command, **_kwargs):
            commands.append(command)
            return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")

        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", alias),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(build_pdf_book.subprocess, "run", side_effect=probe),
        ):
            attested = build_pdf_book.prepare_release_toolchain({
                "PDF_BOOK_ATTEST_EXISTING_TOOLCHAIN": "1",
            })
            active_toolchain = build_pdf_book.TOOLCHAIN_DIR

        provenance = shared / build_pdf_book.TOOLCHAIN_RUNTIME
        self.assertTrue(provenance.is_file())
        self.assertEqual(active_toolchain, shared.resolve())
        self.assertEqual(attested["root"], str(shared.resolve()))
        self.assertEqual(len(commands), 1)
        self.assertFalse(any("install" in command for command in commands))
        self.assertEqual(
            build_pdf_book._toolchain_payload_fingerprint(shared), payload_before
        )
        self.assertEqual(list(shared.glob(".runtime-provenance-*")), [])

        runtime_probe = Mock()
        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", alias),
            patch.object(build_pdf_book, "_pdf_node_runtime", runtime_probe),
            self.assertRaisesRegex(FileExistsError, "既に存在"),
        ):
            build_pdf_book.prepare_release_toolchain({
                "PDF_BOOK_ATTEST_EXISTING_TOOLCHAIN": "1",
            })
        runtime_probe.assert_not_called()

        before_reuse = build_pdf_book._hash_tree_stably(shared)
        before_mtime = provenance.stat().st_mtime_ns
        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", alias),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(
                build_pdf_book.subprocess, "run",
                return_value=build_pdf_book.subprocess.CompletedProcess([], 0, "", ""),
            ),
        ):
            build_pdf_book.prepare_release_toolchain({
                "PDF_BOOK_REUSE_TOOLCHAIN": "1",
            })
        self.assertEqual(build_pdf_book._hash_tree_stably(shared), before_reuse)
        self.assertEqual(provenance.stat().st_mtime_ns, before_mtime)

    def test_attest_existing_toolchain_rejects_flags_and_missing_cache_before_runtime(self):
        for env in (
            {"PDF_BOOK_ATTEST_EXISTING_TOOLCHAIN": ""},
            {"PDF_BOOK_ATTEST_EXISTING_TOOLCHAIN": "true"},
            {
                "PDF_BOOK_ATTEST_EXISTING_TOOLCHAIN": "1",
                "PDF_BOOK_REUSE_TOOLCHAIN": "1",
            },
        ):
            with self.subTest(env=env):
                runtime_probe = Mock()
                with (
                    patch.object(build_pdf_book, "_pdf_node_runtime", runtime_probe),
                    self.assertRaises(ValueError),
                ):
                    build_pdf_book.prepare_release_toolchain(env)
                runtime_probe.assert_not_called()

        missing = self.root / "missing-attestation-cache"
        runtime_probe = Mock()
        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", missing),
            patch.object(build_pdf_book, "_pdf_node_runtime", runtime_probe),
            self.assertRaisesRegex(FileNotFoundError, "attestation対象"),
        ):
            build_pdf_book.prepare_release_toolchain({
                "PDF_BOOK_ATTEST_EXISTING_TOOLCHAIN": "1",
            })
        runtime_probe.assert_not_called()
        self.assertFalse(missing.exists())

    def test_attest_existing_toolchain_publish_race_never_overwrites(self):
        destination = self.root / "attestation-race"
        runtime = self.make_release_toolchain(destination, with_provenance=False)
        runtime_path = destination / build_pdf_book.TOOLCHAIN_RUNTIME

        def race(_source, target):
            Path(target).write_text("concurrent-writer", encoding="utf-8")
            raise FileExistsError("injected race")

        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(
                build_pdf_book.subprocess, "run",
                return_value=build_pdf_book.subprocess.CompletedProcess([], 0, "", ""),
            ),
            patch.object(build_pdf_book.os, "link", side_effect=race),
            self.assertRaisesRegex(FileExistsError, "既に存在"),
        ):
            build_pdf_book.prepare_release_toolchain({
                "PDF_BOOK_ATTEST_EXISTING_TOOLCHAIN": "1",
            })
        self.assertEqual(runtime_path.read_text(encoding="utf-8"), "concurrent-writer")
        self.assertEqual(list(destination.glob(".runtime-provenance-*")), [])

    def test_attest_existing_toolchain_fsync_failure_removes_own_metadata(self):
        destination = self.root / "attestation-fsync-failure"
        runtime = self.make_release_toolchain(destination, with_provenance=False)
        payload_before = build_pdf_book._toolchain_payload_fingerprint(destination)
        fsync_calls = 0
        real_fsync = build_pdf_book.os.fsync

        def fail_directory_fsync(descriptor):
            nonlocal fsync_calls
            fsync_calls += 1
            if fsync_calls == 2:
                raise OSError("injected directory fsync failure")
            return real_fsync(descriptor)

        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(
                build_pdf_book.subprocess, "run",
                return_value=build_pdf_book.subprocess.CompletedProcess([], 0, "", ""),
            ),
            patch.object(build_pdf_book.os, "fsync", side_effect=fail_directory_fsync),
            self.assertRaisesRegex(OSError, "directory fsync failure"),
        ):
            build_pdf_book.prepare_release_toolchain({
                "PDF_BOOK_ATTEST_EXISTING_TOOLCHAIN": "1",
            })
        self.assertFalse((destination / build_pdf_book.TOOLCHAIN_RUNTIME).exists())
        self.assertEqual(list(destination.glob(".runtime-provenance-*")), [])
        self.assertEqual(
            build_pdf_book._toolchain_payload_fingerprint(destination), payload_before
        )

    def test_attest_existing_toolchain_probe_failure_leaves_no_metadata(self):
        destination = self.root / "attestation-probe-failure"
        runtime = self.make_release_toolchain(destination, with_provenance=False)
        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(
                build_pdf_book.subprocess, "run",
                return_value=build_pdf_book.subprocess.CompletedProcess(
                    [], 1, "", "probe rejected"
                ),
            ),
            self.assertRaisesRegex(OSError, "import probe"),
        ):
            build_pdf_book.prepare_release_toolchain({
                "PDF_BOOK_ATTEST_EXISTING_TOOLCHAIN": "1",
            })
        self.assertFalse((destination / build_pdf_book.TOOLCHAIN_RUNTIME).exists())
        self.assertEqual(list(destination.glob(".runtime-provenance-*")), [])

    def test_attest_existing_toolchain_rejects_race_after_semantic_checks(self):
        destination = self.root / "attestation-semantic-race"
        runtime = self.make_release_toolchain(destination, with_provenance=False)
        package = destination / "node_modules/@vivliostyle/vfm/package.json"
        toolchain_paths = build_pdf_book._toolchain_paths

        def mutate_after_versions(root):
            paths = toolchain_paths(root)
            package.write_text(
                json.dumps({"name": "@vivliostyle/vfm", "version": "0.0.0"}),
                encoding="utf-8",
            )
            return paths

        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(build_pdf_book, "_toolchain_paths", side_effect=mutate_after_versions),
            patch.object(
                build_pdf_book.subprocess, "run",
                return_value=build_pdf_book.subprocess.CompletedProcess([], 0, "", ""),
            ),
            self.assertRaisesRegex(OSError, "検証中に変更"),
        ):
            build_pdf_book.prepare_release_toolchain({
                "PDF_BOOK_ATTEST_EXISTING_TOOLCHAIN": "1",
            })
        self.assertFalse((destination / build_pdf_book.TOOLCHAIN_RUNTIME).exists())
        self.assertEqual(list(destination.glob(".runtime-provenance-*")), [])

    def test_attest_existing_toolchain_rolls_back_metadata_on_post_publish_alias_race(self):
        first = self.root / "attestation-cache-a"
        second = self.root / "attestation-cache-b"
        runtime = self.make_release_toolchain(first, with_provenance=False)
        self.make_release_toolchain(second, with_provenance=False)
        alias = self.root / "attestation-alias"
        alias.symlink_to(first, target_is_directory=True)
        publish = build_pdf_book._write_runtime_provenance_exclusively

        def publish_then_retarget(root, provenance):
            signature = publish(root, provenance)
            alias.unlink()
            alias.symlink_to(second, target_is_directory=True)
            return signature

        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", alias),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(
                build_pdf_book.subprocess, "run",
                return_value=build_pdf_book.subprocess.CompletedProcess([], 0, "", ""),
            ),
            patch.object(
                build_pdf_book, "_write_runtime_provenance_exclusively",
                side_effect=publish_then_retarget,
            ),
            self.assertRaisesRegex(OSError, "attestation公開中"),
        ):
            build_pdf_book.prepare_release_toolchain({
                "PDF_BOOK_ATTEST_EXISTING_TOOLCHAIN": "1",
            })
        self.assertFalse((first / build_pdf_book.TOOLCHAIN_RUNTIME).exists())
        self.assertFalse((second / build_pdf_book.TOOLCHAIN_RUNTIME).exists())

    def test_prepare_release_toolchain_reuse_requires_existing_cache(self):
        destination = self.root / "missing-toolchain"
        runtime = {
            "node_version": "22.22.2", "node_exec_path": "/runtime/node",
            "node_exec_sha256": "a" * 64, "npm_version": "10.9.7",
            "npm_exec_path": "/runtime/npm", "npm_exec_sha256": "b" * 64,
        }
        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(build_pdf_book.subprocess, "run") as run,
            self.assertRaisesRegex(FileNotFoundError, "再利用するPDF toolchain"),
        ):
            build_pdf_book.prepare_release_toolchain({"PDF_BOOK_REUSE_TOOLCHAIN": "1"})
        run.assert_not_called()
        self.assertFalse(destination.exists())
        self.assertEqual(list(self.root.glob(".pdf-book-toolchain-*")), [])

    def test_prepare_release_toolchain_reuse_rejects_package_and_lock_mismatch(self):
        for failure in ("package", "lock", "lock-dependency"):
            with self.subTest(failure=failure):
                destination = self.root / f"mismatched-{failure}"
                runtime = self.make_release_toolchain(destination)
                if failure == "package":
                    package = destination / "node_modules/@vivliostyle/cli/package.json"
                    package.write_text(
                        json.dumps({"name": "@vivliostyle/cli", "version": "0.0.0"}),
                        encoding="utf-8",
                    )
                    expected_error = "解決版が指定と違います"
                elif failure == "lock":
                    (destination / "package-lock.json").write_text("not-json", encoding="utf-8")
                    expected_error = "package.json/package-lock.json"
                else:
                    (destination / "package-lock.json").write_text(
                        json.dumps({"packages": {"": {"dependencies": {}}}}),
                        encoding="utf-8",
                    )
                    expected_error = "package-lock固定依存"
                before = build_pdf_book._hash_tree_stably(destination)
                with (
                    patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
                    patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
                    patch.object(
                        build_pdf_book.subprocess, "run",
                        return_value=build_pdf_book.subprocess.CompletedProcess([], 0, "", ""),
                    ),
                    self.assertRaisesRegex(OSError, expected_error),
                ):
                    build_pdf_book.prepare_release_toolchain({
                        "PDF_BOOK_REUSE_TOOLCHAIN": "1",
                    })
                self.assertEqual(build_pdf_book._hash_tree_stably(destination), before)

    def test_prepare_release_toolchain_reuse_rejects_runtime_drift_without_writing(self):
        destination = self.root / "runtime-drift"
        runtime = self.make_release_toolchain(destination)
        current = dict(runtime)
        current["node_exec_sha256"] = "c" * 64
        before = build_pdf_book._hash_tree_stably(destination)
        probe = Mock()
        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=current),
            patch.object(build_pdf_book.subprocess, "run", probe),
            self.assertRaisesRegex(ValueError, "runtime provenance"),
        ):
            build_pdf_book.prepare_release_toolchain({"PDF_BOOK_REUSE_TOOLCHAIN": "1"})
        probe.assert_not_called()
        self.assertEqual(build_pdf_book._hash_tree_stably(destination), before)

    def test_prepare_release_toolchain_reuse_rejects_unsafe_symlink(self):
        destination = self.root / "unsafe-link"
        runtime = self.make_release_toolchain(destination)
        outside = self.root / "outside"
        outside.write_text("outside", encoding="utf-8")
        (destination / "escaping-link").symlink_to(outside)
        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(
                build_pdf_book.subprocess, "run",
                return_value=build_pdf_book.subprocess.CompletedProcess([], 0, "", ""),
            ),
            self.assertRaisesRegex(OSError, "toolchain外"),
        ):
            build_pdf_book.prepare_release_toolchain({"PDF_BOOK_REUSE_TOOLCHAIN": "1"})

    def test_prepare_release_toolchain_reuse_rejects_change_during_probe(self):
        destination = self.root / "changing-toolchain"
        runtime = self.make_release_toolchain(destination)
        package = destination / "node_modules/@vivliostyle/vfm/package.json"

        def mutate(_command, **_kwargs):
            package.write_text(package.read_text(encoding="utf-8") + "\n", encoding="utf-8")
            return build_pdf_book.subprocess.CompletedProcess([], 0, "", "")

        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(build_pdf_book.subprocess, "run", side_effect=mutate),
            self.assertRaisesRegex(OSError, "検証中に変更"),
        ):
            build_pdf_book.prepare_release_toolchain({"PDF_BOOK_REUSE_TOOLCHAIN": "1"})

    def test_prepare_release_toolchain_reuse_rejects_non_probe_payload_drift(self):
        destination = self.root / "payload-drift"
        runtime = self.make_release_toolchain(destination)
        vfm = destination / "node_modules/@vivliostyle/vfm/lib/cli.js"
        vfm.write_text("changed after provenance", encoding="utf-8")
        vfm.chmod(0o755)
        probe = Mock()
        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(build_pdf_book.subprocess, "run", probe),
            self.assertRaisesRegex(ValueError, "保存済み指紋"),
        ):
            build_pdf_book.prepare_release_toolchain({"PDF_BOOK_REUSE_TOOLCHAIN": "1"})
        probe.assert_not_called()

    def test_prepare_release_toolchain_reuse_rejects_alias_retarget_during_probe(self):
        first = self.root / "cache-a"
        second = self.root / "cache-b"
        runtime = self.make_release_toolchain(first)
        self.make_release_toolchain(second)
        alias = self.root / "toolchain-alias"
        alias.symlink_to(first, target_is_directory=True)

        def retarget(_command, **_kwargs):
            alias.unlink()
            alias.symlink_to(second, target_is_directory=True)
            return build_pdf_book.subprocess.CompletedProcess([], 0, "", "")

        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", alias),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(build_pdf_book.subprocess, "run", side_effect=retarget),
            self.assertRaisesRegex(OSError, "aliasが検証中"),
        ):
            build_pdf_book.prepare_release_toolchain({"PDF_BOOK_REUSE_TOOLCHAIN": "1"})

    def test_prepare_release_toolchain_rejects_invalid_reuse_flag_before_runtime(self):
        for value in ("", "0", "true", "yes"):
            with self.subTest(value=value):
                destination = self.root / f"untouched-toolchain-{value or 'empty'}"
                runtime_probe = Mock()
                with (
                    patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
                    patch.object(build_pdf_book, "_pdf_node_runtime", runtime_probe),
                    self.assertRaisesRegex(ValueError, "再利用時だけ1"),
                ):
                    build_pdf_book.prepare_release_toolchain({
                        "PDF_BOOK_REUSE_TOOLCHAIN": value,
                    })
                runtime_probe.assert_not_called()
                self.assertFalse(destination.exists())

    def test_prepare_release_toolchain_rejects_unsupported_node_before_mutation(self):
        destination = self.root / "old-toolchain"
        destination.mkdir()
        marker = destination / "keep"
        marker.write_text("old", encoding="utf-8")
        calls = []

        def run(command, **kwargs):
            calls.append(command)
            if command[-1:] == ["--version"]:
                return build_pdf_book.subprocess.CompletedProcess(command, 0, "10.9.7\n", "")
            return build_pdf_book.subprocess.CompletedProcess(
                command, 0,
                '{"version":"22.11.0","execPath":"/usr/bin/node"}\n', "",
            )

        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book.subprocess, "run", side_effect=run),
            self.assertRaisesRegex(ValueError, "22.12.0"),
        ):
            build_pdf_book.prepare_release_toolchain({})

        self.assertFalse(any("install" in command for command in calls))
        self.assertEqual(marker.read_text(encoding="utf-8"), "old")
        self.assertEqual(list(self.root.glob(".pdf-book-toolchain-*")), [])

    def test_prepare_release_toolchain_probe_failure_keeps_old_toolchain(self):
        destination = self.root / "old-toolchain"
        destination.mkdir()
        marker = destination / "keep"
        marker.write_text("old", encoding="utf-8")

        def run(command, **kwargs):
            if command[:2] == ["node", "-p"]:
                return build_pdf_book.subprocess.CompletedProcess(
                    command, 0,
                    '{"version":"22.22.2","execPath":"/runtime/node"}\n', "",
                )
            if command[0] == "/runtime/node":
                return build_pdf_book.subprocess.CompletedProcess(
                    command, 1, "", "Cannot find native binding"
                )
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
                target.chmod(0o755)
                (bins / name).symlink_to(relative_target)
            dependencies = json.loads(
                (staging / "package.json").read_text(encoding="utf-8")
            )["dependencies"]
            (staging / "package-lock.json").write_text(
                json.dumps({"packages": {"": {"dependencies": dependencies}}}),
                encoding="utf-8",
            )
            return build_pdf_book.subprocess.CompletedProcess(command, 0, "", "")

        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value={
                "node_version": "22.22.2", "node_exec_path": "/runtime/node",
                "node_exec_sha256": "a" * 64, "npm_version": "10.9.7",
                "npm_exec_path": "/runtime/npm", "npm_exec_sha256": "b" * 64,
            }),
            patch.object(build_pdf_book.subprocess, "run", side_effect=run),
            self.assertRaisesRegex(OSError, "import probe"),
        ):
            build_pdf_book.prepare_release_toolchain({})

        self.assertEqual(marker.read_text(encoding="utf-8"), "old")

    def test_exchange_failure_restores_old_toolchain(self):
        destination = self.root / "old-toolchain"
        destination.mkdir()
        marker = destination / "keep"
        marker.write_text("old", encoding="utf-8")
        original_replace = Path.replace

        def replace(path, target):
            if path.name.startswith(".pdf-book-toolchain-") and Path(target) == destination:
                raise OSError("injected exchange failure")
            return original_replace(path, target)

        runtime = {
            "node_version": "22.22.2", "node_exec_path": "/runtime/node",
            "node_exec_sha256": "a" * 64, "npm_version": "10.9.7",
            "npm_exec_path": "/runtime/npm", "npm_exec_sha256": "b" * 64,
        }
        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", destination),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value=runtime),
            patch.object(build_pdf_book, "_validate_release_toolchain", return_value={}),
            patch.object(build_pdf_book.subprocess, "run", return_value=
                         build_pdf_book.subprocess.CompletedProcess([], 0, "", "")),
            patch.object(Path, "replace", replace),
            self.assertRaisesRegex(OSError, "exchange failure"),
        ):
            build_pdf_book.prepare_release_toolchain({})
        self.assertEqual(marker.read_text(encoding="utf-8"), "old")
        self.assertEqual(list(self.root.glob(".pdf-book-toolchain-backup-*")), [])

    def test_toolchain_tree_rejects_symlink_outside_its_root(self):
        toolchain = self.root / "toolchain-boundary"
        toolchain.mkdir()
        outside = self.root / "outside-cli.js"
        outside.write_text("version one", encoding="utf-8")
        (toolchain / "cli").symlink_to(outside)

        with self.assertRaisesRegex(OSError, "toolchain外"):
            build_pdf_book._hash_tree_stably(toolchain)

    def test_runtime_provenance_recomputes_identically_and_rejects_drift(self):
        toolchain = self.root / "runtime-toolchain"
        probe_relative = "node_modules/@vivliostyle/cli/dist/cli.js"
        probe_path = toolchain / probe_relative
        probe_path.parent.mkdir(parents=True)
        probe_path.write_text("export const dispatchCli = () => {};", encoding="utf-8")
        runtime = {
            "node_version": "22.22.2", "node_exec_path": "/runtime/node",
            "node_exec_sha256": "a" * 64, "npm_version": "10.9.7",
            "npm_exec_path": "/runtime/npm", "npm_exec_sha256": "b" * 64,
            "probe_module": probe_relative,
            "probe_module_sha256": hashlib.sha256(probe_path.read_bytes()).hexdigest(),
            "probe_export": "dispatchCli", "probe_node_exec_path": "/runtime/node",
        }
        payload = build_pdf_book._toolchain_payload_fingerprint(toolchain)
        runtime.update({
            f"toolchain_payload_{key}": value for key, value in payload.items()
        })
        (toolchain / build_pdf_book.TOOLCHAIN_RUNTIME).write_text(
            json.dumps(runtime), encoding="utf-8"
        )
        explicit = build_pdf_book._toolchain_paths(toolchain)
        with (
            patch.object(build_pdf_book, "TOOLCHAIN_DIR", toolchain),
            patch.object(build_pdf_book, "_pdf_node_runtime", return_value={
                key: runtime[key] for key in (
                    "node_version", "node_exec_path", "node_exec_sha256",
                    "npm_version", "npm_exec_path", "npm_exec_sha256",
                )
            }),
        ):
            implicit = build_pdf_book._toolchain_paths(toolchain)
            self.assertEqual(explicit, implicit)
            probe_path.write_text("changed", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "全実体"):
                build_pdf_book.release_input_snapshot([], None, None)
            probe_path.write_text("export const dispatchCli = () => {};", encoding="utf-8")
            changed = dict(runtime)
            changed["node_version"] = "22.21.0"
            with patch.object(build_pdf_book, "_pdf_node_runtime", return_value={
                key: changed[key] for key in (
                    "node_version", "node_exec_path", "node_exec_sha256",
                    "npm_version", "npm_exec_path", "npm_exec_sha256",
                )
            }):
                with self.assertRaisesRegex(ValueError, "runtime"):
                    build_pdf_book.release_input_snapshot([], None, None)

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
