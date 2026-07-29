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
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from curriculum_blocks import (  # noqa: E402
    FILEPATH,
    filepath_value,
    has_filepath_marker,
    iter_blocks,
)
from check_procedure_order import ROUTER_FILE  # noqa: E402


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
    # 閉じの `*/}` が無い。貼ると構文エラーになるので、目印として数えてはいけない。
    "{/* filepath: src/app/page.tsx",
]

MARKDOWN = """# 見出し

```tsx
{/* filepath: src/app/login/page.tsx */}
<form>
  <button type="submit">ログイン</button>
</form>
```

```ts
{/* filepath: src/server/api/routers/task.ts */}
export const taskRouter = createTRPCRouter({});
```
"""


def check_extraction() -> list[str]:
    """抽出と収集の実経路でも、JSX の書き方の目印が効くことを確かめる。"""
    fails = []
    with tempfile.TemporaryDirectory() as d:
        source = str(Path(d) / "day13_タスク一覧画面.md")
        blocks = list(iter_blocks(MARKDOWN, source))

    targets = [b.target for b in blocks]
    if targets != ["src/app/login/page.tsx", "src/server/api/routers/task.ts"]:
        fails.append(f"❌ iter_blocks が貼り先を取れていない: {targets}")

    if any(FILEPATH.match(line) for block in blocks for line in block.lines):
        fails.append("❌ iter_blocks が目印の行を写経対象へ混ぜている")

    router = ROUTER_FILE.match("{/* filepath: src/server/api/routers/task.ts */}")
    if router is None or router.group(1) != "task":
        fails.append("❌ ROUTER_FILE が JSX の書き方の目印を読めていない")

    for code, want in (("{/* filepath: src/app/page.tsx */}\n<div />", True),
                       ("{/* filepath: src/app/page.tsx\n<div />", False)):
        if has_filepath_marker(code) is not want:
            fails.append(f"❌ has_filepath_marker の判定が違う: {code!r}")

    return fails


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

    extraction_fails = check_extraction()
    for msg in extraction_fails:
        print(msg)
    failed += len(extraction_fails)

    total = len(CASES) + len(NOT_MARKERS) + 5
    if failed:
        print(f"❌ 貼り先の目印 {total - failed}/{total} 合格")
        return 1
    print(f"✅ 貼り先の目印 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
