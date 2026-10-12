#!/usr/bin/env python3
"""check_complete_section_fences.py の退行テスト。

止めるもの（完成コード節に権威記述が2つある形、`完成版` の抜粋だけで終わる形）と、
止めてはいけないもの（抜粋 + 末尾の全ファイル listing、見出しごとに分けた全体版、
Step 節の断片、本文で断った抜粋）の両方を置く。件数まで照合するのは、
1件に縮んでも緑になる検査の弱まりを見逃さないため。
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_complete_section_fences import UNIT_MARKER, WHOLE_FILE, check_file  # noqa: E402

LAYOUT = "src/component/layout/app-layout.tsx"
PAGE = "src/app/task/page.tsx"
TASK_ROUTER = "src/server/api/routers/task.ts"

WHOLE_PAGE = (
    "// 完成版: ファイル全体\n'use client';\n\nimport { useState } from 'react';\n\n"
    "export default function Page() {\n  const [open, setOpen] = useState(false);\n"
    "  return <button onClick={() => setOpen(!open)} />;\n}"
)

# day28 page.tsx の登録行数（10 行）と同じ数だけ listing に無い行を持つ断片。
DIVERGED_LINES = "// 一括完了\n" + "\n".join(f"  ifSelected{i}();" for i in range(1, 11))


def block(target: str, body: str, note: str = "", lang: str = "typescript") -> str:
    return f"```{lang}\n// filepath: {target}{note}\n{body}\n```\n\n"


def unit(target: str, body: str) -> str:
    return f"{UNIT_MARKER}\n" + block(target, body)


def day(step: str, complete: str) -> str:
    return f"# Day\n\n## 実装ステップ\n\n{step}## 完成コード全体\n\n{complete}## 今日のまとめ\n\n本文です。\n"


CASES: list[tuple[str, str, str, int]] = [
    (
        "抜粋の目印を外して末尾に全ファイル listing を置いた形（PR #637 の是正後）は通す",
        "day20_x.md",
        day(
            block(PAGE, "  const [open, setOpen] = useState(false);"),
            block(PAGE, "// 取り込み\n'use client';\n\nimport { useState } from 'react';")
            + block(PAGE, "// 状態\n  const [open, setOpen] = useState(false);")
            + unit(PAGE, WHOLE_PAGE),
        ),
        0,
    ),
    (
        "全ファイル listing と `完成版:` 付きの抜粋が並ぶ形は抜粋の数だけ止める",
        "day20_x.md",
        day(
            "",
            block(PAGE, "// 完成版: 取り込み\n'use client';\n\nimport { useState } from 'react';")
            + block(PAGE, "// 完成版: 状態\n  const [open, setOpen] = useState(false);")
            + unit(PAGE, WHOLE_PAGE),
        ),
        2,
    ),
    (
        "`完成形:` の目印は build_day_snapshots が読まないので、目印の誤りと"
        "（先頭がコメントのまま残り）ファイル全体にならないことの2件で止める",
        "day20_x.md",
        day("", unit(PAGE, WHOLE_PAGE.replace("完成版", "完成形"))),
        2,
    ),
    (
        "全ファイル listing が2件ある形は止める",
        "day20_x.md",
        day("", unit(PAGE, WHOLE_PAGE) + unit(PAGE, WHOLE_PAGE)),
        1,
    ),
    (
        "全ファイル listing の後ろに同じファイルのフェンスが続く形は止める",
        "day20_x.md",
        day(
            "",
            unit(PAGE, WHOLE_PAGE)
            + block(PAGE, "// 状態\n  const [open, setOpen] = useState(false);"),
        ),
        1,
    ),
    (
        "完成版の目印付き抜粋だけで終わる形（day20 app-layout.tsx の reject の形）は止める",
        "day20_x.md",
        day(
            block(LAYOUT, "  { text: '検索', path: '/search' },"),
            block(LAYOUT, "// 完成版: アイコンの import\nimport { Search } from 'lucide-react';")
            + block(LAYOUT, "{/* 完成版: メニュー項目 */}\n  { text: '検索', path: '/search' },"),
        ),
        1,
    ),
    (
        "目印の無い断片だけが並び完全なファイルにならない形も止める",
        "day20_x.md",
        day(
            "",
            block(LAYOUT, "import { Search } from 'lucide-react';")
            + block(LAYOUT, "  { text: '検索', path: '/search' },"),
        ),
        1,
    ),
    (
        "見出しごとに分けて載せた全体版が完全なファイルになる形（day11 project.ts の形）は通す",
        "day11_x.md",
        day(
            "",
            block(PAGE, "// 完成版: 取り込み\n'use client';\n\nimport { useState } from 'react';")
            + block(
                PAGE,
                "// 完成版: 画面\nexport default function Page() {\n"
                "  const [open, setOpen] = useState(false);\n  return <div />;\n}",
                note="（同じファイルの続き）",
            ),
        ),
        0,
    ),
    (
        "目印なしの先頭版と続きで完全なファイルになる形（day11 query-error.ts の形）は通す",
        "day11_x.md",
        day(
            "",
            block("src/lib/query-error.ts", "import { TRPCClientError } from '@trpc/client';")
            + block(
                "src/lib/query-error.ts",
                "export const isNotFound = (e: unknown) => e instanceof TRPCClientError;",
                note="（同じファイルの続き）",
            ),
        ),
        0,
    ),
    (
        "Step 節の目印付き抜粋は完成コード節の外なので見ない",
        "day20_x.md",
        day(
            block(LAYOUT, "// 完成版: アイコンの import\nimport { Search } from 'lucide-react';")
            + block(LAYOUT, "{/* 完成版: メニュー項目 */}\n  { text: '検索', path: '/search' },"),
            block(PAGE, WHOLE_PAGE),
        ),
        0,
    ),
    (
        "コード例の中の `## ` 行で節を切らない（後ろの抜粋も節の中として見る）",
        "day20_x.md",
        day(
            "",
            "```text\n## main\n```\n\n"
            + block(LAYOUT, "// 完成版: アイコンの import\nimport { Search } from 'lucide-react';")
            + block(LAYOUT, "{/* 完成版: メニュー項目 */}\n  { text: '検索', path: '/search' },"),
        ),
        1,
    ),
    (
        "例外マーカーの付かない短い listing も全ファイル listing として扱う（day21 root.ts の形）",
        "day21_x.md",
        day(
            "",
            block(PAGE, "// 状態\n  const [open, setOpen] = useState(false);")
            + block(PAGE, WHOLE_PAGE),
        ),
        0,
    ),
    (
        "マーカーの無い短い listing の前に `完成版:` 付きの抜粋が残っていれば止める",
        "day21_x.md",
        day(
            "",
            block(PAGE, "// 完成版: 状態\n  const [open, setOpen] = useState(false);")
            + block(PAGE, WHOLE_PAGE),
        ),
        1,
    ),
    (
        "本文で断った抜粋（DECLARED_EXCERPTS の day28 task.ts）は通す",
        "day28_x.md",
        day(
            "",
            block(TASK_ROUTER, "// 完成版: 一括操作で使う import\nimport { z } from 'zod';")
            + block(TASK_ROUTER, "// 完成版: bulkDelete\n  bulkDelete: protectedProcedure,"),
        ),
        0,
    ),
    (
        "DECLARED_EXCERPTS の登録先が全ファイル listing へ統合されたら登録が古いとして止める",
        "day28_x.md",
        day(
            "",
            block(TASK_ROUTER, "// 一括操作で使う import\nimport { z } from 'zod';")
            + unit(
                TASK_ROUTER,
                "// 完成版: ファイル全体\nimport { z } from 'zod';\n\n"
                "export const taskRouter = createTRPCRouter({});",
            ),
        ),
        1,
    ),
    (
        "フェンスが1つだけで目印も無い断片も、完全なファイルにならなければ止める",
        "day20_x.md",
        day("", block(LAYOUT, "  { text: '検索', path: '/search' },")),
        1,
    ),
    (
        "フェンスが1つだけで目印も無く、完全なファイルになっていれば通す",
        "day20_x.md",
        day("", block(PAGE, WHOLE_PAGE.split("\n", 1)[1])),
        0,
    ),
    (
        "`## 完成コード全体` が2つあれば2つ目の節の抜粋も止める",
        "day20_x.md",
        day("", unit(PAGE, WHOLE_PAGE))
        + "## 完成コード全体\n\n"
        + block(LAYOUT, "// 完成版: アイコンの import\nimport { Search } from 'lucide-react';")
        + block(LAYOUT, "{/* 完成版: メニュー項目 */}\n  { text: '検索', path: '/search' },"),
        1,
    ),
    (
        "断片の `= 1` を listing の `= 10` の一部として一致させない（字句の境界で見る）",
        "day20_x.md",
        day(
            "",
            block(PAGE, "// 上限\n    limit: 1,")
            + unit(PAGE, WHOLE_PAGE.replace("  return", "  const page = {\n    limit: 10,\n  };\n  return")),
        ),
        1,
    ),
    (
        "文字列の中の空白の違いは断片との違いとして数える",
        "day20_x.md",
        day(
            "",
            block(PAGE, "// 見出し\n  const title = 'タスク 一覧';")
            + unit(PAGE, WHOLE_PAGE.replace("  return", "  const title = 'タスク一覧';\n  return")),
        ),
        1,
    ),
    (
        "断片の import が取り込む名前を listing の import が欠いていれば止める",
        "day20_x.md",
        day(
            "",
            block(PAGE, "// 取り込み\nimport { useEffect, useState } from 'react';")
            + unit(PAGE, WHOLE_PAGE),
        ),
        1,
    ),
    (
        "副作用だけの import（取り込む名前が無い）も listing に無ければ止める",
        "day20_x.md",
        day(
            "",
            block(PAGE, "// 取り込み\nimport './globals.css';")
            + unit(PAGE, WHOLE_PAGE),
        ),
        1,
    ),
    (
        "断片の import の取り込み元が listing と違えば止める",
        "day20_x.md",
        day(
            "",
            block(PAGE, "// 取り込み\nimport { useState } from 'preact/hooks';")
            + unit(PAGE, WHOLE_PAGE),
        ),
        1,
    ),
    (
        "DECLARED_EXCERPTS の登録先が listing なしで完全なファイルになったら登録が古いとして止める",
        "day28_x.md",
        day(
            "",
            block(TASK_ROUTER, "// 完成版: 一括操作で使う import\nimport { z } from 'zod';")
            + block(
                TASK_ROUTER,
                "// 完成版: router 本体\nexport const taskRouter = createTRPCRouter({});",
                note="（同じファイルの続き）",
            ),
        ),
        1,
    ),
    (
        "JSX コメントの `完成版:` 目印が付いた抜粋と listing が並ぶ形も止める",
        "day20_x.md",
        day(
            "",
            block(PAGE, "{/* 完成版: ボタン */}\n  return <button onClick={() => setOpen(!open)} />;")
            + unit(PAGE, WHOLE_PAGE),
        ),
        1,
    ),
    (
        "`完成版（抜粋）:` のように括弧書きを挟んだ目印も目印として扱う",
        "day20_x.md",
        day(
            "",
            block(PAGE, "// 完成版（抜粋）: 状態\n  const [open, setOpen] = useState(false);")
            + unit(PAGE, WHOLE_PAGE),
        ),
        1,
    ),
    (
        "断片の変更を含まない listing（day25 app-layout.tsx が前日の版のままだった形）は止める",
        "day25_x.md",
        day(
            "",
            block(PAGE, "// プロフィールへの入口\n  return <a href=\"/profile\" />;")
            + unit(PAGE, WHOLE_PAGE),
        ),
        1,
    ),
    (
        "括弧が閉じずに途中で切れた listing はファイル全体と見なさない",
        "day20_x.md",
        day(
            "",
            block(PAGE, "// 状態\n  const [open, setOpen] = useState(false);")
            + unit(PAGE, WHOLE_PAGE.rsplit("\n", 1)[0]),
        ),
        1,
    ),
    (
        "import の組み直しと末尾カンマの有無は断片との違いとして数えない",
        "day20_x.md",
        day(
            "",
            block(LAYOUT, "// アイコン\nimport { Search } from 'lucide-react';")
            + block(LAYOUT, "// アイコン（折り返し）\nimport {\n  Search,\n} from 'lucide-react';")
            + block(LAYOUT, "// アイコン（取り込み元も折り返し）\nimport {\n  type LucideIcon,\n} from\n  'lucide-react';")
            + block(LAYOUT, "// メニュー\n  {\n    text: '検索',\n    path: '/search'\n  }")
            + block(LAYOUT, "// 末尾の要素（断片だけカンマ付き）\n  'b',")
            + unit(
                LAYOUT,
                "// 完成版: ファイル全体\nimport {\n  LayoutDashboard,\n  type LucideIcon,\n  Search\n} from 'lucide-react';\n\n"
                "export const menuItems = [\n  {\n    text: '検索',\n    path: '/search',\n  },\n];\n\n"
                "export const extra = [\n  'a',\n  'b'\n];",
            ),
        ),
        0,
    ),
    (
        "LISTING_DIVERGES に登録した listing（day28 page.tsx）は断片と違っても通す",
        "day28_x.md",
        day(
            "",
            block(PAGE, DIVERGED_LINES)
            + unit(PAGE, WHOLE_PAGE),
        ),
        0,
    ),
    (
        "LISTING_DIVERGES の登録先で listing に無い断片の行数が変われば止める",
        "day28_x.md",
        day(
            "",
            block(PAGE, DIVERGED_LINES + "\n  ifSelected11();")
            + unit(PAGE, WHOLE_PAGE),
        ),
        1,
    ),
    (
        "LISTING_DIVERGES の登録先で断片がすべて listing に入ったら登録が古いとして止める",
        "day28_x.md",
        day(
            "",
            block(PAGE, "// 状態\n  const [open, setOpen] = useState(false);")
            + unit(PAGE, WHOLE_PAGE),
        ),
        1,
    ),
]


def run_case(name: str, text: str) -> int:
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / name
        path.write_text(text, encoding="utf-8")
        return len(check_file(path))


def main_test() -> int:
    failed = 0
    # build_day_snapshots が目印と読むのは `完成版` だけなので、listing の目印もそれに限る。
    if WHOLE_FILE.match("// 完成形: ファイル全体"):
        failed += 1
        print("❌ `完成形: ファイル全体` を全ファイル listing の目印として受け付けている")
    for title, name, text, want in CASES:
        got = run_case(name, text)
        if got != want:
            failed += 1
            print(f"❌ {title}: 検出 {got} 件（期待は {want} 件）")
        else:
            print(f"✅ {title}")
    if failed:
        print(f"❌ {failed} 件失敗")
        return 1
    print(f"✅ 全 {len(CASES)} 件パス")
    return 0


if __name__ == "__main__":
    sys.exit(main_test())
