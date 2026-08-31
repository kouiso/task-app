#!/usr/bin/env python3
"""check_unclosed_screen.py の退行テスト。

止めるもの（閉じ切っていないまま見せる絵）と、止めてはいけないもの（閉じてから見せる、
絵の無い途中の状態、同じ節の断り、節をまたぐ Step 範囲の断り、収支の足場が無い
書き込み先、コードブロックの中の絵）の両方を置く。片方だけでは、全部を止める検査でも
全部を通す検査でも緑になってしまう。

特に見ておきたいのは「別の節の断りは効かない」の1件である。断りを日ぶん全体から
探す版は、30日のうち20日がどこかに断りを持つため事実上どこも見なくなっていた。
"""

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_unclosed_screen import find_unclosed_screens, main  # noqa: E402

IMAGE = "![見本](./screenshots/day05/x.png)"
PAGE = "src/app/x/page.tsx"


def block(body: str, target: str = PAGE, lang: str = "tsx", note: str = "") -> str:
    return f"```{lang}\n// filepath: {target}{note}\n{body}\n```\n"


OPEN = block("export default function X() {\n  return (\n    <div>")
CLOSE = block("    </div>\n  );\n}", note="（続き）")

CASES: list[tuple[str, dict[str, str], list[tuple[str, int]]]] = [
    (
        "閉じ切る前に絵を見せたら止める",
        {"day05_x.md": f"### Step 1: あ\n\n{OPEN}\n{IMAGE}\n\n{CLOSE}"},
        [("day05_x.md", 10)],
    ),
    (
        "「スクリーンショット:」の案内だけでも止める",
        {"day05_x.md": f"### Step 1: あ\n\n{OPEN}\nスクリーンショット: 一覧です。\n\n{CLOSE}"},
        [("day05_x.md", 10)],
    ),
    (
        "閉じてから見せていれば通す",
        {"day05_x.md": f"### Step 1: あ\n\n{OPEN}\n{CLOSE}\n{IMAGE}\n"},
        [],
    ),
    (
        "絵が無ければ、途中で閉じていなくても通す",
        {"day05_x.md": f"### Step 1: あ\n\n{OPEN}\n\n本文です。\n\n{CLOSE}"},
        [],
    ),
    (
        "前の日から開きっぱなしでも止める",
        {
            "day05_x.md": f"### Step 1: あ\n\n{OPEN}",
            "day06_y.md": f"### Step 1: い\n\n{IMAGE}\n\n{CLOSE}",
        },
        [("day06_y.md", 3)],
    ),
    (
        "同じ節に「まだ画面に出せません」があれば通す",
        {
            "day05_x.md": (
                f"### Step 1: あ\n\n{OPEN}\n"
                "この時点ではまだ画面に出せません。\n\n"
                f"{IMAGE}\n\n{CLOSE}"
            )
        },
        [],
    ),
    (
        "「下の画像は……完成後の画面です」でも通す",
        {
            "day05_x.md": (
                f"### Step 1: あ\n\n{OPEN}\n"
                "下の画像は Step 9 まで書き終えた完成後の画面です。\n\n"
                f"{IMAGE}\n\n{CLOSE}"
            )
        },
        [],
    ),
    (
        "「画面へ出すのは Step 8 です」でも通す",
        {
            "day05_x.md": (
                f"### Step 1: あ\n\n{OPEN}\n"
                "このダイアログを画面へ出すのは Step 8 です。\n\n"
                f"{IMAGE}\n\n{CLOSE}"
            )
        },
        [],
    ),
    (
        "Step 範囲の断りは節をまたいで効く",
        {
            "day05_x.md": (
                "### Step 1: あ\n\n"
                "Step 1 から Step 4 のあいだ、アプリは動かない状態になります。\n\n"
                f"{OPEN}\n"
                f"### Step 3: う\n\n{IMAGE}\n\n{CLOSE}"
            )
        },
        [],
    ),
    (
        "範囲の外の Step には効かない",
        {
            "day05_x.md": (
                "### Step 1: あ\n\n"
                "Step 1 から Step 2 のあいだ、アプリは動かない状態になります。\n\n"
                f"{OPEN}\n"
                f"### Step 5: う\n\n{IMAGE}\n\n{CLOSE}"
            )
        },
        [("day05_x.md", 14)],
    ),
    (
        "別の節に書かれた断りは効かない",
        {
            "day05_x.md": (
                "### Step 1: あ\n\nこの時点ではまだ画面に出せません。\n\n"
                f"### Step 2: い\n\n{OPEN}\n{IMAGE}\n\n{CLOSE}"
            )
        },
        [("day05_x.md", 14)],
    ),
    (
        "全部繋いでも収支が合わない書き込み先は見ない",
        {"day05_x.md": f"### Step 1: あ\n\n{OPEN}\n{IMAGE}\n"},
        [],
    ),
    (
        "コードブロックの中の絵は絵として数えない",
        {
            "day05_x.md": (
                f"### Step 1: あ\n\n{OPEN}\n"
                f"```md\n{IMAGE}\n```\n\n{CLOSE}"
            )
        },
        [],
    ),
    (
        "文字列とコメントの中のかっこは数えない",
        {
            "day05_x.md": (
                "### Step 1: あ\n\n"
                + block("const a = '{(';\n// 閉じる }\nconst b = 1;")
                + f"\n{IMAGE}\n"
            )
        },
        [],
    ),
    (
        "JSX を書けない .ts の `<Foo>` は開始タグに数えない",
        {
            "day05_x.md": (
                "### Step 1: あ\n\n"
                + block(
                    "const v = useState<string>(null);",
                    target="src/lib/x.ts",
                    lang="typescript",
                )
                + f"\n{IMAGE}\n"
            )
        },
        [],
    ),
    (
        "自己終了タグは開いたままにしない",
        {
            "day05_x.md": (
                "### Step 1: あ\n\n"
                + block("export const X = () => <Input />;")
                + f"\n{IMAGE}\n"
            )
        },
        [],
    ),
]


