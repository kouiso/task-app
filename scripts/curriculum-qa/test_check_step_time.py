#!/usr/bin/env python3
"""check_step_time.py の退行テスト。

書き方が2通りある（「合計時間: 約60分です」と「合計時間は約56分です」）ので、
片方だけに合わせた正規表現にすると、もう片方のファイルが検査されないまま緑になる。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

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
]


def main() -> int:
    failed = 0
    for name, text, expected in CASES:
        got = check(text)
        if got != expected:
            failed += 1
            print(f"  ❌ {name}: 期待 {expected} / 実際 {got}")
    if failed:
        print(f"❌ check_step_time 自己テスト {failed}/{len(CASES)} 失敗")
        return 1
    print(f"✅ check_step_time 自己テスト {len(CASES)}/{len(CASES)} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
