
---

## プロジェクト概要

### プロジェクト名
**Task-App** - モダンタスク管理アプリケーション教材

### 目的
redmine-clone（Flask/Python実装）の完全リプレイス版として、最新のNext.js 15とTypeScriptで再実装したタスク管理アプリケーション。単なるサンプルではなく、実際に使えるプロダクションレベルの品質を持つ教材プロジェクト。

### 重要な位置付け
- **redmine-cloneとの関係**: redmine-cloneはFlask/Python版の教材として存在
- **task-appの役割**: 同じ機能をより充実した内容で、最新技術スタックで提供
- **教材としての価値**: 2024-2025年の最新Web開発技術を学べる実践教材

---

## 技術スタック（変更禁止）

### フロントエンド
- **Next.js 15.0.0** - App Router必須（Pages Router禁止）
- **React 18.3.1** - UIライブラリ
- **TypeScript 5.6.3** - 厳格モード完全対応
- **Material-UI v6.4.8** - UIコンポーネントライブラリ
- **@emotion/react + @emotion/styled** - CSS-in-JS

### バックエンド
- **tRPC v11.6.0** - End-to-End型安全API
- **Prisma 6.16.2** - TypeScript ORM
- **PostgreSQL** - データベース
- **NextAuth v4.24.11** - 認証システム
- **bcryptjs** - パスワードハッシュ化

### 開発ツール
- **Biome 1.9.4** - リンター・フォーマッター（ESLint/Prettier禁止）
- **Vitest 3.0.9** - テストフレームワーク
- **Husky + lint-staged** - Git hooks
- **Turbopack** - 高速バンドラー（Next.js内蔵）

### データ可視化・UI拡張
- **Recharts 3.2.1** - グラフ・チャートライブラリ
- **MUI X Data Grid** - 高機能データテーブル
- **MUI X Date Pickers** - 日付ピッカー
- **react-hook-form + zod** - フォームバリデーション

---

## データベーススキーマ

### テーブル構成

#### User（ユーザー）
```prisma
- id: String (cuid)
- email: String (unique)
- name: String?
- password: String?
- role: UserRole (USER, ADMIN)
- isActive: Boolean
- createdAt, updatedAt: DateTime

Relations:
- createdTasks: Task[] (作成したタスク)
- assignedTasks: Task[] (アサインされたタスク)
- projects: ProjectMember[] (参加プロジェクト)
- comments: Comment[] (コメント)
```

#### Project（プロジェクト）
```prisma
- id: String (cuid)
- name: String
- description: String?
- color: String (default: "#1976d2")
- isArchived: Boolean
- startDate, endDate: DateTime?
- createdAt, updatedAt: DateTime

Relations:
- tasks: Task[] (タスク)
- members: ProjectMember[] (メンバー)
```

#### ProjectMember（プロジェクトメンバー）
```prisma
- id: String (cuid)
- role: ProjectMemberRole (OWNER, ADMIN, MEMBER, VIEWER)
- joinedAt: DateTime
- userId: String
- projectId: String

Relations:
- user: User
- project: Project
```

#### Task（タスク）
```prisma
- id: String (cuid)
- title: String
- description: String?
- status: TaskStatus (TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED, BLOCKED)
- priority: TaskPriority (LOW, MEDIUM, HIGH, URGENT)
- dueDate: DateTime?
- completedAt: DateTime?
- estimatedHours: Float?
- actualHours: Float
- timeSpentMinutes: Float
- isTimerActive: Boolean
- timerStartedAt: DateTime?
- position: Int (並び順)
- createdAt, updatedAt: DateTime

Relations:
- project: Project
- createdBy: User
- assignee: User?
- comments: Comment[]
```

#### Comment（コメント）
```prisma
- id: String (cuid)
- content: String
- createdAt, updatedAt: DateTime

Relations:
- task: Task
- user: User
```

---

## 実装済み機能リスト

### 認証システム
- ✅ メール/パスワード認証（NextAuth.js）
- ✅ ユーザー登録
- ✅ ログイン/ログアウト
- ✅ セッション管理
- ✅ パスワードハッシュ化（bcryptjs）
- ✅ 保護されたルート（認証必須ページ）

### ユーザー管理
- ✅ ユーザーCRUD
- ✅ プロフィール編集
- ✅ ロール管理（USER, ADMIN）
- ✅ ユーザーリスト表示
- ✅ ユーザー検索

### プロジェクト管理
- ✅ プロジェクトCRUD
- ✅ プロジェクトメンバー管理
- ✅ メンバーロール管理（OWNER, ADMIN, MEMBER, VIEWER）
- ✅ プロジェクトアーカイブ
- ✅ プロジェクト色設定
- ✅ 期間設定（開始日・終了日）

### タスク管理
- ✅ タスクCRUD
- ✅ タスクステータス管理（6段階）
- ✅ タスク優先度設定（4段階）
- ✅ タスク期限管理
- ✅ タスクアサイン
- ✅ タスク並び替え（ドラッグ&ドロップ対応可能）
- ✅ タスク時間管理（見積時間・実績時間）
- ✅ タイマー機能（作業時間計測）
- ✅ 個人タスクビュー（My Tasks）

