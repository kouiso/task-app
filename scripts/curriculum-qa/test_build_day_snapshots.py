#!/usr/bin/env python3
"""build_day_snapshots.py の退行テスト。

この検査は「Day N を終えた読者の手元」を機械が組み直せることに全部を賭けている。
組み方の境界が1つずれると、通ったツリーは読者の手元と別物になり、緑が何も
保証しなくなる。ずれやすいのは次の4つで、ここで固定する。

  - 写経の対象になるのは `src/` `prisma/` `scripts/` 配下の書き込み先だけである。
    「読み比べ用サンプル」や「ターミナル」は実ファイルを持たない。
  - scaffold が配るファイルは上書きしない。教材のブロックはその中の断片であり、
    丸ごと置き換えると読者の手元より壊れた状態になる。
  - 範囲外の day を指定したら止まる。黙って対象0件にすると全部緑に見える。
  - 表の形。ツリー構築とビルドの失敗を同じ見え方にすると、報告を読んだ人が
    「型は通ったが DB が無かっただけ」と「そもそも組めなかった」を区別できない。
"""

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import build_day_snapshots as target  # noqa: E402
from curriculum_blocks import concat_by_file  # noqa: E402


def block(value: str, body: str, lang: str = "tsx") -> str:
    return f"```{lang}\n// filepath: {value}\n{body}\n```\n"


# 書き込み先を持つブロックと、持たないブロックを1日ぶんに混ぜる。
DAY01 = (
    block("src/app/page.tsx", "export default function Page() { return null; }")
    + block("読み比べ用サンプル", "const sample = 1;")
    + block("ターミナル", "npm run dev", lang="bash")
    + "```bash\nnpm run dev\n```\n"
)

# 2日目は同じ書き込み先を書き直す。day02 の src/app/dashboard/page.tsx と同じ形で、
# 版の先頭には注記が無く、続きのチャンクにだけ注記が付く。
DAY02 = block("src/app/page.tsx", "const owner = 'Taro';\n\nexport default function Page() {") + block(
    "src/app/page.tsx（同じファイルの続き）", "  return null;\n}"
)

# scaffold が配る側のファイル。教材はここへ断片を書くが、ツリーには配布物が残る。
DAY03 = block("src/lib/utils.ts", "// 既存ファイルへの追記の断片")


def make_material(root: Path) -> None:
    (root / "day01_一日目.md").write_text(DAY01, encoding="utf-8")
    (root / "day02_二日目.md").write_text(DAY02, encoding="utf-8")
    (root / "day03_三日目.md").write_text(DAY03, encoding="utf-8")


def check_block_selection() -> list[str]:
    """写経の対象になる書き込み先だけが選ばれることを確かめる。"""
    fails = []
    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        make_material(root)
        by_file = concat_by_file(sorted(root.glob("day*.md")))

        if sorted(by_file) != ["src/app/page.tsx", "src/lib/utils.ts"]:
            fails.append(f"❌ 実ファイル以外を書き込み先として拾った: {sorted(by_file)}")
        if "読み比べ用サンプル" in by_file:
            fails.append("❌ 読み比べ用サンプルを実ファイルとして拾った")
        if "ターミナル" in by_file:
            fails.append("❌ ターミナルを実ファイルとして拾った")

        days = [b.day for b in by_file.get("src/app/page.tsx", [])]
        if days != [1, 2, 2]:
            fails.append(f"❌ 同じ書き込み先が day 順に集まっていない: {days}")
    return fails


