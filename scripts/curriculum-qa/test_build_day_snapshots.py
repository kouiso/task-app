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

import ast
import contextlib
import inspect
import io
import json
import re
import shutil
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
# (名前, 注記, 最初の行, ファイルの書き直しの先頭か)
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
    ("JSX の途中", "", '  <article className="card">', False),
    ("閉じ括弧だけ", "", "    </main>", False),
]


def blk(day: int, note: str, *lines: str) -> "target.Block":
    return target.Block(day, f"day{day:02d}_x.md", 1, "src/app/page.tsx", note, "tsx", lines)


def check_version_boundary() -> list[str]:
    """置き換えと追記の境界を固定する。"""
    fails = []
    for name, note, first, want in BOUNDARY_CASES:
        if target.starts_module(blk(1, note, first)) is not want:
            fails.append(f"❌ {name}: 書き直しの先頭かの判定が {not want} になっている")

    # 最後の版とその続きだけが残る（day02 src/app/dashboard/page.tsx の形）。
    kept = target.latest_version([
        blk(1, "", "export default function A() {}"),
        blk(2, "", "export default function B() {}"),
        blk(2, "（同じファイルの続き）", "// B の続き"),
    ])
    if [b.lines[0] for b in kept] != ["export default function B() {}", "// B の続き"]:
        fails.append(f"❌ 最後の版とその続きだけが残っていない: {[b.lines[0] for b in kept]}")

    # `完成版` の run。途中に注記なしのチャンクが混ざっても run は切れない
    # （day06 src/app/register/page.tsx は import とスキーマの間に続きを挟む）。
    kept = target.latest_version([
        blk(6, "", "// 進める前の断片"),
        blk(6, "", "// 完成版: import部分", "import { z } from 'zod';"),
        blk(6, "（同じファイルの続き）", "  },"),
        blk(6, "", "// 完成版: 関数の前半", "export default function P() {}"),
    ])
    heads = [b.lines[0] for b in kept]
    if heads != ["// 完成版: import部分", "  },", "// 完成版: 関数の前半"]:
        fails.append(f"❌ 完成版の run が途中で切れている: {heads}")

    # run はその日のもの。日が変われば次の日の完成版が改めて置き換える。
    kept = target.latest_version([
        blk(6, "", "// 完成版: 古い版", "export default function Old() {}"),
        blk(7, "", "// 完成版: 新しい版", "export default function New() {}"),
    ])
    if [b.day for b in kept] != [7]:
        fails.append(f"❌ 日をまたいだ完成版が前の日を置き換えていない: {[b.day for b in kept]}")

    # チャンクの見出しは教材のメタ情報なので写経の中身へ入れない。
    # `{/* 完成版: ... */}` が配列リテラルへ入ると構文エラーになる（day08 の focusCards）。
    body = target.render([blk(8, "", "{/* 完成版: 残りのカード */}", "    { label: 'Today' },")])
    if "完成版" in body:
        fails.append(f"❌ チャンクの見出しを写経の中身へ混ぜている: {body!r}")
    if "label: 'Today'" not in body:
        fails.append(f"❌ 見出しを落とすときに中身まで落としている: {body!r}")
    kept_label = target.render([blk(8, "", "const x = 1; // 完成版ではない普通の行")])
    if "完成版ではない" not in kept_label:
        fails.append("❌ 見出しでないコメントまで落としている")
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
    fails = []
    excludes = target.tsconfig_excludes()
    missing = [e for e in ("scripts", "material", "src/server", "src/trpc") if e not in excludes]
    if missing:
        fails.append(f"❌ scaffold が足す exclude を読めていない: {missing}")

    # 読者の手元より厳しい設定で検査すると、読者には出ないエラーで赤くなる。
    # 教材 day11 が「Day 01 で生成される tsconfig.json は exactOptionalPropertyTypes を
    # 有効にしていません」と書いており、scaffold も exclude しか触らない。
    with tempfile.TemporaryDirectory() as d:
        target.write_reader_tsconfig(Path(d))
        written = json.loads((Path(d) / "tsconfig.json").read_text(encoding="utf-8"))
    left = [o for o in target.STRICTER_THAN_READER if o in written["compilerOptions"]]
    if left:
        fails.append(f"❌ 読者に無い厳しめの設定が残っている: {left}")
    if written["compilerOptions"].get("strict") is not True:
        fails.append("❌ create-next-app が置く strict まで落としている")
    return fails


# まるごと1ファイルか抜粋か。どれも material/30days-curriculum の現物から採った形である。
FULL_APP_LAYOUT = (
    "'use client';",
    "import { Home } from 'lucide-react';",
    "export function AppLayout({ children }: Props) {",
    "  return <div>{children}</div>;",
    "}",
)
# day13 src/component/layout/app-layout.tsx の完成版。アイコンの import とメニュー項目だけで
# 外へ出すものが無い。括弧は合っており先頭も import なので、export の有無でしか落とせない。
EXCERPT_ICONS = (
    "import {",
    "  ClipboardList,",
    "} from 'lucide-react';",
    "const menuItems: MenuItem[] = [",
    "  { href: '/task', label: 'タスク' },",
    "];",
)
# day25 の同ファイルの完成版。JSX の途中から始まる。
EXCERPT_JSX = ("<Link href=\"/profile\">", "  <span>プロフィール</span>", "</Link>")
# 途中で切れた塊。括弧が閉じていない。
EXCERPT_TRUNCATED = ("export function AppLayout() {", "  return (")


def check_complete_file() -> list[str]:
    """まるごと1ファイルの塊と、変更箇所の抜粋を見分ける境界を固定する。"""
    fails = []
    cases = [
        ("ファイルまるごと", FULL_APP_LAYOUT, True),
        ("抜粋（export が無い）", EXCERPT_ICONS, False),
        ("抜粋（JSX の途中から）", EXCERPT_JSX, False),
        ("抜粋（括弧が閉じていない）", EXCERPT_TRUNCATED, False),
    ]
    for name, lines, want in cases:
        if target.is_complete_file([blk(8, "", *lines)]) is not want:
            fails.append(f"❌ {name}: まるごとかの判定が {not want} になっている")

    # 後から来た抜粋は、前のまるごとの版を置き換えない（day13〜27 の app-layout.tsx）。
    kept = target.latest_version([
        blk(8, "", *FULL_APP_LAYOUT),
        blk(13, "", "// 完成版: アイコンのインポート", *EXCERPT_ICONS),
    ])
    if [b.day for b in kept] != [8]:
        fails.append(f"❌ 抜粋が前のまるごとの版を捨てている: {[b.day for b in kept]}")

    # 後から来たまるごとの版は、前のまるごとの版を置き換える。
    kept = target.latest_version([
        blk(8, "", *FULL_APP_LAYOUT),
        blk(21, "", "// 完成版: 全体", *FULL_APP_LAYOUT),
    ])
    if [b.day for b in kept] != [21]:
        fails.append(f"❌ 新しいまるごとの版が採られていない: {[b.day for b in kept]}")

    # まるごとの塊が1つも無ければ、最後の塊を返す（従来どおりの最善努力）。
    kept = target.latest_version([blk(9, "", *EXCERPT_JSX), blk(9, "", *EXCERPT_ICONS)])
    if not kept:
        fails.append("❌ まるごとの塊が無いときに空を返している")

    # 塊の切り方そのもの。完成版 run の途中に注記なしのチャンクが混ざっても切れない。
    groups = target.version_groups([
        blk(6, "", "// 完成版: import部分", "import { z } from 'zod';"),
        blk(6, "（同じファイルの続き）", "  },"),
        blk(6, "", "// 完成版: 関数の前半", "export default function P() {}"),
        blk(7, "", "// 完成版: 別の日", "export default function Q() {}"),
    ])
    if [len(g) for g in groups] != [3, 1]:
        fails.append(f"❌ 版の切り方が違う: {[len(g) for g in groups]}")

    # 版は日をまたがない。翌日の差し込みを前の日の完全な版へ足すと壊れる
    # （day15 `src/server/api/routers/task.ts` に day16 の `（delete の直後に追加）` が付いていた）。
    groups = target.version_groups([
        blk(15, "", *FULL_APP_LAYOUT),
        blk(16, "（delete の直後に追加）", "  addTime: protectedProcedure", "  }),"),
    ])
    if [len(g) for g in groups] != [1, 1]:
        fails.append(f"❌ 翌日の差し込みが前の日の版へ入っている: {[len(g) for g in groups]}")
    kept = target.latest_version([
        blk(15, "", *FULL_APP_LAYOUT),
        blk(16, "（delete の直後に追加）", "  addTime: protectedProcedure", "  }),"),
    ])
    if [b.day for b in kept] != [15]:
        fails.append(f"❌ 翌日の差し込みが採られている: {[b.day for b in kept]}")
    return fails


ROUTER = """export const taskRouter = createTRPCRouter({
  delete: protectedProcedure
    .mutation(async () => {
      return 1;
    }),
});"""


