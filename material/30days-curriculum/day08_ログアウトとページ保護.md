# Day 08: ログアウトとページ保護を実装しよう

## 🎯 今日のゴール

ログアウト機能を実装し、未ログインユーザーを自動的にログイン画面にリダイレクトします。

【スクリーンショット: ログアウトボタンとリダイレクト画面】

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | ログアウト機能 | 10分 |
| Step 2 | ページ保護ミドルウェア | 15分 |
| Step 3 | リダイレクト処理 | 10分 |
| Step 4 | 動作確認 | 5分 |

**合計時間**: 約40分

---

### Step 1: ログアウト機能（10分）

💻 **実装**:

```typescript
// filepath: src/components/layout/Header.tsx
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@mui/material';

export function Header() {
  const { data: session } = useSession();

  return (
    <header>
      {session && (
        <Button onClick={() => signOut({ callbackUrl: '/login' })}>
          ログアウト
        </Button>
      )}
    </header>
  );
}
```

✅ **確認ポイント**: ログアウトボタンをクリックするとログイン画面に戻る

---

### Step 2: ページ保護ミドルウェア（15分）

💻 **実装**:

```typescript
// filepath: middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/dashboard/:path*', '/projects/:path*', '/tasks/:path*'],
};
```

✅ **確認ポイント**: 未ログイン状態で保護ページにアクセスすると/loginにリダイレクト

---

### Step 3: リダイレクト処理（10分）

💻 **実装**:

```typescript
// filepath: src/app/login/page.tsx
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    // ログイン処理
    const result = await signIn('credentials', {
      email,
      password,
      callbackUrl,
    });
  };

  // ...
}
```

✅ **確認ポイント**: ログイン後に元のページに戻る

---

## 📋 今日のまとめ

- [ ] ログアウト機能を実装できた
- [ ] middlewareでページを保護できた
- [ ] リダイレクト処理を実装できた

## 🔗 次回予告

Day 9では、プロジェクト一覧画面を作成します。
