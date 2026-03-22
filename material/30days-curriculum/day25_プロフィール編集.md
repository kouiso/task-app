# Day 25: プロフィール編集を実装しよう

## 🔙 前回の振り返り

Day 24 では管理者専用のユーザー一覧ページを実装し、`api.auth.getCurrentUser` による権限チェックや Avatar・Badge を使ったユーザー情報の表示を学びました。管理者視点でのユーザー管理ができるようになったので、今日は自分自身のプロフィール表示とパスワード変更に取り組みます。

---

## 🎯 今日のゴール

プロフィール表示ページとパスワード変更ページを
実装します。自分の情報を確認し、
パスワードを安全に変更できるようにします。

📸 スクリーンショット: プロフィールページ全体の表示を確認してください。

## 🤔 なぜこれを作るのか？

ユーザーが自分の情報を確認し、
パスワードを管理するための画面です。

> 💡 **例え話**: プロフィールページは
> 「SNSのマイページ」です。
> 自分の名前やアイコンを確認（表示）し、
> 設定画面で情報を更新（編集）できます。
> パスワード変更は、銀行のATMで
> 暗証番号を変えるイメージです。

### 📐 プロフィール関連ページの構造

```mermaid
flowchart TD
    A[/profile] --> B[プロフィール表示]
    B --> C[プロフィール編集ボタン]
    B --> D[パスワード変更ボタン]
    B --> E[ユーザー管理ボタン]
    C --> F[/profile/edit]
    D --> G[/profile/change-password]
    E --> H[/user]
    G --> I[バリデーション]
    I -->|成功| J[toast.success]
    I -->|失敗| K[toast.error]
    J --> A

    style A fill:#e3f2fd
    style G fill:#fff3e0
    style J fill:#e8f5e9
    style K fill:#ffebee
```

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| プロフィール表示 | アバター画像のアップロード |
| プロフィール編集（名前・メール・アバターURL） | 二段階認証の設定 |
| パスワード変更フォーム | alert() の使用 |
| バリデーション実装 | |
| toast でフィードバック | |

### 🆕 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| PasswordInput | パスワードインプット | パスワード入力の再利用コンポーネント | 目のアイコンで表示切替できる入力欄 |
| changePassword | — | パスワード変更API | 暗証番号の変更 |
| updateProfile | — | プロフィール更新API | 名前やメールの編集を保存 |
| toast | トースト | 通知メッセージ（復習） | ポップアップ通知 |

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | プロフィールページの概要 | 3分 |
| Step 2 | ユーザーデータの取得 | 3分 |
| Step 3 | プロフィール情報の表示 | 5分 |
| Step 4 | ナビゲーションボタン | 5分 |
| Step 5 | パスワード変更ページの概要 | 3分 |
| Step 6 | パスワード変更フォーム | 5分 |
| Step 7 | バリデーションとエラー処理 | 5分 |
| Step 8 | 動作確認 | 3分 |
| Step 9 | 編集ページの設計を理解 | 3分 |
| Step 10 | 編集フォームを実装 | 7分 |
| Step 11 | 編集の動作確認 | 3分 |

**合計時間**: 約45分

---

### Step 1: プロフィールページの概要（3分）

🎯 **ゴール**: プロフィールページに
表示する情報を理解します。

#### ディレクトリ構造

```
src/app/profile/
├── page.tsx            （プロフィール表示）
├── edit/
│   └── page.tsx        （プロフィール編集）
└── change-password/
    └── page.tsx        （パスワード変更）
```

```bash
# filepath: ターミナル
# プロフィールページの構成を確認
ls src/app/profile/
```

✅ **確認ポイント**:
- `ls` の結果に `page.tsx`、`edit/`、`change-password/` が表示された
#### 表示する情報一覧

| 項目 | プロパティ | 表示形式 |
|------|-----------|---------|
| アバター | avatar | 画像 or 頭文字 |
| 名前 | name | テキスト |
| ロール | role | Badge |
| ステータス | isActive | Badge |
| メール | email | テキスト |
| 登録日 | createdAt | yyyy年MM月dd日 |
| 更新日 | updatedAt | yyyy年MM月dd日 |

#### ページ内のボタン

