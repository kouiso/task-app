# Claudecode GitHub Actions 使用ガイド

このリポジトリには、Claude AI を活用した2つの GitHub Actions ワークフローが含まれています。

## 📋 目次

- [前提条件](#前提条件)
- [セットアップ](#セットアップ)
- [ワークフロー](#ワークフロー)
  - [1. Claudecode Review](#1-claudecode-review)
  - [2. Claudecode Implementation](#2-claudecode-implementation)
- [使用方法](#使用方法)
- [トラブルシューティング](#トラブルシューティング)

## 前提条件

- GitHub リポジトリへの管理者アクセス
- Anthropic Claude API のサブスクリプション（Pro以上推奨）
- Claude API キー

## セットアップ

### 1. Anthropic API キーの取得

1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. API キーを作成
3. キーを安全な場所に保管

### 2. GitHub Secrets の設定

1. リポジトリの Settings → Secrets and variables → Actions に移動
2. 「New repository secret」をクリック
3. 以下のシークレットを追加:

| Secret Name | 説明 | 必須 |
|------------|------|------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API キー | ✅ |

![GitHub Secrets設定](https://docs.github.com/assets/cb-28009/mw-1440/images/help/repository/actions-secrets-and-variables.webp)

### 3. ワークフロー権限の設定

1. Settings → Actions → General に移動
2. 「Workflow permissions」セクションで以下を有効化:
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

## ワークフロー

### 1. Claudecode Review

**ファイル**: `.github/workflows/claudecode-review.yml`

#### 機能

プルリクエストのコードを自動的にレビューし、以下の観点でフィードバックを提供します:

- ✅ コードの品質（可読性、保守性）
- ✅ TypeScript の型安全性
- ✅ Next.js App Router のベストプラクティス
- ✅ セキュリティ上の懸念
- ✅ パフォーマンス上の問題
- ✅ テストの必要性
- ✅ ドキュメントの更新が必要か

#### トリガー条件

以下のいずれかで自動実行されます:

- プルリクエストが opened されたとき
- プルリクエストが reopened されたとき
- プルリクエストが synchronize されたとき（新しいコミットがプッシュされたとき）
- プルリクエストが ready_for_review になったとき

**注意**: ドラフトプルリクエストでは実行されません。

#### 手動実行

特定のプルリクエストを手動でレビューする場合:

1. Actions タブを開く
2. 「Claudecode Review」ワークフローを選択
3. 「Run workflow」をクリック
4. PR番号を入力して実行

#### レビュー結果の形式

```markdown
## 🤖 Claudecode レビュー結果

## 📊 総合評価
[承認/要修正/要議論]

## ✅ 良い点
- [良い点のリスト]

## ⚠️ 改善提案
- [改善提案のリスト]

## 🐛 重大な問題
- [問題のリスト]

## 💡 その他のコメント
- [その他のコメント]

---
*このレビューは Claude AI によって自動生成されました*
```

### 2. Claudecode Implementation

**ファイル**: `.github/workflows/claudecode-implementation.yml`

#### 機能

Issue に基づいて実装プランを自動生成し、コメントとして投稿します。

#### トリガー条件

以下のいずれかで実行されます:

- Issue に `claudecode` ラベルが付けられたとき
- 手動実行（workflow_dispatch）

#### 手動実行

特定の Issue の実装プランを生成する場合:

1. Actions タブを開く
2. 「Claudecode Implementation」ワークフローを選択
3. 「Run workflow」をクリック
4. Issue番号を入力して実行

#### 実装プランの形式

```markdown
## 🤖 Claudecode 実装プラン

### 📋 実装計画
[詳細な実装計画]

### 📝 変更予定ファイル
- **create**: `path/to/new/file.ts`
  [ファイルの説明]
- **modify**: `path/to/existing/file.ts`
  [変更内容の説明]

### 🧪 テスト計画
[テスト計画の詳細]

### 📌 実装ブランチ
`feature/issue-123-brief-description`

---
*この実装プランは Claude AI によって自動生成されました。*
```

## 使用方法

### プルリクエストのレビュー

#### 方法1: 自動レビュー

1. 通常通りプルリクエストを作成
2. ドラフトを解除（Ready for review にする）
3. 自動的に Claudecode Review が実行される
4. 数分後、PR にレビューコメントが投稿される

#### 方法2: 手動レビュー

```bash
# 1. PRを作成
git checkout -b feature/my-feature
git commit -m "Add new feature"
git push origin feature/my-feature

# 2. GitHub で PR を作成

# 3. Actions タブから手動実行
# または、PR にコメント: /review
```

### Issue からの実装

#### 方法1: ラベルを使用

1. Issue を作成
2. `claudecode` ラベルを追加
3. 自動的に実装プランが生成される
4. Issue にコメントとして投稿される

#### 方法2: 手動実行

```bash
# 1. Issue を作成（例: Issue #123）

# 2. Actions タブを開く

# 3. "Claudecode Implementation" を選択

# 4. "Run workflow" をクリック

# 5. Issue番号 (123) を入力して実行
```

## トラブルシューティング

### ワークフローが実行されない

#### 原因と対処法

1. **ドラフトPRの場合**
   - 解決: PR を "Ready for review" に変更

2. **シークレットが設定されていない**
   - 確認: Settings → Secrets and variables → Actions
   - 解決: `ANTHROPIC_API_KEY` を追加

3. **権限が不足している**
   - 確認: Settings → Actions → General → Workflow permissions
   - 解決: "Read and write permissions" を有効化

### API エラーが発生する

#### エラー: "Invalid API key"

```
Error: API key is invalid
```

**対処法**:
1. Anthropic Console で API キーを確認
2. GitHub Secrets の `ANTHROPIC_API_KEY` を更新
3. ワークフローを再実行

#### エラー: "Rate limit exceeded"

```
Error: Rate limit exceeded
```

**対処法**:
1. Anthropic のプランを確認（Pro プランを推奨）
2. 数分待ってから再実行
3. API 使用量を確認: [Anthropic Console - Usage](https://console.anthropic.com/settings/usage)

### レビューコメントが投稿されない

#### 原因と対処法

1. **ワークフローのログを確認**
   ```
   Actions タブ → 該当のワークフロー実行 → ログを確認
   ```

2. **権限エラーの場合**
   - Settings → Actions → General
   - "Allow GitHub Actions to create and approve pull requests" を有効化

3. **API レスポンスエラーの場合**
   - ワークフローログの `Review with Claude` ステップを確認
   - エラーメッセージに基づいて対処

## ベストプラクティス

### 効果的なレビューのために

1. **PR のサイズを適切に保つ**
   - 1つのPRは300行以内を推奨
   - 大きな変更は複数のPRに分割

2. **明確な PR 説明を書く**
   - 何を変更したか
   - なぜ変更したか
   - どのようにテストしたか

3. **適切なコミットメッセージ**
   - [Conventional Commits](https://www.conventionalcommits.org/) を使用
   - 例: `feat: add user authentication`, `fix: resolve login bug`

### 効果的な Issue 作成

1. **明確なタイトル**
   - 何を実装するか一目でわかるタイトル
   - 例: "ユーザープロフィール編集機能の追加"

2. **詳細な説明**
   - 背景・目的
   - 要件・仕様
   - 制約条件
   - 参考資料

3. **例**:
   ```markdown
   ## 概要
   ユーザーがプロフィール情報を編集できる機能を追加する
   
   ## 要件
   - [ ] プロフィール編集ページの作成
   - [ ] フォームバリデーション
   - [ ] APIエンドポイントの実装
   
   ## 技術スタック
   - Next.js App Router
   - tRPC
   - Prisma
   
   ## 参考
   - 既存のユーザー一覧ページ: `src/app/users/page.tsx`
   ```

## セキュリティに関する注意事項

### API キーの管理

- ⚠️ **絶対にコードにハードコードしない**
- ✅ GitHub Secrets を使用する
- ✅ 定期的にキーをローテーションする

### レビューの限界

Claudecode Review は以下を完全に保証するものではありません:

- セキュリティ脆弱性の完全な検出
- すべてのバグの発見
- 完璧なコード品質

**重要な変更には人間のレビューも必須です。**

## コスト管理

### API 使用量の目安

- 小規模PR（100行以内）: 約 $0.01-0.03
- 中規模PR（100-300行）: 約 $0.03-0.10
- 大規模PR（300行以上）: 約 $0.10-0.30

### コスト削減のヒント

1. ドラフトPRではレビューをスキップ
2. 大きなPRは分割する
3. 不要なファイルの変更を避ける（自動生成ファイル等）

## サポート

### 問題が解決しない場合

1. [GitHub Issues](../../issues) で報告
2. ワークフローのログを添付
3. 詳細な状況説明を記載

### 関連リンク

- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [プロジェクト開発ガイド](./doc/dev-guide.md)

---

**最終更新**: 2025-12-05
