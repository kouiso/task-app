# Day 24: ユーザー一覧（管理者用）を作ろう

## 前回の振り返り

Day 23 ではプロジェクト別統計テーブルの表示と、週次レポートAPIの呼び出し・データ表示を実装しました。Table コンポーネントでデータを一覧表示するパターンを学んだので、今日は管理者専用のユーザー一覧ページに取り組みます。

---

## 今日のゴール

管理者だけがアクセスできるユーザー管理ページを実装します。
ユーザー一覧をテーブルで表示し、詳細画面や編集画面へ遷移できるようにします。

完成イメージ: 管理者がユーザーを一覧管理できるページです。

![ユーザー管理ページの完成イメージ](./screenshots/user-list.png)

## なぜこれを作るのか

メンバーが増えるほど、「誰がどの権限を持っているか」「無効にしたアカウントはどれか」が把握しづらくなります。管理者が全ユーザーを一覧で見渡し、権限や状態を確認できる画面を用意します。

> **例え話**: ユーザー管理は「学校の出席簿」です。
> 先生（管理者）だけが出席簿を開いて、
> 生徒（ユーザー）の名前や出席状況を確認できます。

## 始める前の前提

- 管理者ユーザーでログインできる
- 一般ユーザーも1人以上登録済みで、一覧に表示する対象がある
- `src/server/api/root.ts` に user ルーターを追加する準備ができている
- 管理者以外で開いたときのアクセス拒否も確認する

### ユーザー管理ページのフロー

```mermaid
flowchart TD
    A[ユーザー管理ページ] --> B{管理者？}
    B -->|はい| C[api.user.getAll]
    B -->|いいえ| D[権限エラー表示]
    C --> E{ユーザーあり？}
    E -->|はい| F[ユーザー一覧テーブル]
    E -->|いいえ| G[空状態メッセージ]
    F --> H[詳細ボタン]
    F --> I[編集ボタン]
    H --> J[/user/ユーザーID]
    I --> K[/user/ユーザーID/edit]

    style A fill:#e3f2fd
    style B fill:#fff3e0
    style F fill:#e8f5e9
    style D fill:#ffebee
    style G fill:#f3e5f5
```

この図でいちばん大事なのは、最初のひし形にある管理者かどうかの分岐です。ここで「いいえ」へ進んだ人は、`api.user.getAll` を呼ぶ矢印まで届きません。一般ユーザーのブラウザからは、ユーザー一覧のリクエストがそもそも送信されないという意味です。一本道に見えて、実際には右半分を通れるのが管理者だけになっています。分岐の先ではもう一度、ユーザーが0件かどうかで道が分かれます。テーブルと空状態メッセージは、どちらか片方だけが画面に出ます。今日やるのは、この2つの分岐を画面とサーバーの両方に置く作業です。

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| 管理者権限チェック | ロール変更機能 |
| ユーザー一覧テーブル | アカウント作成 |
| アバター・バッジ表示 | パスワードリセット |
| 詳細・編集へのリンク | ユーザー削除 |
| 空状態UI表示 | ソート・フィルター |

### 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| getCurrentUser | — | ログイン中ユーザー取得 | 自分の学生証を見る |
| role チェック | ロール | 権限による制御 | 先生か生徒かの判定 |
| Avatar | アバター | ユーザーアイコン | プロフィール写真 |
| UserRoleBadge | — | ロール表示バッジ | 名札のシール |
| ActiveStatusBadge | — | 状態表示バッジ | 在席ランプ |
| \|\| (OR演算子) | オア | falsy時の代替値 | 保険のようなもの |
| && (条件付きレンダリング) | アンド | 条件を満たすとき表示 | 在庫ありの商品だけ並べる |

### ページ構造の全体像

まず完成形のページ構造を確認しましょう。
この骨格に沿って、各Stepで中身を埋めていきます。

| 層 | 内容 | 担当Step |
|----|------|---------|
| ローディング | PageLoadingSpinner | Step 5 |
| 権限チェック | ADMIN以外はエラーカード | Step 5 |
| ヘッダー | タイトル「ユーザー管理」 | Step 6 |
| テーブル | ユーザー一覧 | Step 6-8 |
| 空状態 | ユーザー0件時のメッセージ | Step 9 |

## 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 0 | ユーザー一覧 API（getAll）を自分で書く | 14分 |
| Step 1 | 使用するAPIの確認 | 3分 |
| Step 2 | インポート文（外部ライブラリ） | 3分 |
| Step 3 | インポート文（プロジェクト内） | 3分 |
| Step 4 | データ取得とエラー処理 | 5分 |
| Step 5 | ローディングと権限チェック | 5分 |
| Step 6 | ページヘッダーとテーブル枠 | 4分 |
| Step 7 | アバターとバッジの表示 | 5分 |
| Step 8 | アクションボタンの追加 | 4分 |
| Step 9 | 空状態UIと動作確認 | 3分 |

