# Day 14: タスク新規作成を実装しよう

## 前回の振り返り

Day 13 ではタスク一覧画面を作成し、`api.task.getAll` によるデータ取得やフィルタリング、TaskCard コンポーネントによるカード表示を実装しました。一覧でタスクを表示できるようになったので、今日は新しいタスクを作成するダイアログを実装します。

---

## 今日のゴール

TaskDialogコンポーネントで、新しいタスクを作成
できるようにします。Day 10 で学んだダイアログ
パターンとreact-hook-form + zodをタスク版に
応用します。

スクリーンショット: タスク作成ダイアログの完成画面。

![タスク作成ダイアログの完成画面](./screenshots/task-create-dialog.png)

> **今日のゴールライン**: TaskDialogにフォーム管理とバリデーションを組み込み、新しいタスクが一覧へ反映される流れを体験できればOK。

## 始める前の前提

- Day 13 のタスク一覧画面が表示できる
- 少なくとも1つのプロジェクトが作成済みで、タスクを紐づけられる
- ログイン済みユーザーで `/task` を開ける
- `src/server/api/root.ts` と `src/component/task/task-dialog.tsx` を編集できる

## なぜこれを作るのか

これまで作ってきた一覧・フィルター・詳細は、
すべて「タスクがある」ことが前提でした。
そのタスクを生み出す入口がまだありません。
今日はタスクを作成する画面を用意します。

> **例え話**: タスク作成は「料理のレシピカード
> を書く」ようなものです。何を作るか（タイトル）、
> どう作るか（説明）、いつまでに（期限）、
> 誰が作るか（担当者）を1枚のカードに書きます。
> ダイアログはそのカードの記入用紙です。

### タスク作成の流れ

```mermaid
graph TD
    A[新規作成ボタンをクリック] --> B[TaskDialogが開く]
    B --> C[フォームに入力]
    C --> D{zodバリデーション}
    D -->|OK| E[api.task.create.mutate]
    D -->|NG| F[エラーメッセージ表示]
    E --> G[キャッシュ更新 invalidate]
    G --> H[ダイアログを閉じる]
    H --> I[一覧に新タスク表示]

    style A fill:#e3f2fd
    style D fill:#fff3e0
    style E fill:#e8f5e9
    style I fill:#c8e6c9
```

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| TaskDialog を作る | 別ページでフォーム作成 |
| react-hook-form + zod でフォーム管理 | useState で手動管理 |
| useMutation でサーバーに保存 | タスクの編集（Day 15） |
| キャッシュ無効化で一覧更新 | 作業時間の記録（Day 16） |

### 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| TaskDialog | タスク・ダイアログ | タスクCRUD用のモーダル | レシピカードの記入用紙 |
| Controller | コントローラー | Select をreact-hook-formで制御する | ドロップダウンの管理係 |
| TASK_STATUS_LABELS | ― | ステータスの表示名を定義した定数 | 選択肢の翻訳表 |
| nativeEnum | ネイティブ・イーナム | zodで既存の定数オブジェクトを検証する | 記入用紙の「選択肢チェック」 |

## 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 0 | タスク作成 API（create）と search ルーターを自分で書く | 17分 |
| Step 1 | zodスキーマと型を定義する | 5分 |
| Step 2 | TaskDialogの骨格を作る | 5分 |
| Step 3 | useFormでフォームを設定する | 5分 |
| Step 4 | タイトル・説明の入力欄を作る | 5分 |
| Step 5 | ステータス・優先度のSelectを作る | 7分 |
| Step 6 | プロジェクト・担当者のSelectを作る | 5分 |
| Step 7 | 期限・見積時間・ボタンを作る | 5分 |
| Step 8 | ページにDialogを組み込む | 7分 |
| Step 9 | 動作確認 | 3分 |

**合計時間**: 約64分。

---

### Step 0: タスク作成 API（create）と search ルーターを自分で書く（17分）

**ゴール**: `src/server/api/routers/task.ts` に `create` を追加し、`api.task.create` を呼べる状態にします。あわせて、担当者候補の取得に使う `search` ルーターを新規作成し、`root.ts` に登録します。

Day 13 で書いた `getAll` は、3部品（入力・処理・戻り値）のうち処理が「探す（`.query`）」でした。今日の `create` は「作る（`.mutation`）」になるだけで、骨組みは同じです。Day 10 でプロジェクトの `create` を書いたのと同じ流れです。

#### 0-1. 入力スキーマと import を足す

まず、受け取るデータの形を zod で定義します。`task.ts` の import に次を足します（`_helpers/permission` の行には `assertMemberPermission` を追記します）。

```typescript
// filepath: src/server/api/routers/task.ts（import を追加）
import { TASK_PRIORITY } from '@/lib/constant/priority';
import { TASK_STATUS } from '@/lib/constant/status';
import {
  assertMemberPermission,
  getUserProjectIds,
} from './_helpers/permission';
```

`TASK_STATUS` と `TASK_PRIORITY` は、入力スキーマの既定値に使う定数です。`assertMemberPermission` は「そのプロジェクトのメンバーが、その操作をしてよい権限を持っているか」を確認する共有ヘルパーです。`getUserProjectIds` は Day 13 で足したものと同じなので、1つの import 文にまとめます。

続いて、`export const taskRouter` の前に入力スキーマを追加します。

```typescript
// filepath: src/server/api/routers/task.ts（taskRouter の前に追加）
const taskCreateSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  status: taskStatusSchema.default(TASK_STATUS.TODO),
  priority: taskPrioritySchema.default(TASK_PRIORITY.MEDIUM),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  projectId: z.string().cuid(),
  assigneeId: z.string().cuid().optional(),
});
```

