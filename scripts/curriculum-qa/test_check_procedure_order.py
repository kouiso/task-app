#!/usr/bin/env python3
"""check_procedure_order.py の退行テスト。

止めるべきもの（未定義の手続きの呼び出し）と、止めてはいけないもの（配布済みの auth、
同じ日に定義したもの、散文での言及）の両方を置く。片方だけでは、全部を止める検査でも
全部を通す検査でも緑になってしまう。
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_procedure_order import collect_definitions, find_early_calls  # noqa: E402

DAY11 = "day11_x.md"
DAY12 = "day12_x.md"

CASES: list[tuple[str, dict[str, str], list[tuple[str, int]]]] = [
    (
        "翌日に定義する手続きを呼んだら拾う",
        {
            DAY11: "```tsx\nutils.project.getById.invalidate({});\n```",
            DAY12: "```tsx\n  getById: protectedProcedure\n```",
        },
        [(DAY11, 2)],
    ),
    (
        "同じ日に定義していれば通す",
        {
            DAY11: "```tsx\n  getById: protectedProcedure\napi.project.getById.useQuery();\n```",
        },
        [],
    ),
    (
        "前の日に定義していれば通す",
        {
            DAY11: "```tsx\n  getById: protectedProcedure\n```",
            DAY12: "```tsx\napi.project.getById.useQuery();\n```",
        },
        [],
    ),
    (
        "配布済みの auth は対象外",
        {
            DAY11: "```tsx\napi.auth.login.useMutation();\n```",
            DAY12: "```tsx\n  login: publicProcedure\n```",
        },
        [],
    ),
    (
        "散文での言及は対象外",
        {
            DAY11: "`api.project.getById` は Day 12 で書きます。\n",
            DAY12: "```tsx\n  getById: protectedProcedure\n```",
        },
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
            defs = collect_definitions(paths)
            got = [(p.name, line) for p in paths for line, _, _ in find_early_calls(p, defs)]
        if sorted(got) != sorted(expected):
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    if failed:
        print(f"❌ check_procedure_order 自己テスト {failed}/{len(CASES)} 失敗")
        return 1
    print(f"✅ check_procedure_order 自己テスト {len(CASES)}/{len(CASES)} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
