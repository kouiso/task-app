#!/usr/bin/env python3
"""check_jsx_marker の退行テスト。

見つけないといけないのは「言語表記が `tsx` でない JSX 断片」で、1度目の修正が
取り落としたのがまさにそこだった。見つけてはいけないのは、素の `{` で始まる
オブジェクトリテラルと、ファイル全体を載せたブロックである。この2つを取り違えると、
正しい `//` コメントを壊す側の誤検知になる。
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_jsx_marker import find_violations  # noqa: E402


BAD_TSX = """```tsx
// filepath: src/app/login/page.tsx
<form>
  <button>送信</button>
</form>
```
"""

BAD_TYPESCRIPT = """```typescript
// filepath: src/app/login/page.tsx
// LoginFormのreturn部分
<form>
  <button>送信</button>
</form>
```
"""

BAD_EXPRESSION = """```typescript
// filepath: src/app/task/page.tsx
{error && (
  <p>{error}</p>
)}
```
"""

OK_OBJECT_LITERAL = """```typescript
// filepath: next.config.ts（headers の配列に追加）
{
  key: "X-Frame-Options",
  value: "DENY",
}
```
"""

OK_WHOLE_FILE = """```tsx
// filepath: src/app/login/page.tsx
export default function Page() {
  return <div />;
}
```
"""

OK_JSX_COMMENT = """```tsx
{/* filepath: src/app/login/page.tsx */}
<form>
  <button>送信</button>
</form>
```
"""

OK_BASH = """```bash
# filepath: scripts/build.sh
<<EOF
EOF
```
"""

CASES = [
    ("tsx の JSX 断片", BAD_TSX, 1),
    ("typescript 表記の JSX 断片", BAD_TYPESCRIPT, 2),
    ("JSX の埋め込みで始まる断片", BAD_EXPRESSION, 1),
    ("オブジェクトリテラル", OK_OBJECT_LITERAL, 0),
    ("ファイル全体", OK_WHOLE_FILE, 0),
    ("既に JSX の書き方", OK_JSX_COMMENT, 0),
    ("bash", OK_BASH, 0),
]


def main() -> int:
    failed = 0
    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        for i, (label, text, want) in enumerate(CASES):
            target = root / f"day{i:02d}_ケース.md"
            target.write_text(text, encoding="utf-8")
            hits, _ = find_violations(root)
            if len(hits) != want:
                print(f"❌ {label}: 検出 {len(hits)} 件（期待 {want} 件）")
                failed += 1
            target.unlink()

    total = len(CASES)
    if failed:
        print(f"❌ JSX の位置の目印 {total - failed}/{total} 合格")
        return 1
    print(f"✅ JSX の位置の目印 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
