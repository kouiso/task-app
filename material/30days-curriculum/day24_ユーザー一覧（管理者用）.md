# Day 24: ユーザー一覧（管理者用）を作ろう

## 🎯 今日のゴール

管理者だけがアクセスできるユーザー管理ページを
実装します。ユーザー一覧をテーブルで表示し、
詳細画面や編集画面へ遷移できるようにします。

![ユーザー管理ページ全体](./screenshots/user-list.png)

## 🤔 なぜこれを作るのか？

チームメンバーの情報を管理者が一覧で
確認・管理するための画面です。

> 💡 **例え話**: ユーザー管理は
> 「学校の出席簿」です。
> 先生（管理者）だけが出席簿を開いて、
> 生徒（ユーザー）の名前や出席状況を
> 確認できます。
> 生徒には出席簿を見る権限がありません。

### 📐 ユーザー管理ページのフロー

```mermaid
graph TD
    A[ユーザー管理ページ] --> B{管理者？}
    B -->|はい| C[api.user.getAll]
    B -->|いいえ| D[権限エラー表示]
    C --> E[ユーザー一覧テーブル]
    E --> F[詳細ボタン]
    E --> G[編集ボタン]
    F --> H[/user/ユーザーID]
    G --> I[/user/ユーザーID/edit]

    style A fill:#e3f2fd
    style B fill:#fff3e0
    style E fill:#e8f5e9
    style D fill:#ffebee
```

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| 管理者権限チェック | ロール変更機能 |
| ユーザー一覧テーブル | アカウント作成 |
| アバター・バッジ表示 | パスワードリセット |
| 詳細・編集へのリンク | ユーザー削除 |

### 🆕 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| getCurrentUser | — | ログイン中ユーザー取得 | 自分の学生証を見る |
| role チェック | ロール | 権限による制御 | 先生か生徒かの判定 |
| Avatar | アバター | ユーザーアイコン | プロフィール写真 |
| Badge | バッジ | 状態ラベル | 名札のシール |

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | 使用するAPIの確認 | 3分 |
| Step 2 | ページの土台を作る | 3分 |
| Step 3 | 管理者権限チェック | 5分 |
| Step 4 | ユーザー一覧テーブルの表示 | 5分 |
| Step 5 | アバターとバッジの表示 | 5分 |
| Step 6 | アクションボタンの追加 | 5分 |
| Step 7 | 詳細・編集への遷移 | 3分 |
| Step 8 | 動作確認 | 3分 |

**合計時間**: 約32分

---

### Step 1: 使用するAPIの確認（3分）

🎯 **ゴール**: ユーザー管理に使う2つの
APIを理解します。

```bash
# filepath: ターミナル
# ユーザー管理用APIを確認
cat src/server/router/user.ts | head -30
```

✅ **確認ポイント**:
- 2つのAPIの役割を理解した
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
| role | string | ADMIN または USER |
| isActive | boolean | アカウント有効/無効 |

> 💡 `api.auth.getCurrentUser` で自分の
> ロールを確認し、ADMIN でなければ
> アクセスを拒否します。

✅ **確認ポイント**:
- 2つのAPIの役割を理解した

---

### Step 2: ページの土台を作る（3分）

🎯 **ゴール**: ユーザー管理ページの
基本構造を作ります。

💻 **実装**:

```typescript
// filepath: src/app/user/page.tsx
'use client';

import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Eye, Pencil, Shield, User,
} from 'lucide-react';
import { useRouter }
  from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { AppLayout }
  from '@/component/layout/app-layout';
import {
  Avatar, AvatarFallback, AvatarImage,
} from '@/component/ui/avatar';
```

残りのコンポーネントをインポートします。

```typescript
// filepath: src/app/user/page.tsx
import { Badge }
  from '@/component/ui/badge';
import { Button }
  from '@/component/ui/button';
import {
  Card, CardContent,
} from '@/component/ui/card';
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/component/ui/table';
import { api } from '@/trpc/react';
```

```typescript
// filepath: src/app/user/page.tsx
// データ取得
export default function UsersPage() {
  const router = useRouter();

  const { data: currentUser } =
    api.auth.getCurrentUser.useQuery();

  const {
    data: users,
    isLoading,
    error,
  } = api.user.getAll.useQuery();
```

エラー時のリダイレクト処理を追加します。

```typescript
// filepath: src/app/user/page.tsx
  useEffect(() => {
    if (error) {
      toast.error(
        error.message
        || 'ユーザー一覧の取得に失敗しました'
      );
      if (error.message
          .includes('管理者権限')) {
        router.push('/dashboard');
      }
    }
  }, [error, router]);
```

```typescript
// filepath: src/app/user/page.tsx
// ローディング表示
  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto
          max-w-6xl mt-8
          flex justify-center">
          <div className="animate-spin
            rounded-full h-8 w-8
            border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }
```

