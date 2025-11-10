# Development Guide - Task-App

このドキュメントは、Task-Appプロジェクトの開発環境構築と開発ワークフローの詳細ガイドです。

---

## 目次

1. [開発環境構築](#開発環境構築)
2. [データベースセットアップ](#データベースセットアップ)
3. [環境変数の設定](#環境変数の設定)
4. [開発ワークフロー](#開発ワークフロー)
5. [テストの実行](#テストの実行)
6. [デバッグ方法](#デバッグ方法)
7. [よくある問題と解決方法](#よくある問題と解決方法)

---

## 開発環境構築

### 前提条件

以下のツールがインストールされていることを確認してください。

| ツール | 推奨バージョン | 確認コマンド |
|--------|--------------|-------------|
| Node.js | 22.0.0以上 | `node --version` |
| npm | 10.0.0以上 | `npm --version` |
| Docker Desktop | 最新版 | `docker --version` |
| Git | 2.30以上 | `git --version` |

### 初回セットアップ

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd task-app

# 2. 依存関係のインストール
npm install

# 3. Dockerコンテナの起動（PostgreSQL）
docker-compose up -d

# 4. 環境変数の設定
cp .env.example .env
# .envファイルを編集（下記の「環境変数の設定」を参照）

# 5. データベースの初期化
npm run db:generate   # Prismaクライアント生成
npm run db:push       # スキーマの反映
npm run db:seed       # サンプルデータの投入

# 6. 開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:3000` を開いて動作確認してください。

### デフォルトユーザー（シードデータ）

| ロール | メールアドレス | パスワード |
|-------|--------------|-----------|
| 管理者 | admin@example.com | Password123! |
| 一般ユーザー | user1@example.com | Password123! |
| 一般ユーザー | user2@example.com | Password123! |

---

## データベースセットアップ

### ローカル開発（Docker）

```bash
# PostgreSQLコンテナの起動
docker-compose up -d

# コンテナの状態確認
docker ps

# コンテナの停止
docker-compose down

# データベースのリセット（注意: データが削除されます）
docker-compose down -v
docker-compose up -d
npm run db:push
npm run db:seed
```

### Prisma Studio（GUIツール）

```bash
# Prisma Studioを起動
npm run db:studio

# ブラウザで http://localhost:5555 が開く
# GUIでデータベースの閲覧・編集が可能
```

### マイグレーション

```bash
# 開発環境でのマイグレーション作成
npm run db:migrate

# マイグレーション名の入力を求められます
# 例: "add_task_timer_feature"

# マイグレーション履歴の確認
npx prisma migrate status

# マイグレーションのロールバック
npx prisma migrate reset
```

### スキーマ変更の流れ

1. `prisma/schema.prisma`を編集
2. マイグレーションを作成: `npm run db:migrate`
3. Prismaクライアントを再生成: `npm run db:generate`
4. TypeScript型定義が自動更新される

---

## 環境変数の設定

### .envファイルの構成

```bash
# Database（PostgreSQL）
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskapp?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-characters-long"

# App
NODE_ENV="development"
```

### 環境別の設定

#### ローカル開発

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskapp?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

#### テスト環境

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskapp_test?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="test"
```

#### 本番環境（Vercel）

```bash
# Vercelダッシュボードで設定
DATABASE_URL="<Vercel Postgresの接続文字列>"
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="<ランダムな長い文字列>"
NODE_ENV="production"
```

### NEXTAUTH_SECRETの生成

```bash
# OpenSSLで生成
openssl rand -base64 32

# Node.jsで生成
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 開発ワークフロー

### 日常的な開発フロー

```bash
# 1. 最新のコードを取得
git pull origin main

# 2. ブランチを作成
git checkout -b feature/task-filter

# 3. 開発サーバーを起動
npm run dev

# 4. コードを編集
# - src/配下のファイルを編集
# - Hot Reloadで自動更新

# 5. リンター・フォーマッターを実行
npm run lint:fix
npm run format

# 6. 型チェック
npm run type-check

# 7. テストを実行
npm run test

# 8. コミット
git add .
git commit -m "feat: タスクフィルター機能を追加"

# 9. プッシュ
git push origin feature/task-filter
```

### コマンド一覧

#### 開発

```bash
npm run dev           # 開発サーバー起動（ポート3000）
npm run build         # プロダクションビルド
npm run start         # プロダクションサーバー起動
```

#### コード品質

```bash
npm run lint          # Biome リント実行
npm run lint:fix      # リント問題を自動修正
npm run format        # コードフォーマット
npm run type-check    # TypeScript型チェック
npm run lint:ci       # CI用リント（厳格モード）
```

#### データベース

```bash
npm run db:generate   # Prismaクライアント生成
npm run db:push       # スキーマをDBに反映（開発用）
npm run db:migrate    # マイグレーション実行（本番用）
npm run db:studio     # Prisma Studio起動
npm run db:seed       # シードデータ投入
```

#### テスト

```bash
npm run test          # テスト実行
npm run test:ui       # テストUIで実行
npm run test:watch    # ウォッチモード
npm run test:coverage # カバレッジレポート
```

---

## テストの実行

### 単体テスト（Vitest）

```bash
# すべてのテストを実行
npm run test

# 特定のファイルのみ
npm run test src/server/api/routers/task.test.ts

# ウォッチモード（ファイル変更を監視）
npm run test:watch

# UI付きで実行
npm run test:ui
```

### カバレッジレポート

```bash
# カバレッジを確認
npm run test -- --coverage

# レポートが coverage/ ディレクトリに生成される
# coverage/index.html をブラウザで開く
```

### テストの書き方

#### APIテスト例

```typescript
// src/server/api/routers/__tests__/task.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createCaller } from '../__testutils__/caller';

describe('Task API', () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    // テスト用のコンテキストを作成
    caller = createCaller({
      session: {
        user: { id: 'test-user', role: 'USER' },
      },
    });
  });

  it('タスクを作成できる', async () => {
    const task = await caller.task.create({
      title: 'テストタスク',
      projectId: 'test-project',
      priority: 'HIGH',
    });

    expect(task.title).toBe('テストタスク');
    expect(task.priority).toBe('HIGH');
  });

  it('タイトルが空の場合はエラー', async () => {
    await expect(
      caller.task.create({
        title: '',
        projectId: 'test-project',
      })
    ).rejects.toThrow();
  });
});
```

#### コンポーネントテスト例

```typescript
// src/components/task/__tests__/TaskCard.test.tsx
import { render, screen } from '@testing-library/react';
import { TaskCard } from '../task-card';

describe('TaskCard', () => {
  it('タスク情報を表示する', () => {
    const task = {
      id: '1',
      title: 'テストタスク',
      status: 'TODO',
      priority: 'HIGH',
    };

    render(<TaskCard task={task} />);

    expect(screen.getByText('テストタスク')).toBeInTheDocument();
    expect(screen.getByText('TODO')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });
});
```

---

## デバッグ方法

### 開発ツール

#### 1. React Query Devtools

tRPCのクエリ状態を可視化

```typescript
// 既に組み込み済み（開発環境のみ）
// ブラウザ右下にアイコンが表示される
```

#### 2. Prisma Studio

データベースの可視化

```bash
npm run db:studio
# http://localhost:5555 で開く
```

#### 3. Chrome DevTools

- **Elements**: DOMの確認
- **Console**: ログの確認
- **Network**: API通信の確認
- **Application**: LocalStorage, Cookies

### ログ出力

#### サーバーサイド

```typescript
// tRPCルーター内
export const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(taskSchema)
    .mutation(async ({ ctx, input }) => {
      // デバッグログ
      console.log('[Task API] Creating task:', input);

      const task = await ctx.db.task.create({
        data: input,
      });

      console.log('[Task API] Task created:', task.id);
      return task;
    }),
});
```

#### クライアントサイド

```typescript
// React コンポーネント内
const createTask = api.task.create.useMutation({
  onMutate: (variables) => {
    console.log('[TaskForm] Mutating:', variables);
  },
  onSuccess: (data) => {
    console.log('[TaskForm] Success:', data);
  },
  onError: (error) => {
    console.error('[TaskForm] Error:', error);
  },
});
```

### ブレークポイント

#### VS Code設定

`.vscode/launch.json`を作成:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

---

## よくある問題と解決方法

### データベース関連

#### 問題: `Prisma Client not found`

```bash
# 解決方法
npm run db:generate
```

#### 問題: `Database connection error`

```bash
# Dockerコンテナの状態を確認
docker ps

# コンテナが起動していない場合
docker-compose up -d

# ポートが使用中の場合
docker-compose down
# 別のアプリでPostgreSQLが動いていないか確認
```

#### 問題: マイグレーションエラー

```bash
# データベースをリセット（注意: データが削除される）
npx prisma migrate reset

# または
docker-compose down -v
docker-compose up -d
npm run db:push
npm run db:seed
```

### ビルド関連

#### 問題: TypeScript型エラー

```bash
# 型チェックを実行
npm run type-check

# Prismaクライアントを再生成
npm run db:generate
```

#### 問題: Biomeリントエラー

```bash
# 自動修正
npm run lint:fix

# フォーマット
npm run format
```

### 認証関連

#### 問題: ログインできない

```bash
# 環境変数を確認
cat .env | grep NEXTAUTH

# NEXTAUTH_SECRETが設定されているか確認
# NEXTAUTH_URLが正しいか確認（http://localhost:3000）

# シードデータを再投入
npm run db:seed
```

#### 問題: セッションが切れる

```typescript
// src/server/auth.tsのsession設定を確認
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 days
},
```

### パフォーマンス関連

#### 問題: 開発サーバーが遅い

```bash
# node_modulesを再インストール
rm -rf node_modules package-lock.json
npm install

# .nextキャッシュをクリア
rm -rf .next

# Dockerメモリを増やす
# Docker Desktop > Settings > Resources > Memory: 4GB以上
```

#### 問題: ビルドが遅い

```bash
# Turbopackを使用（Next.js 15のデフォルト）
npm run dev

# キャッシュをクリア
rm -rf .next
npm run build
```

### その他

#### 問題: ポート3000が使用中

```bash
# 使用中のプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>

# または別のポートを使用
PORT=3001 npm run dev
```

#### 問題: Git hookエラー

```bash
# Huskyを再インストール
npm run prepare

# またはhookをスキップ（推奨しない）
git commit --no-verify
```

---

## トラブルシューティングチェックリスト

問題が発生した場合、以下の順番で確認してください。

- [ ] Node.jsのバージョンが22.0.0以上か
- [ ] npm installを実行したか
- [ ] Dockerコンテナが起動しているか（docker ps）
- [ ] .envファイルが正しく設定されているか
- [ ] Prismaクライアントが生成されているか（npm run db:generate）
- [ ] データベーススキーマが反映されているか（npm run db:push）
- [ ] リンターエラーがないか（npm run lint）
- [ ] 型エラーがないか（npm run type-check）
- [ ] ブラウザのキャッシュをクリアしたか
- [ ] .nextフォルダを削除して再ビルドしたか

---

## 開発のヒント

### パフォーマンスを意識する

- React Query（tRPC）のキャッシュを活用
- useMemo/useCallbackで不要な再レンダリングを防ぐ
- 画像は最適化する（Next.js Imageコンポーネント）

### 型安全性を維持する

- any型を使わない
- zodでバリデーションスキーマを定義
- Prismaの型を活用

### テストを書く

- 新機能追加時は必ずテストを追加
- カバレッジ80%以上を維持
- エッジケースもテストする

### ドキュメントを更新する

- 新機能追加時はFEATURES.mdを更新
- APIが変わった場合はCLAUDE.mdを更新
- コメントは「なぜ」を書く（「何を」はコードから分かる）

---

## サポート

問題が解決しない場合:

1. **既存のissueを検索**: 同じ問題が報告されていないか確認
2. **新しいissueを作成**: 再現手順を明確に記載
3. **ドキュメントを確認**: CLAUDE.md, FEATURES.md, README.md

Happy Coding! 🚀
