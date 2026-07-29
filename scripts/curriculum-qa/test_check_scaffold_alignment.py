#!/usr/bin/env python3
"""scaffold 整合性検査が、貼り先の目印を2つの書き方とも読めることの退行テスト。

この検査は「その日にどのファイルが作られたか」を目印から集める。目印には
`// filepath:` と `{/* filepath: */}` の2通りがあり、片方しか読めないと
その日にファイルが作られたことを取り落とす。すると、後の日の import が
「まだ存在しないファイルを参照している」と誤判定される。

実際に2026-07-29 時点で、旧判定は144件の貼り先のうち9件を取り落としていた。
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import check_scaffold_curriculum_alignment as target  # noqa: E402


DAY_SLASH = """```typescript
// filepath: src/server/api/routers/task.ts
export const taskRouter = createTRPCRouter({});
```
"""

DAY_JSX = """```tsx
{/* filepath: src/app/login/page.tsx */}
<form />
```
"""

DAY_NOT_MARKER = """```typescript
// 完成版: 送信ボタン
const x = 1;
```
"""


def main() -> int:
    fails = []
    original = target.MATERIAL_DIR
    try:
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "day05_一つ目.md").write_text(DAY_SLASH, encoding="utf-8")
            (root / "day06_二つ目.md").write_text(DAY_JSX, encoding="utf-8")
            (root / "day07_三つ目.md").write_text(DAY_NOT_MARKER, encoding="utf-8")
            target.MATERIAL_DIR = root
            by_day = target.curriculum_creates_by_day()
    finally:
        target.MATERIAL_DIR = original

    if by_day.get(5) != {"src/server/api/routers/task.ts"}:
        fails.append(f"❌ // 形式の目印を読めていない: {by_day.get(5)}")
    if by_day.get(6) != {"src/app/login/page.tsx"}:
        fails.append(f"❌ JSX 形式の目印を読めていない: {by_day.get(6)}")
    if 7 in by_day:
        fails.append(f"❌ 目印でない行を貼り先として拾った: {by_day.get(7)}")

    total = 3
    if fails:
        for msg in fails:
            print(msg)
        print(f"❌ scaffold 整合性の目印 {total - len(fails)}/{total} 合格")
        return 1
    print(f"✅ scaffold 整合性の目印 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