### コメント機能
- ✅ タスクへのコメント投稿
- ✅ コメント編集・削除
- ✅ コメント履歴表示
- ✅ コメント投稿者情報表示

### 検索機能
- ✅ 全文検索（タスク・プロジェクト）
- ✅ 複合検索（タイトル・説明文）
- ✅ ステータス・優先度フィルター
- ✅ 検索結果のソート

### レポート機能
- ✅ ダッシュボード（統計情報）
- ✅ タスク完了率
- ✅ プロジェクト別集計
- ✅ ユーザー別タスク統計
- ✅ 週次レポート
- ✅ グラフ表示（Recharts使用）

### UI/UX
- ✅ レスポンシブデザイン（モバイル対応）
- ✅ Material-UI統一デザイン
- ✅ ダークモード対応準備済み
- ✅ ローディング状態表示
- ✅ エラーハンドリング
- ✅ トースト通知（react-hot-toast）

---

## プロジェクト構造

```
task-app/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # 認証グループ
│   │   │   ├── login/           # ログインページ
│   │   │   └── register/        # 登録ページ
│   │   ├── about/               # Aboutページ
│   │   ├── api/                 # API Routes
│   │   │   └── trpc/[trpc]/     # tRPCエンドポイント
│   │   ├── dashboard/           # ダッシュボード
│   │   ├── help/                # ヘルプページ
│   │   ├── my-tasks/            # 個人タスクビュー
│   │   ├── profile/             # プロフィール
│   │   ├── project/             # プロジェクト一覧
│   │   ├── report/              # レポート
│   │   │   └── weekly/          # 週次レポート
│   │   ├── search/              # 検索
│   │   ├── task/                # タスク管理
│   │   ├── users/               # ユーザー管理
│   │   ├── layout.tsx           # ルートレイアウト
│   │   ├── page.tsx             # トップページ
│   │   └── providers.tsx        # グローバルプロバイダー
│   ├── components/              # 再利用可能コンポーネント
│   │   ├── layout/              # レイアウトコンポーネント
│   │   ├── project/             # プロジェクト関連
│   │   ├── task/                # タスク関連
│   │   └── user/                # ユーザー関連
│   ├── server/                  # サーバーサイドロジック
│   │   ├── api/
│   │   │   ├── routers/         # tRPCルーター
│   │   │   │   ├── auth.ts      # 認証API
│   │   │   │   ├── comment.ts   # コメントAPI
│   │   │   │   ├── project.ts   # プロジェクトAPI
│   │   │   │   ├── report.ts    # レポートAPI
│   │   │   │   ├── search.ts    # 検索API
│   │   │   │   ├── task.ts      # タスクAPI
│   │   │   │   └── user.ts      # ユーザーAPI
│   │   │   ├── root.ts          # ルートルーター
│   │   │   └── trpc.ts          # tRPC設定
│   │   ├── auth.ts              # NextAuth設定
│   │   └── db.ts                # Prismaクライアント
│   ├── lib/                     # ユーティリティ
│   ├── hooks/                   # カスタムフック
│   ├── types/                   # 型定義
│   │   ├── comment.ts
│   │   ├── project.ts
│   │   ├── task.ts
│   │   └── user.ts
│   ├── trpc/                    # tRPCクライアント設定
│   └── styles/                  # グローバルスタイル
├── prisma/
│   ├── schema.prisma            # Prismaスキーマ
│   └── seed.ts                  # シードデータ
├── material/                    # 教材フォルダ（重要）
│   ├── dev-guide.md
│   ├── onboarding.md
│   ├── pr-reviewer-rule.md
│   └── slides/
│       └── day05_comments.md
├── .github/
│   ├── copilot-instructions.md  # Copilot設定
│   └── workflows/               # CI/CDワークフロー
├── docker/                      # Docker設定
├── scripts/                     # ユーティリティスクリプト
├── .env.example                 # 環境変数サンプル
├── docker-compose.yml           # Docker Compose設定
├── package.json                 # 依存関係
├── tsconfig.json                # TypeScript設定
├── biome.json                   # Biome設定
├── vitest.config.ts             # Vitest設定
└── next.config.mjs              # Next.js設定
```

---

## 開発環境セットアップ

### 前提条件
- Node.js 22.0.0以上
- npm（pnpm禁止）
- Docker Desktop（PostgreSQL用）
- Git

### セットアップ手順

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
# .envファイルを編集（必要に応じて）

# 5. データベースをセットアップ
npm run db:generate   # Prismaクライアント生成
npm run db:push       # スキーマをDBに反映
npm run db:seed       # シードデータ投入

# 6. 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:3000 を開く
```

### 環境変数（.env）

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskapp?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"

# App
NODE_ENV="development"
```

---

## 重要なルールと制約

### 絶対遵守事項（変更禁止）