> 💡 `AppLayout` で囲むことで、
> サイドバーやヘッダーが自動的に
> 表示されます。

✅ **確認ポイント**:
- `/user` にアクセスしてスピナーが出る

---

### Step 3: 管理者権限チェック（5分）

🎯 **ゴール**: ADMIN 以外のユーザーに
アクセス拒否画面を表示します。

💻 **実装**:

```typescript
// filepath: src/app/user/page.tsx
// 管理者チェック（isLoading の後に追加）
if (currentUser?.role !== 'ADMIN') {
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

✅ **確認ポイント**:
- 一般ユーザーでアクセスすると拒否される
- 管理者でアクセスすると一覧が見える

![権限エラー画面](./screenshots/user-list.png)

#### 権限チェックの判定ロジック

| 条件 | 結果 | 表示 |
|------|------|------|
| role === 'ADMIN' | アクセス許可 | ユーザー一覧 |
| role === 'USER' | アクセス拒否 | エラーカード |
| currentUser が null | アクセス拒否 | エラーカード |

> 💡 `currentUser?.role !== 'ADMIN'` は
> currentUser が null の場合も `true` に
> なるので、未ログインユーザーも拒否できます。

✅ **確認ポイント**:
- 一般ユーザーでアクセスすると拒否される
- 管理者でアクセスすると一覧が見える

![権限エラー画面](./screenshots/user-list.png)

---

### Step 4: ユーザー一覧テーブルの表示（5分）

🎯 **ゴール**: テーブルでユーザーの
基本情報を一覧表示します。

💻 **実装**:

```typescript
// filepath: src/app/user/page.tsx
// テーブルの外枠
<Card>
  <CardContent className="p-0">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ユーザー</TableHead>
          <TableHead>
            メールアドレス
          </TableHead>
          <TableHead>ロール</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>登録日</TableHead>
          <TableHead
            className="text-right">
            アクション
          </TableHead>
        </TableRow>
      </TableHeader>
    </Table>
  </CardContent>