def check_insertion() -> list[str]:
    """差し込み先を名指しした抜粋が、前の完全な版へ入ることを確かめる。"""
    fails = []
    got = target.insert_fragment(ROUTER, "delete", "直後に追加", "  addTime: x,")
    if got is None or "  }),\n  addTime: x,\n});" not in got:
        fails.append(f"❌ 直後への差し込みが効いていない: {got!r}")

    got = target.insert_fragment(ROUTER, "taskRouter", "前に追加", "const schema = 1;")
    if got is None or not got.startswith("const schema = 1;\nexport const taskRouter"):
        fails.append(f"❌ 前への差し込みが効いていない: {got!r}")

    # 差し込み先が無いときに末尾へ足さない。閉じ括弧の外へ出た壊れた版になるため。
    if target.insert_fragment(ROUTER, "notThere", "直後に追加", "x") is not None:
        fails.append("❌ 差し込み先が無いのに足している")

    # 採った版より後の日の抜粋だけを、日の順に入れる。
    blocks = [
        blk(15, "", "export const taskRouter = createTRPCRouter({", "  delete: x,", "});"),
        blk(16, "（delete の直後に追加）", "  addTime: y,"),
        blk(20, "（addTime の直後に追加）", "  bulkDelete: z,"),
    ]
    merged = target.apply_insertions(target.render(blocks[:1]), blocks, 15)
    if merged.index("addTime") > merged.index("bulkDelete"):
        fails.append(f"❌ 差し込みの順番が違う: {merged!r}")
    # 採った版と同じ日以前の注記は、その版へ既に入っているので二重に足さない。
    if "addTime" in target.apply_insertions(target.render(blocks[:1]), blocks, 20):
        fails.append("❌ 採った版より前の日の注記まで差し込んでいる")

    # 差し込む1本が複数チャンクに割れていても、続きまで一緒に入れる。
    split = [
        blk(15, "", "export const taskRouter = createTRPCRouter({", "  delete: x,", "});"),
        blk(28, "（delete の直後に追加）", "  bulkComplete: protectedProcedure"),
        blk(28, "（同じファイルの続き）", "    .mutation(async () => {}),"),
    ]
    merged = target.apply_insertions(target.render(split[:1]), split, 15)
    if ".mutation(async () => {})," not in merged:
        fails.append(f"❌ 差し込みの続きが落ちている: {merged!r}")
    if merged.index("bulkComplete") > merged.index(".mutation"):
        fails.append("❌ 差し込みの続きが本体より前に入っている")

    # 差し込み先を名指ししていない注記は対象外（`（同じファイルの続き）` 等）。
    if target.INSERT_NOTE.match("（同じファイルの続き）"):
        fails.append("❌ 続きの注記を差し込み指示として読んでいる")
    if not target.INSERT_NOTE.match("（getAll の直後に追加）"):
        fails.append("❌ 差し込みの注記を読めていない")
    return fails


PAGE_WITH_DIALOG = """export default function TaskPage() {
  const canEditProject = () => true;
  return (
    <div>
      <TaskDetailDialog
        open={detailOpen}
        onClose={handleDetailClose}
      />
    </div>
  );
}"""


def check_element_replacement() -> list[str]:
    """既にある JSX 要素を、その形へ書き換える抜粋を当てられることを確かめる。"""
    fails = []
    got = target.replace_element(
        PAGE_WITH_DIALOG, "TaskDetailDialog", "<TaskDetailDialog canEditProject={canEditProject} />"
    )
    if got is None or "canEditProject={canEditProject}" not in got:
        fails.append(f"❌ 要素の置き換えが効いていない: {got!r}")
    elif got.count("<TaskDetailDialog") != 1 or "open={detailOpen}" in got:
        fails.append(f"❌ 古い要素が残っている: {got!r}")

    # 同じ名前が複数あるときは、どれを指すか決められないので触らない。
    if target.replace_element("<Card />\n<Card />", "Card", "<Card x />") is not None:
        fails.append("❌ 置き換え先が複数あるのに書き換えている")
    if target.replace_element(PAGE_WITH_DIALOG, "NotThere", "x") is not None:
        fails.append("❌ 置き換え先が無いのに書き換えている")

    # 自己終了しない要素は、対応する閉じタグまでを1つとして数える。
    closed = "<Table>\n  <Row />\n</Table>\n<p>後ろ</p>"
    got = target.replace_element(closed, "Table", "<Table new />")
    if got is None or "<p>後ろ</p>" not in got or "</Table>" in got:
        fails.append(f"❌ 閉じタグまでを1つとして数えていない: {got!r}")
    # 同じ名前が入れ子になっているときは、どちらを指すか決められないので触らない。
    if target.replace_element("<Table>\n  <Table />\n</Table>", "Table", "x") is not None:
        fails.append("❌ 同名の入れ子があるのに書き換えている")

    # 貼る位置の説明1行は指示の一部で、中身ではない。
    head = target.operation_head(("{/* 権限判定を詳細ダイアログへ渡す */}", "<TaskDetailDialog"))
    if not head.startswith("<TaskDetailDialog"):
        fails.append(f"❌ 位置の説明を飛ばせていない: {head!r}")

    # 省略記号の入った抜粋は、そこだけでは元の中身を復元できないので当てない。
    elided = [
        blk(15, "", *PAGE_WITH_DIALOG.split("\n")),
        blk(17, "", "{/* TaskDetailDialog に props を追加 */}", "<TaskDetailDialog",
            "  // ...Day 15 で渡した props...", "  extra={1}", "/>"),
    ]
    merged = target.apply_insertions(target.render(elided[:1]), elided, 15)
    if "extra={1}" in merged:
        fails.append("❌ 省略記号の入った抜粋を当ててしまっている")
    if "open={detailOpen}" not in merged:
        fails.append("❌ 省略記号の抜粋で元の props を消している")

    # その日の変更の片割れしか当てられんときは、当てない。day28 の
    # `<DeleteConfirmDialog>` の書き換えは `bulkDeleteDialogOpen` の宣言と対で、
    # 宣言のほうは貼る位置の指示が無いので当てられない。
    half = [
        blk(15, "", *PAGE_WITH_DIALOG.split("\n")),
        blk(28, "", "<TaskDetailDialog open={bulkDeleteDialogOpen} />"),
    ]
    merged = target.apply_insertions(target.render(half[:1]), half, 15)
    if "bulkDeleteDialogOpen" in merged:
        fails.append("❌ 宣言の無い名前を持ち込む書き換えを当てている")
    if not target.introduces_unknown_names("const a = 1;", "<X v={zzz} />"):
        fails.append("❌ 知らない名前を見つけられていない")
    if target.introduces_unknown_names("const detailOpen = 1;", "<X open={detailOpen} />"):
        fails.append("❌ 既にある名前まで知らない名前として弾いている")
    # `a.b` の `b` は `a` の持ち物で、そのファイルに宣言が要る名前やない。
    # ここを数えると API が返す値の欄名で抜粋が落ちる（day16 の `task.timeSpentMinutes`）。
    if target.introduces_unknown_names("const task = 1;", "<X v={task.timeSpentMinutes} />"):
        fails.append("❌ ドットの後ろの欄名を、宣言の要る名前として弾いている")
    if not target.introduces_unknown_names("const a = 1;", "<X v={zzz.field} />"):
        fails.append("❌ ドットの前が未知でも見逃している")

    # 採った版より後の日の書き換えだけを当てる。
    blocks = [
        blk(15, "", *PAGE_WITH_DIALOG.split("\n")),
        blk(18, "", "{/* 権限判定を渡す */}", "<TaskDetailDialog canEditProject={canEditProject} />"),
    ]
    merged = target.apply_insertions(target.render(blocks[:1]), blocks, 15)
    if "canEditProject={canEditProject}" not in merged:
        fails.append("❌ 後の日の要素の書き換えが当たっていない")
    same_day = target.apply_insertions(target.render(blocks[:1]), blocks, 18)
    if "open={detailOpen}" not in same_day:
        fails.append("❌ 採った版と同じ日以前の書き換えまで当てている")
    return fails


def check_import_merge() -> list[str]:
    """import だけの抜粋が、今の import へ足し合わされることを確かめる。"""
    fails = []
    text = "import { Prisma } from '@prisma/client';\nimport { z } from 'zod';\n\nconst a = 1;"
    got = target.merge_imports(text, "import { Prisma, ProjectMemberRole } from '@prisma/client';")
    if got is None or "ProjectMemberRole" not in got:
        fails.append(f"❌ 同じ持ち込み元へ名前を足せていない: {got!r}")
    elif "Prisma," not in got or got.count("@prisma/client") != 1:
        fails.append(f"❌ 既にある名前を消したか行が増えている: {got!r}")

    # 持ち込み元が無ければ import の並びの下へ足す。
    got = target.merge_imports(text, "import { hasPermission } from '@/lib/constant/roles';")
    if got is None or "hasPermission" not in got:
        fails.append(f"❌ 新しい持ち込み元を足せていない: {got!r}")
    elif got.split("\n").index("import { hasPermission } from '@/lib/constant/roles';") > 2:
        fails.append(f"❌ import が並びの外へ入っている: {got!r}")

    # 縦に並べて書いた import も1本として読む（教材はこの書き方をよく使う）。
    multiline = "import {\n  assertMemberPermission,\n  findTasksWithPermission,\n} from './_helpers/permission';"
    got = target.merge_imports("import { assertMemberPermission } from './_helpers/permission';", multiline)
    if got is None or "findTasksWithPermission" not in got:
        fails.append(f"❌ 折り返した import を読めていない: {got!r}")

    # import 以外が混ざっとるチャンクは対象外（差し込みや書き換えの経路へ回す）。
    if target.merge_imports(text, "import { a } from 'm';\nconst b = 2;") is not None:
        fails.append("❌ import 以外が混ざったチャンクを import 合成として扱っている")
    if target.merge_imports(text, "") is not None:
        fails.append("❌ 空のチャンクを import 合成として扱っている")
    return fails


