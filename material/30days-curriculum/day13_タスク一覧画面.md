# Day 13: タスク一覧画面を作ろう

## 前回の振り返り

Day 12 ではプロジェクトへのメンバー追加・削除機能を実装しました。`addMember` / `removeMember` のtRPCルーターや権限チェックの仕組みを学んだので、今日はアプリの核となるタスク一覧画面の構築に取り組みます。

---

## 今日のゴール

タスクをカード形式で一覧表示し、プロジェクトやステータスでフィルタリングできるページを作ります。

この日は、まずサーバー側のタスク取得 API（`getAll` と `getById`）を自分で書きます。そのあと画面をつなぎます。

![タスク一覧画面（カードがグリッドで並んでいる）](./screenshots/task-list.png)

## なぜこれを作るのか

タスクは日々増えていきます。一覧で全体を見渡せて、絞り込みで目的のタスクにすぐたどり着けないと、件数が増えた途端に管理が立ち行かなくなります。だから最初に「探しやすい一覧」を用意します。

> 例え話: タスク一覧は「To-Doリストのホワイトボード」です。付箋（タスク）が貼ってあり、色（優先度）や列（ステータス）で整理されています。フィルターは「この列の付箋だけ見せて」というフィルタリング機能です。

### タスク一覧の構成

```mermaid
flowchart TD
    A[タスク一覧ページ] --> B[フィルター]
    A --> C[タスクカードのグリッド]
    B --> D[プロジェクト選択]
    B --> E[ステータス選択]
    C --> F[TaskCard コンポーネント]
    F --> G[ステータスBadge]
    F --> H[優先度Badge]
    F --> I[担当者アバター]
    F --> J[期限日]

    style A fill:#e3f2fd
    style C fill:#e8f5e9
    style F fill:#fff3e0
```

図の左にフィルター、右にカードのグリッドがぶら下がっています。今日はこの2つを別々に作ります。フィルターは「どのタスクを取ってくるか」を決める側、グリッドは「取ってきたタスクをどう並べるか」を決める側です。Day 09 のプロジェクト一覧は取得と表示だけでしたが、今日はその手前に絞り込みが1段増えます。`TaskCard` の下にステータス・優先度・担当者・期限が並んでいるのは、カード1枚を見れば状況を判断できるようにするためです。一覧をざっと眺めて「急ぎはどれか」がすぐ分かる状態を目指します。

### フィルタリングのデータフロー

```mermaid
flowchart TD
    A[ユーザーがフィルターを変更] --> B[state更新]
    B --> C[useQueryが再実行される]
    C --> D[サーバーから絞り込み結果を取得]
    D --> E[画面が自動更新される]

    style A fill:#e3f2fd
    style C fill:#fff3e0
    style E fill:#e8f5e9
```

注目してほしいのは、絞り込みがブラウザの中だけで終わっていない点です。選択を変えると state が更新され、`useQuery` はサーバーへ問い合わせ直します。手元の配列を `filter` で減らすやり方もあります。ただ、それだと絞り込む前の件数がそのまま通信量になります。`getAll` は一度に最大100件を返すので、ブラウザ側で減らす形だと、100件受け取ってから5件だけ表示する、という無駄が起きます。件数の上限をかけるのは絞り込みのあとにしたいので、絞り込み自体をサーバー側に置きます。

なお「自分が入っていないプロジェクトのタスクは渡さない」という線引きは、絞り込みとは別に Step 0 の `getAll` が受け持ちます。所属プロジェクトの一覧を先に引き、`where.projectId` をその範囲に固定してから問い合わせるので、画面がどんな条件を送っても範囲の外は返りません。

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| `api.task.getAll` でタスク取得 | タスクの作成（Day 14） |
| プロジェクト・ステータスでフィルター | ドラッグ＆ドロップ |
| TaskCard でカード表示 | タスク詳細ページ |
| レスポンシブなグリッドレイアウト | 作業時間の記録（Day 16） |
| | 絞り込み条件の URL 保存（再読み込みで条件は初期化されます） |
| | 優先度セレクトの設置（サーバー側は Step 0 で用意しますが、画面には置きません） |

### 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| フィルタリング | --- | データを条件で絞り込む | ホワイトボードの特定の列だけ見る |
| TaskCard | タスク・カード | タスク1件分の表示コンポーネント | 1枚の付箋 |
| 三項演算子 | さんこうえんざんし | `条件 ? 真の値 : 偽の値` の書き方 | 「もし雨なら傘、晴れなら帽子」 |
| Suspense（Day 09 の復習） | サスペンス | データ読み込み中のフォールバック表示 | 「ただいま準備中」の看板 |

### 今日の作業ファイル

```
src/
  app/task/
    page.tsx              ... タスク一覧ページ（新規作成）
  component/task/
    task-card.tsx          ... タスクカード（既存）
    task-detail-dialog.tsx ... タスク詳細ダイアログ（既存）
  component/ui/
    loading-spinner.tsx    ... ローディング表示（既存）
  lib/constant/
    status.ts             ... ステータス定義・型ガード（既存）
```

新しく作るのは `src/app/task/page.tsx` の1枚だけです。`task-card.tsx` と `loading-spinner.tsx` は前の Day までに用意した部品で、今日は呼び出す側を書きます。カードの見た目まで今日ゼロから作ろうとすると、覚えることが一度に増えて手が止まります。表示部品はすでにあるものを使い、「サーバーから取ってきて、絞り込んで、並べる」という流れの理解に集中してください。`status.ts` にはステータスの日本語ラベルと型ガード（値が想定の種類かを確かめる関数）が入っていて、Step 3 と Step 4 で使います。

### 完成ファイルの全体像

最終的に `src/app/task/page.tsx` は以下の構造になります。Step 1〜7 で少しずつ組み立てていきます。

| セクション | 内容 | 対応Step |
|-----------|------|---------|
| import群 | コンポーネント・ライブラリの読み込み | Step 1, 2, 3, 6, 7 |
| `TaskPageContent` 関数 | state定義・データ取得・ハンドラー・JSX | Step 1〜7 |
| `TaskPage` 関数（default export） | Suspenseでラップして公開 | Step 1 |

## 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 0 | タスク取得 API（getAll・getById）を自分で書く | 20分 |
| Step 1 | ページの土台を作る | 5分 |
| Step 2 | タスクデータを取得する | 5分 |
| Step 3 | フィルター用のstateとimportを追加する | 5分 |
| Step 4 | フィルターUIを作る | 7分 |
| Step 5 | フィルター条件をAPIに渡す | 5分 |
| Step 6 | TaskCardでタスクを表示する | 7分 |
| Step 7 | タスク詳細ダイアログを追加する | 7分 |
| Step 8 | 動作確認 | 4分 |

**合計時間**: 約65分です。

この時間はコードを読んで理解する目安です。写経して打ち込む時間、詰まって調べる時間は別に見てください。

---

### Step 0: タスク取得 API（getAll・getById）を自分で書く（20分）

**ゴール**: タスク一覧を返す `getAll` と、詳細ダイアログで1件を返す `getById` を自分で書き、`root.ts` に登録して、画面から両方を呼べる状態にします。

一覧画面には、サーバーが持っているタスクを画面まで運んでくる入口が必要です。その入口を、今日は自分の手で1つ作ります。Day 09 でプロジェクト一覧の `getAll` を書いたのと同じ流れです。

#### tRPC の手続きは3つの部品でできている（復習）

Day 09 で見たとおり、tRPC の手続き（procedure）はいつも同じ3部品の組み合わせです。今日の `getAll` も、この型に当てはめるだけです。

| 部品 | 役割 | `task.getAll` での中身 |
|------|------|----------------------|
| 入力（input） | クライアントから何を受け取るか。`z` で形を検証する | プロジェクト・ステータス・担当者などの絞り込み条件 |
| 処理（query） | 受け取った条件で DB に問い合わせる | Prisma でタスクを検索する |
| 戻り値（return） | 画面に返すデータ | タスクの配列 |

今日は一覧取得の `getAll` に加えて、Step 7 の詳細ダイアログが呼ぶ `getById` も書きます。`create` や `update` は、それを実際に使う Day 14 以降で1つずつ足していきます。

#### 0-1. まず import から

`src/server/api/routers/task.ts` を新規作成し、先頭に import を書きます。

```typescript
// filepath: src/server/api/routers/task.ts
import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { taskPrioritySchema, taskStatusSchema } from '@/lib/constant/query';
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import {
  assertMemberPermission,
  getUserProjectIds,
} from './_helpers/permission';
import { USER_SELECT } from './_helpers/select';
```

import は「これから使う道具を最初に並べておく」宣言です。`Prisma` は `where`（検索条件）の型注釈に使います。`taskStatusSchema` と `taskPrioritySchema` は、この画面でも使うステータス・優先度の検証ルールです。`protectedProcedure` はログイン済みの人だけが呼べる手続きを作る道具、`prisma` は DB に問い合わせる道具です。`getUserProjectIds` は「ログイン中のユーザーがメンバーになっているプロジェクトの id 一覧」を返す共有ヘルパーです。`assertMemberPermission` は、このあと `getById` で取得したタスクを自分が閲覧できるか確認します。`USER_SELECT` は返してよいユーザー項目だけを選びます。

#### 0-2. 手続きの骨組みと入力を書く

`getAll` の骨組みを書きます。`protectedProcedure` で始めると、ログインしていない人がこの API を呼んだときに自動で弾かれます。`.input(...)` では受け取る絞り込み条件を定義します。

