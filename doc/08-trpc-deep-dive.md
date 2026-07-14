# Day 08: tRPC深掘り・エラーハンドリングの実装

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **tRPCのエラーハンドリング** | API安定化 | ✅ TRPCError を使い分けられる |
| **ミドルウェアとコンテキスト** | 認証・ロギング | ✅ 中間処理を実装できる |
| **型安全なAPI通信** | フロントエンド開発 | ✅ 型推論でバグを防げる |

## 💼 なぜこれを学ぶのか?

**tRPCは単なるAPI フレームワークではありません**。バックエンドとフロントエンドの型定義を同期化し、手書きのAPI仕様書が不要になります。

- **エラーハンドリング**: ユーザーに対して安全なエラー返却
- **ミドルウェア**: 共通処理(ロギング、ロール確認)を一元化
- **型安全**: フロントで書いたコードがバックエンドに合致することを保証

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | tRPCエラーの種類と使い分け | 2ステップ | 25分 |
| **Part 2** | ミドルウェア・コンテキスト | 2ステップ | 20分 |
| **Part 3** | ロール・ベースアクセス制御 | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: tRPCエラーの種類と使い分け(25分)

#### Step 1.1: TRPCError 基本パターン(所要時間:12分)

**このステップで学ぶこと**: 異なるエラー状況での適切なHTTPステータスコード。

**なぜ必要?**: HTTPステータスコードは、エラーの **性質** を示します。不正な入力か、権限不足か、サーバーエラーかで使い分けます。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/utils/errors.ts
import { TRPCError } from '@trpc/server';

/**
 * tRPC エラーの種類と使い方
 *
 * 1. BAD_REQUEST (400)
 *    → 入力値が不正な場合(型チェック後)
 *    → 例: タスクのタイトルが空
 *
 * 2. UNAUTHORIZED (401)
 *    → ログインしていない
 *    → セッションが無効
 *
 * 3. FORBIDDEN (403)
 *    → ログイン済みだが権限がない
 *    → 例: 他人のタスクを削除しようとした
 *
 * 4. NOT_FOUND (404)
 *    → 対象が見つからない
 *    → 例: IDで指定したタスクが存在しない
 *
 * 5. CONFLICT (409)
 *    → データの衝突
 *    → 例: メールアドレスが既に登録されている
 *
 * 6. INTERNAL_SERVER_ERROR (500)
 *    → サーバー側のプログラムエラー
 *    → 例: DB接続エラー(予期しない)
 */

// 入力値が不正
export function throwBadRequest(message: string): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message,
    // cause は開発時のデバッグ用(本番では非表示)
    cause: new Error(`[BAD_REQUEST] ${message}`),
  });
}

// ログイン必須
export function throwUnauthorized(): never {
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'ログインしてください',
  });
}

// 権限がない
export function throwForbidden(message = '権限がありません'): never {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message,
  });
}

// 見つからない
export function throwNotFound(resource: string): never {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: `${resource} が見つかりません`,
  });
}

// 重複
export function throwConflict(message: string): never {
  throw new TRPCError({
    code: 'CONFLICT',
    message,
  });
}
```

**実際の使用例**:

```typescript
// filepath: src/server/api/routers/task.ts
import { throwBadRequest, throwNotFound, throwForbidden } from '../utils/errors';

export const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, 'タイトルは必須です'),
        description: z.string().optional(),
        projectId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Zoddで型チェック済み、でも追加バリデーション
      if (input.title.length > 100) {
        throwBadRequest('タイトルは100文字以内です');
      }

      // プロジェクトが存在するか確認
      if (input.projectId) {
        const project = await prisma.project.findUnique({
          where: { id: input.projectId },
        });

        if (!project) {
          throwNotFound('プロジェクト');
        }

        // プロジェクトのオーナーのみ追加可
        if (project.ownerId !== ctx.session.userId) {
          throwForbidden('このプロジェクトにタスクを追加する権限がありません');
        }
      }

      const task = await prisma.task.create({
        data: {
          title: input.title,
          description: input.description,
          projectId: input.projectId,
          creatorId: ctx.session.userId,
          status: 'TODO',
          priority: 'MEDIUM',
        },
      });

      return task;
    }),
});
```

---

#### Step 1.2: フロントエンドでのエラー処理(所要時間:13分)

**このステップで学ぶこと**: フロントから受け取ったエラーを、ユーザーにわかりやすく表示。

**なぜ必要?**: バックエンドで適切なエラーコードを返しても、フロントで適切に処理しなければユーザーには役に立ちません。

**コードの仕組み解説**:

```typescript
// filepath: src/components/forms/task-create-form.tsx
'use client';

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { api } from '@/trpc/react';

