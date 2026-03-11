# Day 09: タスク作成・編集API実装

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **POST/PUT APIを実装する** | CRUD機能 | ✅ mutationで作成・更新できる |
| **フォームバリデーション** | データ品質 | ✅ Zodで安全にバリデーションできる |
| **リアルタイムUI更新** | ユーザー体験 | ✅ useMutation で自動更新できる |

## 💼 なぜこれを学ぶのか?

**タスク作成・編集は、タスク管理アプリのコア機能**です。Day 8のエラーハンドリング、Day 5のPrismaを組み合わせて、実務的なAPIを作ります。

- **バリデーション**: ユーザー入力を検証
- **最適化**: createTask後、自動的にキャッシュを更新
- **エラーハンドリング**: 予期しないエラーも適切に処理

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | タスク作成API | 2ステップ | 25分 |
| **Part 2** | タスク編集API | 2ステップ | 20分 |
| **Part 3** | フロント連携・UI更新 | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: タスク作成API(25分)

#### Step 1.1: スキーマ定義とバリデーション(所要時間:12分)

**このステップで学ぶこと**: Zod で入力値を厳密に検証。

**なぜ必要?**: フロントから送られた値が期待通りか確認。不正な値ではエラーを返す。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/schemas/task.ts
import { z } from 'zod';
import { TaskStatus, TaskPriority } from '@prisma/client';

/**
 * タスク作成時のバリデーション
 *
 * title: 1-100文字(必須)
 * description: オプション、1000文字以内
 * projectId: オプション(プロジェクト指定)
 * priority: LOW | MEDIUM | HIGH (デフォルト MEDIUM)
 * dueDate: 未来日のみ
 * assigneeId: オプション(他のユーザーに割り当て)
 */
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(100, 'タイトルは100文字以内です'),

  description: z
    .string()
    .max(1000, '説明は1000文字以内です')
    .optional()
    .nullable(),

  projectId: z.string().optional().nullable(),

  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),

  dueDate: z
    .string()
    .datetime('有効な日時形式で入力してください')
    .optional()
    .nullable()
    .refine(
      (date) => !date || new Date(date) > new Date(),
      '期限は現在より未来の日時を指定してください'
    ),

  assigneeId: z.string().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/**
 * タスク更新時のバリデーション
 * 作成時と同じだが、すべてオプション
 */
export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string().min(1, 'タスクIDが必須です'),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

**Zod機能説明**:
- `.min()/.max()`: 文字列長制限
- `.enum()`: 列挙値チェック
- `.refine()`: カスタムバリデーション(未来日確認)
- `.optional().nullable()`: 省略可能かつnullでも良い
- `.partial()`: すべてのフィールドをオプション化

---

#### Step 1.2: タスク作成mutationを実装(所要時間:13分)

**このステップで学ぶこと**: 実際のDB保存とエラーチェック。

**なぜ必要?**: バリデーション後、プロジェクト存在確認、権限チェック、保存処理を実装します。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts
import { createTaskSchema, updateTaskSchema } from '../schemas/task';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';

