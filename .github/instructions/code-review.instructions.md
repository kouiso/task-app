---
applyTo: "**"
---

# コードレビュー規約 (Code Review Guidelines)

## 1. レビュー実施の基本方針

### PRレビューを指示されたら自動的に実施

1. **複数の観点から並行レビュー**
   - コード品質・保守性
   - セキュリティ
   - アーキテクチャ設計

2. **GitHubには書き込まない**
   - ユーザーが明示的に許可しない限り、GitHubへのコメント投稿禁止
   - レビュー結果はユーザーに報告のみ

3. **良い点の説明は省略**
   - ユーザーは改善点のみを知りたい

### TypeScript型安全性チェック（必須）

PRレビュー時、以下を**必ず**全diffファイルで確認すること：

- [ ] `as SomeType` が含まれていないか（`as const`以外はすべて[MUST]指摘）
- [ ] `any` が含まれていないか → [MUST]指摘
- [ ] `// @ts-ignore` / `// @ts-expect-error` が含まれていないか → [MUST]指摘
- [ ] `setTimeout`/`setInterval` がタイミングハックとして使われていないか → [MUST]指摘
- [ ] `catch` ブロックでエラーが握りつぶされていないか → [SUGGEST]指摘
- [ ] マジックナンバーがないか → [SUGGEST]指摘

**上記は機能の正しさとは別軸のチェック。機能レビューの前にまずこれを確認すること。**

### 設計アンチパターン検出（必須）

「事実が合っているか」だけでなく、**「そもそもこのコード設計は正しいか？」を必ず問うこと。**

- [ ] `setTimeout`/`setInterval` をレースコンディション回避やアニメーション待ちに使っていないか → 正しいコールバックを提案 [MUST]
- [ ] 状態管理が適切か（propsバケツリレー、不要なuseState、useEffectの乱用）→ [SUGGEST]
- [ ] N+1クエリやループ内DBアクセスがないか → [MUST]
- [ ] 認証・認可チェックの欠落がないか → [MUST]
- [ ] 依存配列（useEffect/useCallback/useMemo）が正しいか → [MUST]

**「動くから問題ない」は設計レビューの放棄。「もっと良い方法はないか？」を常に問え。**

### 完全合格ループ（必須）

**レビュー → 修正 → 再レビュー のサイクルに回数上限はない。全 [MUST] 違反がゼロになるまでループを継続すること。**

- ❌ 「3回修正したのでこれで終わり」
- ❌ 「軽微な問題だけなのでマージ可能」
- ✅ 全 [MUST] 指摘がゼロになるまで繰り返す
- ✅ [SUGGEST] は作者が明示的に「対応しない」と判断した場合のみスキップ可

**打ち切り条件は「全 [MUST] 違反ゼロ」のみ。回数では打ち切らない。**

## 2. レビューコメントの出力形式

### 優先度の使い分け

| タグ | 用途 | 基準 |
|------|------|------|
| `[MUST]` | マージ前必須修正 | バグ、セキュリティ脆弱性、本番環境で動作しない問題 |
| `[SUGGEST]` | 修正を強く推奨 | コード品質、保守性、パフォーマンス改善 |
| `[Q]` | 質問・確認 | 意図的かどうか不明な点 |
| `[IMO]` | 個人的な意見 | 好みの問題、代替案の提案 |
| `[NITS]` | 些細な指摘 | typo、formatting、コメントの誤字等 |

## PR Review Prohibitions

- **Excessive Security Callouts**: Only report actual vulnerabilities.
- **Non-Existent File Paths**: Always verify file paths before citing.
- **Numbered Review Comments**: ❌ `## [MUST] #1: Title`. ✅ `## [MUST]: Title`.
- **Missing Line Numbers**: Always include verified line numbers.
- **Code Review Without Purpose**: Follow: (1) What → (2) Why problem → (3) Alternative.
- **Skipping Quality Checks Because CI Passed**: CI pass is minimum bar.
- **Reviewing Stale Diffs**: Verify current file state before commenting.
- **Review Without "Better Way" Perspective**: (1) Correctness → (2) Quality → (3) Optimization → (4) Maintainability.

## 3. 心得

1. **ユーザーは改善点のみを知りたい** → 良い点の説明は省略
2. **丁寧な口調を徹底**
3. **具体的な修正案を提示** → コード例を必ず含める
4. **GitHubには書き込まない** → 明示的な許可なしに投稿禁止
