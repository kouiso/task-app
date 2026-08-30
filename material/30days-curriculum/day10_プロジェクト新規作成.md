# Day 10: プロジェクト新規作成を実装しよう

## 前回の振り返り

Day 09 では tRPC の `useQuery` を使ってサーバーからプロジェクトデータを取得しました。あわせて `PageLoadingSpinner` によるローディング表示と、グリッドレイアウトでのカード一覧も実装しました。データの「読み取り」ができるようになったので、今日は「作成」に進みます。

---

## 今日のゴール

ダイアログ（モーダル）形式のフォームで、新しいプロジェクトを作成できるようにします。react-hook-form と zod でフォームのバリデーションと状態管理を担当し、tRPC の `useMutation` でサーバーに保存します。

スクリーンショット: プロジェクト作成ダイアログの表示を確認してください。

![プロジェクト作成ダイアログ](./screenshots/project-create-dialog.png)

## なぜこれを作るのか

プロジェクトがなければタスクも管理できません。ここでは「ダイアログ」という新しいUIパターンを学びます。

> **例え話**: ダイアログは「付箋」のようなものです。ページ全体を移動せずに、今いる画面の上にメモ用紙をペタッと貼って書き込みます。書き終わったら付箋をはがすと、元の画面がそのまま残っています。

### プロジェクト作成の流れ

```mermaid
flowchart TD
    A[新規作成ボタンをクリック] --> B[ProjectDialogが開く]
    B --> C[フォームに入力]
    C --> D{zodバリデーション}
    D -->|OK| E[api.project.create.mutate]
    D -->|NG| F[エラーメッセージ表示]
    E --> G[キャッシュ更新]
    G --> H[ダイアログを閉じる]
    H --> I[一覧に新プロジェクト表示]

    style A fill:#e3f2fd
    style D fill:#fff3e0
    style E fill:#e8f5e9
    style I fill:#c8e6c9
```

この図で目を留めてほしいのは、D の分岐と G の位置です。D の zod は、まだサーバーへ出発する前の、ブラウザ側の門番です。名前が空なら E へ進まず F のエラー表示で折り返すので、通信が1回も起きません。ただしこの門番はブラウザの中にしか居ません。開発者ツールから直接 API を呼ばれれば素通りされるので、Step 0 ではサーバー側にもう1枚同じ門を立てます。

図では G の「キャッシュ更新」を H の手前に置いていますが、大事なのは並び順ではありません。E の保存が成功した時点では、画面が抱えている一覧のデータはまだ作成前のままです。G で取り直しを始めておかないと、H でダイアログを閉じても I の「一覧に新プロジェクト表示」までたどり着けません。ただし G は取り直しを始めるだけで、終わるのを待ちません。ダイアログが閉じた直後の一瞬は、まだ前の一覧が見えていることもあります。この2つは成功したときにどちらも走ればよく、どちらを先に書いても結果は同じです。今日はこの D と G の2か所を、それぞれ Step 0 と Step 7 で手を動かして埋めます。

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| ProjectDialog コンポーネントを作る | 別ページでフォームを作る |
| react-hook-form + zod でフォーム管理 | useState で手動管理 |
| useMutation でサーバーに保存 | fetch を手書きする |
| キャッシュ無効化で一覧を自動更新 | 手動でページリロード |

### 今日触るファイル

```
src/
├── app/
│   └── project/
│       └── page.tsx              ← 編集（Day 09 で作ったページに機能を追加）
├── component/
│   └── project/
│       └── project-dialog.tsx    ← 配布済み。今日 Step 1〜6 で中身を書き直す
└── lib/
    └── constant/
        └── project.ts            ← 既存（定数を利用する）
```

> 今日は Day 09 で作った `src/app/project/page.tsx` に、プロジェクト作成・編集機能を追加します。`project-dialog.tsx` は配布済みですが、今日は Step 1 から Step 6 で中身を自分の手で書き直します。そのあと `page.tsx` と連携させます。
>
> **今日のゴールライン**: 既存コードを「全部理解する」必要はありません。「この部品がこう動く」が見えたら十分です。細かい型やユーティリティは使いながら慣れていきます。

### 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| Dialog | ダイアログ | 画面上に重なるモーダル | 付箋。今の画面の上に貼って書き込む |
| zodResolver（Day 05 の復習） | ゾッド・リゾルバー | zod スキーマで入力値を自動検証する仕組み | 記入用紙のチェック係。書き漏れがあれば教えてくれる |
| register | レジスター | 入力欄を react-hook-form に登録する関数 | 記入欄に名札を付けて、どの欄かを管理する |
| キャッシュ無効化 | — | データ変更後に一覧を自動で再取得 | 掲示板の更新ボタン。新しい投稿を反映する |

> **今日のゴールライン**: 今日は既存のコードを読む場面が多いです。「なぜこう書いてあるか」は全部わからなくて大丈夫です。「ダイアログでプロジェクトを作成できた」という結果が出れば、今日は上出来です。読解力は Day 11 以降で同じパターンを繰り返すうちについてきます。

## 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 0 | プロジェクト作成 API（create）を自分で書く | 12分 |
| Step 1 | ProjectDialogの骨格を作る | 5分 |
| Step 2 | zodスキーマとフォーム設定を作る | 5分 |
| Step 3 | defaultValues と reset で初期値を同期する | 5分 |
| Step 4 | 名前・説明の入力欄を作る | 7分 |
| Step 5 | カラーピッカーと日付欄を作る | 7分 |
| Step 6 | 送信処理を実装する | 5分 |
| Step 7 | ページにDialogを組み込む | 7分 |
| Step 8 | 動作確認 | 3分 |

**合計時間**は約56分です。

この時間はコードを読んで理解する目安です。写経して打ち込む時間、詰まって調べる時間は別に見てください。

---

### Step 0: プロジェクト作成 API（create）を自分で書く（12分）

**ゴール**: `src/server/api/routers/project.ts` に `create` を追加し、`api.project.create` を呼べる状態にします。

Day 09 で書いた `getAll` は、3部品（入力・処理・戻り値）のうち処理が「探す（`.query`）」でした。今日の `create` は「作る（`.mutation`）」になるだけで、骨組みは同じです。

#### 0-1. 入力スキーマを追加する

まず、受け取るデータの形を zod で定義します。`project.ts` の `USER_SELECT` の import の下に追加します。

```typescript
// filepath: src/server/api/routers/project.ts（続き）
import { DEFAULT_PROJECT_COLOR } from '@/lib/constant/project';
import { PROJECT_MEMBER_ROLE } from '@/lib/constant/roles';

const projectCreateSchema = z.object({
  name: z.string().min(1, 'プロジェクト名は必須です'),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .default(DEFAULT_PROJECT_COLOR),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
```

`name` に `.min(1, ...)` が付いているのは、空文字のプロジェクト名を作れないようにするためです。`color` の `.regex(/^#[0-9A-F]{6}$/i)` は「`#` に続いて16進数6桁」という色コードの形をチェックします。16進数で使えるのは `0` から `9` と `A` から `F` の16文字だけなので、`#GGGGGG` のような文字列は通りません。これが無いと、フロント側のバリデーションを迂回して変な文字列が color に入ってしまいます。`.default(DEFAULT_PROJECT_COLOR)` は、色を指定しなかったときに使う既定色です。

このスキーマが本当に効くのは、画面のフォームを通らずに呼ばれたときです。ブラウザの開発者ツールから `api.project.create` を空の名前で叩いても、`.min(1, ...)` に引っかかった時点で `mutation` の中身は1行も動きません。`prisma.project.create` まで届かないので、名前の無い行がテーブルに残ることはありません。色も同じで、`red` や `<script>` のような文字列は `.regex(...)` が弾きます。

つまり、フォーム側の zod は入力中の読者へ赤字を返すためのもので、データベースを守っているのはこちら側です。Day 09 の `getAll` で「他人の userId は管理者しか渡せない」と決めたのと同じ考え方で、画面は親切のため、サーバーは防御のために検証します。この二重化を面倒だと感じたら、フォームを1行も通らない呼び出しが世の中には存在する、と思い出してください。

#### 0-2. ここが一番のヤマ場（作った本人をメンバーに入れる）

`create` の処理本体です。ここで一番大事なのは、プロジェクトを作るのと同時に、作った本人をメンバーとして登録する部分です。

ここから先の「（続き）」のブロックは、`project.ts` の**末尾にある `});` の1行上**へ貼ります。ファイルの一番下に足すとルーターの外に出てしまい、英語のエラーで止まります。`});` は増やしません。

```typescript
// filepath: src/server/api/routers/project.ts（続き）
  create: protectedProcedure.input(projectCreateSchema).mutation(async ({ ctx, input }) => {
    const createData: Prisma.ProjectCreateInput = {
      name: input.name,
      color: input.color,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      members: {
        create: {
          userId: ctx.session.userId,
          role: PROJECT_MEMBER_ROLE.OWNER,
        },
      },
    };
```

