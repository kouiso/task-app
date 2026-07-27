#!/usr/bin/env python3
"""コードブロックの直後に「なぜ」があるかを見る。

手順だけが並ぶ教材は、写せても理解できない。外部レビューで指摘された「翻訳文感」の
実体は、コードの直後に理由が無いことだった。理由の有無は人の目でしか測れないと
思われていたが、「直後に地の文がどれだけ続くか」は機械で数えられる。
説明が短すぎるブロックを出して、書き手に見直させる。

除外する場合が2つある。どちらも入れないと誤検出になる（day01 で実測）。
  1. 閉じフェンスの直後が見出しのとき。説明はその見出しの下に書かれている。
  2. 「読み比べ用」と明記されたブロック。写経させない前提で並べているため。
"""

import re
import sys
from pathlib import Path

# 4連以上のバッククォートも開始記号になる。3連決め打ちだと、````md のブロックを
# 開いたまま閉じられず、そこから下のコードブロックが1つも検査されないまま緑になる。
FENCE = re.compile(r"^\s*(`{3,}|~{3,})(.*)$")
HEADING = re.compile(r"^\s*#{1,6}\s")
# 説明として数えない行。
# 表・引用・箇条書きは数える。教材はコードの意味を対応表や箇条書きで説明することがあり、
# これを外すと「箇条書きで説明しているのに説明が無い」と報告してしまう。
# 確認ポイントの見出しだけは、できたかどうかの点検であって理由ではないので数えない
# （見出しに続く箇条書きも、この見出しで打ち切るため数に入らない）。
NOT_PROSE = re.compile(r"^\s*!\[")

# 確認ポイントは点検であって理由ではない。ここで数えるのをやめる。
CHECKPOINT = re.compile(r"^\s*(\*\*確認ポイント|#{1,6}\s*確認ポイント)")

# 箇条書きの行。確認ポイントの中にある間だけ読み飛ばす。
LIST_ITEM = re.compile(r"^\s*([-*+]\s|\d+[.)]\s)")

# 写経させないブロックの目印。この語が直前の地の文にあれば対象から外す。
COMPARE_ONLY = re.compile(r"読み比べ用|写経しません|比較用")

TARGET_LANG = re.compile(r"^(tsx|ts|typescript|jsx|javascript)\b", re.IGNORECASE)

MIN_CHARS = 60


def blocks_with_following_prose(text: str):
    """コードブロックごとに (開始行, 言語, 直前の地の文, 直後の地の文) を返す。"""
    lines = text.split("\n")
    i = 0
    prev_prose: list[str] = []
    while i < len(lines):
        fence = FENCE.match(lines[i])
        if not fence:
            if lines[i].strip() and not NOT_PROSE.match(lines[i]) and not HEADING.match(lines[i]):
                prev_prose.append(lines[i].strip())
                prev_prose = prev_prose[-6:]
            i += 1
            continue

        marker, info = fence.group(1), fence.group(2).strip()
        start = i + 1
        i += 1
        while i < len(lines):
            close = FENCE.match(lines[i])
            if (
                close
                and close.group(1)[0] == marker[0]
                and len(close.group(1)) >= len(marker)
                and not close.group(2).strip()
            ):
                break
            i += 1
        i += 1  # 閉じフェンスの次へ

        # 次のコードブロックまでを、このブロックの説明として数える。
        # 空行で打ち切る案も試したが、1つ目の段落が短く2つ目が本体という
        # 正しい書き方まで落ちた（実測68件）。
        #
        # 見出しが挟まっても、そこで数えるのをやめない。教材はコードの直後に
        # 小見出しを置き、説明をその下に書くことがある。見出しで打ち切ると、
        # 「見出しだけ置いて理由を書かない」書き方が素通りする。
        #
        # 確認ポイントは、できたかどうかの点検であって理由ではない。
        # その見出しに当たった時点で数えるのをやめる。続く箇条書きを数えると、
        # 点検項目が並んでいるだけで説明があることになってしまう。
        after: list[str] = []
        first_meaningful: str | None = None
        in_checkpoint = False
        j = i
        while j < len(lines):
            line = lines[j]
            if FENCE.match(line):
                break
            if CHECKPOINT.match(line):
                in_checkpoint = True
                if first_meaningful is None:
                    first_meaningful = "checkpoint"
                j += 1
                continue
            if in_checkpoint:
                # 確認ポイントの箇条書きは点検であって理由ではないので数えない。
                # 箇条書きが終わったら、その先の地の文はまた説明として数える。
                if not line.strip() or LIST_ITEM.match(line):
                    j += 1
                    continue
                in_checkpoint = False
            if line.strip():
                if first_meaningful is None:
                    first_meaningful = "heading" if HEADING.match(line) else "prose"
                if not NOT_PROSE.match(line) and not HEADING.match(line):
                    after.append(line.strip())
            j += 1

        yield start, info, " ".join(prev_prose), first_meaningful, "".join(after)
        prev_prose = []


def main(argv: list[str]) -> int:
    args = argv[1:]
    if not args:
        args = ["material/30days-curriculum"]

    targets: list[Path] = []
    for a in args:
        p = Path(a)
        if p.is_dir():
            targets.extend(sorted(p.glob("day[0-9][0-9]_*.md")))
        elif p.is_file():
            targets.append(p)
        else:
            print(f"❌ 見つかりません: {a}", file=sys.stderr)
            return 2

    if not targets:
        print("❌ 対象ファイルがありません", file=sys.stderr)
        return 2

    findings: list[tuple[str, int, int]] = []
    checked = 0
    for path in targets:
        text = path.read_text(encoding="utf-8")
        for start, info, prev, first, after in blocks_with_following_prose(text):
            if not TARGET_LANG.match(info):
                continue
            if COMPARE_ONLY.search(prev):
                continue
            checked += 1
            if len(after) < MIN_CHARS:
                findings.append((path.name, start, len(after)))

    if findings:
        print(f"❌ コード直後の説明が足りないブロック {len(findings)} 件（{checked} 件中）")
        for name, line, size in findings:
            print(f"  {name}:{line} — 直後の説明 {size} 字（{MIN_CHARS} 字未満）")
        return 1

    print(f"✅ コード直後の説明 OK（{checked} ブロック / {len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