```typescript
// filepath: src/server/api/routers/task.ts（続き）
export const taskRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().cuid().optional(),
          status: taskStatusSchema.optional(),
          priority: taskPrioritySchema.optional(),
          assigneeId: z.string().cuid().optional(),
          limit: z.number().int().min(1).max(100).default(100),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TaskWhereInput = {};
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;
```

各項目に `.optional()` が付いているのは、その項目を省略してよいという意味です。いちばん外側にも `.optional()` があるので、条件オブジェクトごと渡さずに呼ぶこともできます。`limit` と `offset` は一度に取りすぎないための件数と開始位置で、`.int()` により小数を拒否し、`.default(...)` で既定値を持たせています。`.query(...)` の中の `ctx` にはログイン中のユーザー情報が入り、`input` には今定義した条件が入ってきます。`where` は、このあと組み立てる検索条件を入れておく変数です。

#### 0-3. ここが一番のヤマ場（自分のプロジェクトのタスクだけ返す）

ここが `getAll` で最も気をつける部分です。タスクはプロジェクトにぶら下がるので、「自分がメンバーのプロジェクトのタスクだけ」を返さないと、他人のタスクまで見えてしまいます。

```typescript
// filepath: src/server/api/routers/task.ts（続き）
      const projectIds = await getUserProjectIds(ctx.session.userId);

      where.projectId = { in: projectIds };

      if (input?.projectId) {
        if (!projectIds.includes(input.projectId)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'このプロジェクトへのアクセス権限がありません',
          });
        }
        where.projectId = input.projectId;
      }
```

`getUserProjectIds` で自分が入っているプロジェクトの id 一覧を取り、`where.projectId = { in: projectIds }` で「その中のどれかに属するタスク」に絞ります。`input.projectId` で特定のプロジェクトを指定されたときは、それが自分の一覧に含まれるかを確認し、含まれないなら `TRPCError` を `throw` して処理を打ち切ります。`throw` は「これ以上は進めない」とその場で処理を止める命令です。この確認を挟まないと、他人のプロジェクト id を渡すだけで中身が覗けてしまいます。

#### 0-4. 残りの絞り込み条件を足す

弾く条件を通過したら、ステータス・優先度・担当者の絞り込みを足します。

```typescript
// filepath: src/server/api/routers/task.ts（続き）
      if (input?.status) where.status = input.status;
      if (input?.priority) where.priority = input.priority;
      if (input?.assigneeId) where.assigneeId = input.assigneeId;
```

3つとも、値が渡されたときだけ `where` に足します。未指定なら足さないので、その条件では絞り込まれず、対象は広いままです。ここが効いてくるのは Step 5 で、画面で「すべて」を選ぶと `undefined` が渡り、サーバーはその条件を無視して全件を返します。気をつけたいのは、この3行が権限の判定を一切していない点です。ステータスや担当者で自由に絞り込めるのは、0-3 で `where.projectId` を自分のプロジェクトに限定した後だからです。もし 0-3 を書き忘れると、ここは素通しになり、他人のタスクまで `status` の一致だけで返ってきます。

#### 0-5. Prisma でタスクを取得する

組み立てた `where` を使って、Prisma で一覧を取得します。画面はプロジェクト名・担当者・コメントを表示するので、関連するデータも `include` で一緒に取ってきます。

```typescript
// filepath: src/server/api/routers/task.ts（続き）
      return await prisma.task.findMany({
        where,
        include: {
          project: true,
          createdBy: {
            select: USER_SELECT,
          },
          assignee: {
            select: USER_SELECT,
          },
```

ここまでで `project`・`createdBy`・`assignee` の3つを一緒に取る指定を書きました。ブロックが長いので、残りは次に分けます。行末が `,` のままで `include` の中括弧も閉じていないのは、まだ途中だからです。エディタが赤い波線を出しても、この時点では正しい状態です。`createdBy` と `assignee` に `USER_SELECT` を挟んでいるのは、`assignee: true` と書くとハッシュ化済みパスワードを含む全項目が画面まで返ってしまうためです。続きをそのまま下へ書き足してください。

```typescript
// filepath: src/server/api/routers/task.ts（続き）
          comments: {
            include: {
              user: {
                select: USER_SELECT,
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
```

`include` は関連するデータも一緒に取ってくる指定です。`project` はタスクの所属プロジェクト、`createdBy` と `assignee` は作成者と担当者で、どちらも `USER_SELECT` で必要な項目だけに絞り、パスワードなどは返しません。`comments` はコメントとその投稿者を新しい順に取ります。こうして関連を一緒に取っておくと、画面側は追加の通信なしで表示できます。今日のカードが使うのは担当者だけですが、同じ `getAll` は Day 17 のマイタスクや Day 20 の検索からも呼ばれます。呼ぶ画面ごとに取る項目を変えると、手続きが画面の数だけ増えていきます。

ただし、いま必要のない `comments` まで取っている点は覚えておいてください。一覧に100件並べば、その100件ぶんのコメント本文が毎回運ばれます。件数が増えてから効いてくる種類の重さです。実務では、一覧用と詳細用で取る範囲を分けます。

#### 0-6. 並び順と件数を指定して返す

最後に、並び順と取得件数を付けて閉じます。

```typescript
// filepath: src/server/api/routers/task.ts（続き）
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      });
    }),
```

`orderBy` は `position`（並べ替え用の番号）の昇順で、同じなら作成日の新しい順にします。`take` と `skip` は取得件数と開始位置の指定です。ここでは `}),` で `getAll` までを閉じ、次の手続きを続けられる状態にします。並び順を指定しないと、DB が返す順序は保証されません。読み込むたびにカードの位置が入れ替わって見えるので、`orderBy` は必ず付けます。`take` で上限を置くのは、タスクが数千件へ育った状態で全件をまとめて送り、画面が固まるのを防ぐためです。

#### 0-7. 詳細ダイアログ用の getById を書く

Step 7 で配置する `TaskDetailDialog` は、選択した1件を `api.task.getById` で取得します。画面を置く前に API を用意して、Day 13 の終了時点で型チェックと詳細表示の両方が成立するようにします。`getAll` の直後へ追加してください。

```typescript
// filepath: src/server/api/routers/task.ts（getAll の直後に追加）
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const task = await prisma.task.findUnique({
        where: { id: input.id },
        include: {
          project: {
            include: {
              members: {
                where: { userId: ctx.session.userId },
              },
            },
          },
          createdBy: {
            select: USER_SELECT,
          },
          assignee: {
            select: USER_SELECT,
          },
```

`getById` の `include` も、ここでいったん切ります。`getAll` と違うのは `project` の取り方で、`members` を `ctx.session.userId` で絞って一緒に取っています。この1件を見るだけで「自分がこのタスクのプロジェクトに入っているか」が分かる形です。判定の材料をタスクと同じ問い合わせで取っておくと、DB への往復が1回で済みます。`where: { userId: ctx.session.userId }` を落とすと members が全員分返り、後の判定が「誰かがメンバーなら通す」に化けます。残りのコメント部分は次に続けます。

```typescript
// filepath: src/server/api/routers/task.ts（getById の続き）
          comments: {
            include: {
              user: {
                select: USER_SELECT,
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
```

`});` で `findUnique` の呼び出しが閉じ、結果が `task` に入りました。ただし、まだ返してはいけません。`findUnique` は見つからないときに例外ではなく `null` を返すからです。Day 09 の `getAll` は配列を返すので0件でも困りませんでしたが、1件を返す `getById` は「無い」と「見てはいけない」を自分で分ける必要があります。次のブロックがその2つの入口です。

```typescript
// filepath: src/server/api/routers/task.ts（続き）
      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      assertMemberPermission(task.project.members);

      return task;
    }),
});
```

`getById` でも project の members をログインユーザーに絞って取得し、`assertMemberPermission` で閲覧権限を確認します。コメントも一緒に返すので、詳細ダイアログは別の通信を増やさず表示できます。最後の `});` で `taskRouter` 全体を閉じます。

**確認ポイント**:
- `src/server/api/routers/task.ts` に `getAll` と `getById` を書き、`}),` と `});` まで閉じた
- `getUserProjectIds` を使って自分のプロジェクトのタスクだけに絞っている
- `getById` でも `assertMemberPermission` で閲覧権限を確認している
- `npm run dev` で型エラーが出ていない（この API を画面から呼ぶのは Step 2 以降なので、今は起動時にエラーが出なければよい）

#### 0-8. root.ts に task ルーターを登録する

`taskRouter` を書いただけでは、まだ画面から呼べません。作った router を `root.ts` に登録して、初めて `api.task.getAll` と `api.task.getById` という呼び名が生まれます。Day 09 で `project` を登録したのと同じ形です。

```typescript
// filepath: src/server/api/root.ts
import { authRouter } from './routers/auth';
import { projectRouter } from './routers/project';
import { taskRouter } from './routers/task';
import { createCallerFactory, createTRPCRouter } from './trpc';

export const appRouter = createTRPCRouter({
  auth: authRouter,
  project: projectRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
```

`appRouter` に `task: taskRouter` を足したことで、フロント側の `api.task.getAll` と `api.task.getById` が手続きにつながります。今の `root.ts` には auth・project・task の3つが並びます。`comment` や `search` などは、それを使う Day で1つずつ足していきます。

**確認ポイント**:
- `root.ts` に `taskRouter` の import と `task: taskRouter` の2行を追加した
- `npm run dev` で型エラーが出ていない