def check_scaffold_replacement() -> list[str]:
    """scaffold の配布物を、教材の抜粋で上書きしてしまわないことを確かめる。"""
    fails = []
    if target.exported_names("export const A = 1;\nexport function B() {}") != {"A", "B"}:
        fails.append("❌ export の名前を読めていない")
    if "C" not in target.exported_names("export { C as D };") and "D" not in target.exported_names(
        "export { C as D };"
    ):
        fails.append("❌ export { } の形を読めていない")

    # root.ts は教材が全体を出し直すので置き換える。
    root = "src/server/api/root.ts"
    required = target.scaffold_exports().get(root)
    if not required:
        fails.append("❌ 配布物の export を読めていない（root.ts）")
    else:
        full = "\n".join(f"export const {n} = 1;" for n in required)
        if not target.replaces_scaffold_file(root, full):
            fails.append("❌ 全部の名前を持つ版で置き換えられていない")
        if target.replaces_scaffold_file(root, "export const appRouter = 1;"):
            fails.append("❌ 名前が足りない版で配布物を置き換えている")

    # status.ts の抜粋（isTaskStatus 1本）で配布物を消さない。
    if target.replaces_scaffold_file(
        "src/lib/constant/status.ts", "export function isTaskStatus() {}"
    ):
        fails.append("❌ 抜粋で scaffold の status.ts を置き換えている")
    return fails


def check_provenance() -> list[str]:
    """結果ドキュメントに「どのコマンドで、いつ、何日ぶん」が必ず載ることを確かめる。

    単日の走行が同じファイルを上書きするので、出どころが無いと、30日ぶんの実測が
    1行に置き換わっても気づけない。実際に一度それで証拠を消した。
    """
    fails = []
    if target.command_line(["/a/b/build_day_snapshots.py", "--all", "--verify"]) != (
        "python3 scripts/curriculum-qa/build_day_snapshots.py --all --verify"
    ):
        fails.append("❌ 再現できるコマンド文字列になっていない")

    full = [
        target.DayResult(d, 80, True, "OK", "OK", ()) for d in target.available_days()
    ]
    original = target.RESULT_DOC
    try:
        with tempfile.TemporaryDirectory() as d:
            target.RESULT_DOC = Path(d) / "out.md"
            target.write_result_doc(full, True, "python3 x --all --verify")
            whole = target.RESULT_DOC.read_text(encoding="utf-8")
            target.write_result_doc(full[:1], False, "python3 x --day 1")
            partial = target.RESULT_DOC.read_text(encoding="utf-8")
    finally:
        target.RESULT_DOC = original

    if "出どころ" not in whole or "python3 x --all --verify" not in whole:
        fails.append(f"❌ 通し走行に出どころが無い: {whole[:160]!r}")
    if "UTC" not in whole:
        fails.append("❌ いつ出したかが書かれていない")
    if "⚠" in whole:
        fails.append("❌ 通し走行なのに部分走行の警告が出ている")

    # 単日の走行は、通しの実測を上書きしたかもしれんことが一目で分かること。
    if "⚠" not in partial:
        fails.append(f"❌ 部分走行に警告が出ていない: {partial[:200]!r}")
    if "1 日ぶん" not in partial:
        fails.append("❌ 何日ぶんかが書かれていない")
    return fails


def documented_day11_errors() -> tuple[str, ...]:
    """断り書きの現物（`EXPECTED_RED_SIGNATURE[11]["diagnostics"]`）から tsc の行を組む。

    位置を手で並べると、断り書きを更新した時にここだけ古いまま緑になる。
    `getById` は本文が名指ししとる識別子なので、TS2339 の行にだけ載せる。
    """
    signature = target.EXPECTED_RED_SIGNATURE[11]
    lines = []
    for head in signature["diagnostics"]:
        where, code = head.rsplit(":", 1)
        tail = (
            f"Property '{signature['marker']}' does not exist"
            if code == "TS2339"
            else "Parameter implicitly has an 'any' type"
        )
        lines.append(f"{where}: error {code}: {tail}")
    return tuple(lines)


def check_triage_section() -> list[str]:
    """NG の日の切り分けが、調べていないものを勝手に断定しないことを確かめる。"""
    fails = []
    results = [
        target.DayResult(1, 70, True, "OK", "OK", ()),
        target.DayResult(9, 80, True, "NG", "NG", ("x.ts(1,1): error TS1005",)),
    ]
    section = target.triage_section(results)
    if "day01" in section:
        fails.append("❌ 通った日を切り分けの表へ載せている")
    if "day09" not in section or "判定不能（未調査）" not in section:
        fails.append(f"❌ 未調査の日が「判定不能（未調査）」になっていない: {section!r}")

    # 教材が先に断っとる赤を「教材の欠陥」と書かない。day11 で一度やって覆された。
    expected_day = next(iter(target.EXPECTED_RED), None)
    if expected_day is None:
        fails.append("❌ EXPECTED_RED が空で、想定内の赤の扱いを確かめられない")
    else:
        signature = target.EXPECTED_RED_SIGNATURE[expected_day]
        documented_errors = documented_day11_errors()
        documented = target.DayResult(
            expected_day, 80, True, "NG", "OK",
            errors=documented_errors[:3], tsc_errors=documented_errors,
        )
        section = target.triage_section([documented])
        row = next(
            (l for l in section.split("\n") if l.startswith(f"| day{expected_day:02d} ")), ""
        )
        if "想定内" not in row:
            fails.append(f"❌ 想定内の赤が想定内として出ていない: {row!r}")
        if "教材の欠陥" in row or "判定不能" in row:
            fails.append(f"❌ 想定内の赤を欠陥や未調査として出している: {row!r}")

        # 断り書きと合わん赤まで「想定内」と書いたら、走行は exit 1 やのに成果物だけが
        # 「想定どおり」と言い張る状態になる。走行の判定と文書の判定を同じ線で動かす。
        unrelated = documented._replace(
            tsc_errors=documented.tsc_errors + (
                "src/app/project/page.tsx(10,4): error TS2322: Type 'string' is not assignable",
            ),
        )
        unrelated_row = next(
            (l for l in target.triage_section([unrelated]).split("\n")
             if l.startswith(f"| day{expected_day:02d} ")), ""
        )
        if "想定内" in unrelated_row:
            fails.append(f"❌ 断り書きと合わん赤まで成果物が想定内と書いている: {unrelated_row!r}")
        if not target.broken_days([unrelated]):
            fails.append("❌ 断り書きと合わん赤を異常日に数えていない（文書との食い違いの元）")

    original = dict(target.TRIAGE)
    try:
        target.TRIAGE[9] = ("ツールの限界", "day13 と同じ、完成版が抜粋")
        section = target.triage_section(results)
    finally:
        target.TRIAGE.clear()
        target.TRIAGE.update(original)
    if "ツールの限界" not in section:
        fails.append("❌ 書いた切り分けが表へ出ていない")

    if not target.triage_section([target.DayResult(1, 70, True, "OK", "OK", ())]) == "":
        fails.append("❌ NG が無いのに切り分けの節を書いている")
    return fails


def check_expected_red_is_grounded() -> list[str]:
    """EXPECTED_RED に挙げた日が、本当に教材で断られているかを確かめる。

    ここを台帳だけで持つと、あとから「落ちるから」という理由で日を足して
    赤を隠す抜け道になる。教材の本文に断りがある日だけを許す。
    """
    from build_day_snapshots import EXPECTED_RED, MATERIAL_DIR

    fails = []
    if not EXPECTED_RED:
        return ["EXPECTED_RED が空です。day11 の断りが本文から消えたのなら別途確認が要ります"]
    for day in EXPECTED_RED:
        found = sorted(MATERIAL_DIR.glob(f"day{day:02d}_*.md"))
        if not found:
            fails.append(f"❌ EXPECTED_RED の day{day:02d} に対応する教材がありません")
            continue
        text = found[0].read_text(encoding="utf-8")
        # 「読者の画面でも同じことが起きる」と本文が言っているかどうか。
        if "写し間違いではありません" not in text:
            fails.append(
                f"❌ day{day:02d} の本文に型エラーの断りが見つかりません。"
                "断りが無い日を EXPECTED_RED に置くと、教材の欠陥を隠すことになります"
            )
    return fails


def check_new_declaration() -> list[str]:
    """まだ無い宣言を足す道と、その置き場の決め方。"""
    fails: list[str] = []
    body = (
        "function Page() {\n"
        "  const a = 1;\n"
        "  const handle = () => {\n"
        "    if (a) {\n"
        "      return;\n"
        "    }\n"
        "  };\n"
        "  if (loading) {\n"
        "    return (<p>...</p>);\n"
        "  }\n"
        "  return (\n"
        "    <div />\n"
        "  );\n"
        "}"
    )
    out = target.add_declaration(body, "const b = 2;")
    if out is None:
        fails.append("❌ 置き場が決まるはずやのに足せていない")
    else:
        lines = out.split("\n")
        at = lines.index("const b = 2;")
        # ハンドラーの中の `if` やのうて、本体直下の `if (loading)` の直前に入ること。
        if lines[at + 1].strip() != "if (loading) {":
            fails.append(f"❌ 足す位置が本体直下でない: {lines[at + 1]!r}")
        if "  const handle = () => {" not in out or out.count("if (a) {") != 1:
            fails.append("❌ ハンドラーの中を割っている")

        # 続けて足したときも、前に足した抜粋の中へ入り込まないこと。
        # out が None のまま渡すと、失敗を一覧で返す設計なのにここで例外が出て
        # 残りの検証が走らんようになる。
        twice = target.add_declaration(out, "const c = 3;")
        if twice is None or twice.split("\n").index("const c = 3;") != twice.split("\n").index("const b = 2;") + 1:
            fails.append("❌ 2本目が1本目の直後に並んでいない")

    # 同じ名前が既にあるなら足さない（`完成版` 側の同じ抜粋で二重にせん）。
    if target.add_declaration(body, "const a = 9;") is not None:
        fails.append("❌ 既にある名前を二重に足している")

    # 抜粋が2本の宣言を持つとき、2本目が既にあっても足さない。
    if target.add_declaration(body, "const b = 2;\nconst a = 3;") is not None:
        fails.append("❌ 2本目が既にあるのに足している")

    # 置き場が無いファイル（router 等）は触らない。
    if target.add_declaration("export const x = 1;\n", "const y = 2;") is not None:
        fails.append("❌ 置き場が無いのに足している")
    return fails