export function TaskCreateForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
  });
  const [error, setError] = useState<string | null>(null);

  const createTask = api.task.create.useMutation();
  const projects = api.project.list.useQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createTask.mutateAsync(formData);
      // 成功時は別ページにリダイレクト
      window.location.href = '/dashboard/tasks';
    } catch (err) {
      // tRPCエラーをハンドル
      if (err instanceof Error) {
        handleTRPCError(err);
      } else {
        setError('予期しないエラーが発生しました');
      }
    }
  };

  const handleTRPCError = (err: Error) => {
    const message = err.message;

    // エラーコードに基づいてメッセージを表示
    if (message.includes('BAD_REQUEST')) {
      setError('入力値が正しくありません');
    } else if (message.includes('FORBIDDEN')) {
      setError('このアクションを実行する権限がありません');
    } else if (message.includes('NOT_FOUND')) {
      setError('指定したリソースが見つかりません');
    } else {
      setError('エラーが発生しました: ' + message);
    }
  };

  return (
    <Box
      component='form'
      onSubmit={handleSubmit}
      sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}
    >
      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        label='タイトル'
        value={formData.title}
        onChange={(e) =>
          setFormData({ ...formData, title: e.target.value })
        }
        margin='normal'
        disabled={createTask.isPending}
      />

      <TextField
        fullWidth
        label='説明'
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        margin='normal'
        multiline
        rows={4}
        disabled={createTask.isPending}
      />

      <FormControl fullWidth margin='normal'>
        <InputLabel>プロジェクト</InputLabel>
        <Select
          value={formData.projectId}
          onChange={(e) =>
            setFormData({ ...formData, projectId: e.target.value })
          }
          disabled={createTask.isPending || projects.isLoading}
        >
          <MenuItem value=''>なし</MenuItem>
          {projects.data?.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        fullWidth
        variant='contained'
        type='submit'
        sx={{ mt: 3 }}
        disabled={createTask.isPending}
      >
        {createTask.isPending ? <CircularProgress size={24} /> : '作成'}
      </Button>
    </Box>
  );
}
```

---

### Part 2: ミドルウェア・コンテキスト(20分)

#### Step 2.1: tRPCコンテキストを拡張する(所要時間:10分)

**このステップで学ぶこと**: リクエストごとに「現在のユーザー」「ロール」などの情報を自動的に取得。

**なぜ必要?**: 毎回 protectedProcedure でセッション確認してからユーザーを取得するのは冗長です。コンテキストで一元化します。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/trpc.ts
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { InitTRPCContext, TRPCError } from '@trpc/server';

// コンテキストの型定義
export interface Context {
  session?: {
    userId: string;
  };
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ADMIN';
  };
}

/**
 * tRPCを初期化する前に、コンテキスト(リクエスト情報)を構築
 */
export const createTRPCContext = async () => {
  const session = await getSession();

  let user = null;
  if (session) {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  return {
    session,
    user,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create();

export const createTRPCRouter = t.router;

// ✅ public: 認証不要
export const publicProcedure = t.procedure;

// 🔒 protected: セッション必須
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user!, // 型安全性を確保
    },
  });
});

// 👑 admin: ADMIN ロール必須
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  if (ctx.user?.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '管理者のみアクセス可能です',
    });
  }

  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
    },
  });
});
```

**コンテキストの特徴**:
- `createTRPCContext()`: 毎リクエストで実行
- セッション確認 → ユーザー取得
- プロシージャで `ctx.user` として利用可能

