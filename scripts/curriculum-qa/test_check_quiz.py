#!/usr/bin/env python3
"""check_quiz の自己テスト。

実際に起きた壊れ方をそのままケースにしてある。とくに day22〜30 で使われていた
`**Q1**: …` ＋ `> **答え**:` の形は、textlint を素通りさせたうえに見た目も割れる
ので、必ず落ちることを確かめる。
"""

import sys

from check_quiz import EXPECTED_QUESTIONS, problems_in

GOOD = """# Day 09

## 理解チェック

今日書いたコードを見ながら答えてみてください。答えは各問のすぐ下にあります。

**Q1. `some` は何を選ぶ条件ですか。**

A. 関係する行のうち1件でも条件に合うものを選びます。

**Q2. これを消すと何が起きますか。**

A. 他人のプロジェクトまで一覧に並びます。

**Q3. なぜサーバー側で絞るのですか。**

A. 画面側の絞り込みは通信を書き換えれば外せるためです。

## 次回予告
"""

QUOTED = """# Day 22

## 理解チェック

今日の内容が身についたかを3問で確かめます。

**Q1**: `statusData` は何を足していますか。

> **答え**: 日本語のラベルだけです。

**Q2**: 高さを外すとどうなりますか。

> **答え**: 扇が描かれません。

**Q3**: なぜ型ガードを通すのですか。

> **答え**: 対応表に無い値を逃がす道が残るためです。

## 次回予告
"""

MISSING = """# Day 31

## 今日のゴール

やること。

## 次回予告
"""

TWO_ONLY = """# Day 05

## 理解チェック

前置き。

**Q1. ひとつめ。**

A. こたえ。

**Q2. ふたつめ。**

A. こたえ。

## 次回予告
"""

ANSWER_MISSING = """# Day 06

## 理解チェック

前置き。

**Q1. ひとつめ。**

A. こたえ。

**Q2. ふたつめ。**

A. こたえ。

**Q3. みっつめ。**

こたえを `A. ` で始めていない段落。

## 次回予告
"""

# H3 は節の中身として扱う。ここで打ち切ると問を数え落とす。
WITH_H3 = """# Day 07

## 理解チェック

前置き。

### ふりかえり

**Q1. ひとつめ。**

A. こたえ。

**Q2. ふたつめ。**

A. こたえ。

**Q3. みっつめ。**

A. こたえ。

## 次回予告
"""

CASES = [
    ("そろっている形は通る", GOOD, 0),
    # 問0個・答え0個・引用3件・`**Qn**:` 3件で、報告は4件になる
    ("引用の答え＋Qn: の形は落ちる", QUOTED, 4),
    ("節が無ければ落ちる", MISSING, 1),
    ("問が2つなら落ちる", TWO_ONLY, 2),
    ("答えが2つなら落ちる", ANSWER_MISSING, 1),
    ("H3 を挟んでも通る", WITH_H3, 0),
]


def main() -> int:
    failed = 0
    for name, text, expected in CASES:
        got = len(problems_in("dayXX.md", text))
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} 件 / 実際 {got} 件")
    # 問の数そのものが緩められていないかも見る。
    if EXPECTED_QUESTIONS != 3:
        failed += 1
        print(f"  ❌ EXPECTED_QUESTIONS が {EXPECTED_QUESTIONS} に変えられています")
    total = len(CASES) + 1
    if failed:
        print(f"❌ check_quiz 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_quiz 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
