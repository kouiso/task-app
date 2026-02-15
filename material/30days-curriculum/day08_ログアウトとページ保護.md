# Day 08: ログアウトとページ保護を実装しよう

## 🎯 今日のゴール

ログアウト機能と、未ログインユーザーを自動でログイン画面にリダイレクトする「認証ガード」の仕組みを理解します。AppLayout コンポーネントがどのようにページ全体を保護しているかを学びます。

【スクリーンショット: サイドバー付きのAppLayout画面】

## 🤔 なぜこれを作るのか？

ログインできたら、ログアウトも必要です。それだけでなく、ログインしていない人がダッシュボードや設定画面を見れてしまっては困ります。

> 💡 **例え話**: AppLayout は建物の「入口ゲート」です。リストバンド（JWT）を持っていない人はゲートで止められ、受付（ログイン画面）に案内されます。リストバンドを持っている人だけが、建物内のフロア（各ページ）に入れます。

### 📐 ページ保護の仕組み

```mermaid
graph TD
    A[ページにアクセス] --> B[AppLayoutが読み込まれる]
    B --> C[api.auth.getSession.useQuery]
    C --> D{セッションあり？}
    D -->|Yes| E[ページを表示]
    D -->|No| F[/loginにリダイレクト]
    E --> G[サイドバー＋コンテンツ表示]

    style A fill:#e3f2fd
    style D fill:#fff3e0
    style E fill:#e8f5e9
    style F fill:#ffebee
```

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| AppLayout の認証ガードを理解する | ミドルウェアを使った保護（この実装では不使用） |
| ログアウト処理（Cookie削除）を理解する | 外部ライブラリの認証 |
| ロールベースのメニュー表示を理解する | 権限管理システムの設計 |
| サイドバーナビゲーションの仕組みを読む | CSS デザインの変更 |

### 🆕 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| 認証ガード | にんしょう・ガード | 未ログインユーザーをリダイレクトする仕組み | 建物の入口ゲート。リストバンドチェック |
| useEffect | ユース・エフェクト | コンポーネント表示後に実行する処理 | ページが開いた直後の自動チェック |
| レイアウトコンポーネント | — | 複数ページに共通する外枠 | 建物の共通フロア（エレベーター・廊下） |

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | AppLayoutの全体構造を理解する | 5分 |
| Step 2 | 認証ガードの仕組みを読む | 7分 |
| Step 3 | ログアウト処理を理解する | 5分 |
| Step 4 | サイドバーメニューの構成を読む | 5分 |
| Step 5 | ロールベースのメニュー表示を理解する | 5分 |
| Step 6 | ログアウトボタンを理解する | 5分 |
| Step 7 | モバイル対応のサイドバーを理解する | 5分 |
| Step 8 | 動作確認 | 5分 |

**合計時間**: 約42分

---

### Step 1: AppLayoutの全体構造を理解する（5分）

🎯 **ゴール**: 各ページを包む共通レイアウトの構造を把握します。

> 💡 **例え話**: AppLayout は「建物の共通設備」です。エレベーター（サイドバー）、ヘッダー、フロアの枠組みが全部ここに入っています。各ページは、この建物の中の「部屋」に相当します。

💻 **コードを読む**:

```typescript
// filepath: src/component/layout/app-layout.tsx
// クライアントコンポーネント宣言とimport
'use client';

import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
```

続いて、AppLayoutコンポーネント本体を定義します。セッション取得とJSXの返却を行います。

```typescript
// filepath: src/component/layout/app-layout.tsx
// ページの外枠コンポーネント
export function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  // セッション情報を取得
  const { data: session, isLoading } =
    api.auth.getSession.useQuery();

  // ここに認証ガードが入る（Step 2で解説）

  return (
    <div className="flex min-h-screen">
      {/* サイドバー（Step 4で解説） */}
      <main>{children}</main>
    </div>
  );
}
```

#### AppLayoutの役割

| 機能 | 説明 |
|------|------|
| 認証ガード | 未ログインなら `/login` にリダイレクト |
| サイドバー | ナビゲーションメニューを表示 |
| ログアウト | セッション削除＋ログイン画面に遷移 |
| レスポンシブ | モバイルではハンバーガーメニュー |

✅ **確認ポイント**:
- `api.auth.getSession.useQuery()` でセッションを取得していることを確認した
- `children` で各ページのコンテンツを表示する仕組みを理解した

---

### Step 2: 認証ガードの仕組みを読む（7分）

🎯 **ゴール**: useEffect を使った認証チェックとリダイレクトの仕組みを理解します。

💻 **コードを読む**:

```typescript
// filepath: src/component/layout/app-layout.tsx
// 認証ガード（useEffect）
useEffect(() => {
  // ローディング完了かつセッションなし
  if (!isLoading && !session) {
    // ログイン画面にリダイレクト
    router.push('/login');
  }
}, [isLoading, session, router]);

// ローディング中は何も表示しない
if (isLoading) return null;
// セッションなしでも何も表示しない
if (!session?.user) return null;
```

> 💡 `useEffect` は「ページが表示された直後に実行する処理」です。ここでは「セッションの読み込みが終わったら、ログインしてるかチェックして、してなければ `/login` に飛ばす」という処理を行っています。

#### 認証ガードの動作フロー

| 状態 | `isLoading` | `session` | 表示 |
|------|-----------|---------|------|
| 読み込み中 | true | undefined | 何も表示しない（白画面） |
| 未ログイン | false | null | `/login` にリダイレクト |
| ログイン済み | false | `{user: {...}}` | ページを表示 |

✅ **確認ポイント**:
- 3つの状態（読み込み中・未ログイン・ログイン済み）を理解した
- 未ログインで `/login` にリダイレクトされることを確認した

---

### Step 3: ログアウト処理を理解する（5分）

🎯 **ゴール**: ログアウト時にセッションがどう削除されるか理解します。

💻 **コードを読む**:

```typescript
// filepath: src/component/layout/app-layout.tsx
// ログアウト処理
const logoutMutation =
  api.auth.logout.useMutation({
    onSuccess: () => {
      // ログイン画面に遷移
      router.push('/login');
      // サーバー状態を同期
      router.refresh();
    },
  });
```

サーバー側の処理も確認しましょう。

```typescript
// filepath: src/server/api/routers/auth.ts
// ログアウトプロシージャ
logout: publicProcedure
  .mutation(async () => {
    // Cookieを削除するだけ
    await deleteSession();
    return { success: true };
  }),
```

```typescript
// filepath: src/lib/session.ts
// Cookieを削除する関数
async function deleteSession()
  : Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
```

> 💡 ログアウトは「リストバンドを回収する」だけです。Cookie を削除すれば、次のリクエストでセッションが見つからなくなり、自動的にログイン画面にリダイレクトされます。

✅ **確認ポイント**:
- ログアウト = Cookie 削除であることを理解した
- `router.refresh()` でサーバー状態を同期することを確認した

---

### Step 4: サイドバーメニューの構成を読む（5分）

🎯 **ゴール**: ナビゲーションメニューの定義方法を理解します。

💻 **コードを読む**:

```typescript
// filepath: src/component/layout/app-layout.tsx
import {
  BarChart3, FolderKanban, Home,
  ListTodo, Search, Users,
} from 'lucide-react';

// メニュー項目の型定義
interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

// 基本メニュー項目
const baseMenuItems: MenuItem[] = [
  { text: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
    path: '/dashboard' },
  { text: 'Projects',
    icon: <FolderKanban className="h-5 w-5" />,
    path: '/project' },
];
```

> 💡 メニュー項目はオブジェクトの配列で定義されています。新しいメニューを追加するときは、この配列に要素を追加するだけです。

✅ **確認ポイント**:
- メニュー項目が配列で管理されていることを確認した
- 各項目に `text`, `icon`, `path` があることを理解した

---

### Step 5: ロールベースのメニュー表示を理解する（5分）

🎯 **ゴール**: 管理者だけに表示されるメニューの仕組みを理解します。

💻 **コードを読む**:

```typescript
// filepath: src/component/layout/app-layout.tsx
// ロールに応じたメニュー構築
const menuItems: MenuItem[] = [
  ...baseMenuItems,
  // ADMINロールの場合のみUsersを追加
  ...(session?.user?.role === 'ADMIN'
    ? [{
        text: 'Users',
        icon: <Users className="h-5 w-5" />,
        path: '/user',
      }]
    : []),
];
```

#### ロール別メニュー表示

| メニュー | USER | ADMIN |
|---------|------|-------|
| Dashboard | ✅ | ✅ |
| Projects | ✅ | ✅ |
| Tasks | ✅ | ✅ |
| My Tasks | ✅ | ✅ |
| Search | ✅ | ✅ |
| Reports | ✅ | ✅ |
| Users | ❌ | ✅ |

> 💡 スプレッド演算子 `...` と三項演算子 `? :` を組み合わせて、条件付きで配列に要素を追加しています。ADMIN でなければ空配列 `[]` が展開されるので、何も追加されません。

✅ **確認ポイント**:
- ADMIN のみ Users メニューが表示されることを理解した
- 一般ユーザーには Users メニューが見えないことを確認した

---

### Step 6: ログアウトボタンを理解する（5分）

