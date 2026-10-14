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

1. 全ファイル listing（1行目が `// 完成版: ファイル全体` のフェンス）がある場合
   25 行を超える listing には complete-copy-unit の例外マーカーが付くが、
   短い listing にマーカーを付けると `check_step_length.py` が「不要」として落とす。
   なので listing かどうかはマーカーではなく目印の文言で見分ける。
   - listing は1件だけで、そのファイルの最後のフェンスであること
   - ほかのフェンスに `完成版:` / `完成形:` の目印が残っていないこと
   目印付きの抜粋と listing が並ぶと、権威記述が2つになる。
   `build_day_snapshots.py` は目印付きの並びを1つの版として連結するので、
   listing と抜粋の中身が二重に入ったファイルを組み立ててしまう。
   - listing 単体がファイル全体になっていること（`is_complete_file`）
   - listing の前に並べた断片の各行が、listing のトークン列の中に連続して現れること
   目印の文言は手で書けるので、中身が途中で切れた listing や、その日の変更を
   含まない前日の版でも構造だけなら通ってしまう。day25 `app-layout.tsx` の
   listing が前日の版のままで、断片で示したプロフィールへの入口を欠いていた。
   トークンで比べるのは、`= 1` が `= 10` の一部として一致したり、文字列の中の
   空白の違いを見落としたりしないため。行の折り返しと字下げの違いは差にしない。
   断片の import 文は listing 側で1つの import にまとめ直すので行では照合せず、
   取り込む名前がすべて listing の同じモジュールの import にあることを見る。
   listing が断片と別の実装を載せている既知の箇所は LISTING_DIVERGES に、
   理由と「listing に無い断片の行数」を添えて登録する。行数が変わったら落とす。
2. listing が無い場合
   - そのファイルのフェンスを順に連結すると1つの完全なファイルになること
     （`is_complete_file`）。day11 `project.ts` のように、ファイル全体を
     見出しごとに分けて載せる形はこれで通る。
   - 完全なファイルにならない `完成版` の並びは抜粋である。抜粋は Step 節の断片と
     同じ領域を別の粒度で書き直すことになり、上の事故と同じ曖昧さを生む。
     本文で「今日足した部分だけを載せる」と断っている意図的な抜粋だけを
     DECLARED_EXCERPTS に理由つきで登録して通す。

フェンスが1つだけで目印も無いファイルも同じ規則で見る。完成コード節に断片が1つだけ
置かれると、読者はそれをファイル全体と読んで貼り付け、既存の中身を消してしまう。

目印は `完成版` だけを認める。`build_day_snapshots.py` は `完成形:` を目印として
読まないので、`// 完成形: ファイル全体` と書くと検査は listing と見なすのに
スナップショットは別の版として扱い、二重記述が素通りする。`完成形:` の目印は
それ自体を誤りとして落とす。

`## 完成コード全体` の見出しが1ファイルに2つあっても、すべての節を見る。

## 見ないもの

Step 節のフェンスどうしの重なりはこの検査の対象外である。Step の断片は後の日の版へ
差し込まれる部品で、重なり自体は教材の設計どおりのことがある。

`is_complete_file` は先頭の構文・export・括弧の収支を見る近似で、TypeScript として
構文が正しいかまでは見ない。構文の正しさは `build_day_snapshots.py --verify` の
tsc と Gate B のパーサーが受け持つ。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import NamedTuple

sys.path.insert(0, str(Path(__file__).parent))

from build_day_snapshots import is_complete_file  # noqa: E402
from check_complete_code import TOKEN, strip_comments  # noqa: E402
from curriculum_blocks import CODE_LANGS, Block, day_number, iter_blocks  # noqa: E402
from markdown_scan import fence_states  # noqa: E402

SECTION_TITLE = "## 完成コード全体"
UNIT_MARKER = "<!-- code-block-length-exception: complete-copy-unit -->"
FINAL_LABEL = re.compile(r"^\s*(?://|\{/\*)\s*完成[版形](?:（[^）]*）)?[:：]")
SHAPE_LABEL = re.compile(r"^\s*(?://|\{/\*)\s*完成形(?:（[^）]*）)?[:：]")
WHOLE_FILE = re.compile(r"^\s*(?://|\{/\*)\s*完成版[:：]\s*ファイル全体\s*(?:\*/\})?\s*$")
EXCERPT_SKIP = re.compile(r"^(?://|/\*|\*|\{/\*|\.\.\.|…)")
IMPORT_START = re.compile(r"^\s*import\b(?!\s*[.(])")
IMPORT_END = re.compile(r"""(?:\bfrom\s*|^\s*import\s*)(['"])([^'"]+)\1""")
TOKEN_SEP = "\x00"

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

