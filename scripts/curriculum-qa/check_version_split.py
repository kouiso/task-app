#!/usr/bin/env python3
"""`完成版` の並びを、注記の無いブロックが途中で切っていないかを見る。

2026-09-12 に day18-30 の13日分がまとめて型検査 NG になった件の再発防止である。
原因は `build_day_snapshots.py` の版切り替え判定 `starts_module` への誤爆だった。

## 何が起きたか

教材は1つのファイルを複数のコードブロックに分けて載せる。続きのチャンクには
`// filepath: <path>（同じファイルの続き）` のように注記を付ける取り決めで、
注記が無く `const` や `import` で始まるブロックは「ファイルの書き直し版の先頭」と
見なされる。書き直し版が始まると、それまで積み上げた版は捨てられる。

day18 の `task-detail-dialog.tsx` では、`完成版` の並びの途中に注記なしで

    // filepath: src/component/task/task-detail-dialog.tsx
    const canEditComments = ...

というブロックが置かれた。これは完成版の1チャンクだったが、注記が無いため
「新しい版の先頭」と判定され、完成版は import と props 宣言のところで切断された。
切れた完成版は括弧が閉じないため「完全なファイル」にならず、採用候補から外れる。
このファイルは scaffold の配布物なので、完成版が採れないと配布時点の版
（`canEditProject` を受け取らない古い方）がそのまま残り、呼び出し側との型が
合わずに day18・day19 のビルドが止まった。

day20 の `src/app/search/page.tsx` では同じ形で `const normalizeDate` が完成版の
途中に置かれ、それ以降の部分だけが「最後の完全な版」に選ばれた。生成物は
import を全部欠いたファイルになり、day20-30 が `Cannot find name 'useRouter'`
で落ちた。

## 何を止めるか

同じ日・同じファイルの中で、`完成版` の目印を持つブロックが出た後に、
注記無しでファイル先頭の構文（`const` `import` `'use client'` 等）から始まる
ブロックが来たら止める。ただしその塊だけで完全なファイルになっているなら
正当な「次の版」なので通す（day09 の `root.ts` は完成版の後にもう1つ全体版を
出す）。`const` 始まりの塊は完全に見えても通さない。ファイルの書き直し版が
`const` から始まることは無く、import 群を失った断片が括弧と export だけ
釣り合って「完全」に見えるのは、まさに day20 で起きた壊れ方だからである。

`完成版` が出る前の Step 節の断片は対象外。あれは版の候補ではなく、後の日の版へ
差し込まれる部品で、注記を付けると差し込み側の判定から外れて別の壊れ方をする。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from build_day_snapshots import (  # noqa: E402
    first_code_line,
    is_complete_file,
    is_marked_final,
    starts_module,
    version_groups,
)
from curriculum_blocks import concat_by_file  # noqa: E402

# `const x = ...` のような宣言から始まる塊。ファイルの1行目には来られない。
# `export` 始まりはここに入らない（完成版の後の正当な全体版がありうる）。
DECL_START = re.compile(r"^\s*(?:const|let|var|function|async\s+function)\b")


def find_splits(path: Path) -> list[tuple[int, str, str]]:
    """1つの日次ファイルについて、完成版を分断したブロックを (行番号, 書込先, 先頭行) で返す。"""
    findings: list[tuple[int, str, str]] = []
    for target, blocks in sorted(concat_by_file([path]).items()):
        seen_final = False
        for group in version_groups(blocks):
            if any(is_marked_final(b) for b in group):
                seen_final = True
                continue
            if not seen_final:
                continue
            head_block = group[0]
            # 注記付き・コメント始まり・先頭構文でないブロックは版を切らない。
            if not starts_module(head_block):
                continue
            head = first_code_line(head_block)
            if DECL_START.match(head) or not is_complete_file(group):
                findings.append((head_block.lineno, target, head.strip()[:60]))
    return findings


def main(argv: list[str]) -> int:
    args = argv[1:]
    if not args:
        print("使用法: check_version_split.py <教材md | ディレクトリ> [...]")
        return 2

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

    findings: list[tuple[str, int, str, str]] = []
    for path in targets:
        for lineno, target, head in find_splits(path):
            findings.append((path.name, lineno, target, head))

    if findings:
        print(f"❌ 完成版の並びを分断する注記なしブロック {len(findings)} 件")
        for name, lineno, target, head in findings:
            print(f"  {name}:{lineno} — {target}（先頭: {head}）")
        print()
        print("  このブロックは `完成版` の続きです。ファイルの書き直しではないので、")
        print("  filepath 行に注記を付けてください。例:")
        print("    // filepath: <path>（同じファイルの続き）")
        print("  注記が無いと版の切り替え判定がこのブロックを新しい版の先頭と見なし、")
        print("  それまで積み上げた完成版が捨てられます。")
        return 1

    print(f"✅ 完成版の分断なし（{len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