**合計時間**: 約49分です。

---

### Step 0: ユーザー一覧 API（getAll）を自分で書く（14分）

**ゴール**: `src/server/api/routers/user.ts` を新規作成し、まず `getAll` を写経して `api.user.getAll` を自分で生やします。管理者一覧ページの入口はここです。Day 21 の `report.ts` と同じく、ファイルを「登録するだけ」ではなく、最初の procedure から自分で作ります。

一覧ページが必要としているのは、全ユーザーの詳細全部ではありません。名前・メール・ロール・状態・登録日など、表示に使う項目だけです。そこで完成版のコード では、`USER_DETAIL_SELECT` を再利用しつつ `createdAt` と `updatedAt` を足して返します。

#### 0-1. import を並べる

まず `src/server/api/routers/user.ts` を新規作成し、先頭に import を書きます。

```typescript
// filepath: src/server/api/routers/user.ts
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { USER_ROLE } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';
import { adminProcedure, createTRPCRouter } from '../trpc';
import { USER_DETAIL_SELECT } from './_helpers/select';
```

今日は `getAll` に必要な import だけを書きます。Day 25 と Day 29 で初めて使う認可・パスワード・詳細取得の道具は、その procedure を追加する日に足します。こうすると、各 Day の終了時点で未使用 import が残りません。

#### 0-2. 管理者専用の getAll を書く

```typescript
// filepath: src/server/api/routers/user.ts（続き）
export const userRouter = createTRPCRouter({
  // adminProcedureによりセッションのroleを参照してADMIN判定するためDBクエリ不要
  getAll: adminProcedure
    .input(
      z
        .object({
          isActive: z.boolean().optional(),
          role: z.nativeEnum(USER_ROLE).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const where: Prisma.UserWhereInput = {};
```

ここで大事なのは `protectedProcedure` ではなく **`adminProcedure`** を使っている点です。今日のページは管理者専用なので、入口で `ADMIN` 判定まで済ませます。コメントにもあるとおり、ここでは「管理者かどうか」を確認する追加 DB クエリは不要です。セッションに入っている `role` をそのまま使います。

#### 0-3. 条件があるときだけ where に足す

```typescript
// filepath: src/server/api/routers/user.ts（続き）
      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      if (input?.role) {
        where.role = input.role;
      }
```

一覧画面の最初の版では絞り込み UI をまだ作りませんが、API は先に対応済みです。条件が渡されたときだけ `where` に足し、未指定なら全件のままにします。`isActive` は `false` が有効な値なので、`if (input?.isActive)` ではなく `!== undefined` で判定しているのがポイントです。

#### 0-4. 表示に使う項目だけ返す

```typescript
// filepath: src/server/api/routers/user.ts（続き）
      return await prisma.user.findMany({
        where,
        select: {
          ...USER_DETAIL_SELECT,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }),
});
```

`USER_DETAIL_SELECT` は共有の select 定義で、名前・メール・ロール・アバターなど「返してよいユーザー項目」をまとめたものです。そこへ `createdAt` と `updatedAt` だけ足しているので、Day 24 の一覧画面に必要な列をそのまま返せます。

#### 0-5. root.ts に時系列順で登録する

最後に `userRouter` を `root.ts` に登録します。完成版のコード と同じく、`user` は `report` のあとです。

```typescript
// filepath: src/server/api/root.ts
import { authRouter } from './routers/auth';
import { commentRouter } from './routers/comment';
import { projectRouter } from './routers/project';
import { reportRouter } from './routers/report';
import { searchRouter } from './routers/search';
import { taskRouter } from './routers/task';
import { userRouter } from './routers/user';
import { createCallerFactory, createTRPCRouter } from './trpc';
```

import の並び順と、次に書く登録の並び順は別物です。import 側はファイル名のアルファベット順で、保存すると整形ツールが自動でこの順に直します。登録側は教材で作った時系列を保つので、`user` が最後に来ます。どちらの順番でも動作は変わりませんが、`root.ts` を開いたときにどの Day で何を足したのかが追えなくなります。

2つのうち片方だけ忘れたときの出方も違います。import を書き忘れると `userRouter` が見つからないという型エラーがその場で出ます。登録を忘れると、`api.user.getAll` と書いた行で「そんなプロパティは無い」という型エラーが出ます。動かす前に気づける形です。後者のほうが原因を見つけにくいので、2か所そろっているかを必ず確かめてください。

