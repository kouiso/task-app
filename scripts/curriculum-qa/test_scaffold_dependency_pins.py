#!/usr/bin/env python3
"""scaffold の依存の版が、読者の環境を毎回同じにする形かを見る。"""

import json
import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "scaffold-from-scratch.sh"
LOCK = REPO_ROOT / "package-lock.json"


def script_dependency_version(script: str, name: str) -> str:
    match = re.search(rf"^\s*{re.escape(name)}@(\S+)\s*$", script, re.MULTILINE)
    if match is None:
        raise AssertionError(f"scaffold に {name} の指定が無い")
    return match.group(1)


class ScaffoldDependencyPinTest(unittest.TestCase):
    def test_trpc_packages_are_exactly_pinned_together(self) -> None:
        script = SCRIPT.read_text(encoding="utf-8")
        names = ["@trpc/client", "@trpc/server", "@trpc/react-query", "@trpc/next"]
        versions = [script_dependency_version(script, name) for name in names]
        self.assertEqual(len(set(versions)), 1, f"@trpc の版がそろっていない: {versions}")
        self.assertNotRegex(versions[0], r"^[\^~]", "@trpc は範囲指定ではなく固定にする")

    def test_peer_sensitive_packages_match_locked_versions(self) -> None:
        script = SCRIPT.read_text(encoding="utf-8")
        lock = json.loads(LOCK.read_text(encoding="utf-8"))
        for name in ["@tanstack/react-query", "typescript"]:
            with self.subTest(name=name):
                scaffold_version = script_dependency_version(script, name)
                locked = lock["packages"][f"node_modules/{name}"]["version"]
                self.assertEqual(scaffold_version, locked)


if __name__ == "__main__":
    unittest.main()
