#!/usr/bin/env python3
"""day間の参照が実在するかを照合する。

教材は「Day 13 で作った `TaskCard` を…」のように前の日を指す文を持つ。
指した先にその名前が無いと、読者は探しても見つからず手が止まる。
実際 day22 は「Day 1 の `npm install` で導入済みです」と書いているが
day01 に `npm install` は一度も出てこない。

このスクリプトは本文中の「Day NN ... `token`」という主張を集め、
token が対象 day のファイルに存在するかを確認する。
コードブロックの中は読者が書く対象なので、参照元としては見るが
参照先の探索には含める（写経したコードの中に定義があるため）。
"""

import re
import sys
from pathlib import Path

# 「Day 13 で作った `TaskCard`」のように、その日に何かを作った／置いたと述べる文を拾う。
#
# 句点・読点をまたぐと別の文の単語を拾ってしまう。実例:
#   「`page.tsx` は Day 02 で書き換えました。`package.json` などその他のファイルは Day 01 の…」
#   ここで Day 02 と `package.json` を結び付けるのは誤り。両者は別の文に属している。
# よって区切り文字をまたがせず、Day番号の直後に「の」か「で」が続く形だけを対象にする。
CLAIM = re.compile(r"Day\s*0?(\d{1,2})\s*(?:の|で)[^\n`。、]{0,25}?`([^`]+)`")

# 照合対象から外す語。汎用すぎて存在確認に意味がないもの。
IGNORE = {"npm", "src", "app", "page.tsx", "layout.tsx", "README.md"}

# 識別子としても短いコマンドとしても照合できない書き方。弾かないと誤検出になる。
#   矢印・記号入り: `auth → project → task` の流れ説明、`useForm + zodResolver` の並記
#   タグの省略形  : `<main>...</main>` は本文の言い回しであって識別子ではない
#   コード片      : 宣言文の引用は写経先で書き方が変わるため一致しない
# `npm install` のような2語のコマンドは実在確認に意味があるので通す。
NOT_IDENTIFIER = re.compile(r"[→…+]|\.{3}|^<|=|;|\(\)")


def too_many_words(token: str) -> bool:
    """3語以上は文の引用とみなす。写経先では言い回しが変わるため照合できない。"""
    return len(token.split()) >= 3


def day_files(root: Path) -> dict[int, Path]:
    found = {}
    for p in sorted(root.glob("day[0-9][0-9]_*.md")):
        found[int(p.name[3:5])] = p
    return found


def strip_fences(text: str) -> str:
    out, infence = [], False
    for line in text.split("\n"):
        if line.startswith("```"):
            infence = not infence
            continue
        if not infence:
            out.append(line)
    return "\n".join(out)


def main(argv: list[str]) -> int:
    root = Path(argv[1]) if len(argv) > 1 else Path("material/30days-curriculum")
    if not root.is_dir():
        print(f"❌ ディレクトリが見つかりません: {root}", file=sys.stderr)
        return 2

    files = day_files(root)
    if not files:
        print(f"❌ dayファイルが見つかりません: {root}", file=sys.stderr)
        return 2

    bodies = {n: p.read_text(encoding="utf-8") for n, p in files.items()}
    failures = []

    for num, path in files.items():
        prose = strip_fences(bodies[num])
        for line_no, line in enumerate(prose.split("\n"), 1):
            for m in CLAIM.finditer(line):
                target, token = int(m.group(1)), m.group(2).strip()
                if target == num or token in IGNORE or len(token) < 3:
                    continue
                if NOT_IDENTIFIER.search(token) or too_many_words(token):
                    continue
                if target not in bodies:
                    failures.append((path.name, token, f"Day {target} が存在しません"))
                    continue
                if token not in bodies[target]:
                    failures.append(
                        (path.name, token, f"Day {target:02d} に `{token}` がありません")
                    )

    if failures:
        print(f"❌ day間の参照切れ {len(failures)} 件")
        for name, token, reason in failures:
            print(f"  {name}: `{token}` — {reason}")
        return 1

    print(f"✅ day間の参照 OK（{len(files)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