def check_local_binding_names() -> list[str]:
    """抜粋が自分で束ねる名前と、渡す先の欄名は「まだ無い名前」に数えん。"""
    fails: list[str] = []
    text = "const setX = 1;\nconst list = [];\n"
    # `(prev) => ...` の prev は引数。数えると抜粋が丸ごと落ちる。
    if target.introduces_unknown_names(text, "<A on={() => setX((prev) => prev + 1)} />"):
        fails.append("❌ 引数を、宣言の要る名前として弾いている")
    # `mutate({ ids: ... })` の ids は渡す先の欄名。
    if target.introduces_unknown_names(text, "<A on={() => run({ ids: list })} />"):
        fails.append("❌ 欄名を、宣言の要る名前として弾いている")
    # 本当に無い名前は弾く。
    if not target.introduces_unknown_names(text, "<A v={missingThing} />"):
        fails.append("❌ 本当に無い名前を見逃している")
    return fails


def check_rewrite_element() -> list[str]:
    """行の中の文字列で指した要素の書き換えと、折り返した開始タグの終わり。"""
    fails: list[str] = []
    text = (
        '<div className="wrap">\n'
        '  <div className="grid gap-6\n'
        '    sm:grid-cols-2">\n'
        "    <p>old</p>\n"
        "  </div>\n"
        "  <Dialog />\n"
        "</div>\n"
    )
    out = target.rewrite_element(text, 'className="grid gap-6', '<div>new</div>')
    if out is None:
        fails.append("❌ 折り返した開始タグの要素を書き換えられていない")
    elif "<Dialog />" not in out or "old" in out:
        fails.append(f"❌ 書き換えが後ろの要素まで飲み込んでいる: {out!r}")
    # 1つに決まらんときは触らん。
    if target.rewrite_element(text, "div", "<span />") is not None:
        fails.append("❌ 2つ以上当たるのに書き換えている")
    return fails


def check_leading_imports() -> list[str]:
    """持ち込みと本体が同じブロックに同居するときの切り分け。"""
    fails: list[str] = []
    lines = (
        "// filepath: src/a.tsx",
        "import { Checkbox } from '@/component/ui/checkbox';",
        "",
        "// 一覧の grid レイアウト",
        '<div className="grid">',
        "</div>",
    )
    lead, rest = target.split_leading_imports(lines)
    if not any("import " in line for line in lead):
        fails.append("❌ 先頭の import を剥がせていない")
    if any(line.strip().startswith("//") for line in rest):
        fails.append("❌ JSX の側へ `//` の覚え書きが残っている（構文として通らん）")
    if not any("<div" in line for line in rest):
        fails.append("❌ 本体まで剥がしている")
    # import が無いブロックはそのまま返す。
    lead2, rest2 = target.split_leading_imports(("<div />",))
    if lead2 or rest2 != ["<div />"]:
        fails.append("❌ import の無いブロックを切り分けている")
    return fails


# 複写されず読まれるだけの入力。実装側の一覧が痩せた回を捕まえるため、
# 期待値はここに固定で置く。減らすときは、なぜ材料でなくなったのかをここに書く。
REQUIRED_READ_ONLY_INPUTS = (
    "tsconfig.json",
    "scripts/scaffold-from-scratch.sh",
    "scripts/build-zip.sh",
    "package-lock.json",
)

# ゲートだけが持つ対象。ツリーの中身には現れんが、動いたら組み直しが要る。
# `tree_inputs()` から期待値を作ると、この行を YAML から消しても気づけん。
GATE_ONLY_INPUTS = (
    ".node-version",
    "Makefile",
    ".github/workflows/snapshot-gate.yml",
)


def check_tree_inputs() -> list[str]:
    """ツリーの古さを測る材料が、実際にツリーへ入るもの全部を覆っていること。

    教材と配布物だけを見た時期があり、借り物や組み立て方を直した回は更新時刻が
    動かんので古いツリーのまま撮れていた。覆いが痩せても撮影は成功するため、
    ここが落ちん限り誰も気づけない。
    """
    fails = []
    got = {p.resolve() for p in target.tree_inputs(3)}
    for name in target.BORROWED_FILES:
        if (target.REPO_ROOT / name).resolve() not in got:
            fails.append(f"❌ 借り物を見ていない: {name}")
    for src in target.BUILDER_SOURCES:
        if src.resolve() not in got:
            fails.append(f"❌ 組み立て方そのものを見ていない: {src.name}")
    # 期待値は実装の一覧やのうて、下の固定集合から取る。実装を回すと、一覧から
    # 消した回にループも一緒に痩せて通ってしまう。借り物と組み立て側には別の
    # 歯止めがある（前者は複写で落ち、後者は import を辿る検査が拾う）が、
    # 読まれるだけの入力にはそれが無い。
    for name in REQUIRED_READ_ONLY_INPUTS:
        if (target.REPO_ROOT / name).resolve() not in got:
            fails.append(f"❌ 読まれるだけの入力を見ていない: {name}")
    declared = {*target.READ_ONLY_INPUTS, *target.ENVIRONMENT_INPUTS}
    for name in sorted(set(REQUIRED_READ_ONLY_INPUTS) - declared):
        fails.append(f"❌ 複写されん入力が実装の一覧から消えとる: {name}")
    if not any(p.name.startswith("day03_") for p in got):
        fails.append("❌ その日までの教材を見ていない")
    if any(p.name.startswith("day04_") for p in got):
        fails.append("❌ その日より後の教材まで見ている")
    if not all(p.is_file() for p in got):
        fails.append("❌ 存在せんファイルを材料に数えている")
    return fails


def check_builder_import_closure() -> list[str]:
    """組み立て側が読んどるローカルモジュールが、1つ残らず材料に入っていること。

    直接 import した分だけ並べても、その先で読まれるモジュールは抜ける。実際、
    フェンスの解釈（`markdown_scan`）と配布物の対応表（`check_scaffold_curriculum_alignment`）は
    1段奥に居って落ちていた。手で並べる限り同じ抜けが起きるので、import を辿って突き合わせる。
    """
    fails = []
    listed = {p.resolve() for p in target.BUILDER_SOURCES}
    # 入口は一覧やのうて実体から取る。一覧を起点にすると、入口自身を一覧から
    # 消した回に辿る先ごと消えて、この検査を含む3つが揃って通ってしまう。
    root = Path(target.__file__).resolve()
    if root not in listed:
        fails.append(f"❌ 組み立ての入口が材料に無い: {root.name}")
    qa_dir = root.parent
    seen: set[Path] = set()
    queue = [root, *listed]
    while queue:
        mod = queue.pop()
        if mod in seen or not mod.is_file():
            continue
        seen.add(mod)
        names = set()
        for node in ast.walk(ast.parse(mod.read_text(encoding="utf-8"))):
            if isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                names.add(node.module.split(".")[0])
            elif isinstance(node, ast.Import):
                names.update(alias.name.split(".")[0] for alias in node.names)
        for name in sorted(names):
            local = (qa_dir / f"{name}.py").resolve()
            if not local.is_file():
                continue
            if local not in listed:
                fails.append(f"❌ 組み立て側が読んどるのに材料に無い: {name}.py（{mod.name} が import）")
            queue.append(local)
    return fails


def check_gate_scope_covers_inputs() -> list[str]:
    """CI が「回すかどうか」を決める一覧が、材料を1つ残らず覆っていること。

    材料に足しても、ゲート側の一覧へ足し忘れると、そのファイルだけ動いた PR は
    対象なしで素通りする。緑は出るのに1日も検証してへん、という形になる。
    同じ一覧が Python と YAML の2箇所にあるのが原因なので、ここで突き合わせる。
    """
    gate = target.REPO_ROOT / ".github" / "workflows" / "snapshot-gate.yml"
    if not gate.is_file():
        return [f"❌ ゲートの定義が見つからない: {gate}"]
    found = re.search(r"pattern='(.*?)'\n", gate.read_text(encoding="utf-8"), re.S)
    if not found:
        return ["❌ ゲートの pattern を読み取れない"]
    # ワークフロー側の `tr -d '\n '` と同じ畳み方
    pattern = re.compile(found.group(1).replace("\n", "").replace(" ", ""))
    # 手で並べた3つの一覧だけやのうて、材料そのものを全部当てる。教材も scaffold の
    # 複写元も材料に入っとるので、どれか1つでも覆えてへんかったら素通りが起きる。
    days = target.available_days()
    materials = {
        str(p.resolve().relative_to(target.REPO_ROOT)) for p in target.tree_inputs(days[-1])
    }
    # ゲートだけが持つ対象は材料に現れんので、固定集合から別に当てる。
    # 材料から期待値を作るだけやと、その行を YAML から消しても緑のままになる。
    return [
        f"❌ ゲートの対象一覧が覆えていない: {name}"
        for name in sorted(materials | set(GATE_ONLY_INPUTS))
        if not pattern.match(name)
    ]


