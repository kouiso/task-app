#!/usr/bin/env python3
"""create-next-app 失敗時に配布物を失わないことを確認する。"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCAFFOLD = REPO_ROOT / "scripts/scaffold-from-scratch.sh"
ASSETS = ("README.md", ".env.example", "scripts")


def extract_function() -> str:
    source = SCAFFOLD.read_text(encoding="utf-8")
    match = re.search(
        r"^ensure_empty_or_existing_next_app\(\) [({].*?"
        r"(?=^configure_security_overrides\(\) \{)",
        source,
        re.MULTILINE | re.DOTALL,
    )
    if match is None:
        raise AssertionError("ensure_empty_or_existing_next_app を抽出できません")
    return match.group(0)


class ScaffoldFailureRecoveryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "task-app"
        self.root.mkdir()
        (self.root / "README.md").write_text("reader guide\n", encoding="utf-8")
        (self.root / ".env.example").write_text("DATABASE_URL=example\n", encoding="utf-8")
        (self.root / "scripts").mkdir()
        (self.root / "scripts/fixture.txt").write_text("support\n", encoding="utf-8")

        self.bin_dir = Path(self.temp.name) / "bin"
        self.bin_dir.mkdir()
        self.create_dirs = Path(self.temp.name) / "create-dirs"
        npx = self.bin_dir / "npx"
        npx.write_text(
            """#!/usr/bin/env bash
set -euo pipefail
create_dir="$3"
printf '%s\\n' "$create_dir" >> "$NPX_CREATE_DIR_LOG"
case "$NPX_MODE" in
  fail)
    exit 42
    ;;
  term)
    kill -TERM "$PPID"
    sleep 0.1
    exit 143
    ;;
  success)
    mkdir -p "$create_dir/src/app"
    printf '{"name":"task-app"}\\n' > "$create_dir/package.json"
    printf 'export default function Page() {}\\n' > "$create_dir/src/app/page.tsx"
    ;;
esac
""",
            encoding="utf-8",
        )
        npx.chmod(0o755)

        self.harness = Path(self.temp.name) / "run-function.sh"
        self.harness.write_text(
            "#!/usr/bin/env bash\nset -euo pipefail\n"
            + 'print_error() { printf "%s\\n" "$*" >&2; }\n'
            + extract_function()
            + "\nensure_empty_or_existing_next_app\n",
            encoding="utf-8",
        )
        self.harness.chmod(0o755)

    def tearDown(self) -> None:
        if self.create_dirs.exists():
            for line in self.create_dirs.read_text(encoding="utf-8").splitlines():
                path = Path(line)
                if path.name.startswith("task-app-scaffold-"):
                    shutil.rmtree(path, ignore_errors=True)
        self.temp.cleanup()

    def run_function(self, mode: str) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        env["PATH"] = f"{self.bin_dir}:{env['PATH']}"
        env["TMPDIR"] = str(Path(self.temp.name) / "stashes")
        env["NPX_MODE"] = mode
        env["NPX_CREATE_DIR_LOG"] = str(self.create_dirs)
        Path(env["TMPDIR"]).mkdir(exist_ok=True)
        return subprocess.run(
            ["bash", str(self.harness)],
            cwd=self.root,
            env=env,
            capture_output=True,
            text=True,
            timeout=10,
        )

    def assert_assets_present(self) -> None:
        for relative in ASSETS:
            self.assertTrue(
                (self.root / relative).exists(),
                f"create-next-app 失敗後に {relative} が元の場所から消えました",
            )
        for relative, expected in (
            ("README.md", "reader guide\n"),
            (".env.example", "DATABASE_URL=example\n"),
            ("scripts/fixture.txt", "support\n"),
        ):
            self.assertEqual(expected, (self.root / relative).read_text(encoding="utf-8"))

    def assert_no_transaction_leftovers(self) -> None:
        self.assertEqual([], list(self.root.glob(".task-app-stash.*")))
        stash_root = Path(self.temp.name) / "stashes"
        self.assertEqual([], list(stash_root.iterdir()))
        if self.create_dirs.exists():
            for line in self.create_dirs.read_text(encoding="utf-8").splitlines():
                self.assertFalse(Path(line).exists(), f"一時ディレクトリが残っています: {line}")

    def test_create_next_app_failure_restores_distribution_assets(self) -> None:
        result = self.run_function("fail")
        self.assertEqual(42, result.returncode)
        self.assert_assets_present()
        self.assert_no_transaction_leftovers()

    def test_same_directory_can_be_retried_after_failure(self) -> None:
        first = self.run_function("fail")
        self.assertEqual(42, first.returncode)

        second = self.run_function("success")
        self.assertEqual(0, second.returncode, second.stderr)
        self.assert_assets_present()
        self.assertTrue((self.root / "package.json").is_file())
        self.assert_no_transaction_leftovers()

    def test_term_restores_assets_and_returns_signal_status(self) -> None:
        result = self.run_function("term")
        self.assertEqual(143, result.returncode)
        self.assert_assets_present()
        self.assert_no_transaction_leftovers()

    def test_staging_failure_restores_already_moved_assets(self) -> None:
        real_mv = shutil.which("mv")
        self.assertIsNotNone(real_mv)
        wrapper = self.bin_dir / "mv"
        wrapper.write_text(
            '#!/usr/bin/env bash\n'
            'if [ "$1" = ".env.example" ]; then exit 73; fi\n'
            f'exec "{real_mv}" "$@"\n',
            encoding="utf-8",
        )
        wrapper.chmod(0o755)
        result = self.run_function("success")
        self.assertEqual(73, result.returncode)
        self.assert_assets_present()
        self.assert_no_transaction_leftovers()

    def test_transfer_failure_does_not_leave_a_false_completed_app(self) -> None:
        real_mv = shutil.which("mv")
        wrapper = self.bin_dir / "mv"
        wrapper.write_text(
            '#!/usr/bin/env bash\n'
            'case "$1" in */src) exit 74 ;; esac\n'
            f'exec "{real_mv}" "$@"\n', encoding="utf-8",
        )
        wrapper.chmod(0o755)
        result = self.run_function("success")
        self.assertEqual(74, result.returncode)
        self.assert_assets_present()
        self.assertFalse((self.root / "package.json").exists())
        self.assert_no_transaction_leftovers()
        wrapper.unlink()
        retry = self.run_function("success")
        self.assertEqual(0, retry.returncode, retry.stderr)
        self.assertTrue((self.root / "src/app/page.tsx").is_file())

    def test_existing_directory_is_not_merged_or_deleted(self) -> None:
        (self.root / "src").mkdir()
        (self.root / "src/reader-note.txt").write_text("keep this\n")
        result = self.run_function("success")
        self.assertNotEqual(0, result.returncode)
        self.assertEqual("keep this\n", (self.root / "src/reader-note.txt").read_text())
        self.assertFalse((self.root / "package.json").exists())
        self.assert_assets_present()
        self.assert_no_transaction_leftovers()


if __name__ == "__main__":
    unittest.main()
