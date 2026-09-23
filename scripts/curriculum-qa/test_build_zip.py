#!/usr/bin/env python3
"""build-zip.sh の失敗耐性と並列実行を確認する退行テスト。"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BUILD_SCRIPT = REPO_ROOT / "scripts" / "build-zip.sh"
ZIP_NAME = "task-app-curriculum-v1.1.zip"
REQUIRED_FILES = (
    "README.md",
    ".env.example",
    ".mise.toml",
    ".node-version",
    "doc/SUPPORTED_ENVIRONMENTS.md",
    "scripts/scaffold-from-scratch.sh",
    "scripts/verify-scaffold-database.cjs",
)
SUPPORT_DIRECTORIES = (
    "_app-api-trpc",
    "_app-base",
    "_app-components",
    "_constants",
    "_docker",
    "_lib-base",
    "_lib-utils",
    "_prisma",
    "_seed",
    "_server-base",
    "_server-routers",
    "_trpc-base",
    "_ui-components",
)


class BuildZipTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "repo"
        (self.root / "scripts/curriculum-qa").mkdir(parents=True)
        shutil.copy2(BUILD_SCRIPT, self.root / "scripts/build-zip.sh")

        for relative_path in REQUIRED_FILES:
            target = self.root / relative_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(f"fixture: {relative_path}\n", encoding="utf-8")

        for directory in SUPPORT_DIRECTORIES:
            target = self.root / "scripts" / directory
            target.mkdir(parents=True)
            (target / "fixture.txt").write_text(directory, encoding="utf-8")

        bin_dir = self.root / "test-bin"
        bin_dir.mkdir()
        zip_command = bin_dir / "zip"
        zip_command.write_text(
            """#!/usr/bin/env python3
import pathlib
import sys
import zipfile

output = pathlib.Path(sys.argv[2])
source = pathlib.Path(sys.argv[3])
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    for path in source.rglob("*"):
        if path.is_file() and path.name != ".DS_Store":
            archive.write(path, path.as_posix())
""",
            encoding="utf-8",
        )
        zip_command.chmod(0o755)

        checker = self.root / "scripts/curriculum-qa/check-sale-package.sh"
        checker.write_text(
            """#!/usr/bin/env bash
set -euo pipefail
[ -s "$1" ]
if [ -n "${BUILD_ZIP_TEST_LOG:-}" ]; then
  printf '%s\\n' "$1" >> "${BUILD_ZIP_TEST_LOG}"
fi
case "${BUILD_ZIP_TEST_MODE:-pass}" in
  fail) exit 42 ;;
  interrupt) kill -TERM "$PPID" ;;
  wait) sleep 0.2 ;;
esac
""",
            encoding="utf-8",
        )

    def tearDown(self) -> None:
        self.temp.cleanup()

    @property
    def output_zip(self) -> Path:
        return self.root / ZIP_NAME

    def run_build(self, mode: str = "pass", log: Path | None = None) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        env["PATH"] = f"{self.root / 'test-bin'}:{env['PATH']}"
        env["BUILD_ZIP_TEST_MODE"] = mode
        if log is not None:
            env["BUILD_ZIP_TEST_LOG"] = str(log)
        return subprocess.run(
            ["bash", str(self.root / "scripts/build-zip.sh")],
            cwd=self.root,
            env=env,
            capture_output=True,
            text=True,
            timeout=20,
        )

    def assert_no_temporary_output(self) -> None:
        self.assertEqual([], list(self.root.glob(f".{ZIP_NAME}.*")))

    def test_success_replaces_output_only_after_validation(self) -> None:
        self.output_zip.write_bytes(b"previous archive")
        result = self.run_build()

        self.assertEqual(0, result.returncode, result.stderr)
        self.assertNotEqual(b"previous archive", self.output_zip.read_bytes())
        with zipfile.ZipFile(self.output_zip) as archive:
            self.assertIsNone(archive.testzip())
        self.assert_no_temporary_output()

    def test_validation_failure_keeps_previous_archive(self) -> None:
        previous = b"known-good archive"
        self.output_zip.write_bytes(previous)
        result = self.run_build("fail")

        self.assertNotEqual(0, result.returncode)
        self.assertEqual(previous, self.output_zip.read_bytes())
        self.assert_no_temporary_output()

    def test_interruption_keeps_previous_archive_and_cleans_candidate(self) -> None:
        previous = b"known-good archive"
        self.output_zip.write_bytes(previous)
        result = self.run_build("interrupt")

        self.assertNotEqual(0, result.returncode)
        self.assertEqual(previous, self.output_zip.read_bytes())
        self.assert_no_temporary_output()

    def test_missing_source_keeps_previous_archive(self) -> None:
        previous = b"known-good archive"
        self.output_zip.write_bytes(previous)
        (self.root / "README.md").unlink()
        result = self.run_build()

        self.assertNotEqual(0, result.returncode)
        self.assertIn("README.md", result.stderr)
        self.assertEqual(previous, self.output_zip.read_bytes())
        self.assert_no_temporary_output()

    def test_parallel_runs_use_independent_workspaces(self) -> None:
        log = self.root / "candidate-paths.log"
        env = os.environ.copy()
        env["PATH"] = f"{self.root / 'test-bin'}:{env['PATH']}"
        env["BUILD_ZIP_TEST_MODE"] = "wait"
        env["BUILD_ZIP_TEST_LOG"] = str(log)
        command = ["bash", str(self.root / "scripts/build-zip.sh")]

        processes = [
            subprocess.Popen(
                command,
                cwd=self.root,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            for _ in range(2)
        ]
        results = [process.communicate(timeout=20) for process in processes]

        for process, (_stdout, stderr) in zip(processes, results, strict=True):
            self.assertEqual(0, process.returncode, stderr)
        build_dirs = {
            re.search(r"ビルド一時ディレクトリ: (.+)", stdout).group(1)
            for stdout, _stderr in results
        }
        self.assertEqual(2, len(build_dirs))
        candidate_paths = set(log.read_text(encoding="utf-8").splitlines())
        self.assertEqual(2, len(candidate_paths))
        with zipfile.ZipFile(self.output_zip) as archive:
            self.assertIsNone(archive.testzip())
        self.assert_no_temporary_output()


if __name__ == "__main__":
    unittest.main()
