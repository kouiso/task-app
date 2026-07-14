# Day 06: NextAuth.jsによる認証基盤の構築

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **NextAuth.jsのセッション管理を理解する** | ユーザー認証 | ✅ ログイン/ログアウト流れを説明できる |
| **認証ルーターを実装する** | API実装 | ✅ login/register/logoutを実装できる |
| **認証状態を確認する** | ページ保護 | ✅ ログイン状態をチェックできる |

## 💼 なぜこれを学ぶのか?

**認証はセキュリティの基本**です。自分で実装するのは危険なため、NextAuth.jsなどの実績のあるライブラリを使います。

- **セッション管理**: クッキーベースのセキュアなセッション
- **パスワード保護**: bcryptでハッシュ化
- **複数サービス対応**: Google, GitHub, メール/パスワードなど

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | セッション管理基礎 | 2ステップ | 20分 |
| **Part 2** | ログイン/登録実装 | 2ステップ | 25分 |
| **Part 3** | 認証フロー | 2ステップ | 15分 |
| **合計** | - | **6ステップ** | **約60分** |

---

## 実装内容

### Part 1: セッション管理基礎(20分)

#### Step 1.1: セッションの仕組みを理解する(所要時間:10分)

**このステップで学ぶこと**: ブラウザとサーバー間のセッション通信。

**なぜ必要?**: HTTPはステートレス(状態を持たない)プロトコルです。ユーザーがログインしたことを覚えておくために、セッションという仕組みを使います。

**コードの仕組み解説**:

1. **ユーザーがログイン**
   ```
   ブラウザ → サーバー: メール + パスワード
   サーバー: パスワードを検証 → セッション作成
   サーバー → ブラウザ: Set-Cookie: sessionToken=xxx
   ```

2. **その後のリクエスト**
   ```
   ブラウザ: Cookie: sessionToken=xxx を自動送信
   サーバー: セッションテーブルで照合
   ```

**セッションの実装**:

```typescript
// filepath: src/lib/session.ts
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { Session } from 'next-auth';

export type SessionUser = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

// セッションを作成
export async function createSession(user: SessionUser) {
  const sessionToken = generateSecureToken(); // ランダムトークン生成
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30日後

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set('sessionToken', sessionToken, {
    httpOnly: true,        // JavaScriptからアクセス不可
    secure: process.env.NODE_ENV === 'production', // HTTPSのみ
    sameSite: 'lax',       // CSRF対策
    maxAge: 30 * 24 * 60 * 60, // 30日
  });
}

// セッションを削除
export async function deleteSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('sessionToken')?.value;

  if (sessionToken) {
    await prisma.session.delete({
      where: { sessionToken },
    });
  }

  cookieStore.delete('sessionToken');
}

// セッションを取得
export async function getSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('sessionToken')?.value;

  if (!sessionToken) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || session.expires < new Date()) {
    await deleteSession();
    return null;
  }

  return { userId: session.userId, user: session.user };
}

function generateSecureToken(): string {
  return require('crypto').randomBytes(32).toString('hex');
}
```

**確認方法**:
1. ログインページで「メールアドレス」と「パスワード」を入力
2. DevToolsで「Network」タブを開く
3. ログインリクエストのSet-Cookieヘッダーを確認

---

#### Step 1.2: bcryptでパスワードをハッシュ化する(所要時間:10分)

**このステップで学ぶこと**: パスワードを安全に保存する方法。

**なぜ必要?**: **パスワードは絶対に平文で保存してはいけません**。bcryptを使ってハッシュ化することで、万が一データベースが盗まれてもパスワードが露出しません。

**コードの仕組み解説**:

```typescript
import bcrypt from 'bcryptjs';

// パスワードをハッシュ化(登録時)
async function registerUser(email: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10); // 塩ラウンド10

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword, // ハッシュ化されたパスワード
      role: 'USER',
      isActive: true,
    },
  });

  return user;
}

// パスワードを検証(ログイン時)
async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.password) {
    throw new Error('ユーザーが見つかりません');
  }

  // 入力されたパスワードと保存されたハッシュを比較
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error('パスワードが正しくありません');
  }

  return user;
}
```

**bcryptの特徴**:
- **一方向**: ハッシュ値からパスワードを復元不可
- **ソルト**: 同じパスワードでも毎回異なるハッシュ値
- **遅い**: ブルートフォース攻撃を防止(故意に時間がかかる)