| ボタン | 遷移先 | 条件 |
|-------|--------|------|
| プロフィール編集 | /profile/edit | 全ユーザー |
| パスワード変更 | /profile/change-password | 全ユーザー |
| ユーザー管理 | /user | ADMIN のみ |

> 💡 `api.auth.getCurrentUser` で
> 自分の情報を取得します。
> useSession ではなく tRPC のAPIを
> 使うのがこのアプリの設計です。


---

### Step 2: ユーザーデータの取得（3分）

🎯 **ゴール**: getCurrentUser APIで
ログイン中のユーザー情報を取得します。

💻 **実装**:

```typescript
// filepath: src/app/profile/page.tsx
'use client';

import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Calendar, Edit, Lock, Mail,
  Shield, User,
} from 'lucide-react';
import { useRouter }
  from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout }
  from '@/component/layout/app-layout';
import {
  Avatar, AvatarFallback, AvatarImage,
} from '@/component/ui/avatar';
```

残りのコンポーネントをインポートします。

```typescript
// filepath: src/app/profile/page.tsx
// UI コンポーネントと定数のインポート
import { Button }
  from '@/component/ui/button';
import {
  Card, CardContent,
  CardHeader, CardTitle,
} from '@/component/ui/card';
import { PageLoadingSpinner }
  from '@/component/ui/loading-spinner';
import { Separator }
  from '@/component/ui/separator';
import {
  ActiveStatusBadge, UserRoleBadge,
} from '@/component/ui/user-badges';
import { USER_ROLE }
  from '@/lib/constant/roles';
import { api } from '@/trpc/react';
```

> 💡 `UserRoleBadge` と `ActiveStatusBadge` は
> 再利用可能なバッジコンポーネントです。
> 定数 `USER_ROLE` を使うと、文字列リテラルの
> タイポを防げます。

```typescript
// filepath: src/app/profile/page.tsx
// データ取得
export default function ProfilePage() {
  const router = useRouter();
  const {
    data: currentUser,
    isLoading,
  } = api.auth.getCurrentUser.useQuery();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoading, router]);
```

ローディング中は共通スピナーを表示します。

```typescript
// filepath: src/app/profile/page.tsx
  // PageLoadingSpinner で統一的に表示
  if (isLoading) {
    return <PageLoadingSpinner />;
  }
```

> 💡 `PageLoadingSpinner` は共通コンポーネントで、
> 各ページのローディング表示を統一します。

```typescript
// filepath: src/app/profile/page.tsx
// 未ログインチェック
  if (!currentUser) {
    return null;
  }
```

> 💡 `useEffect` でローディング完了後に
> `currentUser` が null だったら
> ログインページへリダイレクトします。
> ローディング中は `return null` にせず、
> スピナーを表示するようにします。

✅ **確認ポイント**:
- currentUser にデータが入る
- 未ログインでリダイレクトされる

---

### Step 3: プロフィール情報の表示（5分）

🎯 **ゴール**: アバター、名前、バッジ、
詳細情報をCard内に表示します。

Step 2 で書いた `if (!currentUser)` の後に
`return` 文を書きます。
全体は `AppLayout > div > Card` の構造です。

💻 **実装**:

まず `return` 文とページの骨格です。

```typescript
// filepath: src/app/profile/page.tsx
// ページ全体のreturn文
return (
  <AppLayout>
    <div className="container mx-auto
      max-w-2xl space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            プロフィール
          </CardTitle>
        </CardHeader>
        <CardContent
          className="space-y-6">
          {/* 以降のStepでここに追加 */}
        </CardContent>
      </Card>
    </div>
  </AppLayout>
);
```

✅ **確認ポイント**:
- return 文の骨格を書いた

上の `CardContent` の中に、以下のアバター・
名前ブロックを配置します。

```typescript
// filepath: src/app/profile/page.tsx
// アバターと名前の表示
<Avatar className="w-20 h-20
  rounded-lg">
  <AvatarImage
    src={currentUser.avatar || ''}
    className="object-cover" />
  <AvatarFallback
    className="rounded-lg
      bg-primary/10">
    <User className="w-10 h-10
      text-primary" />
  </AvatarFallback>
</Avatar>
<div className="flex-1">
  <h1 className="text-2xl font-bold">
    {currentUser.name}
  </h1>
</div>
```

