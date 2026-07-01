# Prisma Pro Patterns

- target version: `@prisma/client` / `prisma` `6.16.2`
- last updated: `2026-04-19`
- purpose: `30日カリキュラム Before/After セクションで使う Pro パターン参照資料`

`task-app` では [`prisma/schema.prisma`](/Users/kouiso/ghq/kouiso/task-app/prisma/schema.prisma:1) に `User` / `Project` / `ProjectMember` / `Task` / `Comment` を定義し、[`src/server/api/routers/`](/Users/kouiso/ghq/kouiso/task-app/src/server/api/routers/task.ts:1) から Prisma Client を直接呼んでいる。以下はその構成を活かしつつ、2026-04 時点の Prisma 6 系ベストプラクティスに合わせた Pro パターン。

## Pattern 1: relation を読むときは `include` で N+1 を避ける

[`src/server/api/routers/task.ts`](/Users/kouiso/ghq/kouiso/task-app/src/server/api/routers/task.ts:107) や [`src/server/api/routers/search.ts`](/Users/kouiso/ghq/kouiso/task-app/src/server/api/routers/search.ts:88) と同じ発想。タスク一覧で project / assignee / createdBy を別クエリにしない。

### Before
```ts
import { prisma } from '@/lib/prisma';

export async function getTaskCards(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    tasks.map(async (task) => {
      const project = await prisma.project.findUnique({
        where: { id: task.projectId },
      });
      const assignee = task.assigneeId
        ? await prisma.user.findUnique({
            where: { id: task.assigneeId },
          })
        : null;

      return {
        ...task,
        project,
        assignee,
      };
    }),
  );
}
```

### After
```ts
import { prisma } from '@/lib/prisma';

const USER_CARD_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
};

export async function getTaskCards(projectId: string) {
  return prisma.task.findMany({
    where: { projectId },
    include: {
      project: true,
      assignee: {
        select: USER_CARD_SELECT,
      },
      createdBy: {
        select: USER_CARD_SELECT,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

### Why
- 1 件ごとの追加 query を消せるため、件数が増えても待ち時間が伸びにくい。
- relation の取得条件が query 本体にまとまり、一覧 API の責務が読みやすい。
- Prisma の返却型が relation 込みで確定するので、client 側の型補完も安定する。

**該当Day**: Day 09, Day 13, Day 20

## Pattern 2: 一覧系は `select` を絞って返却 payload を細くする

[`src/server/api/routers/report.ts`](/Users/kouiso/ghq/kouiso/task-app/src/server/api/routers/report.ts:42) のように、統計画面では必要項目だけ取る方が良い。`include: true` は詳細画面向け。

### Before
```ts
import { prisma } from '@/lib/prisma';

export async function getOverviewProjects(projectIds: string[]) {
  return prisma.project.findMany({
    where: { id: { in: projectIds } },
    include: {
      members: {
        include: {
          user: true,
        },
      },
      tasks: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

### After
```ts
import { prisma } from '@/lib/prisma';

export async function getOverviewProjects(projectIds: string[]) {
  return prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          tasks: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

### Why
- report 用 API で不要な relation を返さず、レスポンス量を抑えられる。
- UI が必要とする形を query で明示でき、用途の違う画面への流用事故を減らせる。
- `select` された型だけが返るので、後続コードで存在しないプロパティに依存しにくい。

**該当Day**: Day 21, Day 22, Day 23

## Pattern 3: 複数書き込みは逐次 query ではなく `$transaction` にまとめる

`task-app` の project 作成や member 追加は今後 transaction 化しやすい。複数ステップの整合性が必要なら、配列 transaction か interactive transaction を選ぶ。

### Before
```ts
import { prisma } from '@/lib/prisma';

export async function createProjectWithOwner(userId: string, name: string, color: string) {
  const project = await prisma.project.create({
    data: {
      name,
      color,
    },
  });

  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId,
      role: 'OWNER',
    },
  });

  return project;
}
```

### After
```ts
import { ProjectMemberRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function createProjectWithOwner(userId: string, name: string, color: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name,
        color,
      },
    });

    await tx.projectMember.create({
      data: {
        projectId: project.id,
        userId,
        role: ProjectMemberRole.OWNER,
      },
    });

    return project;
  });
}
```

### Why
- project だけ作成されて member が無い、という中途半端な状態を防げる。
- 書き込みの境界が明確になり、業務ルールのまとまりがコードに表れる。
- 依存する複数 query を 1 つのユースケースとしてレビューしやすい。

**該当Day**: Day 10, Day 12, Day 27

## Pattern 4: enum は自前文字列ではなく `@prisma/client` から import する

[`schema.prisma`](/Users/kouiso/ghq/kouiso/task-app/prisma/schema.prisma:156) には `TaskStatus` / `TaskPriority` / `ProjectMemberRole` がある。server 側では Prisma enum を起点にした方が drift しにくい。

### Before
```ts
import { prisma } from '@/lib/prisma';

