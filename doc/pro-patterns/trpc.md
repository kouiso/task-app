# tRPC Pro Patterns

- target version: `@trpc/server` / `@trpc/react-query` `11.6.0`
- last updated: `2026-04-19`
- purpose: `30日カリキュラム Before/After セクションで使う Pro パターン参照資料`

`task-app` では [`src/server/api/trpc.ts`](/Users/kouiso/ghq/kouiso/task-app/src/server/api/trpc.ts:1) で `publicProcedure` / `protectedProcedure` / `adminProcedure` を分離し、[`src/trpc/react.tsx`](/Users/kouiso/ghq/kouiso/task-app/src/trpc/react.tsx:1) で React Query 連携をまとめている。以下はその現在地を土台に、Phase 0-E の教材で「最初からこう書く」ための Pro パターン集。

## Pattern 1: `useEffect + fetch` ではなく `useQuery` を入口にする

手元の状態管理を増やすより、サーバー状態は tRPC の query に寄せる。`task-app` でも [`src/app/task/page.tsx`](/Users/kouiso/ghq/kouiso/task-app/src/app/task/page.tsx:55) や [`src/component/task/task-detail-dialog.tsx`](/Users/kouiso/ghq/kouiso/task-app/src/component/task/task-detail-dialog.tsx:61) がこの形。

### Before
```tsx
'use client';

import { useEffect, useState } from 'react';

type Task = {
  id: string;
  title: string;
};

export default function TaskListPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      const response = await fetch('/api/trpc/task.getAll');
      const json = await response.json();
      setTasks(json.result.data);
      setIsLoading(false);
    }

    loadTasks();
  }, []);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```

### After
```tsx
'use client';

import { api } from '@/trpc/react';

export default function TaskListPage() {
  const { data: tasks, isLoading } = api.task.getAll.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <ul>
      {(tasks ?? []).map((task) => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```

### Why
- 入出力の型が router からそのまま伝播し、`Task` 型の二重定義を減らせる。
- `loading` / `error` / `cache` を React Query 側に集約でき、状態の散在を防げる。
- 同一 query の再利用時にキャッシュが効くため、画面間遷移時の体感速度が上がる。

**該当Day**: Day 13, Day 17

## Pattern 2: 更新後は `useUtils().setData()` で楽観更新する

`task-app` の現状は `invalidate()` 中心だが、Day 16 や Day 28 のように即時反映が気持ちよさに直結する画面では、mutation 成功前に cache を更新すると操作感がよい。

### Before
```tsx
'use client';

import { api } from '@/trpc/react';

export function TaskStatusToggle({ taskId }: { taskId: string }) {
  const utils = api.useUtils();
  const updateTask = api.task.update.useMutation({
    onSuccess: async () => {
      await utils.task.getAll.invalidate();
      await utils.task.getById.invalidate({ id: taskId });
    },
  });

  return (
    <button
      onClick={() => {
        updateTask.mutate({
          id: taskId,
          status: 'DONE',
        });
      }}
    >
      完了にする
    </button>
  );
}
```

### After
```tsx
'use client';

import { api } from '@/trpc/react';

export function TaskStatusToggle({ taskId }: { taskId: string }) {
  const utils = api.useUtils();
  const updateTask = api.task.update.useMutation({
    onMutate: async () => {
      await utils.task.getAll.cancel();
      const previous = utils.task.getAll.getData();

      utils.task.getAll.setData(undefined, (current) => {
        if (!current) {
          return current;
        }

        return current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: 'DONE',
              }
            : task,
        );
      });

      return { previous };
    },
    onError: (_error, _input, context) => {
      utils.task.getAll.setData(undefined, context?.previous);
    },
    onSuccess: async () => {
      await utils.task.getById.invalidate({ id: taskId });
    },
  });

  return (
    <button
      onClick={() => {
        updateTask.mutate({
          id: taskId,
          status: 'DONE',
        });
      }}
    >
      完了にする
    </button>
  );
}
```

### Why
- 一覧の再取得待ちをなくし、ボタン押下直後に UI を更新できる。
- rollback 用の前回値を `onMutate` で持てるため、失敗時も整合性を戻しやすい。
- `setData()` は対象 query の型を保持するので、更新漏れをコンパイル時に見つけやすい。

**該当Day**: Day 16, Day 28

## Pattern 3: `protectedProcedure` を基底 Procedure として連鎖させる

