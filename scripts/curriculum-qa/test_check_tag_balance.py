#!/usr/bin/env python3
"""check_tag_balance.py の退行テスト。

止めるもの（閉じタグが1つも無いまま開くタグ）と、止めてはいけないもの（同じ日に閉じる、
別の日に閉じる、ジェネリクスと比較演算子、自己終了タグ、コメントと文字列の中のタグ、
scaffold が最初から配るファイル）の両方を置く。
"""

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_tag_balance import find_unclosed, main, scan_tags  # noqa: E402
from curriculum_blocks import mask_code  # noqa: E402


def block(target: str, body: str, lang: str = "tsx") -> str:
    return f"```{lang}\n// filepath: {target}\n{body}\n```\n"


CASES: list[tuple[str, dict[str, str], list[tuple[str, str]]]] = [
    (
        "閉じタグが30日のどこにも無ければ止める",
        {
            "day29_x.md": block(
                "src/app/user/[id]/edit/user-edit-client.tsx",
                '    <form onSubmit={handleSubmit}>\n      <Input name="name" />',
            )
        },
        [("src/app/user/[id]/edit/user-edit-client.tsx", "form")],
    ),
    (
        "同じブロックで閉じていれば通す",
        {
            "day29_x.md": block(
                "src/app/user/[id]/edit/user-edit-client.tsx",
                "    <form>\n      <Input />\n    </form>",
            )
        },
        [],
    ),
    (
        "別の日で閉じていれば通す",
        {
            "day18_x.md": block("src/app/foo/page.tsx", "  <form>"),
            "day19_x.md": block("src/app/foo/page.tsx", "  </form>"),
        },
        [],
    ),
    (
        "ジェネリクスと比較演算子はタグとして数えない",
        {
            "day05_x.md": block(
                "src/app/foo/page.tsx",
                "const [v, setV] = useState<string | null>(null);\n"
                "if (count < limit) { return null; }\n"
                "const xs = new Array<number>();",
            )
        },
        [],
    ),
    (
        "自己終了タグは閉じタグを要らない",
        {"day05_x.md": block("src/app/foo/page.tsx", '  <Input name="a" />\n  <br />')},
        [],
    ),
    (
        "コメントの中の閉じタグは閉じたことにしない",
        {
            "day19_x.md": block(
                "src/app/foo/page.tsx",
                "  <Dialog open={open}>\n  // 既存の </Dialog> の直後に配置",
            )
        },
        [("src/app/foo/page.tsx", "Dialog")],
    ),
    (
        "属性の中の矢印関数に入る > で終端しない",
        {
            "day19_x.md": block(
                "src/app/foo/page.tsx",
                "  <Dialog onOpenChange={(o) => !o && close()}>\n  </Dialog>",
            )
        },
        [],
    ),
    (
        "scaffold が配るファイルは対象外",
        {
            "day18_x.md": block(
                "src/component/task/task-detail-dialog.tsx", "  <Dialog open={open}>"
            )
        },
        [],
    ),
    (
        "読み比べ用サンプルは写経対象ではない",
        {
            "day09_x.md": block(
                "読み比べ用サンプル（実ファイルには対応しません）", "  <form>"
            )
        },
        [],
    ),
    (
        "bash ブロックは構文が違うので対象外",
        {"day03_x.md": block("scripts/foo.sh", "echo '<form>'", lang="bash")},
        [],
    ),
    (
        "return の直後の JSX を開始タグとして数える",
        {"day29_x.md": block("src/app/foo/page.tsx", "  return <form>;")},
        [("src/app/foo/page.tsx", "form")],
    ),
    (
        "return の直後でも閉じていれば通す",
        {"day29_x.md": block("src/app/foo/page.tsx", "  return <form></form>;")},
        [],
    ),
    (
        "閉じていないブロックコメントが後続 day を隠さない",
        {
            "day18_x.md": block("src/app/foo/page.tsx", "  /* 途中で切れた説明"),
            "day29_x.md": block("src/app/foo/page.tsx", "  <form>"),
        },
        [("src/app/foo/page.tsx", "form")],
    ),
    (
        "ルートグループの括弧でパスを切り詰めない",
        {
            "day18_x.md": block("src/app/(auth)/login/page.tsx", "  <form>"),
            "day19_x.md": block("src/app/(shop)/cart/page.tsx", "  </form>"),
        },
        [("src/app/(auth)/login/page.tsx", "form")],
    ),
    (
        "scaffold が名指しで配るファイルも対象外",
        {"day08_x.md": block("src/app/providers.tsx", "  <QueryClientProvider>")},
        [],
    ),
    (
        ".ts の型アサーションは開始タグではない",
        {
            "day07_x.md": block(
                "src/lib/foo.ts",
                "const value = <Foo>raw;\nconst other = <Bar>input;",
                lang="typescript",
            )
        },
        [],
    ),
    (
        ".tsx なら同じ書き方をこれまでどおり開始タグとして数える",
        {"day07_x.md": block("src/app/foo/page.tsx", "  const el = <Foo>raw;")},
        [("src/app/foo/page.tsx", "Foo")],
    ),
    (
        ".ts でも tsx ブロックなら JSX として読む",
        {"day07_x.md": block("src/lib/foo.ts", "  return <form>;", lang="tsx")},
        [("src/lib/foo.ts", "form")],
    ),
]