`members: { create: { ... } }` は、プロジェクト本体を作るのと同時に、関連する `ProjectMember` の行も1件同時に作る書き方です。プロジェクトとメンバーは別々のテーブルなので、放っておくと2回に分けて書き込む必要がありますが、Prisma はこの入れ子の `create` でまとめて1回の書き込みにできます。

なぜここが一番のヤマ場かというと、Day 09 で書いた `getAll` を思い出すと分かります。`getAll` は「自分がメンバーのプロジェクトだけ」を返す条件になっていました。もしここで `members.create` を忘れると、プロジェクトは作成されるのに、作った本人がメンバーに入っていないので `getAll` の一覧には表示されません。「作ったのに一覧に出てこない」という不具合の原因は、たいていこの登録漏れです。`role: PROJECT_MEMBER_ROLE.OWNER` で、作成者にはオーナー権限を与えます。

#### 0-3. description は値があるときだけ入れる

`description` は入力が任意なので、扱い方を分けます。

```typescript
// filepath: src/server/api/routers/project.ts（続き）
    if (input.description) {
      createData.description = input.description;
    }

    return await prisma.project.create({
      data: createData,
      include: {
        members: {
          include: {
            user: {
              select: USER_SELECT,
            },
          },
        },
      },
    });
  }),
```

最初に作る `createData` には `description` を含めず、値が入力されているときだけ後から足しています。説明欄を空のまま送ると `input.description` は空文字になります。ここで `description: input.description` と書いてしまうと、その空文字がそのまま DB へ書き込まれます。空文字は「説明が無い」ではなく「長さ 0 の説明がある」という値なので、あとで「説明なし」だけを選び出したいときに数が合わなくなります。なお `undefined` のほうは書き込まれません。Prisma は `undefined` を「この項目には何もしない」という指示として読むためです。値があるときだけキー自体を足すと、無いものは無いまま扱われます。この「値がある項目だけオブジェクトに足す」書き方は、Day 11 で編集の手続きを書くときにもう一度出てきます。`include` は `getAll` と同じ形にしています。API を呼ぶ側は、一覧で見るデータと作成直後に返るデータの形が揃っているほうが扱いやすいからです。最後の `}),` で `create` を閉じます。

`root.ts` は Day 09 で `project` を登録済みなので、今日は変更しません。

**確認ポイント**:
- `projectCreateSchema` と `create` を追加し、`getAll` の直後に `}),` `});` まで閉じた
- `members.create` で `userId` と `role: PROJECT_MEMBER_ROLE.OWNER` を渡している
- `npm run dev` で型エラーが出ていない

---

### Step 1: ProjectDialogの骨格を作る（5分）

**ゴール**: ダイアログの基本構造を作ります。

> **例え話**: AppLayout は「建物の共通設備」でしたが、Dialog は「部屋の中で開く小窓」です。中に入力フォームを置いて、書き終わったら閉じます。

**実装**:

```typescript
// filepath: src/component/project/project-dialog.tsx
'use client';

// React と フォームバリデーション関連
import { useEffect } from 'react';
import { zodResolver }
  from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
```

この4つが、フォームの中身を預かる組です。`useEffect` は Step 3 で、ダイアログを開くたびに初期値を入れ直すときに使います。ここで取り込んでおかないと、Step 3 で `Cannot find name 'useEffect'` というエラーになります。

続けて、画面の部品を取り込みます。

```typescript
// filepath: src/component/project/project-dialog.tsx（続き）
// shadcn/uiコンポーネント
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
import { Textarea }
  from '@/component/ui/textarea';
// プロジェクトのデフォルト色
import { DEFAULT_PROJECT_COLOR }
  from '@/lib/constant/project';
```

取り込んだ部品は3つの役割に分かれます。`zodResolver`、`useForm`、`z` はフォームの中身を預かる組で、入力値の保持と検証をこの3つが引き受けます。`Dialog` から `DialogTitle` までの6つは、shadcn/ui が用意した1つのダイアログを段ごとに分けたものです。枠、本体、見出し、説明文、足元のボタン置き場、と役割が分かれているので、必要な段だけを重ねて組み立てられます。

残りは入力欄と定数です。`Input`、`Textarea`、`Label` が実際に文字を打つ場所、`DEFAULT_PROJECT_COLOR` は色を選ばなかったときに入る既定色で、Step 0 のサーバー側スキーマと同じ値を見ています。Day 09 の一覧ページで `Button` や `Switch` を先に取り込んでから組み立てたのと、進め方は変わりません。

**確認ポイント**:
- コードの内容を確認した
- すべてのimportが確認できた

続いて、Props（親から子のコンポーネントへ渡す値、読み方はプロップス）の型定義を確認します。

```typescript
// filepath: src/component/project/project-dialog.tsx
// Props の型定義
interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
  initialData?:
    ProjectFormData | undefined;
}

// フォームデータの型
export interface ProjectFormData {
  id?: string;
  name: string;
  description?: string;
  color: string;
  startDate?: string;
  endDate?: string;
}
```

この2つの型が、ダイアログと呼び出し側の約束事です。`open` を親から受け取っているのは、ダイアログ自身に開閉を覚えさせないためです。Day 09 で `page.tsx` に置いた `dialogOpen` がその値の持ち主で、開けたい側が開き、閉じたい側が閉じます。`onSubmit` も同じ考え方で、入力の終わったデータを外へ渡すだけにしておくと、保存の中身をダイアログが知らずに済みます。

だからこの1つの部品を、今日の作成にも Day 11 の編集にも使い回せます。`initialData` に `?` が付いているのはそのためで、新規作成では初期値そのものが存在しません。もし型から `?` を外すと、今日の呼び出しで「値が足りない」と TypeScript に止められます。

> `onClose` は「ダイアログを閉じる」ためのコールバックです。親コンポーネントが `setDialogOpen(false)` を渡します。

**確認ポイント**:
- `npm run dev` を動かしたまま、ターミナルに型エラーが出ていない
- `ProjectDialogProps` と `ProjectFormData` の定義を理解した

---

### Step 2: zodスキーマとフォーム設定を作る（5分）

**ゴール**: zod でバリデーションルールを定義し、react-hook-form で入力管理します。

**実装**:

```typescript
// filepath: src/component/project/project-dialog.tsx
// zodスキーマでバリデーションルールを定義
const projectFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1,
    'プロジェクト名は必須です'),
  description: z.string().optional(),
  color: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// スキーマから型を自動生成
type ProjectFormValues =
  z.infer<typeof projectFormSchema>;
```

画面側のスキーマは、サーバーへ送る前にブラウザで入力を確かめるためのものです。`id` を `optional` にしているのは、新規作成の時点ではまだ ID が無いためです。

続けて、初期値を作る関数を同じファイルへ書きます。

```typescript
// filepath: src/component/project/project-dialog.tsx（同じファイルの続き）
// 作成でも編集でも同じ形の初期値を作る
function buildProjectFormValues(
  initialData: ProjectFormData | undefined,
): ProjectFormValues {
  return {
    id: initialData?.id,
    name: initialData?.name ?? '',
    description:
      initialData?.description ?? '',
    color: initialData?.color
      ?? DEFAULT_PROJECT_COLOR,
    startDate:
      initialData?.startDate ?? '',
    endDate: initialData?.endDate ?? '',
  };
}
```

`buildProjectFormValues` は、フォームの初期値を1か所で作る関数です。新規作成のときは
`initialData` が `undefined` なので、`??` の右側が使われて空文字と既定の色が入ります。
編集のときは渡された値がそのまま入ります。この関数が無いと、作成と編集で初期値の作り方が
2通りに分かれ、片方だけ直して食い違う原因になります。

Step 0 で書いたサーバー側のスキーマと、ここで書く画面側のスキーマは、見た目がよく似ています。ただし役割は別です。サーバー側は保存してよいかどうかの最終判定で、こちらは入力中の読者へ赤字を返すための下書きチェックです。だから `color` は `z.string()` だけにしてあり、色コードの形までは見ていません。形の検査はサーバー側の `.regex(...)` が持っているので、ここで二重に厳しくしても防げる事故が増えないためです。

`id` が `optional` なのは、新規作成の時点ではまだ ID が存在しないからです。ID はサーバーがデータベースへ書き込んだ瞬間に決まります。Day 11 の編集で初めてここに値が入り、同じスキーマが編集フォームにも使えるようになります。

**確認ポイント**:
- `npm run dev` を動かしたまま、ターミナルに型エラーが出ていない
- `name` フィールドに `min(1)` バリデーションが設定されている

#### zodスキーマの各フィールド

| フィールド | バリデーション | 意味 |
|-----------|-------------|------|
| `name` | `z.string().min(1, ...)` | 1文字以上必須 |
| `description` | `z.string().optional()` | 入力は任意 |
| `color` | `z.string()` | 色コード（必須） |
| `startDate` | `z.string().optional()` | 開始日（任意） |
| `endDate` | `z.string().optional()` | 終了日（任意） |

> `z.infer<typeof projectFormSchema>` は、zod スキーマから TypeScript の型を自動生成する機能です。スキーマと型が常に一致するので、ズレが起きません。

---

### Step 3: defaultValues と reset で初期値を同期する（5分）

