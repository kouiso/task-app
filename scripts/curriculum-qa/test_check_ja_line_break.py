#!/usr/bin/env python3
"""check_ja_line_break の退行テスト。

見つけないといけないのは、画面に出る日本語の文の途中改行だけ。
見つけてはいけないのは、コメント・オブジェクトの値・式の連鎖・句点で終わる文である。
この線を引き違えると、正しい折り返しを壊す側の誤検知になる。
広い条件では115件、中間の条件では73件の誤検出が出たので、境界を固定しておく。
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_ja_line_break import find_violations  # noqa: E402


BAD_SPLIT = """```tsx
<p>
  プロジェクトの進捗とタスクの
  状況を確認できます。
</p>
```
"""

BAD_TYPESCRIPT = """```typescript
<DialogDescription>
  このプロジェクトに
  新しいメンバーを追加します。
</DialogDescription>
```
"""

OK_JOINED = """```tsx
<p>
  プロジェクトの進捗とタスクの状況を確認できます。
</p>
```
"""

OK_SENTENCE_END = """```tsx
<div>
  一文目です。
  二文目です。
</div>
```
"""

OK_COMMENT = """```typescript
<div>
  {/* ここは説明の続き */}
  {/* さらに説明を足す */}
</div>
```
"""

OK_OBJECT_VALUE = """```typescript
const menu = [
  { text: 'ダッシュボード' },
  { text: 'プロジェクト' },
];
```
"""

OK_ZOD_CHAIN = """```typescript
const schema = z.string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .regex(/[A-Z]/, 'パスワードには大文字を含める必要があります');
```
"""

OK_BASH = """```bash
echo "このプロジェクトに"
echo "新しいメンバーを追加します。"
```
"""

CASES = [
    ("tsx の途中改行", BAD_SPLIT, 1),
    ("typescript 表記の途中改行", BAD_TYPESCRIPT, 1),
    ("1行に繋いである", OK_JOINED, 0),
    ("句点で終わる2文", OK_SENTENCE_END, 0),
    ("JSX のコメント", OK_COMMENT, 0),
    ("オブジェクトの値", OK_OBJECT_VALUE, 0),
    ("zod の連鎖", OK_ZOD_CHAIN, 0),
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
        print(f"❌ 日本語の文の折り返し {total - failed}/{total} 合格")
        return 1
    print(f"✅ 日本語の文の折り返し 自己テスト {total}/{total} 合格")
    return 0


if __name__ == "__main__":
    sys.exit(main())