---

### Step 1: ページの土台を作る（5分）

**ゴール**: タスク一覧ページの基本構造を作ります。

**実装**:

先に Day 08 のサイドバーへタスク導線を追加します。
`lucide-react` の既存 import に
`ClipboardList` を加えてください。

```typescript
// filepath: src/component/layout/app-layout.tsx
import {
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  ListTodo,
  LogOut,
} from 'lucide-react';
```

`ClipboardList` は、サイドバーに置くタスク項目のアイコンです。すでにある `FolderOpen` などと同じ `lucide-react` から、まとめて読み込みます。この1行を足し忘れると、次のコードで `ClipboardList is not defined` というエラーになり、サイドバーごと表示されなくなります。import は「これから使う道具を先に並べる」宣言なので、部品を増やすたびにファイルの先頭へ戻る癖をつけてください。続く `menuItems` は既存の項目を残したまま、タスクを加えた次の4項目にします。

```typescript
// filepath: src/component/layout/app-layout.tsx
const menuItems: MenuItem[] = [
  {
    text: 'ダッシュボード',
    icon: <LayoutDashboard className="h-5 w-5" />,
    path: '/dashboard',
  },
  {
    text: 'プロジェクト',
    icon: <FolderOpen className="h-5 w-5" />,
    path: '/project',
  },
  {
    text: 'マイタスク',
    icon: <ListTodo className="h-5 w-5" />,
    path: '/my-task',
  },
  {
    text: 'タスク',
    icon: <ClipboardList className="h-5 w-5" />,
    path: '/task',
  },
];
```

`menuItems` は配列なので、要素を1つ足すだけでサイドバーのリンクが1本増えます。Day 08 で作った仕組みへ手を入れずに済むのは、項目をコードの中に直接書かず、配列にまとめてあるからです。`path` の `/task` は、このあと作る `src/app/task/page.tsx` の URL と一致している必要があります。App Router はフォルダの並びをそのまま URL にするので、`/tasks` と書き間違えるとクリックしても404ページに飛びます。

`src/app/task/page.tsx` を新規作成します。まずインポートとメインコンテンツの骨格です。

```typescript
// filepath: src/app/task/page.tsx
// クライアントコンポーネント宣言とimport
'use client';

import { Suspense, useState } from 'react';
import { AppLayout }
  from '@/component/layout/app-layout';
import { PageLoadingSpinner }
  from '@/component/ui/loading-spinner';
```

`'use client'` は、このファイルをブラウザ側で動くコンポーネントとして扱う宣言です。App Router のページは既定でサーバー側だけで動くので、この1行が無いと `useState` を書いた瞬間にエラーが出ます。今日はフィルターの選択を state で覚えるため、宣言が要ります。読み込んでいる4つのうち `Suspense` と `useState` は React の機能、`AppLayout` と `PageLoadingSpinner` は自分たちで作った部品です。

**確認ポイント**:
- ファイルが `src/app/task/page.tsx` に作成された
- `'use client'` が先頭にある

続いて、ページの骨格を定義します。`TaskPageContent` がメインコンテンツ、`TaskPage` がページのエントリーポイントです。

```typescript
// filepath: src/app/task/page.tsx
// メインコンテンツの骨格
function TaskPageContent() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold
          tracking-tight">
          タスク
        </h1>
      </div>
    </AppLayout>
  );
}
```

中身はまだ見出しだけです。`AppLayout` を外側に置くと、このページにもサイドバーとヘッダーが付き、Day 08 で作った導線から行き来できます。先に空の器を作って表示を確かめてから中身を足すと、うまくいかないときに原因の場所を絞れます。この段階で画面が真っ白なら、疑うのはデータ取得ではなく、ファイルの置き場所か `export` の書き方です。

**確認ポイント**:
- `TaskPageContent` 関数が定義できた
- `AppLayout` でラップしている

`TaskPage` は `Suspense` で `TaskPageContent` をラップします。`useSearchParams`（Step 7で追加）はApp Routerのクライアントコンポーネントで使う場合、`Suspense` 境界が必要です。読み込み中は `PageLoadingSpinner` を表示します。

```typescript
// filepath: src/app/task/page.tsx
// ページ本体（Suspenseでラップ）
export default function TaskPage() {
  return (
    <Suspense
      fallback={<PageLoadingSpinner />}>
      <TaskPageContent />
    </Suspense>
  );
}
```

`export default` を付けた関数が、そのファイルのページ本体です。`TaskPageContent` をそのまま default にせず `Suspense` で包むのは、Step 7 で `useSearchParams` を使うからです。`useSearchParams` を含むコンポーネントを `Suspense` の外に置くと、ビルド時に境界が無いというエラーで止まります。今は中身が軽いのでスピナーはほとんど見えませんが、先に器を用意しておけば Step 7 でここを書き直さずに済みます。

**確認ポイント**:
- `/task` にアクセスして「タスク」と表示される
- サイドバーの「タスク」から開ける

---

### Step 2: タスクデータを取得する（5分）

**ゴール**: `useQuery` でタスク一覧を取得します。

**実装**:

ファイル先頭のimport群に以下を追加します。

```typescript
// filepath: src/app/task/page.tsx
// import群に追加
import { api } from '@/trpc/react';
```

`@/trpc/react` の `api` は、Step 0 で書いたサーバー側の手続きへ、型を保ったままつながる入口です。`api.task.getAll` と打った時点でエディタが引数の形を教えてくれるのは、`root.ts` に登録した `appRouter` の型がそのまま画面側へ届いているからです。URL を文字列で組み立てないので、綴りを間違えれば通信の前に赤い波線が出ます。

**確認ポイント**:
- `api` のインポートが追加できた

次に `TaskPageContent` 関数の先頭（`return` の前）に以下を追加します。

```typescript
// filepath: src/app/task/page.tsx
// TaskPageContent関数の先頭に追加
const { data: tasks,
  isLoading: tasksLoading,
} = api.task.getAll.useQuery(
  {},
  { refetchOnWindowFocus: false },
);
```

`useQuery` は呼んだ時点でサーバーへ問い合わせ、結果を `data` に、読み込み中かどうかを `isLoading` に入れて返します。`data: tasks` と書いているのは、名前を付け替えて受け取るためです。この画面ではプロジェクトも取得するので、どちらも `data` のままでは名前がぶつかります。

**確認ポイント**:
- `api` をインポートしてエラーが出ていない
- `useQuery` に空オブジェクト `{}` を渡している

> `useQuery({})` の `{}` は「条件なしで全件取得」という意味です。後のステップでここにフィルター条件を入れます。`refetchOnWindowFocus: false` は、ブラウザタブを切り替えても再取得しない設定です。

フィルターの選択肢に並べるため、プロジェクト一覧も取得します。

```typescript
// filepath: src/app/task/page.tsx
// TaskPageContent内に追加
const { data: projects } =
  api.project.getAll.useQuery();
```

Day 09 で書いた `project.getAll` を、そのまま呼び直しています。一度サーバーに置いた手続きは、別の画面からでも同じ呼び方で使えます。ここで取ったプロジェクトは Step 4 のドロップダウンの選択肢になり、Step 6 では自分のロール（プロジェクト内での権限の種類）を調べるのにも使います。引数を渡していないのは、`project.getAll` の入力がすべて省略できる形だからです。

**確認ポイント**:
- `projects` のデータ取得が追加できた

ローディング中はスピナーを表示します。`return` 文の直前に追加してください。

```typescript
// filepath: src/app/task/page.tsx
// return文の直前に追加
if (tasksLoading) {
  return (
    <AppLayout>
      <PageLoadingSpinner />
    </AppLayout>
  );
}
```

`tasksLoading` が `true` の間、`tasks` はまだ `undefined` です。この早期 return を置かずに先へ進むと、Step 6 で書く `tasks.map(...)` が `undefined` に対して呼ばれ、`Cannot read properties of undefined` で画面が落ちます。`return` でそこまで到達させないのが、いちばん確実な防ぎ方です。スピナーも `AppLayout` で包むのは、読み込み中にサイドバーとヘッダーが消えて画面が跳ねるのを避けるためです。Day 09 のプロジェクト一覧でも同じ形を書きました。

**確認ポイント**:
- データ取得中にスピナーが表示される
- 取得完了後、ページ内容に切り替わる

#### task.getAll のパラメータ

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `projectId` | `string?` | プロジェクトで絞り込み |
| `status` | `TaskStatus?` | ステータスで絞り込み |
| `assigneeId` | `string?` | 担当者で絞り込み |
| `limit` | `number?` | 取得件数（デフォルト100） |
| `offset` | `number?` | 取得開始位置（デフォルト0） |

---

### Step 3: フィルター用のstateとimportを追加する（5分）

**ゴール**: フィルターUIに必要なインポートとstateを準備します。

**実装**:

ファイル先頭のimport群に以下を追加します。

```typescript
// filepath: src/app/task/page.tsx
// import群に追加（フィルター用）
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/component/ui/select';
import {
  isTaskStatus,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from '@/lib/constant/status';
```

`Select` は shadcn/ui のドロップダウンで、5つの部品を組み合わせて1つの選択欄になります。`TASK_STATUS_LABELS` はステータスの値と日本語の見出しを対応させた表で、画面に `IN_PROGRESS` と出さず「進行中」と出すために使います。`isTaskStatus` は、受け取った文字列がステータスとして正しいかを確かめる関数です。`@prisma/client` から型を直接引かないのは、画面側のコードが DB の都合へ引きずられない形を保つためです。