</Card>
```

```typescript
// filepath: src/app/user/page.tsx
// テーブル本体（名前・メール）
<TableBody>
  {users?.map((user) => (
    <TableRow key={user.id}>
      <TableCell>
        <div className="flex
          items-center gap-3">
          <span className="font-medium">
            {user.name}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {user.email}
      </TableCell>
```

```typescript
// filepath: src/app/user/page.tsx
// テーブル本体（ロール・ステータス・日付）
      <TableCell>
        {user.role}
      </TableCell>
      <TableCell>
        {user.isActive
          ? 'アクティブ' : '無効'}
      </TableCell>
      <TableCell>
        {user.createdAt
          ? format(
              new Date(user.createdAt),
              'yyyy/MM/dd',
              { locale: ja })
          : '-'}
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

> 💡 `format` は `date-fns` の関数です。
> `ja` ロケールを渡すと日本語の
> 日付形式で表示されます。

✅ **確認ポイント**:
- ユーザーがテーブルに一覧表示される
- 登録日が yyyy/MM/dd 形式で表示される

---

### Step 5: アバターとバッジの表示（5分）

🎯 **ゴール**: アバター画像とロール・
ステータスのバッジを追加します。

💻 **実装**:

```typescript
// filepath: src/app/user/page.tsx
// アバター付きユーザー名セル
<TableCell>
  <div className="flex
    items-center gap-3">
    <Avatar className="h-9 w-9">
      <AvatarImage
        src={user.avatar || ''}
        alt={user.name || ''} />
      <AvatarFallback>
        {user.name?.[0]?.toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <span className="font-medium">
      {user.name}
    </span>
  </div>
</TableCell>
```

```typescript
// filepath: src/app/user/page.tsx
// ロールバッジ
<TableCell>
  {user.role === 'ADMIN' ? (
    <Badge variant="secondary"
      className="gap-1">
      <Shield className="h-3 w-3" />
      管理者
    </Badge>
  ) : (
    <Badge variant="outline"
      className="gap-1">
      <User className="h-3 w-3" />
      ユーザー
    </Badge>
  )}
</TableCell>
```

```typescript
// filepath: src/app/user/page.tsx
// ステータスバッジ
<TableCell>
  {user.isActive ? (
    <Badge variant="outline"
      className="bg-green-500/10
        text-green-700
        border-green-200">
      アクティブ
    </Badge>
  ) : (
    <Badge variant="outline"
      className="bg-gray-500/10
        text-gray-700
        border-gray-200">
      無効
    </Badge>
  )}
</TableCell>
```

✅ **確認ポイント**:
- アバターが表示される
- ロールとステータスのバッジが色分けされる

![アバターとバッジ](./screenshots/user-list.png)

#### バッジのバリエーション

| ロール | variant | アイコン | 表示テキスト |
|--------|---------|---------|------------|
| ADMIN | secondary | Shield | 管理者 |
| USER | outline | User | ユーザー |

| ステータス | 背景色 | テキスト色 | 表示テキスト |
|-----------|--------|-----------|------------|
| アクティブ | green-500/10 | green-700 | アクティブ |
| 無効 | gray-500/10 | gray-700 | 無効 |

> 💡 `AvatarFallback` にはユーザー名の
> 頭文字を大文字で表示します。画像がない
> ユーザーでもアイコンが表示されます。

✅ **確認ポイント**:
- アバターが表示される
- ロールとステータスのバッジが色分けされる

![アバターとバッジ](./screenshots/user-list.png)

---

### Step 6: アクションボタンの追加（5分）

🎯 **ゴール**: 各行に詳細と編集の
ボタンを追加します。

💻 **実装**:

```typescript
// filepath: src/app/user/page.tsx
// 詳細ボタン
<TableCell className="text-right">
  <div className="flex
    justify-end gap-2">
    <Button variant="ghost"
      size="icon"
      onClick={() =>
        router.push(
          `/user/${user.id}`)
      }
      title="詳細">
      <Eye className="h-4 w-4" />
    </Button>
```

```typescript
// filepath: src/app/user/page.tsx
// 編集ボタン
    <Button variant="ghost"
      size="icon"
      onClick={() =>
        router.push(
          `/user/${user.id}/edit`)
      }
      title="編集">
      <Pencil className="h-4 w-4" />
    </Button>
  </div>
</TableCell>
```

✅ **確認ポイント**:
- 各行に2つのボタンが表示される
- ホバーで背景色が変わる

#### アクションボタンの仕様

| ボタン | アイコン | 遷移先 | 用途 |
|-------|---------|--------|------|
| 詳細 | Eye | /user/ユーザーID | 情報閲覧 |
| 編集 | Pencil | /user/ユーザーID/edit | 情報編集 |

> 💡 `variant="ghost"` は背景色なしの
> ボタンです。テーブル内では控えめな
> デザインが適しています。
> `size="icon"` でアイコンサイズになります。

✅ **確認ポイント**:
- 各行に2つのボタンが表示される
- ホバーで背景色が変わる

---

### Step 7: 詳細・編集への遷移（3分）

🎯 **ゴール**: ボタンクリックで
正しいページに遷移することを確認します。

```bash
# filepath: ターミナル
# ユーザー詳細ページへの遷移を確認
npm run dev
```

✅ **確認ポイント**:
- 詳細ボタンで /user/{id} に遷移する
- 編集ボタンで /user/{id}/edit に遷移する
#### 遷移先のURL構造

| ボタン | URL パターン | 例 |
|-------|-------------|-----|
| 詳細 | /user/{id} | /user/abc123 |
| 編集 | /user/{id}/edit | /user/abc123/edit |

> 💡 `router.push` でクライアント側の
> ページ遷移を行います。URLに動的な
> ユーザーIDを埋め込みます。

✅ **確認ポイント**:
- 詳細ボタンで /user/{id} に遷移する
- 編集ボタンで /user/{id}/edit に遷移する

---

### Step 8: 動作確認（3分）

🎯 **ゴール**: ユーザー管理ページの
全体を確認します。

1. 管理者でログインする
2. `/user` にアクセスする
3. ユーザー一覧がテーブルで表示される
4. アバターと名前が表示される
5. ロールバッジが正しく色分けされる
6. ステータスバッジが正しい
7. 詳細ボタンで遷移を確認
8. 一般ユーザーでアクセスし拒否を確認

✅ **確認ポイント**:
- 管理者のみアクセスできる
- 全ユーザーがテーブルに表示される

![完成したユーザー管理ページ](./screenshots/user-list.png)

---

```bash
# filepath: ターミナル
# 開発サーバーを起動して動作確認
npm run dev
```

## 📋 今日のまとめ

- [ ] api.auth.getCurrentUser で権限チェックした
- [ ] api.user.getAll でユーザー一覧を取得した
- [ ] Avatar と Badge でユーザー情報を表示した
- [ ] アクションボタンで詳細・編集に遷移できた

## ⚠️ つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| 一般ユーザーで表示される | 権限チェック漏れ | role !== 'ADMIN' を追加 |
| アバターが空白 | avatar が null | AvatarFallback で頭文字表示 |
| 日付がInvalid Date | createdAt が undefined | 三項演算子で '-' を表示 |
| ボタンが押せない | onClick 未設定 | router.push を追加 |

## 📝 今日学んだ用語

| 用語 | 意味 |
|------|------|
| getCurrentUser | ログイン中ユーザーの情報取得 |
| role チェック | ADMIN/USER による権限制御 |
| Avatar | ユーザーアイコンコンポーネント |
| variant="ghost" | 背景なしの控えめなボタン |

## 🔜 次回予告

Day 25 では、プロフィールページと
パスワード変更機能を実装します。
自分の情報を確認・変更できるようにします。
