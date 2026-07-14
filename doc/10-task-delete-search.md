# Day 10: タスク削除・検索・フィルタリング機能

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **タスク削除を安全に実装** | CRUD完成 | ✅ 権限チェック後に削除できる |
| **検索・フィルタリング機能** | 大量データ処理 | ✅ where句で複雑な条件検索できる |
| **ページネーション** | パフォーマンス | ✅ take/skipで無限スクロール対応できる |

## 💼 なぜこれを学ぶのか?

**タスク数が増えると、すべてを一度に取得するのは非効率です**。検索・フィルタリング・ページネーションで、ユーザーが必要なデータだけを効率的に取得します。

- **削除**: soft delete で履歴を保持するか、hard delete するか
- **検索**: title や description から検索
- **フィルタリング**: priority, status, assignee で絞り込み
- **ページネーション**: 100件ずつ取得、スクロールで次ページ取得

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | タスク削除API | 1ステップ | 10分 |
| **Part 2** | 検索・フィルタリング | 2ステップ | 30分 |
| **Part 3** | ページネーション実装 | 2ステップ | 20分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: タスク削除API(10分)

#### Step 1.1: タスク削除mutation(所要時間:10分)

**このステップで学ぶこと**: 権限チェック + 削除処理。

**なぜ必要?**: 他人のタスクを削除させてはいけません。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, createTRPCRouter } from '../trpc';
import { z } from 'zod';

export const taskRouter = createTRPCRouter({
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. タスク存在確認
      const task = await prisma.task.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          creatorId: true,
          assigneeId: true,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      // 2. 権限確認: 作成者のみ削除可
      // (割り当て先ユーザーは削除不可)
      if (task.creatorId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'このタスクを削除する権限がありません',
        });
      }

      // 3. 関連コメントを削除(カスケード削除)
      await prisma.comment.deleteMany({
        where: { taskId: input.id },
      });

      // 4. タスクを削除
      const deletedTask = await prisma.task.delete({
        where: { id: input.id },
      });

      console.log(`[AUDIT] Task deleted: ${input.id} by ${ctx.user.id}`);

      return {
        success: true,
        message: 'タスクを削除しました',
      };
    }),
});
```

**削除パターン**:

```
Hard Delete(今回): DELETE FROM tasks WHERE id = xxx
                   関連データも自動削除

Soft Delete(別方法): UPDATE tasks SET deletedAt = NOW() WHERE id = xxx
                     データは保持しつつ、論理的には削除
```

---

### Part 2: 検索・フィルタリング(30分)

#### Step 2.1: 検索スキーマの定義(所要時間:12分)

**このステップで学ぶこと**: Zod で複雑なフィルタ条件を定義。

**なぜ必要?**: 検索条件を型安全に管理。オプションなフィルタは部分指定可能にします。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/schemas/task.ts
export const listTasksFilterSchema = z.object({
  // 検索テキスト(title, description に対する部分一致)
  search: z.string().optional(),

  // ステータスフィルタ
  status: z
    .enum(['TODO', 'IN_PROGRESS', 'DONE'])
    .optional(),

  // 優先度フィルタ(複数選択可)
  priorities: z
    .enum(['LOW', 'MEDIUM', 'HIGH'])
    .array()
    .optional(),

  // プロジェクトフィルタ
  projectId: z.string().optional(),

  // 割り当て先フィルタ
  assigneeId: z.string().optional(),

  // 期限でフィルタ
  dueDateFrom: z
    .string()
    .datetime()
    .optional(),

  dueDateTo: z
    .string()
    .datetime()
    .optional(),

  // 並び順
  sortBy: z
    .enum(['createdAt', 'dueDate', 'priority'])
    .default('createdAt'),

  // 昇順/降順
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc'),
});

export type ListTasksFilter = z.infer<typeof listTasksFilterSchema>;
```

---

#### Step 2.2: フィルタ付きタスク取得API(所要時間:18分)

**このステップで学ぶこと**: Prismaの複雑なwhere句構築。

**なぜ必要?**: 複数の条件を組み合わせて、ユーザーが探しているタスクを素早く見つけさせます。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts
import { listTasksFilterSchema } from '../schemas/task';