**確認ポイント**:
- `isTaskStatus` 型ガードもインポートしている
- インポート元が `@/lib/constant/status`（`@prisma/client` ではない）

フィルター用の state を `TaskPageContent` 関数の先頭に追加します。

```typescript
// filepath: src/app/task/page.tsx
// TaskPageContent関数の先頭に追加
const [filterProject, setFilterProject] =
  useState<string>('all');
const [filterStatus, setFilterStatus] =
  useState<TaskStatus | 'all'>('all');
```

`useState` は「画面が覚えておく値」を作る関数です。初期値を `'all'` にするのは、開いた直後は絞り込みなしで全件を見せたいからです。`filterStatus` の型を `TaskStatus | 'all'` と書くのは、選べる値がステータスのどれか、または「すべて」の2種類しか無いと決めるためです。ここを `string` にすると、綴りを間違えた値を入れてもエディタは何も言わず、絞り込んだ結果が黙って0件になります。

**確認ポイント**:
- `filterProject` と `filterStatus` の state が追加された
- 初期値はどちらも `'all'`（全件表示）

---

### Step 4: フィルターUIを作る（7分）

**ゴール**: プロジェクトとステータスの選択UIを作ります。

**実装**:

`<h1>` タグの直下に追加します。プロジェクト選択のドロップダウンです。

```typescript
{/* filepath: src/app/task/page.tsx */}
{/* h1タグの直下に追加: フィルター外枠 */}
<div className="flex gap-2 w-full
  sm:w-auto ml-auto">
  <div className="w-[200px]">
    <Select value={filterProject}
      onValueChange={setFilterProject}>
      <SelectTrigger
        aria-label="プロジェクトで絞り込み">
        <SelectValue placeholder=
          "すべてのプロジェクト" />
      </SelectTrigger>
    </Select>
  </div>
</div>
```

`SelectTrigger` に `aria-label` を付けているのは、この絞り込みに画面上の見出しが無いためです。`placeholder` は値を選んだ時点で消えるので、選んだあとは何の絞り込みか分からなくなります。読み上げソフトを使う人には、選んだ値だけが読まれます。

`value` に state を渡し、`onValueChange` で state を書き換えます。選ばれている値の置き場所を state の1か所にまとめると、画面の見た目と手元の値がずれません。`ml-auto` は、この操作欄を見出しの反対側へ寄せる指定です。`w-full` は外枠を横いっぱいに広げる指定です。`sm:w-auto` は、画面が広いときだけ外枠を中身の幅に戻します。中の `Select` は `w-[200px]` で固定してあるので、画面幅が変わっても操作欄そのものの大きさは変わりません。

**確認ポイント**:
- `Select` の `value` に `filterProject` state を渡している
- JSXが閉じタグまで完結している

プロジェクト選択の `SelectContent` を `SelectTrigger` の直後に追加します。

```typescript
{/* filepath: src/app/task/page.tsx */}
{/* SelectTriggerの直後に追加 */}
<SelectContent>
  <SelectItem value="all">
    すべてのプロジェクト
  </SelectItem>
  {projects?.map((p) => (
    <SelectItem key={p.id} value={p.id}>
      {p.name}
    </SelectItem>
  ))}
</SelectContent>
```

選択肢の中身は、Step 2 で取得した `projects` から作ります。プロジェクトが増えても手で書き足さずに済むのは、`.map()` が配列の要素1つにつき `SelectItem` を1つ返すからです。先頭の「すべてのプロジェクト」だけは配列に無い値なので、手で1行書いています。`projects?.` の `?.` は、まだ取得できていない `undefined` の状態で `.map()` を呼んで落ちるのを防ぐ書き方です。

**確認ポイント**:
- 「すべてのプロジェクト」が先頭にある
- プロジェクト名が動的に表示される

続いてステータス選択です。プロジェクト選択の `</div>` の直後に2つ目の `<div>` を追加します。`isTaskStatus` 型ガードを使って安全に値を設定します。

```typescript
{/* filepath: src/app/task/page.tsx */}
{/* ステータス選択 */}
<div className="w-[200px]">
  <Select value={filterStatus}
    onValueChange={(value) => {
      if (value === 'all'
        || isTaskStatus(value))
        setFilterStatus(value);
    }}>
    <SelectTrigger>
      <SelectValue placeholder=
        "すべてのステータス" />
    </SelectTrigger>
  </Select>
</div>
```

`onValueChange` が受け取る値は、shadcn/ui の都合でただの `string` です。そのまま `setFilterStatus(value)` と書くと型が合わず、`as TaskStatus` で黙らせたくなります。ただ、それは中身を確かめずに正しいと言い張る書き方なので、想定外の文字列がそのままサーバーへ飛びます。`isTaskStatus(value)` を通せば、確かめて真だったときだけ代入されるため、型と実際の値がそろいます。

**確認ポイント**:
- `as` キャストではなく `isTaskStatus()` 型ガードで安全に判定している
- `'all'` も許可している

ステータスの `SelectContent` を `SelectTrigger` の直後に追加します。

```typescript
{/* filepath: src/app/task/page.tsx */}
{/* ステータスSelectTriggerの直後に追加 */}
<SelectContent>
  <SelectItem value="all">
    すべてのステータス
  </SelectItem>
  {Object.entries(
    TASK_STATUS_LABELS
  ).map(([value, label]) => (
    <SelectItem key={value} value={value}>
      {label}
    </SelectItem>
  ))}
</SelectContent>
```

`Object.entries` は、`TASK_STATUS_LABELS` のような対応表を `[値, 見出し]` の配列へ並べ替える関数です。`value` を `SelectItem` の値に、`label` を画面の文字にすれば、ステータスが増えたときも `status.ts` の表へ1行足すだけで選択肢に出ます。ステータスの一覧をこの画面の中へ書き写すと、後で表を直したときに片方だけ古いまま残ります。

**確認ポイント**:
- プロジェクトとステータスの2つのドロップダウンが並んで表示される
- タスクのカードはまだ1枚も出ない（カードを並べるのは Step 6）

---

### Step 5: フィルター条件をAPIに渡す（5分）

**ゴール**: 選択したフィルターでAPIリクエストを変更します。

**実装**:

Step 2で追加した `useQuery` を、フィルター付きに書き換えます。三項演算子（さんこうえんざんし）は `条件 ? 真の値 : 偽の値` という書き方です。「もし `'all'` なら `undefined`、それ以外なら値をそのまま」という意味です。

```typescript
// filepath: src/app/task/page.tsx
// Step 2のuseQueryを書き換え
const {
  data: tasks,
  isLoading: tasksLoading,
} = api.task.getAll.useQuery(
  {
    projectId: filterProject === 'all'
      ? undefined : filterProject,
    status: filterStatus === 'all'
      ? undefined : filterStatus,
  },
  { refetchOnWindowFocus: false },
);
```

ここで渡す `projectId` は、Step 0 の 0-3 が受け取る値です。ドロップダウンには自分のプロジェクトしか並びませんが、サーバーはその前提を信用しません。通信を書き換えて他人のプロジェクト id を送っても、`projectIds.includes(...)` の確認で弾かれ、タスクの代わりに FORBIDDEN が返ります。画面の絞り込みは見やすさのための道具で、見せてよい範囲を決めているのはサーバーです。

**確認ポイント**:
- プロジェクトを選択すると表示が絞り込まれる（初期データでは参加プロジェクトが1つなので件数は変わりません）
- 「すべて」を選ぶと全タスクが表示される

> `'all'` の場合に `undefined` を渡すと「この条件は使わない」という意味になり、サーバーは全件を返します。フィルターの選択が変わるたびにReactが `useQuery` を再実行し、画面が自動更新されます。

![フィルタリング後のタスク一覧（ステータスを完了に絞った状態）](./screenshots/task-list-filtered.png)

---

### Step 6: TaskCardでタスクを表示する（7分）

**ゴール**: 各タスクをカード形式でグリッド表示します。

**実装**:

ファイル先頭のimport群に以下を追加します。

```typescript
// filepath: src/app/task/page.tsx
// import群に追加（TaskCard用）
import { TaskCard }
  from '@/component/task/task-card';
```

`TaskCard` は Day 09 の `ProjectCard` と同じ考え方の表示部品で、1件分のデータを props で受け取り、カード1枚を返します。中身を今日書かないのは、一覧ページ側の仕事が「取ってきて並べる」ことだからです。表示の細かい調整をカードの中へ閉じ込めておくと、この先で見た目を変えたくなっても直す場所が1か所で済みます。

**確認ポイント**:
- `TaskCard` のインポートが追加できた

ハンドラーを仮実装します。`TaskPageContent` 関数内、`return` 文の前に追加してください。クリック・編集・削除は後のDayで本実装に差し替えます。

```typescript
// filepath: src/app/task/page.tsx
// TaskPageContent内に仮ハンドラーを追加
const handleTaskClick =
  (taskId: string) => {
    void taskId;
  };
const handleEdit =
  (taskId: string) => {
    void taskId;
  };
const handleDelete =
  (taskId: string) => {
    void taskId;
  };
```

**確認ポイント**:
- 3つのハンドラーが定義できた
- Step 7 で `handleTaskClick` を本実装に差し替える

> TaskCardは `timeSpentMinutes`（合計作業時間）という作業時間まわりのpropも受け取れますが、作業時間の記録はDay 16で扱うので今日は渡しません。

