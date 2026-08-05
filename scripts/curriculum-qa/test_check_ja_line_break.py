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

# 半角数字を含む画面の文。旧判定は ASCII を1つでも含む行を外していたので、
# day25 の「8文字以上で、…」を丸ごと取り落としていた。
BAD_WITH_DIGITS = """```tsx
<p>
  8文字以上で、大文字・小文字・数字・
  特殊文字をそれぞれ1文字以上含めてください
</p>
```
"""

# 読点で終わる行。読点は文を終わらせないので、次の行は同じ文の続きになる。
BAD_COMMA = """```tsx
<p>
  ただの見出しではなく、
  開いた瞬間に分かるメッセージを置く。
</p>
```
"""

# 全角の感嘆符・疑問符。文末として扱う記号は、画面の文としても認めないと検出できない。
BAD_EXCLAM = """```tsx
<p>
  ようこそ！ここから
  はじめましょう。
</p>
```
"""

BAD_QUESTION = """```tsx
<p>
  つぎに何をするか
  分かりますか？
</p>
```
"""

# 全角の感嘆符で終わる行は、そこで文が切れているので折り返しではない。
OK_EXCLAM_END = """```tsx
<div>
  ようこそ！
  はじめましょう。
</div>
```
"""

# 疑問符も文を終わらせる。BAD_QUESTION は ？ を次の行に置くので、
# 前の行へ当てる文末判定を通らない。この向きは別に固定する。
OK_QUESTION_END = """```tsx
<div>
  つぎに何をするか分かりますか？
  分からなければ前の日に戻りましょう。
</div>
```
"""


# 開きタグと同じ行に文の前半が来る形。タグがあるだけで外していたので取り落としていた。
BAD_INLINE_TAG = """```tsx
<div>
  <p>プロジェクトが
    見つかりません。</p>
</div>
```
"""

# 逆クォートとハイフンを含む画面の文。どちらも表示される文字なので除外の根拠にならない。
BAD_BACKTICK = """```tsx
<p>
  `Hello Task-App` から、
  自分の名前が見える画面へ進んだ。
</p>
```
"""

# 別々の要素が並んでいるだけ。1つの文の折り返しではないので検出してはいけない。
OK_SIBLING_ELEMENTS = """```tsx
<TableRow>
  <TableHead>ユーザー</TableHead>
  <TableHead>メールアドレス</TableHead>
</TableRow>
```
"""

# 見出しと説明文。別の要素なので折り返しではない。
OK_TITLE_AND_DESC = """```tsx
<DialogHeader>
  <DialogTitle>メンバー追加</DialogTitle>
  <DialogDescription>このプロジェクトに追加します。</DialogDescription>
</DialogHeader>
```
"""


# スラッシュを含む画面の文。パスは表示される文字なので除外の根拠にならない。
BAD_SLASH = """```tsx
<p>
  `/dashboard` を開くと、
  次の画面が表示されます。
</p>
```
"""

# 閉じかっこで終わる行。かっこは文を終わらせないので、次の行は同じ文の続き。
BAD_CLOSING_BRACKET = """```tsx
<p>
  ロールから「管理者」
  を選択してください。
</p>
```
"""

# 空行を挟んでも JSX は空白1個に畳む。
BAD_BLANK_BETWEEN = """```tsx
<p>
  日本語の

  続きです。
</p>
```
"""

# 行コメントはスラッシュを許したあとも検出してはいけない。
OK_LINE_COMMENT = """```tsx
<div>
  // ここは説明の続き
  // さらに説明を足す
</div>
```
"""


# 情報文字列つきの囲い。開始と認めないと、閉じの ``` を開始と読み違えて対応がずれる。
BAD_INFO_STRING = """```tsx title="src/app/page.tsx"
<p>
  プロジェクトの進捗と
  タスクの状況を確認できます。
</p>
```
"""

# テンプレート文字列の中の改行は、書いたとおりに残る。JSX の畳み込みは起きない。
OK_TEMPLATE_LITERAL = """```typescript
const message = `
日本語の
改行を保ちます。
`;
```
"""

# チルダの囲いも CommonMark のフェンスである。バッククォートしか見ないと、
# このブロックごと検査の外に落ちる。
BAD_TILDE_FENCE = """~~~tsx
<p>
  プロジェクトの進捗と
  タスクの状況を確認できます。
</p>
~~~
"""

# チルダの囲いを認識しないと、その中のバッククォートを本物の開始と読み違える。
# 中の本数が奇数だと以降の対応が1つずつずれ、後ろの本物のブロックが丸ごと
# 検査から外れる。day03 の `~~~md` が実際にこの形をしている。
BAD_AFTER_TILDE_NEST = """~~~md title="README.md"
説明の中に囲いの記号だけを見せます。

```
~~~

```tsx
<p>
  プロジェクトの進捗と
  タスクの状況を確認できます。
</p>
```
"""


CASES = [
    ("tsx の途中改行", BAD_SPLIT, 1),
    ("typescript 表記の途中改行", BAD_TYPESCRIPT, 1),
    ("半角数字を含む画面の文", BAD_WITH_DIGITS, 1),
    ("開きタグと同じ行の前半", BAD_INLINE_TAG, 1),
    ("逆クォートとハイフンを含む文", BAD_BACKTICK, 1),
    ("スラッシュを含む画面の文", BAD_SLASH, 1),
    ("情報文字列つきの囲い", BAD_INFO_STRING, 1),
    ("チルダの囲い", BAD_TILDE_FENCE, 1),
    ("チルダの囲いに入れ子のバッククォート", BAD_AFTER_TILDE_NEST, 1),
    ("テンプレート文字列", OK_TEMPLATE_LITERAL, 0),
    ("閉じかっこで終わる行", BAD_CLOSING_BRACKET, 1),
    ("空行を挟んだ折り返し", BAD_BLANK_BETWEEN, 1),
    ("行コメント", OK_LINE_COMMENT, 0),
    ("並んだ別要素", OK_SIBLING_ELEMENTS, 0),
    ("見出しと説明文", OK_TITLE_AND_DESC, 0),
    ("読点で終わる行", BAD_COMMA, 1),
    ("全角の感嘆符を含む行", BAD_EXCLAM, 1),
    ("全角の疑問符で終わる次の行", BAD_QUESTION, 1),
    ("全角の感嘆符で文が切れる", OK_EXCLAM_END, 0),
    ("全角の疑問符で文が切れる", OK_QUESTION_END, 0),
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
