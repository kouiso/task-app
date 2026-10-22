#!/usr/bin/env python3
"""scaffold-from-scratch.sh が入れる Biome を、リポジトリの lockfile と同じ版に固定しているかを見る。

範囲指定（^2.4.15）のままだと、読者が土台を作る日の最新版が入る。新しい版は
shadcn/ui の calendar.tsx を新規ルールで error にして、`biome check --write` が
失敗し、Day 01 の土台作りが途中で止まった（2.6.2 で実測）。
"""

import json
import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


class ScaffoldBiomePinTest(unittest.TestCase):
    def test_biome_is_pinned_to_locked_version(self) -> None:
        script = (REPO_ROOT / "scripts" / "scaffold-from-scratch.sh").read_text(encoding="utf-8")
        match = re.search(r"^\s*@biomejs/biome@(\S+)\s*$", script, re.MULTILINE)
        self.assertIsNotNone(match, "scaffold に @biomejs/biome の指定が無い")
        lock = json.loads((REPO_ROOT / "package-lock.json").read_text(encoding="utf-8"))
        locked = lock["packages"]["node_modules/@biomejs/biome"]["version"]
        self.assertEqual(match.group(1), locked)


if __name__ == "__main__":
    unittest.main()
