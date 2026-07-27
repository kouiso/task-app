#!/usr/bin/env python3
"""check_step_ref.py の退行テスト。

止めるもの（存在しない Step への参照）と、止めてはいけないもの（在る Step、他の日への
参照、コードブロックの中）の両方を置く。片方だけでは、全部を止める検査でも全部を通す
検査でも緑になってしまう。
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_step_ref import find_bad_refs, headings  # noqa: E402

CASES: list[tuple[str, dict[str, str], list[tuple[str, int]]]] = [
    (
        "この日に無い Step を指したら拾う",
        {"day05_x.md": "### Step 1: あ\n\nStep 9 で書いた値を使います。\n"},
        [("day05_x.md", 3)],
    ),
    (
        "在る Step なら通す",
        {"day05_x.md": "### Step 1: あ\n\nStep 1 で書いた値を使います。\n"},
        [],
    ),
    (
        "2段の見出しでも在ると認める",
        {"day02_x.md": "## Step 1: あ\n\nStep 1 で書いた値を使います。\n"},
        [],
    ),
    (
        "区切りの前に空白があっても在ると認める",
        {"day17_x.md": "### Step 3 : あ\n\nStep 3 で書いた値を使います。\n"},
        [],
    ),
    (
        "他の日への参照は、その日の見出しで判定する",
        {
            "day11_x.md": "### Step 9: あ\n",
            "day12_x.md": "### Step 0: い\n\nDay 11 Step 9 で仮定義した値を消します。\n",
        },
        [],
    ),
    (
        "他の日に無い Step を指したら拾う",
        {
            "day11_x.md": "### Step 1: あ\n",
            "day12_x.md": "### Step 0: い\n\nDay 11 Step 9 で仮定義した値を消します。\n",
        },
        [("day12_x.md", 3)],
    ),
    (
        "コードブロックの中は対象外",
        {"day05_x.md": "### Step 1: あ\n\n```tsx\n// Step 9 で書いた値\n```\n"},
        [],
    ),
]


def main() -> int:
    failed = 0
    for name, files, expected in CASES:
        with tempfile.TemporaryDirectory() as d:
            paths = []
            for fname, body in files.items():
                p = Path(d) / fname
                p.write_text(body, encoding="utf-8")
                paths.append(p)
            by_day = {
                int(p.name[3:5]): headings(p.read_text(encoding="utf-8")) for p in paths
            }
            got = []
            for p in paths:
                own = by_day[int(p.name[3:5])]
                got += [(p.name, line) for line, _, _ in find_bad_refs(p, own, by_day)]
        if sorted(got) != sorted(expected):
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    if failed:
        print(f"❌ check_step_ref 自己テスト {failed}/{len(CASES)} 失敗")
        return 1
    print(f"✅ check_step_ref 自己テスト {len(CASES)}/{len(CASES)} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
