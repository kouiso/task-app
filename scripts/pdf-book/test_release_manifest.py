import importlib.util
import hashlib
import io
import json
import os
import subprocess
import tempfile
import unittest
import zipfile
from datetime import datetime, timezone
from contextlib import redirect_stderr, redirect_stdout
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

    def make_drive_proof(self):
        manifest = self.valid_manifest()
        downloads = self.root / "downloads"
        downloads.mkdir(exist_ok=True)
        artifacts = [
            *manifest["artifacts"]["pdfs"], manifest["artifacts"]["zip"]
        ]
        records = []
        metadata = []
        permission = {"id": "shared-reader", "type": "anyone", "role": "reader"}
        for index, artifact in enumerate(artifacts):
            content = f"downloaded-{index}-{artifact['name']}".encode()
            digest = hashlib.sha256(content).hexdigest()
            artifact.update({"sha256": digest, "size": len(content)})
            downloaded = downloads / f"{index:02}.bin"
            downloaded.write_bytes(content)
            item_id = f"drive-id-{index:02}"
            metadata.append({
                "id": item_id,
                "name": artifact["name"],
                "url": f"https://drive.google.com/file/d/{item_id}/view",
                "parents": [release_manifest.DRIVE_FOLDER_ID],
                "size": len(content),
                "uploaded_sha256": digest,
            })
            records.append({
                "id": item_id,
                "id_before": item_id,
                "name": artifact["name"],
                "name_before": artifact["name"],
                "parents": [release_manifest.DRIVE_FOLDER_ID],
                "parents_before": [release_manifest.DRIVE_FOLDER_ID],
                "url_before": metadata[-1]["url"],
                "url_after": metadata[-1]["url"],
                "downloaded_file": str(downloaded.relative_to(self.root)),
                "downloaded_sha256": digest,
                "size": len(content),
                "permissions_before": [permission],
                "permissions_after": [permission],
            })
        manifest["drive"] = metadata
        proof = {
            "version": release_manifest.DRIVE_PROOF_VERSION,
            "scope": release_manifest.DRIVE_PROOF_SCOPE,
            "folder_id": release_manifest.DRIVE_FOLDER_ID,
            "artifacts": records,
        }
        proof_file = self.root / "drive-proof.json"
        proof_file.write_text(json.dumps(proof), encoding="utf-8")
        return manifest, proof, proof_file

    def verify_drive_proof(self, manifest, proof, proof_file, verified_at=None):
        proof_file.write_text(json.dumps(proof), encoding="utf-8")
        return release_manifest.postupload_failures(
            manifest, proof, proof_file, verified_at
        )

    def test_complete_oauth_readback_proof_accepts_36_pdfs_and_zip(self):
        manifest, proof, proof_file = self.make_drive_proof()
        failures, results = self.verify_drive_proof(manifest, proof, proof_file)
        self.assertEqual(failures, [])
        self.assertEqual(len(results), release_manifest.EXPECTED_PDFS + 1)
        self.assertTrue(all(result["ok"] for result in results))

    def test_proof_rejects_missing_duplicate_and_extra_artifacts(self):
        mutations = (
            lambda records: records.pop(),
            lambda records: records.append(records[0].copy()),
            lambda records: records.append({**records[0], "name": "extra.pdf", "id": "extra"}),
        )
        for mutate in mutations:
            manifest, proof, proof_file = self.make_drive_proof()
            mutate(proof["artifacts"])
            failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
            with self.subTest(mutate=mutate):
                self.assertTrue(failures)

    def test_ok_true_cannot_hide_wrong_id_parent_or_raw_bytes(self):
        manifest, proof, proof_file = self.make_drive_proof()
        record = proof["artifacts"][0]
        record.update({
            "ok": True,
            "id": "wrong-id",
            "parents": ["wrong-parent"],
        })
        (self.root / record["downloaded_file"]).write_bytes(b"changed after proof")
        failures, results = self.verify_drive_proof(manifest, proof, proof_file)
        self.assertTrue(any("ID" in failure for failure in failures))
        self.assertTrue(any("親フォルダ" in failure for failure in failures))
        self.assertTrue(any("SHA256" in failure for failure in failures))
        self.assertFalse(results[0]["ok"])

    def test_stale_metadata_hash_size_and_id_are_rejected(self):
        manifest, proof, proof_file = self.make_drive_proof()
        manifest["drive"][0].update({
            "id": "stale-id", "uploaded_sha256": "0" * 64, "size": 1,
        })
        failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
        self.assertTrue(any("ID" in failure for failure in failures))
        self.assertTrue(any("SHA256" in failure for failure in failures))
        self.assertTrue(any("サイズ" in failure for failure in failures))

    def test_metadata_rejects_duplicate_missing_and_extra_identity(self):
        mutations = (
            lambda items: items.__setitem__(1, {**items[1], "id": items[0]["id"]}),
            lambda items: items.pop(),
            lambda items: items.append({**items[0], "id": "extra", "name": "extra.pdf"}),
        )
        for mutate in mutations:
            manifest, proof, proof_file = self.make_drive_proof()
            mutate(manifest["drive"])
            failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
            with self.subTest(mutate=mutate):
                self.assertTrue(failures)

    def test_update_must_preserve_preexisting_id_name_and_parent(self):
        manifest, proof, proof_file = self.make_drive_proof()
        proof["artifacts"][0].update({
            "id_before": "old-id",
            "name_before": "old-name.pdf",
            "parents_before": ["old-parent"],
        })
        failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
        self.assertTrue(any("更新前後でID" in failure for failure in failures))
        self.assertTrue(any("更新前後で名前" in failure for failure in failures))
        self.assertTrue(any("更新前の親" in failure for failure in failures))

    def test_malformed_metadata_and_proof_records_fail_without_crashing(self):
        manifest, proof, proof_file = self.make_drive_proof()
        manifest["drive"][0]["name"] = ["not", "a", "string"]
        proof["artifacts"][0]["id"] = {"not": "a string"}
        proof["artifacts"][1]["name"] = ["not", "a", "string"]
        failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
        self.assertTrue(any("名前またはID" in failure for failure in failures))

    def test_traversal_absolute_and_outside_symlink_downloads_are_rejected(self):
        values = ("../outside.bin", str((self.root / "outside.bin").resolve()))
        for value in values:
            manifest, proof, proof_file = self.make_drive_proof()
            proof["artifacts"][0]["downloaded_file"] = value
            failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
            with self.subTest(value=value):
                self.assertTrue(any("証跡外" in failure for failure in failures))

        manifest, proof, proof_file = self.make_drive_proof()
        outside = self.root.parent / f"{self.root.name}-outside.bin"
        outside.write_bytes(b"outside")
        link = self.root / "downloads" / "outside-link.bin"
        link.symlink_to(outside)
        proof["artifacts"][0]["downloaded_file"] = str(link.relative_to(self.root))
        try:
            failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
            self.assertTrue(any("証跡外" in failure for failure in failures))
        finally:
            outside.unlink()

    def test_permission_evidence_must_exist_remain_equal_and_show_sharing(self):
        cases = (
            ([], [], "missing"),
            (
                [{"type": "anyone", "role": "reader"}],
                [{"type": "anyone", "role": "writer"}],
                "changed",
            ),
            (
                [{"type": "user", "role": "owner"}],
                [{"type": "user", "role": "owner"}],
                "owner-only",
            ),
        )
        for before, after, label in cases:
            manifest, proof, proof_file = self.make_drive_proof()
            proof["artifacts"][0]["permissions_before"] = before
            proof["artifacts"][0]["permissions_after"] = after
            failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
            with self.subTest(label=label):
                self.assertTrue(any("共有権限" in failure for failure in failures))

        manifest, proof, proof_file = self.make_drive_proof()
        owner = {"id": "owner", "type": "user", "role": "owner"}
        proof["artifacts"][0]["permissions_before"].append(owner)
        proof["artifacts"][0]["permissions_after"] = [
            owner, *proof["artifacts"][0]["permissions_after"]
        ]
        failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
        self.assertEqual(failures, [])

    def test_shared_urls_must_be_https_drive_urls_for_the_same_id(self):
        mutations = (
            lambda manifest, record: manifest["drive"][0].update(url="not-a-url"),
            lambda manifest, record: manifest["drive"][0].update(
                url=f"https://example.test/file/d/{record['id']}/view"
            ),
            lambda manifest, record: manifest["drive"][0].update(
                url="https://drive.google.com/file/d/different-id/view"
            ),
            lambda manifest, record: manifest["drive"][0].update(
                url=f"https://drive.google.com:bad/file/d/{record['id']}/view"
            ),
            lambda manifest, record: record.update(
                url_after=f"https://drive.google.com/file/d/{record['id']}/view?changed=1"
            ),
        )
        for mutate in mutations:
            manifest, proof, proof_file = self.make_drive_proof()
            mutate(manifest, proof["artifacts"][0])
            failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
            with self.subTest(mutate=mutate):
                self.assertTrue(any("共有URL" in failure for failure in failures))

    def test_every_permission_entry_requires_a_valid_schema_and_identity(self):
        malformed = (
            [{"type": "user", "role": "reader"}],
            [{"id": "reader", "type": "user", "role": "unknown"}],
            [{"id": "reader", "type": "unknown", "role": "reader"}],
            [{"id": "   ", "type": "user", "role": "reader"}],
            [{"id": "domain-reader", "type": "domain", "role": "reader"}],
            [{"id": "reader", "type": "user", "role": "reader"}, None],
        )
        for permissions in malformed:
            manifest, proof, proof_file = self.make_drive_proof()
            proof["artifacts"][0]["permissions_before"] = permissions
            proof["artifacts"][0]["permissions_after"] = permissions
            failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
            with self.subTest(permissions=permissions):
                self.assertTrue(any("共有権限" in failure for failure in failures))

    def test_permission_deleted_must_be_boolean_and_false_remains_effective(self):
        malformed_deleted_values = (None, "true", 1, [], {})
        for deleted in malformed_deleted_values:
            manifest, proof, proof_file = self.make_drive_proof()
            permission = {
                "id": "reader", "type": "user", "role": "reader",
                "deleted": deleted,
            }
            proof["artifacts"][0]["permissions_before"] = [permission]
            proof["artifacts"][0]["permissions_after"] = [permission]
            failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
            with self.subTest(deleted=deleted):
                self.assertTrue(any("共有権限" in failure for failure in failures))

        manifest, proof, proof_file = self.make_drive_proof()
        permission = {
            "id": "reader", "type": "user", "role": "reader",
            "deleted": False,
        }
        proof["artifacts"][0]["permissions_before"] = [permission]
        proof["artifacts"][0]["permissions_after"] = [permission]
        failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
        self.assertEqual(failures, [])

        manifest, proof, proof_file = self.make_drive_proof()
        deleted_permission = {
            "id": "deleted-reader", "type": "user", "role": "reader",
            "deleted": True,
        }
        for key in ("permissions_before", "permissions_after"):
            proof["artifacts"][0][key].append(deleted_permission)
        failures, _ = self.verify_drive_proof(manifest, proof, proof_file)
        self.assertEqual(failures, [])

    def test_all_deleted_grantees_fail_all_37_results_and_cli(self):
        manifest, proof, proof_file = self.make_drive_proof()
        deleted_permission = {
            "id": "deleted-reader", "type": "user", "role": "reader",
            "deleted": True,
        }
        for record in proof["artifacts"]:
            record["permissions_before"] = [deleted_permission]
            record["permissions_after"] = [deleted_permission]
        failures, results = self.verify_drive_proof(manifest, proof, proof_file)
        self.assertEqual(len(results), release_manifest.EXPECTED_PDFS + 1)
        self.assertTrue(failures)
        self.assertTrue(all(not result["ok"] for result in results))

        manifest["verification"] = {"preupload": None, "postupload": None}
        output = io.StringIO()
        errors = io.StringIO()
        with (
            patch.object(release_manifest, "build_manifest", return_value=manifest),
            patch.object(release_manifest, "preupload_failures", return_value=[]),
            patch.object(
                release_manifest.sys,
                "argv",
                [os.fsdecode(MODULE_PATH), "--drive-proof", str(proof_file)],
            ),
            redirect_stdout(output),
            redirect_stderr(errors),
        ):
            self.assertEqual(release_manifest.main(), 1)
        self.assertNotIn("Drive 配送検証 OK", output.getvalue())
        self.assertIn("共有権限", errors.getvalue())

    def test_permission_expiration_schema_type_and_effective_time(self):
        verified_at = datetime(2026, 1, 1, 12, tzinfo=timezone.utc)
        malformed = (
            None,
            {"not": "a timestamp"},
            "not-a-timestamp",
            "2026-01-02",
            "2026-01-02T00:00:00",
            "2026-01-02T00:00:00+24:00",
            "2026-01-02T00:00:00-24:00",
            "2026-01-02T00:00:00+00:60",
            "2026-01-02T00:00:00-00:60",
            "2026-01-02T00:00:00+23:60",
            "2026-01-02T00:00:00+0:00",
            "2026-01-02T00:00:00+00:0",
            "2026-01-02T00:00:00+0000",
            "2026-13-02T00:00:00Z",
            "2026-01-32T00:00:00Z",
            "2026-01-02T25:00:00Z",
            "2026-01-02T00:60:00Z",
            "2026-01-02T00:00:61Z",
        )
        for expiration in malformed:
            manifest, proof, proof_file = self.make_drive_proof()
            permission = {
                "id": "reader", "type": "user", "role": "reader",
                "expirationTime": expiration,
            }
            proof["artifacts"][0]["permissions_before"] = [permission]
            proof["artifacts"][0]["permissions_after"] = [permission]
            failures, _ = self.verify_drive_proof(
                manifest, proof, proof_file, verified_at
            )
            with self.subTest(expiration=expiration):
                self.assertTrue(any("共有権限" in failure for failure in failures))

        for permission_type in ("anyone", "domain"):
            manifest, proof, proof_file = self.make_drive_proof()
            permission = {
                "id": "reader", "type": permission_type, "role": "reader",
                "expirationTime": "2026-01-02T00:00:00Z",
            }
            if permission_type == "domain":
                permission["domain"] = "example.com"
            proof["artifacts"][0]["permissions_before"] = [permission]
            proof["artifacts"][0]["permissions_after"] = [permission]
            failures, _ = self.verify_drive_proof(
                manifest, proof, proof_file, verified_at
            )
            with self.subTest(permission_type=permission_type):
                self.assertTrue(any("共有権限" in failure for failure in failures))

        for expiration in (
            "2026-01-03T12:00:00+23:59",
            "2026-01-02T00:00:00-23:59",
            "2026-01-02T00:00:00+00:00",
            "2026-01-02T00:00:00-00:00",
            "2026-01-02T00:00:00Z",
        ):
            permission = {
                "id": "reader", "type": "user", "role": "reader",
                "expirationTime": expiration,
            }
            valid, parsed = release_manifest._permission_expiration(permission)
            manifest, proof, proof_file = self.make_drive_proof()
            proof["artifacts"][0]["permissions_before"] = [permission]
            proof["artifacts"][0]["permissions_after"] = [permission]
            failures, _ = self.verify_drive_proof(
                manifest, proof, proof_file, verified_at
            )
            with self.subTest(valid_expiration=expiration):
                self.assertTrue(valid)
                self.assertIsNotNone(parsed)
                self.assertEqual(failures, [])

        manifest, proof, proof_file = self.make_drive_proof()
        future_permission = {
            "id": "reader", "type": "group", "role": "reader",
            "expirationTime": "2026-01-02T01:00:00+09:00",
        }
        proof["artifacts"][0]["permissions_before"] = [future_permission]
        proof["artifacts"][0]["permissions_after"] = [future_permission]
        failures, _ = self.verify_drive_proof(
            manifest, proof, proof_file, verified_at
        )
        self.assertEqual(failures, [])
        failures, _ = self.verify_drive_proof(
            manifest, proof, proof_file,
            datetime(2026, 1, 2, 16, tzinfo=timezone.utc),
        )
        self.assertTrue(any("共有権限" in failure for failure in failures))

        manifest, proof, proof_file = self.make_drive_proof()
        boundary_permission = {
            "id": "reader", "type": "user", "role": "reader",
            "expirationTime": verified_at.isoformat(),
        }
        proof["artifacts"][0]["permissions_before"] = [boundary_permission]
        proof["artifacts"][0]["permissions_after"] = [boundary_permission]
        failures, _ = self.verify_drive_proof(
            manifest, proof, proof_file, verified_at
        )
        self.assertTrue(any("共有権限" in failure for failure in failures))

    def test_offset_bounds_reject_all_37_without_success_claim(self):
        verified_at = datetime(2026, 1, 1, 12, tzinfo=timezone.utc)
        for offset in ("+00:60", "-00:60"):
            expiration = f"2026-01-02T00:00:00{offset}"
            valid, parsed = release_manifest._permission_expiration(
                {
                    "id": "reader", "type": "user", "role": "reader",
                    "expirationTime": expiration,
                }
            )
            with self.subTest(offset=offset, layer="direct"):
                self.assertFalse(valid)
                self.assertIsNone(parsed)

            manifest, proof, proof_file = self.make_drive_proof()
            permission = {
                "id": "reader", "type": "user", "role": "reader",
                "expirationTime": expiration,
            }
            for record in proof["artifacts"]:
                record["permissions_before"] = [permission]
                record["permissions_after"] = [permission]
            failures, results = self.verify_drive_proof(
                manifest, proof, proof_file, verified_at
            )
            with self.subTest(offset=offset, layer="validator"):
                self.assertEqual(len(failures), release_manifest.EXPECTED_PDFS + 1)
                self.assertEqual(len(results), release_manifest.EXPECTED_PDFS + 1)
                self.assertTrue(all(not result["ok"] for result in results))

            manifest["verification"] = {"preupload": None, "postupload": None}
            output = io.StringIO()
            errors = io.StringIO()
            with (
                patch.object(release_manifest, "build_manifest", return_value=manifest),
                patch.object(release_manifest, "preupload_failures", return_value=[]),
                patch.object(
                    release_manifest.sys,
                    "argv",
                    [os.fsdecode(MODULE_PATH), "--drive-proof", str(proof_file)],
                ),
                redirect_stdout(output),
                redirect_stderr(errors),
            ):
                exit_code = release_manifest.main(verified_at)
            with self.subTest(offset=offset, layer="cli"):
                self.assertEqual(exit_code, 1)
                self.assertNotIn("Drive 配送検証 OK", output.getvalue())
                self.assertIn("共有権限", errors.getvalue())

    def test_all_expired_permissions_fail_cli_but_mixed_active_sharing_passes(self):
        verified_at = datetime(2026, 1, 1, 12, tzinfo=timezone.utc)
        manifest, proof, proof_file = self.make_drive_proof()
        expired_permission = {
            "id": "expired-reader", "type": "user", "role": "reader",
            "expirationTime": "2025-12-31T23:59:59Z",
        }
        for record in proof["artifacts"]:
            record["permissions_before"] = [expired_permission]
            record["permissions_after"] = [expired_permission]
        failures, results = self.verify_drive_proof(
            manifest, proof, proof_file, verified_at
        )
        self.assertEqual(len(results), release_manifest.EXPECTED_PDFS + 1)
        self.assertTrue(failures)
        self.assertTrue(all(not result["ok"] for result in results))

        manifest["verification"] = {"preupload": None, "postupload": None}
        output = io.StringIO()
        errors = io.StringIO()
        with (
            patch.object(release_manifest, "build_manifest", return_value=manifest),
            patch.object(release_manifest, "preupload_failures", return_value=[]),
            patch.object(
                release_manifest.sys,
                "argv",
                [os.fsdecode(MODULE_PATH), "--drive-proof", str(proof_file)],
            ),
            redirect_stdout(output),
            redirect_stderr(errors),
        ):
            self.assertEqual(release_manifest.main(verified_at), 1)
        self.assertNotIn("Drive 配送検証 OK", output.getvalue())
        self.assertIn("共有権限", errors.getvalue())
        self.assertEqual(
            manifest["drive_readback"]["checked_at"], verified_at.isoformat()
        )

        manifest, proof, proof_file = self.make_drive_proof()
        for record in proof["artifacts"]:
            record["permissions_before"].append(expired_permission)
            record["permissions_after"].append(expired_permission)
        failures, results = self.verify_drive_proof(
            manifest, proof, proof_file, verified_at
        )
        self.assertEqual(failures, [])
        self.assertTrue(all(result["ok"] for result in results))

        manifest["verification"] = {"preupload": None, "postupload": None}
        output = io.StringIO()
        with (
            patch.object(release_manifest, "build_manifest", return_value=manifest),
            patch.object(release_manifest, "preupload_failures", return_value=[]),
            patch.object(
                release_manifest.sys,
                "argv",
                [os.fsdecode(MODULE_PATH), "--drive-proof", str(proof_file)],
            ),
            redirect_stdout(output),
        ):
            self.assertEqual(release_manifest.main(verified_at), 0)
        self.assertIn(verified_at.isoformat(), output.getvalue())
        self.assertEqual(
            manifest["verification"]["postupload"]["checked_at"],
            verified_at.isoformat(),
        )

    def test_retired_remote_check_is_explicitly_rejected_before_build(self):
        result = subprocess.run(
            [release_manifest.sys.executable, os.fsdecode(MODULE_PATH), "--remote-check"],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("--remote-check は廃止", result.stderr)
        self.assertNotIn("rclone", result.stderr)

    def test_preupload_only_success_does_not_claim_drive_delivery(self):
        manifest = self.valid_manifest()
        manifest["verification"] = {"preupload": None, "postupload": None}
        output = io.StringIO()
        with (
            patch.object(release_manifest, "build_manifest", return_value=manifest),
            patch.object(release_manifest, "preupload_failures", return_value=[]),
            patch.object(release_manifest.sys, "argv", [os.fsdecode(MODULE_PATH)]),
            redirect_stdout(output),
        ):
            self.assertEqual(release_manifest.main(), 0)
        self.assertIn("Drive配送は未検証", output.getvalue())

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