def run_case(files: dict[str, str]) -> list[tuple[str, int]]:
    with tempfile.TemporaryDirectory() as d:
        paths = []
        for name, body in files.items():
            p = Path(d) / name
            p.write_text(body, encoding="utf-8")
            paths.append(p)
        return [(name, lineno) for name, lineno, _t, _left in find_unclosed_screens(paths)]


def check_exit_code() -> tuple[int, int]:
    """main() の戻り値まで見る。(失敗数, 実行したケース数) を返す。

    ケースを直接 find_unclosed_screens に当てるだけだと、main() が指摘を持ちながら 0 を
    返すよう壊れても自己テストは緑のままになる。CI は終了コードしか見ない。
    """

    def run(args: list[str]) -> int:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return main(args)

    failed = 0
    cases = [
        ("閉じ切る前の絵で 1 を返す", f"### Step 1: あ\n\n{OPEN}\n{IMAGE}\n\n{CLOSE}", 1),
        ("指摘が無ければ 0 を返す", f"### Step 1: あ\n\n{OPEN}\n{CLOSE}\n{IMAGE}\n", 0),
    ]
    for name, body, want in cases:
        with tempfile.TemporaryDirectory() as d:
            Path(d, "day05_x.md").write_text(body, encoding="utf-8")
            if run(["check_unclosed_screen.py", d]) != want:
                failed += 1
                print(f"  ❌ {name}")
    # 対象が見つからない経路。`return 2` は2か所あるので両方を塞ぐ。
    if run(["check_unclosed_screen.py", "/no/such/path"]) != 2:
        failed += 1
        print("  ❌ 見つからないパスで 2 を返さない")
    with tempfile.TemporaryDirectory() as d:
        if run(["check_unclosed_screen.py", d]) != 2:
            failed += 1
            print("  ❌ 対象0件で 2 を返さない")
    return failed, len(cases) + 2


def main_test() -> int:
    failed = 0
    for name, files, expected in CASES:
        got = run_case(files)
        if sorted(got) != sorted(expected):
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    exit_failed, exit_total = check_exit_code()
    failed += exit_failed
    total = len(CASES) + exit_total
    if failed:
        print(f"❌ check_unclosed_screen 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_unclosed_screen 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main_test())
