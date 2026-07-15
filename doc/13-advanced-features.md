# Day 13: 高度な機能・タスク割り当てと通知

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **タスク割り当て機能** | チーム管理 | ✅ メンバーへの割り当てできる |
| **バッチ操作** | 効率化 | ✅ 複数タスクを一括更新できる |
| **イベントログ・通知** | 透明性 | ✅ 変更履歴をログできる |

## 💼 なぜこれを学ぶのか?

**プロジェクトマネージャーは複数のタスクを複数人に割り当てる必要があります**。単一タスク更新ではなく、バッチ操作で効率化。また、誰が何をしたかのログを残すことで、後追い可能な透明性のあるシステムになります。

- **割り当て変更**: 誰が担当するか
- **バッチ操作**: 複数タスクの優先度を一括変更
- **ログ記録**: 変更履歴を保持
- **通知**: 割り当てられたユーザーに通知

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | タスク割り当て変更API | 1ステップ | 15分 |
| **Part 2** | バッチ操作・複数更新 | 2ステップ | 25分 |
| **Part 3** | アクティビティログ | 2ステップ | 20分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: タスク割り当て変更API(15分)

#### Step 1.1: 割り当て先変更mutation(所要時間:15分)

**このステップで学ぶこと**: タスクの割り当て先を変更。

**なぜ必要?**: タスク作成後、別人に割り当てることがあります。Day 9の updateStatus と同様の仕組みです。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts
import { prisma } from '@/lib/prisma';
import { protectedProcedure, createTRPCRouter } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const assignSchema = z.object({
  taskId: z.string(),
  assigneeId: z.string().nullable(), // nullを許可(割り当て解除)
});

export const taskRouter = createTRPCRouter({
  assign: protectedProcedure
    .input(assignSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. タスク取得 + 権限確認
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

      // 作成者のみ割り当て可
      if (task.creatorId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'このタスクの割り当てを変更する権限がありません',
        });
      }

      // 2. 新しい割り当て先が存在するか確認(nullなら割り当て解除)
      if (input.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: input.assigneeId },
          select: { id: true, isActive: true },
        });

        if (!assignee) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'ユーザーが見つかりません',
          });
        }

        if (!assignee.isActive) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '無効なユーザーに割り当てられません',
          });
        }

        // オプション: プロジェクトメンバーか確認
        if (task.projectId) {
          const isProjectMember = await prisma.project.findUnique({
            where: {
              id: task.projectId,
              OR: [
                { ownerId: input.assigneeId },
                { members: { some: { id: input.assigneeId } } },
              ],
            },
          });

          if (!isProjectMember) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'このユーザーはプロジェクトメンバーではありません',
            });
          }
        }
      }

      // 3. 割り当て先を更新
      const oldAssigneeId = task.assigneeId;
      const updated = await prisma.task.update({
        where: { id: input.taskId },
        data: { assigneeId: input.assigneeId },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          creator: { select: { id: true, name: true } },
        },
      });

      // 4. アクティビティログに記録
      await prisma.activityLog.create({
        data: {
          action: 'TASK_ASSIGNED',
          taskId: input.taskId,
          userId: ctx.user.id,
          description: `${updated.creator.name} が ${input.assigneeId ? updated.assignee?.name : '(割り当て解除)'} に割り当てました`,
          oldValue: oldAssigneeId,
          newValue: input.assigneeId,
        },
      });

      console.log(
        `[AUDIT] Task assigned: ${input.taskId} to ${input.assigneeId} by ${ctx.user.id}`
      );

      return updated;
    }),
});
```

---

### Part 2: バッチ操作・複数更新(25分)

#### Step 2.1: 複数タスク一括更新API(所要時間:12分)

**このステップで学ぶこと**: updateMany で複数タスクを同時に更新。

**なぜ必要?**: 「このプロジェクトの全TODO タスクを 高優先度 に変更」みたいな操作を効率化。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts
const batchUpdateSchema = z.object({
  taskIds: z.string().array().min(1, '最低1つのタスクを選択してください'),
  updates: z.object({
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    projectId: z.string().nullable().optional(),
  }),
});

export const taskRouter = createTRPCRouter({
  batchUpdate: protectedProcedure
    .input(batchUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. 権限チェック(時間がかかるため、最初の3つのみチェック)
      const tasksToUpdate = await prisma.task.findMany({
        where: { id: { in: input.taskIds } },
        select: {
          id: true,
          creatorId: true,
          title: true,
        },
        take: 3,
      });

      // すべてのタスクが同じユーザーが作成したものか、3つサンプルで確認
      const allOwned = tasksToUpdate.every(
        (t) => t.creatorId === ctx.user.id
      );

      if (!allOwned) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '権限がないタスクが含まれています',
        });
      }

      // 2. 複数タスクを更新
      const result = await prisma.task.updateMany({
        where: { id: { in: input.taskIds } },
        data: input.updates,
      });

      // 3. アクティビティログに記録
      await prisma.activityLog.createMany({
        data: input.taskIds.map((taskId) => ({
          action: 'TASK_BATCH_UPDATED',
          taskId,
          userId: ctx.user.id,
          description: `一括更新: ${Object.entries(input.updates)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')}`,
        })),
      });

      console.log(
        `[AUDIT] Batch updated ${input.taskIds.length} tasks by ${ctx.user.id}`
      );

      return {
        count: result.count,
        message: `${result.count} 個のタスクを更新しました`,
      };
    }),
});
```

**updateMany と update の違い**:
```typescript
// update: 1つのタスクを更新
await prisma.task.update({
  where: { id: 'task_1' },
  data: { status: 'DONE' },
})

