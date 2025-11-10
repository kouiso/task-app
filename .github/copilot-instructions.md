# Task-App - GitHub Copilot Instructions

## プロジェクトコンテキスト

このプロジェクトは、Next.js 15とTypeScriptで構築されたモダンなタスク管理アプリケーションです。
教材プロジェクトでありながら、プロダクションレベルの品質を目指しています。

### プロジェクトの性質
- **目的**: 教育教材 + 実用アプリケーション
- **ターゲット**: 最新Web開発技術を学ぶ開発者
- **品質基準**: プロダクションレベル（妥協なし）

---

## 技術スタック（絶対遵守）

### コア技術
- **Next.js 15.0.0** - App Router（Pages Router禁止）
- **React 18.3.1** - UIライブラリ
- **TypeScript 5.6.3** - 厳格モード完全対応
- **tRPC v11.6.0** - End-to-End型安全API
- **Prisma 6.16.2** - ORM
- **Material-UI v6.4.8** - UIコンポーネント

### ツール
- **Biome** - リンター/フォーマッター（ESLint/Prettier禁止）
- **Vitest** - テストフレームワーク
- **npm** - パッケージマネージャー（pnpm禁止）

---

## コーディングスタイル

### 1. 条件分岐を最小限に

```typescript
// ❌ 悪い例：ネストした条件分岐
function getTaskStatus(task: Task) {
  if (task) {
    if (task.status) {
      if (task.status === 'DONE') {
        return '完了';
      } else if (task.status === 'IN_PROGRESS') {
        return '進行中';
      }
    }
  }
  return '不明';
}

// ✅ 良い例：早期リターン + マップ
function getTaskStatus(task: Task) {
  if (!task?.status) return '不明';

  const statusMap = {
    DONE: '完了',
    IN_PROGRESS: '進行中',
    TODO: '未着手',
  } as const;

  return statusMap[task.status] ?? '不明';
}
```

### 2. 宣言的なコード

```typescript
// ❌ 悪い例：命令的なループ
const activeTasks = [];
for (const task of tasks) {
  if (task.status !== 'DONE') {
    activeTasks.push(task);
  }
}

// ✅ 良い例：宣言的なフィルター
const activeTasks = tasks.filter(task => task.status !== 'DONE');
```

### 3. 早期リターン

```typescript
// ❌ 悪い例：深いネスト
function processTask(task: Task) {
  if (task) {
    if (task.assignee) {
      if (task.status === 'TODO') {
        // 処理
      }
    }
  }
}

// ✅ 良い例：早期リターン
function processTask(task: Task) {
  if (!task) return;
  if (!task.assignee) return;
  if (task.status !== 'TODO') return;

  // 処理
}
```

### 4. DRY原則（Don't Repeat Yourself）

```typescript
// ❌ 悪い例：重複したコード
function formatUserName(user: User) {
  return user.name ?? 'Unknown';
}

function formatProjectOwner(project: Project) {
  return project.owner.name ?? 'Unknown';
}

// ✅ 良い例：共通関数化
function formatName(name: string | null | undefined): string {
  return name ?? 'Unknown';
}

const userName = formatName(user.name);
const ownerName = formatName(project.owner.name);
```

---

## TypeScript型定義

### 厳格な型定義

```typescript
// ❌ 悪い例：any型の使用
const data: any = await fetchTasks();
const task: any = data[0];

// ✅ 良い例：厳密な型定義
interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: User;
}

const data: Task[] = await api.task.getAll.query();
const task: Task = data[0];
```

### オプショナルチェーン活用

```typescript
// ❌ 悪い例：冗長なnullチェック
if (user && user.profile && user.profile.avatar) {
  return user.profile.avatar;
}

// ✅ 良い例：オプショナルチェーン
return user?.profile?.avatar ?? '/default-avatar.png';
```

### 型ガード

```typescript
// ✅ 型ガードの使用
function isAdmin(user: User): user is User & { role: 'ADMIN' } {
  return user.role === 'ADMIN';
}

// 使用例
if (isAdmin(user)) {
  // ここではuserがADMINであることが保証される
  console.log('管理者ユーザー');
}
```

---

## tRPCベストプラクティス

### 入力バリデーション

```typescript
// ✅ zodによる厳格なバリデーション
import { z } from 'zod';

export const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      title: z.string()
        .min(1, 'タイトルは必須です')
        .max(255, 'タイトルは255文字以内です'),
      description: z.string().optional(),
      projectId: z.string().cuid('無効なプロジェクトIDです'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
      dueDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 型安全な処理
      return ctx.db.task.create({
        data: {
          ...input,
          createdById: ctx.session.user.id,
        },
      });
    }),
});
```

### エラーハンドリング

```typescript
// ✅ tRPCErrorの使用
import { TRPCError } from '@trpc/server';

export const taskRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: { id: input.id },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      return task;
    }),
});
```

### クエリ最適化

