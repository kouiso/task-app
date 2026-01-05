# Day 11: プロジェクト管理・メンバー機能

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **プロジェクト作成・管理** | チーム開発 | ✅ プロジェクト作成・編集できる |
| **メンバー管理** | 権限制御 | ✅ メンバー追加・削除できる |
| **プロジェクトタスク関連付け** | データ構造 | ✅ タスクをプロジェクトに紐付けられる |

## 💼 なぜこれを学ぶのか?

**チーム開発ではタスクを単独ではなく、プロジェクト単位で管理します**。プロジェクトはメンバーを持つ、タスクの集合です。Day 5のPrismaリレーションを実践的に使用します。

- **プロジェクト**: タスクの集合、オーナー、メンバー
- **オーナー**: プロジェクト削除・メンバー追加削除
- **メンバー**: タスク作成・編集・完了

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | プロジェクト作成・一覧 | 2ステップ | 25分 |
| **Part 2** | メンバー追加・削除 | 2ステップ | 20分 |
| **Part 3** | プロジェクト詳細・統計 | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: プロジェクト作成・一覧(25分)

#### Step 1.1: プロジェクト作成API(所要時間:12分)

**このステップで学ぶこと**: プロジェクトの新規作成とオーナー設定。

**なぜ必要?**: ユーザーが複数のプロジェクトを作成可能。それぞれのプロジェクトはオーナー(作成者)を持ちます。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/project.ts
import { prisma } from '@/lib/prisma';
import { protectedProcedure, createTRPCRouter } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'プロジェクト名は必須です')
    .max(100, 'プロジェクト名は100文字以内です'),

  description: z
    .string()
    .max(500, '説明は500文字以内です')
    .optional()
    .nullable(),

  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, '有効なカラーコードを入力してください')
    .optional()
    .default('#1976d2'),
});

export const projectRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. プロジェクト作成
      const project = await prisma.project.create({
        data: {
          name: input.name,
          description: input.description,
          color: input.color,
          ownerId: ctx.user.id,
          // オーナーを自動的にメンバーに追加
          members: {
            connect: [{ id: ctx.user.id }],
          },
        },
        include: {
          owner: {
            select: { id: true, name: true, avatar: true },
          },
          members: {
            select: { id: true, name: true, avatar: true, email: true },
          },
        },
      });

      console.log(
        `[AUDIT] Project created: ${project.id} by ${ctx.user.id}`
      );

      return project;
    }),
});
```

**Prismaリレーション**:
```typescript
members: {
  connect: [{ id: ctx.user.id }]
}
// → 既存ユーザーをメンバーとして関連付け
// (Userテーブルに新規作成ではなく、既存ユーザーを接続)
```

---

#### Step 1.2: プロジェクト一覧・詳細取得(所要時間:13分)

**このステップで学ぶこと**: ユーザーが関与しているプロジェクトを抽出。

**なぜ必要?**: ユーザーが見られるのは「オーナーのプロジェクト」または「メンバーとして参加しているプロジェクト」のみです。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/project.ts
export const projectRouter = createTRPCRouter({
  // プロジェクト一覧(ユーザーが参加しているもののみ)
  list: protectedProcedure.query(async ({ ctx }) => {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: ctx.user.id },
          { members: { some: { id: ctx.user.id } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true },
        },
        members: {
          select: { id: true, name: true, avatar: true },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects;
  }),

  // プロジェクト詳細
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.id },
        include: {
          owner: {
            select: { id: true, name: true, avatar: true, email: true },
          },
          members: {
            select: { id: true, name: true, avatar: true, email: true },
          },
          tasks: {
            include: {
              creator: { select: { id: true, name: true } },
              assignee: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        });
      }

      // 権限チェック: オーナー OR メンバーのみアクセス可
      const isMemberOrOwner =
        project.ownerId === ctx.user.id ||
        project.members.some((m) => m.id === ctx.user.id);

      if (!isMemberOrOwner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'このプロジェクトにはアクセス権限がありません',
        });
      }

      return project;
    }),
});
```

**`_count` の使用方法**:
```typescript
_count: {
  select: { tasks: true }
}
// → { tasks: 5 } という形で、タスク数を含める
// SQL: COUNT(*) GROUP BY を実行
```

---

### Part 2: メンバー追加・削除(20分)

#### Step 2.1: メンバー追加API(所要時間:10分)

**このステップで学ぶこと**: オーナーのみがメンバー追加可能。

**なぜ必要?**: 誰でもプロジェクトにメンバーを追加できたら、プライバシーが侵害されます。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/project.ts
const addMemberSchema = z.object({
  projectId: z.string(),
  userId: z.string(),
});