# listing が断片と別の実装を載せている既知の箇所。キーは (日, 書き込み先)、
# 値は (理由, listing に無い断片の行数)。行数を持つのは、登録した箇所に新しいずれが
# 足されても素通りしないようにするため。数が変わったら登録を見直す。
LISTING_DIVERGES: dict[tuple[int, str], tuple[str, int]] = {
    (28, "src/app/task/page.tsx"): (
        "listing は PR #622 で src/ の実装を載せたもので、断片とは変数名（task と t）と"
        "一括ハンドラーの判定（canCompleteSelected と selectedTaskList.length > 0）が違う。"
        "Step に無い URL 同期フィルタ（useSearchParams と router.replace）も使っている。"
        "`@/lib/task-filter-query` は #650 で配布物に足して import 自体は解決するが、"
        "Step で教えていない実装は残る。方針の決定と直しを行い、終わったらこの登録を消す。追跡: #657",
        12,
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
    line_numbers: tuple[int, ...]


def section_ranges(text: str) -> list[tuple[int, int]]:
    """完成コード節ごとの (見出しの行番号, 次の h2 の行番号) を返す。行番号は1始まり。

    コード例の中の `## ...` を節の境界と読まないよう、フェンスの外の行だけを見る。
    """
    spans: list[tuple[int, int]] = []
    start: int | None = None
    last = 0
    for lineno, line, state, _fence in fence_states(text):
        last = lineno
        if state != "outside" or not line.startswith("## "):
            continue
        if start is not None:
            spans.append((start, lineno))
            start = None
        if line.rstrip() == SECTION_TITLE:
            start = lineno
    if start is not None:
        spans.append((start, last + 1))
    return spans


def _content_line_numbers(text_lines: list[str], block: Block) -> tuple[int, ...]:
    """block.lines の各行が教材ファイルの何行目かを返す。

    filepath 行は lines から外されており、ブロックの1行目とは限らないので、
    フェンスの開きから順に突き合わせて位置を取り直す。
    """
    numbers: list[int] = []
    i = block.lineno
    for line in block.lines:
        while text_lines[i] != line:
            i += 1
        numbers.append(i + 1)
        i += 1
    return tuple(numbers)


def section_fences(text: str, source: str) -> dict[str, list[SectionFence]]:
    """完成コード節のフェンスを書き込み先ごとに、現れた順で返す。"""
    spans = section_ranges(text)
    if not spans:
        return {}
    text_lines = text.split("\n")
    out: dict[str, list[SectionFence]] = {}
    for block in iter_blocks(text, source):
        if not any(start < block.lineno < end for start, end in spans):
            continue
        if not block.is_writing_target or block.lang not in CODE_LANGS:
            continue
        head = next((line for line in block.lines if line.strip()), "")
        labeled = bool(FINAL_LABEL.match(head))
        whole = bool(WHOLE_FILE.match(head))
        numbers = _content_line_numbers(text_lines, block)
        out.setdefault(block.target, []).append(SectionFence(block, labeled, whole, numbers))
    return out


def _line_tokens(line: str) -> list[str]:
    # 行ごとに切ってから字句に分ける。複数行にまたがるテンプレート文字列を
    # 断片側と listing 側で同じ切り方にそろえるため、ファイル全体では字句に分けない。
    return TOKEN.findall(strip_comments(line))


def _joined(tokens: list[str]) -> str:
    return TOKEN_SEP + TOKEN_SEP.join(tokens) + TOKEN_SEP


class ImportStmt(NamedTuple):
    """断片または listing の中の1つの import 文。"""

    lineno: int
    indexes: tuple[int, ...]
    module: str
    names: frozenset[str]


def _import_names(clause: str) -> frozenset[str]:
    """`import` と `from` の間から、取り込んだローカル名を取り出す。"""
    clause = re.sub(r"^\s*type\s+", "", clause)
    names: set[str] = set()
    braces = re.search(r"\{([^}]*)\}", clause)
    if braces:
        for spec in braces.group(1).split(","):
            spec = re.sub(r"^\s*type\s+", "", spec).strip()
            if spec:
                names.add(spec.split(" as ")[-1].strip())
        clause = clause[: braces.start()] + clause[braces.end() :]
    for spec in clause.split(","):
        spec = spec.strip()
        if spec:
            names.add(spec.split(" as ")[-1].strip())
    return frozenset(names)


def import_statements(lines: list[str], numbers: tuple[int, ...]) -> list[ImportStmt]:
    """行の並びから import 文を拾う。複数行にまたがる import も1文として扱う。"""
    stmts: list[ImportStmt] = []
    i = 0
    while i < len(lines):
        if not IMPORT_START.match(lines[i]):
            i += 1
            continue
        # `} from` と取り込み元を別の行に折ることがあるので、行を足しながら文の終わりを探す。
        # 行内コメントの `from '…'` を文の終わりと読まないよう、コメントは外してから探す。
        j = i
        text = strip_comments(lines[i]).strip()
        end = IMPORT_END.search(text)
        while end is None and j + 1 < len(lines):
            j += 1
            text += " " + strip_comments(lines[j]).strip()
            end = IMPORT_END.search(text)
        if end is None:
            break
        clause = re.sub(r"^import\b", "", text[: end.start()]).strip()
        stmts.append(
            ImportStmt(numbers[i], tuple(range(i, j + 1)), end.group(2), _import_names(clause))
        )
        i = j + 1
    return stmts


def missing_excerpt_lines(
    parts: list[SectionFence], listing: SectionFence
) -> list[tuple[int, str]]:
    """listing の前の断片のうち、listing に見当たらない行を (行番号, 行) で返す。

    行の折り返しや字下げは listing 側で変わることがあるので、断片の1行の字句が
    listing の字句列の中に連続して現れるかで見る。断片の末尾要素はカンマを持たずに
    切れることがあるので、行末のカンマは外して探す。import 文は名前の集合で照合する。
    """
    listing_lines = listing.block.lines
    body = _joined([t for line in listing_lines for t in _line_tokens(line)])
    listing_imports: dict[str, set[str]] = {}
    for stmt in import_statements(listing_lines, listing.line_numbers):
        listing_imports.setdefault(stmt.module, set()).update(stmt.names)

    missing: list[tuple[int, str]] = []
    for part in parts:
        lines = part.block.lines
        in_import: set[int] = set()
        for stmt in import_statements(lines, part.line_numbers):
            in_import.update(stmt.indexes)
            lacking = stmt.names - listing_imports.get(stmt.module, set())
            if stmt.module not in listing_imports or lacking:
                names = ", ".join(sorted(lacking))
                shown = f"'{stmt.module}' から取り込む {names}" if names else f"import '{stmt.module}'"
                missing.append((stmt.lineno, shown))
        for index, (lineno, line) in enumerate(zip(part.line_numbers, lines)):
            stripped = line.strip()
            if index in in_import or not stripped or EXCERPT_SKIP.match(stripped):
                continue
            tokens = _line_tokens(stripped)
            if tokens and tokens[-1] == ",":
                tokens = tokens[:-1]
            if tokens and _joined(tokens) not in body:
                missing.append((lineno, stripped))
    return missing


def check_listing_content(
    day: int, target: str, fences: list[SectionFence], source: str
) -> list[Finding]:
    """最後の全ファイル listing が、ファイル全体であり断片の中身を含んでいるかを見る。"""
    listing = fences[-1]
    if not listing.whole:
        return []
    findings: list[Finding] = []
    if not is_complete_file([listing.block]):
        findings.append(
            Finding(source, listing.block.lineno, target,
                    "全ファイル listing がファイル全体になっていない"
                    "（先頭の構文・export・括弧の収支のどれかが崩れている）")
        )
    missing = missing_excerpt_lines(fences[:-1], listing)
    registered = LISTING_DIVERGES.get((day, target))
    if registered is None:
        if missing:
            lineno, line = missing[0]
            findings.append(
                Finding(source, lineno, target,
                        f"listing の前の断片に listing に無い行が {len(missing)} 行ある"
                        f"（最初: `{line}`）。その日の変更を listing へ反映する")
            )
    elif not missing:
        findings.append(
            Finding(source, listing.block.lineno, target,
                    "LISTING_DIVERGES に登録があるが断片はすべて listing に入っている（登録が古い）")
        )
    elif len(missing) != registered[1]:
        findings.append(
            Finding(source, missing[0][0], target,
                    f"LISTING_DIVERGES に登録した listing に無い断片の行数は {registered[1]} 行だが、"
                    f"いまは {len(missing)} 行ある（ずれが変わったので登録を見直す）")
        )
    return findings


def check_target(
    day: int, target: str, fences: list[SectionFence], source: str
) -> list[Finding]:
    """1つの書き込み先について、完成コード節の記述が1つの権威に収まっているかを見る。"""
    findings: list[Finding] = [
        Finding(source, f.block.lineno, target,
                "`完成形:` は build_day_snapshots が目印として読まない（`完成版:` に直す）")
        for f in fences
        if SHAPE_LABEL.match(next((line for line in f.block.lines if line.strip()), ""))
    ]
    return findings + _check_authority(day, target, fences, source)


def _check_authority(
    day: int, target: str, fences: list[SectionFence], source: str
) -> list[Finding]:
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
        findings.extend(check_listing_content(day, target, fences, source))
        return findings

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
        print("  Step で書き足したファイルは、抜粋の `完成版:` を外して末尾に次の形の listing を置きます")
        print(f"  （25 行を超える listing には直前に {UNIT_MARKER} を付けます）:")
        print("    // filepath: <path>")
        print("    // 完成版: ファイル全体")
        return 1

    print(f"✅ 完成コード節の二重記述なし（{len(targets)} ファイル）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
