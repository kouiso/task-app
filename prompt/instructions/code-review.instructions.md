---
applyTo: "**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.py,**/*.dart"
---

# コードレビュー規約 (Code Review Guidelines)

## 1. レビュー実施の基本方針

### PRレビューを指示されたら自動的に実施

**ユーザーからPRレビューを依頼されたら、以下を自動的に実施すること：**

1. **複数の観点から並行レビュー**
   - `general-purpose`エージェントを複数並行で起動
   - コード品質・保守性
   - セキュリティ
   - アーキテクチャ設計

2. **GitHubには書き込まない**
   - ユーザーが明示的に許可しない限り、GitHubへのコメント投稿禁止
   - レビュー結果はユーザーに報告のみ
   - **「レビューして」は「GitHubに投稿しろ」ではない。チャット内で報告するだけ。**
   - GitHubへの投稿は「投稿して」「GitHubにコメントして」等の明示的指示が必要

3. **良い点の説明は省略**
   - ユーザーは改善点のみを知りたい
   - Good Pointsは簡潔にまとめるか省略

---

## レビュー観点（最低限）

レビュー時は必ず以下を参照し、最低限の観点として網羅すること：

- `prompt/skills/review-perspectives.md`

### TypeScript型安全性チェック（必須）

PRレビュー時、以下を**必ず**全diffファイルで確認すること：

- [ ] `as SomeType` が含まれていないか（`as const`以外はすべて[MUST]指摘）
- [ ] `any` が含まれていないか（`: any`, `any[]`, `<any>`, `Promise<any>` → [MUST]指摘）
- [ ] `// @ts-ignore` / `// @ts-expect-error` が含まれていないか → [MUST]指摘
- [ ] `setTimeout`/`setInterval` がタイミングハック（モーダル閉じ待ち等）として使われていないか → [MUST]指摘
- [ ] `catch` ブロックでエラーが握りつぶされていないか（`catch {}`, `catch { console.log }` のみ） → [SUGGEST]指摘
- [ ] マジックナンバー（`100`, `300`, `500` 等のハードコード値）がないか → [SUGGEST]指摘
- [ ] `typeof`が型安全性の回避（typeof逃げ）として使われていないか → [MUST]指摘（環境検出・ポリフィル判定は除く）

**上記は機能の正しさとは別軸のチェック。機能レビューの前にまずこれを確認すること。**

### 設計アンチパターン検出（必須）

「事実が合っているか」だけでなく、**「そもそもこのコード設計は正しいか？」を必ず問うこと。**

- [ ] `setTimeout`/`setInterval` をレースコンディション回避やアニメーション待ちに使っていないか → 正しいコールバック（`onDismiss`, `onTransitionEnd`, `InteractionManager`等）を提案 [MUST]
- [ ] 状態管理が適切か（propsバケツリレー、不要なuseState、useEffectの乱用）→ [SUGGEST]
- [ ] N+1クエリやループ内DBアクセスがないか → [MUST]
- [ ] 認証・認可チェックの欠落がないか → [MUST]
- [ ] `useLayoutEffect` が DOM測定以外で使われていないか → [MUST]
- [ ] イベントリスナーのクリーンアップ漏れがないか → [SUGGEST]
- [ ] 依存配列（useEffect/useCallback/useMemo）が正しいか → [MUST]

**「動くから問題ない」は設計レビューの放棄。「もっと良い方法はないか？」を常に問え。**

### 完全合格ループ（必須）

**レビュー → 修正 → 再レビュー のサイクルに回数上限はない。全チェック項目がゼロ違反になるまでループを継続すること。**

- ❌ 「3回修正したのでこれで終わり」
- ❌ 「軽微な問題だけなのでマージ可能」
- ✅ 全 [MUST] 指摘がゼロになるまで修正→再レビューを繰り返す
- ✅ [SUGGEST] は作者が明示的に「対応しない」と判断した場合のみスキップ可

**打ち切り条件は「全 [MUST] 違反ゼロ」のみ。回数では打ち切らない。**

## 2. レビューコメントの出力形式

### 優先度の使い分け

| タグ        | 用途             | 基準                                               | 例                                             |
| ----------- | ---------------- | -------------------------------------------------- | ---------------------------------------------- |
| `[MUST]`    | マージ前必須修正 | バグ、セキュリティ脆弱性、本番環境で動作しない問題 | デフォルト値未設定、リンク切れ、エラー発生     |
| `[SUGGEST]` | 修正を強く推奨   | コード品質、保守性、パフォーマンス改善             | コードの重複、設定の不統一、バリデーション不足 |
| `[Q]`       | 質問・確認       | 意図的かどうか不明な点、確認が必要な事項           | デザイン差分、仕様の確認                       |
| `[IMO]`     | 個人的な意見     | 好みの問題、代替案の提案                           | 命名の提案、別アプローチの提案                 |
| `[NITS]`    | 些細な指摘       | typo、formatting、コメントの誤字等                 | スペルミス、インデント、不要な空行             |

---

## PR Review Prohibitions

