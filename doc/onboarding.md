# ONBOARDING

チームにジョインしてアプリケーションを立ち上げるところまで

## prerequisite

セットアップとその後の開発に必要な依存をインストール

- Machine: MacOS or Windows WSL2
- NodeJS: v22.0.0 以上
- Docker Desktop
- Git

<details>
<summary>複数のnodeバージョン管理</summary>

※複数の node バージョン管理が必要な場合は各自バージョン管理ツールを導入して管理する
まだ未導入であればプラグイン式で全言語の環境管理ができる[asdf](https://asdf-vm.com/guide/getting-started.html#_3-install-asdf)がおすすめ

```bash
# リンク先の手順に従って手動インストール後、以下を実行

# バージョン管理
asdf plugin-add nodejs
asdf install nodejs 22.0.0
# (プロジェクトディレクトリ直下で実行)
asdf local nodejs 22.0.0
# Globalに適用したい場合は以下
# asdf global nodejs 22.0.0
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