**確認方法**:
1. ユーザーを登録
2. Prisma Studioでpasswordフィールドを確認(ハッシュ値が保存されている)

---

### Part 2: ログイン/登録実装(25分)

#### Step 2.1: ログイン・ロジックを実装する(所要時間:12分)

**このステップで学ぶこと**: tRPCルーターでログイン処理を実装。

**なぜ必要?**: フロントエンドからセキュアにログイン要求を送ります。バリデーション、パスワード検証、セッション作成をサーバー側で行います。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/auth.ts
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/session';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      // 1. ユーザー存在確認
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user || !user.password) {
        throw new Error('メールアドレスまたはパスワードが正しくありません');
      }

      // 2. パスワード検証
      const isPasswordValid = await bcrypt.compare(input.password, user.password);

      if (!isPasswordValid) {
        throw new Error('メールアドレスまたはパスワードが正しくありません');
      }

      // 3. アクティブ確認
      if (!user.isActive) {
        throw new Error('このアカウントは無効化されています');
      }

      // 4. セッション作成
      await createSession({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
      };
    }),
});
```

**確認方法**:
1. ログインページで登録済みのメール/パスワードでログイン
2. 成功するとダッシュボードにリダイレクト

---

#### Step 2.2: ユーザー登録・ロジックを実装する(所要時間:13分)

**このステップで学ぶこと**: 新規ユーザー登録とバリデーション。

**なぜ必要?**: 登録時のバリデーション(パスワード強度チェック など)と、重複チェックが重要です。

**コードの仕組み解説**:

```typescript
const registerSchema = z
  .object({
    name: z.string().min(1, '名前を入力してください'),
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(/[A-Z]/, 'パスワードには大文字を含める必要があります')
      .regex(/[a-z]/, 'パスワードには小文字を含める必要があります')
      .regex(/[0-9]/, 'パスワードには数字を含める必要があります')
      .regex(/[^A-Za-z0-9]/, 'パスワードには特殊文字を含める必要があります'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      // 1. メールアドレスの重複チェック
      const existing = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new Error('このメールアドレスは既に登録されています');
      }

      // 2. パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // 3. ユーザーを作成
      const user = await prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: hashedPassword,
          role: 'USER',
          isActive: true,
        },
      });

      // 4. セッション作成
      await createSession({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
      };
    }),
});
```

**パスワード強度要件**:
- 最低8文字
- 大文字・小文字・数字・特殊文字を含む

---

### Part 3: 認証フロー(15分)

#### Step 3.1: 認証状態をチェックする(所要時間:7分)

**このステップで学ぶこと**: セッション取得とログイン状態の確認。

**なぜ必要?**: 認証が必要なページには、ログインしていないユーザーをアクセスさせないようにする必要があります。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/auth.ts
export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return { user };
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    await deleteSession();
    return { success: true };
  }),
});
```

**確認方法**:
1. ログイン状態でダッシュボードを表示
2. DevToolsでセッションクッキーを確認
3. ログアウトするとクッキーが削除される

---

#### Step 3.2: ページ保護とリダイレクト(所要時間:8分)

**このステップで学ぶこと**: ログイン必須ページの実装。

**なぜ必要?**: ダッシュボードなど、ログインしていないユーザーがアクセスしたら、ログインページにリダイレクトする必要があります。

**コードの仕組み解説**:

```typescript
// filepath: src/components/layout/app-layout.tsx
'use client';

import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isLoading } = api.auth.getSession.useQuery();

  useEffect(() => {
    // セッションがなければログインページにリダイレクト
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  if (isLoading || !session) {
    return null; // ローディング中は何も表示しない
  }

  return <>{children}</>;
}
```

**フロー**:
```
1. ユーザーが /dashboard にアクセス
2. AppLayout が api.auth.getSession をリクエスト
3. セッションなし → /login にリダイレクト
4. セッションあり → ダッシュボード表示
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. セッション作成/削除
2. パスワードをbcryptでハッシュ化
3. ログイン/登録ロジック
4. セッション確認とページ保護

---

## まとめ

- **セッション**: ユーザーのログイン状態を管理
- **bcrypt**: パスワードをハッシュ化して安全に保存
- **バリデーション**: パスワード強度チェック
- **httpOnly Cookie**: JavaScriptからアクセス不可
- **api.auth.getSession**: セッション状態を確認
- **リダイレクト**: 未認証ユーザーを /login へ

次回(Day 7)はWeek 1のまとめ・復習です。