def check_apply_blocks() -> list[str]:
    """ツリーへ実際に置かれるファイルを確かめる。"""
    fails = []
    with tempfile.TemporaryDirectory() as d:
        root = Path(d) / "material"
        root.mkdir()
        make_material(root)
        dest = Path(d) / "tree"
        dest.mkdir()
        written = target.apply_blocks(dest, sorted(root.glob("day*.md")))

        placed = sorted(p.relative_to(dest).as_posix() for p in dest.rglob("*") if p.is_file())
        if placed != ["src/app/page.tsx"]:
            fails.append(f"❌ ツリーへ置かれたファイルが違う: {placed}")
        if written != 1:
            fails.append(f"❌ 書いたファイル数が違う: {written}")

        body = (dest / "src/app/page.tsx").read_text(encoding="utf-8")
        if body.count("export default function Page") != 1:
            fails.append(f"❌ 書き直し版が前の版を置き換えていない: {body!r}")
        if "const owner" not in body or "return null;" not in body:
            fails.append(f"❌ 書き直し版とその続きが揃っていない: {body!r}")
        if "filepath:" in body:
            fails.append("❌ 目印の行を写経対象へ混ぜている")
    return fails


# 置き換えと追記の境界。どれも material/30days-curriculum の現物から採った形である。
# 左が「そのブロックだけを取り出した中身」、右が「書き直しの先頭か」。
BOUNDARY_CASES: list[tuple[str, str, str, bool]] = [
    # day02 src/app/dashboard/page.tsx。版の先頭は注記を持たず、コードで始まる。
    ("版の先頭（export default）", "", "export default function DashboardPage() {", True),
    ("版の先頭（const）", "", "const ownerName = 'Taro';", True),
    ("版の先頭（type）", "", "type DashboardOwner = {", True),
    # day05 src/app/login/page.tsx。
    ("版の先頭（use client）", "", "'use client';", True),
    ("版の先頭（import）", "", "import { z } from 'zod';", True),
    # 注記が付いていれば、教材が「続き・一部だ」と言っている。必ず追記。
    ("同じファイルの続き", "（同じファイルの続き）", "import { z } from 'zod';", False),
    ("import に追加", "（import に追加）", "import Link from 'next/link';", False),
    ("getAll の直後に追加", "（getAll の直後に追加）", "const x = 1;", False),
    # 貼る位置の説明から始まる断片。ファイルの1行目には来られない。
    ("JSX コメントの断片", "", "{/* メール入力欄の下に追加 */}", False),
    ("行コメントの断片", "", "// LoginFormコンポーネント内の先頭に追加", False),
    # 途中の行そのもの。JSX の途中や閉じ括弧だけのチャンク。
    ("JSX の途中", "", "  <article className=\"card\">", False),
    ("閉じ括弧だけ", "", "    </main>", False),
]


def check_version_boundary() -> list[str]:
    """置き換えと追記の境界を固定する。"""
    fails = []
    for name, note, first, want in BOUNDARY_CASES:
        b = target.Block(1, "day01_x.md", 1, "src/app/page.tsx", note, "tsx", (first,))
        if target.restarts_file(b, None) is not want:
            fails.append(f"❌ {name}: 書き直しの先頭かの判定が {not want} になっている")

    # `完成版` の run は先頭だけが書き直しで、続くチャンクは追記である。
    def marked(text: str, note: str = "") -> target.Block:
        return target.Block(5, "day05_x.md", 1, "src/app/login/page.tsx", note, "tsx", (text,))

    plain = marked("// onSubmit を書き換え")
    head = marked("// 完成版: 'use client' と外部ライブラリの import")
    tail = marked("// 完成版: プロジェクト内の部品の import")
    if not target.restarts_file(head, plain):
        fails.append("❌ 完成版の run の先頭で書き直しになっていない")
    if target.restarts_file(tail, head):
        fails.append("❌ 完成版の run の途中で書き直してしまっている")
    if target.restarts_file(marked("// 完成版: 続き", "（同じファイルの続き）"), plain):
        fails.append("❌ 注記付きの完成版チャンクで書き直してしまっている")

    # 並び全体を通したときに、最後の版とその続きだけが残ること。
    blocks = [
        marked("export default function A() {}"),
        marked("export default function B() {}"),
        marked("// B の続き", "（同じファイルの続き）"),
    ]
    kept = [b.lines[0] for b in target.latest_version(blocks)]
    if kept != ["export default function B() {}", "// B の続き"]:
        fails.append(f"❌ 最後の版とその続きだけが残っていない: {kept}")
    return fails


