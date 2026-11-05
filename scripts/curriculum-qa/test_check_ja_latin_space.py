#!/usr/bin/env python3
"""check_ja_latin_space の退行テスト。

見つけないといけないのは、`Day 15の` のような番号の直後の和文と、「ー」の直後の英字・行内コード。
見つけてはいけないのは、空白を入れた形、番号でない数字、画面の表記に合わせる語、コードブロックの中。
textlint の2つのルールと受け持ちが重ならないように、この境界を固定しておく。
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_ja_latin_space import find_violations, main  # noqa: E402

MUST_HIT = [
    ("番号の後ろの和文", "Day 15の更新処理を使います。\n"),
    ("Step の番号の後ろの和文", "Step 3で作った関数です。\n"),
    ("範囲の番号の後ろの和文", "Step 0-6で書いた呼び名です。\n"),
    ("ーの後ろの英字", "ユーザーIDを渡します。\n"),
    ("ーの後ろの行内コード", "ユーザー`id`を渡します。\n"),
]

MUST_PASS = [
    ("空白を入れた番号", "Day 15 の更新処理を使います。\n"),
    ("番号でない数字", "約3分で終わります。\n"),
    ("画面のラベルと同じ語", "アバターURL（任意）を入力します。\n"),
    ("空白を入れたー", "ユーザー ID を渡します。\n"),
    ("コードブロックの中", "```text\nDay 15の更新処理\nユーザーID\n```\n"),
    ("HTML コメントの中", "<!-- Day 15の メモ -->\n"),
    ("英字が前に続く語", "OneDay 1の例です。\n"),
]


def run(text: str) -> list:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "day01_test.md").write_text(text, encoding="utf-8")
        hits, scanned = find_violations(root)
        assert scanned == 1
        return hits


def main_test() -> int:
    failed = 0
    for name, text in MUST_HIT:
        if len(run(text)) != 1:
            print(f"❌ 拾うべき例を拾えなかった: {name}")
            failed += 1
    for name, text in MUST_PASS:
        if run(text):
            print(f"❌ 拾ってはいけない例を拾った: {name}")
            failed += 1
    # 本体の終了コード。1件でもあれば 1、空のディレクトリは 2。
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        if main(["x", str(root)]) != 2:
            print("❌ md の無いディレクトリで exit 2 にならない")
            failed += 1
        (root / "day01_test.md").write_text("Day 15の例です。\n", encoding="utf-8")
        if main(["x", str(root)]) != 1:
            print("❌ くっつきがあるのに exit 1 にならない")
            failed += 1
        (root / "day01_test.md").write_text("Day 15 の例です。\n", encoding="utf-8")
        if main(["x", str(root)]) != 0:
            print("❌ くっつきが無いのに exit 0 にならない")
            failed += 1
    if failed:
        print(f"❌ test_check_ja_latin_space FAIL（{failed} 件）")
        return 1
    print(f"✅ test_check_ja_latin_space PASS（{len(MUST_HIT) + len(MUST_PASS) + 3} 件）")
    return 0


if __name__ == "__main__":
    sys.exit(main_test())
