#!/usr/bin/env python3
"""各日の `## 理解チェック` が、そろった形で入っているかを見る。

この節は「30日終わって理解が残らん」を防ぐために全30日へ入れたもので、商品の
売りの1つになっている。ところが形を見る検査が無かったため、書き手が分かれた結果
day01〜21 と day22〜30 で問答の書き方が割れたまま通っていた（2026-08-30 に発見）。

割れは見た目だけの話では終わらない。day22〜30 は答えを `> **答え**:` の引用で
書いており、textlint は引用の中を見ない。9日ぶん27問の答えが文章の検査を
素通りしていて、書式をそろえた途端に助詞の重なりなどが4件出てきた。

そのため、ここでは次の4つを見る。

  1. `## 理解チェック` が day ファイルすべてにある
  2. 節の中に問が3つある
  3. 問と答えの書き方が `**Qn. …**` と `A. ` にそろっている
  4. 答えを引用（`> `）で書いていない — textlint を素通りさせないため

問の中身が良いかどうかは機械では測れない。ここで測るのは形だけで、
中身は書き手と目視が受け持つ。用語の注釈や禁止表現は `check_comprehension.py`
が別に見ている（名前は似ているが役割が違う）。
"""

import re
import sys
from pathlib import Path

HEADING = "## 理解チェック"

# 採用した書き方。問は行頭で太字にし、答えは `A. ` で始める。
QUESTION = re.compile(r"^\*\*(Q[1-9]\d*)\.\s.+\*\*\s*$")
ANSWER = re.compile(r"^A\.\s+\S")

# 見つけたら落とす書き方。引用の答えは textlint が読まない。
QUOTED_ANSWER = re.compile(r"^>\s*\*\*(答え|解答)\*\*")
# `**Q1**: …` のように、番号だけを太字にして本文を外に出した形。
LOOSE_QUESTION = re.compile(r"^\*\*Q[1-9]\d*\*\*\s*[:：]")

EXPECTED_QUESTIONS = 3


def section_lines(text: str) -> list[str] | None:
    """`## 理解チェック` の中身を行のリストで返す。節が無ければ None。"""
    lines = text.splitlines()
    start = None
    for i, line in enumerate(lines):
        if line.strip() == HEADING:
            start = i + 1
            break
    if start is None:
        return None

    body: list[str] = []
    for line in lines[start:]:
        # 次の H2 で節が終わる。H3 以下は節の中身として扱う。
        if line.startswith("## "):
            break
        body.append(line)
    return body


def problems_in(name: str, text: str) -> list[str]:
    body = section_lines(text)
    if body is None:
        return [f"{name}: `{HEADING}` が無い"]

    found: list[str] = []
    questions = [l for l in body if QUESTION.match(l)]
    answers = [l for l in body if ANSWER.match(l)]
    quoted = [l for l in body if QUOTED_ANSWER.match(l)]
    loose = [l for l in body if LOOSE_QUESTION.match(l)]

    if len(questions) != EXPECTED_QUESTIONS:
        found.append(
            f"{name}: 問が {len(questions)} 個（`**Q1. …**` の形で {EXPECTED_QUESTIONS} 個必要）"
        )
    if len(answers) != EXPECTED_QUESTIONS:
        found.append(
            f"{name}: 答えが {len(answers)} 個（`A. ` で始まる行が {EXPECTED_QUESTIONS} 個必要）"
        )
    if quoted:
        found.append(
            f"{name}: 答えを引用で書いている行が {len(quoted)} 件。"
            "引用の中は textlint が読まないので `A. ` で書く"
        )
    if loose:
        found.append(f"{name}: `**Qn**:` の形の問が {len(loose)} 件。`**Qn. …**` にそろえる")
    return found


def main(argv: list[str]) -> int:
    args = argv[1:] or ["material/30days-curriculum"]

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

    findings: list[str] = []
    for path in targets:
        findings.extend(problems_in(path.name, path.read_text(encoding="utf-8")))

    if findings:
        print(f"❌ 理解チェックの不備 {len(findings)} 件（{len(targets)} ファイル中）")
        for f in findings:
            print(f"  {f}")
        return 1

    print(f"✅ 理解チェックの形 OK（{len(targets)} ファイル / 各 {EXPECTED_QUESTIONS} 問）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
