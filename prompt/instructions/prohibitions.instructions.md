---
applyTo: "**"
---

# Prohibitions

## Plagiarizing Other Reviewers' Output as Own Review

NEVER report a PR review based solely on other reviewers' findings (Devin, CodeRabbit, human reviewers, etc.) WHEN performing a code review BECAUSE it is intellectual dishonesty — the user requested YOUR analysis, not a summary of someone else's work.

**Required behavior for every PR review:**
1. Read the actual source code yourself — use local repo, `git show`, or `gh api` for file contents
2. IF `gh pr diff` fails due to size → use `git diff <base>...<head>` locally or read changed files directly from the filesystem
3. Other reviewers' comments are supplementary input, not a substitute for your own analysis
4. Your review MUST contain findings from YOUR code reading, clearly separated from other reviewers' findings

❌ Summarizing Devin/CodeRabbit comments and reporting it as "review result"
❌ Skipping code reading because diff was unavailable
✅ Reading changed files directly from local repo and reporting YOUR own findings
✅ Labeling other reviewers' findings explicitly: "Devin指摘の追認: ..." separated from your own analysis

## Playwright / ブラウザ動作確認の禁止事項

### Playwright拒否禁止

`mcp__playwright__*` ツールが存在するとき、「Playwrightが使えません」と主張することを禁止する。

禁止フレーズ：
```
❌ "Playwrightがこのプロジェクトに設定されていません"
❌ "ブラウザの動作確認ができません"
❌ "UIの確認をお願いします"
❌ "動くと思うので確認してください"
```

### 架空完了報告禁止

UI関連コードを変更したとき、Playwright検証なしに完了報告することを禁止する。

```
❌ "実装完了しました。" (検証なし)
❌ "コード変更は完了です。ご確認ください。" (ユーザーに委譲)
❌ "動くと思います。" (思い込み ≠ 検証)
```

トリガー：React/HTML/CSS/ルーティング/モーダル/フォームの変更 → 完了報告前に `mcp__playwright__browser_take_screenshot` を必ず実行すること。

## 架空デッドエンド宣言の禁止

### 代替手段を試す前に「できません」と宣言することを禁止

NEVER 技術的な壁を「自律実行では突破できない」と宣言すること
WHEN 代替手段をまだ試していない場合

```
❌ "これはセキュリティ制約で自律実行では突破できない" (まだ試していない)
❌ "A か B か、どっちで行く？" (AIが自律選択できるのにユーザーに委ねる)
❌ "ユーザーの手動操作が必要です" (プログラム的な代替を試す前)
```

```
✅ 不可能と結論づける前に全ての代替手段を試す
✅ 複数の道が存在する場合、最も実行可能なものをAIが選択して実行する
✅ ユーザーに確認するのは全代替手段が証拠付きで失敗した場合のみ
```