```typescript
// filepath: src/server/api/root.ts（続き）
export const appRouter = createTRPCRouter({
  auth: authRouter,
  project: projectRouter,
  task: taskRouter,
  search: searchRouter,
  comment: commentRouter,
  report: reportRouter,
  user: userRouter,
});
```

Day 21 でも触れたとおり、root の順番は教材で作った時系列に揃えます。`user` は `report` のあとです。

**確認ポイント**:
- `src/server/api/routers/user.ts` を新規作成し、今日使う import と `getAll` を書けた
- `getAll` が `adminProcedure` になっている
- `root.ts` に `userRouter` を import / registration の両方で追加し、最後尾に置けた

---

### Step 1: 使用するAPIの確認（3分）

**ゴール**: ユーザー管理に使う2つのAPIを理解します。

#### 使用するAPI一覧

| API | 用途 | 戻り値 |
|-----|------|--------|
| api.auth.getCurrentUser | ログイン中のユーザー | ユーザーオブジェクト |
| api.user.getAll | 全ユーザー一覧 | ユーザー配列 |

#### getCurrentUser の主なプロパティ

| プロパティ | 型 | 用途 |
|-----------|-----|------|
| id | string | ユーザーID |
| name | string | 表示名 |
| role | "ADMIN" / "USER" | ロール判定に使用 |
| isActive | boolean | アカウント有効/無効 |

```typescript
// filepath: src/app/user/page.tsx
// 2つのAPIを呼び出す（次のStepで実装）
api.auth.getCurrentUser.useQuery();
api.user.getAll.useQuery();
```

> `api.auth.getCurrentUser` で自分のロールを確認し、
> ADMIN でなければアクセスを拒否します。
> `api.user.getAll` は管理者のみ呼べるAPIです。

**確認ポイント**:
- 2つのAPIの役割を理解した
- getCurrentUser でロール判定することを理解した

---

### Step 2: インポート文（外部ライブラリ）（3分）

**ゴール**: 外部ライブラリのインポートを追加します。

```typescript
// filepath: src/app/user/page.tsx
'use client';

import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Eye, Pencil } from 'lucide-react';
import { useRouter }
  from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
```

> `'use client'` はこのファイルが
> クライアントコンポーネントであることを示します。
> `useRouter` や `useEffect` を使うために必須です。

`useRouter` と `useEffect` はブラウザの中でしか動きません。Next.js のページは何もしなければサーバー側で組み立てられるため、この宣言が無いと2つを呼んだ時点でエラーになります。Day 09 のプロジェクト一覧でも、先頭に同じ1行を置きました。今日はそこへ、日付を整える道具とアイコンが加わります。

#### インポートしたライブラリの役割

| ライブラリ | 用途 |
|-----------|------|
| date-fns / ja | 日付フォーマット（日本語） |
| Eye, Pencil | 詳細・編集ボタンのアイコン |
| useRouter | ページ遷移 |
| useEffect | 副作用処理（エラー検知） |
| react-hot-toast | トースト通知 |

**確認ポイント**:
- `'use client'` がファイル先頭にある
- 各ライブラリの役割を理解した

---

### Step 3: インポート文（プロジェクト内）（3分）

**ゴール**: プロジェクト内のコンポーネントと定数をインポートします。

```typescript
// filepath: src/app/user/page.tsx
import { AppLayout }
  from '@/component/layout/app-layout';
import {
  Avatar, AvatarFallback, AvatarImage,
} from '@/component/ui/avatar';
import { Button }
  from '@/component/ui/button';
import {
  Card, CardContent,
} from '@/component/ui/card';
```

ここで取り込むのは、ページの外枠を作る部品です。`AppLayout` はサイドバーとヘッダーを持つ共通の枠、`Card` と `CardContent` はテーブルを収める箱、`Button` はアクション列に置くボタンです。`Avatar` だけ3つまとめて取り込むのは、外枠・画像・代わりの表示という3部品を組み合わせて1つのアイコンにするからです。画像URLがあるときは `AvatarImage` が出て、無いときは `AvatarFallback` が出ます。どちらを出すかの判定は Step 7 で書きます。

**確認ポイント**:
- `AppLayout` はページ全体のレイアウト
- `Avatar` はユーザーアイコン表示用

