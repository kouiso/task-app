# Task App - Next.js 15 モダンタスク管理アプリケーション

## 🚀 概要

このプロジェクトは、**Next.js 15 App Router**を使用したモダンなタスク管理アプリケーションです。最新のWeb開発技術を学習できる教育向けプロジェクトとして設計されています。

## 📚 教材について

すべての学習教材は `./material/` フォルダに配置されています：

```
material/
├── 00_NEW_21_DAY_PLAN.md              # 21日間学習カリキュラム
├── BEGINNER_GUIDE_NEXTJS.md           # 初心者向けガイド
├── TECH_STACK_GUIDE.md                # 技術スタック詳細解説
├── FAQ_MODERN_WEB.md                  # よくある質問
├── TROUBLESHOOTING_NEXTJS.md          # トラブルシューティング
├── EDUCATION_PROGRESS_REPORT.md       # 教育コンテンツ進捗
├── 01_nextjs_app_router_setup.md      # Day 1: 環境構築
├── 02_components_and_structure.md     # Day 2: コンポーネント理解
├── 03_nextauth_authentication.md      # Day 3: 認証システム
└── 04_trpc_prisma_fullstack.md        # Day 4: フルスタック開発
```

## 🏗️ 技術スタック (2024年最新)

### フロントエンド
- **Next.js 15.0.0** - React フレームワーク (App Router)
- **React 18.3.1** - UIライブラリ
- **TypeScript 5.6.3** - 型安全な開発
- **Material-UI v6.4.8** - UIコンポーネント
- **tRPC v11.0.0** - 型安全API

### バックエンド
- **Next.js API Routes** - サーバーサイドAPI
- **Prisma 6.16.2** - TypeScript ORM
- **tRPC JWT Authentication** - 認証システム (NextAuth削除)
- **PostgreSQL** - データベース (Vercel Postgres対応)

### 開発ツール
- **Biome 1.9.4** - リンター・フォーマッター
- **Vitest 3.0.9** - テストフレームワーク
- **Turbopack** - 高速バンドラー

## 🔧 セットアップ

### 前提条件
- Node.js 22.0.0以上
- npm または yarn
- Docker Desktop (ローカル開発用PostgreSQL)

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd task-app

# 依存関係をインストール
npm install

# PostgreSQLをDockerで起動
docker-compose up -d

# 環境変数を設定
cp .env.example .env
# .envファイルを編集 (デフォルト設定でローカル開発可能)

# Prismaクライアントを生成
npm run db:generate

# データベースを初期化
npm run db:push
npm run db:seed

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開く

### 本番環境 (Vercel)

```bash
# Vercel Postgresを作成
# https://vercel.com/docs/storage/vercel-postgres

# 環境変数を設定
# Vercelダッシュボード > Settings > Environment Variables
# DATABASE_URL: Vercel Postgresの接続文字列
# JWT_SECRET: ランダムな文字列 (32文字以上推奨)

# デプロイ
vercel deploy
```

### 利用可能なコマンド

```bash
# 開発
npm run dev              # 開発サーバー起動
npm run build            # プロダクションビルド
npm run start            # プロダクションサーバー起動

# コード品質
npm run lint             # Biome リント実行
npm run lint:fix         # リント問題を自動修正
npm run format           # コードフォーマット
npm run type-check       # TypeScript型チェック

# データベース
npm run db:generate      # Prisma クライアント生成
npm run db:push          # スキーマをデータベースに反映
npm run db:migrate       # マイグレーション実行
npm run db:studio        # Prisma Studio起動
npm run db:seed          # シードデータ投入

# テスト
npm run test             # テスト実行
npm run test:ui          # テストUIで実行
```

## 📖 学習の進め方

1. **教材の順序に従って学習**
   - `material/00_NEW_21_DAY_PLAN.md` から開始
   - 各日のチュートリアルを順番に進める

2. **実践的な開発体験**
   - 実際にコードを書きながら学習
   - 各機能の実装を通じてスキルを習得

3. **段階的な難易度上昇**
   - 基本概念 → 実装 → 応用の3段階
   - 前の知識を活用した積み重ね学習

## 🎯 学習目標

このプロジェクトを完了すると、以下のスキルが身につきます：

### 技術スキル
- **Next.js 15 App Router** の完全理解
- **TypeScript** による型安全な開発
- **tRPC** でのEnd-to-End型安全API設計
- **Prisma** でのモダンデータベース操作
- **Material-UI** での美しいUI設計

### 実践スキル
- モダンWeb開発のベストプラクティス
- エンタープライズレベルのアーキテクチャ設計
- セキュリティを考慮した認証システム構築
- 保守性の高いコードベース構築
- チーム開発に適したプロジェクト構造

## 🏆 特徴

### redmine-cloneからの大幅改善
- **技術スタック**: Flask → Next.js 15 (最新)
- **開発言語**: Python → TypeScript (型安全)
- **API設計**: REST → tRPC (型安全)
- **UI**: テンプレート → モダンコンポーネント
- **教育内容**: 基本 → エンタープライズレベル

### 2024年最新技術対応
- App Router完全対応
- React Server Components活用
- 最新のReact Query v5
- Turbopackによる高速開発
- Modern CSS-in-JS

## 💡 サポート

学習中に問題が発生した場合：

1. **トラブルシューティング**: `material/TROUBLESHOOTING_NEXTJS.md`
2. **FAQ**: `material/FAQ_MODERN_WEB.md`
3. **技術詳細**: `material/TECH_STACK_GUIDE.md`

## 📄 ライセンス

このプロジェクトは教育目的で作成されています。

---

**🎓 Let's start your modern web development journey with Next.js 15!**