export const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. プロジェクトが指定されている場合、存在確認 + 権限チェック
      if (input.projectId) {
        const project = await prisma.project.findUnique({
          where: { id: input.projectId },
          select: { id: true, ownerId: true },
        });

        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'プロジェクトが見つかりません',
          });
        }

        // プロジェクトのオーナー OR メンバーのみ タスク追加可
        const isMember = await prisma.project.findUnique({
          where: {
            id: input.projectId,
            OR: [
              { ownerId: ctx.user.id },
              { members: { some: { id: ctx.user.id } } },
            ],
          },
        });

        if (!isMember) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'このプロジェクトにはアクセス権限がありません',
          });
        }
      }

      // 2. 割り当て先ユーザーが存在するか確認
      if (input.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: input.assigneeId },
          select: { id: true, isActive: true },
        });

        if (!assignee) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '割り当て先ユーザーが見つかりません',
          });
        }

        if (!assignee.isActive) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '無効なユーザーには割り当てられません',
          });
        }
      }

      // 3. タスクを作成
      const task = await prisma.task.create({
        data: {
          title: input.title,
          description: input.description,
          projectId: input.projectId,
          creatorId: ctx.user.id,
          assigneeId: input.assigneeId,
          priority: input.priority,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          status: 'TODO',
        },
        include: {
          project: true,
          creator: {
            select: { id: true, name: true, avatar: true },
          },
          assignee: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      console.log(`[AUDIT] Task created: ${task.id} by ${ctx.user.id}`);

      return task;
    }),
});
```

**処理フロー**:
```
1. 入力値をZodで検証(型チェック)
2. プロジェクト存在 & 権限確認
3. 割り当て先ユーザー確認
4. DB に Task を INSERT
5. 関連データ(creator, assignee, project)も同時に取得
```

---

### Part 2: タスク編集API(20分)

#### Step 2.1: 編集権限の確認(所要時間:10分)

**このステップで学ぶこと**: 自分のタスク OR 割り当てられたタスクのみ編集可。

**なぜ必要?**: 他人のタスクを編集させてはいけません。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts
// タスク編集 mutation
update: protectedProcedure
  .input(updateTaskSchema)
  .mutation(async ({ ctx, input }) => {
    const { id, ...updateData } = input;

    // 1. タスク存在確認 + 権限チェック
    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
        assigneeId: true,
        status: true,
      },
    });

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'タスクが見つかりません',
      });
    }

    // 作成者 OR 割り当て先のみ編集可
    const isOwnerOrAssignee =
      task.creatorId === ctx.user.id || task.assigneeId === ctx.user.id;

    if (!isOwnerOrAssignee) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'このタスクを編集する権限がありません',
      });
    }

    // 2. 完了済みタスクの制限チェック
    if (task.status === 'DONE' && updateData.status !== 'DONE') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: '完了済みのタスクは戻すことはできません',
      });
    }

    // 3. プロジェクト変更時の権限チェック
    if (updateData.projectId && updateData.projectId !== task.projectId) {
      const newProject = await prisma.project.findUnique({
        where: { id: updateData.projectId },
      });

      if (!newProject) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        });
      }
    }

    // 4. タスクを更新
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    console.log(`[AUDIT] Task updated: ${id} by ${ctx.user.id}`);

    return updatedTask;
  }),
```

---

#### Step 2.2: ステータス・優先度変更API(所要時間:10分)

**このステップで学ぶこと**: 部分更新の専用プロシージャ。

**なぜ必要?**: ステータス変更だけ(優先度だけ)の軽量リクエストを作ることで、フロント側で細かい制御ができます。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts
// ステータス変更
updateStatus: protectedProcedure
  .input(
    z.object({
      id: z.string(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const task = await prisma.task.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        creatorId: true,
        assigneeId: true,
        status: true,
      },
    });

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'タスクが見つかりません',
      });
    }

    // 権限: 作成者 OR 割り当て先
    if (
      task.creatorId !== ctx.user.id &&
      task.assigneeId !== ctx.user.id
    ) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'このタスクを変更する権限がありません',
      });
    }

    // DONE → TODO への戻し禁止
    if (task.status === 'DONE' && input.status !== 'DONE') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: '完了済みのタスクは戻すことはできません',
      });
    }

    const updated = await prisma.task.update({
      where: { id: input.id },
      data: { status: input.status },
    });

    return updated;
  }),

// 優先度変更
updatePriority: protectedProcedure
  .input(
    z.object({
      id: z.string(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const task = await prisma.task.findUnique({
      where: { id: input.id },
      select: { id: true, creatorId: true, assigneeId: true },
    });

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'タスクが見つかりません',
      });
    }

    if (
      task.creatorId !== ctx.user.id &&
      task.assigneeId !== ctx.user.id
    ) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: '権限がありません',
      });
    }

    const updated = await prisma.task.update({
      where: { id: input.id },
      data: { priority: input.priority },
    });

    return updated;
  }),