`task-app` は [`src/server/api/trpc.ts`](/Users/kouiso/ghq/kouiso/task-app/src/server/api/trpc.ts:70) で `protectedProcedure` と `adminProcedure` を分けている。Day 05-08 と Day 24-29 ではこの基底設計が効く。

### Before
```ts
import { TRPCError, initTRPC } from '@trpc/server';

const t = initTRPC.create();

export const appRouter = t.router({
  getCurrentUser: t.procedure.query(({ ctx }) => {
    if (!ctx.session?.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'ログインが必要です',
      });
    }

    return {
      id: ctx.session.userId,
    };
  }),
  getAllUsers: t.procedure.query(({ ctx }) => {
    if (!ctx.session?.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'ログインが必要です',
      });
    }

    if (ctx.session.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: '管理者権限が必要です',
      });
    }

    return [];
  }),
});
```

### After
```ts
import { TRPCError, initTRPC } from '@trpc/server';

type Context = {
  session: {
    userId?: string;
    role?: 'USER' | 'ADMIN';
  } | null;
};

const t = initTRPC.context<Context>().create();

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'ログインが必要です',
    });
  }

  return next({
    ctx: {
      session: {
        userId: ctx.session.userId,
        role: ctx.session.role ?? 'USER',
      },
    },
  });
});

const isAdmin = t.middleware(({ ctx, next }) => {
  if (ctx.session.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '管理者権限が必要です',
    });
  }

  return next({ ctx });
});

const protectedProcedure = t.procedure.use(isAuthenticated);
const adminProcedure = t.procedure.use(isAuthenticated).use(isAdmin);

export const appRouter = t.router({
  getCurrentUser: protectedProcedure.query(({ ctx }) => {
    return {
      id: ctx.session.userId,
    };
  }),
  getAllUsers: adminProcedure.query(() => {
    return [];
  }),
});
```

### Why
- 認証・認可を procedure 定義に寄せると、router ごとのコピペ分岐が減る。
- middleware を通過した後の `ctx.session` を強い型で扱える。
- 権限ルールの変更が 1 箇所に集まり、管理画面追加時の保守コストが低い。

**該当Day**: Day 05, Day 24, Day 29

## Pattern 4: 入力バリデーションは router の `.input(zod)` に寄せる

[`src/server/api/routers/task.ts`](/Users/kouiso/ghq/kouiso/task-app/src/server/api/routers/task.ts:16) や [`src/server/api/routers/project.ts`](/Users/kouiso/ghq/kouiso/task-app/src/server/api/routers/project.ts:10) と同じ考え方。画面の form 検証と API の境界検証は分けて考える。

### Before
```ts
import { initTRPC, TRPCError } from '@trpc/server';

const t = initTRPC.create();

export const taskRouter = t.router({
  create: t.procedure
    .input((value) => value)
    .mutation(({ input }) => {
      if (!input) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '入力が不正です',
        });
      }

      return {
        title: String(input.title),
      };
    }),
});
```

### After
```ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

const taskCreateSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  projectId: z.string().cuid(),
  dueDate: z.string().datetime().optional(),
});

export const taskRouter = t.router({
  create: t.procedure.input(taskCreateSchema).mutation(({ input }) => {
    return {
      title: input.title,
      projectId: input.projectId,
      dueDate: input.dueDate ?? null,
    };
  }),
});
```

### Why
- parse 後の `input` がそのまま安全な型になるので、mutation 本体は業務ロジックに集中できる。
- `errorFormatter` と組み合わせると Zod エラーをフォームへ返しやすい。
- scaffold-first で作る教材でも「まず schema を書く」流れを固定しやすい。

**該当Day**: Day 10, Day 14, Day 18

## Pattern 5: 例外は `TRPCError` に正規化してクライアントまで運ぶ

[`src/server/api/trpc.ts`](/Users/kouiso/ghq/kouiso/task-app/src/server/api/trpc.ts:15) の `errorFormatter` とセットで使う。単なる `Error` より、コード付きで返した方が画面の分岐を組みやすい。

### Before
```ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const projectRouter = t.router({
  getById: t.procedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const project = null;

      if (!project) {
        throw new Error('プロジェクトが見つかりません');
      }

      return project;
    }),
});
```

### After
```ts
import { TRPCError, initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const projectRouter = t.router({
  getById: t.procedure
    .input(z.object({ id: z.string().cuid() }))
    .query(({ input }) => {
      const project = null;

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `プロジェクト ${input.id} は存在しません`,
        });
      }

      return project;
    }),
});
```

