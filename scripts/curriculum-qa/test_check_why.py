#!/usr/bin/env python3
"""check_why.py の退行テスト。

外部レビューで指摘された4つの抜け道を、直したあとも塞いだままであることを見る。
  1. HTML コメントだけで 60 字を満たす
  2. 確認ポイントの折り返し行を説明として数える
  3. 確認ポイントより後の別の節の地の文を数える
  4. 離れた場所の「読み比べ用」で無関係なブロックを免除する
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_why import COMPARE_ONLY, MIN_CHARS, TARGET_LANG, blocks_with_following_prose  # noqa: E402

CODE = "```tsx\nconst a = 1;\n```\n"
LONG = "この書き方にするのは、あとで値が増えたときに一箇所を直すだけで済むからです。ほかの画面も同じ形にそろえています。"


def checked_blocks(text: str) -> list[tuple[int, int]]:
    """(開始行, 直後の説明の字数) を、検査対象になったブロックだけ返す。"""
    out = []
    for start, info, prev, _first, after in blocks_with_following_prose(text):
        if not TARGET_LANG.match(info):
            continue
        if COMPARE_ONLY.search(prev):
            continue
        out.append((start, len(after)))
    return out


CASES: list[tuple[str, str, list[tuple[int, int]]]] = [
    (
        "地の文が続けば通る",
        CODE + "\n" + LONG + "\n",
        [(1, len(LONG))],
    ),
    (
        "HTML コメントは説明に数えない",
        CODE + "\n<!-- " + LONG + " -->\n",
        [(1, 0)],
    ),
    (
        "複数行の HTML コメントも数えない",
        CODE + "\n<!--\n" + LONG + "\n-->\n",
        [(1, 0)],
    ),
    (
        "確認ポイントの折り返し行は数えない",
        CODE + "\n**確認ポイント**:\n- 画面が出た\n  " + LONG + "\n",
        [(1, 0)],
    ),
    (
        "確認ポイントの後の補足は同じ節なので数える",
        CODE + "\n**確認ポイント**:\n- 画面が出た\n\n> " + LONG + "\n",
        [(1, len("> " + LONG))],
    ),
    (
        "確認ポイントより後の別の節は数えない",
        CODE + "\n**確認ポイント**:\n- 画面が出た\n\n### Step 9: 次\n\n" + LONG + "\n",
        [(1, 0)],
    ),
    (
        "直前の1行に読み比べ用と書いてあれば対象外",
        "読み比べ用のコードです。写経しません。\n\n" + CODE,
        [],
    ),
    (
        "見出しをまたいだ読み比べ用は免除しない",
        "読み比べ用のコードです。\n\n### Step 2: 実装\n\n" + CODE,
        [(5, 0)],
    ),
]


def main() -> int:
    failed = 0
    for name, text, expected in CASES:
        got = checked_blocks(text)
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    # しきい値そのものが緩められていないかも見る。
    if MIN_CHARS < 60:
        failed += 1
        print(f"  ❌ MIN_CHARS が {MIN_CHARS} に下げられています")
    total = len(CASES) + 1
    if failed:
        print(f"❌ check_why 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_why 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