```typescript
// ✅ 必要なデータのみ取得
const task = await ctx.db.task.findUnique({
  where: { id: input.id },
  select: {
    id: true,
    title: true,
    status: true,
    assignee: {
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    },
  },
});
```

---

## Prismaベストプラクティス

### リレーション取得

```typescript
// ❌ 悪い例：N+1問題
const tasks = await db.task.findMany();
for (const task of tasks) {
  task.assignee = await db.user.findUnique({ where: { id: task.assigneeId } });
}

// ✅ 良い例：include/selectでまとめて取得
const tasks = await db.task.findMany({
  include: {
    assignee: true,
    project: true,
  },
});
```

### トランザクション

```typescript
// ✅ トランザクションの使用
await db.$transaction(async (tx) => {
  // タスクを完了
  await tx.task.update({
    where: { id: taskId },
    data: {
      status: 'DONE',
      completedAt: new Date(),
    },
  });

  // プロジェクト統計を更新
  await tx.project.update({
    where: { id: projectId },
    data: {
      completedTasksCount: { increment: 1 },
    },
  });
});
```

### ソフトデリート

```typescript
// ✅ ソフトデリートパターン
const project = await db.project.update({
  where: { id: input.id },
  data: { isArchived: true },
});
```

---

## Material-UIの使い方

### テーマの使用

```typescript
// ✅ テーマから色を取得
import { Box } from '@mui/material';

<Box sx={{
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  p: 2,
  borderRadius: 1,
}} />
```

### レスポンシブデザイン

```typescript
// ✅ ブレークポイントを活用
<Box sx={{
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'column', md: 'row' },
  gap: { xs: 1, md: 2 },
  p: { xs: 1, md: 2, lg: 3 },
}} />
```

### コンポーネントの型

```typescript
// ✅ Material-UIの型を活用
import { SxProps, Theme } from '@mui/material';

interface TaskCardProps {
  task: Task;
  sx?: SxProps<Theme>;
  onUpdate?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, sx, onUpdate }) => {
  return <Card sx={sx}>...</Card>;
};
```

---

## Reactコンポーネント設計

### コンポーネントの分割

```typescript
// ✅ 小さく再利用可能なコンポーネント
interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'small' | 'medium' | 'large';
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({
  status,
  size = 'medium'
}) => {
  const colors = {
    TODO: 'default',
    IN_PROGRESS: 'primary',
    DONE: 'success',
  } as const;

  return (
    <Chip
      label={status}
      color={colors[status]}
      size={size}
    />
  );
};
```

### カスタムフック

```typescript
// ✅ ロジックを分離したカスタムフック
export function useTaskFilter(tasks: Task[], filters: TaskFilters) {
  return useMemo(() => {
    return tasks.filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.assigneeId && task.assigneeId !== filters.assigneeId) return false;
      return true;
    });
  }, [tasks, filters]);
}

// 使用例
const filteredTasks = useTaskFilter(tasks, { status: 'IN_PROGRESS' });
```

### サーバーコンポーネント vs クライアントコンポーネント

```typescript
// ✅ サーバーコンポーネント（デフォルト）
// データ取得や計算処理はサーバー側で
export default async function TaskListPage() {
  const tasks = await db.task.findMany();
  return <TaskList tasks={tasks} />;
}

// ✅ クライアントコンポーネント（必要な場合のみ）
// インタラクション、状態管理が必要な場合
'use client';

export function TaskForm() {
  const [title, setTitle] = useState('');
  // ...
}
```

---

## エラーハンドリング

### APIエラー

```typescript
// ✅ tRPCのエラーハンドリング
const createTask = api.task.create.useMutation({
  onSuccess: () => {
    toast.success('タスクを作成しました');
  },
  onError: (error) => {
    if (error.data?.code === 'UNAUTHORIZED') {
      toast.error('ログインが必要です');
      router.push('/login');
    } else {
      toast.error(error.message || 'エラーが発生しました');
    }
  },
});
```

### バリデーションエラー

```typescript
// ✅ zodエラーの表示
import { ZodError } from 'zod';

try {
  const validated = taskSchema.parse(formData);
} catch (error) {
  if (error instanceof ZodError) {
    const errors = error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    setFieldErrors(errors);
  }
}
```

---

## セキュリティガイドライン

### 認証チェック

```typescript
// ✅ protectedProcedureの使用
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});
```

### 権限チェック

```typescript
// ✅ ロールベースの権限チェック
function requireAdmin(ctx: Context) {
  if (ctx.session.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '管理者権限が必要です',
    });
  }
}

// 使用例
export const userRouter = createTRPCRouter({
  deleteUser: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      return ctx.db.user.delete({ where: { id: input.id } });
    }),
});
```

### パスワードハッシュ化

```typescript
// ✅ bcryptjsの使用
import bcrypt from 'bcryptjs';

// パスワードのハッシュ化
const hashedPassword = await bcrypt.hash(password, 10);

// パスワードの検証
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

---

## テスト戦略

### APIテスト

```typescript
// ✅ tRPCルーターのテスト
import { describe, it, expect } from 'vitest';