def check_build_failure_triage() -> list[str]:
    """ビルドの赤を、この機械で判定できるかどうかの切り分け。

    昔は build の赤を丸ごと無視しとった。DB を持たん機械で必ず赤くなるからやが、
    それやと prerender や server/client 境界の失敗まで一緒に通る。tsc は見つけられん
    種類なので、ここが緩むと壊れた日が緑で出荷される。

    次に「DB だけで説明できる赤か」を行ごとに当てにいったが、`next build` が根本原因を
    ラッパー行で包んで出すので、文言が1つ増えるたびに壊れた。いまは当てにいくのをやめ、
    DB が絡む赤は SKIP（判定してへん）として残す。**通した扱いにはせん**のが要点。
    """
    fails = []
    db_less = (
        "Error: P1001: Can't reach database server at `localhost:5432`",
        "PrismaClientInitializationError: Can't reach database server",
    )
    if not target.build_failure_is_database_only(db_less):
        fails.append("❌ DB へ届かんだけの赤を、この機械で判定できるものとして扱っている")

    real = (
        "Error occurred prerendering page \"/project\"",
        "TypeError: Cannot read properties of undefined",
    )

    # 判定へ渡す材料が3行で切られていないこと。表示用の3行と別物であること。
    noisy = "\n".join(
        ["Error: P1001: Can't reach database server"] * 5
        + ["Error occurred prerendering page \"/project\""]
    )
    pool = target.error_line_pool(noisy)
    if len(pool) != 6:
        fails.append(f"❌ 判定用のエラー行が {len(pool)} 行に切られている（6行あるはず）")
    if len(target.error_lines(noisy)) != 3:
        fails.append("❌ 表示用のエラー行が3行になっていない")

    # マーカーだけの行（error / failed の語が無い）がプールから落ちんこと。
    multiline = "\n".join(
        [
            "PrismaClientInitializationError:",
            "Can't reach database server at `localhost`:`5432`",
            "Please make sure your database server is running",
        ]
    )
    if not any("Can't reach database server" in ln for ln in target.error_line_pool(multiline)):
        fails.append("❌ 単独行の DB マーカーが判定用のプールから落ちている")

    # Prisma のスタックフレームはメソッド名に `Error` が含まれるため、ERROR_MARK だけで
    # 拾うと DB の赤へ説明の付かん行が混ざったように見える。呼び出し経路は判定材料にせん。
    prisma_stack = target.error_line_pool("\n".join([
        "PrismaClientInitializationError:",
        "Can't reach database server at `localhost`:`5432`",
        "    at Mn.handleRequestError (/workspace/node_modules/@prisma/client/runtime/library.js:121:1)",
        "    at Mn.handleAndLogRequestError (/workspace/node_modules/@prisma/client/runtime/library.js:125:1)",
    ]))
    if not target.build_failure_is_database_only(prisma_stack):
        fails.append("❌ Prisma のスタックフレームを DB の赤へ混ぜている")

    # Next.js のラッパー行が混じっても、DB が絡む赤は「判定できん」と見なすこと。
    # 行ごとに DB か否かを当てにいくと、ラッパーの文言が増えるたびに壊れる。
    wrapped = "\n".join(
        [
            "Error: Failed to collect page data for /dashboard",
            "PrismaClientInitializationError:",
            "Can't reach database server at `localhost`:`5432`",
        ]
    )
    if not target.build_failure_is_database_only(target.error_line_pool(wrapped)):
        fails.append("❌ Next.js のラッパーに包まれた DB の赤を、判定できるものとして扱っている")

    # DB のエラーと本物の失敗が同じ出力に居たら、SKIP にせん。DB の赤に隠れて
    # 壊れた日が exit 0 で出ていくのを防ぐ。ラッパー行（原因やのうて包み紙）は
    # 本物の失敗に数えん — そこを混ぜると DB だけの失敗まで止めてまう。
    mixed_real = target.error_line_pool("\n".join([
        "Error: Failed to collect page data for /dashboard",
        "Can't reach database server at `localhost`:`5432`",
        "TypeError: Cannot read properties of undefined (reading 'map')",
    ]))
    if target.build_failure_is_database_only(mixed_real):
        fails.append("❌ DB のエラーに紛れた本物の失敗を SKIP へ落として exit 0 にしている")
    # prerender の見出しは DB の判定でだけ包み紙に数える。単独で来た回は DB の印が
    # 無いので、これまでどおり本物の失敗のまま止まらんとアカン。内部の述語やのうて
    # 外から見える結果で見る。
    if target.build_failure_is_database_only(
        target.error_line_pool("Error occurred prerendering page \"/x\"")
    ):
        fails.append("❌ prerender の失敗だけの赤を DB のせいにして SKIP へ落としている")
    if target.has_real_build_failure(("Error: Failed to collect page data for /dashboard",)):
        fails.append("❌ Next.js のラッパー行を本物の失敗に数えている（DB だけの失敗が止まる）")

    # DB がまったく絡まん赤は、これまでどおり本物の失敗として扱うこと。
    if target.build_failure_is_database_only(real):
        fails.append("❌ DB と関係ない赤まで判定できんものとして扱っている")
    if target.build_failure_is_database_only(()):
        fails.append("❌ 理由が1行も無い赤を DB のせいにしている")

    # SKIP は「通した」やない。実際に振り替えを動かして、状態が変わることを見る。
    db_day = target.DayResult(
        day=7, files=80, tree_ok=True, tsc="OK", build="NG",
        errors=("Error: Failed to collect page data for /dashboard",),
        build_errors=(
            "Error: Failed to collect page data for /dashboard",
            "Can't reach database server at `localhost`:`5432`",
        ),
    )
    real_day = target.DayResult(
        day=8, files=80, tree_ok=True, tsc="OK", build="NG",
        errors=real, build_errors=real,
    )
    green_day = target.DayResult(
        day=9, files=80, tree_ok=True, tsc="OK", build="OK", errors=(), build_errors=(),
    )
    triaged = target.triage_build_results([db_day, real_day, green_day])
    if triaged[0].build != target.BUILD_SKIPPED:
        fails.append("❌ DB が要る赤が SKIP へ振り替わっていない")
    if triaged[1].build != "NG":
        fails.append("❌ DB と関係ない赤まで SKIP にしている")
    if triaged[2].build != "OK":
        fails.append("❌ 通ったビルドの状態を書き換えている")
    if target.BUILD_SKIPPED in ("OK", "NG"):
        fails.append("❌ SKIP が OK か NG と同じ値になっている（区別が消えている）")

    # P1012 は Prisma のスキーマ検証エラー全般の番号で、DB へ届かんことの印やない。
    # これを DB 扱いすると、壊れたリレーションのビルド欠陥が SKIP へ落ちて exit 0 になる。
    schema_error = (
        "Error: Prisma schema validation - (get-dmmf wasm)",
        "Error code: P1012",
        'error: Error validating field `owner` in model `Project`: The relation field is missing.',
    )
    if target.build_failure_is_database_only(schema_error):
        fails.append("❌ P1012 のスキーマ検証エラーを DB の不在として見逃している")

    # datasource ブロックの書き間違いも DB へ届かんこととは別。`npm run build` は
    # `prisma generate` から始まるので、ここを DB 扱いにすると provider の書き間違いが
    # SKIP へ落ちて exit 0 になる。
    datasource_error = target.error_line_pool("\n".join([
        "Error: Prisma schema validation - (get-dmmf wasm)",
        "Error validating datasource `db`: the provider is invalid",
    ]))
    if target.build_failure_is_database_only(datasource_error):
        fails.append("❌ datasource のスキーマ欠陥を DB の不在として見逃している")

    # P1003 はサーバーへ到達した後の「データベースが存在せん」なので、P1001 の
    # 接続不能とは別物。「the database server at」だけを印にするとここを SKIP へ落とす。
    database_missing = target.error_line_pool(
        "Error: P1003: Database `task_app` does not exist on the database server at `localhost`"
    )
    if target.build_failure_is_database_only(database_missing):
        fails.append("❌ P1003 のデータベース不在を接続不能として見逃している")
    # 例外名だけで DB の不在に倒さんこと。Prisma は接続文字列が不正なときや query engine が
    # 欠けとるときにも `PrismaClientInitializationError` を出す。名前だけで SKIP にすると、
    # その2つが exit 0 で通る。
    if target.build_failure_is_database_only((
        "PrismaClientInitializationError:",
        "error: Invalid `prisma.project.findMany()` invocation: the URL must start with postgresql://",
    )):
        fails.append("❌ 接続文字列の不正まで DB の不在として見逃している")
    if target.build_failure_is_database_only((
        "PrismaClientInitializationError:",
        "Query engine library for current platform could not be found.",
    )):
        fails.append("❌ query engine の欠落まで DB の不在として見逃している")
    # 本物の接続失敗は、届かんかったことを言う行が必ず一緒に出る。そっちで拾える。
    if not target.build_failure_is_database_only(target.error_line_pool("\n".join([
        "PrismaClientInitializationError:",
        "Can't reach database server at `localhost`:`5432`",
    ]))):
        fails.append("❌ 本物の接続失敗を DB の不在として拾えていない")

    # 環境変数の欠落は「DB が無い機械」の印やない。`copy_scaffold()` が `.env.example` を
    # 必ず `.env` へ複写し、その `.env.example` が `DATABASE_URL` を定義しとるので、
    # DB の無い機械でも変数は在る。無いと言われたのなら組んだツリーか schema が壊れとる。
    for missing in (
        "Environment variable not found: DATABASE_URL.",
        "Environment variable not found: DB_URL.",
    ):
        if target.build_failure_is_database_only((missing,)):
            fails.append(f"❌ 環境変数の欠落（{missing}）を DB の不在として見逃している")
        if not target.has_real_build_failure((missing,)):
            fails.append(f"❌ 環境変数の欠落（{missing}）を本物の失敗に数えていない")

    # Prisma は変数の欠落も接続の失敗も同じ例外名で包む。例外名だけで SKIP に倒すと
    # 変数の欠落が exit 0 で通る。本物の失敗の判定が先に効くことを、振り替えまで通して見る。
    env_wrapped = target.error_line_pool("\n".join([
        "Error: Failed to collect page data for /dashboard",
        "PrismaClientInitializationError:",
        "error: Environment variable not found: DATABASE_URL.",
    ]))
    if target.build_failure_is_database_only(env_wrapped):
        fails.append("❌ 例外名に紛れた環境変数の欠落を DB の不在として見逃している")
    env_day = target.DayResult(
        day=12, files=80, tree_ok=True, tsc="OK", build="NG",
        errors=env_wrapped[:3], build_errors=env_wrapped,
    )
    if target.triage_build_results([env_day])[0].build != "NG":
        fails.append("❌ 環境変数の欠落を SKIP へ振り替えて exit 0 にしている")

    # 上の判断は「`.env` は必ず書かれる」という前提に乗っとる。前提が消えたら判断も無効に
    # なるので、複写の経路そのものを見張る。
    scaffold = inspect.getsource(target.copy_scaffold)
    if ".env.example" not in scaffold or '".env"' not in scaffold:
        fails.append("❌ `.env.example` を `.env` へ複写する経路が消えている（環境変数の判断の前提）")

    # 成功の行に、判定してへん日があることを必ず出す。ここが消えると全部緑に読める。
    source = Path(target.__file__).read_text(encoding="utf-8")
    tail = source.split("if skipped:", 1)
    if len(tail) != 2:
        fails.append("❌ 判定できんかった日があっても、成功の行に何も出していない")
    elif "検証していません" not in tail[1].split("return 0", 1)[0]:
        fails.append("❌ 判定してへん日があるのに「検証していない」と書いていない")
    return fails


