#!/usr/bin/env python3
"""check_version_split.py の退行テスト。

止めるもの（完成版の並びを注記なしの宣言ブロックが分断する形）と、
止めてはいけないもの（注記付きの続き、完成版の後の正当な全体版、
完成版が出る前の Step 節の断片）の両方を置く。
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_version_split import find_splits  # noqa: E402

DIALOG = "src/component/task/task-detail-dialog.tsx"
PAGE = "src/app/search/page.tsx"


def block(target: str, body: str, note: str = "", lang: str = "typescript") -> str:
    return f"```{lang}\n// filepath: {target}{note}\n{body}\n```\n"


CASES: list[tuple[str, dict[str, str], int]] = [
    (
        "完成版 run の途中へ注記なしの const ブロックが割り込んだら止める",
        {
            "day18_x.md": block(
                DIALOG,
                "// 完成版: import\n'use client';\n\nimport { api } from '@/trpc/react';",
            )
            + block(
                DIALOG,
                "const canEditComments = !!taskDetail &&\n"
                "  canEditProject(taskDetail.projectId);",
            )
            + block(
                DIALOG,
                "export function Dialog() {\n  return <div />;\n}",
                note="（同じファイルの続き）",
            ),
        },
        1,
    ),
    (
        "続きに注記があれば通す",
        {
            "day18_x.md": block(
                DIALOG,
                "// 完成版: import\n'use client';\n\nimport { api } from '@/trpc/react';",
            )
            + block(
                DIALOG,
                "const canEditComments = !!taskDetail &&\n"
                "  canEditProject(taskDetail.projectId);",
                note="（同じファイルの続き）",
            )
            + block(
                DIALOG,
                "export function Dialog() {\n  return <div />;\n}",
                note="（同じファイルの続き）",
            ),
        },
        0,
    ),
    (
        "完成版の後に注記なしの完全な次の版が来るのは通す（day09 root.ts の形）",
        {
            "day09_x.md": block(
                "src/server/api/root.ts",
                "// 完成版: 一覧\nimport { authRouter } from './routers/auth';\n\n"
                "export const appRouter = createTRPCRouter({\n  auth: authRouter,\n});",
            )
            + block(
                "src/server/api/root.ts",
                "import { authRouter } from './routers/auth';\n"
                "import { projectRouter } from './routers/project';\n\n"
                "export const appRouter = createTRPCRouter({\n"
                "  auth: authRouter,\n  project: projectRouter,\n});",
            ),
        },
        0,
    ),
    (
        "完成版が出る前の注記なし宣言ブロックは Step 節の部品なので通す",
        {
            "day20_x.md": block(
                PAGE,
                "const normalizeDate = (value: string): string => {\n"
                "  return value;\n};",
            )
            + block(
                PAGE,
                "// 完成版: import\n'use client';\n\nimport { api } from '@/trpc/react';",
            )
            + block(
                PAGE,
                "export default function Page() {\n  return <div />;\n}",
                note="（同じファイルの続き）",
            ),
        },
        0,
    ),
    (
        "完成版の後の const 始まりは括弧と export が釣り合っていても止める",
        {
            "day20_x.md": block(
                PAGE,
                "// 完成版: import\n'use client';\n\nimport { api } from '@/trpc/react';",
            )
            + block(
                PAGE,
                "const normalizeDate = (value: string): string => {\n"
                "  return value;\n};\n\n"
                "export default function Page() {\n  return <div />;\n}",
            ),
        },
        1,
    ),
    (
        "注記なしでも JSX やコメント始まりなら版を切らないので通す",
        {
            "day18_x.md": block(
                DIALOG,
                "// 完成版: import\n'use client';\n\nimport { api } from '@/trpc/react';",
            )
            + block(
                DIALOG,
                "{/* コメント欄 */}\n<div className=\"space-y-4\" />",
            )
            + block(
                DIALOG,
                "export function Dialog() {\n  return <div />;\n}",
                note="（同じファイルの続き）",
            ),
        },
        0,
    ),
]


def run_case(files: dict[str, str]) -> int:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        for name, text in files.items():
            (root / name).write_text(text, encoding="utf-8")
        total = 0
        for name in files:
            total += len(find_splits(root / name))
        return total


def main_test() -> int:
    failed = 0
    for title, files, want in CASES:
        got = run_case(files)
        expected = 1 if want else 0
        actual = 1 if got else 0
        if actual != expected:
            failed += 1
            print(f"❌ {title}: 検出 {got} 件（期待は {'あり' if want else 'なし'}）")
        else:
            print(f"✅ {title}")
    if failed:
        print(f"❌ {failed} 件失敗")
        return 1
    print(f"✅ 全 {len(CASES)} 件パス")
    return 0


if __name__ == "__main__":
    sys.exit(main_test())