`title` に `.min(1, ...)` が付いているのは、空のタイトルでタスクを作れないようにするためです。`status` と `priority` の `.default(...)` は、指定がなかったときに使う既定値です。`projectId` は `.cuid()`（この形式の id か）で検証し、どのプロジェクトに属すかを必ず受け取ります。

#### 0-2. 担当者チェック用のヘルパーを足す

担当者を指定できるので、その担当者がプロジェクトのメンバーかを確認するヘルパーを、`taskRouter` の前に追加します。

```typescript
// filepath: src/server/api/routers/task.ts（taskRouter の前に追加）
async function assertTaskAssigneeBelongsToProject(
  projectId: string,
  assigneeId: string,
): Promise<void> {
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: assigneeId,
        projectId,
      },
    },
    select: { id: true },
  });

  if (!member) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '担当者にはこのプロジェクトのメンバーを指定してください',
    });
  }
}
```

このヘルパーは、指定された担当者がそのプロジェクトの `ProjectMember`（プロジェクトに紐づくメンバー行）に存在するかを調べ、いなければ `TRPCError` を `throw` します。プロジェクト外の人を担当者にしてしまう事故を防ぎます。

#### 0-3. ここが一番のヤマ場（作ってよい人かを確認する）

`create` の処理本体です。ここで一番大事なのは、タスクを作る前に「その人がこのプロジェクトで作成してよい権限を持っているか」を確認する部分です。`create` は `getAll` の直後（`getAll` の `}),` の後）に足します。

```typescript
// filepath: src/server/api/routers/task.ts（getAll の直後に追加）
  create: protectedProcedure.input(taskCreateSchema).mutation(async ({ ctx, input }) => {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      include: {
        members: {
          where: { userId: ctx.session.userId },
        },
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'プロジェクトが見つかりません',
      });
    }

    assertMemberPermission(project.members, 'canEdit');
```

まず対象のプロジェクトを取り、そのとき `members` を「ログイン中の自分の分だけ」に絞って一緒に取ります。プロジェクトが無ければ `NOT_FOUND` で止めます。`assertMemberPermission(project.members, 'canEdit')` は、自分がそのプロジェクトで編集（作成）権限を持っているかを確認し、無ければここで弾きます。これを忘れると、メンバーでない人でもタスクを作れてしまいます。

#### 0-4. 担当者の確認と並び順の番号を決める

```typescript
// filepath: src/server/api/routers/task.ts（続き）
    if (input.assigneeId) {
      await assertTaskAssigneeBelongsToProject(input.projectId, input.assigneeId);
    }

    const maxPosition = await prisma.task.findFirst({
      where: { projectId: input.projectId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
```

担当者が指定されているときだけ、0-2 のヘルパーでメンバーかを確認します。`maxPosition` は、同じプロジェクトの中で今いちばん大きい `position`（並べ替え用の番号）を探しています。この後、それに1を足して新しいタスクを末尾に置きます。

#### 0-5. 保存するデータを組み立てる

```typescript
// filepath: src/server/api/routers/task.ts（続き）
    const createData: Prisma.TaskCreateInput = {
      title: input.title,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      position: (maxPosition?.position ?? -1) + 1,
      project: {
        connect: { id: input.projectId },
      },
      createdBy: {
        connect: { id: ctx.session.userId },
      },
    };
```

`position: (maxPosition?.position ?? -1) + 1` は「今の最大番号 + 1」です。タスクが1件も無いときは `maxPosition` が無いので、`?? -1`（左が無いときだけ -1 を使う書き方）で -1 として扱い、最初のタスクの番号が 0 になります。`project.connect` と `createdBy.connect` は、既にある行（プロジェクトとログイン中のユーザー）に関連づける書き方です。

#### 0-6. 任意の項目を足して保存する

`description`・`estimatedHours`・`assigneeId` は任意なので、値があるときだけ足します。

```typescript
// filepath: src/server/api/routers/task.ts（続き）
    if (input.description !== undefined) {
      createData.description = input.description;
    }
    if (input.estimatedHours !== undefined) {
      createData.estimatedHours = input.estimatedHours;
    }
    if (input.assigneeId) {
      createData.assignee = {
        connect: { id: input.assigneeId },
      };
    }
```

最初の `createData` にはこれらを含めず、値が入力されているときだけ後から足しています。値があるときだけキー自体を足すと、無いものは無いまま扱われます。Day 10 の `description` と同じ考え方です。

```typescript
// filepath: src/server/api/routers/task.ts（続き）
    return await prisma.task.create({
      data: createData,
      include: {
        project: true,
        createdBy: {
          select: USER_SELECT,
        },
        assignee: {
          select: USER_SELECT,
        },
      },
    });
  }),
```

`include` は `getAll` と同じく、画面が使うプロジェクト・作成者・担当者を一緒に返す指定です。作成直後に返るデータと一覧のデータの形を揃えておくと、画面側が扱いやすくなります。最後の `}),` で `create` を閉じます。

**確認ポイント**:
- `taskCreateSchema` と `assertTaskAssigneeBelongsToProject` を `taskRouter` の前に、`create` を `getAll` の直後に足した
- `assertMemberPermission(project.members, 'canEdit')` で作成権限を確認している
- `npm run dev` で型エラーが出ていない

#### 0-7. 担当者候補を取る search ルーターを作る

