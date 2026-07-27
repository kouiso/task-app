#!/usr/bin/env python3
"""check_crossref.py の退行テスト。

過去に見逃した形を、直したあとも見逃さないことを確かめる。
実行: python3 scripts/curriculum-qa/test_check_crossref.py
"""

import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT = Path(__file__).with_name("check_crossref.py")


def run(files: dict[str, str]) -> int:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for name, body in files.items():
            (root / name).write_text(body, encoding="utf-8")
        result = subprocess.run(
            [sys.executable, str(SCRIPT), str(root)],
            capture_output=True,
            text=True,
        )
        return result.returncode


CASES: list[tuple[str, dict[str, str], int]] = [
    (
        "箇条書きの続き行にある語も照合する",
        {
            "day01_a.md": "# Day 01\n\n本文です。\n",
            "day02_b.md": "# Day 02\n\n- Day 01 で作った\n  `MissingToken` を使います。\n",
        },
        1,
    ),
    (
        "折り返した地の文の語も照合する",
        {
            "day01_a.md": "# Day 01\n\n本文です。\n",
            "day02_b.md": "# Day 02\n\nDay 01 で作った\n`MissingToken` を使います。\n",
        },
        1,
    ),
    (
        "実在する語は通す",
        {
            "day01_a.md": "# Day 01\n\nconst ExistingToken = 1;\n",
            "day02_b.md": "# Day 02\n\n- Day 01 で作った\n  `ExistingToken` を使います。\n",
        },
        0,
    ),
    (
        "先送りを述べただけの行は証拠にしない",
        {
            "day01_a.md": "# Day 01\n\n`LaterToken` は Day 02 以降で足していきます。\n",
            "day02_b.md": "# Day 02\n\nDay 01 の `LaterToken` を使います。\n",
        },
        1,
    ),
    (
        "対象 day 自身にも触れている行は証拠にする",
        {
            "day01_a.md": "# Day 01\n\nDay 01 の `SharedToken` は Day 02 でも使います。\n",
            "day02_b.md": "# Day 02\n\nconst SharedToken = 1;\n\nDay 01 の `SharedToken` を使います。\n",
        },
        0,
    ),
    (
        "折り返した先送りの文を証拠に数えない",
        {
            # day10 の本文では `Wrapped` が Day 11 のものだと述べている。
            # 行が折り返されているため、生の行で見ると2行目が day 指定なしに見える。
            "day10_a.md": "# Day 10\n\nDay 11 で作る\n`Wrapped` をあとで使います。\n",
            "day11_b.md": "# Day 11\n\n本文です。\n",
            "day12_c.md": "# Day 12\n\nDay 10 の `Wrapped` を使います。\n",
        },
        1,
    ),
    (
        "同じ day 番号のファイルが2つあれば止める",
        {
            "day01_a.md": "# Day 01\n\n本文です。\n",
            "day01_b.md": "# Day 01\n\n本文です。\n",
        },
        2,
    ),
]


def main() -> int:
    failures = 0
    for name, files, expected in CASES:
        actual = run(files)
        if actual == expected:
            print(f"✅ {name}")
        else:
            failures += 1
            print(f"❌ {name}: 終了コード {actual}（期待 {expected}）")
    if failures:
        print(f"❌ {failures} 件失敗")
        return 1
    print(f"✅ 全 {len(CASES)} 件 PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