```typescript
// filepath: src/app/profile/page.tsx
// 管理者のみロールバッジを表示
<div className="flex gap-2 mt-2">
  {currentUser.role
    === USER_ROLE.ADMIN && (
    <UserRoleBadge
      role={currentUser.role} />
  )}
  <ActiveStatusBadge
    isActive={currentUser.isActive} />
</div>
```

> 💡 `UserRoleBadge` は管理者のみ表示します。
> `USER_ROLE.ADMIN` と比較して条件付き
> レンダリングします。

✅ **確認ポイント**:
- ロールバッジが表示される
- ステータスバッジが表示される

```typescript
// filepath: src/app/profile/page.tsx
// メールアドレスと日付情報
<Separator />
<div className="space-y-4">
  <div className="flex
    items-start gap-4">
    <div className="flex items-center
      justify-center w-10 h-10
      rounded-lg bg-primary/10">
      <Mail className="w-5 h-5
        text-primary" />
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium
        text-muted-foreground">
        メールアドレス
      </p>
      <p className="text-base">
        {currentUser.email}
      </p>
    </div>
  </div>
</div>
```

```typescript
// filepath: src/app/profile/page.tsx
// 登録日の表示
<div className="flex items-start gap-4">
  <div className="flex items-center
    justify-center w-10 h-10
    rounded-lg bg-primary/10">
    <Calendar className="w-5 h-5
      text-primary" />
  </div>
  <div className="flex-1">
    <p className="text-sm font-medium
      text-muted-foreground">登録日</p>
    <p className="text-base">
      {currentUser.createdAt
        ? format(
            new Date(currentUser.createdAt),
            'yyyy年MM月dd日',
            { locale: ja })
        : '-'}
    </p>
  </div>
</div>
```

```typescript
// filepath: src/app/profile/page.tsx
// 最終更新日の表示
<div className="flex items-start gap-4">
  <div className="flex items-center
    justify-center w-10 h-10
    rounded-lg bg-primary/10">
    <Calendar className="w-5 h-5
      text-primary" />
  </div>
  <div className="flex-1">
    <p className="text-sm font-medium
      text-muted-foreground">
      最終更新日
    </p>
    <p className="text-base">
      {currentUser.updatedAt
        ? format(
            new Date(currentUser.updatedAt),
            'yyyy年MM月dd日',
            { locale: ja })
        : '-'}
    </p>
  </div>
</div>
```

> 💡 `Separator` は区切り線を表示する
> shadcn/ui のコンポーネントです。
> セクションを視覚的に分離します。

✅ **確認ポイント**:
- アバターと名前が表示される
- バッジが正しく色分けされる

📸 スクリーンショット: プロフィール情報表示の表示を確認してください。

---

### Step 4: ナビゲーションボタン（5分）

🎯 **ゴール**: 編集・パスワード変更・
ユーザー管理へのボタンを配置します。

💻 **実装**:

```typescript
// filepath: src/app/profile/page.tsx
// 編集・パスワード変更ボタン
<Separator />
<div className="flex flex-col gap-3">
  <Button className="w-full"
    onClick={() =>
      router.push('/profile/edit')}>
    <Edit className="w-4 h-4 mr-2" />
    プロフィール編集
  </Button>
  <Button variant="outline"
    className="w-full"
    onClick={() => router.push(
      '/profile/change-password')}>
    <Lock className="w-4 h-4 mr-2" />
    パスワード変更
  </Button>
```

```typescript
// filepath: src/app/profile/page.tsx
// 管理者用ユーザー管理ボタン
  {currentUser.role === USER_ROLE.ADMIN && (
    <Button variant="outline"
      className="w-full"
      onClick={() =>
        router.push('/user')}>
      <Shield
        className="w-4 h-4 mr-2" />
      ユーザー管理
    </Button>
  )}
</div>
```

✅ **確認ポイント**:
- 3つのボタンが縦に並ぶ
- 管理者にだけユーザー管理ボタンが出る

📸 スクリーンショット: ナビゲーションボタンの表示を確認してください。

#### ボタンのスタイル使い分け

| ボタン | variant | 理由 |
|-------|---------|------|
| プロフィール編集 | default（塗り） | メインアクション |
| パスワード変更 | outline（枠線） | サブアクション |
| ユーザー管理 | outline（枠線） | サブアクション |