def check_expected_red_build_exemption() -> list[str]:
    """EXPECTED_RED の日の build 免除が、断り書きの範囲に収まっとること。

    day 番号だけで build を丸ごと免除すると、断ってへん失敗（prerender や
    server/client 境界）がその日に紛れても exit 0 で出ていく。断ってあるのは
    型エラーだけなので、免除もそこまで。
    """
    fails = []
    known = target.DayResult(
        day=11, files=92, tree_ok=True, tsc="NG", build="NG",
        errors=("src/x.tsx(29,47): error TS2339: Property 'getById' does not exist",),
        build_errors=(
            "Failed to compile.",
            "Type error: Property 'getById' does not exist on type ...",
        ),
    )
    tree_failed = known._replace(tree_ok=False, tsc=target.NOT_RUN, build=target.NOT_RUN)
    if target.expected_red_holds(tree_failed):
        fails.append("❌ ツリー構築に失敗した day11 を想定内の赤として扱っている")
    if not target.build_failure_is_expected(known):
        fails.append("❌ 断り書きどおりの型エラーによる build 落ちまで異常扱いしている")

    extra = known._replace(build_errors=known.build_errors + (
        "Error: Unauthorized while prerendering /project",
    ))
    if target.build_failure_is_expected(extra):
        fails.append("❌ 断り書きに無い失敗が day11 に紛れても免除している")

    # prerender の見出しは DB の問いでだけ包み紙。免除の問いでは「型エラーやない行」
    # なので、これが混ざったら免除せんこと。
    wrapped = known._replace(build_errors=known.build_errors + (
        "Error occurred prerendering page \"/project\"",
    ))
    if target.build_failure_is_expected(wrapped):
        fails.append("❌ prerender の見出しが混ざった day11 を免除している")

    silent = known._replace(build_errors=("Failed to compile.",))
    if target.build_failure_is_expected(silent):
        fails.append("❌ 型エラーの証拠が1行も無いのに断り書きで説明できたことにしている")

    other = known._replace(day=12)
    if target.build_failure_is_expected(other):
        fails.append("❌ EXPECTED_RED に無い日まで免除している")

    # tsc の側も、日付やのうて断り書きの中身と突き合わせること。本文は識別子・件数・場所まで
    # 書いとるので、そこが合わん赤は「別の欠陥が紛れた」と見なす。
    documented = target.DayResult(
        day=11, files=92, tree_ok=True, tsc="NG", build="OK",
        errors=(),
        tsc_errors=documented_day11_errors(),
    )
    if not target.tsc_failure_is_expected(documented):
        fails.append("❌ 断り書きどおりの型エラー5件まで異常扱いしている")

    # 件数が増えたら、断り書きで説明でけへん赤が混ざっとる。
    if target.tsc_failure_is_expected(
        documented._replace(tsc_errors=documented.tsc_errors + (
            "src/component/project/project-detail-view.tsx(200,4): error TS2345: "
            "Argument of type 'string' is not assignable",
        ))
    ):
        fails.append("❌ 断り書きの件数を超える型エラーまで想定内にしている")

    # 名指しされた識別子に1行も触れてへん赤は、別の欠陥。
    unrelated = documented._replace(tsc_errors=tuple(
        line.replace("Property 'getById' does not exist", "Type 'number' is not assignable to type 'string'")
        for line in documented.tsc_errors
    ))
    if target.tsc_failure_is_expected(unrelated):
        fails.append("❌ `getById` と無関係な型エラー5件を day11 の想定内として通している")

    # 場所が広がったら、配布物1ファイルに閉じるという前提が崩れとる。
    spread = documented._replace(tsc_errors=documented.tsc_errors[:-1] + (
        "src/app/project/page.tsx(10,4): error TS2322: Type 'string' is not assignable",
    ))
    if target.tsc_failure_is_expected(spread):
        fails.append("❌ 断り書きの場所を外れた型エラーまで想定内にしている")

    if target.tsc_failure_is_expected(documented._replace(day=12)):
        fails.append("❌ EXPECTED_RED に無い日の型エラーまで免除している")

    # build 側も、名指しされた識別子に触れてへん型エラーは免除せん。
    other_type_error = known._replace(build_errors=(
        "Failed to compile.",
        "Type error: Type 'number' is not assignable to type 'string'.",
    ))
    if target.build_failure_is_expected(other_type_error):
        fails.append("❌ 断り書きと無関係な型エラーによる build 落ちを免除している")

    # 根っこの getById が残っていても、追加の型エラーまで同居したら免除せん。
    mixed_type_errors = known._replace(build_errors=known.build_errors + (
        "Type error: Type 'number' is not assignable to type 'string'.",
    ))
    if target.build_failure_is_expected(mixed_type_errors):
        fails.append("❌ getById と別の型エラーが同居した build を免除している")

    # 免除の判断が異常日の判定に効いとること。関数だけ足しても意味が無いので、
    # 実際に `broken_days` を通して数える。
    healthy = target.DayResult(
        day=9, files=80, tree_ok=True, tsc="OK", build="OK", errors=(), build_errors=(),
    )
    exempt = documented._replace(build="NG", build_errors=known.build_errors)
    unrelated_day11 = unrelated._replace(build="NG", build_errors=(
        "Failed to compile.",
        "Error occurred prerendering page \"/project\"",
    ))
    broken = target.broken_days([healthy, exempt, unrelated_day11])
    if any(r is healthy for r in broken):
        fails.append("❌ 通った日を異常日に数えている")
    if any(r is exempt for r in broken):
        fails.append("❌ 断り書きどおりの day11 を異常日に数えている")
    if not any(r is unrelated_day11 for r in broken):
        fails.append("❌ 断り書きと無関係な赤が紛れた day11 を異常日に数えていない")
    return fails


def check_both_red_shows_both() -> list[str]:
    """tsc と build が両方赤い日は、画面と成果物に両方の行を出すこと。

    `tsc_shown or build_shown` にすると tsc が赤い時点で build の行が丸ごと消える。
    day11 のように tsc の赤が想定内の日で build 側に別の欠陥が入ると、走行は exit 1 なのに
    出とるのは「知っとる型エラー」だけになり、落ちた本当の理由が読めん。
    """
    fails = []
    tsc_lines = ("src/x.tsx(29,47): error TS2339: Property 'getById' does not exist",)
    build_lines = ("Error occurred prerendering page \"/project\"",)
    calls = []

    def fake_run_step(cmd, dest):
        calls.append(cmd)
        if "tsc" in " ".join(cmd):
            return False, tsc_lines, tsc_lines
        return False, build_lines, build_lines + ("Failed to compile.",)

    original_run_step = target.run_step
    original_link = target.link_node_modules
    try:
        target.run_step = fake_run_step
        target.link_node_modules = lambda dest: None
        tsc, build, shown, build_all, tsc_all = target.verify_tree(Path("/nonexistent"))
    finally:
        target.run_step = original_run_step
        target.link_node_modules = original_link

    if (tsc, build) != ("NG", "NG"):
        fails.append(f"❌ 両方赤い日の状態が ({tsc}, {build}) になっている")
    if not any("getById" in line for line in shown):
        fails.append(f"❌ 表示用のエラーから tsc の行が落ちている: {shown!r}")
    if not any("prerendering" in line for line in shown):
        fails.append(f"❌ 表示用のエラーから build の行が落ちている（落ちた本当の理由が読めん）: {shown!r}")
    if "Failed to compile." not in build_all:
        fails.append("❌ 判定用の build エラーが表示用に差し替わっている")
    if tsc_all != tsc_lines:
        fails.append("❌ 判定用の tsc エラーが取れていない")
    return fails


