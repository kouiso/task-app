# Day 25: プロフィール編集を実装しよう

## 🎯 今日のゴール

プロフィール表示ページとパスワード変更ページを
実装します。自分の情報を確認し、
パスワードを安全に変更できるようにします。

【スクリーンショット: プロフィールページ全体】

## 🤔 なぜこれを作るのか？

ユーザーが自分の情報を確認し、
パスワードを管理するための画面です。

> 💡 **例え話**: プロフィールページは
> 「免許証の裏面」です。
> 表面（プロフィール表示）で自分の名前や
> 写真を確認し、裏面（パスワード変更）で
> 住所変更のように情報を更新できます。
> 免許証は本人しか変更できないのと同じく、
> プロフィールも本人だけが操作できます。

### 📐 プロフィール関連ページの構造

```mermaid
graph TD
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
| パスワード変更フォーム | メールアドレス変更 |
| バリデーション実装 | 二段階認証の設定 |
| toast でフィードバック | alert() の使用 |

### 🆕 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| changePassword | — | パスワード変更API | 暗証番号の変更 |
| toast | トースト | 通知メッセージ | ポップアップ通知 |
| Separator | セパレーター | 区切り線 | 書類の仕切り線 |
| formData | フォームデータ | 入力値の管理 | 申請書の記入欄 |

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

**合計時間**: 約32分

---

### Step 1: プロフィールページの概要（3分）

🎯 **ゴール**: プロフィールページに
表示する情報を理解します。

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

✅ **確認ポイント**:
- 表示する項目とボタンを理解した

---

### Step 2: ユーザーデータの取得（3分）

🎯 **ゴール**: getCurrentUser APIで
ログイン中のユーザー情報を取得します。

💻 **実装**:

```typescript
// filepath: src/app/profile/page.tsx
'use client';

import { AppLayout }
  from '@/component/layout/app-layout';
import {
  Avatar, AvatarFallback, AvatarImage,
} from '@/component/ui/avatar';
import { Badge }
  from '@/component/ui/badge';
import { Button }
  from '@/component/ui/button';
import {
  Card, CardContent,
  CardHeader, CardTitle,
} from '@/component/ui/card';
import { Separator }
  from '@/component/ui/separator';
```

```typescript
// filepath: src/app/profile/page.tsx
// 追加のインポート
import { api } from '@/trpc/react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Edit, Lock, Shield, User,
} from 'lucide-react';
import { useRouter }
  from 'next/navigation';
```

```typescript
// filepath: src/app/profile/page.tsx
// データ取得
export default function ProfilePage() {
  const router = useRouter();
  const {
    data: currentUser,
    isLoading,
  } = api.auth.getCurrentUser.useQuery();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto
          max-w-2xl mt-8
          flex justify-center">
          <div className="animate-spin
            rounded-full h-8 w-8
            border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }
```

```typescript
// filepath: src/app/profile/page.tsx
// 未ログインチェック
  if (!currentUser) {
    router.push('/login');
    return null;
  }
```

> 💡 `currentUser` が null の場合は
> ログインページにリダイレクトします。
> `return null` で何も表示しません。

✅ **確認ポイント**:
- currentUser にデータが入る
- 未ログインでリダイレクトされる

---

### Step 3: プロフィール情報の表示（5分）

🎯 **ゴール**: アバター、名前、バッジ、
詳細情報をCard内に表示します。

💻 **実装**:

```typescript
// filepath: src/app/profile/page.tsx
// Card の外枠
<Card>
  <CardHeader>
    <CardTitle>プロフィール</CardTitle>
  </CardHeader>
  <CardContent className="space-y-6">
    <div className="flex gap-4">
      {/* アバターと名前 */}
    </div>
  </CardContent>
</Card>
```

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
// ロールバッジ
<div className="flex gap-2 mt-2">
  {currentUser.role === 'ADMIN' && (
    <Badge variant="secondary"
      className="gap-1">
      <Shield className="w-3 h-3" />
      管理者
    </Badge>
  )}
```

```typescript
// filepath: src/app/profile/page.tsx
// ステータスバッジ
  {currentUser.isActive ? (
    <Badge variant="outline"
      className="gap-1
        bg-green-500/10 text-green-700
        border-green-200">
      <div className="w-2 h-2
        rounded-full bg-green-500" />
      アクティブ
    </Badge>
  ) : (
    <Badge variant="outline"
      className="gap-1
        bg-gray-500/10 text-gray-700
        border-gray-200">
      <div className="w-2 h-2
        rounded-full bg-gray-500" />
      無効
    </Badge>
  )}
</div>
```

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
      <User className="w-5 h-5
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
    <User className="w-5 h-5
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