TaskCardには編集・削除ボタンが付いています。ボタンを表示するかどうかは、ログインユーザーがそのタスクの属するプロジェクトで何のロールかによって決まります。まずログインユーザーの情報を取得し、import群に追加してください。

```typescript
// filepath: src/app/task/page.tsx
// import群に追加（権限判定用）
// react は Step 1 で書いた行に足します。新しい行は増やしません。
import { Suspense, useCallback, useMemo, useState }
  from 'react';
import {
  hasPermission, isProjectMemberRole,
  type ProjectMemberRole,
} from '@/lib/constant/roles';
```

`useMemo`（計算した結果を覚えておく仕組み）と `useCallback`（作った関数を覚えておく仕組み）は、必要のない作り直しを避けるための道具です。`hasPermission` と `isProjectMemberRole` は Day 12 で書いたもので、ロールから何ができるかを判定します。サーバー側と同じ関数をここでも読み込むのが要点で、判定の基準を2か所に書き分けないためです。基準が分かれると、画面ではボタンが見えるのにサーバーは拒む、といったちぐはぐな状態になります。

続けて、`TaskPageContent` 内にログインユーザーの情報とプロジェクトごとのロールを求める処理を追加します。`tasks` の `useQuery` の近くに置いてください。

```typescript
// filepath: src/app/task/page.tsx
// ログインユーザーとプロジェクトごとのロールを求める
const { data: session } =
  api.auth.getSession.useQuery();

// プロジェクトごとのログインユーザー自身のロールを引けるようにする
const myRoleByProject = useMemo(() => {
  const map = new Map<string, ProjectMemberRole>();
  const userId = session?.user?.id;
  if (!userId || !projects) {
    return map;
  }
  for (const project of projects) {
    const me = project.members?.find(
      (member) => member.userId === userId,
    );
    if (me && isProjectMemberRole(me.role)) {
      map.set(project.id, me.role);
    }
  }
  return map;
}, [projects, session?.user?.id]);
```

> `myRoleByProject` はプロジェクトIDをキーに「自分がそのプロジェクトで何のロールか」を引けるMapです。

`session` を取れていないときや `projects` がまだ空のときは、空の Map をそのまま返します。ここで `undefined` を返すと、この後の `.get()` を呼んだ時点で落ちます。`useMemo` の第2引数に `[projects, session?.user?.id]` を渡しているので、表を作り直すのはこの2つが変わったときだけです。カードが1枚描画されるたびに全プロジェクトを走査し直すと、件数が増えたときに操作の反応が鈍くなります。

続けて、そのロールから編集・削除の権限を判定する関数を追加します。

```typescript
// filepath: src/app/task/page.tsx
// ロールから編集・削除の権限を判定する
const canEditProject = useCallback(
  (projectId: string) => {
    const role = myRoleByProject.get(projectId);
    return role ? hasPermission(role, 'canEdit') : false;
  },
  [myRoleByProject],
);

const canDeleteProject = useCallback(
  (projectId: string) => {
    const role = myRoleByProject.get(projectId);
    return role ? hasPermission(role, 'canDelete') : false;
  },
  [myRoleByProject],
);
```

> `canEditProject` / `canDeleteProject` はそのロールに編集・削除の権限があるかを返します。サーバー側の判定と同じ `hasPermission`（Day 12 で学んだ関数）を使うので、フロントとサーバーで基準がずれません。閲覧者（VIEWER）ロールのプロジェクトでは両方とも `false` になり、TaskCardの編集・削除ボタンが表示されなくなります。

**確認ポイント**:
- `myRoleByProject` / `canEditProject` / `canDeleteProject` が定義できた
- `npm run dev` でエラーが出ていない

フィルターUIの直下にグリッドを追加します。タスクがある場合のカード表示です。

```typescript
{/* filepath: src/app/task/page.tsx */}
{/* フィルターUIの直下: タスクグリッド */}
<div className="grid gap-6
  sm:grid-cols-2 lg:grid-cols-3
  xl:grid-cols-4">
  {tasks && tasks.length > 0 ? (
    tasks.map((task) => (
      <TaskCard
        key={task.id}
        id={task.id}
        title={task.title}
        description={task.description}
        status={task.status}
        priority={task.priority}
        dueDate={task.dueDate}
        assignee={task.assignee}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onClick={handleTaskClick}
      />
    ))
  ) : (
    <div />
  )}
</div>
```

`tasks && tasks.length > 0` で先に件数を確かめ、1件以上あるときだけ `.map()` へ進みます。`tasks` は読み込み中だと `undefined` なので、この確認が無いと `undefined` に対して `.map()` を呼んでしまいます。`key={task.id}` は、React がどのカードがどれかを見分けるための印です。`grid` の後ろに並ぶ `sm:` `lg:` `xl:` は画面幅ごとの列数で、狭い画面では1列、広い画面では4列に増えます。else 側をいったん `<div />` にしているのは、0件のときの表示をこの節の最後で差し替えるからです。

TaskCardに `canEdit` / `canDelete` を渡します。上の `<TaskCard ... />` を以下に**置き換えて**ください。

```typescript
{/* filepath: src/app/task/page.tsx */}
{/* TaskCardに権限フラグを追加 */}
<TaskCard
  key={task.id}
  id={task.id}
  title={task.title}
  description={task.description}
  status={task.status}
  priority={task.priority}
  dueDate={task.dueDate}
  assignee={task.assignee}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onClick={handleTaskClick}
  canEdit={canEditProject(task.projectId)}
  canDelete={canDeleteProject(task.projectId)}
/>
```

> `canEdit` / `canDelete` を渡さないと、TaskCard側のデフォルト値（`true`）が使われ、閲覧者（VIEWER）にも編集・削除ボタンが見えてしまいます。ボタンを押すとサーバー側の権限チェックで弾かれる（403 FORBIDDEN）ので、必ずロールに応じた値を渡してください。

**確認ポイント**:
- タスクがカード形式で表示されている
- ステータス・優先度がBadgeで表示される

タスクが0件のときの表示です。`src/app/task/page.tsx` にある `<div />`（1つ前のブロックの三項演算子の else 側）を、以下に差し替えてください。

```typescript
{/* filepath: src/app/task/page.tsx */}
{/* 空状態のメッセージ（<div /> を差し替え） */}
<div className="col-span-full flex
  flex-col items-center
  justify-center py-12
  text-center
  text-muted-foreground">
  <p>タスクが見つかりません。</p>
  <p>最初のタスクを作成しましょう!</p>
</div>
```

`col-span-full` は、グリッドの全列にまたがって表示するクラスです。これを外すと、メッセージが1列分の幅へ押し込まれ、4列表示のときに左端へ寄って見えます。0件のときに何も出さない作りにすると、読者は読み込み中なのか本当に0件なのかを判断できません。空のときこそ画面から言葉をかける、と考えてください。Day 09 のプロジェクト一覧でも、同じ理由で空状態のメッセージを置きました。

**確認ポイント**:
- タスクがない時にメッセージが表示される
- カードがレスポンシブなグリッドで並んでいる

#### TaskCardに渡す主なprops

| prop | 型 | 説明 |
|------|-----|------|
| `id` | `string` | タスクID |
| `title` | `string` | タスク名 |
| `status` | `TaskStatus` | ステータス（TODO, IN_PROGRESS等） |
| `priority` | `TaskPriority` | 優先度（LOW, MEDIUM, HIGH, URGENT） |
| `assignee` | `object?` | 担当者情報 |
| `dueDate` | `Date?` | 期限日 |
| `onEdit` | `(id: string) => void` | 編集ボタンのコールバック |
| `onDelete` | `(id: string) => void` | 削除ボタンのコールバック |
| `onClick` | `(id: string) => void` | カードクリックのコールバック |
| `canEdit` | `boolean?` | 編集ボタンを表示するか（プロジェクトロールから算出） |
| `canDelete` | `boolean?` | 削除ボタンを表示するか（プロジェクトロールから算出） |

---

### Step 7: タスク詳細ダイアログを追加する（7分）

**ゴール**: カードクリックでタスクの詳細を表示します。URLパラメータにも対応します。

**実装**:

ファイル先頭のimport群に以下を追加します。

```typescript
// filepath: src/app/task/page.tsx
// import群に追加（詳細ダイアログ用）
import { TaskDetailDialog }
  from '@/component/task/task-detail-dialog';
import { useSearchParams }
  from 'next/navigation';
// react はここでも既にある行に足します。
import {
  Suspense, useCallback, useEffect,
  useMemo, useState,
} from 'react';
```

`useSearchParams` は、URL の `?` 以降を読み取る Next.js のフックです。`useEffect` は、指定した値が変わった後に処理を走らせる React の仕組みで、ここでは URL の変化を拾うために使います。`TaskDetailDialog` は Day 09 以降で作ってきたダイアログと同じ形の部品で、開くかどうかと、どのタスクを見せるかを親から受け取ります。

**確認ポイント**:
- `TaskDetailDialog` と `useSearchParams` がインポートできた
- `useEffect` も `react` からインポートしている

詳細表示用のstateとURLパラメータ対応を追加します。`TaskPageContent` 関数の先頭（他のstateの近く）に追加してください。`useSearchParams` で URL の `?taskId=xxx` を読み取り、そのタスクの詳細を自動で開きます。

```typescript
// filepath: src/app/task/page.tsx
// 詳細表示用のstate
const [selectedTask, setSelectedTask] =
  useState<string | null>(null);
const [detailOpen, setDetailOpen] =
  useState(false);

// URLパラメータからタスクIDを取得
const searchParams = useSearchParams();
const taskIdParam =
  searchParams.get('taskId');
```