```typescript
// filepath: src/app/user/page.tsx
import { PageLoadingSpinner }
  from '@/component/ui/loading-spinner';
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/component/ui/table';
import {
  ActiveStatusBadge, UserRoleBadge,
} from '@/component/ui/user-badges';
import { USER_ROLE }
  from '@/lib/constant/roles';
import { api } from '@/trpc/react';
```

> `PageLoadingSpinner` は
> `@/component/ui/loading-spinner` にあります。
> 画面の中央で回る円を1つ描くだけの部品で、
> サイドバーやヘッダーは含みません。

**確認ポイント**:
- `PageLoadingSpinner` のパスが `@/component/ui/loading-spinner` になっている
- `USER_ROLE` 定数を `@/lib/constant/roles` からインポートしている
- `UserRoleBadge` と `ActiveStatusBadge` をインポートしている

---

### Step 4: データ取得とエラー処理（5分）

**ゴール**: APIからデータを取得し、エラー時の処理を追加します。

**実装**:

```typescript
// filepath: src/app/user/page.tsx
export default function UsersPage() {
  const router = useRouter();

  const {
    data: currentUser,
    isLoading: isCurrentUserLoading,
  } =
    api.auth.getCurrentUser.useQuery();
  const isAdmin =
    currentUser?.role === USER_ROLE.ADMIN;

  const {
    data: users,
    isLoading,
    error,
  } = api.user.getAll.useQuery(
    undefined,
    { enabled: isAdmin },
  );
```

> `useQuery` はデータ取得用のhookです。
> `data`, `isLoading`, `error` の3つの状態を返します。
> これらを使い分けて画面表示を切り替えます。

**確認ポイント**:
- ADMIN のときだけ `getAll` を呼んでいる
- `isLoading` と `error` を取得している

#### `||` 演算子によるフォールバック

エラーメッセージが空のとき、代わりのメッセージを表示します。

| 演算子 | 名前 | falsy扱いする値 |
|--------|------|----------------|
| `\|\|` | OR演算子 | `false`, `0`, `""`, `null`, `undefined` |
| `??` | Null合体演算子 | `null`, `undefined` のみ |

```typescript
// filepath: src/app/user/page.tsx
  useEffect(() => {
    if (error) {
      toast.error(
        error.message
        || 'ユーザー一覧の取得に失敗しました'
      );
    }
  }, [error]);
```

> `||` は falsy な値のとき右辺を使います。
> `if (error)` の中なので error オブジェクトの
> 存在は保証されています。権限がない場合は
> query 自体を無効にするため、この error は
> ADMIN の取得失敗だけを扱います。

**確認ポイント**:
- エラー時にトーストが表示される
- 一般ユーザーは `getAll` を送信しない

---

### Step 5: ローディングと権限チェック（5分）

**ゴール**: ローディング表示とADMIN以外のアクセス拒否画面を実装します。

**実装**:

```typescript
// filepath: src/app/user/page.tsx
  if (isCurrentUserLoading) {
    return <PageLoadingSpinner />;
  }
```

このスピナーは、自分が誰なのかを確かめている間の表示です。ロールが届く前にテーブルを描いてしまうと、管理者でない人の画面にも一瞬だけユーザー名とメールアドレスが見えます。判定材料がそろうまでは、画面に何も出さないほうが安全です。なお `PageLoadingSpinner` は回る円だけを返す部品なので、待っている間はサイドバーとヘッダーが出ません。判定が終わって本体を描くところで、あらためて `AppLayout` で囲みます。

**確認ポイント**:
- `/user` にアクセスしてスピナーが出る

権限チェック:
一般ユーザーでアクセスすると、ユーザー一覧ではなく
権限エラーのメッセージが表示されればOKです。

```typescript
// filepath: src/app/user/page.tsx
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="container mx-auto
          max-w-6xl mt-8">
          <Card>
            <CardContent className="pt-6">
              <h1 className="text-2xl
                font-bold mb-2">
                アクセス権限がありません
              </h1>
```

`if (!isAdmin)` は早期リターンです。`return` に達した時点で、この下に書くテーブルの組み立ては1行も実行されません。一般ユーザーが `/user` をURL入力で直接開くと、ユーザー一覧の代わりにこのカードだけが表示されます。`AppLayout` で囲んでいるのはサイドバーを残すためで、行き止まりにせず他のページへ戻れるようにしています。

ただし、この判定は画面側の親切にすぎません。本当の防波堤は Step 0 で書いた `adminProcedure` のほうです。ブラウザの JavaScript は読者の手元で動くので、書き換えればこの `if` は通り抜けられます。それでも `api.user.getAll` はサーバーで `管理者権限が必要です` と弾かれるため、他人のメールアドレスは1件も返りません。画面の判定は表示を整えるため、サーバーの判定は情報を守るためにあります。

