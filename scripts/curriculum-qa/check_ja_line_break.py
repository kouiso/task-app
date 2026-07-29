#!/usr/bin/env python3
"""画面に出る日本語の文が、JSX の中で途中改行されていないかを見る。

JSX は要素の中の改行とインデントを、半角スペース1個に畳んでから描画する。
そのため日本語の文を途中で折り返すと、画面には文の途中に空白が1つ入る。
Day 21 の「プロジェクトの進捗とタスクの 状況を確認できます。」がこれで、
通し実行の実測で見つかった。

教材はコードの行幅を狭く保つために折り返す。その折り返しが、コードでは無害でも
日本語の文では欠陥になる。書いた側の画面では改行に見えるので、目では気づけない。

判定は「画面に出る文字だけ」に絞る。ASCII の記号を1つも含まない行だけを対象にすると、
コメントや式やオブジェクトの値が外れる。この絞り方に至るまで、広い条件では115件、
中間の条件では73件の誤検出が出た。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

JSX_LANGS = {"tsx", "jsx", "typescript", "javascript", "ts", "js"}
FENCE = re.compile(r"^(\s*)(`{3,})(\w*)\s*$")
# 画面に出る文字だけ。ASCII の記号が1つでもあればコードとみなして外す。
SCREEN_TEXT = re.compile(r"^[ぁ-んァ-ヶ一-龥ーａ-ｚＡ-Ｚ０-９、。・「」『』（）〜]+$")
# 文の切れ目。ここで終わっていれば、次の行は別の文なので折り返しではない。
SENTENCE_END = re.compile(r"[。、！？」』）]$")


def find_violations(root: Path) -> tuple[list[tuple[str, int, str, str]], int]:
    hits: list[tuple[str, int, str, str]] = []
    scanned = 0

    for path in sorted(root.glob("*.md")):
        lines = path.read_text(encoding="utf-8").split("\n")
        i = 0
        while i < len(lines):
            opener = FENCE.match(lines[i])
            if opener is None:
                i += 1
                continue

            fence, lang = opener.group(2), opener.group(3).lower()
            closer = re.compile(r"^\s*`{%d,}\s*$" % len(fence))
            body: list[int] = []
            j = i + 1
            while j < len(lines) and not closer.match(lines[j]):
                body.append(j)
                j += 1

            if lang in JSX_LANGS:
                scanned += 1
                for k in range(len(body) - 1):
                    cur = lines[body[k]].strip()
                    nxt = lines[body[k + 1]].strip()
                    if (
                        SCREEN_TEXT.match(cur)
                        and SCREEN_TEXT.match(nxt)
                        and not SENTENCE_END.search(cur)
                    ):
                        hits.append((path.name, body[k] + 1, cur, nxt))

            i = j + 1

    return hits, scanned


def main(argv: list[str]) -> int:
    args = argv[1:] or ["material/30days-curriculum"]
    if len(args) != 1 or not Path(args[0]).is_dir():
        print("❌ 教材ディレクトリを1つ指定してください", file=sys.stderr)
        return 2
    root = Path(args[0])

    hits, scanned = find_violations(root)
    if scanned == 0:
        print(f"❌ コードブロックがありません: {root}", file=sys.stderr)
        return 2

    if hits:
        print(f"❌ 日本語の文が JSX の中で途中改行されている箇所が {len(hits)} 件あります")
        for name, line, cur, nxt in hits:
            print(f"  {name}:{line}: {cur} ⏎ {nxt}")
        print("  1行に繋いでください。そのままだと画面で文の途中に空白が入ります。")
        return 1

    print(f"✅ 日本語の文の折り返し OK（コードブロック {scanned} 個）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