```

---

### Part 3: フロント連携・UI更新(15分)

#### Step 3.1: タスク作成フォームの実装(所要時間:15分)

**このステップで学ぶこと**: tRPCのuseMutation + キャッシュ更新。

**なぜ必要?**: APIでタスク作成後、タスク一覧を自動更新。ページリロード不要。

**コードの仕組み解説**:

```typescript
// filepath: src/app/dashboard/tasks/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { TaskPriority } from '@prisma/client';

export default function CreateTaskPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    priority: 'MEDIUM' as TaskPriority,
    dueDate: '',
    assigneeId: '',
  });

  const utils = api.useUtils();
  const createTask = api.task.create.useMutation({
    onSuccess: async (newTask) => {
      // キャッシュを無効化(自動的にtask.listが再フェッチされる)
      await utils.task.list.invalidate();

      // 作成したタスクの詳細ページへリダイレクト
      router.push(`/dashboard/tasks/${newTask.id}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const projects = api.project.list.useQuery();
  const users = api.user.list.useQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await createTask.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        projectId: formData.projectId || null,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        assigneeId: formData.assigneeId || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant='h4' sx={{ mb: 3 }}>
        新しいタスクを作成
      </Typography>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component='form' onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label='タイトル'
          value={formData.title}
          onChange={(e) =>
            setFormData({ ...formData, title: e.target.value })
          }
          margin='normal'
          disabled={loading}
          required
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
          disabled={loading}
        />

        <FormControl fullWidth margin='normal'>
          <InputLabel>プロジェクト</InputLabel>
          <Select
            value={formData.projectId}
            onChange={(e) =>
              setFormData({ ...formData, projectId: e.target.value })
            }
            disabled={loading || projects.isLoading}
          >
            <MenuItem value=''>なし</MenuItem>
            {projects.data?.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin='normal'>
          <InputLabel>優先度</InputLabel>
          <Select
            value={formData.priority}
            onChange={(e) =>
              setFormData({
                ...formData,
                priority: e.target.value as TaskPriority,
              })
            }
          >
            <MenuItem value='LOW'>低</MenuItem>
            <MenuItem value='MEDIUM'>中</MenuItem>
            <MenuItem value='HIGH'>高</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label='期限'
          type='datetime-local'
          value={formData.dueDate}
          onChange={(e) =>
            setFormData({ ...formData, dueDate: e.target.value })
          }
          margin='normal'
          disabled={loading}
          InputLabelProps={{ shrink: true }}
        />

        <FormControl fullWidth margin='normal'>
          <InputLabel>割り当て先</InputLabel>
          <Select
            value={formData.assigneeId}
            onChange={(e) =>
              setFormData({ ...formData, assigneeId: e.target.value })
            }
            disabled={loading || users.isLoading}
          >
            <MenuItem value=''>割り当てない</MenuItem>
            {users.data?.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          fullWidth
          variant='contained'
          type='submit'
          sx={{ mt: 3 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : '作成'}
        </Button>
      </Box>
    </Box>
  );
}
```

**useMutationの特徴**:
- `onSuccess`: 成功時に実行(キャッシュ無効化など)
- `onError`: エラー時に実行(エラー表示など)
- `mutateAsync`: async/awaitで使用可能
- `utils.task.list.invalidate()`: キャッシュを削除 → 次回アクセス時に再フェッチ

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. **Zod バリデーション**
   - [ ] createTaskSchema で入力値チェック
   - [ ] 日時、文字列長、enum値を検証

2. **タスク作成API**
   - [ ] プロジェクト存在 & 権限確認
   - [ ] 割り当て先ユーザー確認
   - [ ] タスクをDB保存

3. **タスク編集API**
   - [ ] 編集権限チェック(作成者 OR 割り当て先)
   - [ ] ステータス・優先度の個別変更

4. **フロント連携**
   - [ ] useMutation でAPI呼び出し
   - [ ] キャッシュ無効化で自動更新
   - [ ] エラーハンドリング

---

## まとめ

- **Zod**: 型安全なバリデーション
- **mutation**: データ変更API
- **権限チェック**: 本人のタスクのみ編集
- **useMutation**: フロント側のフック
- **キャッシュ管理**: invalidate で再フェッチ

次回(Day 10)はタスク削除・検索・フィルタリング機能です。