### Why
- `NOT_FOUND` / `FORBIDDEN` / `UNAUTHORIZED` の差がクライアントに伝わり、UI 分岐を明確にできる。
- サーバーログでの原因追跡がしやすく、予期しない 500 と業務上の失敗を分離できる。
- ドメインエラーを transport 層の契約として扱えるため、router の振る舞いが読みやすい。

**該当Day**: Day 11, Day 19, Day 26

## Pattern 6: router は機能ごとに分割し、`root.ts` で合成する

`task-app` は [`src/server/api/root.ts`](/Users/kouiso/ghq/kouiso/task-app/src/server/api/root.ts:1) で `auth` / `task` / `project` / `comment` / `search` / `report` を集約している。この切り方は教材でも再現しやすい。

### Before
```ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const appRouter = t.router({
  login: t.procedure.input(z.object({ email: z.string().email() })).mutation(() => true),
  getProjects: t.procedure.query(() => []),
  createTask: t.procedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(() => ({ id: 'task_1' })),
  createComment: t.procedure
    .input(z.object({ taskId: z.string(), content: z.string().min(1) }))
    .mutation(() => ({ id: 'comment_1' })),
});
```

### After
```ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

const authRouter = t.router({
  login: t.procedure.input(z.object({ email: z.string().email() })).mutation(() => true),
});

const projectRouter = t.router({
  getAll: t.procedure.query(() => []),
});

const taskRouter = t.router({
  create: t.procedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(() => ({ id: 'task_1' })),
});

const commentRouter = t.router({
  create: t.procedure
    .input(z.object({ taskId: z.string(), content: z.string().min(1) }))
    .mutation(() => ({ id: 'comment_1' })),
});

export const appRouter = t.router({
  auth: authRouter,
  project: projectRouter,
  task: taskRouter,
  comment: commentRouter,
});
```

### Why
- 1 router 1 機能グループに揃えると、Day ごとの教材粒度とコード構造が一致する。
- 差分レビューがしやすく、機能追加時の衝突が減る。
- client 側でも `api.task.create` のように名前空間が安定し、探索しやすい。

**該当Day**: Day 09, Day 13, Day 20

## Pattern 7: mutation 後の整合性は `useUtils().invalidate()` を入口にする

[`src/app/project/page.tsx`](/Users/kouiso/ghq/kouiso/task-app/src/app/project/page.tsx:80) や [`src/app/task/page.tsx`](/Users/kouiso/ghq/kouiso/task-app/src/app/task/page.tsx:69) の基本形。まずは正しく invalidate し、必要な箇所だけ楽観更新へ進む。

### Before
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/trpc/react';

export function ProjectCreateButton() {
  const router = useRouter();
  const createProject = api.project.create.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  return (
    <button
      onClick={() => {
        createProject.mutate({
          name: '新規プロジェクト',
          color: '#1976d2',
        });
      }}
    >
      作成
    </button>
  );
}
```

### After
```tsx
'use client';

import { api } from '@/trpc/react';

export function ProjectCreateButton() {
  const utils = api.useUtils();
  const createProject = api.project.create.useMutation({
    onSuccess: async () => {
      await utils.project.getAll.invalidate();
    },
  });

  return (
    <button
      onClick={() => {
        createProject.mutate({
          name: '新規プロジェクト',
          color: '#1976d2',
        });
      }}
    >
      作成
    </button>
  );
}
```

### Why
- `router.refresh()` より query 単位で再取得範囲を絞れ、無駄な再描画を減らせる。
- mutation と cache 更新責務を同じ場所に置けるため、画面ごとの更新漏れを追いやすい。
- `task.getById.invalidate({ id })` のような入力付き invalidate が書ける。

**該当Day**: Day 10, Day 15, Day 27

## 適用マトリクス

| Pattern | Day |
|---|---|
| `useQuery` を入口にする | Day 13, Day 17 |
| `setData()` で楽観更新する | Day 16, Day 28 |
| `protectedProcedure` を連鎖させる | Day 05, Day 24, Day 29 |
| `.input(zod)` に寄せる | Day 10, Day 14, Day 18 |
| `TRPCError` に正規化する | Day 11, Day 19, Day 26 |
| router を機能ごとに分割する | Day 09, Day 13, Day 20 |
| `useUtils().invalidate()` を使う | Day 10, Day 15, Day 27 |