describe('Task API', () => {
  it('タスクを作成できる', async () => {
    const caller = createCaller(mockContext);

    const task = await caller.task.create({
      title: 'テストタスク',
      projectId: 'test-project-id',
      priority: 'HIGH',
    });

    expect(task.title).toBe('テストタスク');
    expect(task.priority).toBe('HIGH');
  });

  it('無効な入力でエラーが発生する', async () => {
    const caller = createCaller(mockContext);

    await expect(
      caller.task.create({
        title: '', // 空文字は無効
        projectId: 'test-project-id',
      })
    ).rejects.toThrow();
  });
});
```

### コンポーネントテスト

```typescript
// ✅ React Testingライブラリ
import { render, screen, fireEvent } from '@testing-library/react';

describe('TaskCard', () => {
  it('タスク情報を表示する', () => {
    const task = {
      id: '1',
      title: 'テストタスク',
      status: 'TODO',
    };

    render(<TaskCard task={task} />);

    expect(screen.getByText('テストタスク')).toBeInTheDocument();
    expect(screen.getByText('TODO')).toBeInTheDocument();
  });
});
```

---

## パフォーマンス最適化

### React Query最適化

```typescript
// ✅ staleTimeとcacheTimeの設定
const tasks = api.task.getAll.useQuery(undefined, {
  staleTime: 1000 * 60 * 5, // 5分間はフレッシュ
  cacheTime: 1000 * 60 * 30, // 30分間キャッシュ
});
```

### useMemoとuseCallback

```typescript
// ✅ 高コストな計算をメモ化
const sortedTasks = useMemo(() => {
  return tasks.sort((a, b) =>
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );
}, [tasks]);

// ✅ コールバック関数をメモ化
const handleTaskUpdate = useCallback((taskId: string) => {
  updateTask.mutate({ id: taskId });
}, [updateTask]);
```

---

## ファイル・フォルダ構造

### 命名規則

```
✅ 良い例:
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # ルートグループ
│   ├── dashboard/         # 小文字のケバブケース
│   └── my-tasks/
├── components/
│   ├── task/              # 機能別
│   │   ├── TaskCard.tsx   # PascalCase
│   │   ├── TaskList.tsx
│   │   └── TaskForm.tsx
│   └── layout/
├── server/
│   └── api/
│       └── routers/       # 複数形
└── types/
    ├── task.ts           # 単数形
    └── project.ts
```

### インポート順序

```typescript
// ✅ 良い例：インポートの順序
// 1. React/Next.js
import { useState } from 'react';
import Link from 'next/link';

// 2. 外部ライブラリ
import { z } from 'zod';
import { Box, Card } from '@mui/material';

// 3. 内部モジュール（絶対パス）
import { api } from '@/lib/api';
import { TaskCard } from '@/components/task/task-card';

// 4. 型定義
import type { Task } from '@/types/task';
```

---

## 禁止事項（アンチパターン）

### ❌ 絶対に避けること

1. **any型の使用**
```typescript
// ❌ 禁止
const data: any = await fetchData();

// ✅ 正しい
const data: Task[] = await api.task.getAll.query();
```

2. **console.log の残留**
```typescript
// ❌ 禁止（デバッグ後は削除）
console.log(task);

// ✅ 開発時のみ
if (process.env.NODE_ENV === 'development') {
  console.log('Debug:', task);
}
```

3. **ESLint/Prettierの使用**
```json
// ❌ 禁止
"eslint": "^8.0.0",
"prettier": "^3.0.0"

// ✅ Biomeを使用
"@biomejs/biome": "^1.9.4"
```

4. **Pages Routerパターン**
```
// ❌ 禁止
pages/
├── index.tsx
└── about.tsx

// ✅ App Router使用
app/
├── page.tsx
└── about/
    └── page.tsx
```

---

## コミットメッセージ

### 形式

```
<type>: <subject>

<body>
```

### Type一覧

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードスタイル（フォーマット）
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルドプロセス、ツール変更

### 例

```
feat: タスクのドラッグ&ドロップ機能を追加

- React DnDライブラリを導入
- タスクの並び替えAPIを実装
- UI/UXを改善
```

---

## 成功指標

### コード品質
- ✅ TypeScript厳格モード エラーゼロ
- ✅ Biomeリンター エラー/警告ゼロ
- ✅ テストカバレッジ 80%以上
- ✅ ビルド成功

### パフォーマンス
- ✅ Lighthouse スコア 90以上
- ✅ First Contentful Paint < 1.8s
- ✅ Time to Interactive < 3.8s

### セキュリティ
- ✅ 脆弱性ゼロ（npm audit）
- ✅ 認証・認可の完全実装
- ✅ XSS/CSRF対策完了

---

このプロジェクトは教材でありながら、プロダクションレベルの品質を維持します。
妥協せず、最高のコードを書きましょう。
