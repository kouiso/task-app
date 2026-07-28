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

from markdown_scan import fence_states, mask_html_comments

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

# 写経させないブロックの目印。この語がブロックの直前の1行にあれば対象から外す。
COMPARE_ONLY = re.compile(r"読み比べ用|写経しません|比較用")

TARGET_LANG = re.compile(r"^(tsx|ts|typescript|jsx|javascript)\b", re.IGNORECASE)

MIN_CHARS = 60


def blocks_with_following_prose(text: str):
    """コードブロックごとに (開始行, 言語, 直前の1行, 最初の要素, 直後の地の文) を返す。

    HTML コメントは先に潰す。`<!-- ... -->` は Markdown が読者に出さないので、
    説明の分量に数えるとコメントだけで 60 字を満たすブロックが通ってしまう。
    """
    rows = list(fence_states(mask_html_comments(text)))
    i = 0
    prev_prose: list[str] = []
    while i < len(rows):
        lineno, line, state, fence = rows[i]
        if state != "open":
            # 見出しが来たら、そこまでの前置きは別の話として捨てる。
            # 残したままだと、離れた場所の「読み比べ用」という断りが
            # 次の節の実装コードまで検査対象から外してしまう。
            if HEADING.match(line):
                prev_prose = []
            elif line.strip() and not NOT_PROSE.match(line):
                prev_prose.append(line.strip())
                prev_prose = prev_prose[-6:]
            i += 1
            continue

        info = fence.info
        start = lineno
        i += 1
        while i < len(rows) and rows[i][2] != "close":
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
        # 確認ポイントは、できたかどうかの点検であって理由ではない。点検項目は数えない。
        #
        # 点検が終わったあとの地の文は、まだこの節の中なので数える。教材は
        # 「コード → 確認ポイント → なぜそう書くかの補足」という順で書くことがあり、
        # ここで打ち切ると本物の説明が 0 字扱いになる（実測70ブロック）。
        # 代わりに、確認ポイントより後は見出しで打ち切る。見出しの下は別の節であって、
        # このブロックの説明ではない。
        #
        # 点検項目の続き行（行頭に印の無い字下げ行）も点検の一部として数えない。
        # 印を持つ行だけを飛ばしていた頃は、折り返した長い点検項目が
        # そのまま 60 字の説明として通っていた。
        after: list[str] = []
        first_meaningful: str | None = None
        in_checkpoint = False
        checkpoint_seen = False
        j = i
        while j < len(rows):
            _, line, state_j, _ = rows[j]
            if state_j == "open":
                break
            if CHECKPOINT.match(line):
                in_checkpoint = True
                checkpoint_seen = True
                if first_meaningful is None:
                    first_meaningful = "checkpoint"
                j += 1
                continue
            if in_checkpoint:
                if (
                    not line.strip()
                    or LIST_ITEM.match(line)
                    or line[:1].isspace()
                ):
                    j += 1
                    continue
                in_checkpoint = False
            if checkpoint_seen and HEADING.match(line):
                break
            if line.strip():
                if first_meaningful is None:
                    first_meaningful = "heading" if HEADING.match(line) else "prose"
                if not NOT_PROSE.match(line) and not HEADING.match(line):
                    after.append(line.strip())
            j += 1

        # 「読み比べ用」の断りは、直前の1行に付いているものだけを認める。
        # 6行ぶんをまとめて見ていた頃は、離れた場所の断りが無関係なブロックを免除していた。
        yield start, info, prev_prose[-1] if prev_prose else "", first_meaningful, "".join(after)
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