`selectedTask` は「どのタスクを見ているか」、`detailOpen` は「ダイアログが開いているか」を覚えます。2つに分けるのは、閉じる動きの途中で id を消すと中身が一瞬空になるからです。`searchParams.get('taskId')` は、`/task?taskId=abc` の `abc` の部分を取り出します。開いている画面の状態を URL に載せておくと、そのアドレスをそのまま人へ送れます。

**確認ポイント**:
- `selectedTask` と `detailOpen` の state が追加された
- `searchParams` から `taskId` を取得している

URLパラメータがある場合に自動で詳細を開く `useEffect` を追加します。

```typescript
// filepath: src/app/task/page.tsx
// URLパラメータでタスク詳細を自動オープン
useEffect(() => {
  if (taskIdParam) {
    setSelectedTask(taskIdParam);
    setDetailOpen(true);
  }
}, [taskIdParam]);
```

第2引数の `[taskIdParam]` が「見張る値」で、URL の `taskId` が変わったときだけ中身が動きます。ここを空配列の `[]` にすると最初の1回しか動かず、他の画面から `/task?taskId=...` へ移動しても詳細が開きません。逆に第2引数ごと省くと、描画のたびに中身が動きます。第2引数ごと省くと描画のたびに走ります。ダイアログを閉じても値がすぐ戻るので、閉じられない画面になります。ただし、あとで中身を書き換えたときに、描画のたびに走る処理として残ります。見張る値を正しく書くことが、`useEffect` を安全に使う条件です。

**確認ポイント**:
- `taskIdParam` が変わると `useEffect` が実行される

Step 6 の `handleTaskClick` の仮実装（空の関数）を以下の本実装に差し替えます。`handleDetailClose` も追加します。

```typescript
// filepath: src/app/task/page.tsx
// handleTaskClickを本実装に差し替え
const handleTaskClick =
  (taskId: string) => {
    setSelectedTask(taskId);
    setDetailOpen(true);
  };
const handleDetailClose = () => {
  setDetailOpen(false);
  setSelectedTask(null);
};
```

Step 6 では空の関数を置いていました。あの時点でダイアログがまだ無く、押しても何も起きない状態でよかったからです。ここで中身を入れると、カードのクリックが `selectedTask` と `detailOpen` を同時に動かし、画面に詳細が出ます。閉じる側で `selectedTask` を `null` へ戻すのは、次に別のカードを押したとき前のタスクが一瞬見えるのを防ぐためです。

**確認ポイント**:
- カードクリックで `selectedTask` が設定される
- `handleDetailClose` で state がリセットされる

JSX のグリッド `</div>` の直下に詳細ダイアログを追加します。

```typescript
{/* filepath: src/app/task/page.tsx */}
{/* グリッドの直下に追加 */}
<TaskDetailDialog
  open={detailOpen}
  taskId={selectedTask}
  onClose={handleDetailClose}
/>
```

`TaskDetailDialog` は `taskId` を受け取り、その1件を `api.task.getById` で取りに行きます。Step 0 の 0-7 で `getById` を先に書いたのは、この行のためです。もし `root.ts` への登録を忘れていれば、ここでクリックしても中身が空のままになります。ダイアログをグリッドの外へ置くのは、カードの並びに影響されず画面の最前面へ重ねるためです。

**確認ポイント**:
- カードクリックで詳細ダイアログが開く
- タスクの説明・担当者・期限が表示される

![タスク詳細ダイアログが表示されている画面](./screenshots/task-detail-dialog.png)

---

### Step 8: 動作確認（4分）

**ゴール**: タスク一覧の全機能を確認します。

```bash
# filepath: ターミナル
# 開発サーバーを起動して動作確認
PORT=3001 npm run dev
```

`PORT=3001` を付けるのは、3000番を別のアプリが使っていても起動できるようにするためです。立ち上がったら `http://localhost:3001/task` を開いてください。ここからは、書いたコードが本当に動くかを目で確かめる時間です。表示が思ったとおりでなくても慌てず、下の表を上から1つずつ試して、どこで期待とずれるかを絞り込んでください。ずれた場所が分かれば、直す場所もほぼ決まります。タスクが1件も無いときは空状態のメッセージが出るので、それも Step 6 で書いた表示の確認になります。

**確認ポイント**:
- 開発サーバーが起動した

#### 確認項目

| 確認項目 | 期待結果 |
|---------|---------|
| `/task` にアクセス | タスクカードがグリッド表示される |
| プロジェクトフィルター | 選択したプロジェクトのタスクだけ表示 |
| ステータスフィルター | 選択したステータスのタスクだけ表示 |
| カードをクリック | 詳細ダイアログが開く |
| ブラウザ幅を変更 | カードの列数が変わる |
| `/task?taskId=xxx` でアクセス | 自動で詳細ダイアログが開く |

#### ローディング表示の確認

| 状態 | 表示内容 |
|------|---------|
| データ取得中（`tasksLoading` が `true`） | `PageLoadingSpinner` が表示される |
| データ取得完了 | タスクカードのグリッドが表示される |
| タスクが0件 | 「タスクが見つかりません」メッセージ |

**確認ポイント**:
- フィルタリングが正しく動作する
- カードにステータス・優先度のBadgeがある
- 詳細ダイアログが開閉する

---

### Pro パターンで書こう（ステータス表示の色分け）

### Before（改善前のコード）

```typescript
// filepath: 読み比べ用サンプル（参考・実ファイルには対応しません）
// switch 文で色を決める
const getStatusColor = (status: string) => {
  switch (status) {
    case "TODO":
      return "bg-gray-100 text-gray-800";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    case "DONE":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

`switch` は値ごとに分岐を並べる構文です。この書き方でも色は出ますが、ステータスの種類と色の対応が関数の中に埋もれます。日本語のラベルも出したくなったら、同じ形の関数をもう1つ書くことになります。

**このコードの問題点**:

- ステータスが増えるたびに case を足す必要がある
- ラベルの文字も別の場所で同じ switch を書くことになる
- `default` に落ちるパターンが気づかないバグになりやすい

### After（プロが書くコード）

```typescript
// filepath: 読み比べ用サンプル（参考・実ファイルには対応しません）
const STATUS_CONFIG = {
  TODO: { label: "未対応", color: "bg-gray-100 text-gray-800" },
  IN_PROGRESS: { label: "進行中", color: "bg-blue-100 text-blue-800" },
  DONE: { label: "完了", color: "bg-green-100 text-green-800" },
} as const;

// 使う時は1行
const { label, color } = STATUS_CONFIG[status];
```

`STATUS_CONFIG` はステータスをキーにした対応表です。オブジェクトのキーは `as const` が無くても型として固定されます。だから想定外の文字列を渡した時点でエラーになります。`as const` が足すのは、値を書き換えられないという制約と、値そのものの型の固定です。表を1つ持つ形にすると、ラベルと色を並べて置けるので、片方だけ直し忘れる事故も減ります。

**このコードの強み**:

- ステータスの追加は1行。色とラベルを1か所で管理
- `as const` で型が推論されるので、typo するとコンパイルエラー
- switch を書く場所がゼロになる

#### 覚えておきたいエッセンス

switch 文は「設定オブジェクト + lookup」に置き換えられることが多いです。データと振る舞いを1か所にまとめると、追加・変更が楽になります。

## 完成コード全体

今日は4つのファイルを触りました。Step 0 でサーバー側の手続きを2つ書いて登録し、Step 1 でサイドバーへ導線を足し、Step 1 から Step 7 で一覧ページを組み立てています。断片を貼り重ねる作業が続いたので、途中でどこへ貼ったか分からなくなった場合は、以下のコードを上から順に貼り付けて、各ファイルを置き換えてください。1つのファイルが複数のブロックに分かれている場合は、そのファイルの見出しの下にあるブロックを、出てくる順につなげたものが全文です。上から順に読めば、書いた断片が1つのファイルへどう収まったかを確かめられます。

| ファイル | 役割 | 対応する Step |
|---------|------|--------------|
| `src/server/api/routers/task.ts` | タスクを取得する手続き | Step 0 |
| `src/server/api/root.ts` | 手続きの一覧表 | Step 0 |
| `src/component/layout/app-layout.tsx` | サイドバーのタスク導線 | Step 1 |
| `src/app/task/page.tsx` | タスク一覧ページ本体 | Step 1〜Step 7 |

`app-layout.tsx` だけは、Day 08 で作った土台のうち今日書き換えた2か所を載せます。残りの部分に今日は触っていないので、手元のファイルをそのまま残してください。

### `src/server/api/routers/task.ts`

**インポート**:

```typescript
// filepath: src/server/api/routers/task.ts
// 完成版: インポート
import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { taskPrioritySchema, taskStatusSchema } from '@/lib/constant/query';
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import {
  assertMemberPermission,
  getUserProjectIds,
} from './_helpers/permission';
import { USER_SELECT } from './_helpers/select';
```

取り込んでいる道具は役割ごとに分かれます。`Prisma` は検索条件の型注釈、`prisma` はデータベースへの問い合わせ、`z` は入力の検査です。`getUserProjectIds` と `assertMemberPermission` は、他の router でも使う共有のヘルパーで、権限の判定をこのファイルの中へ書き写さないために取り込んでいます。判定の中身を各 router へ書き写すと、直すときに全部を探して回ることになります。

**getAll の入力**:

```typescript
// filepath: src/server/api/routers/task.ts
// 完成版: getAll の入力
export const taskRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().cuid().optional(),
          status: taskStatusSchema.optional(),
          priority: taskPrioritySchema.optional(),
          assigneeId: z.string().cuid().optional(),
          limit: z.number().int().min(1).max(100).default(100),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TaskWhereInput = {};
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;
```

`createTRPCRouter({` から始まるオブジェクトが、このファイルの本体です。入力の各項目に `.optional()` が付いているので、絞り込みを渡さずに呼び出せます。`limit` と `offset` に既定値を持たせているのは、条件を渡さずに呼ばれたときも取得件数に上限がかかるようにするためです。

**getAll の権限による絞り込み**:

```typescript
// filepath: src/server/api/routers/task.ts
// 完成版: getAll の権限による絞り込み
      const projectIds = await getUserProjectIds(ctx.session.userId);

      where.projectId = { in: projectIds };

      if (input?.projectId) {
        if (!projectIds.includes(input.projectId)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'このプロジェクトへのアクセス権限がありません',
          });
        }
        where.projectId = input.projectId;
      }
      if (input?.status) where.status = input.status;
      if (input?.priority) where.priority = input.priority;
      if (input?.assigneeId) where.assigneeId = input.assigneeId;