**ゴール**: `useForm` の `defaultValues` と `useEffect(reset)` を使って、ダイアログが開くたびにフォームの初期値を同期します。

**実装**:

```typescript
// filepath: src/component/project/project-dialog.tsx
// コンポーネント本体
export function ProjectDialog({
  open, onClose, onSubmit, initialData,
}: ProjectDialogProps) {
  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(
      projectFormSchema),
    defaultValues:
      buildProjectFormValues(initialData),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      buildProjectFormValues(initialData)
    );
  }, [initialData, open, reset]);
```

`useForm` を1回呼ぶと、入力欄の値・エラー・送信処理をまとめて預けられます。`useState` で欄ごとに変数を持つ書き方だと、欄が5つあれば宣言も5つ必要でした。ここでは欄が増えても宣言は1つのままです。`resolver` に `zodResolver(projectFormSchema)` を渡してあるので、送信のたびにスキーマの検査が自動で走り、`errors` に結果が入ります。

`useEffect` の中で `reset(...)` を呼んでいるのは、`defaultValues` がフォームを最初に作る一度きりしか効かないためです。同じダイアログを閉じて別のプロジェクトで開き直しても、`defaultValues` は読み直されません。何もしないと前回打った文字がそのまま残るので、開いた瞬間に `reset` で入れ替えます。先頭の `if (!open)` は、閉じているあいだの無駄な入れ替えを止める見張りです。

**確認ポイント**:
- `useForm` に `resolver` と `defaultValues` が設定されている
- ダイアログが開いていて `initialData` が変わったときに `reset(...)` を呼んでいる
- `register`, `handleSubmit`, `reset`, `errors` を取得している
- `npm run dev` で型エラーが出ていない

#### useForm の設定

| 設定 | 役割 |
|------|------|
| `resolver: zodResolver(...)` | zodスキーマでバリデーションを実行 |
| `defaultValues` | フォームを最初に作るときの初期値 |
| `reset(...)` | ダイアログを開き直して `initialData` が変わったとき、フォームの値を同期 |
| `buildProjectFormValues(...)` | 作成・編集どちらでも同じ形のフォーム初期値を作る関数 |

> `defaultValues` はフォーム作成時の初期値です。ただし同じダイアログを別プロジェクトで開き直すと `initialData` が変わるため、`useEffect` の中で `reset(...)` を呼んで再同期します。`setState` で入力値を1つずつ持つのではなく、react-hook-form にまとめて管理させるのがポイントです。`DEFAULT_PROJECT_COLOR` がカラーの初期値として使われている点にも注目してください。

---

### Step 4: 名前・説明の入力欄を作る（7分）

**ゴール**: プロジェクト名と説明の入力フォームを追加します。

**実装**:

まず、ダイアログを閉じるハンドラーと送信ハンドラーを作ります。

```typescript
// filepath: src/component/project/project-dialog.tsx
// ダイアログを閉じるハンドラー
const handleClose = () => {
  reset();
  onClose();
};

// フォーム送信ハンドラー
const handleFormSubmit =
  (data: ProjectFormValues) => {
    const submitData: ProjectFormData = {
      ...(data.id !== undefined
        && { id: data.id }),
      name: data.name,
      color: data.color,
      ...(data.description
        && { description:
          data.description }),
      ...(data.startDate
        && { startDate: data.startDate }),
      ...(data.endDate
        && { endDate: data.endDate }),
    };
    onSubmit(submitData);
  };
```

`handleClose` が `reset()` と `onClose()` を両方呼んでいるのは、ダイアログを閉じても入力欄の中身はそのまま残るためです。閉じるだけにすると、次に「新規プロジェクト」を押したとき、前回書きかけた名前が入ったまま開きます。読者から見ると、自分が入力した覚えのない文字が最初から入っている画面になります。

送信する側で `...(data.description && { ... })` と書いているのは、空欄の項目をそもそも送らないためです。Step 0 のサーバー側は、送られてこなかった項目には何もしません。空文字を送ると、そちらは「長さ0の説明がある」という値として保存されます。

**確認ポイント**:
- `handleClose` でフォームのリセットとダイアログの閉じが両方行われる
- `...(data.description && { description: data.description })` は「description が入力されている場合だけプロパティを含める」条件付きスプレッド。`&&` はこの場面で null/undefined を埋める働きとは違い、「真なら含める」という意味で使う。`??` とは用途が異なる

続いて、JSX を返します。Dialog の中にフォームを配置します。

```typescript
// filepath: src/component/project/project-dialog.tsx
return (
  <Dialog open={open}
    onOpenChange={(isOpen) =>
      !isOpen && handleClose()}>
    <DialogContent
      className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>
          {initialData?.id
            ? 'プロジェクト編集'
            : 'プロジェクト作成'}
        </DialogTitle>
        <DialogDescription>
          {initialData?.id
            ? 'プロジェクトの詳細を更新します。'
            : '新しいプロジェクトを作成します。'}
        </DialogDescription>
      </DialogHeader>
```

`Dialog` は `open` が `true` のあいだだけ画面に出ます。`onOpenChange` は、閉じるボタン以外の閉じ方をされたときの受け口です。読者は背景の暗い部分をクリックしたり、Esc キーを押したりして閉じます。`!isOpen && handleClose()` と書いておけば、どの閉じ方でも必ず `handleClose` を通るので、入力欄のリセット漏れが起きません。ここを `onClose` に直結させると、リセットを飛ばした閉じ方が生まれます。

見出しと説明文を `initialData?.id` で切り替えているのは、この1つのダイアログを作成と編集の両方で使うためです。今日は `initialData` を渡さないので、`initialData?.id` は `undefined` になり、常に「プロジェクト作成」側が表示されます。編集側の文言が出るのは Day 11 からです。

**確認ポイント**:
- `Dialog` の `onOpenChange` で閉じ動作をハンドリングしている
- `initialData?.id` の有無でタイトルが「作成」と「編集」に切り替わる

プロジェクト名の入力欄です。`{...register('name')}` でフォームに登録します。

```typescript
      {/* filepath: src/component/project/project-dialog.tsx */}
      <form onSubmit={
        handleSubmit(handleFormSubmit)}>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              プロジェクト名
            </Label>
            <Input id="name"
              placeholder=
                "プロジェクト名を入力"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              {...register('name')} />
            {errors.name && (
              <p id="name-error"
                className=
                "text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>
```

`{...register('name')}` の1行で、この入力欄は react-hook-form の管理下に入ります。`value` と `onChange` を自分で書かなくても、打った文字はフォームの内側に貯まっていきます。`Label` の `htmlFor="name"` と `Input` の `id="name"` をそろえてあるのは、ラベルの文字をクリックしたときにカーソルが入力欄へ移るようにするためです。読み上げソフトも、この対応関係を見てどの欄の見出しかを判断します。

`errors.name` は zod が出したエラーの置き場で、`min(1)` に引っかかったときだけ中身が入ります。`&&` で囲ってあるので、エラーが無いあいだは赤字の `<p>` そのものが描かれません。名前を空のまま「作成」を押すと、通信は起きずにこの1行が現れます。Step 0 のサーバー側まで届く前に、画面の中で折り返しているためです。

`aria-invalid` と `aria-describedby` は、赤い文字を「見えている人」以外にも届けるための指定です。色の違いを見分けにくい人や、画面を読み上げて使う人には、赤字というだけでは何も伝わりません。`aria-describedby` をエラーのあるときだけ付けているのは、`id="name-error"` の `<p>` がエラーのないあいだは描かれないからです。無い相手を指したままにしません。この2つを書いておくと、読み上げソフトは入力欄へ戻ったときに「入力に誤りがあります」と伝え、その文言をそのまま読みます。Day 14 のタスク作成フォームでも同じ形で書きます。

**確認ポイント**:
- `{...register('name')}` でフォームに登録されている
- `errors.name` でバリデーションエラーを表示している
- `aria-describedby` の値と、エラーの `<p>` の `id` が同じ文字列になっている

説明欄を追加します。

```typescript
          {/* filepath: src/component/project/project-dialog.tsx */}
          <div className="grid gap-2">
            <Label htmlFor="description">
              説明
            </Label>
            <Textarea
              id="description"
              placeholder=
                "プロジェクトの説明..."
              rows={4}
              {...register('description')}
            />
          </div>
```

**確認ポイント**:
- `Textarea` に `{...register('description')}` が設定されている

> `{...register('name')}` は、入力欄に `name`, `onChange`, `onBlur`, `ref` をまとめて設定するスプレッド構文です。`value` と `onChange` を手動で書く必要がなくなります。

**確認ポイント**:
- プロジェクト名の入力欄が表示される
- 名前が空のまま送信するとエラーメッセージが表示される
- DialogDescription でモードに応じた説明文が表示される

---

### Step 5: カラーピッカーと日付欄を作る（7分）

**ゴール**: プロジェクトの色と期間を設定できるようにします。

**実装**:

カラー・開始日・終了日を横並び3列で配置します。

```typescript
          {/* filepath: src/component/project/project-dialog.tsx */}
          <div className=
            "grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="color">
                カラー
              </Label>
              <Input id="color"
                type="color"
                className="h-10"
                {...register('color')} />
            </div>
```

