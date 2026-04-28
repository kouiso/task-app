# Day 10: プロジェクト新規作成を実装しよう

## 🔙 前回の振り返り

Day 09 では tRPC の `useQuery` を使ってサーバーからプロジェクトデータを取得し、`PageLoadingSpinner` によるローディング表示、グリッドレイアウトでのカード一覧、クエリパラメータによる詳細画面の自動オープンを実装しました。データの「読み取り」ができるようになったので、今日はダイアログ形式のフォームでプロジェクトの「作成」に挑戦します。

---

## 🎯 今日のゴール

ダイアログ（モーダル）形式のフォームで、新しいプロジェクトを作成できるようにします。react-hook-form と zod でフォームのバリデーションと状態管理を行い、tRPC の `useMutation` でサーバーに保存します。

📸 スクリーンショット: プロジェクト作成ダイアログ

![プロジェクト作成ダイアログ](./screenshots/project-create-dialog.png)
## 🤔 なぜこれを作るのか？

プロジェクトがなければタスクも管理できません。ここでは「ダイアログ」という新しいUIパターンを学びます。

> 💡 **例え話**: ダイアログは「付箋」のようなものです。ページ全体を移動せずに、今いる画面の上にメモ用紙をペタッと貼って書き込みます。書き終わったら付箋をはがすと、元の画面がそのまま残っています。

### 📐 プロジェクト作成の流れ

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

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| ProjectDialog コンポーネントを作る | 別ページでフォームを作る |
| react-hook-form + zod でフォーム管理 | useState で手動管理 |
| useMutation でサーバーに保存 | fetch を手書きする |
| キャッシュ無効化で一覧を自動更新 | 手動でページリロード |

### 📂 今日触るファイル

```
src/
├── app/
│   └── project/
│       └── page.tsx              ← 確認（Day 09 で実装済み）
├── component/
│   └── project/
│       └── project-dialog.tsx    ← 既存（今日内容を理解する）
└── lib/
    └── constant/
        └── project.ts            ← 既存（定数を利用する）
```

> ⚠️ **重要**: `project-dialog.tsx` も `page.tsx` も、既にリポジトリに存在する実装済みファイルです。今日の作業は「新規作成」ではなく「既存コードの理解」が中心です。指示された場所以外は変更しないよう注意してください。

> 💡 今日は `project-dialog.tsx` の実装を読み解き、Day 09 で組み込み済みの `page.tsx` との連携を理解します。コードを一から書くのではなく、どのように動いているかを確認するのが主な学習内容です。

> 📌 **今日のゴールライン**: 既存コードを「全部理解する」必要はない。「この部品がこう動く」が見えたら十分。細かい型やユーティリティは使いながら慣れていく。

### 🆕 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| Dialog | ダイアログ | 画面上に重なるモーダル | 付箋。今の画面の上に貼って書き込む |
| zodResolver | ゾッド・リゾルバー | zod スキーマで入力値を自動検証する仕組み | 記入用紙のチェック係。書き漏れがあれば教えてくれる |
| register | レジスター | 入力欄を react-hook-form に登録する関数 | 記入欄に名札を付けて、どの欄かを管理する |
| キャッシュ無効化 | — | データ変更後に一覧を自動で再取得 | 掲示板の更新ボタン。新しい投稿を反映する |

> 📌 **今日のゴールライン**: 今日は既存のコードを読む場面が多い。「なぜこう書いてあるか」は全部わからなくて OK。「ダイアログでプロジェクトを作成できた」という結果が出たら今日の勝ち。読解力は Day 11 以降で同じパターンを繰り返すうちについてくる。

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | ProjectDialogの骨格を作る | 5分 |
| Step 2 | zodスキーマとフォーム設定を作る | 5分 |
| Step 3 | values propで初期値を自動同期する | 5分 |
| Step 4 | 名前・説明の入力欄を作る | 7分 |
| Step 5 | カラーピッカーと日付欄を作る | 7分 |
| Step 6 | 送信処理を実装する | 5分 |
| Step 7 | ページにDialogを組み込む | 7分 |
| Step 8 | 動作確認 | 3分 |

**合計時間**: 約44分

---

### Step 1: ProjectDialogの骨格を作る（5分）

🎯 **ゴール**: ダイアログの基本構造を作ります。

> 💡 **例え話**: AppLayout は「建物の共通設備」でしたが、Dialog は「部屋の中で開く小窓」です。中に入力フォームを置いて、書き終わったら閉じます。

💻 **実装**:

