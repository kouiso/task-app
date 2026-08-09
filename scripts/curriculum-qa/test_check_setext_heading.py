#!/usr/bin/env python3
"""check_setext_heading.py の退行テスト。

見るのは次の3つ。
  1. 地の文・画像行の直後の `---` を拾うこと（これが本体の目的）
  2. 空行が入っていれば拾わないこと（正しい教材を赤くしない）
  3. setext にならない手前の行（見出し・表・箇条書き・引用）を拾わないこと

3 があるので、除外条件を1つ削るとこのテストが落ちる。
判定の根拠は mdast-util-from-markdown の実測で、次のとおり。
    "![img](a.png)\\n---\\n"    → heading (h2)
    "![img](a.png)\\n\\n---\\n" → paragraph | thematicBreak
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_setext_heading import find_accidental_headings  # noqa: E402

# (テスト名, 本文, 期待する検出件数)
CASES: list[tuple[str, str, int]] = [
    ("画像の直後の `---` を拾う", "![img](a.png)\n---\n", 1),
    ("地の文の直後の `---` を拾う", "本文です。\n---\n", 1),
    ("空行があれば拾わない", "![img](a.png)\n\n---\n", 0),
    ("`---` が無ければ拾わない", "![img](a.png)\n\n本文です。\n", 0),
    # 4本以上でも区切り線として書かれる。
    ("4本以上の `---` も拾う", "本文です。\n----\n", 1),
    # setext にならない手前の行。ここを削ると正しい教材が落ちる。
    ("見出しの直後は拾わない", "## 見出し\n---\n", 0),
    # 表の行の直後の `---` は、GFM の区切り行として列数が合わなければ段落扱いになり、
    # 手前の行が見出しになる。教材で誤検知が出ないことを確認したうえで拾う側に倒した。
    ("表の行の直後も拾う", "| a | b |\n---\n", 1),
    ("箇条書きの直後は拾わない", "- 項目\n---\n", 0),
    ("引用の直後は拾わない", "> 引用\n---\n", 0),
    # frontmatter の閉じは区切り線ではない。
    ("frontmatter の閉じは拾わない", "---\ntitle: あ\n---\n\n本文です。\n", 0),
    # コードフェンスの中の `---` は Markdown の区切り線ではない。
    ("コードフェンス内の `---` は拾わない", "本文です。\n\n```yaml\nkey: 値\n---\n```\n", 0),
    # 複数あれば全部拾う。
    ("複数あれば全部拾う", "![a](a.png)\n---\n\n本文です。\n---\n", 2),
    # 下線の字下げ。3スペースまでは setext になり、4スペースからは字下げ
    # コードブロックになって見出しにならない（mdast で実測）。
    ("1スペース字下げの `---` も拾う", "本文です。\n ---\n", 1),
    ("3スペース字下げの `---` も拾う", "本文です。\n   ---\n", 1),
    ("4スペース字下げは拾わない", "本文です。\n    ---\n", 0),
    # 段落でない手前の行。1つでも落とすと正しい教材が赤くなる。
    ("`+` の箇条書きの直後は拾わない", "+ 項目\n---\n", 0),
    ("`1.` の順序付き箇条書きの直後は拾わない", "1. 項目\n---\n", 0),
    ("`1)` の順序付き箇条書きの直後は拾わない", "1) 項目\n---\n", 0),
    ("`~~~` フェンスの閉じの直後は拾わない", "~~~text\nコード\n~~~\n---\n", 0),
    ("``` フェンスの閉じの直後は拾わない", "```text\nコード\n```\n---\n", 0),
    ("生の HTML の直後は拾わない", "<div>\n---\n", 0),
    ("字下げした箇条書きの直後も拾わない", "  - 項目\n---\n", 0),
    # 手前が `-` で始まっていても、箇条書きでなければ段落なので拾う。
    ("ハイフンで始まる語は箇条書きではない", "-記号で始まる語です。\n---\n", 1),
    # 先頭の `---` が frontmatter とは限らない。水平線で始まる文書を
    # frontmatter とみなすと、その直後の本文の見出し化を丸ごと見逃す。
    ("先頭が水平線でも後続の見出し化を拾う", "---\n本文です。\n---\n", 1),
    ("本物の frontmatter の閉じは拾わない", "---\ntitle: あ\ndescription: い\n---\n\n本文です。\n", 0),
    ("frontmatter の後ろの見出し化は拾う", "---\ntitle: あ\n---\n\n本文です。\n---\n", 1),
]


def main() -> int:
    failed = 0
    for name, text, expected in CASES:
        got = len(find_accidental_headings(text))
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} 件 / 実際 {got} 件")
    if failed:
        print(f"❌ check_setext_heading 自己テスト {failed}/{len(CASES)} 失敗")
        return 1
    print(f"✅ check_setext_heading 自己テスト {len(CASES)}/{len(CASES)} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
