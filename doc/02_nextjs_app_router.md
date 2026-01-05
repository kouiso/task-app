# Day 02: Next.js App Routerの基礎

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **App Routerの仕組みを理解する** | ページ構成の設計 | ✅ ファイルベースルーティングを説明できる |
| **レイアウトとページの関係を理解する** | 共通UIの実装 | ✅ layout.tsxとpage.tsxの役割を説明できる |
| **Server/Client Componentを理解する** | パフォーマンス最適化 | ✅ 使い分けの基準を説明できる |

## 💼 なぜこれを学ぶのか?

Next.js 15のApp Routerは、Reactアプリケーションを構築する**最新のアプローチ**です。

- **ファイルベースルーティング**: フォルダ構造がそのままURLになるシンプルな設計
- **レイアウトの共有**: ヘッダーやサイドバーなど、共通UIを効率的に管理
- **パフォーマンス**: Server Componentにより、初期表示が高速

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | ルーティングの理解 | 2ステップ | 20分 |
| **Part 2** | レイアウトの実装 | 2ステップ | 25分 |
| **Part 3** | ホームページの作成 | 2ステップ | 15分 |
| **合計** | - | **6ステップ** | **約60分** |

---

## 実装内容

### Part 1: ルーティングの理解(20分)

#### Step 1.1: App Routerのフォルダ構造を理解する(所要時間:10分)

**このステップで学ぶこと**: Next.js App Routerのルーティング規則。

**なぜ必要?**: App Routerでは、`src/app`フォルダの構造がそのままURLのパスになります。これを「ファイルベースルーティング」と呼びます。本棚に例えると、フォルダが棚で、`page.tsx`が本です。棚の位置(パス)で本の場所(URL)が決まります。

**コードの仕組み解説**:
- `src/app/page.tsx` → `/`(トップページ)
- `src/app/dashboard/page.tsx` → `/dashboard`
- `src/app/task/page.tsx` → `/task`
- `src/app/task/[id]/page.tsx` → `/task/123`(動的ルート)

現在のTaskAppのフォルダ構造を確認してみましょう:

```
src/app/
├── page.tsx           # / (トップページ)
├── layout.tsx         # 全ページ共通のレイアウト
├── providers.tsx      # グローバルなProvider設定
├── globals.css        # グローバルスタイル
├── login/
│   └── page.tsx       # /login
├── register/
│   └── page.tsx       # /register
├── dashboard/
│   └── page.tsx       # /dashboard
├── task/
│   ├── page.tsx       # /task (タスク一覧)
│   └── [id]/
│       └── page.tsx   # /task/123 (タスク詳細)
├── project/
│   ├── page.tsx       # /project (プロジェクト一覧)
│   └── [id]/
│       └── page.tsx   # /project/abc (プロジェクト詳細)
└── api/
    └── trpc/
        └── [trpc]/
            └── route.ts  # tRPC APIエンドポイント
```

**確認方法**:
1. VS Codeで`src/app`フォルダを展開
2. 各フォルダとURLの対応を確認

---

#### Step 1.2: 特殊なファイルの役割を理解する(所要時間:10分)

**このステップで学ぶこと**: App Routerで使う特殊なファイル名の意味。

**なぜ必要?**: Next.jsには予約されたファイル名があり、それぞれ特定の役割を持っています。これを理解することで、適切なファイルに適切なコードを書けるようになります。

**コードの仕組み解説**:
- `page.tsx`: そのURLで表示されるメインコンテンツ
- `layout.tsx`: 子ページで共有されるUI(ヘッダー、サイドバーなど)
- `loading.tsx`: ページ読み込み中に表示されるUI
- `error.tsx`: エラー発生時に表示されるUI
- `not-found.tsx`: 404ページ
- `route.ts`: APIエンドポイント

**確認方法**:
1. `src/app/layout.tsx`を開いて中身を確認
2. `src/app/page.tsx`を開いて中身を確認

---

### Part 2: レイアウトの実装(25分)

#### Step 2.1: ルートレイアウトを確認する(所要時間:10分)

**このステップで学ぶこと**: アプリケーション全体に適用されるレイアウトの仕組み。

**なぜ必要?**: ルートレイアウト(`src/app/layout.tsx`)は、すべてのページで共有されるHTMLの骨格です。`<html>`タグと`<body>`タグはここでのみ定義します。家で例えると、基礎と柱の部分です。

**コードの仕組み解説**:
- `Metadata`: ページのタイトルや説明を設定
- `Inter`: Googleフォントの読み込み
- `Providers`: tRPC、MUI、認証などのグローバル設定
- `children`: 各ページのコンテンツが入る場所

以下のコードを確認してください(既存ファイル):