1. **技術スタック**: 記載された技術のみ使用。勝手な変更禁止
2. **Biome使用**: ESLint/Prettier禁止
3. **App Router**: Pages Router禁止
4. **npm使用**: pnpm禁止
5. **TypeScript厳格モード**: 必ず有効化
6. **教材配置**: `./material/`フォルダのみ

### コーディング原則

#### 条件分岐を減らす
```typescript
// ❌ 悪い例：複雑なif文
if (user) {
  if (user.role === 'ADMIN') {
    if (user.isActive) {
      // 処理
    }
  }
}

// ✅ 良い例：早期リターン
if (!user || user.role !== 'ADMIN' || !user.isActive) return null;
// 処理
```

#### 宣言的なコード
```typescript
// ❌ 悪い例：命令的
const activeUsers = [];
for (const user of users) {
  if (user.isActive) {
    activeUsers.push(user);
  }
}

// ✅ 良い例：宣言的
const activeUsers = users.filter(user => user.isActive);
```

#### 型安全性を最大限活用
```typescript
// ❌ 悪い例：any型
const data: any = await fetch('/api/tasks');

// ✅ 良い例：厳密な型
const data: Task[] = await api.task.getAll.query();
```

### tRPC/Prismaベストプラクティス

#### 入力バリデーション
```typescript
// ✅ zodで厳格なバリデーション
export const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1, "タイトルは必須").max(255),
      description: z.string().optional(),
      projectId: z.string().cuid(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
      dueDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // バリデーション済みの型安全な入力
    }),
});
```

#### エラーハンドリング
```typescript
// ✅ tRPCエラーを使用
import { TRPCError } from '@trpc/server';

if (!project) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'プロジェクトが見つかりません',
  });
}
```

### Material-UIの使い方

#### テーマの使用
```typescript
// ✅ テーマから色を取得
<Box sx={{
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
}} />
```

#### レスポンシブデザイン
```typescript
// ✅ ブレークポイントを活用
<Box sx={{
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  gap: { xs: 1, md: 2 },
}} />
```

### セキュリティガイドライン

1. **認証チェック**: 全ての保護ルートで認証確認
2. **パスワードハッシュ化**: bcryptjsで必ずハッシュ化
3. **SQLインジェクション対策**: Prismaの型安全クエリ使用
4. **XSS対策**: Reactの自動エスケープに依存
5. **CSRF対策**: NextAuthのビルトイン機能

---

## デプロイ方法

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
docker run -p 3000:3000 task-app
```

---

## トラブルシューティング

### よくある問題と解決法

#### 1. Prismaエラー
```bash
# エラー: Prisma Client not found
npm run db:generate

# エラー: Database not ready
docker-compose restart
```

#### 2. ビルドエラー
```bash
# 型エラーをチェック
npm run type-check

# リントエラーを修正
npm run lint:fix
```

#### 3. 認証エラー
```bash
# .envファイルを確認
# NEXTAUTH_SECRET が設定されているか確認
```

#### 4. データベース接続エラー
```bash
# Dockerコンテナが起動しているか確認
docker ps

# ログを確認
docker-compose logs postgres
```

---

## テスト実行

### 単体テスト
```bash
# すべてのテストを実行
npm run test

# UIモードで実行
npm run test:ui

# カバレッジ確認
npm run test -- --coverage
```

### テスト例
```typescript
// API テスト例
describe('Task API', () => {
  it('タスクを作成できる', async () => {
    const result = await caller.task.create({
      title: 'テストタスク',
      projectId: project.id,
      priority: 'HIGH',
    });

    expect(result.title).toBe('テストタスク');
    expect(result.priority).toBe('HIGH');
  });
});
```

---

## 今後の拡張予定

### 未実装機能（優先度順）

1. **通知システム** - リアルタイム通知
2. **ファイル添付** - タスクへのファイル添付
3. **カレンダービュー** - タスクのカレンダー表示
4. **ガントチャート** - プロジェクト進捗の可視化
5. **APIレート制限** - セキュリティ強化
6. **データエクスポート** - CSV/PDF出力
7. **多言語対応** - i18n実装
8. **PWA対応** - オフライン機能

---

## AIへの指示（継続作業時）

### 作業の進め方

1. **現状把握**（30分）
   - プロジェクト構造の確認
   - 実装済み機能の動作確認
   - 未実装機能のリストアップ

2. **優先度付け**（15分）
   - 機能実装の優先順位決定
   - リソース配分の最適化

3. **実装開始**（継続）
   - 最高優先度から順次実装
   - 各機能完成後のテスト実行
   - ドキュメントへの反映

### 必ず守ること

- ✅ TypeScript厳格モード完全対応
- ✅ Biomeリンターエラーゼロ
- ✅ テストカバレッジ80%以上維持
- ✅ tRPCの型安全性を活用
- ✅ Material-UIの一貫性維持
- ✅ セキュリティベストプラクティス遵守

### 質問があれば

疑問や不明点があれば、遠慮なく質問してください。
このプロジェクトの成功が最優先です。

---

**最終更新日: 2025-01-07**
**プロジェクト状態: 本番運用可能**
**次のマイルストーン: 通知システム実装**
