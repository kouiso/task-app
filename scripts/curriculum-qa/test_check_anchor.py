#!/usr/bin/env python3
"""check_anchor.py の退行テスト。

素通ししてはいけないもの（指示語だけの値）と、止めてはいけないもの（実ファイル名、
実ファイルを持たない旨を書いたもの、コードブロックの外にある同じ文字列）の両方を置く。
片方だけでは、全部を止める検査でも全部を通す検査でも緑になってしまう。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_anchor import (  # noqa: E402
    find,
    find_missing,
    find_sample_with_real_path,
)

# Before/After の節にあるコードは写経の対象ではない。実ファイル名を名乗らせない。
SAMPLE_CASES: list[tuple[str, str, list[tuple[int, str]]]] = [
    (
        "読み比べ用の節で実ファイル名を名乗ったら拾う",
        "#### Before（改善前のコード）\n\n```tsx\n// filepath: src/app/page.tsx\n```",
        [(4, "src/app/page.tsx")],
    ),
    (
        "読み比べ用と書いてあれば通す",
        "#### After（プロが書くコード）\n\n```tsx\n// filepath: 読み比べ用サンプル（実ファイルには対応しません）\n```",
        [],
    ),
    (
        "写経の節なら実ファイル名でよい",
        "### Step 1: 書く\n\n```tsx\n// filepath: src/app/page.tsx\n```",
        [],
    ),
    (
        "読み比べ用の節を抜けたら対象外に戻る",
        "#### Before（改善前のコード）\n\n### Step 2: 書く\n\n```tsx\n// filepath: src/app/page.tsx\n```",
        [],
    ),
    (
        "Bash の # filepath 行は見出しではないので節から抜けない",
        "#### Before（改善前のコード）\n\n```bash\n# filepath: scripts/foo.sh\nls\n```",
        [(4, "scripts/foo.sh")],
    ),
    (
        "4連で開いたブロックは3連では閉じない",
        (
            "#### Before（改善前のコード）\n\n"
            "````md\n```\nx\n```\n// filepath: src/app/page.tsx\n````\n"
        ),
        [(7, "src/app/page.tsx")],
    ),
]

REPO = Path(__file__).resolve().parents[2]

# 実在するファイルは通し、実在しないファイルは止める。読み比べ用の断りは対象外にする。
MISSING_CASES: list[tuple[str, str, list[tuple[int, str]]]] = [
    (
        "完成版に無いパスは拾う",
        "```tsx\n// filepath: src/app/graduation/page.tsx\n```",
        [(2, "src/app/graduation/page.tsx")],
    ),
    (
        "完成版に在るパスは通す",
        "```tsx\n// filepath: src/app/page.tsx\n```",
        [],
    ),
    (
        "在るパスに注記が付いていても通す",
        "```tsx\n// filepath: src/app/page.tsx（同じファイルの続き）\n```",
        [],
    ),
    (
        "読み比べ用の断りは対象外",
        "```tsx\n// filepath: 読み比べ用サンプル（実ファイルには対応しません）\n```",
        [],
    ),
]

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
        "同じ注記が2回ぶら下がったら拾う",
        "```tsx\n// filepath: src/a.tsx（同じファイルの続き）（同じファイルの続き）\n```",
        [(2, "src/a.tsx（同じファイルの続き）（同じファイルの続き）")],
    ),
    (
        "違う注記が2つ並ぶのは通す",
        "```tsx\n// filepath: src/a.tsx（Step 3 で作成）（同じファイルの続き）\n```",
        [],
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
    for name, text, expected in SAMPLE_CASES:
        got = find_sample_with_real_path(text)
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    for name, text, expected in MISSING_CASES:
        got = find_missing(text, REPO)
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    total = len(CASES) + len(MISSING_CASES) + len(SAMPLE_CASES)
    if failed:
        print(f"❌ check_anchor 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_anchor 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
