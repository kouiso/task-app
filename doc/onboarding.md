# ONBOARDING

チームにジョインしてアプリケーションを立ち上げるところまで

## prerequisite

セットアップとその後の開発に必要な依存をインストール

- Machine: MacOS or Windows WSL2
- NodeJS: v22.11.0 (Volta推奨)
- Docker Desktop
- Git

<details>
<summary>複数のnodeバージョン管理</summary>

※複数の node バージョン管理が必要な場合は各自バージョン管理ツールを導入して管理する
このプロジェクトでは [Volta](https://volta.sh/) を推奨しています

```bash
# Voltaのインストール (macOS - Homebrew推奨)
brew install volta

# Voltaのインストール (macOS/Linux - 公式インストーラー)
curl https://get.volta.sh | bash

# Voltaのインストール (Windows)
# https://docs.volta.sh/guide/getting-started からインストーラーをダウンロード

# プロジェクトディレクトリに移動すると、package.jsonに記載されたNodeバージョンが自動で使用されます
cd task-app
volta install node
# package.jsonのvoltaセクションに定義されたNode 22.11.0が自動的にインストール・使用されます
```

</details>

## 初回設定

### 環境変数

- `.env.example` から `.env` を生成し、必要な情報を追加

  ```bash
  cp .env.example .env
  ```

  以下の環境変数を設定してください:

  ```bash
  # データベース接続
  DATABASE_URL="postgresql://user:password@localhost:5432/taskapp?schema=public"

  # NextAuth設定
  NEXTAUTH_SECRET=your_nextauth_secret_here
  NEXTAUTH_URL=http://localhost:3000

  # JWT設定
  JWT_SECRET=your_jwt_secret_here
  ```

## セットアップ手順

1. **依存パッケージのインストール**

   ```bash
   npm install
   ```

   ※ pnpm は使用しないでください

2. **PostgreSQL の起動 (Docker)**

   ```bash
   docker-compose up -d
   ```

3. **データベースのセットアップ**

   ```bash
   # Prismaクライアント生成
   npm run db:generate

   # スキーマをDBに反映
   npm run db:push

   # サンプルデータ投入
   npm run db:seed
   ```

4. **開発サーバーの起動**

   ```bash
   npm run dev
   ```

   - ブラウザで `http://localhost:3000` にアクセス

### デフォルトユーザー

| ロール   | メールアドレス      | パスワード     |
| -------- | ------------------- | -------------- |
| 管理者   | admin@example.com   | Password123!   |
| ユーザー | user1@example.com   | Password123!   |

## テスト

```bash
npm test              # テスト実行
npm run test:ui       # テストUIで実行
npm run test:coverage # カバレッジ確認
```

## トラブルシューティング

### Docker が起動しない

- Docker Desktop が起動しているか確認
- ポート 5432 が使用されていないか確認

### データベース接続エラー

1. Docker コンテナが起動しているか確認

   ```bash
   docker-compose ps
   ```

2. データベースをリセット
   ```bash
   docker-compose down -v
   docker-compose up -d
   npm run db:push
   npm run db:seed
   ```

### npm install エラー

- Node.js のバージョンを確認
- `node_modules` を削除して再インストール
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript 5.6
- **UI**: Material-UI 6.4
- **API**: tRPC 11.6
- **ORM**: Prisma 6.16
- **データベース**: PostgreSQL
- **認証**: NextAuth.js 4.24
- **テスト**: Vitest 3.0
