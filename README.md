# Task-App - モダンタスク管理アプリケーション

<div align="center">

**Next.js 15 + TypeScript + tRPC で構築された実用的なタスク管理アプリケーション**

プロダクションレベルの品質 × 教育教材として最適な設計

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![tRPC](https://img.shields.io/badge/tRPC-11.6-2596be)](https://trpc.io/)
[![Prisma](https://img.shields.io/badge/Prisma-6.16-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-UNLICENSED-red)](LICENSE)

</div>

---

## 目次

- [プロジェクト概要](#プロジェクト概要)
- [主要機能](#主要機能)
- [技術スタック](#技術スタック)
- [クイックスタート](#クイックスタート)
- [ドキュメント](#ドキュメント)
- [redmine-cloneとの違い](#redmine-cloneとの違い)
- [スクリーンショット](#スクリーンショット)
- [ライセンス](#ライセンス)
- [コントリビューション](#コントリビューション)

---

## プロジェクト概要

### このプロジェクトについて

Task-Appは、**Next.js 15**と**TypeScript**で構築されたモダンなタスク管理アプリケーションです。
**redmine-clone**（Flask/Python版）の完全リプレイスとして開発され、最新のWeb開発技術を学べる教育教材としても設計されています。

### 目的

- **教育**: 2024-2025年の最新Web開発技術を実践的に学習
- **実用性**: プロダクションレベルで実際に使用可能な品質
- **ベストプラクティス**: 現場で使われる設計パターンと開発手法

### 対象者

- モダンなWeb開発技術を学びたい方
- Next.js 15（App Router）を習得したい方
- tRPCによる型安全なAPI開発を学びたい方
- 実践的なプロジェクトでスキルアップしたい方

---

## 主要機能

### 認証システム
- メール/パスワード認証（NextAuth.js）
- セッション管理（JWT）
- パスワードハッシュ化（bcryptjs）
- 保護されたルート

### プロジェクト管理
- プロジェクトCRUD
- メンバー管理（OWNER, ADMIN, MEMBER, VIEWER）
- プロジェクトアーカイブ
- 色ラベル・期間設定

### タスク管理
- タスクCRUD
- 6段階のステータス管理（TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED, BLOCKED）
- 4段階の優先度設定（LOW, MEDIUM, HIGH, URGENT）
- タスクアサイン
- 期限管理
- タイマー機能（作業時間計測）
- 個人タスクビュー

### コメント機能
- タスクへのコメント投稿
- コメント編集・削除
- リアルタイム更新

### 検索機能
- 全文検索（タスク・プロジェクト）
- 高度な検索（複数条件フィルター）
- ステータス・優先度フィルター

### レポート機能
- ダッシュボード（統計情報）
- タスク完了率・進捗表示
- プロジェクト別集計
- 週次レポート
- グラフ表示（Recharts）

### UI/UX
- レスポンシブデザイン（モバイル対応）
- Material-UI統一デザイン
- ダークモード対応準備済み
- ローディング状態表示
- トースト通知

---

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 15.0.0 | Reactフレームワーク（App Router） |
| React | 18.3.1 | UIライブラリ |
| TypeScript | 5.6.3 | 型安全な開発 |
| Material-UI | 6.4.8 | UIコンポーネント |
| Emotion | 11.14.0 | CSS-in-JS |
| Recharts | 3.2.1 | グラフ・チャート |

### バックエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| tRPC | 11.6.0 | End-to-End型安全API |
| Prisma | 6.16.2 | TypeScript ORM |
| NextAuth | 4.24.11 | 認証システム |
| PostgreSQL | 16+ | データベース |
| bcryptjs | 2.4.3 | パスワードハッシュ化 |

### 開発ツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Biome | 1.9.4 | リンター・フォーマッター |
| Vitest | 3.0.9 | テストフレームワーク |
| Docker | 最新 | PostgreSQLコンテナ |
| Husky | 8.0.3 | Git hooks |

---

## クイックスタート

### 前提条件

- Node.js 22.0.0以上
- npm（pnpm禁止）
- Docker Desktop
- Git

### インストール

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd task-app

# 2. 依存関係をインストール
npm install

# 3. PostgreSQLを起動（Docker）
docker-compose up -d

# 4. 環境変数を設定
cp .env.example .env
# .envファイルを必要に応じて編集

# 5. データベースをセットアップ
npm run db:generate   # Prismaクライアント生成
npm run db:push       # スキーマをDBに反映
npm run db:seed       # サンプルデータ投入

# 6. 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

### デフォルトユーザー

| ロール | メールアドレス | パスワード |
|-------|--------------|-----------|
| 管理者 | admin@example.com | Password123! |
| ユーザー | user1@example.com | Password123! |

### 主要コマンド

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
npm run db:generate      # Prismaクライアント生成
npm run db:push          # スキーマをDBに反映
npm run db:migrate       # マイグレーション実行
npm run db:studio        # Prisma Studio起動
npm run db:seed          # シードデータ投入

# テスト
npm run test             # テスト実行
npm run test:ui          # テストUIで実行
npm run test:coverage    # カバレッジ確認
```

---

## ドキュメント

詳細なドキュメントを用意しています。

### 開発者向け

- **[CLAUDE.md](CLAUDE.md)** - AI引き継ぎ専用ドキュメント（プロジェクト全体像）
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - 開発環境構築と開発ワークフロー
- **[FEATURES.md](FEATURES.md)** - 全機能の詳細説明とAPI仕様
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - GitHub Copilot向けコーディング規約

### 教材（material/フォルダ）

- **[dev-guide.md](material/dev-guide.md)** - 開発ガイド
- **[onboarding.md](material/onboarding.md)** - オンボーディング
- **[pr-reviewer-rule.md](material/pr-reviewer-rule.md)** - PRレビュー規約

---

## redmine-cloneとの違い

このプロジェクトは、redmine-clone（Flask/Python版）の完全リプレイスです。

### 技術スタックの比較

| 項目 | redmine-clone | task-app |
|------|--------------|----------|
| 言語 | Python | TypeScript |
| フレームワーク | Flask | Next.js 15 |
| UI | Jinja2テンプレート | React + Material-UI |
| API | REST | tRPC（型安全） |
| ORM | SQLAlchemy | Prisma |
| 認証 | Flask-Login | NextAuth.js |
| テスト | pytest | Vitest |

### 機能の比較

| 機能 | redmine-clone | task-app |
|------|--------------|----------|
| 基本機能 | ✅ | ✅ |
| 型安全性 | ❌ | ✅ |
| リアルタイム更新 | ❌ | ✅（準備済み） |
| モバイル対応 | 部分的 | 完全対応 |
| ダークモード | ❌ | ✅（準備済み） |
| グラフ表示 | 簡易 | 高機能（Recharts） |
| 教材の充実度 | 基本 | 大幅に充実 |

### 改善ポイント

1. **型安全性**: TypeScript + tRPCで完全な型安全性
2. **開発体験**: Hot Reload、型補完、厳格なLint
3. **UI/UX**: Material-UIによる統一されたデザイン
4. **パフォーマンス**: Next.js 15の最適化機能
5. **保守性**: モダンなアーキテクチャと設計パターン
6. **教材**: 段階的で詳細な学習コンテンツ

---

## スクリーンショット

### ダッシュボード
```
┌─────────────────────────────────────────────────┐
│ Task-App                         [Admin] [Logout]│
├─────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │総タスク │ │進行中   │ │完了     │ │期限切れ ││
│ │   45    │ │   12    │ │   28    │ │    5    ││
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
│                                                 │
│ ┌────────────────── タスク完了率 ──────────────┐│
│ │    ████████████████░░░░░░░░░░ 62%          ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ ┌──────────── プロジェクト別タスク数 ──────────┐│
│ │     ███████░░░░░░░░░  Project A (15)       ││
│ │     ████████████████░  Project B (22)       ││
│ │     ███░░░░░░░░░░░░░  Project C (8)        ││
│ └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### タスクボード（カンバンビュー）
```
┌─────────────────────────────────────────────────┐
│ Project: Web開発プロジェクト                     │
├────────┬────────┬────────┬────────┬────────────┤
│  TODO  │進行中  │レビュー│  完了  │キャンセル  │
├────────┼────────┼────────┼────────┼────────────┤
│┌──────┐│┌──────┐│┌──────┐│┌──────┐│           │
││タスク1│││タスク4│││タスク7│││タスク9││           │
││[HIGH]│││[URGENT││[MEDIUM││[LOW]  ││           │
││      │││       │││       │││完了済││           │
│└──────┘│└──────┘│└──────┘│└──────┘│           │
│┌──────┐│┌──────┐│        │┌──────┐│           │
││タスク2│││タスク5││        ││タスク10│           │
││[MEDIUM││[HIGH] ││        ││[HIGH] ││           │
│└──────┘│└──────┘│        │└──────┘│           │
└────────┴────────┴────────┴────────┴────────────┘
```

### タスク詳細
```
┌─────────────────────────────────────────────────┐
│ タスク詳細                                       │
├─────────────────────────────────────────────────┤
│ タイトル: ログイン機能の実装                     │
│ ステータス: [進行中] 優先度: [高]               │
│ アサイニー: John Doe                            │
│ 期限: 2025-01-31                                │
│                                                 │
│ 説明:                                           │
│ NextAuthを使用した認証システムを実装する         │
│ - メール/パスワード認証                         │
│ - セッション管理                                │
│ - 保護ルート                                    │
│                                                 │
│ 作業時間: ▶ 2時間30分 [開始/停止]             │
│                                                 │
├─────────── コメント ────────────────────────────┤
│ John Doe  2025-01-07 10:30                      │
│ 認証フローの実装が完了しました                   │
│                                                 │
│ Jane Smith  2025-01-07 11:15                    │
│ テストコードも追加してください                   │
└─────────────────────────────────────────────────┘
```

---

## プロジェクト構造

```
task-app/
├── src/                          # ソースコード
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # 認証グループ
│   │   ├── api/                 # API Routes
│   │   ├── dashboard/           # ダッシュボード
│   │   ├── project/             # プロジェクト
│   │   ├── task/                # タスク
│   │   └── users/               # ユーザー管理
│   ├── components/              # Reactコンポーネント
│   │   ├── layout/              # レイアウト
│   │   ├── project/             # プロジェクト関連
│   │   ├── task/                # タスク関連
│   │   └── user/                # ユーザー関連
│   ├── server/                  # サーバーサイド
│   │   ├── api/                 # tRPCルーター
│   │   ├── auth.ts              # NextAuth設定
│   │   └── db.ts                # Prisma設定
│   ├── lib/                     # ユーティリティ
│   ├── types/                   # 型定義
│   └── hooks/                   # カスタムフック
├── prisma/                      # Prismaスキーマ
│   ├── schema.prisma            # データベーススキーマ
│   └── seed.ts                  # シードデータ
├── material/                    # 教材フォルダ
├── .github/                     # GitHub設定
│   ├── copilot-instructions.md  # Copilot設定
│   └── workflows/               # CI/CD
├── docker/                      # Docker設定
├── CLAUDE.md                    # AI引き継ぎドキュメント
├── DEVELOPMENT.md               # 開発ガイド
├── FEATURES.md                  # 機能詳細
└── README.md                    # このファイル
```

---

## デプロイ

### Vercelへのデプロイ

```bash
# 1. Vercel CLIをインストール
npm install -g vercel

# 2. Vercel Postgresを作成
# https://vercel.com/docs/storage/vercel-postgres

# 3. 環境変数を設定（Vercelダッシュボード）
# - DATABASE_URL: Vercel Postgresの接続文字列
# - NEXTAUTH_SECRET: ランダムな文字列（32文字以上）
# - NEXTAUTH_URL: https://your-app.vercel.app

# 4. デプロイ
vercel deploy --prod
```

### Docker運用

```bash
# プロダクションビルド
docker build -t task-app .

# コンテナ起動
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="..." \
  -e NEXTAUTH_URL="http://localhost:3000" \
  task-app
```

---

## ライセンス

このプロジェクトは教育目的で作成されています。
ライセンス: UNLICENSED

---

## コントリビューション

### コントリビューションガイドライン

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### コミットメッセージ規約

```
<type>: <subject>

<body>
```

**Type一覧**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードスタイル
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: その他

### コード規約

- TypeScript厳格モード準拠
- Biomeリンター・フォーマッター使用
- テストカバレッジ80%以上
- tRPCの型安全性を活用

詳細は [.github/copilot-instructions.md](.github/copilot-instructions.md) を参照してください。

---

## サポート

問題が発生した場合:

1. **ドキュメントを確認**: DEVELOPMENT.md, FEATURES.md
2. **既存のissueを検索**: 同じ問題が報告されていないか確認
3. **新しいissueを作成**: 再現手順を明確に記載

---

## 学習リソース

### 公式ドキュメント

- [Next.js 15](https://nextjs.org/docs)
- [tRPC](https://trpc.io/docs)
- [Prisma](https://www.prisma.io/docs)
- [Material-UI](https://mui.com/material-ui/)
- [NextAuth.js](https://next-auth.js.org/)

### 推奨学習パス

1. TypeScript基礎
2. React基礎
3. Next.js App Router
4. tRPCとEnd-to-End型安全性
5. Prismaとデータベース設計
6. 認証システム（NextAuth）

---

<div align="center">

**Let's build amazing web applications together!**

Made with ❤️ using Next.js 15, TypeScript, and tRPC

[⬆ トップに戻る](#task-app---モダンタスク管理アプリケーション)

</div>