```typescript
// filepath: src/component/project/project-dialog.tsx
'use client';

// フォームバリデーション関連
import { zodResolver }
  from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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

✅ **確認ポイント**:
- コードの内容を確認した
- 全てのimportが確認できた

続いて、Props の型定義を確認します。

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

> 💡 `onClose` は「ダイアログを閉じる」ためのコールバックです。親コンポーネントが `setDialogOpen(false)` を渡します。

✅ **確認ポイント**:
- `src/component/project/project-dialog.tsx` の内容を確認した
- `ProjectDialogProps` と `ProjectFormData` の定義を理解した

---

### Step 2: zodスキーマとフォーム設定を作る（5分）

🎯 **ゴール**: zod でバリデーションルールを定義し、react-hook-form で入力管理します。

💻 **実装**:

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

✅ **確認ポイント**:
- `projectFormSchema` を定義した
- `name` フィールドに `min(1)` バリデーションが設定されている

#### zodスキーマの各フィールド

| フィールド | バリデーション | 意味 |
|-----------|-------------|------|
| `name` | `z.string().min(1, ...)` | 1文字以上必須 |
| `description` | `z.string().optional()` | 入力は任意 |
| `color` | `z.string()` | 色コード（必須） |
| `startDate` | `z.string().optional()` | 開始日（任意） |
| `endDate` | `z.string().optional()` | 終了日（任意） |

> 💡 `z.infer<typeof projectFormSchema>` は、zod スキーマから TypeScript の型を自動生成する機能です。スキーマと型が常に一致するので、ズレが起きません。

---

### Step 3: values propで初期値を自動同期する（5分）

🎯 **ゴール**: `useForm` の `values` prop を使って、ダイアログが開くたびにフォームの初期値を自動で設定します。

💻 **実装**:

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
    values: {
      id: initialData?.id,
      name: initialData?.name ?? '',
      description:
        initialData?.description ?? '',
      color: initialData?.color
        ?? DEFAULT_PROJECT_COLOR,
      startDate:
        initialData?.startDate ?? '',
      endDate:
        initialData?.endDate ?? '',
    },
  });
```

✅ **確認ポイント**:
- `useForm` に `resolver` と `values` が設定されている
- `register`, `handleSubmit`, `reset`, `errors` を取得している

#### useForm の設定

| 設定 | 役割 |
|------|------|
| `resolver: zodResolver(...)` | zodスキーマでバリデーションを実行 |
| `values: {...}` | `initialData` が変わるたびにフォームの値を自動同期 |
| `register` | 各入力欄をフォームに登録する関数 |
| `handleSubmit` | バリデーション通過後に送信する関数 |
| `reset` | フォームの値をリセットする関数 |
| `errors` | バリデーションエラーの情報 |

> 💡 `values` prop を使うと、`initialData` が変わるたびにフォームの値が自動で更新されます。`useEffect` + `setState` のパターンが不要になり、コードがシンプルになります。`DEFAULT_PROJECT_COLOR` がカラーの初期値として使われている点にも注目してください。

---

### Step 4: 名前・説明の入力欄を作る（7分）

🎯 **ゴール**: プロジェクト名と説明の入力フォームを追加します。

💻 **実装**:

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

✅ **確認ポイント**:
- `handleClose` でフォームのリセットとダイアログの閉じが両方行われる
- `...(data.description && { description: data.description })` は「description が入力されている場合だけプロパティを含める」条件付きスプレッド。`&&` はここでは null/undefined フォールバックではなく、「真なら含める」という意味で使っている。`??` とは用途が異なる

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

✅ **確認ポイント**:
- `Dialog` の `onOpenChange` で閉じ動作をハンドリングしている
- `initialData?.id` の有無でタイトルが「作成」と「編集」に切り替わる

プロジェクト名の入力欄です。`{...register('name')}` でフォームに登録します。

```typescript
// filepath: src/component/project/project-dialog.tsx
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
              {...register('name')} />
            {errors.name && (
              <p className=
                "text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>
```

✅ **確認ポイント**:
- `{...register('name')}` でフォームに登録されている
- `errors.name` でバリデーションエラーを表示している

説明欄を追加します。