> 💡 `currentUser.role === USER_ROLE.ADMIN` で
> 条件付きレンダリングをしています。
> 管理者にだけ「ユーザー管理」ボタンが
> 表示されます。

---

### Step 5: パスワード変更ページの概要（3分）

🎯 **ゴール**: パスワード変更ページの
構成とAPIを理解します。

```bash
# filepath: ターミナル
# パスワード変更ページの構成を確認
ls src/app/profile/change-password/
```

✅ **確認ポイント**:
- `ls` で `page.tsx` が存在する
- 入力項目が3つあることを確認した
#### パスワード変更の入力項目

| 項目 | name属性 | バリデーション |
|------|---------|--------------|
| 現在のパスワード | currentPassword | 必須 |
| 新しいパスワード | newPassword | 8文字以上 |
| 確認用パスワード | confirmPassword | newPassword と一致 |

#### 使用するAPI

| API | メソッド | 用途 |
|-----|---------|------|
| api.user.changePassword | useMutation | パスワード変更 |

> 💡 `changePassword` はサーバー側で
> 現在のパスワードの照合と新パスワードの
> ハッシュ化を行います。


---

### Step 6: パスワード変更フォーム（5分）

🎯 **ゴール**: useState でフォームの
状態を管理し、APIを呼び出します。

💻 **実装**:

```typescript
// filepath: src/app/profile/change-password/page.tsx
'use client';

// アイコンとルーティング
import { AlertCircle } from 'lucide-react';
import { useRouter }
  from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { AppLayout }
  from '@/component/layout/app-layout';
import {
  Alert, AlertDescription,
  AlertTitle,
} from '@/component/ui/alert';
```

✅ **確認ポイント**:
- インポートパスが正しい

フォーム用のコンポーネントをインポートします。

```typescript
// filepath: src/app/profile/change-password/page.tsx
// フォーム部品と PasswordInput
import { Button }
  from '@/component/ui/button';
import {
  Card, CardContent,
  CardHeader, CardTitle,
} from '@/component/ui/card';
import { Label }
  from '@/component/ui/label';
import { PasswordInput }
  from '@/component/ui/password-input';
import { api } from '@/trpc/react';
```

> 💡 `PasswordInput` はパスワードの表示/非表示
> トグル（Eye/EyeOff）を内蔵したコンポーネントです。
> ページ側で `showPassword` を管理する必要がありません。

```typescript
// filepath: src/app/profile/change-password/page.tsx
// useState でフォーム状態を管理
export default function
  ChangePasswordPage() {
  const router = useRouter();
  const [formData, setFormData] =
    useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
```

```typescript
// filepath: src/app/profile/change-password/page.tsx
// useMutation でAPI呼び出し
  const changePassword =
    api.user.changePassword.useMutation({
      onSuccess: () => {
        toast.success(
          'パスワードを変更しました'
        );
        router.push('/profile');
      },
      onError: (error) => {
        toast.error(
          error.message
          || 'パスワードの変更に'
          + '失敗しました'
        );
      },
    });
```

```typescript
// filepath: src/app/profile/change-password/page.tsx
// handleChange で入力値を更新
const handleChange = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));
};
```

```typescript
// filepath: src/app/profile/change-password/page.tsx
// ページの外枠
<AppLayout>
  <div className="container mx-auto
    max-w-md mt-8 mb-8">
    <Card>
      <CardHeader>
        <CardTitle>
          パスワード変更
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}
          className="space-y-6">
```

✅ **確認ポイント**:
- ページの外枠を書いた

`<form>` タグの中に、以下の入力フィールドを
順番に配置していきます。

```typescript
// filepath: src/app/profile/change-password/page.tsx
// 現在のパスワード入力
<div className="space-y-2">
  <Label htmlFor="currentPassword">
    現在のパスワード
    <span className="text-destructive">
      *
    </span>
  </Label>
  <PasswordInput
    id="currentPassword"
    name="currentPassword"
    value={formData.currentPassword}
    onChange={handleChange}
    required
    disabled={changePassword.isPending}
  />
</div>
```

✅ **確認ポイント**:
- 目のアイコンで表示/非表示が切り替わる

