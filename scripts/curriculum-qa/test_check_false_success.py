#!/usr/bin/env python3
"""check_false_success.py の退行テスト。

止めるもの（閉じていないのに「エラーが出なくなります」）と、止めてはいけないもの
（閉じてから同じ文を書く／閉じていないが完了を宣言していない／「まだエラーが残ります」と
正しく断っている／別の日の破損を巻き添えにしない）の両方を置く。
"""

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from check_false_success import find_claims, main  # noqa: E402

TARGET = "src/app/foo/page.tsx"


def block(body: str, target: str = TARGET) -> str:
    return f"```tsx\n// filepath: {target}\n{body}\n```\n"


CASES: list[tuple[str, dict[str, str], list[tuple[str, int]]]] = [
    (
        "閉じていないのに完了を宣言したら止める",
        {"day29_x.md": block("  <form>") + "\n保存してもエラーが出なくなります。\n"},
        [("day29_x.md", 6)],
    ),
    (
        "閉じていれば同じ文でも通す",
        {
            "day29_x.md": block("  <form>\n  </form>")
            + "\n保存してもエラーが出なくなります。\n"
        },
        [],
    ),
    (
        "閉じていなくても完了を宣言していなければ通す",
        {"day29_x.md": block("  <form>") + "\nこの時点では構文エラーが残ります。\n"},
        [],
    ),
    (
        "コードブロックの中の文言は地の文ではない",
        {
            "day29_x.md": block("  <form>")
            + "```tsx\nconst msg = 'エラーが消えました';\n```\n"
        },
        [],
    ),
    (
        "打ち消しで終わる断りは完了宣言ではない",
        {"day29_x.md": block("  <form>") + "\nまだエラーが消えません。\n"},
        [],
    ),
    (
        "「すべてのタグを閉じていません」も完了宣言ではない",
        {"day29_x.md": block("  <form>") + "\nここですべてのタグを閉じていません。\n"},
        [],
    ),
    (
        "打ち消しでなければこれまでどおり止める",
        {"day29_x.md": block("  <form>") + "\nこれですべてのタグを閉じました。\n"},
        [("day29_x.md", 6)],
    ),
    (
        "同じ日に触っただけの day を巻き添えにしない",
        {
            "day10_x.md": block("  <div>\n  </div>") + "\nこれでエラーが消えます。\n",
            "day29_x.md": block("  <form>"),
        },
        [],
    ),
    (
        "他の日の破損を巻き添えにしない",
        {
            "day29_x.md": block("  <form>"),
            "day02_x.md": "\n保存してもエラーが出なくなります。\n",
        },
        [],
    ),
]


def check_exit_code() -> tuple[int, int]:
    def run(args: list[str]) -> int:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return main(args)

    failed = 0
    cases = [
        ("宣言が残っていれば 1 を返す", block("  <form>") + "\nエラーが出なくなります。\n", 1),
        ("問題が無ければ 0 を返す", block("  <form>\n  </form>") + "\nエラーが出なくなります。\n", 0),
    ]
    for name, body, want in cases:
        with tempfile.TemporaryDirectory() as d:
            Path(d, "day29_x.md").write_text(body, encoding="utf-8")
            if run(["check_false_success.py", d]) != want:
                failed += 1
                print(f"  ❌ {name}")
    if run(["check_false_success.py", "/no/such/path"]) != 2:
        failed += 1
        print("  ❌ 見つからないパスで 2 を返さない")
    return failed, len(cases) + 1


def main_test() -> int:
    failed = 0
    for name, files, expected in CASES:
        with tempfile.TemporaryDirectory() as d:
            paths = []
            for fname, body in files.items():
                p = Path(d) / fname
                p.write_text(body, encoding="utf-8")
                paths.append(p)
            got = [(n, i) for n, i, _, _ in find_claims(sorted(paths))]
        if sorted(got) != sorted(expected):
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    exit_failed, exit_total = check_exit_code()
    failed += exit_failed
    total = len(CASES) + exit_total
    if failed:
        print(f"❌ check_false_success 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_false_success 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main_test())