```typescript
// filepath: src/component/project/project-dialog.tsx
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

✅ **確認ポイント**:
- `Textarea` に `{...register('description')}` が設定されている

> 💡 `{...register('name')}` は、入力欄に `name`, `onChange`, `onBlur`, `ref` をまとめて設定するスプレッド構文です。`value` と `onChange` を手動で書く必要がなくなります。

✅ **確認ポイント**:
- プロジェクト名の入力欄が表示される
- 名前が空のまま送信するとエラーメッセージが表示される
- DialogDescription でモードに応じた説明文が表示される

---

### Step 5: カラーピッカーと日付欄を作る（7分）

🎯 **ゴール**: プロジェクトの色と期間を設定できるようにします。

💻 **実装**:

カラー・開始日・終了日を横並び3列で配置します。

```typescript
// filepath: src/component/project/project-dialog.tsx
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

✅ **確認ポイント**:
- `type="color"` でカラーピッカーが表示される

```typescript
// filepath: src/component/project/project-dialog.tsx
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

✅ **確認ポイント**:
- `type="date"` で日付ピッカーが表示される

続いて、終了日フィールドとフォーム全体の閉じタグを追加します。

```typescript
// filepath: src/component/project/project-dialog.tsx
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

> 💡 `type="color"` を指定すると、ブラウザ標準のカラーピッカーが表示されます。`className="h-10"` で他の入力欄と高さを揃えています。`{...register('color')}` で、選んだ色が自動的にフォームの値として管理されます。

✅ **確認ポイント**:
- カラーピッカーで色を選べる
- 開始日・終了日を入力できる

📸 スクリーンショット: フォーム入力中のダイアログ

![フォーム入力中のダイアログ](./screenshots/project-create-dialog.png)
---

### Step 6: 送信処理を実装する（5分）

🎯 **ゴール**: 送信ボタンとキャンセルボタンを追加します。

💻 **実装**:

```typescript
// filepath: src/component/project/project-dialog.tsx
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
```

✅ **確認ポイント**:
- 作成ボタンとキャンセルボタンが表示される
- プロジェクト名が空のまま送信するとzodのエラーメッセージが表示される
- キャンセルでダイアログが閉じ、フォームがリセットされる
- キャンセル後にダイアログを再度開くと、前回の入力内容がクリアされている

#### ボタンの役割

| ボタン | type | 動作 |
|--------|------|------|
| キャンセル | `button` | `handleClose` でフォームをリセットし、ダイアログを閉じる |
| 作成 / 更新 | `submit` | `handleSubmit` → zodバリデーション → `handleFormSubmit` |

> 💡 `type="button"` を指定しないと、キャンセルボタンでもフォーム送信が実行されてしまいます。キャンセル時は `handleClose` で `reset()` を呼び、フォームの入力内容をクリアしてから閉じます。

---

### Step 7: ページにDialogが組み込まれている仕組みを確認する（7分）

🎯 **ゴール**: プロジェクト一覧ページにダイアログがどのように組み込まれているかを確認し、作成・更新処理の仕組みを理解します。

Day 09 で作成した `page.tsx` には既にプロジェクト作成の実装が含まれています。ここでは、実装されたコードの各部分を確認して理解を深めましょう。

> **注意**: 以下のコードはDay 09の `page.tsx` に既に実装されています。新たに追加する必要はありません。

💻 **確認**:

```typescript
// filepath: src/app/project/page.tsx
// ProjectDialogとProjectFormData型のimport（確認）
import {
  ProjectDialog,
  type ProjectFormData,
} from
  '@/component/project/project-dialog';
```

✅ **確認ポイント**:
- importが `page.tsx` に存在することを確認した

```typescript
// filepath: src/app/project/page.tsx
// ProjectPageContent内の実装（確認）
// tRPCのキャッシュ操作ユーティリティ
const utils = api.useUtils();

// ログイン中のユーザー情報を取得
const { data: currentUser } =
  api.auth.getCurrentUser.useQuery();

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

✅ **確認ポイント**:
- `useUtils` でキャッシュ操作ユーティリティを取得していることを確認した
- `onSuccess` でキャッシュ無効化とダイアログ閉じを行っていることを確認した

`handleSubmit` は `data.id` の有無で「更新」と「作成」を自動で切り替えます。`data.id` がある場合は既存プロジェクトの更新です。

```typescript
// filepath: src/app/project/page.tsx
// 送信ハンドラー（更新ケース・確認）
const handleSubmit = (
  data: ProjectFormData
) => {
  if (data.id) {
    // 既存プロジェクトの更新
    updateMutation.mutate({
      id: data.id,
      name: data.name,
      description:
        data.description
          ? data.description : null,
      color: data.color,
      startDate: data.startDate
        ? new Date(data.startDate)
            .toISOString()
        : null,
      endDate: data.endDate
        ? new Date(data.endDate)
            .toISOString()
        : null,
    });
  } else { /* 新規作成ケースへ続く */ }
};
```

✅ **確認ポイント**:
- `data.id` がある場合に `updateMutation` を呼ぶことを確認した
- 更新時の日付未入力は `null` で渡すことを確認した

`data.id` がない場合は新規プロジェクトの作成です。`currentUser?.id` のガードで未ログイン時を弾きます。

```typescript
// filepath: src/app/project/page.tsx
// 送信ハンドラー（作成ケース・確認）
  } else {
    // 新規プロジェクトの作成
    if (!currentUser?.id) return;
    createMutation.mutate({
      name: data.name,
      description: data.description,
      color: data.color,
      startDate: data.startDate
        ? new Date(data.startDate)
            .toISOString()
        : undefined,
      endDate: data.endDate
        ? new Date(data.endDate)
            .toISOString()
        : undefined,
    });
  }