```typescript
// filepath: src/app/profile/change-password/page.tsx
// 新しいパスワード入力
<div className="space-y-2">
  <Label htmlFor="newPassword">
    新しいパスワード
    <span className="text-destructive">
      *
    </span>
  </Label>
  <PasswordInput
    id="newPassword"
    name="newPassword"
    value={formData.newPassword}
    onChange={handleChange}
    required
    disabled={changePassword.isPending}
  />
  <p className="text-sm
    text-muted-foreground">
    8文字以上で入力してください
  </p>
</div>
```

✅ **確認ポイント**:
- ヒントテキストが表示される

```typescript
// filepath: src/app/profile/change-password/page.tsx
// 確認用パスワード入力
<div className="space-y-2">
  <Label htmlFor="confirmPassword">
    新しいパスワード（確認）
    <span className="text-destructive">
      *
    </span>
  </Label>
  <PasswordInput
    id="confirmPassword"
    name="confirmPassword"
    value={formData.confirmPassword}
    onChange={handleChange}
    required
    disabled={changePassword.isPending}
  />
```

✅ **確認ポイント**:
- 3つの入力欄が表示される

確認パスワードの不一致をリアルタイムで表示します。

```typescript
// filepath: src/app/profile/change-password/page.tsx
  {/* リアルタイム不一致表示 */}
  {formData.confirmPassword !== '' &&
    formData.newPassword
      !== formData.confirmPassword && (
      <p className="text-sm
        text-destructive">
        パスワードが一致しません
      </p>
    )}
</div>
```

> 💡 `PasswordInput` コンポーネントが
> Eye/EyeOff アイコンを内蔵しているため、
> ページ側で表示切替ロジックを書く必要が
> ありません。再利用可能なコンポーネントの
> メリットです。

✅ **確認ポイント**:
- フォームに入力できる
- 目のアイコンでパスワードの表示/非表示が切り替わる
- 確認パスワードが不一致の時に赤いテキストが出る

📸 スクリーンショット: パスワード変更フォームの表示を確認してください。

---

### Step 7: バリデーションとエラー処理（5分）

🎯 **ゴール**: パスワードのバリデーションと
エラー時のフィードバックを実装します。

💻 **実装**:

```typescript
// filepath: src/app/profile/change-password/page.tsx
// handleSubmit でバリデーション
const handleSubmit = async (
  e: React.FormEvent
) => {
  e.preventDefault();

  if (formData.newPassword.length < 8) {
    toast.error(
      '新しいパスワードは'
      + '8文字以上で入力してください'
    );
    return;
  }

  if (formData.newPassword
      !== formData.confirmPassword) {
    toast.error('パスワードが一致しません');
    return;
  }
```

バリデーション通過後はAPIを呼び出します。

```typescript
// filepath: src/app/profile/change-password/page.tsx
  changePassword.mutate({
    currentPassword:
      formData.currentPassword,
    newPassword: formData.newPassword,
  });
};
```

```typescript
// filepath: src/app/profile/change-password/page.tsx
// APIエラーのAlert表示
{changePassword.error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>エラー</AlertTitle>
    <AlertDescription>
      {changePassword.error.message}
    </AlertDescription>
  </Alert>
)}
```

```typescript
// filepath: src/app/profile/change-password/page.tsx
// 送信ボタンとキャンセルボタン
<div className="flex gap-2 pt-2">
  <Button type="submit"
    className="w-full"
    disabled={
      changePassword.isPending
    }>
    {changePassword.isPending
      ? '変更中...' : '変更'}
  </Button>
  <Button type="button"
    variant="outline"
    className="w-full"
    onClick={() =>
      router.push('/profile')
    }
    disabled={
      changePassword.isPending
    }>
    キャンセル
  </Button>
</div>
```

✅ **確認ポイント**:
- 8文字未満でエラーが出る
- 不一致でエラーが出る
- 成功時に /profile へ戻る

#### バリデーションルール

| チェック | 条件 | メッセージ |
|---------|------|-----------|
| 文字数 | newPassword.length < 8 | 8文字以上で入力 |
| 一致確認 | newPassword !== confirmPassword | パスワードが一致しません |

#### toast の使い分け

| メソッド | 用途 | 表示色 |
|---------|------|--------|
| toast.success | 成功メッセージ | 緑 |
| toast.error | エラーメッセージ | 赤 |

