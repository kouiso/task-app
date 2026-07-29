#!/usr/bin/env python3
"""JSX の子要素の位置に `//` 形式の目印が残っていないかを見る。

`//` は JavaScript のコメントだが、JSX の子要素の位置に置くとコメントにならず、
画面に文字としてそのまま出る。型検査もビルドも通るので、書いた側にも読者にも
見えない。通し実行では、ログイン画面5箇所、登録画面4箇所、ダッシュボード6箇所で
目印の文字が表示されていた。

一度直しても、次に写経ブロックを足したときに同じ形が戻る。目で見て直す限り、
言語表記が `tsx` でないブロック（`typescript` と書かれた JSX 断片）を取り落とす。
実際に1度目の修正はそこで328行を見落とした。だから機械で見る。

判定は言語表記ではなく中身で行う。フェンス内の最初の実体行が `<` で始まれば
JSX の要素、`{式` で始まれば JSX の埋め込みで、どちらも子要素の位置になる。
素の `{` だけの行はオブジェクトリテラルの開始なので対象外にする。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

# JSX を書きうる言語表記。ここに無い表記（bash, json 等）は最初から対象外。
JSX_LANGS = {"tsx", "jsx", "typescript", "javascript", "ts", "js"}
FENCE = re.compile(r"^(\s*)(`{3,})(\w*)\s*$")
SLASH = re.compile(r"^(\s*)//\s?(.*?)\s*$")
# JSX の文字そのもの。コードの記号を1つも含まない行を、閉じタグが直後に続く形で見る。
# `<` や `{` で始まらないので、要素でも埋め込みでもない。つまり画面に出る文字である。
PLAIN_TEXT = re.compile(r"^\s*[^<>{}();=\[\]]+$")
CLOSING_TAG = re.compile(r"^\s*</[A-Za-z]")


def find_violations(root: Path) -> tuple[list[tuple[str, int, str]], int]:
    hits: list[tuple[str, int, str]] = []
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
            # CommonMark では、開いた囲いと同じ長さ以上の囲いでしか閉じられない。
            closer = re.compile(r"^\s*`{%d,}\s*$" % len(fence))
            body: list[int] = []
            j = i + 1
            while j < len(lines) and not closer.match(lines[j]):
                body.append(j)
                j += 1

            if lang in JSX_LANGS:
                scanned += 1
                lead: list[int] = []
                k = 0
                while k < len(body) and (
                    lines[body[k]].strip() == "" or SLASH.match(lines[body[k]])
                ):
                    if lines[body[k]].strip():
                        lead.append(body[k])
                    k += 1

                first = lines[body[k]].strip() if k < len(body) else ""
                # 画面に出る文字が続く形。`<p>` の途中から始まる続きのブロックは、
                # 最初の行が要素でも埋め込みでもなく、ただの文字になる。閉じタグが
                # 数行のうちに来ることを合図にする。ここを見ないと、day01 の
                # 「Day 02 では〜」のように文字で始まる続きブロックを取り落とす。
                text_child = False
                if k < len(body) and PLAIN_TEXT.match(lines[body[k]]):
                    for b in body[k : k + 4]:
                        if CLOSING_TAG.match(lines[b]):
                            text_child = True
                            break

                in_jsx = (
                    first.startswith("<")
                    or (first.startswith("{") and first != "{")
                    or text_child
                )
                if in_jsx:
                    for ln in lead:
                        hits.append((path.name, ln + 1, lines[ln].strip()))

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
        print(f"❌ JSX の位置に `//` の目印が {len(hits)} 行残っています")
        for name, line, text in hits:
            print(f"  {name}:{line}: {text}")
        print("  `{/* ... */}` に変えてください。そのままだと画面に文字として出ます。")
        return 1

    print(f"✅ JSX の位置の目印 OK（コードブロック {scanned} 個）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