```

ここが `getAll` で最も気をつける部分です。`where.projectId = { in: projectIds }` を先に置くので、以降の条件がどう積まれても対象は自分のプロジェクトの中に留まります。`input.projectId` を受け取ったときに `includes` で確かめているのは、通信を書き換えて他人のプロジェクトの id を送られても中身を見せないためです。下の3行の絞り込みが権限を見ていないのは、この時点で範囲が閉じているからです。

**getAll の関連データ**:

```typescript
// filepath: src/server/api/routers/task.ts
// 完成版: getAll の関連データ
      return await prisma.task.findMany({
        where,
        include: {
          project: true,
          createdBy: {
            select: USER_SELECT,
          },
          assignee: {
            select: USER_SELECT,
          },
          comments: {
            include: {
              user: {
                select: USER_SELECT,
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
```

`include` は関連するデータも一緒に取る指定です。`createdBy` と `assignee` に `USER_SELECT` を挟んでいるのは、`true` と書くとハッシュ化済みパスワードを含む全項目が画面まで返るからです。今日のカードが使うのは担当者だけですが、`getAll` は Day 17 のマイタスクや Day 20 の検索からも呼ばれるので、取る範囲をここでそろえてあります。

**getAll の並び順と件数**:

```typescript
// filepath: src/server/api/routers/task.ts
// 完成版: getAll の並び順と件数
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      });
    }),
```

並び順を指定しないと、データベースが返す順序は保証されません。読み込むたびにカードの位置が入れ替わって見えるので、`orderBy` は必ず付けます。`take` で上限を置くのは、タスクが数千件へ育ったときに全件をまとめて送って画面が固まるのを防ぐためです。

**getById の取得**:

```typescript
// filepath: src/server/api/routers/task.ts
// 完成版: getById の取得
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const task = await prisma.task.findUnique({
        where: { id: input.id },
        include: {
          project: {
            include: {
              members: {
                where: { userId: ctx.session.userId },
              },
            },
          },
          createdBy: {
            select: USER_SELECT,
          },
          assignee: {
            select: USER_SELECT,
          },
```

`getAll` との違いは `project` の取り方です。`members` を `ctx.session.userId` で絞って一緒に取るので、この1件を見るだけで自分がそのプロジェクトに入っているかが分かります。判定の材料をタスクと同じ問い合わせで取れば、データベースへの往復は1回で済みます。`where` を落とすと members が全員分返り、後の判定が「誰かがメンバーなら通す」に化けます。

**getById のコメント**:

```typescript
// filepath: src/server/api/routers/task.ts
// 完成版: getById のコメント
          comments: {
            include: {
              user: {
                select: USER_SELECT,
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
```

コメントも投稿者と一緒に、新しい順で取ります。詳細ダイアログはコメント欄を持つので、ここで取っておけば表示のために追加の通信が要りません。`});` で `findUnique` の呼び出しが閉じ、結果が `task` に入ります。

**getById の存在確認と権限確認**:

```typescript
// filepath: src/server/api/routers/task.ts
// 完成版: getById の存在確認と権限確認
      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      assertMemberPermission(task.project.members);

      return task;
    }),
});
```

`findUnique` は見つからないときに例外ではなく `null` を返すため、`NOT_FOUND` は自分で投げます。`assertMemberPermission` に渡しているのは、上で自分に絞って取った `members` です。空の配列が渡ればそこで止まるので、他人のタスクの id を直接指定されても中身は返りません。最後の `});` が `taskRouter` 全体を閉じる行です。


### `src/server/api/root.ts`

**登録済みの router 一覧**:

```typescript
// filepath: src/server/api/root.ts
// 完成版: 登録済みの router 一覧
import { authRouter } from './routers/auth';
import { projectRouter } from './routers/project';
import { taskRouter } from './routers/task';
import { createCallerFactory, createTRPCRouter } from './trpc';