タスクを作るとき、担当者は「そのプロジェクトのメンバー」から選びます。この後 Step 6 で作る担当者の選択欄は、その候補を `api.search.getProjectMembers` から受け取ります。まだ `search` ルーターが無いので、ここで新規に作ります。Day 09 で `project` ルーターを作ったのと同じ流れで、今日は `getProjectMembers` の1手続きだけを書きます。`search`・`quickSearch` など残りの手続きは、検索画面を作る Day 20 で1つずつ足していきます。

`getProjectMembers` も、入力・処理・戻り値の3部品でできています。今回は絞り込み条件を受け取らないので入力はなく、処理で「自分が入っているプロジェクトのメンバー」を集め、戻り値としてユーザーの一覧を返します。

`src/server/api/routers/search.ts` を新規作成し、まず import を書きます。

```typescript
// filepath: src/server/api/routers/search.ts
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { USER_SELECT } from './_helpers/select';
```

`prisma` は DB に問い合わせる道具、`protectedProcedure` はログイン済みの人だけが呼べる手続きを作る道具です。`USER_SELECT` は Day 07 で作った「ユーザーのどの項目を返すか」の指定で、パスワードなど返してはいけない項目を毎回書かずに済みます。`task.ts` でも使ったものと同じ共有部品です。

続いて、ルーターの骨組みと問い合わせの条件を書きます。

```typescript
// filepath: src/server/api/routers/search.ts（続き）
export const searchRouter = createTRPCRouter({
  getProjectMembers: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.userId;

    const projectMembers = await prisma.projectMember.findMany({
      where: {
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
```

`where` の中の `project.members.some` は「自分がメンバーであるプロジェクトだけを対象にする」条件です。`some` は Prisma で「関連の中に条件を満たすものが1つでもあれば対象にする」という書き方です。こうすると、自分が入っていないプロジェクトのメンバーは対象から外れ、無関係な人まで候補に出てしまう事故を防げます。

最後に、返す項目・重複の除去・並び順を指定して閉じます。

```typescript
// filepath: src/server/api/routers/search.ts（続き）
      select: {
        user: {
          select: USER_SELECT,
        },
      },
      distinct: ['userId'],
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    return projectMembers.map((member) => member.user);
  }),
});
```

`select.user` で、メンバー行にひもづくユーザーを `USER_SELECT` の項目だけ取ります。`distinct: ['userId']` は「同じユーザーが複数のプロジェクトに入っていても1回だけにする」指定で、候補に同じ人が何度も並ぶのを防ぎます。`orderBy` は名前の昇順です。最後の `map`（配列の各要素を別の形に変換する書き方）で、メンバー行から中のユーザーだけを取り出して配列にして返します。画面はこの配列をそのまま選択肢に使えます。

作った `searchRouter` を `root.ts` に登録すると、`api.search.getProjectMembers` という呼び名が生まれます。Day 13 で `task` を登録したのと同じ形です。

```typescript
// filepath: src/server/api/root.ts（import と appRouter に追加）
import { searchRouter } from './routers/search';

// appRouter の中に追加
search: searchRouter,
```

**確認ポイント**:
- `src/server/api/routers/search.ts` に `getProjectMembers` を書き、`}),` と `});` まで閉じた
- `root.ts` に `searchRouter` の import と `search: searchRouter` を追加した
- `npm run dev` で型エラーが出ていない

---

### Step 1: zodスキーマと型を定義する（5分）

**ゴール**: zodスキーマでバリデーションルールを定義し、フォームデータの型を作ります。

**実装**:

`src/component/task/task-dialog.tsx` を新規作成します。以下の3つのコードブロックは全て **同じファイルに上から順に** 書いてください。表示の都合でブロックを分けていますが、1つのファイルです。

```typescript
// filepath: src/component/task/task-dialog.tsx
// フォームライブラリとUIコンポーネントのimport
'use client';

import { zodResolver }
  from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm }
  from 'react-hook-form';
import { z } from 'zod';
import { Button }
  from '@/component/ui/button';
import {
  Dialog, DialogContent,
  DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/component/ui/dialog';
import { Input }
  from '@/component/ui/input';
import { Label }
  from '@/component/ui/label';
```

**確認ポイント**:
- `zodResolver`, `useForm`, `Controller` がインポートされている

```typescript
// filepath: src/component/task/task-dialog.tsx
// Select系UIと定数のimport
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/component/ui/select';
import { Textarea }
  from '@/component/ui/textarea';
import {
  TASK_PRIORITY, TASK_PRIORITY_LABELS,
  type TaskPriority,
} from '@/lib/constant/priority';
import {
  TASK_STATUS, TASK_STATUS_LABELS,
  type TaskStatus,
} from '@/lib/constant/status';
```

zodスキーマを定義します。

```typescript
// filepath: src/component/task/task-dialog.tsx
// zodスキーマでバリデーションルール定義
const taskFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1,
    'タイトルは必須です'),
  description: z.string().optional(),
  status: z.nativeEnum(TASK_STATUS),
  priority: z.nativeEnum(TASK_PRIORITY),
  dueDate: z.string().optional(),
  estimatedHours:
    z.number().min(0).optional(),
  projectId: z.string().min(1,
    'プロジェクトは必須です'),
  assigneeId: z.string().optional(),
  expectedUpdatedAt:
    z.string().datetime().optional(),
});

type TaskFormValues =
  z.infer<typeof taskFormSchema>;
```

#### zodスキーマの各フィールド