def check_result_doc_records_skip() -> list[str]:
    """成果物のほうにも SKIP が残ること。

    画面が SKIP と言うとるのに、証拠として出すファイルが NG のままやと、
    読んだ人はそっちを信じる。しかも切り分けの表に「判定不能（未調査）」の行が生えて、
    教材の欠陥を疑わせる。書き出しは切り分けのあとに走らなあかん。
    """
    fails = []
    db_day = target.DayResult(
        day=7, files=80, tree_ok=True, tsc="OK", build="NG",
        errors=("Can't reach database server at `localhost`:`5432`",),
        build_errors=("Can't reach database server at `localhost`:`5432`",),
    )
    triaged = target.triage_build_results([db_day])
    directory = tempfile.mkdtemp()
    saved = target.RESULT_DOC
    try:
        target.RESULT_DOC = Path(directory) / "day-snapshots-result.md"
        target.write_result_doc(triaged, True, "python3 build_day_snapshots.py --all --verify")
        body = target.RESULT_DOC.read_text(encoding="utf-8")
    finally:
        target.RESULT_DOC = saved
        shutil.rmtree(directory)
    if target.BUILD_SKIPPED not in body:
        fails.append("❌ 成果物に SKIP が残っていない（NG のまま書かれている）")
    if "判定不能（未調査）" in body:
        fails.append("❌ 判定してへん日を「判定不能（未調査）」として切り分けの表へ入れている")

    # 呼ぶ順番そのものも固定する。切り分けが後ろへ戻ると、同じ走行の中で
    # 画面の日別行・成果物・最終行が別々の状態を名乗る。
    source = Path(target.__file__).read_text(encoding="utf-8")
    main_body = source.split("def main(argv: list[str]) -> int:", 1)[1]
    if "triage_build_results([r])" not in main_body:
        fails.append("❌ 日別の結果を、表示より前に切り分けていない")
    else:
        cut = main_body.index("triage_build_results([r])")
        if cut > main_body.index('print(f"day{n:02d}'):
            fails.append("❌ 画面の日別行を切り分けより先に出している")
        if cut > main_body.index("write_result_doc(results"):
            fails.append("❌ 結果ドキュメントを切り分けより先に書き出している")
    return fails


def check_boundary_error_survives_db_noise() -> list[str]:
    """DB の赤に紛れた Server Component 境界エラーを SKIP へ落とさんこと。

    `You're importing a component that needs` は REAL_BUILD_FAILURE_MARKERS の中で
    唯一 ERROR_MARK（error|failed|not found|Cannot find）のどの語も含まん。判定用の
    プールがこの行を落とすと、残るのは DB の行だけになり、本物の build 欠陥が SKIP で
    素通りする。この PR が潰しとる型そのものなので、経路を実際に通して確かめる。
    """
    output = "\n".join(
        [
            "PrismaClientInitializationError:",
            "Can't reach database server at localhost:5432",
            "You're importing a component that needs \"next/headers\".",
        ]
    )
    pool = target.error_line_pool(output)
    if not any("You're importing a component that needs" in ln for ln in pool):
        return [f"❌ 境界エラーが判定用プールから落ちている: {pool}"]

    if target.build_failure_is_database_only(tuple(pool)):
        return ["❌ 本物の境界エラーがあるのに DB だけの失敗と判定している"]
    return []


def check_tree_failure_is_never_expected() -> list[str]:
    """ツリーを組めてへん日を「想定内」と書かんこと。

    tsc も build も走っとらんので `== "NG"` の枝は素通りする。tree_ok を見んかったら、
    走行は broken_days() で exit 1 になるのに、成果物だけ「想定内」と書く。十三巡目に
    潰したのと同じ「文書だけが言い張る」型。
    """
    day = sorted(target.EXPECTED_RED)[0]
    broken = target.DayResult(
        day, 0, False, target.NOT_RUN, target.NOT_RUN, ("OSError: 置けません",)
    )
    if target.expected_red_holds(broken):
        return ["❌ ツリーを組めてへん日を想定内として扱っている"]
    if broken not in target.broken_days([broken]):
        return ["❌ ツリー失敗が異常として数えられていない"]
    doc = target.triage_section([broken])
    if "想定内" in doc:
        return [f"❌ 成果物がツリー失敗を想定内と書いている:\n{doc}"]
    return []


def check_unclassified_error_blocks_skip() -> list[str]:
    """説明の付かんエラー行が DB の赤に紛れとったら SKIP にせんこと。

    本物の失敗のマーカーは allowlist なので、載せてへん文言は必ず出る。
    `Error: Unauthorized while prerendering /admin` のような行が `P1001` と同じ出力に
    混ざったとき、マーカーだけを見とったら「DB だけの失敗」に見えて SKIP へ落ち、
    壊れた日が exit 0 で出ていく。SKIP を名乗る条件を「全行が DB か包み紙で説明できる」
    に倒してあるので、説明の付かん行が1つでもあれば止まる。
    """
    fails: list[str] = []
    unknown = target.error_line_pool(
        "\n".join(
            [
                "Error: Failed to collect page data for /admin",
                "Can't reach database server at `localhost`:`5432`",
                "Error: Unauthorized while prerendering /admin",
            ]
        )
    )
    if target.build_failure_is_database_only(unknown):
        fails.append("❌ 説明の付かんエラーを DB だけの失敗として SKIP に落としている")

    # 包み紙と DB だけで構成された回は、これまでどおり SKIP のままであること。
    # ここが赤くなると、DB の無い機械で全日が異常扱いになって検査が使えんくなる。
    explained = target.error_line_pool(
        "\n".join(
            [
                "Error: Failed to collect page data for /dashboard",
                "PrismaClientInitializationError:",
                "Can't reach database server at `localhost`:`5432`",
            ]
        )
    )
    if not target.build_failure_is_database_only(explained):
        fails.append("❌ 包み紙と DB だけの回まで判定できるものとして扱っている")
    return fails


def check_expected_red_rejects_unknown_error() -> list[str]:
    """免除の判定でも、説明の付かん行を捨てんこと。

    マーカーで絞ってから見ると `REAL_BUILD_FAILURE_MARKERS` に載ってへん失敗が
    黙って消え、断り書きどおりの型エラーだけが残って day11 が免除される。
    SKIP 側で潰したのと同じ「絞ってから判定する」型が、免除の側にも残っとった。
    """
    known = target.DayResult(
        day=11, files=92, tree_ok=True, tsc="NG", build="NG",
        errors=(),
        build_errors=(
            "Failed to compile.",
            "Type error: Property 'getById' does not exist on type ...",
        ),
    )
    if not target.build_failure_is_expected(known):
        return ["❌ 断り書きどおりの型エラーまで免除せんようになっている"]
    mixed = known._replace(
        build_errors=known.build_errors + ("Error: Unauthorized while prerendering /admin",)
    )
    if target.build_failure_is_expected(mixed):
        return ["❌ 説明の付かん失敗が混ざった day11 を免除している"]
    return []


def check_econnrefused_alone_is_not_database() -> list[str]:
    """`ECONNREFUSED` 単独を DB の不在と見なさんこと。

    OS が返す汎用の接続拒否なので、Redis や別の localhost 依存でも出る。
    単独で DB マーカーに数えると、その1行だけの出力が SKIP へ落ちて exit 0 になる。
    """
    fails: list[str] = []
    redis = target.error_line_pool("Error: connect ECONNREFUSED 127.0.0.1:6379")
    if target.build_failure_is_database_only(redis):
        fails.append("❌ DB と関係のない ECONNREFUSED を DB だけの失敗にしている")

    # Prisma の印が同じ出力に居るときは、裏付けとして数えて SKIP のままにすること。
    postgres = target.error_line_pool(
        "\n".join(
            [
                "Can't reach database server at `localhost`:`5432`",
                "Error: connect ECONNREFUSED 127.0.0.1:5432",
            ]
        )
    )
    if not target.build_failure_is_database_only(postgres):
        fails.append("❌ Prisma の印つきの ECONNREFUSED まで本物の失敗にしている")
    return fails


