import importlib.util
import os
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = Path(__file__).with_name("release_manifest.py")
SPEC = importlib.util.spec_from_file_location("release_manifest", MODULE_PATH)
release_manifest = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(release_manifest)


class ReleaseManifestTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.material = self.root / "material"
        self.pdf = self.root / "pdf"
        self.material.mkdir()
        self.pdf.mkdir()

    def tearDown(self):
        self.directory.cleanup()

    def make_sources(self, count=36):
        for number in range(count):
            (self.material / f"book-{number:02}.md").write_text(
                f"# Book {number}\n", encoding="utf-8"
            )

    def make_pdf(self, name, content=b"%PDF-1.7\ncontent"):
        path = self.pdf / name
        path.write_bytes(content)
        return path

    def test_pdf_set_must_match_all_source_names(self):
        self.make_sources()
        for number in range(35):
            self.make_pdf(f"book-{number:02}.pdf")
        self.make_pdf("wrong-name.pdf")

        with (
            patch.object(release_manifest, "MATERIAL_DIR", self.material),
            patch.object(release_manifest, "PDF_DIR", self.pdf),
            patch.object(release_manifest, "run", return_value="Pages: 2"),
        ):
            inventory = release_manifest.pdf_inventory()
            problems = release_manifest.verify_pdf_inventory(inventory)

        self.assertTrue(any("不足" in problem for problem in problems))
        self.assertTrue(any("想定外" in problem for problem in problems))

    def test_pdf_must_be_nonempty_and_have_positive_parsed_pages(self):
        self.make_sources(1)
        self.make_pdf("book-00.pdf", b"")

        with (
            patch.object(release_manifest, "MATERIAL_DIR", self.material),
            patch.object(release_manifest, "PDF_DIR", self.pdf),
            patch.object(release_manifest, "EXPECTED_PDFS", 1),
            patch.object(release_manifest, "run", return_value="Pages: 0"),
        ):
            inventory = release_manifest.pdf_inventory()
            problems = release_manifest.verify_pdf_inventory(inventory)

        self.assertTrue(any("空" in problem for problem in problems))
        self.assertTrue(any("ページ数" in problem for problem in problems))

    def test_pdfinfo_failure_is_a_release_failure(self):
        self.make_sources(1)
        self.make_pdf("book-00.pdf")

        with (
            patch.object(release_manifest, "MATERIAL_DIR", self.material),
            patch.object(release_manifest, "PDF_DIR", self.pdf),
            patch.object(release_manifest, "EXPECTED_PDFS", 1),
            patch.object(release_manifest, "run", side_effect=RuntimeError("bad pdf")),
        ):
            inventory = release_manifest.pdf_inventory()
            problems = release_manifest.verify_pdf_inventory(inventory)

        self.assertTrue(any("解析" in problem for problem in problems))

    def test_only_canonical_nonempty_parseable_zip_is_accepted(self):
        canonical = self.root / "task-app-curriculum-v1.1.zip"
        canonical.write_bytes(b"")
        (self.root / "task-app-curriculum-v9.9.zip").write_bytes(b"wrong")

        with patch.object(release_manifest, "RELEASE_ZIP", canonical):
            inventory = release_manifest.zip_inventory()
            problems = release_manifest.verify_zip_inventory(inventory)

        self.assertEqual(inventory["name"], canonical.name)
        self.assertTrue(any("空" in problem or "ZIP" in problem for problem in problems))

        with zipfile.ZipFile(canonical, "w") as archive:
            archive.writestr("task-app/README.md", "ready")
        with patch.object(release_manifest, "RELEASE_ZIP", canonical):
            inventory = release_manifest.zip_inventory()
            self.assertEqual(release_manifest.verify_zip_inventory(inventory), [])

    def test_tree_identity_hashes_binary_and_nul_delimited_names(self):
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        binary = self.root / "tracked.bin"
        binary.write_bytes(b"\x00\xff\x10")
        unusual = self.root / "line\nbreak.bin"
        unusual.write_bytes(b"\x00untracked")
        subprocess.run(
            ["git", "-C", str(self.root), "add", "tracked.bin"], check=True
        )

        with patch.object(release_manifest, "REPO_ROOT", self.root):
            first = release_manifest.worktree_identity()
            unusual.write_bytes(b"\x00changed")
            second = release_manifest.worktree_identity()

        self.assertEqual(first["file_count"], 2)
        self.assertNotEqual(first["aggregate_sha256"], second["aggregate_sha256"])

    def test_tree_identity_binds_submodule_head_and_dirty_content(self):
        child = self.root / "child-source"
        subprocess.run(["git", "init", "-q", str(child)], check=True)
        tracked = child / "tracked.bin"
        tracked.write_bytes(b"first\x00version")
        subprocess.run(["git", "-C", str(child), "add", "tracked.bin"], check=True)
        subprocess.run(
            [
                "git", "-C", str(child), "-c", "user.name=Test",
                "-c", "user.email=test@example.test", "commit", "-qm", "initial",
            ],
            check=True,
        )
        parent = self.root / "parent"
        subprocess.run(["git", "init", "-q", str(parent)], check=True)
        subprocess.run(
            [
                "git", "-c", "protocol.file.allow=always", "-C", str(parent),
                "submodule", "add", "-q", str(child), "dependency",
            ],
            check=True,
        )

        with patch.object(release_manifest, "REPO_ROOT", parent):
            first = release_manifest.worktree_identity()
            (parent / "dependency" / "tracked.bin").write_bytes(b"dirty\x00version")
            second = release_manifest.worktree_identity()

        self.assertEqual(first["submodule_count"], 1)
        self.assertEqual(
            first["submodules"][0]["index_commit"],
            first["submodules"][0]["head_commit"],
        )
        self.assertNotEqual(first["aggregate_sha256"], second["aggregate_sha256"])

    def test_missing_font_hash_fails_preupload(self):
        manifest = self.valid_manifest()
        manifest["fonts"] = [{"file": "font.ttf", "sha256": None}]
        self.assertTrue(
            any("フォント" in problem for problem in release_manifest.preupload_failures(manifest))
        )

    def test_missing_stale_or_partial_build_receipt_fails_preupload(self):
        manifest = self.valid_manifest()
        manifest["build_receipt"] = {"loaded": False, "error": "missing"}
        self.assertIn("missing", release_manifest.preupload_failures(manifest))

        manifest = self.valid_manifest()
        manifest["build_receipt"]["current_inputs"]["aggregate_sha256"] = "b" * 64
        self.assertTrue(
            any("入力が変わ" in problem for problem in release_manifest.preupload_failures(manifest))
        )

        manifest = self.valid_manifest()
        manifest["build_receipt"]["receipt"]["outputs"].pop()
        self.assertTrue(
            any("36冊" in problem for problem in release_manifest.preupload_failures(manifest))
        )

    def test_pdf_changed_after_build_receipt_fails_preupload(self):
        manifest = self.valid_manifest()
        manifest["build_receipt"]["receipt"]["outputs"][0]["sha256"] = "x" * 64
        self.assertTrue(
            any("PDFが変わ" in problem for problem in release_manifest.preupload_failures(manifest))
        )

    def test_preupload_does_not_require_remote_results(self):
        manifest = self.valid_manifest()
        manifest["correspondence"]["ledger_content"]["combinations"] = [
            item
            for item in manifest["correspondence"]["ledger_content"]["combinations"]
            if item["id"] != "drive-delivery"
        ]
        self.assertEqual(release_manifest.preupload_failures(manifest), [])

    def test_remote_results_reject_empty_duplicate_missing_and_mismatch(self):
        manifest = self.valid_manifest(pdf_names=("a.pdf", "b.pdf"))
        cases = (
            [],
            [
                {"name": "a.pdf", "ok": True},
                {"name": "a.pdf", "ok": True},
                {"name": "b.pdf", "ok": True},
            ],
            [{"name": "a.pdf", "ok": True}],
            [
                {"name": "a.pdf", "ok": True},
                {"name": "b.pdf", "ok": False, "error": "hash mismatch"},
            ],
        )
        for results in cases:
            with self.subTest(results=results):
                self.assertTrue(release_manifest.postupload_failures(manifest, results))

    def test_complete_remote_results_are_accepted(self):
        manifest = self.valid_manifest(pdf_names=("a.pdf", "b.pdf"))
        manifest["drive"] = [
            {
                "id": f"id-{index}",
                "name": item["name"],
                "url": f"https://example.test/{index}",
                "uploaded_sha256": item["sha256"],
            }
            for index, item in enumerate(manifest["artifacts"]["pdfs"])
        ]
        results = [
            {"name": item["name"], "ok": True}
            for item in manifest["artifacts"]["pdfs"]
        ]
        self.assertEqual(release_manifest.postupload_failures(manifest, results), [])

        manifest["drive"][1]["id"] = manifest["drive"][0]["id"]
        self.assertTrue(
            any(
                "IDが重複" in problem
                for problem in release_manifest.postupload_failures(manifest, results)
            )
        )

    def valid_manifest(self, pdf_names=None):
        if pdf_names is None:
            pdf_names = tuple(
                f"book-{number:02}.pdf"
                for number in range(release_manifest.EXPECTED_PDFS)
            )
        pdfs = [
            {
                "name": name,
                "size": 10,
                "sha256": f"{index:064x}",
                "pages": 1,
                "parse_error": None,
            }
            for index, name in enumerate(pdf_names, 1)
        ]
        receipt_inputs = {
            "source_count": release_manifest.EXPECTED_PDFS,
            "source_pdf_names": list(pdf_names),
            "aggregate_sha256": "a" * 64,
        }
        return {
            "git": {"clean": True},
            "fonts": [
                {"file": f"font-{index}.ttf", "sha256": "f" * 64}
                for index in range(len(release_manifest.FONT_SOURCES))
            ],
            "generation_inputs": {
                "source_count": release_manifest.EXPECTED_PDFS,
                "source_pdf_names": list(pdf_names),
                "aggregate_sha256": "a" * 64,
                "files": [],
            },
            "build_receipt": {
                "loaded": True,
                "receipt": {
                    "version": 1,
                    "scope": "full-36-book-build",
                    "inputs": receipt_inputs.copy(),
                    "outputs": [
                        {"name": item["name"], "size": item["size"], "sha256": item["sha256"]}
                        for item in pdfs
                    ],
                },
                "current_inputs": receipt_inputs.copy(),
            },
            "artifacts": {
                "pdfs": pdfs,
                "zip": {
                    "name": "task-app-curriculum-v1.1.zip",
                    "size": 10,
                    "sha256": "z" * 64,
                    "entry_count": 1,
                    "parse_error": None,
                },
                "screenshots": None,
            },
            "drive": [],
            "correspondence": {
                "ledger_loaded": True,
                "ledger_content": {
                    "combinations": [
                        {
                            "id": combo_id,
                            "subject": "subject",
                            "corresponds_to": {"target": "value"},
                            "basis": "basis",
                            "approved_by": "reviewer",
                            "at": "2026-09-13",
                        }
                        for combo_id in release_manifest.REQUIRED_COMBINATIONS
                    ],
                    "exceptions": [],
                },
                "derived": {"pdfs": [], "screenshots": []},
            },
            "remote_verification": None,
        }


if __name__ == "__main__":
    unittest.main()