> 💡 `toast` は画面の隅に一時的に
> 表示される通知メッセージです。
> `alert()` と違い、ユーザーの操作を
> ブロックしません。


---

### Step 8: 動作確認（3分）

🎯 **ゴール**: プロフィールページと
パスワード変更の全体を確認します。

```bash
# filepath: ターミナル
# 開発サーバーを起動して動作確認
npm run dev
```

1. `/profile` にアクセス
2. アバターと名前が表示される
3. メールアドレスと日付が表示される
4. 「プロフィール編集」ボタンで遷移
5. 「パスワード変更」ボタンで遷移
6. パスワード変更フォームに入力
7. 短いパスワードでエラーを確認
8. 正しいパスワードで変更成功を確認

✅ **確認ポイント**:
- プロフィール情報が正しく表示される
- パスワード変更のフローが完了する

📸 スクリーンショット: パスワード変更成功の表示を確認してください。

> 🎉 ここまでで、プロフィール表示と
> パスワード変更の2ページが完成しました！
> 残りはプロフィール編集ページだけです。
> あと少しで今日のゴールに到達します。

---

### Step 9: 編集ページの設計を理解しよう（3分）

🎯 **ゴール**: プロフィール編集ページの
データフローと使用コンポーネントを理解します。

パスワード変更ページより入力項目が多いので、
まず全体像を把握してから実装に入りましょう。

```bash
# filepath: ターミナル
# 編集ページのファイルを確認
ls src/app/profile/edit/
```

#### 編集ページのデータフロー

```mermaid
flowchart LR
    A[getCurrentUser] --> B[useEffect]
    B --> C[formData に初期値セット]
    C --> D[フォーム入力]
    D --> E[updateProfile.mutate]
    E --> F[toast で結果通知]
    F --> G[/profile に戻る]
```

#### フォーム項目一覧

| フィールド | 必須 | 説明 |
|-----------|------|------|
| 名前 | ✅ | 表示名 |
| メールアドレス | ✅ | ログイン用。重複チェックあり |
| アバターURL | - | 画像URL（任意） |

#### 使用する shadcn/ui コンポーネント

| コンポーネント | 用途 |
|--------------|------|
| Card | フォーム全体を囲む枠 |
| Input | テキスト入力欄 |
| Label | 入力欄のラベル |
| Avatar | アバター画像の表示 |
| Button | 送信・キャンセルボタン |
| Alert | エラーメッセージの表示 |
| PageLoadingSpinner | ローディング表示 |

#### useEffect の役割

| 処理 | タイミング | 目的 |
|------|-----------|------|
| getCurrentUser でデータ取得 | ページ表示時 | サーバーから最新情報を取得 |
| useEffect で formData にセット | データ取得完了時 | フォームに既存値を表示 |
| handleChange で formData 更新 | 入力変更時 | ユーザーの入力を反映 |
| updateProfile.mutate で送信 | フォーム送信時 | サーバーに更新を依頼 |

> 💡 `useEffect` はサーバーから取得した
> データでフォームの初期値をセットする
> ために使います。これがないと
> フォームが空の状態で表示されます。

✅ **確認ポイント**:
- 編集ページのデータフローを理解した
- useEffect が初期値セットに使われることを理解した

---

### Step 10: 編集フォームを実装しよう（7分）

🎯 **ゴール**: プロフィール編集ページの
全コードを実装します。

💻 **実装**:

まず、ファイルの先頭部分を書きます。

```typescript
// filepath: src/app/profile/edit/page.tsx
'use client';

import { AlertCircle }
  from 'lucide-react';
import { useRouter }
  from 'next/navigation';
import { useEffect, useState }
  from 'react';
import toast from 'react-hot-toast';
import { AppLayout }
  from '@/component/layout/app-layout';
import {
  Alert, AlertDescription,
  AlertTitle,
} from '@/component/ui/alert';
```

✅ **確認ポイント**:
- 外部ライブラリのインポートを書いた

残りの UI コンポーネントをインポートします。

```typescript
// filepath: src/app/profile/edit/page.tsx
// UIコンポーネントのインポート
import {
  Avatar, AvatarFallback,
  AvatarImage,
} from '@/component/ui/avatar';
import { Button }
  from '@/component/ui/button';
import {
  Card, CardContent,
  CardHeader, CardTitle,
} from '@/component/ui/card';
import { Input }
  from '@/component/ui/input';
import { Label }
  from '@/component/ui/label';
import { PageLoadingSpinner }
  from '@/component/ui/loading-spinner';
import { api } from '@/trpc/react';
```

