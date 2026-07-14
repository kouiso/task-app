# Day 12: コメント機能・タスク詳細ページ

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **コメント作成・削除API** | タスク連携 | ✅ コメント追加・削除できる |
| **リアルタイム更新** | UI体験 | ✅ コメント投稿直後に表示できる |
| **タスク詳細ページUI** | 画面実装 | ✅ コメント含めた詳細画面を作成できる |

## 💼 なぜこれを学ぶのか?

**コメント機能は、チームコミュニケーションの要**です。タスク詳細ページにコメント欄を表示。タスクに関する議論がタスク内で完結します。

- **コメント投稿**: タスクに対するコメント
- **コメント削除**: 自分のコメントのみ削除可
- **表示順**: 新しいコメントが下に表示

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | コメント作成・削除API | 2ステップ | 25分 |
| **Part 2** | タスク詳細・コメント表示 | 2ステップ | 20分 |
| **Part 3** | UI実装・リアルタイム更新 | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: コメント作成・削除API(25分)

#### Step 1.1: コメント作成mutation(所要時間:12分)

**このステップで学ぶこと**: タスクに対するコメント投稿。

**なぜ必要?**: タスクのメンバーがコメントで意見交換。削除機能と同じく権限チェック必須。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/comment.ts
import { prisma } from '@/lib/prisma';
import { protectedProcedure, createTRPCRouter } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const createCommentSchema = z.object({
  taskId: z.string().min(1, 'タスクIDが必須です'),
  content: z
    .string()
    .min(1, 'コメント内容は必須です')
    .max(500, 'コメントは500文字以内です'),
});

export const commentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createCommentSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. タスク存在確認 + 権限チェック
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
        select: {
          id: true,
          creatorId: true,
          assigneeId: true,
          projectId: true,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      // このタスクにアクセス可能か確認
      // パターン:
      // - 自分が作成したタスク
      // - 自分に割り当てられたタスク
      // - (オプション)プロジェクトメンバー
      const canAccess =
        task.creatorId === ctx.user.id ||
        task.assigneeId === ctx.user.id;

      if (!canAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'このタスクにコメントする権限がありません',
        });
      }

      // 2. コメント作成
      const comment = await prisma.comment.create({
        data: {
          content: input.content,
          taskId: input.taskId,
          authorId: ctx.user.id,
        },
        include: {
          author: {
            select: { id: true, name: true, avatar: true, email: true },
          },
        },
      });

      console.log(
        `[AUDIT] Comment created: ${comment.id} on task ${input.taskId} by ${ctx.user.id}`
      );

      return comment;
    }),
});
```

---

#### Step 1.2: コメント削除mutation(所要時間:13分)

**このステップで学ぶこと**: 自分のコメントのみ削除可能。

**なぜ必要?**: 誰でも誰のコメントでも削除できたら、議論が破壊されます。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/comment.ts
export const commentRouter = createTRPCRouter({
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. コメント取得
      const comment = await prisma.comment.findUnique({
        where: { id: input.id },
        select: { id: true, authorId: true, taskId: true },
      });

      if (!comment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'コメントが見つかりません',
        });
      }

      // 2. 権限チェック: 作成者のみ削除可
      if (comment.authorId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '自分のコメントのみ削除可能です',
        });
      }

      // 3. コメント削除
      await prisma.comment.delete({
        where: { id: input.id },
      });

      console.log(
        `[AUDIT] Comment deleted: ${input.id} by ${ctx.user.id}`
      );

      return { success: true };
    }),
});
```

---

### Part 2: タスク詳細・コメント表示(20分)

#### Step 2.1: タスク詳細APIにコメント含める(所要時間:10分)

**このステップで学ぶこと**: getByIdでコメント一覧を取得。

**なぜ必要?**: タスク詳細ページを開いた時、コメントも一緒に表示する必要があります。Day 10で実装したgetByIdを拡張。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts
export const taskRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await prisma.task.findUnique({
        where: { id: input.id },
        include: {
          project: {
            select: { id: true, name: true, color: true },
          },
          creator: {
            select: { id: true, name: true, avatar: true, email: true },
          },
          assignee: {
            select: { id: true, name: true, avatar: true, email: true },
          },
          comments: {
            include: {
              author: {
                select: { id: true, name: true, avatar: true, email: true },
              },
            },
            orderBy: { createdAt: 'asc' }, // 古い順
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      // 権限チェック(Day 9と同じ)
      const canAccess =
        task.creatorId === ctx.user.id ||
        task.assigneeId === ctx.user.id;

      if (!canAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'このタスクにはアクセス権限がありません',
        });
      }

      return task;
    }),
});
```

**コメント並び順**:
```typescript
orderBy: { createdAt: 'asc' }
// 古い順(最初のコメント → 最新のコメント)
// チャットアプリと同じ

orderBy: { createdAt: 'desc' }
// 新しい順(最新 → 古い)
// TwitterのTLと同じ
```

---

#### Step 2.2: コメント一覧クエリ(所要時間:10分)

**このステップで学ぶこと**: タスクのすべてのコメントを取得(別途APIで)。

**なぜ必要?**: ページネーション対応時に、コメント数が多い場合は分割取得が必要。または詳細ページ内でコメント追加時に自動更新。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/comment.ts
export const commentRouter = createTRPCRouter({
  // タスクのコメント一覧
  listByTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        limit: z.number().int().min(1).max(100).default(50),
        page: z.number().int().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      // タスク存在確認 + 権限チェック
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
        select: { creatorId: true, assigneeId: true },
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
          message: 'アクセス権限がありません',
        });
      }

      // コメント数を取得
      const total = await prisma.comment.count({
        where: { taskId: input.taskId },
      });

      // ページネーションパラメータ
      const skip = (input.page - 1) * input.limit;

      // コメント取得
      const comments = await prisma.comment.findMany({
        where: { taskId: input.taskId },
        include: {
          author: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: input.limit,
      });

      return {
        data: comments,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),
});
```