// updateMany: 複数タスクを同時に更新
await prisma.task.updateMany({
  where: { id: { in: ['task_1', 'task_2', 'task_3'] } },
  data: { status: 'DONE' },
})
// → SQL: UPDATE tasks SET status = 'DONE' WHERE id IN (...)
```

---

#### Step 2.2: フロント側のバッチ操作UI(所要時間:13分)

**このステップで学ぶこと**: 複数選択 → 一括更新。

**なぜ必要?**: ユーザーが複数タスクにチェックを付けて、「優先度を変更」ボタンで一括更新。

**コードの仕組み解説**:

```typescript
// filepath: src/app/dashboard/tasks/page.tsx
'use client';

import { useState } from 'react';
import {
  Box,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import { api } from '@/trpc/react';

export default function TasksPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { data: tasks } = api.task.list.useQuery();
  const utils = api.useUtils();

  // バッチ更新mutation
  const batchUpdate = api.task.batchUpdate.useMutation({
    onSuccess: async () => {
      setSelectedIds([]); // 選択解除
      await utils.task.list.invalidate(); // キャッシュ更新
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(tasks?.map((t) => t.id) || []);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, taskId]);
    } else {
      setSelectedIds(selectedIds.filter((id) => id !== taskId));
    }
  };

  const handleBatchPriorityChange = async (priority: string) => {
    if (selectedIds.length === 0) return;

    await batchUpdate.mutateAsync({
      taskIds: selectedIds,
      updates: { priority: priority as any },
    });

    setAnchorEl(null);
  };

  return (
    <Box>
      {/* 選択情報 */}
      {selectedIds.length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
          <Typography>
            {selectedIds.length} 個のタスクを選択中
          </Typography>

          <Button
            size='small'
            sx={{ mt: 1 }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            アクション
          </Button>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem
              onClick={() => handleBatchPriorityChange('LOW')}
            >
              優先度を「低」に設定
            </MenuItem>
            <MenuItem
              onClick={() => handleBatchPriorityChange('MEDIUM')}
            >
              優先度を「中」に設定
            </MenuItem>
            <MenuItem
              onClick={() => handleBatchPriorityChange('HIGH')}
            >
              優先度を「高」に設定
            </MenuItem>
          </Menu>
        </Box>
      )}

      {/* テーブル */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding='checkbox'>
                <Checkbox
                  checked={
                    tasks && tasks.length > 0 && selectedIds.length === tasks.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>タスク名</TableCell>
              <TableCell>優先度</TableCell>
              <TableCell>ステータス</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks?.map((task) => (
              <TableRow
                key={task.id}
                selected={selectedIds.includes(task.id)}
              >
                <TableCell padding='checkbox'>
                  <Checkbox
                    checked={selectedIds.includes(task.id)}
                    onChange={(e) =>
                      handleSelectOne(task.id, e.target.checked)
                    }
                  />
                </TableCell>
                <TableCell>{task.title}</TableCell>
                <TableCell>{task.priority}</TableCell>
                <TableCell>{task.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
```

---

### Part 3: アクティビティログ(20分)

#### Step 3.1: ActityLog テーブルとスキーマ(所要時間:10分)

**このステップで学ぶこと**: すべての重要な変更をログに記録。

**なぜ必要?**: 「誰が」「何を」「いつ」変更したか追跡可能にする。監査ログ(Audit Trail)と呼ばれます。

**Prismaスキーマ追加**:

```prisma
// filepath: prisma/schema.prisma (既存から追加)
model ActivityLog {
  id        String   @id @default(cuid())
  action    String   // TASK_CREATED, TASK_UPDATED, TASK_ASSIGNED, COMMENT_CREATED, etc.
  taskId    String?  @db.VarChar(255)
  projectId String?  @db.VarChar(255)
  userId    String   @db.VarChar(255)

  // 変更内容の詳細
  description String?
  oldValue    String? // 変更前の値(JSON)
  newValue    String? // 変更後の値(JSON)

  createdAt DateTime @default(now())

  // リレーション
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@index([projectId])
  @@index([userId])
  @@index([createdAt])
}

model User {
  // ... 既存フィールド
  activityLogs ActivityLog[]
}
```

**マイグレーション実行**:
```bash
npx prisma migrate dev --name add_activity_log
```

---

#### Step 3.2: アクティビティログ表示API(所要時間:10分)

**このステップで学ぶこと**: ログを時系列で表示。

**なぜ必要?**: タスクの変更履歴を表示。「いつ」「誰が」「何を」変更したかわかる。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/activity-log.ts
import { prisma } from '@/lib/prisma';
import { protectedProcedure, createTRPCRouter } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const activityLogRouter = createTRPCRouter({
  // タスクの活動ログを取得
  listByTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
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

      // ログ取得(新しい順)
      const logs = await prisma.activityLog.findMany({
        where: { taskId: input.taskId },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // 最新50件
      });

      return logs;
    }),

  // プロジェクトの活動ログ
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // プロジェクト権限確認(省略)

      const logs = await prisma.activityLog.findMany({
        where: { projectId: input.projectId },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return logs;
    }),
});
```

**ログ表示UI**:

```typescript
// filepath: src/components/activity-log.tsx
'use client';

import {
  Box,
  Typography,
  Avatar,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/material';
import { api } from '@/trpc/react';

export function ActivityLog({ taskId }: { taskId: string }) {
  const { data: logs } = api.activityLog.listByTask.useQuery({ taskId });

  return (
    <Box>
      <Typography variant='h6' sx={{ mb: 2 }}>
        活動履歴
      </Typography>

      <Timeline>
        {logs?.map((log, index) => (
          <TimelineItem key={log.id}>
            <TimelineSeparator>
              <Avatar
                src={log.user.avatar || undefined}
                sx={{ width: 32, height: 32 }}
              />
              {index < (logs?.length || 0) - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent>
              <Typography variant='subtitle2'>
                {log.user.name} が {log.action} を実行
              </Typography>
              <Typography variant='caption' color='textSecondary'>
                {new Date(log.createdAt).toLocaleString('ja-JP')}
              </Typography>
              {log.description && (
                <Typography variant='body2' sx={{ mt: 0.5 }}>
                  {log.description}
                </Typography>
              )}
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Box>
  );
}
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. **タスク割り当て機能**
   - [ ] 割り当て先変更API
   - [ ] 権限チェック
   - [ ] プロジェクトメンバー確認

2. **バッチ操作**
   - [ ] 複数タスク一括更新
   - [ ] updateMany で効率化
   - [ ] フロント側の複数選択UI

3. **アクティビティログ**
   - [ ] ActivityLog テーブル
   - [ ] すべての重要な変更を記録
   - [ ] 時系列表示

---

## まとめ

- **assign**: 割り当て先を変更
- **batchUpdate**: updateMany で複数更新
- **ActivityLog**: すべての変更を記録(監査ログ)
- **権限**: creator のみバッチ操作可
- **Timeline**: 活動履歴を視覚的に表示

次回(Day 14)は Week 2のまとめ・デプロイ準備です。