---

#### Step 2.2: ロギング・ミドルウェア(所要時間:10分)

**このステップで学ぶこと**: すべてのAPI呼び出しを記録。

**なぜ必要?**: ユーザーが何をしたかを記録することで、問題発生時のデバッグやセキュリティ監視に役立ちます。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/middleware/logger.ts
import { Context } from '../trpc';

export function createLoggerMiddleware() {
  return async (opts: {
    ctx: Context;
    type: 'query' | 'mutation';
    path: string;
    input: unknown;
    rawInput: unknown;
  }) => {
    const start = Date.now();

    console.log(`[${opts.type.toUpperCase()}] ${opts.path}`);
    console.log(`User: ${opts.ctx.user?.id || 'anonymous'}`);
    console.log(`Input:`, opts.input);

    try {
      const result = await opts.next();
      const duration = Date.now() - start;

      console.log(`✓ Success (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;

      console.error(`✗ Error (${duration}ms):`, error);
      throw error;
    }
  };
}

// tRPC 初期化時に追加
const t = initTRPC.context<typeof createTRPCContext>().create({
  isServer: true,
  allowOutsideOfServer: true,
});

export const publicProcedure = t.procedure.use(createLoggerMiddleware());
export const protectedProcedure = t.procedure
  .use(createLoggerMiddleware())
  .use(authMiddleware);
```

**ログ出力例**:
```
[MUTATION] task.create
User: user_123
Input: { title: 'Review PR', projectId: 'proj_456' }
✓ Success (145ms)

[QUERY] task.list
User: user_123
Input: {}
✓ Success (89ms)
```

---

### Part 3: ロール・ベースアクセス制御(15分)

#### Step 3.1: ロールに基づく権限チェック(所要時間:15分)

**このステップで学ぶこと**: ADMIN ロールでのみ実行可能なプロシージャ。

**なぜ必要?**: すべてのユーザーが管理機能(ユーザー削除、システム設定変更など)にアクセスできてはいけません。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/admin.ts
import { adminProcedure, createTRPCRouter } from '../trpc';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const adminRouter = createTRPCRouter({
  // ユーザー管理: 一覧取得
  listUsers: adminProcedure.query(async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }),

  // ユーザー管理: ロール変更
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(['USER', 'ADMIN']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 自分のロール変更を防止
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '自分のロールは変更できません',
        });
      }

      const user = await prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: { id: true, email: true, role: true },
      });

      return user;
    }),

  // システム統計
  getStats: adminProcedure.query(async () => {
    const [totalUsers, totalTasks, totalProjects] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
      prisma.project.count(),
    ]);

    return {
      totalUsers,
      totalTasks,
      totalProjects,
      timestamp: new Date(),
    };
  }),
});
```

**ルーターの統合**:

```typescript
// filepath: src/server/api/root.ts
import { createTRPCRouter } from './trpc';
import { authRouter } from './routers/auth';
import { taskRouter } from './routers/task';
import { projectRouter } from './routers/project';
import { adminRouter } from './routers/admin';

export const appRouter = createTRPCRouter({
  auth: authRouter,
  task: taskRouter,
  project: projectRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. **tRPCエラーハンドリング**
   - [ ] BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND を使い分け
   - [ ] フロントエンドで適切にエラー表示

2. **ミドルウェア・コンテキスト**
   - [ ] createTRPCContext でセッション + ユーザー取得
   - [ ] protectedProcedure, adminProcedure を使い分け

3. **ロール・ベースアクセス制御**
   - [ ] ADMIN ロールのみ実行可能なルーター
   - [ ] ロール確認エラーハンドリング

---

## まとめ

- **TRPCError**: 適切なHTTPステータスコードでエラー返却
- **コンテキスト**: リクエストごとにユーザー情報を取得
- **ミドルウェア**: 共通処理を一元化
- **型安全**: フロントバック双方で型推論可能

次回(Day 9)は、タスク作成・一覧・詳細取得などの具体的なCRUD実装です。
