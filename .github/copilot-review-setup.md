# GitHub Copilot 自動コードレビュー設定ガイド

## 概要

このリポジトリでは GitHub Copilot の公式機能を使用して、プルリクエストの自動コードレビューと実装支援を行います。

GitHub Copilot は Copilot Pro、Copilot Business、または Copilot Enterprise のサブスクリプションで利用可能です。

## 前提条件

- GitHub Copilot Pro、Business、または Enterprise のサブスクリプション
- リポジトリの管理者権限

## セットアップ手順

### 1. 自動コードレビューの有効化

GitHub Copilot の自動コードレビュー機能は、**リポジトリのルールセット** を通じて設定します。

#### 手順:

1. リポジトリの **Settings** に移動
2. **Code and automation** → **Rules** → **Rulesets** を選択
3. **New ruleset** → **New branch ruleset** をクリック
4. ルールセットを設定:
   - **Ruleset Name**: 例 `copilot-auto-review`
   - **Enforcement status**: `Active`
   - **Target branches**: `main`、`develop` など保護したいブランチを指定
5. **Require Copilot code review** セクションで:
   - ✅ **Automatically request Copilot code review** を有効化
   - オプション: **Review new pushes to an open pull request** (新しいプッシュも自動レビュー)
   - オプション: **Review draft pull requests** (ドラフトPRもレビュー)
6. **Create** をクリックしてルールセットを保存

### 2. 組織レベルでの設定（オプション）

複数のリポジトリに対して一括で設定する場合:

1. 組織の **Settings** に移動
2. **Code, planning, and automation** → **Repository** → **Rulesets** を選択
3. 組織レベルのルールセットを作成し、対象リポジトリを指定

## 使用方法

### プルリクエストの自動レビュー

1. 通常通りプルリクエストを作成
2. GitHub Copilot が自動的にコードをレビュー
3. レビューコメントがPRに投稿される
4. 提案された修正を確認・適用
5. 必要に応じて人間のレビュアーによる追加レビュー

### GitHub Copilot によるレビュー内容

- コードの品質と可読性
- セキュリティの問題
- パフォーマンスの最適化
- ベストプラクティスの適用
- バグの可能性がある箇所
- 型安全性の問題

### 除外されるファイル

以下のファイルは自動的にレビュー対象から除外されます:
- 依存関係のロックファイル (`package-lock.json`, `yarn.lock` など)
- 画像ファイル (SVG など)
- 自動生成されたファイル

## 料金とクォータ

- 自動コードレビューは月次クォータにカウントされます
- Copilot Pro: 月次制限あり
- Copilot Business/Enterprise: より高い制限

詳細は GitHub Copilot の料金プランを確認してください。

## トラブルシューティング

### Copilot がレビューを実行しない

1. サブスクリプションが有効か確認
2. ルールセットが正しく設定されているか確認
3. 対象ブランチが正しく指定されているか確認
4. ドラフトPRの場合、"Ready for review" にする

### レビューの品質を向上させる

- PR の説明を詳細に記載する
- コミットメッセージを明確にする
- 1つのPRで変更を小さく保つ（300行以内推奨）
- 関連するコンテキストをPR説明に含める

## 参考リンク

- [GitHub Copilot 公式ドキュメント](https://docs.github.com/en/copilot)
- [自動コードレビューの設定](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/configure-automatic-review)
- [GitHub Copilot コードレビューについて](https://docs.github.com/en/copilot/concepts/agents/code-review)

## 注意事項

- GitHub Copilot のレビューは補助的なものです
- 重要な変更には人間のレビュアーによる確認が必須です
- セキュリティ上の問題を100%検出できるわけではありません
- 最終的な判断は開発者が行う必要があります