---

### Part 3: UI実装・リアルタイム更新(15分)

#### Step 3.1: タスク詳細ページ(所要時間:15分)

**このステップで学ぶこと**: コメント表示・投稿UI、リアルタイム更新。

**なぜ必要?**: コメント投稿後に即座に反映。ページリロード不要。

**コードの仕組み解説**:

```typescript
// filepath: src/app/dashboard/tasks/[id]/page.tsx
'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { api } from '@/trpc/react';
import { useParams } from 'next/navigation';

interface CommentItem {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
  createdAt: Date;
}

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;

  const [commentContent, setCommentContent] = useState('');
  const utils = api.useUtils();

  // タスク詳細取得
  const { data: task, isLoading: taskLoading } =
    api.task.getById.useQuery({ id: taskId });

  // コメント作成mutation
  const createComment = api.comment.create.useMutation({
    onSuccess: async (newComment) => {
      // 成功時: フォーム初期化 + キャッシュ更新
      setCommentContent('');

      // 方法1: task.getById の include コメント を無効化
      await utils.task.getById.invalidate({ id: taskId });

      // 方法2: または comment.listByTask を無効化
      // await utils.comment.listByTask.invalidate({ taskId });
    },
    onError: (err) => {
      alert(`コメント投稿エラー: ${err.message}`);
    },
  });

  // コメント削除mutation
  const deleteComment = api.comment.delete.useMutation({
    onSuccess: async () => {
      // キャッシュ更新
      await utils.task.getById.invalidate({ id: taskId });
    },
  });

  const handlePostComment = async () => {
    if (!commentContent.trim()) return;

    await createComment.mutateAsync({
      taskId,
      content: commentContent,
    });
  };

  if (taskLoading) return <CircularProgress />;
  if (!task) return <Typography>タスクが見つかりません</Typography>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
      {/* タスク情報 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant='h4' sx={{ mb: 2 }}>
          {task.title}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant='subtitle2' color='textSecondary'>
              ステータス
            </Typography>
            <Typography>{task.status}</Typography>
          </Box>

          <Box>
            <Typography variant='subtitle2' color='textSecondary'>
              優先度
            </Typography>
            <Typography>{task.priority}</Typography>
          </Box>

          <Box>
            <Typography variant='subtitle2' color='textSecondary'>
              作成者
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                src={task.creator?.avatar || undefined}
                sx={{ width: 24, height: 24 }}
              />
              <Typography>{task.creator?.name}</Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant='subtitle2' color='textSecondary'>
              割り当て先
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {task.assignee ? (
                <>
                  <Avatar
                    src={task.assignee.avatar || undefined}
                    sx={{ width: 24, height: 24 }}
                  />
                  <Typography>{task.assignee.name}</Typography>
                </>
              ) : (
                <Typography>未割り当て</Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant='h6' sx={{ mb: 2 }}>
          説明
        </Typography>
        <Typography>{task.description || '説明なし'}</Typography>
      </Paper>

      {/* コメント欄 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant='h6' sx={{ mb: 2 }}>
          コメント({task.comments?.length || 0})
        </Typography>

        {/* コメント投稿フォーム */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder='コメントを入力...'
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            disabled={createComment.isPending}
          />

          <Button
            variant='contained'
            sx={{ mt: 1 }}
            onClick={handlePostComment}
            disabled={
              createComment.isPending || !commentContent.trim()
            }
          >
            投稿
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* コメント一覧 */}
        <Box>
          {task.comments && task.comments.length > 0 ? (
            task.comments.map((comment) => (
              <Box key={comment.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar
                    src={comment.author.avatar || undefined}
                    sx={{ width: 32, height: 32 }}
                  />

                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant='subtitle2'>
                        {comment.author.name}
                      </Typography>

                      <Typography variant='caption' color='textSecondary'>
                        {new Date(comment.createdAt).toLocaleString('ja-JP')}
                      </Typography>
                    </Box>

                    <Typography sx={{ mt: 1 }}>
                      {comment.content}
                    </Typography>

                    {/* 削除ボタン(自分のコメントのみ表示) */}
                    {/* 注: currentUser.idが必要 */}
                  </Box>
                </Box>
              </Box>
            ))
          ) : (
            <Typography color='textSecondary'>
              コメントはまだありません
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
```

**キャッシュ更新戦略**:
```typescript
// 方法1: タスク詳細全体を無効化(推奨)
await utils.task.getById.invalidate({ id: taskId });
// → 次回アクセス時に再フェッチ

// 方法2: コメント一覧のみ無効化
await utils.comment.listByTask.invalidate({ taskId });

// 方法3: 楽観的更新(ここでは実装せず)
// → 先にUIを更新、後からサーバーに同期
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. **コメント作成・削除**
   - [ ] タスクへのコメント投稿
   - [ ] 自分のコメントのみ削除
   - [ ] 権限チェック

2. **コメント表示**
   - [ ] タスク詳細にコメント一覧
   - [ ] 古い順に表示
   - [ ] 作成者情報・タイムスタンプ

3. **リアルタイム更新**
   - [ ] コメント投稿後に自動更新
   - [ ] キャッシュ無効化
   - [ ] フォーム初期化

---

## まとめ

- **Comment**: TaskID に紐付く
- **権限**: 自分のコメントのみ削除可
- **表示順**: createdAt ASC(古い順)
- **キャッシュ**: invalidate で再フェッチ
- **UI**: Avatar + コメント内容 + 削除ボタン

次回(Day 13)はコメント編集・リアクション機能など Day 14の前準備です。