> 💡 `Separator` は区切り線を表示する
> shadcn/ui のコンポーネントです。
> セクションを視覚的に分離します。

✅ **確認ポイント**:
- アバターと名前が表示される
- バッジが正しく色分けされる

【スクリーンショット: プロフィール情報表示】

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
  {currentUser.role === 'ADMIN' && (
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

#### ボタンのスタイル使い分け

| ボタン | variant | 理由 |
|-------|---------|------|
| プロフィール編集 | default（塗り） | メインアクション |
| パスワード変更 | outline（枠線） | サブアクション |
| ユーザー管理 | outline（枠線） | サブアクション |

> 💡 `currentUser.role === 'ADMIN'` で
> 条件付きレンダリングをしています。
> 管理者にだけ「ユーザー管理」ボタンが
> 表示されます。

✅ **確認ポイント**:
- 3つのボタンが縦に並ぶ
- 管理者にだけユーザー管理ボタンが出る

【スクリーンショット: ナビゲーションボタン】

---

### Step 5: パスワード変更ページの概要（3分）

🎯 **ゴール**: パスワード変更ページの
構成とAPIを理解します。

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

✅ **確認ポイント**:
- 3つの入力項目を理解した
- changePassword APIの役割を理解した

---

### Step 6: パスワード変更フォーム（5分）

🎯 **ゴール**: useState でフォームの
状態を管理し、APIを呼び出します。

💻 **実装**:

```typescript
// filepath: src/app/profile/change-password/page.tsx
'use client';

import { AppLayout }
  from '@/component/layout/app-layout';
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
import { api } from '@/trpc/react';
import { useRouter }
  from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
```

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
          {/* 入力フィールドをここに */}
        </form>
      </CardContent>
    </Card>
  </div>
</AppLayout>
```

```typescript
// filepath: src/app/profile/change-password/page.tsx
// 現在のパスワード入力フィールド
<div className="space-y-2">
  <Label htmlFor="currentPassword">
    現在のパスワード
    <span className="text-destructive">
      *
    </span>
  </Label>
  <Input
    id="currentPassword"
    name="currentPassword"
    type="password"
    value={formData.currentPassword}
    onChange={handleChange}
    required
    disabled={
      changePassword.isPending} />
</div>
```

> 💡 `useState` のオブジェクト形式で
> 3つの入力値をまとめて管理します。
> `handleChange` では `[name]: value` で
> 動的にプロパティを更新します。

✅ **確認ポイント**:
- フォームに入力できる
- 入力値が formData に反映される

【スクリーンショット: パスワード変更フォーム】

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
    toast.error(
      'パスワードが一致しません'
    );
    return;
  }

  changePassword.mutate(formData);
};
```

```typescript
// filepath: src/app/profile/change-password/page.tsx
// リアルタイム不一致表示
{formData.confirmPassword !== ''
  && formData.newPassword
    !== formData.confirmPassword && (
  <p className="text-sm
    text-destructive">
    パスワードが一致しません
  </p>
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

✅ **確認ポイント**:
- 8文字未満でエラーが出る
- 不一致でエラーが出る
- 成功時に /profile へ戻る

---

### Step 8: 動作確認（3分）

🎯 **ゴール**: プロフィールページと
パスワード変更の全体を確認します。

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

【スクリーンショット: パスワード変更成功】

---

## 📋 今日のまとめ

- [ ] api.auth.getCurrentUser でデータを取得した
- [ ] プロフィール情報をCard内に表示した
- [ ] パスワード変更フォームを実装した
- [ ] バリデーションと toast を実装した

## ⚠️ つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| プロフィールが空 | currentUser が null | ローディングチェック追加 |
| 日付がInvalid Date | Date変換の引数不正 | new Date() で変換 |
| toast が表示されない | react-hot-toast 未設定 | Toaster コンポーネント確認 |
| 変更後に戻らない | router.push 忘れ | onSuccess 内に追加 |

## 📝 今日学んだ用語

| 用語 | 意味 |
|------|------|
| changePassword | パスワード変更API |
| toast.success | 成功通知を表示する関数 |
| Separator | セクション間の区切り線 |
| isPending | API通信中かどうかのフラグ |

## 🔗 次回予告

Day 26 では、エラー対策とデバッグ方法を
学びます。Chrome DevTools の使い方や
よくあるエラーの解決方法を習得します。