export async function addOwner(projectId: string, userId: string) {
  return prisma.projectMember.create({
    data: {
      projectId,
      userId,
      role: 'OWNER',
    },
  });
}
```

### After
```ts
import { ProjectMemberRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function addOwner(projectId: string, userId: string) {
  return prisma.projectMember.create({
    data: {
      projectId,
      userId,
      role: ProjectMemberRole.OWNER,
    },
  });
}
```

### Why
- schema 側の enum 変更と server 側の値ずれを防げる。
- typo 由来の不正値をコンパイル時に落とせる。
- Day 12 や Day 24 の権限実装で、役割定義の単一ソースを保ちやすい。

**該当Day**: Day 12, Day 24

## Pattern 5: 複合ユニーク制約は `where` の複合キーで引く

`task-app` の `ProjectMember` には `@@unique([userId, projectId])` がある。実際に [`src/server/api/routers/project.ts`](/Users/kouiso/ghq/kouiso/task-app/src/server/api/routers/project.ts:42) も `userId_projectId` で参照している。

### Before
```ts
import { prisma } from '@/lib/prisma';

export async function findMembership(userId: string, projectId: string) {
  return prisma.projectMember.findFirst({
    where: {
      userId,
      projectId,
    },
  });
}
```

### After
```ts
import { prisma } from '@/lib/prisma';

export async function findMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });
}
```

### Why
- DB 側のユニーク制約と query の意図が一致し、期待値が明確になる。
- `findFirst` より「1 件だけ存在する前提」をコードで表現できる。
- update / delete / upsert に同じ複合キーを使い回せる。

**該当Day**: Day 12, Day 18, Day 27

## Pattern 6: `findUnique + create` より `upsert` を優先する

ユーザー設定や membership のような「無ければ作る、あれば更新する」は `upsert` が素直。Prisma 6 系では単一 unique 条件なら DB native upsert に寄りやすい。

### Before
```ts
import { prisma } from '@/lib/prisma';

export async function saveProfile(userId: string, name: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user) {
    return prisma.user.update({
      where: { id: userId },
      data: { name },
    });
  }

  return prisma.user.create({
    data: {
      id: userId,
      name,
      email: `${userId}@example.com`,
    },
  });
}
```

### After
```ts
import { prisma } from '@/lib/prisma';

export async function saveProfile(userId: string, name: string) {
  return prisma.user.upsert({
    where: { id: userId },
    update: {
      name,
    },
    create: {
      id: userId,
      name,
      email: `${userId}@example.com`,
    },
  });
}
```

### Why
- 読み取りと書き込みの分岐を 1 query にまとめられる。
- race condition の余地を減らし、意図を短く表現できる。
- 教材では CRUD の派生として紹介しやすく、再利用パターンになりやすい。

**該当Day**: Day 06, Day 25

## Pattern 7: 一覧の後半ページは `skip/offset` ではなく cursor pagination を使う

現状の `task.getAll` は offset 方式だが、Day 20 の検索や Day 28 の大量データ前提では cursor 方式の方が安定しやすい。特に `updatedAt` や `id` による継続読込で効く。

### Before
```ts
import { prisma } from '@/lib/prisma';

export async function getMoreTasks(projectId: string, page: number) {
  const pageSize = 20;

  return prisma.task.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    skip: page * pageSize,
    take: pageSize,
  });
}
```

### After
```ts
import { prisma } from '@/lib/prisma';

export async function getMoreTasks(projectId: string, cursor?: string) {
  return prisma.task.findMany({
    where: { projectId },
    orderBy: { id: 'desc' },
    take: 20,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });
}
```

### Why
- 大きい offset ほど遅くなる問題を避けやすく、追加読込に向く。
- 削除や挿入が起きても、後続ページのズレが少ない。
- infinite scroll や「もっと見る」UI にそのまま載せやすい。

**該当Day**: Day 20, Day 28

## 適用マトリクス

| Pattern | Day |
|---|---|
| `include` で N+1 を避ける | Day 09, Day 13, Day 20 |
| `select` を絞る | Day 21, Day 22, Day 23 |
| `$transaction` にまとめる | Day 10, Day 12, Day 27 |
| Prisma enum を import する | Day 12, Day 24 |
| 複合キーで `where` を組む | Day 12, Day 18, Day 27 |
| `upsert` を優先する | Day 06, Day 25 |
| cursor pagination を使う | Day 20, Day 28 |
