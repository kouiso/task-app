# ONBOARDING

チームにジョインしてアプリケーションを立ち上げるところまで

## prerequisite

セットアップとその後の開発に必要な依存をインストール

- Machine: MacOS or Windows WSL2
- [Task](https://taskfile.dev/installation/) (タスクランナー)
- Docker Desktop
- Git

<details>
<summary>Taskのインストール方法</summary>

Task は各種セットアップや開発コマンドを簡単に実行できるタスクランナーです。

```bash
# macOS (Homebrew)
brew install go-task

# Windows (Scoop)
scoop install task

# Windows (Chocolatey)
choco install go-task

# Linux (各種パッケージマネージャー)
# https://taskfile.dev/installation/ を参照
```

</details>

<details>
<summary>複数のnodeバージョン管理 (オプション)</summary>

※ 複数の node バージョン管理が必要な場合は各自バージョン管理ツールを導入して管理する
まだ未導入であれば[Volta](https://volta.sh/)がおすすめ

```bash
# Voltaのインストール (macOS/Linux)
curl https://get.volta.sh | bash

# Voltaのインストール (Windows)
# https://docs.volta.sh/guide/getting-started からインストーラーをダウンロード

# Node.jsのインストール
volta install node@25.6.1
```

このプロジェクトでは `package.json` に Volta の設定が含まれているため、
プロジェクトディレクトリで自動的に正しいバージョン (25.6.1) が使用されます。

</details>

## セットアップ手順

### 1. 環境変数の設定

`.env.example` から `.env` を生成し、必要に応じて値を編集

```bash
cp .env.example .env
```

### 2. 環境初期化

以下のコマンド1つで環境を初期化できます:

```bash
task init
```

このコマンドは以下を自動的に実行します:
- 依存パッケージのインストール
- Docker コンテナの構築と起動
- データベースのセットアップとシードデータ投入

**注意**: 初回実行時は Docker イメージのダウンロードとビルドのため、数分かかる場合があります。

### 3. 開発サーバーの起動

```bash
task up-backend
```

- ブラウザで `http://localhost:3000` にアクセス

### デフォルトユーザー

| ロール   | メールアドレス      | パスワード     |
| -------- | ------------------- | -------------- |
| 管理者   | admin@example.com   | password123   |
| ユーザー | user1@example.com   | password123   |

## よく使うコマンド

```bash
task                    # 利用可能なコマンド一覧を表示
task init               # 環境初期化（何度でも実行可能）
task up-backend         # バックエンドサーバーを起動
task seed               # DBリセット・シードデータ投入
task db-apply           # Prismaスキーマから状態をDBに反映
task clean              # 自動生成されたファイル・フォルダを削除
```

詳細は `task -l` または [taskfile.yaml](../taskfile.yaml) を参照してください。

## トラブルシューティング

### Docker が起動しない

- Docker Desktop が起動しているか確認
- ポート 5432 が使用されていないか確認

### データベース接続エラー

環境を再初期化してください:

```bash
task init
```

### 環境が壊れてしまった場合

`task init` は何度でも実行可能です。環境をクリーンな状態にリセットできます:

```bash
task init
```

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript 5.6
- **UI**: shadcn/ui (Radix UI + Tailwind CSS)
- **API**: tRPC 11.6
- **ORM**: Prisma 6.16
- **データベース**: PostgreSQL
- **認証**: NextAuth.js 4.24
- **テスト**: Vitest 3.0
