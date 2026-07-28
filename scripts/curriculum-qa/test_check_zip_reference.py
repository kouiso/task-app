#!/usr/bin/env python3
"""check_zip_reference.py の退行テスト。

止めるもの（ZIP に入らない `src/` と見比べさせる）と、止めてはいけないもの
（ZIP に入らない旨を添えてある／照合ではなく作成の指示／scaffold が配るファイルとの
照合／コードブロックの中）の両方を置く。
"""

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_zip_reference import find_refs, main  # noqa: E402

CASES: list[tuple[str, str, list[int]]] = [
    (
        "ZIP に無い src/ との照合を指示したら止める",
        "完成形は、このリポジトリの `src/app/user/[id]/user-detail-client.tsx` と同じです。"
        "手元のコードと見比べてください。\n",
        [1],
    ),
    (
        "ZIP に入らない旨を添えてあれば通す",
        "見比べるときは、この1か所は違って当たり前だと思って読んでください。"
        "（販売用 ZIP に完成版の `src/` は入っていません）\n",
        [],
    ),
    (
        "照合ではなく作成の指示は通す",
        "まず `src/app` の中に `dashboard` フォルダを作ります。\n",
        [],
    ),
    (
        "scaffold が配るファイルとの照合は通す",
        "`src/server/api/routers/_helpers/select.ts` を開き、教材のコードと見比べます。\n",
        [],
    ),
    (
        "prisma/ も ZIP に入らない",
        "`prisma/schema.prisma` と見比べて確認してください。\n",
        [1],
    ),
    (
        "コードブロックの中は対象外",
        "```bash\n# src/app/page.tsx と見比べてください\n```\n",
        [],
    ),
    (
        "src/ とだけ書いた文は置き場を指さない",
        "完成版の src/ と見比べる必要はありません。\n",
        [],
    ),
]


def check_exit_code() -> tuple[int, int]:
    def run(args: list[str]) -> int:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return main(args)

    failed = 0
    cases = [
        ("照合の指示が残っていれば 1 を返す", "`src/app/page.tsx` と見比べてください。\n", 1),
        ("問題が無ければ 0 を返す", "`src/app/page.tsx` を作ります。\n", 0),
    ]
    for name, body, want in cases:
        with tempfile.TemporaryDirectory() as d:
            Path(d, "day05_x.md").write_text(body, encoding="utf-8")
            if run(["check_zip_reference.py", d]) != want:
                failed += 1
                print(f"  ❌ {name}")
    if run(["check_zip_reference.py", "/no/such/path"]) != 2:
        failed += 1
        print("  ❌ 見つからないパスで 2 を返さない")
    with tempfile.TemporaryDirectory() as d:
        if run(["check_zip_reference.py", d]) != 2:
            failed += 1
            print("  ❌ 対象0件で 2 を返さない")
    return failed, len(cases) + 2


def main_test() -> int:
    failed = 0
    for name, body, expected in CASES:
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "day05_x.md"
            p.write_text(body, encoding="utf-8")
            got = [i for _, i, _, _ in find_refs([p])]
        if sorted(got) != sorted(expected):
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    exit_failed, exit_total = check_exit_code()
    failed += exit_failed
    total = len(CASES) + exit_total
    if failed:
        print(f"❌ check_zip_reference 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_zip_reference 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main_test())