export const projectRouter = createTRPCRouter({
  addMember: protectedProcedure
    .input(addMemberSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. プロジェクト取得 + 権限チェック
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { id: true, ownerId: true, members: true },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        });
      }

      // オーナーのみメンバー追加可
      if (project.ownerId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'メンバーを追加する権限がありません',
        });
      }

      // 2. 追加するユーザーが存在するか確認
      const userToAdd = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, isActive: true },
      });

      if (!userToAdd) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません',
        });
      }

      if (!userToAdd.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '無効なユーザーをメンバーに追加することはできません',
        });
      }

      // 3. 既にメンバーか確認
      if (project.members.some((m) => m.id === input.userId)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'このユーザーは既にメンバーです',
        });
      }

      // 4. メンバー追加
      const updated = await prisma.project.update({
        where: { id: input.projectId },
        data: {
          members: {
            connect: { id: input.userId },
          },
        },
        include: {
          members: {
            select: { id: true, name: true, avatar: true, email: true },
          },
        },
      });

      console.log(
        `[AUDIT] Member added: ${input.userId} to ${input.projectId} by ${ctx.user.id}`
      );

      return updated;
    }),
});
```

---

#### Step 2.2: メンバー削除API(所要時間:10分)

**このステップで学ぶこと**: オーナーのみがメンバー削除可能。

**なぜ必要?**: プロジェクトから退出するか、オーナーが削除するか、2つのケースを処理します。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/project.ts
const removeMemberSchema = z.object({
  projectId: z.string(),
  userId: z.string(),
});

export const projectRouter = createTRPCRouter({
  removeMember: protectedProcedure
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. プロジェクト取得
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: {
          id: true,
          ownerId: true,
          members: { select: { id: true } },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        });
      }

      // 2. 権限チェック
      // ケース1: オーナー → 誰でも削除可
      // ケース2: メンバー → 自分自身のみ削除(退出)可
      const isOwner = project.ownerId === ctx.user.id;
      const isOwnRemoval = input.userId === ctx.user.id;

      if (!isOwner && !isOwnRemoval) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'メンバーを削除する権限がありません',
        });
      }

      // 3. オーナーの削除を防止
      if (input.userId === project.ownerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'プロジェクトオーナーは削除できません',
        });
      }

      // 4. メンバー削除
      const updated = await prisma.project.update({
        where: { id: input.projectId },
        data: {
          members: {
            disconnect: { id: input.userId },
          },
        },
        include: {
          members: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      console.log(
        `[AUDIT] Member removed: ${input.userId} from ${input.projectId} by ${ctx.user.id}`
      );

      return updated;
    }),
});
```

---

### Part 3: プロジェクト詳細・統計(15分)

#### Step 3.1: プロジェクト統計API(所要時間:15分)

**このステップで学ぶこと**: 複数の集計クエリを並列実行。

**なぜ必要?**: ダッシュボード表示時に「○タスク完了」「△人のメンバー」などの統計情報が必要。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/project.ts
export const projectRouter = createTRPCRouter({
  getStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // 権限チェック
      const project = await prisma.project.findUnique({
        where: { id: input.id },
        select: { ownerId: true, members: { select: { id: true } } },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        });
      }

      const isMemberOrOwner =
        project.ownerId === ctx.user.id ||
        project.members.some((m) => m.id === ctx.user.id);

      if (!isMemberOrOwner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'アクセス権限がありません',
        });
      }

      // 並列で複数の統計情報を取得
      const [totalTasks, completedTasks, todoTasks, inProgressTasks] =
        await Promise.all([
          // 全タスク数
          prisma.task.count({
            where: { projectId: input.id },
          }),

          // 完了したタスク数
          prisma.task.count({
            where: { projectId: input.id, status: 'DONE' },
          }),

          // TODO のタスク数
          prisma.task.count({
            where: { projectId: input.id, status: 'TODO' },
          }),

          // 進行中のタスク数
          prisma.task.count({
            where: { projectId: input.id, status: 'IN_PROGRESS' },
          }),
        ]);

      // 完了率を計算
      const completionRate =
        totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      // ステータス別タスク取得(グラフ用)
      const tasksByPriority = await prisma.task.groupBy({
        by: ['priority'],
        where: { projectId: input.id },
        _count: {
          id: true,
        },
      });

      return {
        totalTasks,
        completedTasks,
        todoTasks,
        inProgressTasks,
        completionRate,
        tasksByPriority: tasksByPriority.map((item) => ({
          priority: item.priority,
          count: item._count.id,
        })),
      };
    }),
});
```

**複数クエリの並列実行**:
```typescript
// 順次実行(遅い): 4つのクエリを1つずつ
const total = await prisma.task.count(...)
const completed = await prisma.task.count(...)
const todo = await prisma.task.count(...)
const inProgress = await prisma.task.count(...)

// 並列実行(速い): 4つのクエリを同時に
const [total, completed, todo, inProgress] = await Promise.all([
  prisma.task.count(...),
  prisma.task.count(...),
  prisma.task.count(...),
  prisma.task.count(...),
])
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. **プロジェクト作成・一覧**
   - [ ] プロジェクト作成
   - [ ] オーナー自動設定
   - [ ] メンバー一覧表示

2. **メンバー管理**
   - [ ] メンバー追加(オーナーのみ)
   - [ ] メンバー削除(オーナー OR 自分自身のみ)
   - [ ] 重複チェック

3. **統計情報**
   - [ ] タスク統計(完了数、TODO数など)
   - [ ] 完了率計算
   - [ ] 優先度別集計

---

## まとめ

- **OR条件**: where { OR: [...] } でオーナー OR メンバーを確認
- **リレーション操作**: connect/disconnect でメンバー追加削除
- **権限チェック**: API毎に ownerId/members を確認
- **并列実行**: Promise.all で複数クエリを効率化
- **groupBy**: 集計データ取得(グラフ用)

次回(Day 12)はコメント機能・Week 2後半へ進みます。