```

✅ **確認ポイント**:
- `data.id` がない場合に `createMutation` を呼ぶことを確認した
- 作成時の日付未入力は `undefined` で渡すことを確認した

JSX 内に `ProjectDialog` が組み込まれていることを確認します。

```typescript
// filepath: src/app/project/page.tsx
// JSX内（AppLayoutの閉じタグの前）
<ProjectDialog
  open={dialogOpen}
  onClose={() => setDialogOpen(false)}
  onSubmit={handleSubmit}
  initialData={editingProject}
/>
```

> 💡 `utils.project.getAll.invalidate()` はキャッシュ無効化です。これにより、作成後に一覧が自動で再取得され、新しいプロジェクトが表示されます。`initialData` に `editingProject` を渡すことで、Day 11 での編集機能でも同じダイアログを再利用できます。

✅ **確認ポイント**:
- 新規作成ボタンでダイアログが開く
- フォーム送信でプロジェクトが作成される
- 一覧に新しいプロジェクトが表示される

📸 スクリーンショット: 作成後に一覧に追加されたプロジェクト

![作成後に一覧に追加されたプロジェクト](./screenshots/project-list.png)
---

### Step 8: 動作確認（3分）

🎯 **ゴール**: プロジェクト作成の全体フローを確認します。

開発サーバーを起動します。

```bash
# filepath: ターミナル
# 開発サーバーを起動
PORT=3001 npm run dev
```

✅ **確認ポイント**:
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

📸 スクリーンショット: 完成した作成フロー

![完成した作成フロー](./screenshots/project-create-dialog.png)
✅ **確認ポイント**:
- プロジェクトが作成できる
- 一覧が自動で更新される（ページリロードなし）
- カードに選んだ色が反映されている
- キャンセルで入力がリセットされる

## 📋 今日のまとめ

- [ ] Dialog コンポーネントでモーダルフォームを作れた
- [ ] react-hook-form + zodResolver でフォームのバリデーションを実装できた
- [ ] `register` で入力欄をフォームに登録できた
- [ ] `useMutation` でサーバーにデータを保存できた
- [ ] `invalidate()` でキャッシュを自動更新できた

## ⚠️ つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| ダイアログが開かない | `open` prop が渡されていない | `open={dialogOpen}` を確認 |
| `dialogOpen is not defined` | state 宣言が漏れている | Day 09 Step 7 で `useState(false)` を宣言したか確認 |
| 作成後に一覧が更新されない | キャッシュ無効化の呼び忘れ | `utils.project.getAll.invalidate()` を追加 |
| バリデーションが効かない | `resolver` の設定漏れ | `resolver: zodResolver(projectFormSchema)` を確認 |
| 入力しても値が反映されない | `register` の接続漏れ | `{...register('name')}` のスプレッド構文を確認 |
| 作成ボタンを押しても何も起きない | `currentUser` が null | ログイン状態を確認 |

## 📝 今日学んだ用語

| 用語 | 意味 |
|------|------|
| Dialog | 画面の上に重なるモーダルウィンドウ |
| useMutation | データの作成・更新・削除に使う tRPC フック |
| invalidate | キャッシュを無効にして再取得させる操作 |
| useUtils | tRPC のキャッシュ操作ユーティリティ |
| zodResolver | zod スキーマを react-hook-form に接続するアダプター |
| register | 入力欄を react-hook-form に登録する関数 |

## 🔜 次回予告

Day 11 では、プロジェクトの編集・削除機能を実装します。Day 10 で作った ProjectDialog を「編集モード」で再利用する方法を学びます。
