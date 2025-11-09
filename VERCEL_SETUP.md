# Vercel Deployment Guide

このガイドでは、task-appをVercelにデプロイし、Vercel Postgresを自動でセットアップする方法を説明します。

## 🚀 自動セットアップ（推奨）

### 前提条件

- Node.js 22以上
- Vercelアカウント
- GitHubリポジトリ

### ステップ1: 自動セットアップスクリプトを実行

```bash
npm run vercel:setup
```

このコマンドで以下が自動実行されます：

1. ✅ Vercel CLIのインストール確認
2. ✅ Vercelへのログイン
3. ✅ プロジェクトのリンク
4. ✅ Postgres データベースの作成
5. ✅ データベースとプロジェクトの接続
6. ✅ 環境変数の設定（NODE_ENV, JWT_SECRET, DATABASE_URL）
7. ✅ 本番環境へのデプロイ

### ステップ2: 必要な情報を準備

スクリプト実行中に以下の情報が必要です：

#### 1. Vercel API Token

1. https://vercel.com/account/tokens にアクセス
2. **Create Token** をクリック
3. Token Name: `task-app-setup`
4. Scope: **Full Account**
5. **Create** をクリックしてトークンをコピー

#### 2. データベース設定

- Database name: `taskapp-db`（推奨、任意の名前でOK）
- Region: `iad1`（Washington D.C. - 推奨）

### ステップ3: データベースのシード

デプロイ完了後、初期データを投入：

```bash
npm run vercel:seed
```

または手動で：

```bash
vercel env pull .env.production.local
npx prisma db seed
```

---

## 🔧 手動セットアップ

自動セットアップがうまくいかない場合は、以下の手順で手動セットアップできます。

### 1. Vercelプロジェクト作成

```bash
vercel login
vercel link
```

### 2. Vercel Postgresデータベース作成

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. プロジェクト（task-app）を選択
3. **Storage** タブをクリック
4. **Create Database** → **Postgres** を選択
5. Database name: `taskapp-db`
6. Region: `Washington, D.C., USA (East)` を選択
7. **Create** をクリック

### 3. データベースをプロジェクトに接続

1. データベース作成後の画面で **Connect Project**
2. プロジェクト: `task-app` を選択
3. Environment: **Production**, **Preview**, **Development** 全てチェック
4. **Connect** をクリック

### 4. 環境変数の設定

**Settings** → **Environment Variables** で以下を追加：

```
NODE_ENV=production
```

```
JWT_SECRET=Z/xG3M9/MB25IxKdTTtmzD/Lt3i/+u+rqX1l5KSZ71M=
```

```
DATABASE_URL=${POSTGRES_PRISMA_URL}
```

**注意**: `DATABASE_URL`の値は`${POSTGRES_PRISMA_URL}`をそのまま入力してください（変数参照）

### 5. デプロイ設定

**Settings** → **General** → **Build & Development Settings**:

| 項目 | 設定値 |
|------|--------|
| Framework Preset | Next.js |
| Build Command | `npm run vercel-build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node.js Version | 22.x |

### 6. デプロイ

```bash
vercel --prod
```

または、GitHubにpushすると自動デプロイされます。

### 7. データベースシード

```bash
vercel env pull .env.production.local
npx prisma db seed
```

---

## 📝 利用可能なコマンド

### Vercel関連

```bash
# 自動セットアップ（DB作成 + デプロイ）
npm run vercel:setup

# 環境変数をローカルにpull
npm run vercel:env

# データベースにシードデータを投入
npm run vercel:seed

# 本番環境にデプロイ
vercel --prod

# プレビュー環境にデプロイ
vercel
```

### データベース関連

```bash
# Prismaクライアント生成
npm run db:generate

# データベーススキーマをpush
npm run db:push

# マイグレーション実行（開発環境）
npm run db:migrate

# Prisma Studio起動（データベースGUI）
npm run db:studio

# シードデータ投入
npm run db:seed
```

---

## 🔐 環境変数

デプロイ時に設定される環境変数：

| 変数名 | 説明 | 設定方法 |
|--------|------|----------|
| `DATABASE_URL` | PostgreSQL接続URL | `${POSTGRES_PRISMA_URL}` を参照 |
| `POSTGRES_PRISMA_URL` | Prisma用接続URL | Vercel Postgresが自動設定 |
| `POSTGRES_URL` | 直接接続URL | Vercel Postgresが自動設定 |
| `JWT_SECRET` | JWT署名用秘密鍵 | 手動設定（`.env.production`参照） |
| `NODE_ENV` | 実行環境 | `production` |

---

## 🧪 テストユーザー

データベースシード後、以下のユーザーでログインできます：

### 管理者
- Email: `admin@example.com`
- Password: `password123`

### 一般ユーザー
- Email: `user1@example.com`
- Password: `password123`

### 一般ユーザー2
- Email: `user2@example.com`
- Password: `password123`

---

## 🐛 トラブルシューティング

### ビルドエラー: "Prisma schema not found"

```bash
# postinstallスクリプトが実行されていない
# package.jsonに以下が設定されているか確認
"postinstall": "prisma generate"
```

### データベース接続エラー

```bash
# 環境変数が正しく設定されているか確認
vercel env ls

# DATABASE_URLが${POSTGRES_PRISMA_URL}を参照しているか確認
```

### デプロイ後にデータがない

```bash
# シードを実行
npm run vercel:seed
```

### Framework Presetエラー

Vercel設定で**Framework Preset**が`Next.js`になっているか確認してください（`Vite`ではない）

---

## 📚 参考リンク

- [Vercel Docs](https://vercel.com/docs)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js Docs](https://nextjs.org/docs)

---

## 💡 Tips

### ローカルで本番環境変数を使いたい

```bash
vercel env pull .env.production.local
```

### 本番DBをローカルで確認

```bash
vercel env pull .env.production.local
npx prisma studio
```

### 別のリージョンを使いたい

利用可能なリージョン：
- `iad1` - Washington, D.C., USA (East) - 推奨
- `sfo1` - San Francisco, USA (West)
- `fra1` - Frankfurt, Germany (Europe)
- `sin1` - Singapore (Asia)

---

以上でVercelへのデプロイが完了します！🎉