```typescript
// filepath: src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TaskApp - プロジェクト・タスク管理',
  description:
    'チームで使えるプロジェクト・タスク管理アプリケーション。プロジェクト管理、タスクトラッキング、進捗レポート機能を提供します。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**確認方法**:
1. ブラウザでページを開き、ソースを表示(Ctrl+U または Cmd+Option+U)
2. `<html lang="ja">`と`<title>`タグを確認

---

#### Step 2.2: Providersコンポーネントを確認する(所要時間:15分)

**このステップで学ぶこと**: グローバルな設定をまとめるProvidersパターン。

**なぜ必要?**: Reactでは、複数のProviderをネストして使うことが多いです。これを1つのコンポーネントにまとめることで、`layout.tsx`がすっきりします。ギフトボックスの包装紙を重ねるようなイメージです。

**コードの仕組み解説**:
- `'use client'`: このファイルをClient Componentとして宣言
- `TRPCReactProvider`: tRPCのクライアント設定
- `ThemeProvider`: MUIのテーマ設定
- `CssBaseline`: ブラウザのデフォルトスタイルをリセット
- `Toaster`: 通知メッセージを表示するためのコンポーネント

以下のコードを確認してください(既存ファイル):

```typescript
// filepath: src/app/providers.tsx
'use client';

import { TRPCReactProvider } from '@/trpc/react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Toaster } from 'react-hot-toast';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCReactProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
        <Toaster />
      </ThemeProvider>
    </TRPCReactProvider>
  );
}
```

**確認方法**:
1. `src/app/providers.tsx`を開く
2. 各Providerの役割を理解する

**よくあるエラー**:
- エラー: `'use client'`がない
  - 解決: Client Component(useState, useEffectを使うコンポーネント)には必ず`'use client'`を先頭に書く

---

### Part 3: ホームページの作成(15分)

#### Step 3.1: トップページを確認する(所要時間:7分)

**このステップで学ぶこと**: Server Componentとしてのページの書き方。

**なぜ必要?**: `src/app/page.tsx`は`/`にアクセスしたときに表示されるページです。App Routerでは、デフォルトでServer Componentとして動作します。

**コードの仕組み解説**:
- `redirect`: ログイン状態に応じてリダイレクト
- Server Componentではasync/awaitが使える

以下のコードを確認してください(既存ファイル):

```typescript
// filepath: src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // トップページにアクセスしたらダッシュボードにリダイレクト
  redirect('/dashboard');
}
```

**確認方法**:
1. ブラウザで`http://localhost:3000/`にアクセス
2. 自動的に`/dashboard`にリダイレクトされることを確認

---

#### Step 3.2: Server ComponentとClient Componentの違いを理解する(所要時間:8分)

**このステップで学ぶこと**: 2種類のコンポーネントの使い分け。

**なぜ必要?**: App Routerの大きな特徴は、Server ComponentとClient Componentを使い分けられることです。適切に使い分けることで、パフォーマンスとユーザー体験を両立できます。

**コードの仕組み解説**:

**Server Component(デフォルト)**:
- サーバー側でレンダリング
- async/awaitが使える
- データベースに直接アクセス可能
- `useState`, `useEffect`は使えない

```typescript
// Server Component(デフォルト)
// filepath: src/app/about/page.tsx
export default async function AboutPage() {
  // サーバー側でデータを取得できる
  const data = await fetchSomeData();
  return <div>{data.title}</div>;
}
```

**Client Component**:
- ブラウザ側でレンダリング
- `'use client'`を先頭に記述
- `useState`, `useEffect`が使える
- イベントハンドラを設定可能

```typescript
// Client Component
// filepath: src/app/counter/page.tsx
'use client';

import { useState } from 'react';

export default function CounterPage() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

**使い分けの基準**:

| 機能 | Server Component | Client Component |
|------|-----------------|------------------|
| データ取得 | ✅ 推奨 | ⚠️ 可能 |
| useState/useEffect | ❌ 不可 | ✅ 使用可能 |
| イベントハンドラ | ❌ 不可 | ✅ 使用可能 |
| ブラウザAPI | ❌ 不可 | ✅ 使用可能 |

**確認方法**:
1. `src/app/login/page.tsx`を開く
2. 先頭に`'use client'`があることを確認
3. `useState`が使われていることを確認

---

## ✅ 今日の成果

以下の内容を理解できたことを確認しましょう:

1. **ファイルベースルーティング**: `src/app`のフォルダ構造がURLに対応する
2. **layout.tsx**: 子ページで共有されるレイアウト
3. **page.tsx**: 各URLで表示されるコンテンツ
4. **Server/Client Component**: 用途に応じて使い分ける

---

## まとめ

- **App Router**: Next.js 15の新しいルーティングシステム
- **ファイルベースルーティング**: フォルダ構造 = URLパス
- **layout.tsx**: 共通UIを定義する場所
- **page.tsx**: ページのメインコンテンツ
- **Server Component**: サーバー側でレンダリング(デフォルト)
- **Client Component**: ブラウザ側でレンダリング(`'use client'`)

次回(Day 3)では、TypeScriptの型定義とPrismaスキーマを学び、データ構造を理解していきます。