ここから先の3つは `grid-cols-3` で横一列に並べます。カラー・開始日・終了日はどれも幅の狭い欄なので、縦に積むとダイアログが間延びして、名前と説明の欄が画面の上へ押し出されます。Day 09 の一覧でカードを格子状に並べたときと同じ考え方で、横幅の余りを列に変えています。

色の欄が Step 4 の名前欄と違うのは、`placeholder` を持たない点です。色には「まだ何も入っていない」という状態がなく、`DEFAULT_PROJECT_COLOR` が最初から入っています。読者がカラーピッカーに触らなくても、必ず何かの色を持ったまま送信されます。だから Step 0 のサーバー側でも、`color` に付けているのは形を確かめる `.regex(...)` と既定値を用意する `.default(...)` の2つで、空を弾く `.min(1)` は付けていません。

**確認ポイント**:
- `type="color"` でカラーピッカーが表示される

選んだ色は、あとで Day 29 のユーザー詳細ページでバッジの背景になります。そのバッジは文字を白で描くので、明るい色を選ぶと白い文字が背景に溶けて読めなくなります。`#1E3A8A`（濃い青）、`#166534`（濃い緑）、`#7C2D12`（濃い茶）のように、暗めの色を選んでください。既定値の `#1976d2` も白文字が読める明るさですが、余裕はわずかです。

```typescript
            {/* filepath: src/component/project/project-dialog.tsx */}
            <div className="grid gap-2">
              <Label htmlFor="startDate">
                開始日
              </Label>
              <Input id="startDate"
                type="date"
                {...register('startDate')}
              />
            </div>
```

開始日の欄に `type="date"` を指定すると、ブラウザ標準の日付ピッカー（カレンダーから日を選ぶ小窓）が開きます。ここでフォームに入る値は `2026-04-01` のような文字列で、時刻は含みません。

この「時刻を持たない文字列」という性質を覚えておいてください。Step 7 で日付をわざわざ変換するのは、これが理由です。`2026-04-01` のような日付だけの文字列を `new Date(...)` に渡すと、JavaScript の仕様では世界共通の基準時刻（UTC）の0時として読まれます。ところが `2026-04-01T00:00:00` のように時刻まで書いて末尾に `Z` が無い文字列は、動かしているパソコンの時間帯の0時として読まれます。同じ「0時」でも、文字列の書き方によって指す瞬間が変わります。この違いを覚え違えたまま自前で変換すると、保存された日付が1日ずれます。入力の見た目は正しいのに保存だけが狂うので、原因を探しにくい種類の不具合です。Step 7 で使う `dateOnlyToUtcStartIso` は、`2026-04-01T00:00:00.000Z` のように `Z` を付けてUTCだと書き切る関数です。どちらの読まれ方になるかを毎回思い出さなくても、狙った瞬間で保存できます。

**確認ポイント**:
- `type="date"` で日付ピッカーが表示される

続いて、終了日フィールドとフォーム全体の閉じタグを追加します。

```typescript
            {/* filepath: src/component/project/project-dialog.tsx */}
            <div className="grid gap-2">
              <Label htmlFor="endDate">
                終了日
              </Label>
              <Input id="endDate"
                type="date"
                {...register('endDate')}
              />
            </div>
          </div>
        </div>
```

> `type="color"` を指定すると、ブラウザ標準のカラーピッカーが表示されます。`className="h-10"` で他の入力欄と高さを揃えています。`{...register('color')}` で、選んだ色が自動的にフォームの値として管理されます。

**確認ポイント**:
- カラーピッカーで色を選べる
- 開始日・終了日を入力できる

スクリーンショット: フォーム入力中のダイアログの表示を確認してください。

![フォーム入力中のダイアログ](./screenshots/project-create-dialog.png)

---

### Step 6: 送信処理を実装する（5分）

**ゴール**: 送信ボタンとキャンセルボタンを追加します。

**実装**:

```typescript
        {/* filepath: src/component/project/project-dialog.tsx */}
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

`DialogFooter` はボタンを右下にそろえる置き場で、中身は書いた順に左から並びます。キャンセルに `type="button"` を書いているのは、`<form>` の内側にあるボタンが、指定しないかぎり送信ボタンとして扱われるからです。この1語を落とすと、キャンセルを押した瞬間に送信が走り、名前が空なら zod のエラーまで出ます。閉じたいだけなのに赤字が出る、という妙な挙動の正体はこれです。

作成ボタンの `type="submit"` は逆に、押されたら `handleSubmit` に検証を回してもらう指定です。検証を通ったときだけ `handleFormSubmit` へ値が渡り、通らなければ何も起きません。文言を `initialData?.id` で「作成」と「更新」に切り替えてあるので、Day 11 で編集を足すときも、この部分は1文字も書き換えずに済みます。

**確認ポイント**:
- 作成ボタンとキャンセルボタンが表示される
- プロジェクト名が空のまま送信するとzodのエラーメッセージが表示される
- キャンセルでダイアログが閉じ、フォームがリセットされる
- キャンセル後にダイアログを再度開くと、前回の入力内容がクリアされている

#### ボタンの役割

| ボタン | type | 動作 |
|--------|------|------|
| キャンセル | `button` | `handleClose` でフォームをリセットし、ダイアログを閉じる |
| 作成 / 更新 | `submit` | `handleSubmit` → zodバリデーション → `handleFormSubmit` |

> `type="button"` を指定しないと、キャンセルボタンでもフォーム送信が実行されてしまいます。キャンセル時は `handleClose` で `reset()` を呼び、フォームの入力内容をクリアしてから閉じます。

---

### Step 7: ページにDialogを組み込む（7分）

**ゴール**: プロジェクト一覧ページにダイアログを組み込み、作成処理を実装します。

Day 09 では「新規プロジェクト」ボタンを押すと
`dialogOpen` が `true` になるところまで作りました。
今日はその state に `ProjectDialog` をつなぎます。

**実装**:

```typescript
// filepath: src/app/project/page.tsx
// import群に追加
import {
  ProjectDialog,
  type ProjectFormData,
} from
  '@/component/project/project-dialog';
import {
  dateOnlyToUtcStartIso,
} from '@/lib/date';
```

取り込む3つは、どれも今日つなぎ込む相手です。`ProjectDialog` は Step 1 から Step 6 で読んできたダイアログ本体、`ProjectFormData` はそのダイアログが送信時に渡してくるデータの型です。`ProjectFormData` の前だけ `type` が付いているのは、これが型の情報しか持たず、動くコードとしては何も残らないためです。

`dateOnlyToUtcStartIso` は、Step 5 で触れた読まれ方の違いを吸収する関数です。`2026-04-01` のような日付だけの文字列を受け取り、世界共通の基準時刻の0時として組み立て直します。パソコンの時間帯を見ないので、どの国で操作しても同じ値が保存されます。

**確認ポイント**:
- importを追加した

```typescript
// filepath: src/app/project/page.tsx
// ProjectPageContent内、dialogOpen state の下に追加
// tRPCのキャッシュ操作ユーティリティ
const utils = api.useUtils();

// プロジェクト作成mutation
const createMutation =
  api.project.create.useMutation({
    onSuccess: () => {
      // 一覧キャッシュを無効化して再取得
      utils.project.getAll.invalidate();
      setDialogOpen(false);
    },
  });
```

`api.useUtils()` は、tRPC が裏で抱えているキャッシュ（一度取ったデータの控え）に触るための取っ手です。`useMutation` は Day 09 の `useQuery` と対をなす道具です。違うのは走り出すきっかけです。`useQuery` はページを開いた時点で取得が始まりますが、`useMutation` は `mutate` を呼ぶまで動きません。作成や更新は読者がボタンを押して初めて起こることなので、この差がそのまま使い分けになります。

`onSuccess` は、サーバーが成功を返したあとだけ通る場所です。名前が空だったりログインが切れていたりして `create` が失敗すれば、ここは呼ばれません。だから「保存できていないのにダイアログだけ閉じる」という食い違いが起きません。閉じる処理をこの中に置いているのは、それを保証するためです。

ただし、失敗したときに画面へ何も出ない点には注意してください。ダイアログは開いたままですが、理由はどこにも表示されません。この教材では、失敗を知らせる仕組みを Day 15 で `toast.error` として足します。それまでの Day 10 から Day 14 は、参照実装に合わせて `onError` を書きません。実務では必ずどちらかを付けます。

**確認ポイント**:
- `useUtils` でキャッシュ操作ユーティリティを取得している
- `onSuccess` でキャッシュ無効化とダイアログ閉じを行っている

次に、送信ハンドラーを追加します。
Day 10 では新規作成だけを扱います。
編集処理は Day 11 で追加します。

```typescript
// filepath: src/app/project/page.tsx
// createMutation の下に追加
const handleSubmit = (
  data: ProjectFormData
) => {
  createMutation.mutate({
    name: data.name,
    description: data.description,
    color: data.color,
    startDate: data.startDate
      ? dateOnlyToUtcStartIso(
          data.startDate)
      : undefined,
    endDate: data.endDate
      ? dateOnlyToUtcStartIso(
          data.endDate)
      : undefined,
  });
};
```

**確認ポイント**:
- `handleSubmit` が `createMutation.mutate` を呼んでいる
- 日付未入力は `undefined` で渡している

> `new Date(data.startDate)` の読まれ方は、渡す文字列の形で変わります。日付だけなら UTC の 00:00、時刻まで書いて末尾に `Z` が無ければローカルの 00:00 です。自前で組み立てると、この差を取り違えて別の日付を保存してしまいます。日付だけを扱う入力では、`dateOnlyToUtcStartIso` のような専用ヘルパーで UTC の時刻を明示します。

最後に JSX 内へ `ProjectDialog` を組み込みます。

```typescript
{/* filepath: src/app/project/page.tsx */}
{/* JSX内（AppLayoutの閉じタグの前） */}
<ProjectDialog
  open={dialogOpen}
  onClose={() => setDialogOpen(false)}
  onSubmit={handleSubmit}
