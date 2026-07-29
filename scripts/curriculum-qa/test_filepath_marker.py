#!/usr/bin/env python3
"""貼り先の目印を、2つの書き方のどちらでも読み取れることの退行テスト。

教材は貼り先を `// filepath:` で示す。ただし JSX の子要素の位置では `//` が
コメントにならず、そのまま画面に文字として出てしまう。そこでは
`{/* filepath: ... */}` を使う。

検査側がどちらか片方しか読めないと、ブロックと貼り先の対応が切れて、
タグの開閉や手続きの順番の検査が黙って素通りする。両方を置いて、
値が同じに取れることを確かめる。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from curriculum_blocks import FILEPATH, filepath_value  # noqa: E402


CASES = [
    ("// filepath: src/app/login/page.tsx", "src/app/login/page.tsx"),
    ("# filepath: scripts/build-zip.sh", "scripts/build-zip.sh"),
    ("        {/* filepath: src/app/login/page.tsx */}", "src/app/login/page.tsx"),
    (
        "    {/* filepath: src/component/layout/app-layout.tsx（同じファイルの続き） */}",
        "src/component/layout/app-layout.tsx（同じファイルの続き）",
    ),
]

NOT_MARKERS = [
    "const filepath = 'src/app/page.tsx';",
    "{/* ナビゲーション */}",
    "// 完成版: 送信ボタン",
]


def main() -> int:
    failed = 0

    for line, want in CASES:
        m = FILEPATH.match(line)
        if m is None:
            print(f"❌ 目印として読めていない: {line!r}")
            failed += 1
            continue
        got = filepath_value(m)
        if got != want:
            print(f"❌ 値が違う: {line!r} → {got!r}（期待 {want!r}）")
            failed += 1

    for line in NOT_MARKERS:
        if FILEPATH.match(line) is not None:
            print(f"❌ 目印でない行を目印として拾った: {line!r}")
            failed += 1

    total = len(CASES) + len(NOT_MARKERS)
    if failed:
        print(f"❌ 貼り先の目印 {total - failed}/{total} 合格")
        return 1
    print(f"✅ 貼り先の目印 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
