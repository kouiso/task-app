#!/usr/bin/env python3
"""同じ語が2通りに書かれていないかを見る。

外部レビューで指摘された誤字脱字と同じ層にある。既存の check_terms.py は専門用語だけを
対象にしていて、副詞や補助動詞の書き分けは素通りしていた（実測で「すでに」46件に対して
「既に」21件が混在していた）。同じ教材の中で書き方が揺れると、読者は別の意味かと考えて
一度手が止まる。

判定は多数決ではなく、教材で採用した書き方を正として固定する。多数決にすると、直した
そばから件数が動いて正解が入れ替わってしまう。

コードブロックの中は対象外にする。エラーメッセージの文字列は実装と一字一句そろえる必要が
あり、ここを書き換えると教材のとおりに写した読者のコードが実装と食い違う。
"""

import re
import sys
from pathlib import Path

FENCE = re.compile(r"^\s*(`{3,}|~{3,})")
# 行の中のバッククォートで囲んだ部分。実装のエラー文言をそのまま引用している所なので、
# ここを書き換えると教材のとおりに写した読者のコードと実装が食い違う。
INLINE_CODE = re.compile(r"`[^`]*`")

# (見つけたら直す書き方, 正とする書き方, その語を含むが直してはいけない語)
RULES: list[tuple[str, str, tuple[str, ...]]] = [
    ("既に", "すでに", ()),
    ("例えば", "たとえば", ()),
    ("全て", "すべて", ()),
    ("全く", "まったく", ()),
    ("ふだん", "普段", ()),
    ("わかる", "分かる", ("早わかる",)),
    ("わかり", "分かり", ("早わかり",)),
]


def prose_lines(text: str):
    """コードブロックの外にある行だけを (行番号, 本文) で返す。"""
    fence = False
    marker = ""
    for lineno, line in enumerate(text.split("\n"), 1):
        opener = FENCE.match(line)
        if opener:
            if not fence:
                fence, marker = True, opener.group(1)
            elif line.strip().startswith(marker[0]):
                fence = False
            continue
        if fence:
            continue
        yield lineno, line


def find(text: str):
    for lineno, line in prose_lines(text):
        # バッククォートの中身は同じ長さの空白へ置き換え、位置をずらさずに検査から外す。
        masked = INLINE_CODE.sub(lambda m: " " * len(m.group(0)), line)
        for wrong, right, keep in RULES:
            for m in re.finditer(re.escape(wrong), masked):
                head = line[: m.end()]
                if any(head.endswith(k) for k in keep):
                    continue
                yield lineno, wrong, right, line.strip()[:70]


def main(argv: list[str]) -> int:
    args = argv[1:] or ["material/30days-curriculum"]
    targets: list[Path] = []
    for a in args:
        p = Path(a)
        if p.is_dir():
            targets.extend(sorted(p.glob("*.md")))
        elif p.is_file():
            targets.append(p)
        else:
            print(f"❌ 見つかりません: {a}", file=sys.stderr)
            return 2

    if not targets:
        print("❌ 対象ファイルがありません", file=sys.stderr)
        return 2

    findings = []
    for path in targets:
        text = path.read_text(encoding="utf-8")
        for lineno, wrong, right, excerpt in find(text):
            findings.append((path.name, lineno, wrong, right, excerpt))

    if findings:
        print(f"❌ 書き方が揺れている箇所 {len(findings)} 件")
        for name, lineno, wrong, right, excerpt in findings:
            print(f"  {name}:{lineno} 「{wrong}」→「{right}」 | {excerpt}")
        return 1

    print(f"✅ 同じ語の書き分けなし（{len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