export const appRouter = createTRPCRouter({
  auth: authRouter,
  project: projectRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
```

router を書いただけでは画面から呼べません。この一覧へ `task: taskRouter` を並べたことで、`api.task.getAll` と `api.task.getById` という呼び名が生まれます。`AppRouter` 型を書き出しているのが要点で、画面側はこの型をたどって引数と戻り値を知ります。`comment` や `search` は、それを使う Day で1行ずつ足していきます。


### `src/component/layout/app-layout.tsx`

**アイコンのインポート**:

```typescript
// filepath: src/component/layout/app-layout.tsx
// 完成版: アイコンのインポート
import {
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  ListTodo,
  LogOut,
} from 'lucide-react';
```

今日足したのは `ClipboardList` の1行です。サイドバーに置くタスク項目のアイコンで、すでにある `FolderOpen` などと同じ `lucide-react` からまとめて読み込みます。この行を足し忘れると `ClipboardList is not defined` というエラーになり、サイドバーごと表示されなくなります。

**サイドバーのメニュー項目**:

```typescript
// filepath: src/component/layout/app-layout.tsx
// 完成版: サイドバーのメニュー項目
const menuItems: MenuItem[] = [
  {
    text: 'ダッシュボード',
    icon: <LayoutDashboard className="h-5 w-5" />,
    path: '/dashboard',
  },
  {
    text: 'プロジェクト',
    icon: <FolderOpen className="h-5 w-5" />,
    path: '/project',
  },
  {
    text: 'マイタスク',
    icon: <ListTodo className="h-5 w-5" />,
    path: '/my-task',
  },
  {
    text: 'タスク',
    icon: <ClipboardList className="h-5 w-5" />,
    path: '/task',
  },
];
```

項目をコードの中へ直接書かず配列にまとめてあるので、要素を1つ足すだけでリンクが1本増えます。Day 08 で作った描画の仕組みには手を入れません。`path` の `/task` は `src/app/task/page.tsx` の置き場所と一致している必要があります。App Router はフォルダの並びをそのまま URL にするため、`/tasks` と書き間違えるとクリックしても404ページに飛びます。


### `src/app/task/page.tsx`

**クライアント宣言とインポートの前半**:

```typescript
// filepath: src/app/task/page.tsx
// 完成版: クライアント宣言とインポートの前半
'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/component/layout/app-layout';
import { TaskCard } from '@/component/task/task-card';
import { TaskDetailDialog } from '@/component/task/task-detail-dialog';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
```

`'use client'` は、このファイルをブラウザ側で動く部品として扱う宣言です。App Router のページは既定でサーバー側だけで動くので、この1行が無いと `useState` を書いた時点でエラーになります。`TaskCard` と `TaskDetailDialog` は前の Day までに用意した表示部品で、今日は呼び出す側だけを書きました。

**インポートの後半**:

```typescript
// filepath: src/app/task/page.tsx
// 完成版: インポートの後半
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { hasPermission, isProjectMemberRole, type ProjectMemberRole } from '@/lib/constant/roles';
import { isTaskStatus, TASK_STATUS_LABELS, type TaskStatus } from '@/lib/constant/status';
import { api } from '@/trpc/react';
```

ステータスとロールを `@/lib/constant/...` から取り込んでいるのが要点です。`hasPermission` と `isProjectMemberRole` は Day 12 でサーバー側の判定に使ったものと同じで、画面とサーバーで基準を分けないための選択です。基準が分かれると、画面ではボタンが見えるのにサーバーは拒む、というちぐはぐな状態になります。

**state と URL パラメータ**:

```typescript
// filepath: src/app/task/page.tsx
// 完成版: state と URL パラメータ
function TaskPageContent() {
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get('taskId');

  useEffect(() => {
    if (taskIdParam) {
      setSelectedTask(taskIdParam);
      setDetailOpen(true);
    }
  }, [taskIdParam]);
```

絞り込みの初期値を `'all'` にしているのは、開いた直後は全件を見せたいからです。`selectedTask` と `detailOpen` を分けているのは、閉じる動きの途中で id を消すと中身が一瞬空になるためです。`useEffect` の第2引数 `[taskIdParam]` が見張る値で、URL の `taskId` が変わったときだけ中身が動きます。ここを `[]` にすると最初の1回しか動かず、他の画面から `/task?taskId=...` へ移動しても詳細が開きません。

**データ取得**:

```typescript
// filepath: src/app/task/page.tsx
// 完成版: データ取得
  const { data: session } = api.auth.getSession.useQuery();
  const { data: tasks, isLoading: tasksLoading } = api.task.getAll.useQuery(
    {
      projectId: filterProject === 'all' ? undefined : filterProject,
      status: filterStatus === 'all' ? undefined : filterStatus,
    },
    { refetchOnWindowFocus: false },
  );
  const { data: projects } = api.project.getAll.useQuery();
```

`'all'` のときに `undefined` を渡すと、サーバーはその条件を足さず全件を返します。三項演算子で書き分けているのは、画面の「すべて」という選択肢と、サーバーの「条件を使わない」という状態を結ぶためです。`data: tasks` と名前を付け替えているのは、プロジェクトも取得するので `data` のままでは名前がぶつかるからです。

**プロジェクトごとのロールの表**:

```typescript
// filepath: src/app/task/page.tsx
// 完成版: プロジェクトごとのロールの表
  // プロジェクトごとのログインユーザー自身のロールを引けるようにする
  const myRoleByProject = useMemo(() => {
    const map = new Map<string, ProjectMemberRole>();
    const userId = session?.user?.id;
    if (!userId || !projects) {
      return map;
    }
    for (const project of projects) {
      const me = project.members?.find((member) => member.userId === userId);
      if (me && isProjectMemberRole(me.role)) {
        map.set(project.id, me.role);
      }
    }
    return map;
  }, [projects, session?.user?.id]);
```

プロジェクトの id から自分のロールを引ける表を作ります。`session` を取れていないときや `projects` が空のときは、空の Map をそのまま返します。ここで `undefined` を返すと、後ろの `.get()` を呼んだ時点で落ちます。`useMemo` の第2引数を `[projects, session?.user?.id]` にしているので、表を作り直すのはこの2つが変わったときだけです。カードが1枚描かれるたびに全プロジェクトを走査し直すと、件数が増えたときに操作の反応が鈍くなります。

**編集と削除の権限判定**:

```typescript
// filepath: src/app/task/page.tsx
// 完成版: 編集と削除の権限判定
  const canEditProject = useCallback(
    (projectId: string) => {
      const role = myRoleByProject.get(projectId);
      return role ? hasPermission(role, 'canEdit') : false;
    },
    [myRoleByProject],
  );

  const canDeleteProject = useCallback(
    (projectId: string) => {
      const role = myRoleByProject.get(projectId);
      return role ? hasPermission(role, 'canDelete') : false;
    },
    [myRoleByProject],
  );
```

ロールが引けなかったときは `false` を返します。判定できない状態を「たぶん許可」に倒すと、権限の無い人にボタンが見えます。閲覧者のロールでは両方とも `false` になり、カードの編集ボタンと削除ボタンが消えます。

**ハンドラーと読み込み中の表示**:

```typescript
// filepath: src/app/task/page.tsx
// 完成版: ハンドラーと読み込み中の表示
  const handleTaskClick = (taskId: string) => {
    setSelectedTask(taskId);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedTask(null);
  };

  const handleEdit = (taskId: string) => {};

  const handleDelete = (taskId: string) => {};

  if (tasksLoading) {
    return (
      <AppLayout>
        <PageLoadingSpinner />
      </AppLayout>
    );
  }
```

`handleEdit` と `handleDelete` が空のままなのは、編集と削除を Day 15 で作るからです。押しても何も起きませんが、`TaskCard` が受け取る形はここで決まります。読み込み中の早期 `return` を置いているのは、`tasks` がまだ `undefined` の状態で下の `.map()` へ進むと画面が落ちるためです。

**見出しとプロジェクトの絞り込み**:

```typescript
// filepath: src/app/task/page.tsx
// 完成版: 見出しとプロジェクトの絞り込み
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">タスク</h1>

        <div className="flex gap-2 w-full sm:w-auto ml-auto">
          <div className="w-[200px]">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger aria-label="プロジェクトで絞り込み">
                <SelectValue placeholder="すべてのプロジェクト" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのプロジェクト</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
```

`aria-label` を付けているのは、この絞り込みに画面上の見出しが無いためです。`placeholder` は値を選んだ時点で消えるので、読み上げソフトを使う人には選んだ値だけが読まれます。選択肢は `projects` から `.map()` で作るため、プロジェクトが増えても手で書き足す必要がありません。

**ステータスの絞り込み**:

```typescript
          {/* filepath: src/app/task/page.tsx */}
          {/* 完成版: ステータスの絞り込み */}
          <div className="w-[200px]">
            <Select
              value={filterStatus}
              onValueChange={(value) => {
                if (value === 'all' || isTaskStatus(value)) setFilterStatus(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="すべてのステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
```

`onValueChange` が受け取る値はただの文字列なので、`isTaskStatus` を通ったものだけを state へ入れます。`as TaskStatus` で黙らせると、中身を確かめないまま正しいと言い張ることになり、想定外の文字列がそのままサーバーへ飛びます。選択肢を `TASK_STATUS_LABELS` から作っているので、ステータスが増えたときは `status.ts` へ1行足すだけで反映されます。

**タスクカードの一覧**:

```typescript
        {/* filepath: src/app/task/page.tsx */}
        {/* 完成版: タスクカードの一覧 */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tasks && tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                id={task.id}
                title={task.title}
                description={task.description}
                status={task.status}
                priority={task.priority}
                dueDate={task.dueDate}
                assignee={task.assignee}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onClick={handleTaskClick}
                canEdit={canEditProject(task.projectId)}
                canDelete={canDeleteProject(task.projectId)}
              />
            ))
          ) : (
```

`canEdit` と `canDelete` を必ず渡すのは、省くと `TaskCard` 側の既定値である `true` が使われ、閲覧者にも編集ボタンと削除ボタンが見えるからです。押してもサーバー側の権限確認で弾かれますが、押せないはずのボタンを見せること自体が利用者を迷わせます。`key={task.id}` は React がどのカードがどれかを見分けるための印です。

**0件のときの表示と詳細ダイアログ**:

```typescript
            {/* filepath: src/app/task/page.tsx */}
            {/* 完成版: 0件のときの表示と詳細ダイアログ */}
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p>タスクが見つかりません。</p>
              <p>最初のタスクを作成しましょう!</p>
            </div>
          )}
        </div>

        <TaskDetailDialog open={detailOpen} taskId={selectedTask} onClose={handleDetailClose} />
      </div>
    </AppLayout>
  );
}
```

`col-span-full` を外すと、メッセージが1列分の幅へ押し込まれ、4列表示のときに左端へ寄って見えます。0件のときに何も出さないと、読者は読み込み中なのか本当に0件なのかを判断できません。`TaskDetailDialog` をグリッドの外へ置くのは、カードの並びに影響されず画面の最前面へ重ねるためです。

**Suspense で包んだページ本体**:

```typescript
// filepath: src/app/task/page.tsx
// 完成版: Suspense で包んだページ本体
export default function TaskPage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <TaskPageContent />
    </Suspense>
  );
}
```

`useSearchParams` を使う部品は `Suspense` の内側に置く決まりがあります。外へ出すと、境界が無いというエラーでビルドが止まります。`export default` を付けたこの関数が、`/task` を開いたときに読まれるページ本体です。

## 今日のまとめ

- [ ] `api.task.getAll` でタスク一覧を取得できた
- [ ] フィルター条件をAPIパラメータに反映できた
- [ ] `isTaskStatus` 型ガードで安全にフィルター値を設定できた
- [ ] TaskCard でタスクをカード表示できた
- [ ] `canEditProject` / `canDeleteProject` でロールに応じて編集・削除ボタンの表示を切り替えられた
- [ ] レスポンシブなグリッドレイアウトを実装できた
- [ ] URLパラメータからタスク詳細を自動オープンできた

## つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| タスクが表示されない | フィルター条件が厳しすぎる | 「すべて」を選択してデータがあるか確認 |
| カードが表示されない | TaskCard の import ミス | `@/component/task/task-card` を確認 |
| フィルターが効かない | `useQuery` のパラメータが渡っていない | 三項演算子の構文を確認 |
| 詳細が取得できない | `TaskDetailDialog` に渡す `taskId` が空 | 自分の `page.tsx` の `taskId={selectedTask}` と、その上の `setSelectedTask` を確認 |
| ステータスフィルターで型エラー | `as` キャストを使っている | `isTaskStatus()` 型ガードを使う |

## 今日学んだ用語

| 用語 | 意味 |
|------|------|
| フィルタリング | データを条件で絞り込む操作 |
| TaskCard | タスク1件を表示する再利用可能なコンポーネント |
| 三項演算子 | `条件 ? 真の値 : 偽の値` で分岐する構文 |
| Suspense | データ読み込み中にフォールバック表示するReactの仕組み |
| useSearchParams | URLの `?key=value` を読み取るNext.jsのフック |

## 次回予告

Day 14 では、新しいタスクを作成する機能を実装します。Day 10 で学んだダイアログパターンをタスク版に応用します。

---

## 次に読むもの

- 前の日: [Day 12](./day12_メンバー追加.md)
- 次の日: [Day 14](./day14_タスク新規作成.md)
- 全体の地図: [学びのロードマップ](./00-1_学びのロードマップ.md)
- 目次: [カリキュラム目次](./00_カリキュラム目次.md)
- 詰まったとき: [トラブルシューティング](./appendix_トラブルシューティング.md)
- 言葉の意味: [用語集](./appendix_用語集.md)
