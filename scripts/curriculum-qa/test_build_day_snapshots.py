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
import json
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


CHECKS = (
    ("写経対象の選び方", check_block_selection),
    ("ツリーへの書き出し", check_apply_blocks),
    ("置き換えと追記の境界", check_version_boundary),
    ("まるごとか抜粋か", check_complete_file),
    ("差し込みの適用", check_insertion),
    ("要素の書き換え", check_element_replacement),
    ("配布物の置き換え", check_scaffold_replacement),
    ("day の範囲", check_day_range),
    ("結果表の形", check_result_table),
    ("NG の切り分け", check_triage_section),
    ("tsconfig の exclude", check_tsconfig_excludes),
    ("想定内の赤は教材の断りが根拠", check_expected_red_is_grounded),
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