def run_cli(args: list[str]) -> int:
    """CLI を呼んで終了コードだけを見る。使い方の案内は自己テストの出力を汚すので捨てる。"""
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        return target.main(args)


def check_day_range() -> list[str]:
    """範囲外の day 指定が、黙って通らないことを確かめる。"""
    fails = []
    days = [1, 2, 3]
    for name, args in (
        ("範囲外の day", (99, False)),
        ("0 日目", (0, False)),
        ("--day と --all の同時指定", (1, True)),
        ("どちらも無い", (None, False)),
    ):
        try:
            target.select_days(args[0], args[1], days)
        except ValueError:
            continue
        fails.append(f"❌ {name} がエラーにならない")

    if target.select_days(2, False, days) != [2]:
        fails.append("❌ --day の指定でその日だけを選べていない")
    if target.select_days(None, True, days) != days:
        fails.append("❌ --all で全日を選べていない")

    if run_cli(["build_day_snapshots.py", "--day", "99"]) != 2:
        fails.append("❌ 範囲外の --day で 2 を返さない")
    if run_cli(["build_day_snapshots.py", "--day", "abc"]) != 2:
        fails.append("❌ 数字でない --day で 2 を返さない")
    if run_cli(["build_day_snapshots.py", "--zzz"]) != 2:
        fails.append("❌ 知らない引数で 2 を返さない")
    return fails


EXPECTED_TABLE = """| Day | ツリー構築 | tsc | build | 最初のエラー3行 |
| --- | --- | --- | --- | --- |
| day01 | OK（73 ファイル） | OK | OK | - |
| day02 | OK（74 ファイル） | NG | NG | src/app/page.tsx(1,1): error TS2304 |
| day03 | NG | 未実行 | 未実行 | OSError: 置けません |"""


def check_result_table() -> list[str]:
    """表の形を固定する。"""
    results = [
        target.DayResult(1, 73, True, "OK", "OK", ()),
        target.DayResult(2, 74, True, "NG", "NG", ("src/app/page.tsx(1,1): error TS2304",)),
        target.DayResult(3, 0, False, target.NOT_RUN, target.NOT_RUN, ("OSError: 置けません",)),
    ]
    got = target.result_table(results)
    if got != EXPECTED_TABLE:
        return [f"❌ 表の形が違う:\n{got}"]

    # `|` はセルの区切りなので、そのまま入れると列がずれる。
    piped = target.result_table([target.DayResult(1, 1, True, "NG", "NG", ("a | b",))])
    if "a \\| b" not in piped:
        return [f"❌ エラー行の `|` を潰していない: {piped}"]
    return []


def check_tsconfig_excludes() -> list[str]:
    """読者の tsconfig が scaffold の現物から作られていることを確かめる。"""
    excludes = target.tsconfig_excludes()
    missing = [e for e in ("scripts", "material", "src/server", "src/trpc") if e not in excludes]
    if missing:
        return [f"❌ scaffold が足す exclude を読めていない: {missing}"]
    return []


CHECKS = (
    ("写経対象の選び方", check_block_selection),
    ("ツリーへの書き出し", check_apply_blocks),
    ("置き換えと追記の境界", check_version_boundary),
    ("day の範囲", check_day_range),
    ("結果表の形", check_result_table),
    ("tsconfig の exclude", check_tsconfig_excludes),
)


def main() -> int:
    failed = 0
    for name, check in CHECKS:
        fails = check()
        for msg in fails:
            print(f"  {msg}（{name}）")
        failed += 1 if fails else 0
    total = len(CHECKS)
    if failed:
        print(f"❌ build_day_snapshots 自己テスト {total - failed}/{total} 合格")
        return 1
    print(f"✅ build_day_snapshots 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