/>
```

渡している値は3つだけです。`open` に `dialogOpen` をつなぐと、Day 09 で置いた「新規プロジェクト」ボタンが今日から本当にダイアログを開きます。`onClose` はダイアログ側の `handleClose` から呼ばれて `dialogOpen` を `false` に戻し、`onSubmit` は入力済みのデータを `handleSubmit` へ運びます。Day 09 では受け皿だけ作って何も起きなかった部分が、これで最後までつながります。

一覧の取り直しが要る理由も、この形から見えます。`useQuery` が返している `projects` は、ページを開いた時点でサーバーから受け取った配列の控えです。`create` の返り値はその控えに自動では足されません。だから `invalidate()` を呼ばないと、保存は済んでいるのに一覧は作成前のまま止まります。読者からは「作成ボタンが効いていない」ように見えて、ページを再読み込みすると新しいカードが現れます。この症状が出たら、まず `onSuccess` の中身を疑ってください。

> `utils.project.getAll.invalidate()` はキャッシュの無効化です。これを呼ぶと、作成後に一覧が自動で取り直され、新しいプロジェクトが表示されます。Day 11 では `initialData` に編集対象のプロジェクトを渡して、同じダイアログを編集にも再利用します。

**確認ポイント**:
- 新規作成ボタンでダイアログが開く
- フォーム送信でプロジェクトが作成される
- 一覧に新しいプロジェクトが表示される

スクリーンショット: 作成後の一覧に追加されたプロジェクトの表示を確認してください。

![作成後に一覧へ追加されたポートフォリオサイトのカード](./screenshots/project-list-after-create.png)

---

### Step 8: 動作確認（3分）

**ゴール**: プロジェクト作成の全体フローを確認します。

開発サーバーを起動します。

```bash
# filepath: ターミナル
# 開発サーバーを起動
PORT=3001 npm run dev
```

**確認ポイント**:
- `http://localhost:3001` にアクセスできる

以下の手順で動作を確認してください。

| # | 操作 | 期待される結果 |
|---|------|--------------|
| 1 | 「新規プロジェクト」ボタンをクリック | ダイアログが開く |
| 2 | プロジェクト名を空のまま「作成」 | エラーメッセージが表示される |
| 3 | プロジェクト名を入力し、色を選択 | エラーが消える |
| 4 | 「作成」ボタンをクリック | ダイアログが閉じる |
| 5 | 一覧を確認 | 新しいプロジェクトが追加されている |
| 6 | カードの色帯を確認 | 選んだ色が反映されている |

スクリーンショット: 完成した作成フローの表示を確認してください。

![完成した作成フロー](./screenshots/project-create-dialog.png)
**確認ポイント**:
- プロジェクトが作成できる
- 一覧が自動で更新される（ページリロードなし）
- カードに選んだ色が反映されている
- キャンセルで入力がリセットされる


---

### Pro パターンで書こう（作成後はリロードせず一覧キャッシュを更新する）

一覧クエリを無効化して再取得すると、フィルターやスクロール位置を維持したまま画面を最新の状態に保てます。
なぜ直前の1文の書き方をするのか、**Before/After** で見比べてみましょう。

### Before（改善前のコード）

```typescript
'use client';

import { api } from '@/trpc/react';

type ProjectFormData = {
  name: string;
  description?: string;
  color: string;
  startDate?: string;
  endDate?: string;
};

export function useCreateProjectSubmit(onClose: () => void) {
  const createMutation = api.project.create.useMutation({
    onSuccess: () => {
      onClose();
      window.location.reload();
    },
  });

  const submitProject = (data: ProjectFormData) => {
    createMutation.mutate({
      name: data.name,
      description: data.description,
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

ここまでが Before の前半です。`onSuccess` の中の `window.location.reload()` に目を留めてください。この1行はページを丸ごと読み込み直すので、一覧は確かに新しくなります。ただし戻ってくるのは開いた直後の画面です。Day 09 で作ったアーカイブ表示スイッチも、途中まで下げていたスクロール位置も既定へ戻ります。作ったばかりのプロジェクトを自分で探し直すことになるので、1件作るたびに読者の手が止まります。後半では、この関数がサーバーへ何を送っているかを見ます。

```typescript
// filepath: 読み比べ用サンプル（続き・実ファイルには対応しません）
      color: data.color,
      startDate: data.startDate,
      endDate: data.endDate,
    });
  };

  return {
    submitProject,
    isPending: createMutation.isPending,
  };
}
```

**このコードの問題点**:

- 作成後にページ全体をリロードするので、一覧以外の状態まで全部リセットされる
- フィルターやスクロール位置が消えて、ユーザーが今いた場所を見失いやすい
- tRPCのキャッシュを使っているのに、ブラウザ再読み込みで力技の更新になっている

3つとも、作成そのものは成功しているのに使い勝手だけが落ちる種類の問題です。画面にエラーが出ないので、書いた本人は気づけません。気づくのは、アーカイブ表示を切り替えてから新規作成した読者で、そのたびに条件を入れ直すことになります。tRPC はキャッシュを一覧ごとに捨てる手段を持っているので、ページ全体を捨てる必要はありません。

### After（プロが書くコード）

```typescript
'use client';

import { api } from '@/trpc/react';

type ProjectFormData = {
  name: string;
  description?: string;
  color: string;
  startDate?: string;
  endDate?: string;
};