export const taskRouter = createTRPCRouter({
  listWithFilters: protectedProcedure
    .input(listTasksFilterSchema)
    .query(async ({ ctx, input }) => {
      // 1. where句を動的に構築
      const whereConditions = {
        // 本人が作成 OR 割り当てられたタスク
        OR: [
          { creatorId: ctx.user.id },
          { assigneeId: ctx.user.id },
        ],
      } as any;

      // 検索テキスト: title OR description に含まれるか
      if (input.search) {
        whereConditions.AND = [
          {
            OR: [
              {
                title: {
                  contains: input.search,
                  mode: 'insensitive', // 大文字小文字を区別しない
                },
              },
              {
                description: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        ];
      }

      // ステータスフィルタ
      if (input.status) {
        whereConditions.status = input.status;
      }

      // 優先度フィルタ(複数選択対応)
      if (input.priorities && input.priorities.length > 0) {
        whereConditions.priority = {
          in: input.priorities,
        };
      }

      // プロジェクトフィルタ
      if (input.projectId) {
        whereConditions.projectId = input.projectId;
      }

      // 割り当て先フィルタ
      if (input.assigneeId) {
        whereConditions.assigneeId = input.assigneeId;
      }

      // 期限でフィルタ
      if (input.dueDateFrom || input.dueDateTo) {
        whereConditions.dueDate = {};

        if (input.dueDateFrom) {
          whereConditions.dueDate.gte = new Date(input.dueDateFrom);
        }

        if (input.dueDateTo) {
          whereConditions.dueDate.lte = new Date(input.dueDateTo);
        }
      }

      // 2. 並び順の設定
      const orderBy = {
        [input.sortBy]: input.sortOrder,
      };

      // 3. クエリ実行
      const tasks = await prisma.task.findMany({
        where: whereConditions,
        orderBy,
        include: {
          project: {
            select: { id: true, name: true },
          },
          creator: {
            select: { id: true, name: true, avatar: true },
          },
          assignee: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      return tasks;
    }),
});
```

**where句の組み立て方**:

```typescript
// 単純: ステータスが TODO
{ status: 'TODO' }

// OR: 低priority OR 中priority
{ priority: { in: ['LOW', 'MEDIUM'] } }

// AND: (作成者 OR 割り当て先) AND ステータスが TODO
{
  OR: [{ creatorId: '...' }, { assigneeId: '...' }],
  status: 'TODO'
}

// BETWEEN: 期限が 2024/1/1 ~ 2024/12/31
{
  dueDate: {
    gte: new Date('2024-01-01'),
    lte: new Date('2024-12-31'),
  }
}

// LIKE: titleに 'bug' を含む
{
  title: {
    contains: 'bug',
    mode: 'insensitive'
  }
}
```

---

### Part 3: ページネーション実装(20分)

#### Step 3.1: ページネーション・スキーマ(所要時間:8分)

**このステップで学ぶこと**: 1ページあたりのアイテム数と現在のページ。

**なぜ必要?**: 1000件のタスクを一度に取得するのは遅い。100件ずつ取得するほうがレスポンスが早い。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/schemas/pagination.ts
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

/**
 * page = 1, limit = 20
 * → offset = (1 - 1) * 20 = 0  (0-19件目)
 *
 * page = 2, limit = 20
 * → offset = (2 - 1) * 20 = 20  (20-39件目)
 */
export function getPaginationParams(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}
```

---

#### Step 3.2: ページネーション付きAPI(所要時間:12分)

**このステップで学ぶこと**: skip/take でページング。

**なぜ必要?**: ページごとにデータを取得。同時に合計件数も返して、フロント側で「全○件中 ○○件目」と表示できるようにします。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts
import { paginationSchema, getPaginationParams } from '../schemas/pagination';

export const taskRouter = createTRPCRouter({
  listPaginated: protectedProcedure
    .input(
      listTasksFilterSchema.extend({
        page: paginationSchema.shape.page.optional().default(1),
        limit: paginationSchema.shape.limit.optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, ...filterInput } = input;

      // where句を構築(Step 2.2と同じ)
      const whereConditions = {
        OR: [
          { creatorId: ctx.user.id },
          { assigneeId: ctx.user.id },
        ],
      } as any;

      // フィルタ条件を追加(省略)
      if (filterInput.search) {
        // ...
      }
      if (filterInput.status) {
        whereConditions.status = filterInput.status;
      }
      // ... 他のフィルタも同じ

      // 1. 全体件数を取得(ページング用)
      const total = await prisma.task.count({
        where: whereConditions,
      });

      // 2. ページネーションパラメータ
      const { skip, take } = getPaginationParams(page, limit);

      // 3. ページ分のデータを取得
      const tasks = await prisma.task.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy: { [filterInput.sortBy]: filterInput.sortOrder },
        include: {
          project: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, avatar: true } },
          assignee: { select: { id: true, name: true, avatar: true } },
        },
      });

      // 4. ページネーション情報を含めて返却
      return {
        data: tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    }),
});
```

**フロント側でのページネーション**:

```typescript
// filepath: src/app/dashboard/tasks/page.tsx
'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Pagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { api } from '@trpc/react';

export default function TasksPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: [],
  });

  // ページネーション付きでタスク取得
  const { data, isLoading } = api.task.listPaginated.useQuery({
    page,
    limit: 20,
    search: filters.search,
    status: filters.status as any,
  });

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  return (
    <Box>
      {/* フィルタ入力 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label='検索'
          value={filters.search}
          onChange={(e) =>
            setFilters({ ...filters, search: e.target.value })
          }
          size='small'
        />

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>ステータス</InputLabel>
          <Select
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value })
            }
          >
            <MenuItem value=''>すべて</MenuItem>
            <MenuItem value='TODO'>未開始</MenuItem>
            <MenuItem value='IN_PROGRESS'>進行中</MenuItem>
            <MenuItem value='DONE'>完了</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* タスク一覧表示 */}
      {/* ... テーブル ... */}

      {/* ページネーション */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Pagination
          count={data?.pagination.totalPages || 0}
          page={page}
          onChange={handlePageChange}
        />
      </Box>

      {/* 件数表示 */}
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        全 {data?.pagination.total} 件中 {data?.pagination.page} ページ
      </Box>
    </Box>
  );
}
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. **タスク削除**
   - [ ] 権限チェック(作成者のみ)
   - [ ] 関連データも一緒に削除

2. **検索・フィルタリング**
   - [ ] テキスト検索(title, description)
   - [ ] ステータス・優先度フィルタ
   - [ ] 期限範囲フィルタ
   - [ ] 複数条件の組み合わせ

3. **ページネーション**
   - [ ] page/limit パラメータ
   - [ ] skip/take でデータ取得
   - [ ] 合計件数を計算
   - [ ] フロント側でページ操作

---

## まとめ

- **delete**: 権限確認 → cascadeで関連データ削除
- **検索**: contains(LIKE) で部分一致検索
- **フィルタ**: where句を動的に構築
- **ページネーション**: skip/take で効率的に取得
- **メタデータ**: totalPages, hasNextPage で UI制御

次回(Day 11)はプロジェクト管理機能・Week 2後半へ進みます。
