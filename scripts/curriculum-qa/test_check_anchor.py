#!/usr/bin/env python3
"""check_anchor.py の退行テスト。

素通ししてはいけないもの（指示語だけの値）と、止めてはいけないもの（実ファイル名、
実ファイルを持たない旨を書いたもの、コードブロックの外にある同じ文字列）の両方を置く。
片方だけでは、全部を止める検査でも全部を通す検査でも緑になってしまう。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_anchor import find  # noqa: E402

CASES: list[tuple[str, str, list[tuple[int, str]]]] = [
    (
        "指示語だけの値は拾う",
        "```tsx\n// filepath: 続き\nconst a = 1;\n```",
        [(2, "続き")],
    ),
    (
        "実ファイル名なら通す",
        "```tsx\n// filepath: src/app/page.tsx\nconst a = 1;\n```",
        [],
    ),
    (
        "実ファイル名に続きと添えても通す",
        "```tsx\n// filepath: src/app/page.tsx（同じファイルの続き）\nconst a = 1;\n```",
        [],
    ),
    (
        "実ファイルを持たない旨を書けば通す",
        "```tsx\n// filepath: 読み比べ用サンプル（続き・実ファイルには対応しません）\nconst a = 1;\n```",
        [],
    ),
    (
        "同上も拾う",
        "```tsx\n// filepath: 同上\nconst a = 1;\n```",
        [(2, "同上")],
    ),
    (
        "コードブロックの外は対象外",
        "// filepath: 続き と書いた行の話をしています。\n",
        [],
    ),
    (
        "シャープで書くブロックも拾う",
        "```bash\n# filepath: 続き\nls\n```",
        [(2, "続き")],
    ),
    (
        "複数ブロックをまとめて拾う",
        "```tsx\n// filepath: 続き\n```\n\n```tsx\n// filepath: src/a.tsx\n```\n\n```tsx\n// filepath: 同上\n```",
        [(2, "続き"), (10, "同上")],
    ),
    (
        "filepath の無いブロックは対象外",
        "```tsx\nconst a = 1;\n```",
        [],
    ),
]


def main() -> int:
    failed = 0
    for name, text, expected in CASES:
        got = find(text)
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    if failed:
        print(f"❌ check_anchor 自己テスト {failed}/{len(CASES)} 失敗")
        return 1
    print(f"✅ check_anchor 自己テスト {len(CASES)}/{len(CASES)} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
