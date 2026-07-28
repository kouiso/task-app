#!/usr/bin/env python3
"""写経対象のコードで、開いた JSX タグの閉じタグが30日のどこにも書かれていないかを見る。

29周目に手で数えた検査の再建である。あのときは全30日のブロックを書き込み先ごとに
連結して括弧とタグの収支を出し、13件を見つけた。道具は残らなかったので、
30周目以降は同じ層を誰も見ていない。

## 括弧の収支をこの検査に入れなかった理由

連結した本文の `{}` `()` `[]` を数える形は作って測ったが、配線しなかった。教材の
コードブロックは「追記」だけではなく「既存行の書き換え」も含み、両者を見分ける印が
無いためである。現物では day19 の `src/component/task/task-detail-dialog.tsx` が該当する。

    まず `return` 直後の既存コードを次の形に変えます。
    ```typescript
    // filepath: src/component/task/task-detail-dialog.tsx
    return (
      <>
        <Dialog open={open}
    ```

この `return (` は新しく足す行ではなく、既に在る行の書き換えである。閉じる `);` は
書き換え前から在るので教材には現れない。連結して数えると `(` が1つ余る。完成版の
`src/component/task/task-detail-dialog.tsx` は 95 対 95 で釣り合っており、欠陥ではない。
現在の corpus 45ファイルのうち、括弧の収支が合わないのはこの種の再掲だけが理由の
6ファイルだった。誤検知が6件出るゲートは、赤を無視する習慣を作るだけなので入れない。

## 閉じタグの有無なら判定できる

再掲は行を増やす方向にしか働かない。既に在る `</form>` を消すことはない。だから
「開いたタグ名に対応する閉じタグが、その書き込み先の全ブロックを通して1つも無い」は
再掲の影響を受けない。29周目の最重量案件（day29 の `<form>` が30日のどこでも閉じない）は
この形で捕まる。

scaffold が最初から配るファイルは対象外にする。読者が写経していない行が既に手元に
在るので、教材のブロックだけを見ても閉じタグの有無は判定できない。
"""

from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

from curriculum_blocks import concat_by_file, mask_code
from sale_package import scaffold_src_paths

IDENT = re.compile(r"[A-Za-z0-9_$]")
TAG_NAME = re.compile(r"[A-Za-z][\w.\-]*")


def scan_tags(code: str) -> tuple[Counter, Counter]:
    """(開いたタグ, 閉じたタグ) の出現数を返す。code は mask_code 済みを渡す。

    `useState<string>()` や `a < b` を数えないため、開始タグは直前の非空白文字が
    識別子・`)`・`]` でないことを条件にする。ジェネリクスと比較は必ず識別子か
    閉じ括弧の後に来るので、この1条件で落ちる。閉じタグ `</Foo>` は他の構文と
    衝突しないので、直前の文字は見ない。
    """
    opened: Counter = Counter()
    closed: Counter = Counter()
    i, n = 0, len(code)
    while True:
        i = code.find("<", i)
        if i < 0:
            break
        is_close = code[i + 1 : i + 2] == "/"
        if not is_close:
            j = i - 1
            while j >= 0 and code[j] in " \t\n":
                j -= 1
            if j >= 0 and (IDENT.match(code[j]) or code[j] in ")]"):
                i += 1
                continue
        m = TAG_NAME.match(code, i + 2 if is_close else i + 1)
        if not m:
            i += 1
            continue
        # 属性の `{() => ...}` に `>` が入るので、波括弧の外の `>` だけを終端と見る。
        depth, p, end = 0, m.end(), -1
        while p < n:
            c = code[p]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            elif depth <= 0 and c == ">":
                end = p
                break
            elif depth <= 0 and c == "<":
                break
            p += 1
        if end < 0:
            i += 1
            continue
        if is_close:
            closed[m.group(0)] += 1
        elif code[end - 1] != "/":
            opened[m.group(0)] += 1
        i = end + 1
    return opened, closed


def find_unclosed(paths: list[Path]) -> list[tuple[str, str, list[int]]]:
    """(書き込み先, 閉じられていないタグ名, 出てくる day) を返す。"""
    provided = scaffold_src_paths()
    hits: list[tuple[str, str, list[int]]] = []
    for target, blocks in sorted(concat_by_file(paths).items()):
        if target in provided:
            continue
        code = mask_code("\n".join(l for b in blocks for l in b.lines))
        opened, closed = scan_tags(code)
        for name in sorted(opened):
            if name not in closed:
                hits.append((target, name, sorted({b.day for b in blocks})))
    return hits


def collect(argv: list[str]) -> list[Path] | int:
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
    return targets


def main(argv: list[str]) -> int:
    targets = collect(argv)
    if isinstance(targets, int):
        return targets

    findings = find_unclosed(targets)
    if findings:
        print(f"❌ 閉じタグが30日のどこにも無い {len(findings)} 件")
        for target, name, days in findings:
            span = "day" + "・day".join(f"{d:02d}" for d in days)
            print(f"  {target}: <{name}> を開くが </{name}> が無い（{span}）")
        print("  読者は開いたまま保存することになります。閉じる行を書いてください。")
        return 1

    print(f"✅ 閉じタグ OK（{len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