🎯 **ゴール**: サイドバー下部のログアウトボタンの実装を理解します。

💻 **コードを読む**:

```typescript
// filepath: src/component/layout/app-layout.tsx
// サイドバー下部のユーザー情報＋ログアウト
<div className="border-t p-4">
  <div className="flex items-center gap-3">
    <Avatar className="h-8 w-8">
      <AvatarImage
        src={session.user.avatar || ''} />
      <AvatarFallback>
        {session.user.name?.[0]?.toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium
        truncate">
        {session.user.name}
      </p>
    </div>
    <Button
      variant="ghost" size="icon"
      onClick={() => logoutMutation.mutate()}>
      <LogOut className="h-4 w-4" />
    </Button>
  </div>
</div>
```

> 💡 `logoutMutation.mutate()` を呼ぶだけで、Step 3 で見た一連のログアウト処理（Cookie削除→リダイレクト→画面更新）が実行されます。

✅ **確認ポイント**:
- ログアウトボタンがサイドバー下部にあることを確認した
- アバターとユーザー名が表示されていることを確認した

---

### Step 7: モバイル対応のサイドバーを理解する（5分）

🎯 **ゴール**: レスポンシブ対応のサイドバーの仕組みを理解します。

💻 **コードを読む**:

```typescript
// filepath: src/component/layout/app-layout.tsx
// モバイル: Sheet（引き出しメニュー）を使用
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/component/ui/sheet';

// ハンバーガーメニューボタン
<SheetTrigger asChild>
  <Button variant="ghost" size="icon"
    className="md:hidden">
    <Menu className="h-5 w-5" />
  </Button>
</SheetTrigger>
```

#### レスポンシブ対応の仕組み

| 画面サイズ | サイドバー | 操作 |
|-----------|---------|------|
| デスクトップ（md以上） | 常に表示 | メニューをクリック |
| モバイル（md未満） | 非表示 | ハンバーガーメニューで開閉 |

> 💡 `md:hidden` は「画面幅が768px以上のとき非表示にする」という Tailwind CSS のクラスです。逆に、デスクトップ用のサイドバーには `hidden md:flex` を指定して、モバイルでは隠します。

✅ **確認ポイント**:
- デスクトップではサイドバーが常に表示されることを確認した
- モバイルではハンバーガーメニューに切り替わることを確認した

---

### Step 8: 動作確認（5分）

🎯 **ゴール**: 認証ガードとログアウトの動作を実際に確認します。

以下の手順で動作を確認してください。

1. ログイン状態で `/dashboard` にアクセスする
2. サイドバーが表示され、各メニューをクリックしてページ遷移できることを確認する
3. サイドバー下部のログアウトボタン（ドアアイコン）をクリックする
4. ログイン画面にリダイレクトされることを確認する
5. ログアウト後に `/dashboard` に直接アクセスする
6. ログイン画面にリダイレクトされること（認証ガード）を確認する

【スクリーンショット: ログアウト後にログイン画面にリダイレクトされる様子】

✅ **確認ポイント**:
- ログアウトで `/login` に戻る
- 未ログインで `/dashboard` にアクセスすると `/login` に飛ばされる
- ログイン後にサイドバーが表示される

---

## 📋 今日のまとめ

- [ ] AppLayout が全ページの外枠であることを理解した
- [ ] useEffect による認証ガードの仕組みを学んだ
- [ ] ログアウト = Cookie 削除であることを理解した
- [ ] ロールベースのメニュー表示を学んだ
- [ ] モバイル対応のサイドバーの仕組みを理解した

## ⚠️ つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| ログアウトしても画面が変わらない | `router.refresh()` の呼び忘れ | `onSuccess` で `router.refresh()` を追加 |
| 無限リダイレクトループ | ログインページにも AppLayout を使っている | ログインページは AppLayout で包まない |
| サイドバーが表示されない | セッションが null | ログインしてからアクセスする |
| Users メニューが見えない | USER ロールでログインしている | ADMIN アカウントでログインする |

## 📝 今日学んだ用語

| 用語 | 意味 |
|------|------|
| 認証ガード | 未ログインユーザーをリダイレクトする仕組み |
| AppLayout | 全ページに共通する外枠コンポーネント |
| useEffect | コンポーネント表示後に実行する副作用処理 |
| レイアウトコンポーネント | 複数ページに共通するUI構造 |
| Sheet | shadcn/ui の引き出し式パネル |
| ロールベース | ユーザーの権限に応じて表示を切り替える方式 |

## 🔗 次回予告

Day 09 では、プロジェクト一覧ページを作ります。tRPC の `useQuery` を使って、サーバーからデータを取得して画面に表示する方法を学びます。