**確認ポイント**:
- `USER_ROLE.ADMIN` を使っている（文字列 `'ADMIN'` ではない）

```typescript
// filepath: src/app/user/page.tsx
              <p className=
                "text-muted-foreground">
                この機能は管理者のみ
                利用できます
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }
```

エラーメッセージには、何が起きたかと誰なら使えるかの2つを書きます。「エラーが発生しました」とだけ出すと、読者は自分の操作を疑って同じ手順を何度も繰り返します。管理者専用だと書いてあれば、管理者に依頼するという次の行動がその場で分かります。閉じタグは開いた順の逆にたどり、`CardContent` から `Card`、`div`、`AppLayout` の順で閉じます。1つでも閉じ忘れると括弧の対応が関数の外までずれて、書いた場所から離れた行に構文エラーが出ます。

権限を通過した後で、一覧のローディングを
判定します。

```typescript
// filepath: src/app/user/page.tsx
  if (isLoading) {
    return <PageLoadingSpinner />;
  }
```

スピナーの判定が2か所に分かれているのには理由があります。上の `isCurrentUserLoading` は `currentUser` の到着待ちです。`isAdmin` はその `currentUser` から作られる値です。到着前の `currentUser` は `undefined` です。そのため `isAdmin` も `false` になります。上のスピナーを外すと、管理者がページを開いた一瞬だけ「アクセス権限がありません」のカードが出て、そのあと一覧に切り替わります。

こちらの `isLoading` はユーザー一覧そのものの取得待ちです。取得は `enabled: isAdmin` によって管理者のときしか始まらないので、権限チェックを通り抜けた後ろに置きます。リクエストを送っていない人のためにスピナーを回す必要はありません。判定の順番は、その判定に必要な材料がそろう順番と一致させます。

#### 権限チェックの判定ロジック

| 条件 | 結果 | 表示 |
|------|------|------|
| role === USER_ROLE.ADMIN | アクセス許可 | ユーザー一覧 |
| role === USER_ROLE.USER | アクセス拒否 | エラーカード |
| currentUser が null | アクセス拒否 | エラーカード |

> `USER_ROLE.ADMIN` は `@/lib/constant/roles` で
> 定義された定数です。文字列 `'ADMIN'` を直接書かず、
> 定数を使うことでタイプミスを防げます。

**確認ポイント**:
- 一般ユーザーでアクセスすると拒否される
- 管理者でアクセスすると一覧が見える
- 一般ユーザーでは `getAll` リクエストが発生しない

---

### Step 6: ページヘッダーとテーブル枠（4分）

**ゴール**: ページのメインレイアウトとテーブルのヘッダー行を作ります。

**実装**:

```typescript
// filepath: src/app/user/page.tsx
  return (
    <AppLayout>
      <div className="container mx-auto
        max-w-6xl py-8">
        <div className="flex
          justify-between items-center
          mb-6">
          <h1 className="text-3xl
            font-bold tracking-tight">
            ユーザー管理
          </h1>
        </div>
```

ここから下は、ログイン中の人が管理者だと確定したあとのコードです。上の2つの早期リターンを通り抜けた場合しか、この `return` には届きません。だから以降では `isAdmin` を確かめ直さずに書けます。早期リターンを先に並べておくと、本体のコードから条件分岐が消えて読みやすくなります。

`max-w-6xl` は横幅の上限です。この表は6列あるので、Day 09 のカード一覧より広い枠を使います。上限を付けないと、ワイドモニターで名前と右端のボタンが離れすぎて、どの行のボタンなのかを目で追えなくなります。

**確認ポイント**:
- 「ユーザー管理」のタイトルが表示される

```typescript
// filepath: src/app/user/page.tsx
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    ユーザー
                  </TableHead>
                  <TableHead>
                    メールアドレス
                  </TableHead>
                  <TableHead>
                    ロール
                  </TableHead>
```

`CardContent` に `className="p-0"` を付けているのは、テーブル側が各セルに余白を持っているからです。カードの初期余白を残すと枠線とセルの間に余白が二重にでき、行の区切り線がカードの内側で途切れて見えます。

`TableHead` はこの表の列そのものの定義です。ここに並べた個数と、Step 7 以降で書く `TableCell` の個数はそろえます。片方だけ増やすと、その行から下の列がすべて1つずつ横にずれます。エラーは1件も表示されないので、見た目のずれで気づくしかありません。列を足したくなったときは、ヘッダーと本体の両方を必ず同時に直してください。

**確認ポイント**:
- テーブルヘッダーに列名が表示される