- **9.1 Excessive Security Callouts**: Only report actual vulnerabilities. Do not recommend sanitization when framework auto-escaping is active.
- **9.2 Non-Existent File Paths**: Always verify file paths with `find`/`ls` before citing. Never guess.
- **9.3 Numbered Review Comments**: ❌ `## [MUST] #1: Title` (GitHub auto-links #1). ✅ `## [MUST]: Title`.
- **9.4 Missing Line Numbers**: Always include verified line numbers. ✅ `[example.tsx:42](src/component/example.tsx#L42)`.
- **9.5 Code Review Without Purpose**: Follow: (1) What the code does → (2) Why it's a problem → (3) Alternative.
- **9.6 Skipping Quality Checks Because CI Passed**: CI pass is minimum bar, not quality assurance. Review all new files.
- **9.7 Reviewing Stale Diffs**: Verify current file state with `git show origin/<branch>:<path>` before commenting.
- **9.8 Overlooking Inappropriate useLayoutEffect**: useLayoutEffect is only for DOM measurement before repaint. Flag when unjustified.
- **9.9 Review Without "Better Way" Perspective**: Review for: (1) Correctness → (2) Quality → (3) Optimization → (4) Maintainability.

---

## 修正push後の再チェック義務（Post-Fix Re-Check Obligation）

**修正をpushした後、レビューbotが新たな指摘を出すことがある。これを無視するのは禁止。**

修正commit → push → レビューbot再実行 → 新たな指摘 → **即座に対応** のループを、未解決指摘が0件になるまで回すこと。

- Devin Review bot / CodeRabbit / その他レビューbotの指摘は、人間レビュアーの指摘と同等の優先度
- 🚩（bug/issue）マーク → 必ず修正。放置は絶対禁止
- 🟡（warning）マーク → 修正するか、明確な理由を返信してresolve
- 📝（info）マーク → code-style系（arrow function等）はルール準拠なら修正必須
- **「前の指摘は直したからOK」ではない。新たに出た指摘も全て対応して初めて完了**
- **「対応完了」と報告する前に、未解決のbot指摘が0件であることを確認せよ**

---

## レビュワーbot指摘への自動resolveプロトコル

**レビュワーbot（CodeRabbit等）の指摘に対応したら、指示者の介入なしに自分でresolveすること。**
**「resolveして」「対応して」と毎回言わせるな。bot指摘は全て自律的に処理せよ。**

### 絶対ルール: bot指摘 = 必ず返信 + 必ずresolve

全てのbot指摘に対し、以下のいずれかを**指示者に言われる前に自分で実行**すること。

| 判断 | アクション | 返信内容 | resolve |
|------|-----------|---------|---------|
| 修正する | コード修正 → commit → push | 「`{hash}` で修正済み」 | **即resolve** |
| 対応不要 | 技術的根拠を説明 | 「意図的な設計」「既存パターン準拠」等の根拠 | **即resolve** |
| スコープ外 | 重複チェック → Issue作成（`gh issue create`） | 「スコープ外のため #[Issue番号] で起票済み」 | **即resolve** |
| 判断に迷う | 指示者にエスカレーション | 「判断に迷うため確認お願いします」 | resolveしない |

### 「スコープ外」は放置の免罪符ではない

「スコープ外だから対応しない」で終わりにするのは**禁止**。スコープ外 = 「今のPRでは直さないが、やるべきこと」。必ずIssueを作成してからresolveせよ。

### Issue起票前の重複チェック義務

Issue作成前に**必ず既存Issue/PRを検索し、重複がないことを確認**すること。

```bash
# 重複チェック（キーワードで既存Issue/PRを検索）
gh issue list --state all --search "キーワード" --limit 20
gh pr list --state all --search "キーワード" --limit 20
```

| 検索結果 | アクション |
|----------|-----------|
| 重複Issueあり（open） | 新規作成しない。既存Issue番号を返信に記載 |
| 類似Issueあり（closed） | 再発・未完了なら reopen を検討。完全解決済みなら新規作成OK |
| 重複PRあり | 新規作成しない。既存PR番号を返信に記載 |
| 該当なし | 新規Issue作成OK |

**禁止**: 検索せずにいきなり `gh issue create` すること。同じ内容のIssueが乱立する原因になる。

### resolve のタイミング
- ✅ 返信投稿後に即resolve（botの再返信を待たない）
- ❌ botの「acknowledged」を待つ必要なし（botは人間ではない）
- ❌ 指示者の「resolveして」を待つ必要なし（自律的に判断せよ）
- ❌ 指示者の「対応して」を待つ必要なし（即座に自律判断せよ）

### 例外（resolveしてはいけないケース）
- ❗ 指示者が「この指摘は対応して」と明示的に指示 → 修正完了まで保持
- ❗ 自分の判断に自信がない → 指示者に確認

---

## 5. 心得

1. **ユーザーは改善点のみを知りたい** → 良い点の説明は省略
2. **丁寧な口調を徹底** → 相手に負担をかけない表現
3. **具体的な修正案を提示** → コード例を必ず含める
4. **コピペしやすさ優先** → `<details>`タグなどは使わない
5. **GitHubには書き込まない** → ユーザーの明示的な許可なしに投稿禁止

## Detailed Templates

For tone templates, copy-paste formats, and example comments, read `prompt/instructions/code-review-templates.md` before executing a review.