# (説明, ファイル, 期待する day 一覧)
DAY_CASES: list[tuple[str, dict[str, str], list[int]]] = [
    (
        "開いた day だけを挙げる（触っただけの day は挙げない）",
        {
            "day10_x.md": block("src/app/foo/page.tsx", "  <div>\n  </div>"),
            "day29_x.md": block("src/app/foo/page.tsx", "  <form>"),
        },
        [29],
    ),
    (
        "複数の day が同じタグを開くなら両方挙げる",
        {
            "day10_x.md": block("src/app/foo/page.tsx", "  <form>"),
            "day29_x.md": block("src/app/foo/page.tsx", "  <form>"),
        },
        [10, 29],
    ),
]


def check_days() -> int:
    failed = 0
    for name, files, expected in DAY_CASES:
        with tempfile.TemporaryDirectory() as d:
            paths = []
            for fname, body in files.items():
                p = Path(d) / fname
                p.write_text(body, encoding="utf-8")
                paths.append(p)
            got = [days for _, _, days in find_unclosed(paths)]
        if got != [expected]:
            failed += 1
            print(f"  ❌ {name}: 期待 [{expected}] / 実際 {got}")
    return failed

MASK_CASES: list[tuple[str, str, str]] = [
    ("行コメントを潰す", "a // } ) \nb", "a" + " " * 8 + "\nb"),
    ("文字列を潰す", 'const s = "}}}";', "const s =" + " " * 6 + ";"),
    ("テンプレートリテラルを潰す", "const s = `${a} }`;", "const s =         ;"),
    ("ブロックコメントを潰す", "a /* } */ b", "a         b"),
]


def check_masking() -> int:
    failed = 0
    for name, src, want in MASK_CASES:
        got = mask_code(src)
        if got != want:
            failed += 1
            print(f"  ❌ {name}: 期待 {want!r} / 実際 {got!r}")
    return failed


def check_scan() -> int:
    """タグ数えそのもの。find_unclosed は集合しか見ないので、件数はここで見る。"""
    failed = 0
    opened, closed = scan_tags("<div><div></div>")
    if opened["div"] != 2 or closed["div"] != 1:
        failed += 1
        print(f"  ❌ 出現数を数えない: opened={opened} closed={closed}")
    return failed


def check_exit_code() -> tuple[int, int]:
    def run(args: list[str]) -> int:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return main(args)

    failed = 0
    cases = [
        (
            "閉じていなければ 1 を返す",
            block("src/app/foo/page.tsx", "  <form>"),
            1,
        ),
        (
            "閉じていれば 0 を返す",
            block("src/app/foo/page.tsx", "  <form>\n  </form>"),
            0,
        ),
    ]
    for name, body, want in cases:
        with tempfile.TemporaryDirectory() as d:
            Path(d, "day29_x.md").write_text(body, encoding="utf-8")
            if run(["check_tag_balance.py", d]) != want:
                failed += 1
                print(f"  ❌ {name}")
    if run(["check_tag_balance.py", "/no/such/path"]) != 2:
        failed += 1
        print("  ❌ 見つからないパスで 2 を返さない")
    with tempfile.TemporaryDirectory() as d:
        if run(["check_tag_balance.py", d]) != 2:
            failed += 1
            print("  ❌ 対象0件で 2 を返さない")
    return failed, len(cases) + 2


def main_test() -> int:
    failed = 0
    for name, files, expected in CASES:
        with tempfile.TemporaryDirectory() as d:
            paths = []
            for fname, body in files.items():
                p = Path(d) / fname
                p.write_text(body, encoding="utf-8")
                paths.append(p)
            got = [(t, n) for t, n, _ in find_unclosed(paths)]
        if sorted(got) != sorted(expected):
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    failed += check_masking() + check_scan() + check_days()
    exit_failed, exit_total = check_exit_code()
    failed += exit_failed
    total = len(CASES) + len(MASK_CASES) + len(DAY_CASES) + 1 + exit_total
    if failed:
        print(f"❌ check_tag_balance 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_tag_balance 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main_test())