```typescript
// filepath: src/app/user/page.tsx
                  <TableHead>
                    ステータス
                  </TableHead>
                  <TableHead>
                    登録日
                  </TableHead>
                  <TableHead
                    className="text-right">
                    アクション
                  </TableHead>
                </TableRow>
              </TableHeader>
```

> `TableHeader` と `TableBody` は
> 同じ `<Table>` タグの中に並べて書きます。
> HTMLの `<thead>` と `<tbody>` に対応しています。

**確認ポイント**:
- 6列のヘッダーが表示される
- アクション列が右寄せになっている

---

### Step 7: アバターとバッジの表示（5分）

**ゴール**: テーブル本体にアバター画像とロール・ステータスのバッジを表示します。

**実装**:

```typescript
// filepath: src/app/user/page.tsx
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex
                        items-center gap-3">
                        <Avatar
                          className="h-9 w-9">
                          {user.avatar && (
                            <AvatarImage
                              src={user.avatar}
                              alt={
                                user.name
                                || ''} />
                          )}
```

> `{user.avatar && ...}` で画像URLが
> 存在するときだけ `AvatarImage` を表示します。
> avatar が null/undefined のときは
> AvatarFallback が自動的に表示されます。

**確認ポイント**:
- 条件付きレンダリングを使っている

```typescript
// filepath: src/app/user/page.tsx
                          <AvatarFallback>
                            {user.name
                              ?.[0]
                              ?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className=
                          "font-medium">
                          {user.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.email}
                    </TableCell>
```

`user.name?.[0]?.toUpperCase()` は、名前の1文字目を取り出して大文字にする式です。`?.` を2回はさむのは、名前が未設定の場合と、名前はあっても空文字の場合の両方で途中停止できるようにするためです。`?.` を外すと、名前が `null` のユーザーが1人いるだけでこの式が例外を投げ、一覧全体が真っ白になります。1件のデータ欠けで残り全員の行まで巻き添えにしないための書き方です。

**確認ポイント**:
- アバター画像または頭文字が表示される
- ユーザー名とメールアドレスが表示される

アバターとバッジの表示を確認してください。

![アバターとバッジの表示](./screenshots/user-list.png)

```typescript
// filepath: src/app/user/page.tsx
                    <TableCell>
                      <UserRoleBadge
                        role={user.role} />
                    </TableCell>
                    <TableCell>
                      <ActiveStatusBadge
                        isActive={
                          user.isActive} />
                    </TableCell>
```

`user.role` をそのまま置けば、画面には `ADMIN` という文字が出ます。意味は通じますが、管理者を探すたびに文字を1行ずつ読む作業が発生します。`UserRoleBadge` に渡すとアイコンと色の付いた札に変わるので、一覧を上から眺めるだけで管理者の行が目に飛び込みます。

`ActiveStatusBadge` の考え方も共通です。`isActive` の中身は `true` か `false` ですが、画面に `false` と出ても読者には何のことか伝わりません。値を見た目へ翻訳する仕事を専用の部品へ閉じ込めておくと、色や文言を変えたくなったときの直し先がその部品1つで済みます。Day 09 で `'DONE'` と直接書かず `TASK_STATUS.DONE` を使ったのと、根っこは共通の考え方です。

#### バッジコンポーネントの仕様

| コンポーネント | Props | 表示内容 |
|--------------|-------|---------|
| UserRoleBadge | role | ADMIN: Shield + 管理者 / USER: User + ユーザー |
| ActiveStatusBadge | isActive | true: 緑バッジ / false: グレーバッジ |

| ステータス | 背景色 | テキスト色 | 表示テキスト |
|-----------|--------|-----------|------------|
| アクティブ | green-500/10 | green-700 | アクティブ |
| 無効 | gray-500/10 | gray-700 | 無効 |

> `AvatarFallback` にはユーザー名の頭文字を
> 大文字で表示します。画像がないユーザーでも
> アイコンが表示されます。

**確認ポイント**:
- 管理者は Shield アイコン付きで表示される
- アクティブは緑、無効はグレーで表示される

---

### Step 8: アクションボタンの追加（4分）

**ゴール**: 各行に日付表示と、詳細・編集ボタンを追加します。

**実装**:

```typescript
// filepath: src/app/user/page.tsx
                    <TableCell>
                      {user.createdAt
                        ? format(
                            new Date(
                              user.createdAt),
                            'yyyy/MM/dd',
                            { locale: ja })
                        : '-'}
                    </TableCell>
```