| フィールド | バリデーション | 意味 |
|-----------|-------------|------|
| `title` | `z.string().min(1, ...)` | 1文字以上必須 |
| `status` | `z.nativeEnum(TASK_STATUS)` | 定数オブジェクトの値のみ許可 |
| `priority` | `z.nativeEnum(TASK_PRIORITY)` | 定数オブジェクトの値のみ許可 |
| `projectId` | `z.string().min(1, ...)` | プロジェクト選択必須 |
| `estimatedHours` | `z.number().min(0).optional()` | 0以上の数値（任意） |

> `z.nativeEnum(TASK_STATUS)` は、`TASK_STATUS` オブジェクトの値（`'TODO'`, `'IN_PROGRESS'` ）だけを許可するバリデーションです。不正な値が入力されると自動でエラーになります。

**確認ポイント**:
- `taskFormSchema` を定義した
- `TaskFormValues` が自動生成されている

---

### Step 2: TaskDialogの骨格を作る（5分）

**ゴール**: コンポーネントのProps型とフォーム
データの型を定義します。

**実装**:

```typescript
// filepath: src/component/task/task-dialog.tsx
// フォームデータの型（外部公開用）
export interface TaskFormData {
  id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
  projectId: string;
  assigneeId?: string;
  expectedUpdatedAt?: string;
}
```

```typescript
// filepath: src/component/task/task-dialog.tsx
// Props の型定義
interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  initialData?:
    TaskFormData | undefined;
  projects: Array<{
    id: string; name: string;
  }>;
  users: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
}
```

> `TaskFormValues`（zod推論型）はコンポーネント
> 内部で使い、`TaskFormData` というインターフェース（オブジェクトがどんな項目を持つかを定めた型）は
> 外部に公開します。2つの型を使い分けることで、
> 内部のバリデーションと外部のAPIを分離できます。

**確認ポイント**:
- `TaskFormData` をエクスポートした
- `TaskDialogProps` に `projects` と `users` がある

#### TaskFormData の各フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `id` | `string?` | × | 編集時のみ使用 |
| `title` | string | ○ | タスク名 |
| `description` | `string?` | × | 詳細説明 |
| `status` | TaskStatus | ○ | 進捗状態 |
| `priority` | TaskPriority | ○ | 優先度 |
| `dueDate` | `string?` | × | 期限日 |
| `estimatedHours` | `number?` | × | 見積時間 |
| `projectId` | string | ○ | 所属プロジェクト |
| `assigneeId` | `string?` | × | 担当者 |
| `expectedUpdatedAt` | `string?` | × | 編集時のみ使用。詳しくは Day 15 |

**確認ポイント**:
- `TaskFormData` をエクスポートした
- `TaskDialogProps` に `projects` と `users` がある

---

### Step 3: useFormでフォームを設定する（5分）

**ゴール**: `useForm` と `zodResolver` で
フォームの状態管理とバリデーションを設定します。

**実装**:

```typescript
// filepath: src/component/task/task-dialog.tsx
// フォーム初期値を作るヘルパー
function buildTaskFormValues(
  initialData: TaskFormData | undefined,
  projects: Array<{
    id: string; name: string;
  }>,
): TaskFormValues {
  return {
    id: initialData?.id,
    title: initialData?.title ?? '',
    description:
      initialData?.description ?? '',
    status: initialData?.status
      ?? TASK_STATUS.TODO,
    priority: initialData?.priority
      ?? TASK_PRIORITY.MEDIUM,
    dueDate: initialData?.dueDate ?? '',
    estimatedHours:
      initialData?.estimatedHours,
    projectId: initialData?.projectId
      ?? (projects[0]?.id || ''),
    assigneeId:
      initialData?.assigneeId ?? '',
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```typescript
// filepath: 続き
    expectedUpdatedAt:
      initialData?.expectedUpdatedAt,
  };
}

// 関数定義とuseForm初期化（全体）
export function TaskDialog({
  open, onClose, onSubmit,
  initialData, projects, users,
}: TaskDialogProps) {
  const {
    register, handleSubmit, control,
    reset, formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues:
      buildTaskFormValues(
        initialData, projects),
  });
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```typescript
// filepath: 続き
  useEffect(() => {
    reset(
      buildTaskFormValues(
        initialData, projects),
    );
  }, [initialData, projects, reset]);
```

**確認ポイント**:
- `buildTaskFormValues` が全フィールドを返している
- `useForm` に `resolver` と `defaultValues` が設定されている
- `useEffect` で `initialData` の変更時に `reset` している

> `defaultValues` は初回表示の値です。編集対象が変わったときは自動では更新されないため、`useEffect(reset(...))` で明示的に同期します。これで Day 15 の編集モードでも正しく初期化されます。
>
> **この関数はまだ続きます。** Step 4 でハンドラーとJSXを追加します。

#### useFormから取得するもの

| 名前 | 役割 |
|------|------|
| `register` | Input/Textareaをフォームに登録 |
| `handleSubmit` | バリデーション後に送信 |
| `control` | Controllerに渡してSelectを制御 |
| `reset` | フォームの値をリセット |
| `errors` | バリデーションエラー情報 |

**確認ポイント**:
- `register` と `control` の違いを理解した
- `npm run dev` でエラーが出ていない

---

### Step 4: タイトル・説明の入力欄を作る（5分）

**ゴール**: タイトルと説明の入力欄を追加します。

**実装**:

まず、ダイアログを閉じるハンドラーと送信ハンドラーを作ります。

```typescript
// filepath: src/component/task/task-dialog.tsx
// ダイアログを閉じる時にフォームをリセット
const handleClose = () => {
  reset();
  onClose();
};
```

