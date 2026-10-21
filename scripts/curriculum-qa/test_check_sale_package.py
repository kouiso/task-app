#!/usr/bin/env python3
"""販売ZIPの余分なファイルと不正なエントリーを実checkerで検査します。"""

from __future__ import annotations

import re
import shutil
import stat
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
ZIP_NAME = "task-app-curriculum-v1.1.zip"


class SalePackageContentTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "repo"
        self.checker = self.root / "scripts/curriculum-qa/check-sale-package.sh"
        self.checker.parent.mkdir(parents=True)
        original = REPO_ROOT / "scripts/curriculum-qa/check-sale-package.sh"
        shutil.copy2(original, self.checker)
        shutil.copy2(REPO_ROOT / "scripts/build-zip.sh", self.root / "scripts/build-zip.sh")

        def declared(name: str) -> list[str]:
            match = re.search(rf"^{name}=\(\s*(.*?)^\)", original.read_text(), re.M | re.S)
            self.assertIsNotNone(match)
            return re.findall(r'"([^"]+)"', match.group(1))

        self.files = [name.removeprefix("task-app/") for name in declared("required_entries")]
        self.files += ["scripts/" + name for name in declared("required_support_files")]
        for relative in self.files:
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(f"fixture: {relative}\n", encoding="utf-8")
        self.archive = self.root / ZIP_NAME
        self.write_archive()

    def write_archive(self, extra: str | None = None, kind: int | None = None) -> None:
        with zipfile.ZipFile(self.archive, "w") as archive:
            for relative in self.files:
                name = "task-app/" + relative
                if kind is not None and relative == "README.md":
                    entry = zipfile.ZipInfo(name)
                    entry.create_system = 3
                    entry.external_attr = (kind | 0o644) << 16
                    archive.writestr(entry, "synthetic special entry")
                else:
                    archive.write(self.root / relative, name)
            if extra:
                archive.writestr("task-app/" + extra, "SYNTHETIC NON-PRODUCT DATA")

    def check(self) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["bash", str(self.checker), str(self.archive)],
            capture_output=True, text=True, timeout=20,
        )

    def test_declared_templates_and_environment_example_are_accepted(self) -> None:
        result = self.check()
        self.assertEqual(0, result.returncode, result.stderr)
        with zipfile.ZipFile(self.archive) as archive:
            self.assertIn("task-app/.env.example", archive.namelist())

    def test_unlisted_payload_is_rejected(self) -> None:
        for extra in (
            "scripts/_lib-base/.env.private",
            "scripts/_lib-base/debug.log",
            "scripts/_lib-base/.cache/result.json",
            "scripts/_lib-base/output.tmp",
            "scripts/_lib-base/node_modules/package/index.js",
            "scripts/_lib-base/unreviewed-template.ts",
            "internal-note.md",
            "../outside.txt",
        ):
            with self.subTest(extra=extra):
                self.write_archive(extra=extra)
                result = self.check()
                self.assertNotEqual(0, result.returncode, result.stdout)

    def test_duplicate_and_nonregular_entries_are_rejected(self) -> None:
        with self.assertWarns(UserWarning):
            self.write_archive(extra="README.md")
        self.assertNotEqual(0, self.check().returncode)
        for kind in (stat.S_IFLNK, stat.S_IFIFO, stat.S_IFDIR):
            with self.subTest(kind=kind):
                self.write_archive(kind=kind)
                self.assertNotEqual(0, self.check().returncode)

    def test_damaged_payload_is_rejected(self) -> None:
        with zipfile.ZipFile(self.archive) as archive:
            entry = archive.getinfo("task-app/README.md")
        data = bytearray(self.archive.read_bytes())
        offset = entry.header_offset + 30 + len(entry.filename.encode()) + len(entry.extra)
        data[offset] ^= 1
        self.archive.write_bytes(data)
        self.assertNotEqual(0, self.check().returncode)

    def test_contaminated_source_keeps_previous_archive(self) -> None:
        previous = self.archive.read_bytes()
        (self.root / "scripts/_lib-base/.env.private").write_text("SYNTHETIC PRIVATE DATA")
        result = subprocess.run(
            ["bash", str(self.root / "scripts/build-zip.sh")],
            cwd=self.root, capture_output=True, text=True, timeout=20,
        )
        copied_private_data = False
        if result.returncode == 0:
            with zipfile.ZipFile(self.archive) as archive:
                copied_private_data = (
                    archive.read("task-app/scripts/_lib-base/.env.private")
                    == b"SYNTHETIC PRIVATE DATA"
                )
        self.assertNotEqual(0, result.returncode, f"private_data_in_zip={copied_private_data}")
        self.assertEqual(previous, self.archive.read_bytes())
        self.assertEqual([], list(self.root.glob(f".{ZIP_NAME}.*")))


if __name__ == "__main__":
    unittest.main()