> `format` は `date-fns` の関数です。
> `ja` ロケールを渡すと日本語の日付形式で
> 表示されます。`createdAt` が undefined なら
> `-` を表示して安全に処理しています。

**確認ポイント**:
- 登録日が yyyy/MM/dd 形式で表示される

```typescript
// filepath: src/app/user/page.tsx
                    <TableCell
                      className="text-right">
                      <div className="flex
                        justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(
                              `/user/${
                                user.id}`)}
                          title="詳細">
                          <Eye
                            className=
                            "h-4 w-4" />
                        </Button>
```

`onClick` の中で `router.push` を呼ぶと、ページ全体を読み込み直さずに `/user/{id}` へ移ります。`<a href>` で書くとブラウザがページを丸ごと取り直すので、サイドバーの描画やログイン状態の確認までやり直しになり、画面が一度白くなります。Day 8 で置いたサイドバーのリンクと共通の仕組みです。

`title="詳細"` は、アイコンだけのボタンに名前を与える指定です。マウスを載せると吹き出しで名前が出ます。画像しか置いていないボタンにこの指定が無いと、読み上げソフトを使う人には名前のないボタンとして届き、押してよいものかどうかが判断できません。

**確認ポイント**:
- 目のアイコン（Eye）の詳細ボタンが表示される

```typescript
// filepath: src/app/user/page.tsx
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(
                              `/user/${
                                user.id
                              }/edit`)}
                          title="編集">
                          <Pencil
                            className=
                            "h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
```

編集ボタンは詳細ボタンと共通の形で、行き先の末尾に `/edit` が付くだけです。テンプレートリテラルの中へ `user.id` を挟むと、行ごとに違うURLができます。一覧のどの行から押しても、その行のユーザーの編集画面に着きます。

このボタンが用意しているのは移動の入口だけで、権限を守る役目は持っていません。`/user/{id}/edit` はURLを手で打っても開けます。編集画面が安全なのは、Day 29 で書く保存処理がサーバー側でロールを確かめ、管理者でなければ `管理者権限が必要です` を返すからです。ボタンを隠すことと、操作を禁じることは別の話だと覚えておいてください。

**確認ポイント**:
- 各行に詳細・編集の2つのボタンが表示される
- ホバーで背景色が変わる

```typescript
// filepath: src/app/user/page.tsx
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
```

`))}` の3文字は、それぞれ別のものを閉じています。内側の丸括弧は `map` に渡した関数が返す JSX の囲み、外側の丸括弧は `map` の呼び出し、波括弧は JSX の中に JavaScript を書くための入れ物です。開いたのは Step 7 の `{users?.map((user) => (` という1行なので、そこと縦に見比べると対応がつかめます。

括弧を1つ多く閉じたり足りなかったりすると、エラーが指す行番号はこの近くではなくファイルの末尾になりがちです。対応の破綻は、書いた場所ではなく最後まで読んだところで初めて発覚するからです。閉じるときは開いた順の逆にたどると、数え間違いが減ります。

#### アクションボタンの仕様

| ボタン | アイコン | 遷移先 | 用途 |
|-------|---------|--------|------|
| 詳細 | Eye | /user/ユーザーID | 情報閲覧 |
| 編集 | Pencil | /user/ユーザーID/edit | 情報編集 |

> `variant="ghost"` は背景色なしのボタンです。
> テーブル内では控えめなデザインが適しています。
> `size="icon"` でアイコンサイズになります。

**確認ポイント**:
- テーブルが完成し、全列にデータが表示される

---

### Step 9: 空状態UIと動作確認（3分）

**ゴール**: ユーザー0件時のメッセージを追加し、全体の動作を確認します。

一覧を通常操作から開けるよう、
`app-layout.tsx` に管理者専用リンクを加えます。

```typescript
// filepath: src/component/layout/app-layout.tsx
import { USER_ROLE }
  from '@/lib/constant/roles';
```

`/user` はサイドバーのどこにも出てこないので、いまはURLを手で打たないとたどり着けません。管理者にだけリンクを出して、通常の操作で開けるようにします。`app-layout.tsx` はログイン中のセッションをすでに読んでいるため、足すのはロールの定数だけで済みます。ここでも文字列の `'ADMIN'` は書かず、Step 5 と共通の `USER_ROLE.ADMIN` を使います。比べる側と比べられる側で書き方をそろえておけば、綴りを間違えた瞬間に型エラーで気づけます。

Day 8 のデスクトップ用 `<ul>` 内で、
`menuItems.map(...)` の直後へ追加します。