✅ **確認ポイント**:
- shadcn/ui のコンポーネントをインポートしている
- tRPC の api をインポートしている

コンポーネントの定義とフォームの状態管理です。

```typescript
// filepath: src/app/profile/edit/page.tsx
// コンポーネント定義と状態管理
export default function ProfileEditPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
  });
```

✅ **確認ポイント**:
- formData に3つのフィールドがある

データ取得と更新APIの設定です。

```typescript
// filepath: src/app/profile/edit/page.tsx
  // サーバーからユーザー情報を取得
  const { data: currentUser, isLoading } =
    api.auth.getCurrentUser.useQuery();

  // プロフィール更新APIの設定
  const updateProfile =
    api.user.updateProfile.useMutation({
      onSuccess: () => {
        toast.success(
          'プロフィールを更新しました'
        );
        router.push('/profile');
      },
      onError: (error) => {
        toast.error(
          error.message ||
            'プロフィールの更新に失敗しました'
        );
      },
    });
```

✅ **確認ポイント**:
- useQuery でデータを取得している
- useMutation で更新APIを設定している

サーバーデータでフォームを初期化します。

```typescript
// filepath: src/app/profile/edit/page.tsx
  // サーバーデータでフォームを初期化
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        avatar: currentUser.avatar || '',
      });
    }
  }, [currentUser]);
```

✅ **確認ポイント**:
- useEffect でフォーム初期値をセットしている

フォーム送信と入力変更のハンドラーです。

```typescript
// filepath: src/app/profile/edit/page.tsx
  // フォーム送信処理
  const handleSubmit =
    async (e: React.FormEvent) => {
      e.preventDefault();
      updateProfile.mutate(formData);
    };

  // 入力変更時の処理
  const handleChange =
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    };
```

✅ **確認ポイント**:
- handleSubmit で mutate を呼んでいる
- handleChange で動的にフィールドを更新している

ローディング表示とJSXの開始部分です。

```typescript
// filepath: src/app/profile/edit/page.tsx
  // ローディング中の表示
  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <AppLayout>
      <div className="container mx-auto
        max-w-md mt-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>
              プロフィール編集
            </CardTitle>
          </CardHeader>
          <CardContent>
```

✅ **確認ポイント**:
- ローディング中は PageLoadingSpinner を表示

フォームとアバター表示の部分です。

```typescript
// filepath: src/app/profile/edit/page.tsx
// フォームとアバタープレビュー
            <form onSubmit={handleSubmit}
              className="space-y-6">
              {/* アバターのプレビュー表示 */}
              <div className=
                "flex justify-center mb-6">
                <Avatar
                  className="w-24 h-24">
                  <AvatarImage
                    src={formData.avatar} />
                  <AvatarFallback
                    className="text-2xl">
                    {formData.name?.[0]
                      ?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
```

✅ **確認ポイント**:
- Avatar でアバター画像を表示している

名前の入力欄です。

```typescript
// filepath: src/app/profile/edit/page.tsx
// 名前の入力欄（必須）
              <div className="space-y-2">
                <Label htmlFor="name">
                  名前
                  <span
                    className="text-destructive">
                    *
                  </span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={
                    updateProfile.isPending}
                />
              </div>
```

✅ **確認ポイント**:
- required で必須入力にしている
- isPending 中は入力を無効化している

メールアドレスの入力欄です。

```typescript
// filepath: src/app/profile/edit/page.tsx
// メールアドレスの入力欄（必須）
              <div className="space-y-2">
                <Label htmlFor="email">
                  メールアドレス
                  <span
                    className="text-destructive">
                    *
                  </span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={
                    updateProfile.isPending}
                />
              </div>
```

✅ **確認ポイント**:
- type="email" でメール形式を検証している

アバターURLの入力欄です。

```typescript
// filepath: src/app/profile/edit/page.tsx
// アバターURLの入力欄（任意）
              <div className="space-y-2">
                <Label htmlFor="avatar">
                  アバターURL（任意）
                </Label>
                <Input
                  id="avatar"
                  name="avatar"
                  type="url"
                  value={formData.avatar}
                  onChange={handleChange}
                  disabled={
                    updateProfile.isPending}
                  placeholder=
                    "https://example.com/
                      avatar.png"
                />
                <p className="text-sm
                  text-muted-foreground">
                  画像のURLを入力してください
                </p>
              </div>
```

