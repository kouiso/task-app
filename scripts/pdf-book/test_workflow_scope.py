#!/usr/bin/env python3
"""削除・改名だけのPRも実セレクタで検査し、販売用PDFの検査漏れを防ぐ。"""

from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/pdf-book-gate.yml"
MAKEFILE = ROOT / "Makefile"


def run(command: list[str], cwd: Path, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        env=env,
        text=True,
        capture_output=True,
        check=True,
    )


def selector_script(workflow: Path) -> str:
    lines = workflow.read_text(encoding="utf-8").splitlines()
    start = next(index for index, line in enumerate(lines) if line.strip() == "id: select")
    run_line = next(
        index for index in range(start + 1, len(lines)) if lines[index].strip() == "run: |"
    )
    run_indent = len(lines[run_line]) - len(lines[run_line].lstrip())
    body: list[str] = []
    for line in lines[run_line + 1 :]:
        indent = len(line) - len(line.lstrip())
        if line.strip() and indent <= run_indent:
            break
        body.append(line[run_indent + 2 :] if line.strip() else "")
    return "\n".join(body) + "\n"


def selected_scope(workflow: Path, change: str, source: str, destination: str | None = None) -> str:
    with tempfile.TemporaryDirectory() as directory:
        repo = Path(directory)
        run(["git", "init", "-q"], repo)
        run(["git", "config", "user.email", "test@example.invalid"], repo)
        run(["git", "config", "user.name", "test"], repo)
        path = repo / source
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("baseline\n", encoding="utf-8")
        (repo / "package.json").write_text("{}\n", encoding="utf-8")
        (repo / "package-lock.json").write_text("{}\n", encoding="utf-8")
        run(["git", "add", "."], repo)
        run(["git", "commit", "-qm", "baseline"], repo)
        base_branch = run(["git", "branch", "--show-current"], repo).stdout.strip()
        run(["git", "checkout", "-qb", "change"], repo)
        if change == "delete":
            path.unlink()
        elif change == "rename" and destination:
            target = repo / destination
            target.parent.mkdir(parents=True, exist_ok=True)
            run(["git", "mv", source, destination], repo)
        else:
            raise AssertionError((change, destination))
        run(["git", "add", "-A"], repo)
        run(["git", "commit", "-qm", change], repo)
        run(["git", "checkout", "-q", base_branch], repo)
        run(["git", "merge", "--no-ff", "-qm", "merge", "change"], repo)

        runner_temp = repo / "runner-temp"
        runner_temp.mkdir()
        output = repo / "github-output"
        env = dict(os.environ)
        env.update({"RUNNER_TEMP": str(runner_temp), "GITHUB_OUTPUT": str(output)})
        result = subprocess.run(
            ["bash", "-euo", "pipefail", "-c", selector_script(workflow)],
            cwd=repo,
            env=env,
            text=True,
            capture_output=True,
        )
        if result.returncode:
            raise AssertionError(f"selector failed: {result.stderr}\n{result.stdout}")
        values = dict(line.split("=", 1) for line in output.read_text().splitlines())
        return values["scope"]


class DeletionScopeTest(unittest.TestCase):
    cases = (
        "material/30days-curriculum/day07.md",
        "material/style/book.css",
        "scripts/pdf-book/helper.py",
    )

    def test_sends_deleted_release_inputs_to_full_inventory(self):
        for source in self.cases:
            with self.subTest(source=source):
                self.assertEqual(selected_scope(WORKFLOW, "delete", source), "all")

    def test_deleted_nested_screenshot_selects_strict_all(self):
        source = "material/30days-curriculum/screenshots/day14/画面 1.png"
        self.assertEqual(selected_scope(WORKFLOW, "delete", source), "all")

    def test_outward_renamed_nested_screenshot_selects_strict_all(self):
        source = "material/30days-curriculum/screenshots/day14/画面 1.png"
        self.assertEqual(selected_scope(WORKFLOW, "rename", source, "archive/画面 1.png"), "all")

    def test_checks_both_sides_of_rename(self):
        cases = (
            ("material/30days-curriculum/day07.md", "archive/day07.md"),
            ("material/style/book.css", "archive/book.css"),
            ("scripts/pdf-book/helper.py", "archive/helper.py"),
        )
        for source, destination in cases:
            with self.subTest(source=source):
                self.assertEqual(
                    selected_scope(WORKFLOW, "rename", source, destination),
                    "all",
                )

    def test_unrelated_deletion_stays_none(self):
        self.assertEqual(selected_scope(WORKFLOW, "delete", "README.md"), "none")


class CleanReceiptTest(unittest.TestCase):
    def invoke(self, makefile: Path) -> tuple[bool, bool, bool, bool]:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for path in (root / "dist/pdf", root / "dist/.pdf-book-build"):
                path.mkdir(parents=True)
                (path / "artifact").write_text("stale\n", encoding="utf-8")
            receipt = root / "dist/release-build-receipt.json"
            receipt.write_text("{}\n", encoding="utf-8")
            keep = root / "dist/keep.txt"
            keep.write_text("keep\n", encoding="utf-8")
            run(["make", "-f", str(makefile), "book-pdf-clean"], root)
            return (
                (root / "dist/pdf").exists(),
                (root / "dist/.pdf-book-build").exists(),
                receipt.exists(),
                keep.exists(),
            )

    def test_clean_removes_receipt_and_preserves_unrelated_dist(self):
        self.assertEqual(self.invoke(MAKEFILE), (False, False, False, True))


if __name__ == "__main__":
    unittest.main()