送信ハンドラーでは、未入力のフィールドを除外してから `onSubmit` に渡します。以下のコードは `useForm` の直後、`TaskDialog` 関数の中に追加します。

```typescript
// filepath: src/component/task/task-dialog.tsx
// useFormの直後に追加: 送信処理
const handleFormSubmit =
  (data: TaskFormValues) => {
    const submitData: TaskFormData = {
      ...(data.id !== undefined
        && { id: data.id }),
      title: data.title,
      status: data.status,
      priority: data.priority,
      projectId: data.projectId,
      ...(data.description
        && { description:
          data.description }),
      ...(data.dueDate
        && { dueDate: data.dueDate }),
      ...(data.estimatedHours !==
        undefined && { estimatedHours:
          data.estimatedHours }),
      ...(data.assigneeId
        && { assigneeId:
          data.assigneeId }),
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```typescript
// filepath: 続き
      ...(data.id !== undefined
        && data.expectedUpdatedAt
          !== undefined
        && { expectedUpdatedAt:
          data.expectedUpdatedAt }),
    };
    onSubmit(submitData);
  };
```

#### 条件付きスプレッド構文の解説

| コード | 条件が真の場合 | 条件が偽の場合 |
|--------|-------------|-------------|
| `...(data.id !== undefined && { id: data.id })` | `{ id: "xxx" }` を追加 | 何も追加しない |
| `...(data.description && { description: ... })` | 説明を追加 | 何も追加しない |
| `...(data.dueDate && { dueDate: ... })` | 期限を追加 | 何も追加しない |

> Day 11 の `handleEdit` と同じパターンです。値がある場合だけプロパティを含め、空の場合はプロパティ自体を含めません。

> `expectedUpdatedAt` は今日の新規作成では使いません。編集機能（Day 15）で「他の人が先に更新していないか」をサーバーが見分けるために送る値です。今は型と送信処理だけ用意しておきます。

JSXのダイアログ構造とタイトル入力欄を書きます。

```typescript
// filepath: src/component/task/task-dialog.tsx
return (
  <Dialog open={open}
    onOpenChange={(isOpen) =>
      !isOpen && handleClose()}>
    <DialogContent
      className="sm:max-w-[800px]">
      <DialogHeader>
        <DialogTitle>
          {initialData?.id
            ? 'タスク編集' : 'タスク作成'}
        </DialogTitle>
        <DialogDescription>
          {initialData?.id
            ? 'タスクの詳細を更新します。'
            : 'プロジェクトに新しいタスクを追加します。'}
        </DialogDescription>
      </DialogHeader>
```

```typescript
// filepath: src/component/task/task-dialog.tsx
      <form onSubmit={
        handleSubmit(handleFormSubmit)}>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">
              タイトル
            </Label>
            <Input id="title"
              placeholder=
                "タスクのタイトルを入力"
              {...register('title')} />
            {errors.title && (
              <p className=
                "text-sm text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>
```

説明欄を追加します。

```typescript
// filepath: src/component/task/task-dialog.tsx
          <div className="grid gap-2">
            <Label htmlFor="description">
              説明
            </Label>
            <Textarea
              id="description"
              placeholder="タスクの説明..."
              rows={4}
              {...register('description')}
            />
          </div>
```

> `{...register('title')}` は Day 10 で学んだ
> パターンです。入力欄をフォームに登録し、値の
> 追跡・バリデーションを自動化します。
> `errors.title` でバリデーションエラーを表示します。

**確認ポイント**:
- タイトルと説明の入力欄が表示される
- タイトルが空のまま送信するとエラーメッセージが表示される

スクリーンショット: タイトルと説明の入力欄が表示されている画面。

![タイトルと説明の入力欄が表示されている画面](./screenshots/task-create-dialog.png)
---

### Step 5: ステータス・優先度のSelectを作る（7分）

**ゴール**: `Controller` で Select コンポーネント
をreact-hook-formに接続します。

**実装**:

```typescript
// filepath: src/component/task/task-dialog.tsx
// ステータスSelect（Controller使用）
<div className="grid grid-cols-2 gap-4">
  <div className="grid gap-2">
    <Label htmlFor="status">
      ステータス
    </Label>
    <Controller
      name="status"
      control={control}
      render={({ field }) => (
        <Select
          value={field.value}
          onValueChange={field.onChange}>
          <SelectTrigger id="status"
            aria-label="ステータスを選択">
            <SelectValue
              placeholder=
                "ステータスを選択" />
          </SelectTrigger>
```

続けて、ステータスの選択肢を `TASK_STATUS_LABELS` から生成します。

```typescript
// filepath: src/component/task/task-dialog.tsx
          <SelectContent>
            {Object.entries(
              TASK_STATUS_LABELS
            ).map(([value, label]) => (
              <SelectItem
                key={value}
                value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )} />
  </div>
```

優先度Selectも同じパターンで作ります。

```typescript
// filepath: src/component/task/task-dialog.tsx
// 優先度Select（Controllerで同じパターン）
  <div className="grid gap-2">
    <Label htmlFor="priority">
      優先度
    </Label>
    <Controller
      name="priority"
      control={control}
      render={({ field }) => (
        <Select
          value={field.value}
          onValueChange={field.onChange}>
          <SelectTrigger id="priority"
            aria-label="優先度を選択">
            <SelectValue
              placeholder=
                "優先度を選択" />
          </SelectTrigger>
```

```typescript
// filepath: src/component/task/task-dialog.tsx
          <SelectContent>
            {Object.entries(
              TASK_PRIORITY_LABELS
            ).map(([value, label]) => (
              <SelectItem
                key={value}
                value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )} />
  </div>
```

> `Controller` は、`register` が使えない
> コンポーネント（Select）をreact-hook-formに
> 接続します。`field.value` で現在の値を取得し、
> `field.onChange` で値を更新します。
> `Object.entries(TASK_STATUS_LABELS)` で定数から
> 選択肢を自動生成するので、追加・変更に強い
> 構造になります。

**確認ポイント**:
- ステータスと優先度が選択できる
- 選択肢が日本語で表示される

#### register vs Controller の使い分け

| 対象 | 使う関数 | 理由 |
|------|---------|------|
| Input, Textarea | `register` | `ref` を直接渡せるため |
| Select (shadcn/ui) | `Controller` | 独自の `onValueChange` を使うため |

#### ステータスと優先度の選択肢

| ステータス | 表示名 | 意味 |
|-----------|-------|------|
| `TODO` | 未対応 | 未着手 |
| `IN_PROGRESS` | 進行中 | 作業中 |
| `IN_REVIEW` | レビュー中 | レビュー待ち |
| `DONE` | 完了 | 完了 |
| `CANCELLED` | キャンセル | 取り消し |

| 優先度 | 表示名 |
|-------|-------|
| `LOW` | 低 |
| `MEDIUM` | 中 |
| `HIGH` | 高 |
| `URGENT` | 緊急 |

**確認ポイント**:
- ステータスと優先度が選択できる
- 2列グリッドで横並びになっている

---

### Step 6: プロジェクト・担当者のSelectを作る（5分）

**ゴール**: 外から渡されたデータで選択肢を
表示します。

**実装**:

```typescript
// filepath: src/component/task/task-dialog.tsx
// プロジェクトSelect
  <div className="grid gap-2">
    <Label htmlFor="project">
      プロジェクト
    </Label>
    <Controller
      name="projectId"
      control={control}
      render={({ field }) => (
        <Select
          value={field.value}
          onValueChange={field.onChange}
          disabled={!projects.length}>
          <SelectTrigger id="project"
            aria-label="プロジェクトを選択">
            <SelectValue placeholder=
              "プロジェクトを選択" />
          </SelectTrigger>
```

プロジェクトの選択肢とエラー表示です。

```typescript
// filepath: src/component/task/task-dialog.tsx
          <SelectContent>
            {projects.map((project) => (
              <SelectItem
                key={project.id}
                value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )} />
    {errors.projectId && (
      <p className=
        "text-sm text-destructive">
        {errors.projectId.message}
      </p>
    )}
  </div>
```

```typescript
// filepath: src/component/task/task-dialog.tsx
// 担当者Select
  <div className="grid gap-2">
    <Label htmlFor="assignee">
      担当者
    </Label>
    <Controller
      name="assigneeId"
      control={control}
      render={({ field }) => (
        <Select
          value={
            field.value || 'unassigned'}
          onValueChange={(value) =>
            field.onChange(
              value === 'unassigned'
                ? '' : value)}>
          <SelectTrigger id="assignee"
            aria-label="担当者を選択">
            <SelectValue placeholder=
              "担当者を選択" />
          </SelectTrigger>
```

担当者の選択肢です。

```typescript
// filepath: src/component/task/task-dialog.tsx
          <SelectContent>
            <SelectItem
              value="unassigned">
              未割当
            </SelectItem>
            {users.map((user) => (
              <SelectItem
                key={user.id}
                value={user.id}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )} />
  </div>
```

> 「未割当」を選んだ時は空文字にしたいのですが、shadcn/ui の `Select` は空文字 `''` を有効な値として扱えません（値が空だと選択状態にならず、`placeholder` が表示されてしまいます）。そのため `'unassigned'` を特別な値として使い、送信時に空文字に変換するテクニックが必要です。

**確認ポイント**:
- プロジェクト一覧が表示される
- 担当者一覧に「未割当」がある

スクリーンショット: プロジェクト・担当者のSelect欄が表示されている画面。

![プロジェクト・担当者のSelect欄が表示されている画面](./screenshots/task-create-dialog.png)
---

### Step 7: 期限・見積時間・ボタンを作る（5分）

**ゴール**: 日付入力、数値入力、送信ボタンを
追加します。

**実装**:

```typescript
// filepath: src/component/task/task-dialog.tsx
// 期限と見積時間
  <div className="grid gap-2">
    <Label htmlFor="dueDate">期限</Label>
    <Input id="dueDate" type="date"
      {...register('dueDate')} />
  </div>
  <div className="grid gap-2">
    <Label htmlFor="estimatedHours">
      見積時間
    </Label>
    <Input id="estimatedHours"
      type="number" min="0" step="0.5"
      placeholder="0.0"
      {...register('estimatedHours', {
        setValueAs: (v: string) =>
          v === '' ? undefined : Number(v),
      })} />
  </div>
          </div>
        </div>
```

> `setValueAs` は入力値を変換する関数です。
> 空文字を `undefined` に、それ以外を `Number` に
> 変換します。`type="number"` でも HTML の入力値は
> 文字列なので、この変換が必要です。

```typescript
// filepath: src/component/task/task-dialog.tsx
// 送信・キャンセルボタン
        <DialogFooter>
          <Button type="button"
            variant="outline"
            onClick={handleClose}>
            キャンセル
          </Button>
          <Button type="submit">
            {initialData?.id
              ? '更新' : '作成'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);
}
```

**確認ポイント**:
- 日付ピッカーで期限を選べる
- 見積時間に0.5刻みで入力できる
- 作成ボタンが表示される

#### ボタンの役割

| ボタン | type | 動作 |
|--------|------|------|
| キャンセル | `button` | `handleClose` でリセットして閉じる |
| 作成 / 更新 | `submit` | zodバリデーション → `handleFormSubmit` |

**確認ポイント**:
- キャンセルでフォームがリセットされる
- タイトル未入力で送信するとエラーが表示される

---

### Step 8: ページにDialogを組み込む（7分）

**ゴール**: タスク一覧ページにダイアログを
組み込み、作成処理を実装します。

**実装**:

```typescript
// filepath: src/app/task/page.tsx
import {
  TaskDialog, type TaskFormData,
} from '@/component/task/task-dialog';
import { dateOnlyToUtcStartIso }
  from '@/lib/date';
import { Plus } from 'lucide-react';
```

既存の `useState` 群の末尾（`const utils = api.useUtils()` の直前）に追加します。

```typescript
// filepath: src/app/task/page.tsx
// 既存のuseState群の末尾に追加
const [dialogOpen, setDialogOpen] =
  useState(false);
const [editingTask, setEditingTask] =
  useState<TaskFormData | undefined>();

// 新規作成ボタンのハンドラー
const handleCreate = () => {
  setEditingTask(undefined);
  setDialogOpen(true);
};
```

続けて、既存の `useQuery` 群の末尾にユーザー一覧とセッション取得を追加します。

#### 追加するAPI

| API | 戻り値 | 用途 |
|-----|-------|------|
| `api.search.getProjectMembers` | ユーザー一覧 | 担当者Selectの候補 |
| `api.auth.getSession` | ログイン中のセッション | 作成者IDの確認 |

これらは既に実装済みのAPIです。

```typescript
// filepath: src/app/task/page.tsx
// 既存のuseQuery群の末尾に追加
const { data: users } =
  api.search.getProjectMembers.useQuery();
const { data: session } =
  api.auth.getSession.useQuery();
// utils は上で定義済み
```

**確認ポイント**:
- `users` と `session` のデータ取得が追加できた

create mutationを `utils` の下に追加します。

```typescript
// filepath: src/app/task/page.tsx
// utilsの下に追加
const createMutation =
  api.task.create.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
      setDialogOpen(false);
    },
  });
```

> ここが今日の心臓部です。作成が成功した瞬間に、2つのことをします。1つは `utils.task.getAll.invalidate()` で、一覧のキャッシュに「古い」と印を付けます。すると Day 13 で書いた一覧の `useQuery` がひとりでに取り直し、作ったタスクがすぐ画面に出ます。自分で「一覧をもう一度取りに行く」コードを書かなくてよいのが利点です。もう1つの `setDialogOpen(false)` はダイアログを閉じる処理です。これを `onSuccess` の中に置くのは、作成が成功したときだけ閉じたいからです。もし失敗したらダイアログは開いたままにして、ユーザーがその場で入力を直せるようにします。

```typescript
// filepath: src/app/task/page.tsx
// createMutationの下に追加

// 送信ハンドラー（新規作成のみ）
// Day 15で編集モード（data.id分岐）を追加します
const handleSubmit =
  (data: TaskFormData) => {
    if (!session?.user?.id) { return; }
    createMutation.mutate({
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate
        ? dateOnlyToUtcStartIso(
            data.dueDate
          )
        : undefined,
      estimatedHours:
        data.estimatedHours,
      projectId: data.projectId,
      assigneeId:
        data.assigneeId || undefined,
    });
  };
```

**確認ポイント**:
- 「新規タスク」ボタンでダイアログが開く
- フォーム送信でタスクが作成される
- 一覧に新しいタスクが表示される

スクリーンショット: タスク作成後、一覧画面に新しいタスクが表示されている画面。

![タスク作成後、一覧の先頭に新しいタスクが表示されている](./screenshots/task-list-after-create.png)

#### createMutationに渡すパラメータ

| パラメータ | フロントから送信 | 説明 |
|-----------|---------------|------|
| `title` | 常に送信 | タスク名 |
| `projectId` | 常に送信 | 所属プロジェクト |
| `status` | 常に送信 | ステータス（フォームで選択） |
| `priority` | 常に送信 | 優先度（フォームで選択） |
| `dueDate` | 任意 | ISO 8601文字列 |
| `assigneeId` | 任意 | 担当者ID |

> サーバー側のスキーマでは `status` と `priority` にデフォルト値（TODO / MEDIUM）が設定されていますが、フロントエンドからは常にフォームの選択値を送信します。

```typescript
// filepath: src/app/task/page.tsx
// JSX内にDialogとボタンを追加
<Button onClick={handleCreate}>
  <Plus className="mr-2 h-4 w-4" />
  新規タスク
</Button>

<TaskDialog
  open={dialogOpen}
  onClose={() => setDialogOpen(false)}
  onSubmit={handleSubmit}
  initialData={editingTask}
  projects={projects ?? []}
  users={users ?? []}
/>
```

> `createdById`（作成者ID）はサーバー側で
> セッションから自動的に取得されます。
> フロントエンドから渡す必要はありません。

**確認ポイント**:
- TaskDialogに `initialData` と `projects` が渡されている
- `createdById` をフロントから渡していない

---

### Step 9: 動作確認（3分）

**ゴール**: タスク作成の全体フローを確認
します。

1. 「新規タスク」ボタンをクリック
2. タイトルを入力し、プロジェクトを選択
3. 優先度・ステータス・担当者を設定
4. 「作成」ボタンをクリック
5. ダイアログが閉じ、一覧に新タスクが表示される

**確認ポイント**:
- タスクが作成できる
- 一覧が自動で更新される
- タイトル未入力で送信するとエラーが表示される

---

```bash
# filepath: ターミナル
# 開発サーバーを起動して動作確認
PORT=3001 npm run dev
```


---

### Pro パターンで書こう（タスクのステータス・優先度型を1か所に集約する）

型・zod・ラベル・初期値の定義を1か所に集約すると、値を追加・変更するときの対応漏れを防げます。
なぜ上の書き方をするのか、**Before/After** で見比べてみましょう。

#### Before（改善前のコード）

```typescript
import { z } from 'zod';

type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'DONE'
  | 'CANCELLED';

type TaskPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'URGENT';

const taskFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  status: z.enum([
    'TODO',
    'IN_PROGRESS',
    'IN_REVIEW',
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

```typescript
// filepath: 続き
    'DONE',
    'CANCELLED',
  ]),
  priority: z.enum([
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT',
  ]),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  projectId: z.string().min(1, 'プロジェクトは必須です'),
  assigneeId: z.string().optional(),
});

export interface TaskFormData {
  id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

```typescript
// filepath: 続き
  projectId: string;
  assigneeId?: string;
}

const statusLabels: Record<TaskStatus, string> = {
  TODO: '未対応',
  IN_PROGRESS: '進行中',
  IN_REVIEW: 'レビュー中',
  DONE: '完了',
  CANCELLED: 'キャンセル',
};

const priorityLabels: Record<TaskPriority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '緊急',
};

const defaultTaskValues = {
  status: 'TODO' as TaskStatus,
  priority: 'MEDIUM' as TaskPriority,
};
```

**このコードの問題点**:

- ステータスや優先度の値を、型・zod・ラベル・初期値で何度も書いている
- 新しいステータスを追加したとき、どこか1か所の更新漏れでフォームと表示がずれやすい
- `as TaskStatus` のような型アサーションが増え、実際の値が安全かどうかを型だけで追いにくい

#### After（プロが書くコード）

```typescript
import { z } from 'zod';
import {
  TASK_PRIORITY,
  TASK_PRIORITY_LABELS,
  type TaskPriority,
} from '@/lib/constant/priority';
import {
  TASK_STATUS,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from '@/lib/constant/status';

const taskFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  status: z.nativeEnum(TASK_STATUS),
  priority: z.nativeEnum(TASK_PRIORITY),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  projectId: z.string().min(1, 'プロジェクトは必須です'),
  assigneeId: z.string().optional(),
});

```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

```typescript
// filepath: 続き
type TaskFormValues = z.infer<typeof taskFormSchema>;

export interface TaskFormData {
  id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
  projectId: string;
  assigneeId?: string;
}

const defaultTaskValues: Pick<
  TaskFormValues,
  'status' | 'priority'
> = {
  status: TASK_STATUS.TODO,
  priority: TASK_PRIORITY.MEDIUM,
};

const statusOptions = Object.entries(
  TASK_STATUS_LABELS,
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

```typescript
// filepath: 続き
).map(([value, label]) => ({
  value,
  label,
}));

const priorityOptions = Object.entries(
  TASK_PRIORITY_LABELS,
).map(([value, label]) => ({
  value,
  label,
}));
```

**このコードの強み**:

- ステータスと優先度の正しい値を `TASK_STATUS` / `TASK_PRIORITY` に集約できる
- zod スキーマ・フォーム型・Select 選択肢が同じ定数を参照するので、値のずれが起きにくい
- 新しい値を追加するとき、定数ファイルを中心に見ればよく、変更範囲が読みやすい

#### 覚えておきたいエッセンス

同じ union をあちこちに書くと、最初は速くても後で必ずずれます。
選択肢になる値は、型・バリデーション・表示ラベルを同じ出どころに寄せるのが強いです。

## 今日のまとめ

- [ ] zodスキーマでフォームのバリデーションを定義できた
- [ ] `register` で入力欄をフォームに登録できた
- [ ] `Controller` でSelectをreact-hook-formに接続できた
- [ ] `TASK_STATUS_LABELS` から選択肢を自動生成できた
- [ ] `useMutation` でタスクを保存できた
- [ ] `invalidate()` でキャッシュを自動更新できた

## つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| ダイアログが開かない | `open` propが渡されてない | `open={dialogOpen}` を確認 |
| 作成後に一覧が更新されない | invalidate忘れ | `onSuccess` に追加 |
| Selectの値が更新されない | `Controller` 未使用 | `register` ではなく `Controller` を使う |
| 担当者一覧が空 | users未取得 | `getProjectMembers` の戻り値確認 |
| バリデーションが効かない | `resolver` の設定漏れ | `resolver: zodResolver(taskFormSchema)` を確認 |

## 今日学んだ用語

| 用語 | 意味 |
|------|------|
| TaskDialog | タスクCRUD用のダイアログ |
| Controller | Selectをreact-hook-formで制御するコンポーネント |
| nativeEnum | zodで既存の定数オブジェクトを検証するメソッド |
| TASK_STATUS_LABELS | ステータス値と日本語表示名の対応表 |
| setValueAs | register のオプションで入力値を型変換する関数 |
| getProjectMembers | プロジェクトメンバー一覧を取得するAPI |

## 次回予告

Day 15 では、タスクの編集・削除機能を実装します。
Day 14 で作った TaskDialog を「編集モード」で
再利用する方法を学びます。
