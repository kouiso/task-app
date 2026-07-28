#!/usr/bin/env python3
"""check_procedure_order.py の退行テスト。

止めるべきもの（未定義の手続きの呼び出し）と、止めてはいけないもの（配布済みの auth、
同じ日に定義したもの、散文での言及）の両方を置く。片方だけでは、全部を止める検査でも
全部を通す検査でも緑になってしまう。

期待値は (ファイル名, 行番号, 定義された日) で書く。定義がどこにも無い呼び出しは
第3要素が None になる。ルーター違いと綴り違いを区別するため、日まで見る。
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_procedure_order import collect_definitions, find_early_calls  # noqa: E402

DAY11 = "day11_x.md"
DAY12 = "day12_x.md"
DAY13 = "day13_x.md"


def block(router: str, *body: str) -> str:
    head = f"```tsx\n// filepath: src/server/api/routers/{router}.ts\n"
    return head + "".join(line + "\n" for line in body) + "```"


CASES: list[tuple[str, dict[str, str], list[tuple[str, int, int | None]]]] = [
    (
        "翌日に定義する手続きを呼んだら拾う",
        {
            DAY11: "```tsx\nutils.project.getById.invalidate({});\n```",
            DAY12: block("project", "  getById: protectedProcedure"),
        },
        [(DAY11, 2, 12)],
    ),
    (
        "同じ日に定義していれば通す",
        {
            DAY11: block(
                "project",
                "  getById: protectedProcedure",
                "api.project.getById.useQuery();",
            ),
        },
        [],
    ),
    (
        "前の日に定義していれば通す",
        {
            DAY11: block("project", "  getById: protectedProcedure"),
            DAY12: "```tsx\napi.project.getById.useQuery();\n```",
        },
        [],
    ),
    (
        "配布済みの auth は対象外",
        {
            DAY11: "```tsx\napi.auth.login.useMutation();\n```",
            DAY12: block("auth", "  login: publicProcedure"),
        },
        [],
    ),
    (
        "散文での言及は対象外",
        {
            DAY11: "`api.project.getById` は Day 12 で書きます。\n",
            DAY12: block("project", "  getById: protectedProcedure"),
        },
        [],
    ),
    (
        "同名でもルーターが違えば別の手続きとして見る",
        {
            DAY12: block(
                "project",
                "  getById: protectedProcedure",
                "api.task.getById.useQuery();",
            ),
            DAY13: block("task", "  getById: protectedProcedure"),
        },
        [(DAY12, 4, 13)],
    ),
    (
        "どこにも定義が無い手続きは拾う",
        {
            DAY11: "```tsx\napi.project.getByld.useQuery();\n```",
            DAY12: block("project", "  getById: protectedProcedure"),
        },
        [(DAY11, 2, None)],
    ),
    (
        "4連で開いたブロックは3連では閉じない",
        {
            DAY11: "````md\n```\napi.project.getById.useQuery();\n```\n````",
            DAY12: block("project", "  getById: protectedProcedure"),
        },
        [(DAY11, 3, 12)],
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
            got = [
                (p.name, line, defined)
                for p in paths
                for line, _, defined in find_early_calls(p, defs)
            ]
        if sorted(got, key=repr) != sorted(expected, key=repr):
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    if failed:
        print(f"❌ check_procedure_order 自己テスト {failed}/{len(CASES)} 失敗")
        return 1
    print(f"✅ check_procedure_order 自己テスト {len(CASES)}/{len(CASES)} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