```typescript
// filepath: src/component/layout/app-layout.tsx
{session.user.role === USER_ROLE.ADMIN && (
  <li>
    <Link
      href="/user"
      className="flex items-center gap-3
        rounded-md px-3 py-2 text-sm"
    >
      ユーザー管理
    </Link>
  </li>
)}
```

`session.user.role === USER_ROLE.ADMIN && (...)` は、条件が成り立つときだけ後ろの要素を描く書き方です。成り立たないときは式の値が `false` になり、React は `false` を何も描かない値として扱います。だから一般ユーザーのサイドバーには、空の行すら残りません。

これで今日の守りは3枚になりました。いちばん外側がこのリンクの出し分けで、次が Step 5 の画面側の権限チェック、いちばん内側が Step 0 の `adminProcedure` です。外側の2枚は迷わせないための案内で、情報を守っているのは内側の1枚だけです。リンクを消しても `/user` 自体は開ける点を、もう一度確かめておいてください。

**確認ポイント**:
- ADMIN にだけ「ユーザー管理」が表示される
- USER にはリンクが表示されない

**実装**:

```typescript
// filepath: src/app/user/page.tsx
        {users && users.length === 0 && (
          <div className="text-center py-10
            text-muted-foreground">
            ユーザーが見つかりませんでした
          </div>
        )}
      </div>
    </AppLayout>
  );
}
```

> データが0件のとき何も表示しないと、
> ユーザーは混乱します。
> 空状態メッセージを表示して安心させましょう。

**確認ポイント**:
- ユーザーが0件のときメッセージが表示される

完成画面: 全ユーザーが一覧表示されています。

![完成したユーザー管理ページ](./screenshots/user-list.png)

```bash
# filepath: ターミナル
PORT=3001 npm run dev
```

**動作確認チェックリスト**:

1. 管理者でログインする
2. `/user` にアクセスする
3. ユーザー一覧がテーブルで表示される
4. アバターと名前が表示される
5. ロールバッジが正しく色分けされる
6. ステータスバッジが正しい
7. 詳細ボタンで `/user/{id}` に遷移する
8. 一般ユーザーでアクセスし拒否を確認する

#### 遷移先のURL構造

| ボタン | URL パターン | 例 |
|-------|-------------|-----|
| 詳細 | /user/{id} | /user/abc123 |
| 編集 | /user/{id}/edit | /user/abc123/edit |

**確認ポイント**:
- 管理者のみアクセスできる
- 全ユーザーがテーブルに表示される
- 詳細・編集ボタンで正しく遷移する


---

### Pro パターンで書こう（ユーザー一覧カードの Props は Pick で切り出す）

ユーザー一覧カードは、ユーザー情報の一部だけを使います。
`User` 型を丸ごと渡すより、使う列だけを `Pick` すると、
カードの責務が読みやすくなります。

| 書き方 | 特徴 |
|--------|------|
| `User` を丸ごと渡す | 使わない情報も混ざる |
| `Pick<User, ...>` | 必要な列だけ分かる |

**覚えておきたいこと**: 表示部品には必要な情報だけ渡します。

## 今日のまとめ

- [ ] api.auth.getCurrentUser で権限チェックした
- [ ] api.user.getAll でユーザー一覧を取得した
- [ ] Avatar と UserRoleBadge/ActiveStatusBadge でユーザー情報を表示した
- [ ] アクションボタンで詳細・編集に遷移できた
- [ ] 空状態UIを実装した

## つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| 一般ユーザーで表示される | 権限チェック漏れ | `role !== USER_ROLE.ADMIN` を追加 |
| アバターが空白 | avatar が null | AvatarFallback で頭文字表示 |
| 日付がInvalid Date | createdAt が undefined | 三項演算子で '-' を表示 |
| ボタンが押せない | onClick 未設定 | router.push を追加 |
| テーブルが空で不安 | 空状態UI未実装 | length === 0 のメッセージを追加 |

## 今日学んだ用語

| 用語 | 意味 |
|------|------|
| getCurrentUser | ログイン中ユーザーの情報取得 |
| USER_ROLE.ADMIN | 管理者ロールを表す定数 |
| \|\| (OR演算子) | falsy値のとき代替値を使う演算子 |
| && (条件付きレンダリング) | 条件がtrueのときだけ要素を表示するパターン |
| `?.` (オプショナルチェーン) | プロパティがnull/undefinedでもエラーにならない |
| UserRoleBadge | ロール表示用の専用バッジコンポーネント |
| variant="ghost" | 背景なしの控えめなボタンスタイル |

## 次回予告

Day 25 では、プロフィールページとパスワード変更機能を実装します。
自分の情報を確認・変更できるようにします。
