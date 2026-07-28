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
# 直後に式が来る予約語。`return <form>` のように識別子で終わる語の後ろでも、
# ここに載っている語なら JSX の開始とみなす。載せない語（`Array` `interface ... extends`）
# の後ろに来る `<` はジェネリクスか比較演算子なので、これまでどおり落とす。
EXPR_KEYWORDS = frozenset({"return", "yield", "await", "throw", "else", "case", "do"})
# JSX を書ける書き込み先とブロック。`.ts` では `<Foo>raw` は型アサーションであり、
# 開始タグではない。`concat_by_file` は JSX でない TypeScript のブロックも集めるので、
# 書き込み先と言語を見ないと、アサーションのぶんだけ閉じタグ不足を報告してしまう。
JSX_SUFFIXES = (".tsx", ".jsx")
JSX_LANGS = frozenset({"tsx", "jsx"})
# `.tsx` の中で `<` が型引数の宣言になる書き方。`const identity = <T,>(v: T) => v` は
# 正しい TypeScript で、`</T>` はどこにも要らない。`jsx=False` では逃げられない。
# その書き込み先は本当に JSX を書くファイルであり、開始タグの判定を止めると
# 本物の閉じ忘れまで見えなくなるためである。
# 型引数の並びだけを見分ける。決め手は3つ:
#   - 末尾のカンマ（`<T,>`）。JSX の属性はカンマで終わらない。
#   - `extends` の制約（`<T extends object>`）。JSX の属性名にはならない。
#   - 識別子をカンマで並べただけの形（`<T, U>`）。
# いずれも `>` の直後が `(` であることを必ず条件に足す。開始タグの直後に `(` が
# 来ることもある（`<p>(注)...`）が、その中身は上の3つの形にならない。
GENERIC_PARAMS = re.compile(
    r"[A-Za-z_$][\w$]*(?:\s+extends\s[^<>]*)?"
    r"(?:\s*,\s*[A-Za-z_$][\w$]*(?:\s+extends\s[^<>]*)?)*\s*,?\s*$"
)
GENERIC_MARK = re.compile(r",\s*$|\sextends\s|,")


def is_generic_params(inner: str, after: str) -> bool:
    """`<...>` の中身が JSX タグではなく型引数の並びなら True。

    inner は `<` と `>` の間、after は `>` から後ろ。
    """
    if not after.lstrip().startswith("("):
        return False
    return bool(GENERIC_MARK.search(inner)) and bool(GENERIC_PARAMS.fullmatch(inner.strip()))


def allows_jsx(target: str, langs: frozenset[str] | set[str]) -> bool:
    """その書き込み先で `<Foo>` を開始タグとして読んでよいなら True。

    拡張子を主に見る。`.ts` へ書くブロックがわざわざ ```tsx で囲まれている場合だけ、
    著者の意図を汲んで JSX として読む。
    """
    return target.endswith(JSX_SUFFIXES) or bool(langs & JSX_LANGS)


def scan_tags(code: str, *, jsx: bool = True) -> tuple[Counter, Counter]:
    """(開いたタグ, 閉じたタグ) の出現数を返す。code は mask_code 済みを渡す。

    jsx=False のときは開始タグを数えない。JSX を書けない書き込み先での `<Foo>` は
    型アサーションなので、対応する `</Foo>` は最初から存在しない。

    `useState<string>()` や `a < b` を数えないため、開始タグは直前の非空白文字が
    識別子・`)`・`]` でないことを条件にする。ジェネリクスと比較は必ず識別子か
    閉じ括弧の後に来るので、この1条件で落ちる。閉じタグ `</Foo>` は他の構文と
    衝突しないので、直前の文字は見ない。

    ただし `return <form>` は直前が `return` の `n` なので、この1条件だけだと
    開始タグを取り逃す。取り逃すと `</form>` がどこにも無くても
    「開いたタグが無い」ことになり、ゲートは静かに緑になる。直前が識別子のときは
    その語を見て、式が続く予約語（EXPR_KEYWORDS）なら開始タグとして数える。
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
            if not jsx:
                i += 1
                continue
            j = i - 1
            while j >= 0 and code[j] in " \t\n":
                j -= 1
            if j >= 0 and code[j] in ")]":
                i += 1
                continue
            if j >= 0 and IDENT.match(code[j]):
                k = j
                while k >= 0 and IDENT.match(code[k]):
                    k -= 1
                if code[k + 1 : j + 1] not in EXPR_KEYWORDS:
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
        if not is_close and is_generic_params(code[i + 1 : end], code[end + 1 : end + 16]):
            i = end + 1
            continue
        if is_close:
            closed[m.group(0)] += 1
        elif code[end - 1] != "/":
            opened[m.group(0)] += 1
        i = end + 1
    return opened, closed


def find_unclosed(paths: list[Path]) -> list[tuple[str, str, list[int]]]:
    """(書き込み先, 閉じられていないタグ名, そのタグを開いている day) を返す。

    mask_code はブロックごとに掛ける。連結してから1回で掛けると、ある day の
    断片に閉じていない `/*` が1つあるだけで、そこから後ろの day のコードが
    まるごと空白になる。mask_code は文字列については行末で打ち切る安全策を
    持つが、ブロックコメントには無い（curriculum_blocks.py の該当分岐は
    `*/` が無ければ末尾までを潰す）。ブロック単位で掛ければ、文字列と同じく
    ブロックの境目でマスクが止まる。

    day はブロック単位で数え直す。その書き込み先に触っただけの day まで挙げると、
    `check_false_success.py` が「day10 は正しく閉じている」という記述を、
    day29 が後から開きっぱなしにしたせいで偽と判定してしまう。
    """
    provided = scaffold_src_paths()
    hits: list[tuple[str, str, list[int]]] = []
    for target, blocks in sorted(concat_by_file(paths).items()):
        if target in provided:
            continue
        masked = [mask_code("\n".join(b.lines)) for b in blocks]
        jsx = allows_jsx(target, {b.lang for b in blocks})
        opened, closed = scan_tags("\n".join(masked), jsx=jsx)
        unclosed = [name for name in sorted(opened) if name not in closed]
        if not unclosed:
            continue
        per_block = [(b.day, scan_tags(code, jsx=jsx)[0]) for b, code in zip(blocks, masked)]
        for name in unclosed:
            days = sorted({day for day, op in per_block if name in op})
            # ブロック単体では開始タグを取れない書き方（タグがブロックを跨ぐ）が
            # 残りうる。その場合だけ、これまでどおり触った day を全部挙げる。
            hits.append((target, name, days or sorted({b.day for b in blocks})))
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
