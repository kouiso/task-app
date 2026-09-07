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

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_setext_heading import find_accidental_headings  # noqa: E402
from check_setext_heading import main as main_cli  # noqa: E402

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
    # `<` 始まりを一律に除外すると、インライン HTML の段落を飛ばして見逃す。
    # HTML ブロックになるのはタグが1行を占めるときだけで、行の途中に本文が
    # 続けばただの段落である（すべて mdast で実測）。
    #   "<span>本文</span>\n---\n"      → heading (h2)
    #   "<span>\n---\n"                → html          タグ単独なのでブロック
    #   "本文です。\n<span>\n---\n"      → heading (h2)  type 7 は段落を中断できない
    #   "</span>\n---\n" / "<br>\n---\n" / "<!-- メモ -->\n---\n" → html
    ("インライン HTML の段落の直後は拾う", "<span>本文</span>\n---\n", 1),
    ("属性付きのインライン HTML も拾う", '<span class="x">本文</span>\n---\n', 1),
    ("タグ単独の行は HTML ブロックなので拾わない", "<span>\n---\n", 0),
    ("段落の途中のタグ単独行は継続行なので拾う", "本文です。\n<span>\n---\n", 1),
    ("閉じタグだけの行は拾わない", "</span>\n---\n", 0),
    ("空要素タグだけの行は拾わない", "<br>\n---\n", 0),
    ("HTML コメントの直後は拾わない", "<!-- メモ -->\n---\n", 0),
    ("字下げした箇条書きの直後も拾わない", "  - 項目\n---\n", 0),
    # 手前が `-` で始まっていても、箇条書きでなければ段落なので拾う。
    ("ハイフンで始まる語は箇条書きではない", "-記号で始まる語です。\n---\n", 1),
    # 先頭の `---` が frontmatter とは限らない。水平線で始まる文書を
    # frontmatter とみなすと、その直後の本文の見出し化を丸ごと見逃す。
    ("先頭が水平線でも後続の見出し化を拾う", "---\n本文です。\n---\n", 1),
    ("本物の frontmatter の閉じは拾わない", "---\ntitle: あ\ndescription: い\n---\n\n本文です。\n", 0),
    ("frontmatter の後ろの見出し化は拾う", "---\ntitle: あ\n---\n\n本文です。\n---\n", 1),
    # CommonMark の境界。すべて mdast-util-from-markdown で実測して固定した。
    #   "#hashtag\n---\n"      → heading (h2)                  ATX は `#` の後に空白が要る
    #   "# 見出し\n---\n"       → heading (h1) | thematicBreak
    #   "---\n---\n"           → thematicBreak | thematicBreak
    #   "***\n---\n"           → thematicBreak | thematicBreak
    #   "    code\n---\n"      → code | thematicBreak          直前が空行なので本物のコード
    #   "本文\n    code\n---\n" → heading (h2)                  段落の途中の字下げは継続行
    ("`#hashtag` は見出しではないので拾う", "#hashtag\n---\n", 1),
    ("ATX 見出しの直後は拾わない", "# 見出し\n---\n", 0),
    ("連続する水平線は拾わない", "---\n---\n", 0),
    ("`***` の水平線の直後は拾わない", "***\n---\n", 0),
    ("`___` の水平線の直後は拾わない", "___\n---\n", 0),
    ("空行のあとの字下げコードの直後は拾わない", "本文です。\n\n    code\n---\n", 0),
    ("段落の途中の字下げ行は継続行なので拾う", "本文です。\n    code\n---\n", 1),
    # frontmatter の中身は「字下げ行・コメント・配列要素・`key:`」の4種で判定する。
    # `:` の有無だけで見ると複数行 scalar やコメントだけの frontmatter を弾く。
    # PyYAML には寄せていない（依存が宣言されておらず、無い環境で総崩れするため）。
    ("複数行 scalar の frontmatter を飛ばす", "---\ndescription: |\n  複数行\n---\n\n本文です。\n---\n", 1),
    ("コメントだけの frontmatter を飛ばす", "---\n# コメント\n---\n\n本文です。\n---\n", 1),
    ("scalar の中の `---` で打ち切らない", "---\ndesc: |\n  ---\n---\n\n本文です。\n---\n", 1),
    ("配列を持つ frontmatter を飛ばす", "---\nitems:\n- a\n---\n\n本文です。\n---\n", 1),
    # 閉じ候補を `strip()` で見ると、字下げされた `---` を閉じと誤認して
    # frontmatter の終わりが1行手前にずれ、scalar の中身を地の文として拾う。
    ("字下げした `---` は閉じ候補にしない", "---\na: |\n  x\n---\n\n本文です。\n---\n", 1),
]


def check_empty_directory() -> int:
    """対象0件を成功で返さないこと。パスを間違えたときに緑になるのを防ぐ。"""
    with tempfile.TemporaryDirectory() as directory:
        buf = io.StringIO()
        with contextlib.redirect_stderr(buf):
            code = main_cli(["check_setext_heading.py", directory])
    if code == 0:
        print(f"  ❌ 空のディレクトリで成功を返しました（終了コード {code}）")
        return 1
    return 0


def main() -> int:
    failed = 0
    for name, text, expected in CASES:
        got = len(find_accidental_headings(text))
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} 件 / 実際 {got} 件")
    failed += check_empty_directory()
    total = len(CASES) + 1
    if failed:
        print(f"❌ check_setext_heading 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_setext_heading 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