export function useCreateProjectSubmit(onClose: () => void) {
  const utils = api.useUtils();

  const createMutation = api.project.create.useMutation({
    onSuccess: () => {
      void utils.project.getAll.invalidate();
      onClose();
    },
  });

  const submitProject = (data: ProjectFormData) => {
    createMutation.mutate({
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

ここまでが After の前半です。Before との違いは `void utils.project.getAll.invalidate()` の1行に集まっています。`invalidate` は「この一覧の控えはもう古い」と印を付ける操作で、印の付いたクエリを今表示しているページだけが取り直します。ページそのものは生き残るので、スイッチとスクロール位置はそのまま残ります。頭の `void` は、取り直しの完了を待たずに次の `onClose()` へ進むという意思表示です。ダイアログは先に閉じてよく、新しいカードは届き次第あとから並びます。後半は Before と同じ送信部分なので、見比べる箇所はここまでです。

```typescript
// filepath: 読み比べ用サンプル（続き・実ファイルには対応しません）
      name: data.name,
      description: data.description,
      color: data.color,
      startDate: data.startDate,
      endDate: data.endDate,
    });
  };

  return {
    submitProject,
    isPending: createMutation.isPending,
  };
}
```

**このコードの強み**:

- `project.getAll` のキャッシュだけを無効化するので、必要な一覧だけ再取得できる
- ダイアログを閉じてもページ全体は残るため、表示条件や操作中の流れが途切れにくい
- 作成、更新、削除でも同じ `mutation + invalidate` の型を使い回せる

3つ目が、今日いちばん持ち帰ってほしい形です。Day 11 で足す編集と削除は、`mutation` の名前が変わるだけで、`onSuccess` で一覧を無効化する部分はそのまま使い回せます。作成のうちにこの骨組みをつかんでおくと、次の似た手続きは説明を読まずに自分で書けます。

#### 覚えておきたいエッセンス

データを変えた後は、ページを丸ごとリロードするより **変わった一覧だけ再取得する** ほうが自然です。
tRPCでは `mutation` の成功時に `invalidate()` を呼ぶ、この形を覚えておきましょう。

## 完成コード全体

今日は3つのファイルを触りました。断片を貼り重ねる作業が続いたので、途中でどこへ貼ったか分からなくなった場合は、以下のコードを上から順に貼り付けて、各ファイルを置き換えてください。1つのファイルが複数のブロックに分かれている場合は、そのファイルの見出しの下にあるブロックを、出てくる順につなげたものが全文です。`project.ts` と `page.tsx` は Day 09 で作り始めたファイルなので、Day 09 で書いた部分もあわせて載せています。

| ファイル | 役割 | 対応する Step |
|---------|------|--------------|
| `src/server/api/routers/project.ts` | プロジェクトの取得と作成を受け持つサーバー側の手続き | Step 0（Day 09 の `getAll` を含む） |
| `src/component/project/project-dialog.tsx` | 作成フォームを載せるダイアログ本体 | Step 1 から Step 6 |
| `src/app/project/page.tsx` | 一覧ページとダイアログの配線 | Step 7（Day 09 の一覧を含む） |

### `src/server/api/routers/project.ts`

**import と作成用スキーマ**:

```typescript
// filepath: src/server/api/routers/project.ts
// 完成版: import と作成用スキーマ
import type { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { DEFAULT_PROJECT_COLOR } from '@/lib/constant/project';
import { PROJECT_MEMBER_ROLE, USER_ROLE } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { USER_SELECT } from './_helpers/select';

const projectCreateSchema = z.object({
  name: z.string().min(1, 'プロジェクト名は必須です'),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .default(DEFAULT_PROJECT_COLOR),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
```

Step 0 では `PROJECT_MEMBER_ROLE` を別の行で取り込みましたが、ここでは Day 09 の `USER_ROLE` と1行にまとめてあります。`npm run fix` を実行すると、Biome（このプロジェクトのコード整形ツール）が同じファイルからの取り込みを1行へ寄せるためです。手元が2行のままでも中身は変わりません。スキーマをルーターの外に置いてあるのは、`create` の `.input(...)` から名前で参照するだけで足りるからです。

**getAll の入口と権限チェック**:

```typescript
// filepath: src/server/api/routers/project.ts
// 完成版: getAll の入口と権限チェック
export const projectRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          userId: z.string().cuid().optional(),
          isArchived: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.ProjectWhereInput = {};

      if (input?.userId && input.userId !== ctx.session.userId) {
        if (ctx.session.role !== USER_ROLE.ADMIN) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '管理者権限が必要です',
          });
        }
      }
```

`where` を空のオブジェクトから始めているのは、条件を後から足していく形にするためです。条件の有無で `findMany` の呼び出しを何通りも書き分けずに済みます。権限の確認を検索条件の組み立てより前に置いてあるのは、弾く判断を先に済ませるためです。あとに回すと、断るはずの相手のために検索条件を組み立てる無駄が生まれます。

**getAll の検索条件**:

```typescript
// filepath: src/server/api/routers/project.ts
// 完成版: getAll の検索条件
      if (!input?.userId) {
        where.members = {
          some: { userId: ctx.session.userId },
        };
      } else {
        where.members = {
          some: { userId: input.userId },
        };
      }

      if (input?.isArchived !== undefined) {
        where.isArchived = input.isArchived;
      }
```

`isArchived` の判定を `!== undefined` にしてあるのは、`false` が渡された場合と何も渡されなかった場合を分けるためです。`if (input?.isArchived)` と書くと、`false` は偽として扱われて条件が足されません。その結果、アーカイブ済みを外したいのに全件が返ります。この一覧ページのスイッチは `false` を送る場面が普通にあるので、この書き分けが効きます。

**getAll が返すデータ**:

```typescript
// filepath: src/server/api/routers/project.ts
// 完成版: getAll が返すデータ
      return await prisma.project.findMany({
        where,
        include: {
          members: {
            include: {
              user: {
                select: USER_SELECT,
              },
            },
          },
          tasks: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),
```

`tasks` に `select` を付けて `id` と `status` だけに絞っているのは、画面で使うのは件数と完了数だけだからです。全項目を取ると、本文や期日まで毎回運ぶことになります。ユーザー側を `USER_SELECT` に任せているのも同じ理由で、パスワードのように返してはいけない項目を毎回書き並べずに済みます。

**create の作成データ**:

```typescript
// filepath: src/server/api/routers/project.ts
// 完成版: create の作成データ
  create: protectedProcedure.input(projectCreateSchema).mutation(async ({ ctx, input }) => {
    const createData: Prisma.ProjectCreateInput = {
      name: input.name,
      color: input.color,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      members: {
        create: {
          userId: ctx.session.userId,
          role: PROJECT_MEMBER_ROLE.OWNER,
        },
      },
    };
```

持ち主になる `userId` を `input` からではなく `ctx.session.userId` から取っている点が、この手続きの要です。画面から送られてきた値を持ち主にすると、他人の ID を書いたリクエストで他人名義のプロジェクトを作れてしまいます。`ctx.session` はサーバーが Cookie から組み立てた情報なので、画面側から書き換えられません。

**create の保存と戻り値**:

```typescript
// filepath: src/server/api/routers/project.ts
// 完成版: create の保存と戻り値
    if (input.description) {
      createData.description = input.description;
    }

    return await prisma.project.create({
      data: createData,
      include: {
        members: {
          include: {
            user: {
              select: USER_SELECT,
            },
          },
        },
      },
    });
  }),
});
```

`include` の形を `getAll` とそろえてあるのは、呼び出す側の扱いを1通りにするためです。作成直後に返るデータと一覧のデータで形が違うと、画面側は受け取り先ごとに読み方を変える必要が出ます。最後の `}),` が `create` を閉じ、`});` が `projectRouter` 全体を閉じます。この2行が1つでも欠けると、英語のエラーで起動が止まります。

### `src/component/project/project-dialog.tsx`

**import**:

```typescript
// filepath: src/component/project/project-dialog.tsx
// 完成版: import
'use client';

import { useEffect } from 'react';
import { zodResolver }
  from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Textarea }
  from '@/component/ui/textarea';
import { DEFAULT_PROJECT_COLOR }
  from '@/lib/constant/project';
```

先頭の `'use client'` が要るのは、このファイルが `useForm` と `useEffect` を使うからです。この宣言が無いとサーバー側で描こうとして、フックが使えないというエラーになります。`@/component/ui/...` が単数形である点は Step 1 の注意書きのとおりで、複数形で書くとファイルが見つからないという英語のエラーが起動時に出ます。

**Props とフォームデータの型**:

```typescript
// filepath: src/component/project/project-dialog.tsx
// 完成版: Props とフォームデータの型
interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
  initialData?:
    ProjectFormData | undefined;
}

export interface ProjectFormData {
  id?: string;
  name: string;
  description?: string;
  color: string;
  startDate?: string;
  endDate?: string;
}
```

`ProjectFormData` にだけ `export` が付いているのは、この型を `page.tsx` が取り込むからです。`ProjectDialogProps` はこのファイルの中でしか使わないので、外へ出していません。外へ出す範囲を絞っておくと、あとから型を直すときに影響の届く先がファイルの中だけに収まります。

**zodスキーマと型**:

```typescript
// filepath: src/component/project/project-dialog.tsx
// 完成版: zodスキーマと型
const projectFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1,
    'プロジェクト名は必須です'),
  description: z.string().optional(),
  color: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ProjectFormValues =
  z.infer<typeof projectFormSchema>;
```

`ProjectFormValues` を手で書かずに `z.infer` から起こしているのは、スキーマと型が食い違う余地を消すためです。手書きだと、スキーマに項目を足したときに型の更新を忘れられます。`color` を `z.string()` だけにしてあるのは、色コードの形を確かめる仕事をサーバー側の `.regex(...)` が持っているからです。

**初期値を作る関数**:

```typescript
// filepath: src/component/project/project-dialog.tsx
// 完成版: 初期値を作る関数
function buildProjectFormValues(
  initialData: ProjectFormData | undefined,
): ProjectFormValues {
  return {
    id: initialData?.id,
    name: initialData?.name ?? '',
    description:
      initialData?.description ?? '',
    color: initialData?.color
      ?? DEFAULT_PROJECT_COLOR,
    startDate:
      initialData?.startDate ?? '',
    endDate: initialData?.endDate ?? '',
  };
}
```

空文字を埋めているのは、`undefined` を `<input>` の値として渡せないからです。`undefined` のまま渡すと、React は「値を持たない入力欄」として扱い、途中から値を入れた瞬間に警告を出します。既定色だけ `DEFAULT_PROJECT_COLOR` にしてあるのは、カラーピッカーには空という状態が無いためです。

**useForm の設定と reset**:

```typescript
// filepath: src/component/project/project-dialog.tsx
// 完成版: useForm の設定と reset
export function ProjectDialog({
  open, onClose, onSubmit, initialData,
}: ProjectDialogProps) {
  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(
      projectFormSchema),
    defaultValues:
      buildProjectFormValues(initialData),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(
      buildProjectFormValues(initialData)
    );
  }, [initialData, open, reset]);
```

`defaultValues` と `reset(...)` の両方に同じ関数を渡してあるのは、初期値の作り方を1か所に集めるためです。片方だけ書き換えると、最初に開いたときと開き直したときで値が変わります。依存配列に `initialData` と `open` を並べてあるのは、この2つが変わった瞬間だけ入れ直したいからです。

**閉じる処理と送信データの組み立て**:

```typescript
// filepath: src/component/project/project-dialog.tsx
// 完成版: 閉じる処理と送信データの組み立て
  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit =
    (data: ProjectFormValues) => {
      const submitData: ProjectFormData = {
        ...(data.id !== undefined
          && { id: data.id }),
        name: data.name,
        color: data.color,
        ...(data.description
          && { description:
            data.description }),
        ...(data.startDate
          && { startDate: data.startDate }),
        ...(data.endDate
          && { endDate: data.endDate }),
      };
      onSubmit(submitData);
    };
```

`name` と `color` だけを条件なしで詰めているのは、この2つが必ず値を持つからです。`name` は zod が空を弾き、`color` は既定色が最初から入っています。残りの4項目は空欄のまま送られる場面があるので、値があるときだけキーを足す形にしてあります。

**ダイアログの外枠と見出し**:

```typescript
// filepath: src/component/project/project-dialog.tsx
// 完成版: ダイアログの外枠と見出し
  return (
    <Dialog open={open}
      onOpenChange={(isOpen) =>
        !isOpen && handleClose()}>
      <DialogContent
        className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id
              ? 'プロジェクト編集'
              : 'プロジェクト作成'}
          </DialogTitle>
          <DialogDescription>
            {initialData?.id
              ? 'プロジェクトの詳細を更新します。'
              : '新しいプロジェクトを作成します。'}
          </DialogDescription>
        </DialogHeader>
```

見出しの切り替えを `initialData?.id` で判定しているのは、`initialData` そのものの有無で見ると足りない場面があるからです。編集の入口を作る Day 11 では、値の一部が欠けた `initialData` を渡すことも起こり得ます。ID が入っているかどうかで見れば、保存済みのデータを開いたときだけ編集の文言になります。

**プロジェクト名の入力欄**:

```typescript
        {/* filepath: src/component/project/project-dialog.tsx */}
        {/* 完成版: プロジェクト名の入力欄 */}
        <form onSubmit={
          handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                プロジェクト名
              </Label>
              <Input id="name"
                placeholder=
                  "プロジェクト名を入力"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                {...register('name')} />
              {errors.name && (
                <p id="name-error"
                  className=
                  "text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
```

`onSubmit` に `handleSubmit(handleFormSubmit)` を渡しているのは、検証を通った値だけを受け取るためです。`handleFormSubmit` を直接つなぐと、名前が空でもサーバーへ飛びます。`aria-describedby` をエラーのあるときだけ付けているのは、`id="name-error"` の要素がエラーの無いあいだは描かれないからです。存在しない相手を指したままにしません。

**説明欄とカラー欄**:

```typescript
            {/* filepath: src/component/project/project-dialog.tsx */}
            {/* 完成版: 説明欄とカラー欄 */}
            <div className="grid gap-2">
              <Label htmlFor="description">
                説明
              </Label>
              <Textarea
                id="description"
                placeholder=
                  "プロジェクトの説明..."
                rows={4}
                {...register('description')}
              />
            </div>
            <div className=
              "grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="color">
                  カラー
                </Label>
                <Input id="color"
                  type="color"
                  className="h-10"
                  {...register('color')} />
              </div>
```

説明欄に赤字の表示を付けていないのは、この項目が任意だからです。検証で落ちる条件を持たないので、`errors.description` に値の入る場面はありません。カラー欄に `className="h-10"` を足してあるのは、`type="color"` の入力欄がブラウザごとに違う既定の高さを持つためです。そのままだと隣の日付欄と高さがそろいません。

**開始日と終了日の欄**:

```typescript
              {/* filepath: src/component/project/project-dialog.tsx */}
              {/* 完成版: 開始日と終了日の欄 */}
              <div className="grid gap-2">
                <Label htmlFor="startDate">
                  開始日
                </Label>
                <Input id="startDate"
                  type="date"
                  {...register('startDate')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">
                  終了日
                </Label>
                <Input id="endDate"
                  type="date"
                  {...register('endDate')}
                />
              </div>
            </div>
          </div>
```

日付の2つを `type="date"` にしてあるので、フォームに入る値は `2026-04-01` のような日付だけの文字列です。時刻を持たないため、そのまま `new Date(...)` へ渡すと読まれ方が場面によって変わります。この変換を画面側でやらず、`page.tsx` の `dateOnlyToUtcStartIso` に任せているのは、変換の作法を1か所へ集めておくためです。末尾の `</div>` 2つで、3列の枠と入力欄全体の枠を順に閉じます。

**足元のボタンと閉じタグ**:

```typescript
          {/* filepath: src/component/project/project-dialog.tsx */}
          {/* 完成版: 足元のボタンと閉じタグ */}
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

キャンセルの `type="button"` は、押しても送信を起こさないための指定です。`<form>` の中のボタンは、指定しないかぎり送信ボタンとして扱われます。この1語を落とすと、閉じたいだけなのに検証まで走ります。名前が空なら赤字も出ます。

### `src/app/project/page.tsx`

**React と画面の部品の import**:

```typescript
// filepath: src/app/project/page.tsx
// 完成版: React と画面の部品の import
'use client';

import { Plus } from 'lucide-react';
import { Suspense, useState } from 'react';
import { AppLayout }
  from '@/component/layout/app-layout';
import { ProjectCard }
  from '@/component/project/project-card';
import {
  ProjectDialog,
  type ProjectFormData,
} from
  '@/component/project/project-dialog';
```

`ProjectFormData` の前だけ `type` が付いているのは、これが型の情報しか持たないからです。`type` を付けておくと、ビルドの時点で取り込みごと消えます。並びがアルファベット順になっているのは Biome が並べ替えるためで、自分が書いた順番と違っていても手で直す必要はありません。

**UI部品と定数の import**:

```typescript
// filepath: src/app/project/page.tsx
// 完成版: UI部品と定数の import
import { Button }
  from '@/component/ui/button';
import { Label }
  from '@/component/ui/label';
import { PageLoadingSpinner }
  from '@/component/ui/loading-spinner';
import { Switch }
  from '@/component/ui/switch';
import { TASK_STATUS }
  from '@/lib/constant/status';
import { dateOnlyToUtcStartIso }
  from '@/lib/date';
import { api } from '@/trpc/react';
```

`TASK_STATUS` を取り込んでいるのは、完了件数を数えるときに `'DONE'` という文字列を直接書かないためです。定数にしておくと、打ち間違いをエディタが赤い波線で教えてくれます。`dateOnlyToUtcStartIso` は Step 7 で使う日付の変換で、`api` はサーバー側のルーターへつながる入口です。

**state とデータ取得**:

```typescript
// filepath: src/app/project/page.tsx
// 完成版: state とデータ取得
function ProjectPageContent() {
  const [showArchived, setShowArchived] =
    useState(false);
  const [dialogOpen, setDialogOpen] =
    useState(false);

  const {
    data: projects,
    isLoading: projectsLoading,
  } = api.project.getAll.useQuery({
    isArchived: showArchived,
  });

  const utils = api.useUtils();
```

`useQuery` に `showArchived` をそのまま渡してあるので、スイッチを切り替えると tRPC が別の問い合わせとして扱って取り直します。取り直す関数を自分で呼ぶ形にすると、呼び忘れた場所だけ古い一覧が残ります。`isLoading` を別に受け取っているのは、返事が届く前の `undefined` と、届いたけれど0件だった場合を分けて扱うためです。

**作成 mutation とボタンのハンドラー**:

```typescript
// filepath: src/app/project/page.tsx
// 完成版: 作成 mutation とボタンのハンドラー
  const createMutation =
    api.project.create.useMutation({
      onSuccess: () => {
        utils.project.getAll.invalidate();
        setDialogOpen(false);
      },
    });

  const handleCreate = () => {
    setDialogOpen(true);
  };

  const handleEdit = (projectId: string) => {
    void projectId;
  };
  const handleDelete = (projectId: string) => {
    void projectId;
  };
  const handleProjectClick = (id: string) => {
    void id;
  };
```

ダイアログを閉じる処理を `onSuccess` の中に置いてあるのは、保存が通ったときだけ閉じたいからです。`mutate` の直後に閉じると、サーバーが断った場合でも閉じてしまい、保存できていないのに終わったように見えます。`handleEdit` から下の3つは Day 09 で置いた受け皿で、中身は Day 11 と Day 12 で埋めます。

**送信ハンドラーと読み込み中の表示**:

```typescript
// filepath: src/app/project/page.tsx
// 完成版: 送信ハンドラーと読み込み中の表示
  const handleSubmit = (
    data: ProjectFormData
  ) => {
    createMutation.mutate({
      name: data.name,
      description: data.description,
      color: data.color,
      startDate: data.startDate
        ? dateOnlyToUtcStartIso(
            data.startDate)
        : undefined,
      endDate: data.endDate
        ? dateOnlyToUtcStartIso(
            data.endDate)
        : undefined,
    });
  };
```

日付が空のときに `undefined` を渡しているのは、Step 0 のサーバー側が「送られてこなかった項目には何もしない」と決めてあるからです。空文字を渡すと `z.string().datetime()` の検証に落ちて、作成そのものが断られます。

**読み込み中の表示**:

```typescript
// filepath: src/app/project/page.tsx（同じファイルの続き）
// 完成版: 読み込み中の表示
  if (projectsLoading) {
    return (
      <AppLayout>
        <PageLoadingSpinner />
      </AppLayout>
    );
  }
```

この分岐をここへ置いてあるのは、`projects` がまだ `undefined` の状態で下の描画へ進ませないためです。スピナーも `AppLayout` で囲むのは、読み込み中だけサイドバーとログイン確認が画面から消えないようにするためです。

**ページ見出しと操作エリア**:

```typescript
// filepath: src/app/project/page.tsx
// 完成版: ページ見出しと操作エリア
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center
          justify-between">
          <h1 className="text-3xl font-bold
            tracking-tight">
            プロジェクト
          </h1>
          <div className="flex items-center
            gap-4">
            <div className="flex
              items-center space-x-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={
                  setShowArchived} />
              <Label
                htmlFor="show-archived">
                アーカイブ表示
              </Label>
            </div>
```

`justify-between` を使って見出しと操作エリアを両端へ寄せてあるのは、画面幅が変わっても見出しが左、操作が右という位置関係を保つためです。`Switch` の `id` と `Label` の `htmlFor` をそろえてあるので、文字をクリックしてもスイッチが切り替わります。

**新規作成ボタンとグリッドの開始**:

```typescript
            {/* filepath: src/app/project/page.tsx */}
            {/* 完成版: 新規作成ボタンとグリッドの開始 */}
            <Button onClick={handleCreate}>
              <Plus
                className="mr-2 h-4 w-4" />
              新規プロジェクト
            </Button>
          </div>
        </div>

        <div className="grid gap-6
          sm:grid-cols-2 lg:grid-cols-3
          xl:grid-cols-4">
          {projects && projects.length > 0
            ? (projects.map((project) => {
              const taskCount =
                project.tasks?.length ?? 0;
              const doneCount =
                project.tasks?.filter(
                  (t) => t.status ===
                    TASK_STATUS.DONE
                ).length ?? 0;
```

`projects && projects.length > 0` と2つ並べてあるのは、確かめたいことが2つあるからです。手前の `projects &&` が無いと、中身の無い `undefined` から `length` を読みに行って画面が真っ白になります。件数を `?? 0` で受けているのは、タスクが1件も無いプロジェクトでも0として数えるためです。

**プロジェクトカードの描画**:

```typescript
// filepath: src/app/project/page.tsx
// 完成版: プロジェクトカードの描画
              return (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  description={
                    project.description}
                  color={project.color}
                  memberCount={
                    project.members?.length
                      ?? 0}
                  taskStats={{
                    total: taskCount,
                    done: doneCount }}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClick={
                    handleProjectClick}
                  isArchived={
                    project.isArchived}
                />);
            })
```

`key` に `project.id` を渡しているのは、React がどのカードがどれかを追いかけられるようにするためです。並び順が変わったときに、印が無いと React は中身を差し替える形で描き直します。ID を印にしておけば、増えた1枚だけを足す形で済みます。

**空状態とダイアログの配置**:

```typescript
// filepath: src/app/project/page.tsx
// 完成版: 空状態とダイアログの配置
            ) : (
              <div className="col-span-full
                flex flex-col items-center
                justify-center py-12
                text-center
                text-muted-foreground">
                <p>プロジェクトが見つかりません。</p>
                <p>最初のプロジェクトを作成しましょう！</p>
              </div>
            )}
        </div>

        <ProjectDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmit}
        />
      </div>
    </AppLayout>
  );
}
```

空状態の入れ物に `col-span-full` を付けてあるのは、この要素がグリッドの中にいるからです。付けないと1列分の幅に押し込まれ、文字が縦に折り返します。`ProjectDialog` をグリッドの外へ出してあるのは、ダイアログが一覧の1枚として並ぶものではないためです。

**ページのエクスポート**:

```typescript
// filepath: src/app/project/page.tsx
// 完成版: ページのエクスポート
export default function ProjectPage() {
  return (
    <Suspense
      fallback={<PageLoadingSpinner />}>
      <ProjectPageContent />
    </Suspense>
  );
}
```

本体を `Suspense` で包んでいるのは、準備が終わるまでの表示を1か所で受け止めるためです。`ProjectPageContent` の側にも読み込み中の分岐がありますが、そちらはデータ待ち、こちらは部品そのものの読み込み待ちを担当します。役割が違うので、両方を残してあります。

## 今日のまとめ

- [ ] Dialog コンポーネントでモーダルフォームを作れた
- [ ] react-hook-form + zodResolver でフォームのバリデーションを実装できた
- [ ] `register` で入力欄をフォームに登録できた
- [ ] `useMutation` でサーバーにデータを保存できた
- [ ] `invalidate()` でキャッシュを自動更新できた

## つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| ダイアログが開かない | `open` prop が渡されていない | `open={dialogOpen}` を確認 |
| `dialogOpen is not defined` | state 宣言が漏れている | Day 09 Step 8 で `useState(false)` を宣言したか確認 |
| 作成後に一覧が更新されない | キャッシュ無効化の呼び忘れ | `utils.project.getAll.invalidate()` を追加 |
| バリデーションが効かない | `resolver` の設定漏れ | `resolver: zodResolver(projectFormSchema)` を確認 |
| 入力しても値が反映されない | `register` の接続漏れ | `{...register('name')}` のスプレッド構文を確認 |
| 作成ボタンを押しても何も起きない | 入力がバリデーションで止まっているか、サーバーがエラーを返している | まず名前欄が空でないか確認する。Day 10 の `createMutation` には `onError` を書いていないので、サーバー側で失敗しても画面には何も出ない。ブラウザの開発者ツールのコンソールにエラーが出ていないか見る |

## 今日学んだ用語

| 用語 | 意味 |
|------|------|
| Dialog | 画面の上に重なるモーダルウィンドウ |
| useMutation | データの作成・更新・削除に使う tRPC フック |
| invalidate | キャッシュを無効にして再取得させる操作 |
| useUtils | tRPC のキャッシュ操作ユーティリティ |
| zodResolver | zod スキーマを react-hook-form に接続するアダプター |
| register | 入力欄を react-hook-form に登録する関数 |

## 理解チェック

今日書いたコードを見ながら答えてみてください。答えは各問のすぐ下にあります。

**Q1. `create` の中の `members: { create: { userId: ctx.session.userId, role: OWNER } }` は、何をしている指定ですか。**

A. プロジェクト本体を作るのと同時に、作った本人をメンバーの行として1件登録しています。役割は OWNER です。Prisma はこの書き方で、2つのテーブルへの書き込みをまとめて1回の操作にします。プロジェクトだけ先に作り、あとからメンバーを足す書き方より、途中で失敗したときの取りこぼしが起きません。

**Q2. その `members.create` の部分を消すと、何が起きますか。**

A. プロジェクト自体は作られます。ところが作った本人がメンバーになりません。`getAll` は自分がメンバーのものだけを返す条件で書いてあります。そのため、作ったはずのプロジェクトが一覧に出てきません。画面上は「作成しても何も増えない」という見え方になります。

**Q3. キャンセルボタンに `type="button"` を書くのは、なぜですか。**

A. `<form>` の中のボタンは、何も指定しないと送信ボタンとして扱われるからです。付け忘れると、キャンセルを押した瞬間に送信が走ります。名前欄が空なら zod のエラーが出ます。閉じるつもりで押したのに、赤い文字が増えるという結果になります。

## 次回予告

Day 11 では、プロジェクトの編集・削除機能を実装します。Day 10 で作った ProjectDialog を「編集モード」で再利用する方法を学びます。

---

## Day 10 終了時点の状態（完成版との違い）

Day 10 を終えた時点で、手元のファイルがどこまで書けていればよいかをまとめます。完成版との違いもここに書きます。

### `src/server/api/routers/project.ts`

Day 10 終了時点の状態は、完成版の `src/server/api/routers/project.ts` の `getAll` と `create` の部分と同じです。`update` 以降は Day 11 で追加するので、まだ存在しません（販売用 ZIP に完成版の `src/` は入っていません。教材内のコードと確認ポイントが正本です）。

### `src/component/project/project-dialog.tsx`

Day 10 終了時点のダイアログは、完成版の `src/component/project/project-dialog.tsx` と同じ考え方で作ってあります。ただし必須マークの付け方や列の分け方は違います。フォームの組み立て方は Step 3 から Step 6 に載せたコードのほうを正としてください（販売用 ZIP に完成版の `src/` は入っていません。教材内のコードと確認ポイントが正本です）。

### `src/app/project/page.tsx`

完成版の `src/app/project/page.tsx` は、Day 12 と Day 27 まで書き足した後の姿です。削除確認、アーカイブ、詳細表示が入っているので、今日の終わりの手元のコードより長くなります。今日の時点では、一覧の取得と作成ダイアログの配線まで書けていれば大丈夫です（販売用 ZIP に完成版の `src/` は入っていません。教材内のコードと確認ポイントが正本です）。

---

## 次に読むもの

- 前の日: [Day 09](./day09_プロジェクト一覧画面.md)
- 次の日: [Day 11](./day11_プロジェクト編集・削除.md)
- 全体の地図: [学びのロードマップ](./00-1_学びのロードマップ.md)
- 目次: [カリキュラム目次](./00_カリキュラム目次.md)
- 詰まったとき: [トラブルシューティング](./appendix_トラブルシューティング.md)
- 言葉の意味: [用語集](./appendix_用語集.md)