✅ **確認ポイント**:
- アバターは任意なので required がない
- placeholder でURLの例を表示している

エラー表示の部分です。

```typescript
// filepath: src/app/profile/edit/page.tsx
// APIエラーの表示
              {updateProfile.error && (
                <Alert
                  variant="destructive">
                  <AlertCircle
                    className="h-4 w-4" />
                  <AlertTitle>
                    エラー
                  </AlertTitle>
                  <AlertDescription>
                    {updateProfile
                      .error.message}
                  </AlertDescription>
                </Alert>
              )}
```

✅ **確認ポイント**:
- エラー時に Alert が表示される

送信・キャンセルボタンです。

```typescript
// filepath: src/app/profile/edit/page.tsx
// 送信・キャンセルボタン
              <div className=
                "flex gap-2 pt-2">
                <Button type="submit"
                  className="w-full"
                  disabled={
                    updateProfile.isPending}>
                  {updateProfile.isPending
                    ? '更新中...' : '更新'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    router.push('/profile')}
                  disabled={
                    updateProfile.isPending
                  }>
                  キャンセル
                </Button>
              </div>
```

✅ **確認ポイント**:
- isPending 中はボタンが無効化される

最後に閉じタグです。

```typescript
// filepath: src/app/profile/edit/page.tsx
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
```

✅ **確認ポイント**:
- ファイルを保存した
- `npm run dev` でエラーが出ていない

---

### Step 11: 編集の動作確認（3分）

🎯 **ゴール**: プロフィール編集が
正しく動作することを確認します。

```bash
# filepath: ターミナル
# 開発サーバーを起動して動作確認
npm run dev
```

1. `/profile` にアクセス
2. 「プロフィール編集」ボタンをクリック
3. `/profile/edit` に遷移する
4. 名前を変更して「更新」をクリック
5. toast で「プロフィールを更新しました」と表示される
6. `/profile` に戻り、変更が反映されている

📸 スクリーンショット: プロフィール編集フォームの表示を確認してください。

#### エラーシナリオ

| エラー | 原因 | 対処法 |
|--------|------|--------|
| 名前が空で更新できない | required 属性 | 名前を入力する |
| メール重複エラー | 既に使われているメール | 別のアドレスを入力 |
| アバターが表示されない | URLが不正 | https:// で始まるURLを入力 |
| サーバーエラー | API通信失敗 | 開発サーバーの起動を確認 |

✅ **確認ポイント**:
- 名前の変更が保存される
- toast でフィードバックが表示される
- 更新後に /profile に戻る

## 📋 今日のまとめ

- [ ] api.auth.getCurrentUser でデータを取得した
- [ ] プロフィール情報をCard内に表示した
- [ ] パスワード変更フォームを実装した
- [ ] バリデーションと toast を実装した
- [ ] プロフィール編集フォームを実装した
- [ ] updateProfile で名前・メール・アバターを更新した

## ⚠️ つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| プロフィールが空 | currentUser が null | ローディングチェック追加 |
| 日付がInvalid Date | Date変換の引数不正 | new Date() で変換 |
| toast が表示されない | react-hot-toast 未設定 | Toaster コンポーネント確認 |
| 変更後に戻らない | router.push 忘れ | onSuccess 内に追加 |
| 編集が反映されない | useEffectの依存配列 | [currentUser] を指定 |
| メール重複エラー | 既に使われているメール | 別のアドレスを入力 |
| アバターが表示されない | URLが不正 | https:// で始まるURLを入力 |

## 📝 今日学んだ用語

| 用語 | 意味 |
|------|------|
| changePassword | パスワード変更API |
| toast.success | 成功通知を表示する関数 |
| Separator | セクション間の区切り線 |
| isPending | API通信中かどうかのフラグ |
| updateProfile | プロフィール更新API |

## 🔜 次回予告

Day 26 では、エラーページ（error.tsx）の
仕組みを確認し、意図的にバグを仕込んで
DevTools で自力修正するデバッグ演習を行います。
