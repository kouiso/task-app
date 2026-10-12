#!/usr/bin/env python3
"""`## 完成コード全体` 節が1ファイルにつき1つの権威記述だけを示しているかを見る（issue #631）。

## この検査が生まれた事故

day28 の `src/app/task/page.tsx` で、写経ツール `apply_day.py` が安全 reject を出した。
Step 節の指示フェンスと完成コード節の `完成版` フェンスが、同じ JSX の領域を
粒度違いで二度書いていた。完成版側はファイル全体ではなく抜粋だったので、道具は
全体の書き直し（WRITE）として採れず、断片の差し込み（SPLICE）に回す。差し込み先は
Step 側の断片と重なっており、どちらを適用すべきかを機械的に決められない。
day20・day21 の `app-layout.tsx` も同じ形で reject されていた。

是正は PR #622（day28）と PR #637（day05–10/13–25/29）で入れた。完成コード節では
抜粋から `完成版:` の目印を外し、末尾に complete-copy-unit の全ファイル listing を
1件だけ置く。この検査は、同じ構造が教材へ戻ってこないように止める。

## 何を止めるか

完成コード節の中で、書き込み先ファイルごとに次を見る。

1. 全ファイル listing（直前に complete-copy-unit の例外マーカーがあり、1行目が
   `// 完成版: ファイル全体` のフェンス）がある場合
   - listing は1件だけで、そのファイルの最後のフェンスであること
   - ほかのフェンスに `完成版:` / `完成形:` の目印が残っていないこと
   目印付きの抜粋と listing が並ぶと、権威記述が2つになる。
   `build_day_snapshots.py` は目印付きの並びを1つの版として連結するので、
   listing と抜粋の中身が二重に入ったファイルを組み立ててしまう。
2. listing が無い場合
   - そのファイルのフェンスを順に連結すると1つの完全なファイルになること
     （`is_complete_file`）。day11 `project.ts` のように、ファイル全体を
     見出しごとに分けて載せる形はこれで通る。
   - 完全なファイルにならない `完成版` の並びは抜粋である。抜粋は Step 節の断片と
     同じ領域を別の粒度で書き直すことになり、上の事故と同じ曖昧さを生む。
     本文で「今日足した部分だけを載せる」と断っている意図的な抜粋だけを
     DECLARED_EXCERPTS に理由つきで登録して通す。

フェンスが1つだけで目印も無いファイルは二重記述になりようがないので見ない。

## 見ないもの

Step 節のフェンスどうしの重なりはこの検査の対象外である。Step の断片は後の日の版へ
差し込まれる部品で、重なり自体は教材の設計どおりのことがある。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import NamedTuple

sys.path.insert(0, str(Path(__file__).parent))

from build_day_snapshots import is_complete_file  # noqa: E402
from curriculum_blocks import CODE_LANGS, Block, day_number, iter_blocks  # noqa: E402
from markdown_scan import fence_states  # noqa: E402

SECTION_TITLE = "## 完成コード全体"
UNIT_MARKER = "<!-- code-block-length-exception: complete-copy-unit -->"
FINAL_LABEL = re.compile(r"^\s*(?://|\{/\*)\s*完成[版形][:：]")
WHOLE_FILE = "ファイル全体"

# 本文で抜粋だと断っている完成コード節の記述。キーは (日, 書き込み先)、値は「なぜ抜粋でよいか」。
# 理由を書けない抜粋は全ファイル listing へ統合する。登録した記述が完全な
# ファイルになったら「登録が古い」として落とす。
DECLARED_EXCERPTS: dict[tuple[int, str], str] = {
    (27, "src/server/api/routers/project.ts"): (
        "本文で「500 行を超えるのでアーカイブに関わる2か所だけを載せる」と断っている。"
        "Gate B では SPLICE で適用され reject は出ない"
    ),
    (28, "src/server/api/routers/task.ts"): (
        "本文で「Day 13 から Day 16 の中身が残るので今日足した部分だけを載せる」と断っている。"
        "Gate B では SPLICE で適用され reject は出ない"
    ),
}


class Finding(NamedTuple):
    """1件の違反。"""

    source: str
    lineno: int
    target: str
    message: str


class SectionFence(NamedTuple):
    """完成コード節の中の1フェンス。"""

    block: Block
    labeled: bool
    whole: bool


def section_range(text: str) -> tuple[int, int] | None:
    """完成コード節の (見出しの行番号, 次の h2 の行番号) を返す。行番号は1始まり。

    コード例の中の `## ...` を節の境界と読まないよう、フェンスの外の行だけを見る。
    """
    start: int | None = None
    last = 0
    for lineno, line, state, _fence in fence_states(text):
        last = lineno
        if state != "outside":
            continue
        if start is None:
            if line.rstrip() == SECTION_TITLE:
                start = lineno
        elif line.startswith("## "):
            return start, lineno
    return (start, last + 1) if start is not None else None


def preceded_by_unit_marker(lines: list[str], fence_lineno: int) -> bool:
    """フェンスのすぐ上（空行を飛ばした最初の行）が complete-copy-unit の例外マーカーか。"""
    for i in range(fence_lineno - 2, -1, -1):
        if lines[i].strip():
            return lines[i].strip() == UNIT_MARKER
    return False


def section_fences(text: str, source: str) -> dict[str, list[SectionFence]]:
    """完成コード節のフェンスを書き込み先ごとに、現れた順で返す。"""
    span = section_range(text)
    if span is None:
        return {}
    start, end = span
    lines = text.split("\n")
    out: dict[str, list[SectionFence]] = {}
    for block in iter_blocks(text, source):
        if not start < block.lineno < end:
            continue
        if not block.is_writing_target or block.lang not in CODE_LANGS:
            continue
        head = next((line for line in block.lines if line.strip()), "")
        labeled = bool(FINAL_LABEL.match(head))
        whole = (
            labeled
            and WHOLE_FILE in head
            and preceded_by_unit_marker(lines, block.lineno)
        )
        out.setdefault(block.target, []).append(SectionFence(block, labeled, whole))
    return out


def check_target(
    day: int, target: str, fences: list[SectionFence], source: str
) -> list[Finding]:
    """1つの書き込み先について、完成コード節の記述が1つの権威に収まっているかを見る。"""
    wholes = [f for f in fences if f.whole]
    labeled_parts = [f for f in fences if f.labeled and not f.whole]
    declared = (day, target) in DECLARED_EXCERPTS
    first = fences[0].block.lineno

    if wholes:
        findings: list[Finding] = []
        if len(wholes) > 1:
            findings.append(
                Finding(source, wholes[1].block.lineno, target,
                        f"全ファイル listing が {len(wholes)} 件ある（1件にまとめる）")
            )
        if not fences[-1].whole:
            findings.append(
                Finding(source, fences[-1].block.lineno, target,
                        "全ファイル listing の後ろに同じファイルのフェンスが続いている"
                        "（listing を最後に置く）")
            )
        for part in labeled_parts:
            findings.append(
                Finding(source, part.block.lineno, target,
                        "全ファイル listing と `完成版:` 付きの抜粋が並んでいる"
                        "（抜粋の `完成版:` を外す）")
            )
        if declared:
            findings.append(
                Finding(source, first, target,
                        "DECLARED_EXCERPTS に登録があるが全ファイル listing に統合済み（登録が古い）")
            )
        return findings

    if len(fences) == 1 and not labeled_parts:
        return []

    complete = is_complete_file([f.block for f in fences])
    if complete:
        if declared:
            return [
                Finding(source, first, target,
                        "DECLARED_EXCERPTS に登録があるが完全なファイルになっている（登録が古い）")
            ]
        return []
    if declared:
        return []
    return [
        Finding(source, first, target,
                f"完成コード節の {len(fences)} フェンスが完全なファイルにならない抜粋になっている。"
                "末尾に complete-copy-unit の全ファイル listing を置き、抜粋の `完成版:` を外す")
    ]


def check_file(path: Path) -> list[Finding]:
    """1つの日次ファイルを検査する。"""
    text = path.read_text(encoding="utf-8")
    day = day_number(path.name)
    findings: list[Finding] = []
    for target, fences in section_fences(text, path.name).items():
        findings.extend(check_target(day, target, fences, path.name))
    return findings


def main(argv: list[str]) -> int:
    args = argv[1:]
    if not args:
        print("使用法: check_complete_section_fences.py <教材md | ディレクトリ> [...]")
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

    findings = [f for path in targets for f in check_file(path)]
    if findings:
        print(f"❌ 完成コード節の二重記述 {len(findings)} 件")
        for f in findings:
            print(f"  {f.source}:{f.lineno} — {f.target}: {f.message}")
        print()
        print("  完成コード節では1ファイルにつき権威記述を1つだけ置きます。")
        print("  Step で書き足したファイルは、抜粋の `完成版:` を外して末尾に次の形の listing を置きます:")
        print(f"    {UNIT_MARKER}")
        print("    // filepath: <path>")
        print("    // 完成版: ファイル全体")
        return 1

    print(f"✅ 完成コード節の二重記述なし（{len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