def check_expected_red_rejects_unknown_code() -> list[str]:
    """件数と場所が合っても、断り書きに無いコードが混ざったら免除せんこと。

    識別子は波及行に載らんので `any` でしか見られん。件数と場所だけを見とると、
    同じファイルの無関係な型エラー4件＋想定内の1件で「想定内」が成立してまう。
    """
    path = "src/component/project/project-detail-view.tsx"
    documented = target.DayResult(
        day=11, files=92, tree_ok=True, tsc="NG", build="OK", errors=(),
        tsc_errors=documented_day11_errors(),
    )
    if not target.tsc_failure_is_expected(documented):
        return ["❌ 断り書きどおりの day11 まで免除せんようになっている"]
    smuggled = documented._replace(
        tsc_errors=(documented.tsc_errors[0],)
        + tuple(
            f"{path}({n},4): error TS2322: Type 'string' is not assignable"
            for n in (41, 42, 43, 44)
        )
    )
    if target.tsc_failure_is_expected(smuggled):
        return ["❌ 断り書きに無いコードが混ざった day11 を免除している"]

    return []


def check_stack_frames_do_not_block_skip() -> list[str]:
    """Prisma の stack frame が DB だけの失敗を本物の失敗に化けさせんこと。

    `at ei.handleRequestError (...)` はメソッド名に `Error` が入るので ERROR_MARK に
    当たる。中身は失敗の場所であって種類やない。残ると「説明の付かん行」に数えられて、
    DB を持たん機械で `--verify` が exit 1 になる。下の出力は Prisma 6.19.3 の実測。
    """
    fails: list[str] = []
    db_less = "\n".join(
        [
            "PrismaClientInitializationError: ",
            "Can't reach database server at `127.0.0.1:59999`",
            "    at ei.handleRequestError (/app/node_modules/@prisma/client/runtime/library.js:121:7568)",
            "    at ei.handleAndLogRequestError (/app/node_modules/@prisma/client/runtime/library.js:121:6593)",
            "    at async a (/app/node_modules/@prisma/client/runtime/library.js:130:9551)",
            "Failed to collect page data for /dashboard",
            "Build error occurred",
        ]
    )
    if not target.build_failure_is_database_only(target.error_line_pool(db_less)):
        fails.append("❌ Prisma の stack frame を本物の失敗として数えている")

    # 落としてええのは frame だけ。メッセージの行は残さんとアカン。
    with_real = db_less.replace(
        "Failed to collect page data for /dashboard",
        "TypeError: x is not a function\n"
        "    at Object.<anonymous> (/app/src/x.ts:3:1)\n"
        "Failed to collect page data for /dashboard",
    )
    pool = target.error_line_pool(with_real)
    if not any("TypeError" in line for line in pool):
        fails.append("❌ frame と一緒にメッセージの行まで落としている")
    if target.build_failure_is_database_only(pool):
        fails.append("❌ frame を落とした結果、本物の失敗まで DB だけの失敗にしている")
    return fails


def check_prerender_wrapper_does_not_hide_db() -> list[str]:
    """prerender の見出しが、DB だけの失敗を本物の失敗に化けさせんこと。

    Prisma の問い合わせが prerender の最中に落ちると、`Error occurred prerendering page`
    と `Can't reach database server` が同じ出力に並ぶ。見出しを本物の失敗に数えると
    `has_real_build_failure()` が先に効いて、DB を持たん機械で `--verify` が exit 1 になる。
    """
    fails: list[str] = []
    with_db = target.error_line_pool(
        "\n".join(
            [
                "Error occurred prerendering page \"/dashboard\"",
                "PrismaClientInitializationError:",
                "Can't reach database server at `localhost`:`5432`",
                "Build error occurred",
            ]
        )
    )
    if not target.build_failure_is_database_only(with_db):
        fails.append("❌ prerender の見出しで DB だけの失敗を本物の失敗にしている")

    # 見出しを包み紙に数えるのは DB の問いのときだけ。原因の行が居たら本物の失敗のまま。
    with_cause = target.error_line_pool(
        "\n".join(
            [
                "TypeError: Cannot read properties of undefined (reading 'map')",
                "Error occurred prerendering page \"/dashboard\"",
                "Can't reach database server at `localhost`:`5432`",
            ]
        )
    )
    if target.build_failure_is_database_only(with_cause):
        fails.append("❌ prerender の原因の行まで包み紙に数えている")

    # 想定内の赤の免除は別の問い。見出しが混ざったら day11 でも免除せんこと。
    if "Error occurred prerendering page" in target.BUILD_NOISE_MARKERS:
        fails.append("❌ 免除の判定まで prerender の見出しを見逃す一覧へ入れている")
    return fails


def check_reachable_server_failure_is_not_db_absence() -> list[str]:
    """`the database server at` を DB の不在の印に数えんこと。

    この語は Prisma の**認証失敗**の文面に入っとる（実測: `@prisma/client` の中に
    `provide valid database credentials for the database server at the configured address`）。
    届いた上で資格情報が違う話なので、DB の不在やない。数えると設定ミスが SKIP へ落ちて
    exit 0 になる。下の1行は、その実測の文面に `next build` が付ける `Error:` を足した形。
    """
    fails: list[str] = []
    credentials = target.error_line_pool(
        "Error: Please provide valid database credentials for "
        "the database server at the configured address."
    )
    if target.build_failure_is_database_only(credentials):
        fails.append("❌ 資格情報の失敗（DB へは届いとる）を DB の不在として SKIP へ落としている")

    # 本物の「届かん」回はこれまでどおり SKIP のままであること。実測の P1001 出力。
    unreachable = target.error_line_pool(
        "\n".join(
            [
                "PrismaClientInitializationError:",
                "Can't reach database server at `127.0.0.1:59999`",
                "Failed to collect page data for /dashboard",
            ]
        )
    )
    if not target.build_failure_is_database_only(unreachable):
        fails.append("❌ 本物の P1001 まで本物の失敗として止めている")
    return fails


def check_expected_red_rejects_swapped_diagnostic() -> list[str]:
    """件数もコードも場所も揃うたまま**入れ替わった**診断を免除せんこと。

    断り書きの1件が消えて、同じファイルの別の場所に同じコードの別の欠陥が入ると、
    件数（5）・場所（1ファイル）・コード（許された3種）・識別子（`getById`）が
    全部そのまま揃う。所属だけを見とると、新しい欠陥が想定内で通って `--verify` が
    exit 0 になる。位置まで名指しした多重集合の一致で初めて弾ける。
    """
    documented = target.DayResult(
        day=11, files=92, tree_ok=True, tsc="NG", build="OK", errors=(),
        tsc_errors=documented_day11_errors(),
    )
    if not target.tsc_failure_is_expected(documented):
        return ["❌ 断り書きどおりの day11 まで免除せんようになっている"]

    # 断り書きの TS7006 を1件落として、同じファイルの別の行の TS7006 を1件足す。
    dropped = [ln for ln in documented.tsc_errors if "(144,44)" not in ln]
    swapped = documented._replace(
        tsc_errors=tuple(dropped)
        + (
            "src/component/project/project-detail-view.tsx(311,12): error TS7006: "
            "Parameter implicitly has an 'any' type",
        )
    )
    if len(swapped.tsc_errors) != len(documented.tsc_errors):
        return ["❌ 入れ替えの fixture が件数を変えてしまっている（検査が成立せん）"]
    if target.tsc_failure_is_expected(swapped):
        return ["❌ 入れ替わった診断の day11 を想定内として免除している"]
    return []


CHECKS = (
    ("写経対象の選び方", check_block_selection),
    ("ツリーへの書き出し", check_apply_blocks),
    ("置き換えと追記の境界", check_version_boundary),
    ("まるごとか抜粋か", check_complete_file),
    ("差し込みの適用", check_insertion),
    ("要素の書き換え", check_element_replacement),
    ("import の足し合わせ", check_import_merge),
    ("配布物の置き換え", check_scaffold_replacement),
    ("day の範囲", check_day_range),
    ("結果表の形", check_result_table),
    ("結果の出どころ", check_provenance),
    ("NG の切り分け", check_triage_section),
    ("tsconfig の exclude", check_tsconfig_excludes),
    ("想定内の赤は教材の断りが根拠", check_expected_red_is_grounded),
    ("まだ無い宣言を足す", check_new_declaration),
    ("自分で束ねる名前と欄名", check_local_binding_names),
    ("文字列で指した要素の書き換え", check_rewrite_element),
    ("持ち込みと本体の同居", check_leading_imports),
    ("ツリーの古さを測る材料", check_tree_inputs),
    ("組み立て側が読むモジュールの取りこぼし", check_builder_import_closure),
    ("ゲートの対象一覧が材料を覆っとるか", check_gate_scope_covers_inputs),
    ("ビルドの赤の切り分け", check_build_failure_triage),
    ("両方赤い日の表示", check_both_red_shows_both),
    ("成果物への SKIP の記録", check_result_doc_records_skip),
    ("想定内の日の build 免除", check_expected_red_build_exemption),
    ("DB の赤に紛れた境界エラー", check_boundary_error_survives_db_noise),
    ("ツリー失敗は想定内やない", check_tree_failure_is_never_expected),
    ("説明の付かん赤は SKIP にせん", check_unclassified_error_blocks_skip),
    ("免除でも説明の付かん赤を捨てん", check_expected_red_rejects_unknown_error),
    ("ECONNREFUSED 単独は DB やない", check_econnrefused_alone_is_not_database),
    ("stack frame は SKIP を塞がん", check_stack_frames_do_not_block_skip),
    ("prerender の見出しは DB を隠さん", check_prerender_wrapper_does_not_hide_db),
    ("届いた上での失敗は DB 不在やない", check_reachable_server_failure_is_not_db_absence),
    ("入れ替わった診断は免除せん", check_expected_red_rejects_swapped_diagnostic),
    ("断り書きに無いコードは免除せん", check_expected_red_rejects_unknown_code),
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
