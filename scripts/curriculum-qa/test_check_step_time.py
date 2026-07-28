#!/usr/bin/env python3
"""check_step_time.py の退行テスト。

書き方が2通りある（「合計時間: 約60分です」と「合計時間は約56分です」）ので、
片方だけに合わせた正規表現にすると、もう片方のファイルが検査されないまま緑になる。
"""

import contextlib
import io
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import check_step_time  # noqa: E402
from check_step_time import check  # noqa: E402

TABLE = """| ステップ | 作業内容 | 所要時間 |
|---|---|---|
| Step 0 | 準備する | 10分 |
| Step 1 | 書く | 20分 |
"""

CASES: list[tuple[str, str, object]] = [
    ("合っていれば差なし", TABLE + "\n**合計時間**: 約30分です。", (30, 30, 2)),
    ("ずれていれば拾う", TABLE + "\n**合計時間**: 約25分です。", (30, 25, 2)),
    ("『は』でつなぐ書き方も拾う", TABLE + "\n**合計時間**は約30分です。", (30, 30, 2)),
    ("『約』が無くても拾う", TABLE + "\n**合計時間**: 30分です。", (30, 30, 2)),
    ("表が無いファイルは対象外", "**合計時間**: 約30分です。", None),
    ("合計の記載が無いファイルは対象外", TABLE, None),
    ("番号のない行は数えない", TABLE + "| 合計 | まとめ | 99分 |\n\n**合計時間**: 約30分です。", (30, 30, 2)),
    ("途中に差し込んだ Step 2.5 も数える", TABLE + "| Step 2.5 | 差し込み | 5分 |\n\n**合計時間**: 約35分です。", (35, 35, 3)),
    # コードブロックの中の見本の表を足すと、実際の予定と合っている日が落ちる。
    (
        "コードブロックの中の表は数えない",
        TABLE + "\n```md\n| Step 9 | 見本 | 5分 |\n```\n\n**合計時間**: 約30分です。",
        (30, 30, 2),
    ),
    (
        "4連で開いたブロックの中も数えない",
        TABLE + "\n````md\n```\n| Step 9 | 見本 | 5分 |\n```\n````\n\n**合計時間**: 約30分です。",
        (30, 30, 2),
    ),
    (
        "コードブロックの中の合計時間は本文の合計にしない",
        TABLE + "\n```md\n**合計時間**: 約99分です。\n```\n",
        None,
    ),
]


def check_missing_summary() -> tuple[int, int]:
    """day05 以降で表や合計が消えたら落ちることを見る。

    ここが緩むと、行をまるごと消しても Gate 4 が緑のままになる。
    """

    def run(files: dict[str, str]) -> int:
        with tempfile.TemporaryDirectory() as d:
            for name, body in files.items():
                Path(d, name).write_text(body, encoding="utf-8")
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                return check_step_time.main(["check_step_time.py", d])

    cases = [
        ("day05 で表が消えたら 1 を返す", {"day05_x.md": "**合計時間**: 約30分です。\n"}, 1),
        ("day05 で合計が消えたら 1 を返す", {"day05_x.md": TABLE}, 1),
        ("day01 は表が無くても 0 を返す", {"day01_x.md": "文章で進めます。\n"}, 0),
        (
            "day05 がそろっていれば 0 を返す",
            {"day05_x.md": TABLE + "\n**合計時間**: 約30分です。\n"},
            0,
        ),
    ]
    failed = 0
    for name, files, want in cases:
        got = run(files)
        if got != want:
            failed += 1
            print(f"  ❌ {name}: 期待 {want} / 実際 {got}")
    return failed, len(cases)


def main() -> int:
    failed = 0
    for name, text, expected in CASES:
        got = check(text)
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    missing_failed, missing_total = check_missing_summary()
    failed += missing_failed
    total = len(CASES) + missing_total
    if failed:
        print(f"❌ check_step_time 自己テスト {failed}/{total} 失敗")
        return 1
    print(f"✅ check_step_time 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
