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

BAD_TEXT_CHILD = """```tsx
// filepath: src/app/page.tsx（同じファイルの続き）
                Day 02 では、ここから入れる場所を足していく。
              </p>
            </article>
```
"""

# 開始タグの途中。ここでは `//` が正しいコメントで、`{/* */}` を置くと構文エラーになる。
# 実測(2026-07-29, typescript の transpile): attr-slash はエラー0、
# attr-jsxcomment は「'...' expected.」で失敗する。
OK_ATTRIBUTE = """```tsx
// filepath: src/app/page.tsx（同じファイルの続き）
                >
                  ダッシュボードへ入る
                </Link>
```
"""

# 属性に渡すオブジェクトの途中。`color: "red",` は文字に見えるが JS の式の中で、
# `//` が正しいコメントになる（codex 指摘）。
OK_PROP_OBJECT = """```tsx
// filepath: src/component/ui/button.tsx（同じファイルの続き）
    color: "red",
  }}>
    送信
  </Button>
```
"""

# 閉じタグまで4行より遠い文字の断片。窓で見ていると取り落とす（codex 指摘）。
BAD_FAR_CLOSING = """```tsx
// filepath: src/app/page.tsx（同じファイルの続き）
                一行目のテキスト
                二行目のテキスト
                三行目のテキスト
                四行目のテキスト
              </p>
```
"""

# 句読点を含む普通の文字。`(` や `)` で弾いていると取り落とす（codex 指摘）。
BAD_PUNCTUATED_TEXT = """```tsx
// filepath: src/app/page.tsx（同じファイルの続き）
                Welcome (back)
              </h1>
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
    ("文字で始まる続きの断片", BAD_TEXT_CHILD, 1),
    ("開始タグの途中", OK_ATTRIBUTE, 0),
    ("属性に渡すオブジェクトの途中", OK_PROP_OBJECT, 0),
    ("閉じタグが遠い文字の断片", BAD_FAR_CLOSING, 1),
    ("句読点を含む文字の断片", BAD_PUNCTUATED_TEXT, 1),
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
