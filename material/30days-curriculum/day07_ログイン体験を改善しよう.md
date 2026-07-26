# Day 07: 認証バックエンドを作って、ログインを動かそう

![ログイン画面](./screenshots/login.png)

## 前回の振り返り

Day 05-06 でログイン画面と登録画面の UI を作りました。
画面の動作確認に使える認証バックエンドは、配布スターターに入っています。

今日は、その「裏側」を自分の手で作り直します。
完成済みコードを残したまま読むのではなく、対象ファイルの中身を空にし、
小さな部品から順番につなぎ直します。

---

## 今日のゴール

ログイン・登録が実際に動くようにします。
その過程で、JWT トークン・bcrypt パスワード検証・HttpOnly Cookie・tRPC の仕組みを体験的に学びます。

- [ ] `src/lib/session.ts` — JWT セッション管理を作り直す
- [ ] `src/server/api/trpc.ts` — tRPC の土台を作り直す
- [ ] `src/server/api/routers/auth.ts` — 認証 API を作り直す
- [ ] `src/server/api/root.ts` — ルーターの束ね方を作り直す
- [ ] `src/app/api/trpc/[trpc]/route.ts` — HTTP ハンドラーを作り直す
- [ ] `src/middleware.ts` — ルート保護を作る
- [ ] DevTools でログインの流れを確認する

## なぜこれを作るのか

Day 05 で作ったログイン画面は、ブラウザ（フロントエンド）だけで動いています。
「このメールとパスワードが正しいか」を確認するには、
サーバー側にデータベースと照合する処理が必要です。

今日作る 6 ファイルが、ログインの「裏方」全部になります。

> **例え話**: レストランに例えると、Day 05-06 で作ったのは注文用紙（フォーム）。今日は厨房（サーバー）と配膳システム（API）を作って、注文がちゃんと通るようにします。

### 認証フローの全体像

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant B as ブラウザ
    participant T as tRPC API
    participant D as データベース

    U->>B: メール・パスワード入力
    B->>T: api.auth.login.mutate()
    T->>D: メールでユーザー検索
    D-->>T: ユーザー情報
    T->>T: bcrypt でパスワード照合
    T->>T: JWT トークン生成（jose）
    T->>B: Cookie 保存 + レスポンス
    B->>B: トースト表示「おかえりなさい！」
    B->>U: ダッシュボードへ遷移
```

この図で追ってほしいのは、パスワードの登場が最初の 1 往復だけで終わる点です。
2 往復目からブラウザが持ち歩くのは、Cookie に入った JWT のほうになります。
だから今日いちばん守らないといけないものは、パスワードそのものではなく、この Cookie の中身です。
以降の Step は、そのトークンを誰に渡し、誰に読ませないかを 1 つずつ決めていく作業になります。

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| 認証バックエンドを自分の手で作る | 暗号化の数学的仕組みを理解する |
| JWT・Cookie・middleware の仕組みを体験する | 独自の暗号化実装を作る |
| DevTools で認証フローを目で確認する | データベース設計（scaffold 済み） |

### 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| JWT | ジェイ・ダブリュー・ティー | ユーザー情報を署名付きで格納したトークン | 遊園地のリストバンド。名前と有効期限入り |
| bcrypt | ビークリプト | パスワードを安全にハッシュ化 | 暗証番号を解読不能な暗号に変換するマシン |
| HttpOnly Cookie | エイチティーティーピー・オンリー・クッキー | JS から読めない安全な Cookie | 見えない場所に隠したリストバンド |
| tRPC | ティー・アール・ピー・シー | 型安全な API フレームワーク | フロントとバックで同じメニュー表を共有する仕組み |
| ミドルウェア | middleware | リクエストの前処理（認証ガード等） | 店の入口にいるガードマン |
| rate limit | レート・リミット | 短時間のログイン失敗回数を制限する | 暗証番号を何度も間違えると一時停止する仕組み |

> **今日のゴールライン**: JWT や bcrypt の数学的な仕組みまで理解する必要はありません。「ログインしたらトークンがもらえて、それで認証が通る」という流れを体験できたら OK。

## 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 | 作成ファイル |
|---------|---------|---------|-------------|
| Step 1 | session.ts を作り直す（JWT セッション管理） | 12分 | `src/lib/session.ts` |
| Step 2 | trpc.ts を作り直す（API の土台） | 10分 | `src/server/api/trpc.ts` |
| Step 3 | auth.ts を作り直す（認証ルーター） | 15分 | `src/server/api/routers/auth.ts` + ヘルパー |
| Step 4 | API を繋ぎ直す（ルーター登録 + HTTP ハンドラー） | 5分 | `src/server/api/root.ts`, `src/app/api/trpc/[trpc]/route.ts` |
| Step 5 | middleware.ts を作る（ルート保護） | 8分 | `src/middleware.ts` |
| Step 6 | ログインして動作確認する | 5分 | なし |
| Step 7 | DevTools で JWT と Cookie を確認する | 5分 | なし |

**合計時間**: 約 60 分。

---

### Step 1: session.ts を作り直す（JWT セッション管理・12分）
**ゴール**: ログイン状態を JWT トークンで管理する仕組みを作ります。

このファイルが認証の中心です。
「トークンを作る」「トークンを読む」「Cookie に保存する」「Cookie から取り出す」——
認証の基本操作が全部ここに入ります。

`src/lib/session.ts` を開き、中身をすべて削除してから作り直します。

#### 1-1. インポートと秘密鍵の取得

```typescript
// filepath: src/lib/session.ts
import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import type { UserRole } from './constant/roles';
import { env } from './env';

function getKey(): Uint8Array {
  const SECRET_KEY = env.JWT_SECRET;
  const encoded = new TextEncoder().encode(SECRET_KEY);
  return new Uint8Array(encoded);
}
```

| コード | 意味 | 例え |
|--------|------|------|
| `jose` | JWT を扱うライブラリ | リストバンド製造機 |
| `cookies()` | Next.js の Cookie 操作 API | ブラウザの Cookie 棚 |
| `getKey()` | 秘密鍵を Uint8Array に変換 | 店長の印鑑を取り出す |

`getKey()` の返すこの鍵が、今日作る認証の土台です。
署名に使う鍵と検証に使う鍵が同じなので、鍵を知っている人は誰でも正規のトークンを作れます。
つまり `JWT_SECRET` が漏れた時点で、攻撃者は好きな `userId` と `role` を書いたトークンを自作でき、パスワードは要らなくなります。
`.env` をリポジトリへコミットしないのは、この 1 行を守るためです。

> `JWT_SECRET` は `.env` に scaffold が設定済み。32 文字以上の文字列で、本番では必ず変更します。

#### 1-2. 型定義と定数

```typescript
// filepath: src/lib/session.ts（続き）
export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

const COOKIE_NAME = 'session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7日間
```

`SessionPayload` は、JWT トークンの中に入れる中身の型です。
`SessionUser` は、画面側が「いま誰がログインしているか」を判断するために必要な最小限の情報です。

#### 1-3. 型ガードと暗号化

```typescript
// filepath: src/lib/session.ts（続き）
function isSessionPayload(
  payload: JWTPayload,
): payload is JWTPayload & SessionPayload {
  return (
    typeof payload['userId'] === 'string' &&
    typeof payload['email'] === 'string' &&
    typeof payload['role'] === 'string' &&
    typeof payload['exp'] === 'number'
  );
}
```

**確認ポイント**:
- [ ] `isSessionPayload` が `userId` / `email` / `role` / `exp` を確認している

```typescript
// filepath: src/lib/session.ts（続き）
export async function encrypt(
  payload: SessionPayload,
): Promise<string> {
  const jwtPayload: Record<string, unknown> = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    exp: payload.exp,
  };

  return await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey());
}
```

| コード | 意味 | 例え |
|--------|------|------|
| `isSessionPayload()` | JWT の中身が正しい形式か検証 | 書類の記入漏れチェック |
| `SignJWT` | 署名付き JWT を作成 | リストバンドに情報を刻印する機械 |
| `alg: 'HS256'` | 署名アルゴリズム | 偽造防止の特殊インクの種類 |
| `setExpirationTime('7d')` | 7 日間有効 | リストバンドの有効期限シール |
| `sign(getKey())` | 秘密鍵で署名 | 店長のハンコで正式認定 |

`jwtPayload` に入れているのは `userId` / `email` / `role` / `exp` の 4 つだけです。
JWT は暗号化しないので、ここへ入れた値は受け取った人がそのまま読めます。
パスワードや電話番号を足したくなっても入れてはいけないのは、そのためです。
最後の `.sign(getKey())` が付ける署名は、中身を隠すものではなく、書き換えられていないことを示す封印だと考えてください。

#### 1-4. 復号化（トークンを読む）

```typescript
// filepath: src/lib/session.ts（続き）
export async function decrypt(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ['HS256'],
    });

    if (!isSessionPayload(payload)) {
      console.error('Invalid session payload structure');
      return null;
    }

    return payload;
  } catch {
    console.error('Failed to decrypt token');
    return null;
  }
}
```

`encrypt` でトークンを作り、`decrypt` でトークンを読みます。この2つは対になる操作です。
読む側の中心は `jwtVerify` で、秘密鍵と合う署名が付いているかを確かめます。
ここを飛ばして中身だけ取り出す作りにすると、攻撃者は自分で `role: "ADMIN"` と書いたトークンを貼り付けるだけで管理者になれます。
署名が通っても項目が足りなければ `isSessionPayload` で弾き、期限切れなどで例外が出たときは `catch` が `null` を返します。
ログイン済みとみなしてよいのは、この関数が `null` 以外を返したときだけです。

#### 1-5. セッション操作（作成・取得・削除・検証）

```typescript
// filepath: src/lib/session.ts（続き）
export async function saveSessionCookie(
  token: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:
      process.env['NODE_ENV'] === 'production'
      && process.env['PLAYWRIGHT_TEST'] !== '1',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}
```

トークンを Cookie へ書き込む処理だけを、別の関数へ切り出しています。
ログイン直後と、あとから発行し直すときの両方から呼ぶので、書き込みの条件を 1 か所にそろえておくためです。
そして、ここで渡している 5 つの設定が、ブラウザに置かれたトークンを守る唯一の柵になります。
たとえば `httpOnly: true` を外すと、ページに紛れ込んだスクリプトが `document.cookie` からトークンを読み出せてしまいます。
設定それぞれの意味は、この節の最後の表へまとめてあります。

**確認ポイント**:
- [ ] Cookie 設定を `saveSessionCookie` に分けて書けている

```typescript
// filepath: src/lib/session.ts（続き）
export async function createSession(
  user: SessionUser,
): Promise<string> {
  const expiresAt =
    Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: expiresAt,
  };

  const token = await encrypt(payload);
  await saveSessionCookie(token);

  return token;
}
```

**確認ポイント**:
- [ ] `createSession` から `saveSessionCookie(token)` を呼んでいる

```typescript
// filepath: src/lib/session.ts（続き）
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return await decrypt(token);
}
```

`cookieStore.get(COOKIE_NAME)?.value` は、Cookie が見つからないと `undefined` になります。
それをそのまま `decrypt` へ渡すと例外で止まるので、手前で `null` を返して打ち切ります。
未ログインはエラーではなく、まだ誰でもない状態です。
だからここでは例外を投げず、呼び出した側へ「セッションが無い」とだけ伝えます。
この使い分けができていないと、ログイン画面を開いただけでサーバーエラーが出る作りになります。

**確認ポイント**:
- [ ] Cookie がない場合に `null` を返している

```typescript
// filepath: src/lib/session.ts（続き）
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifySession(): Promise<SessionUser | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return {
    id: session.userId,
    email: session.email,
    role: session.role,
  };
}
```

**Cookie 設定の意味**:

| 設定 | 値 | なぜ必要か |
|------|-----|---------|
| `httpOnly` | `true` | JavaScript から読めなくして XSS 攻撃を防ぐ |
| `secure` | 本番のみ `true` | HTTPS でのみ送信して盗聴を防ぐ |
| `sameSite` | `'strict'` | 別サイトからのリクエストに Cookie を付けない |
| `maxAge` | 7 日間 | セッションの有効期限 |

**確認ポイント**:
- [ ] `src/lib/session.ts` を教材のコードで作り直した
- [ ] `encrypt` / `decrypt` / `createSession` / `getSession` / `deleteSession` / `verifySession` の 6 関数がある
- [ ] この時点ではまだ `npm run dev` しなくて OK

**学んだこと**: JWT は「誰が」「いつまで」「どの権限で」ログインしているかを、署名付きで保持する仕組みです。

---

### Step 2: trpc.ts を作り直す（API の土台・10分）
**ゴール**: tRPC の初期設定と、public / protected / admin の 3 種類の API を定義します。

Day 05 のログイン画面は `api.auth.login.useMutation()` でサーバーを呼んでいました。
その呼び出しを受け止めるサーバー側の土台が、これから作り直すこのファイルです。

`src/server/api/trpc.ts` を開き、中身をすべて削除してから作り直します。

#### 2-1. コンテキスト作成

```typescript
// filepath: src/server/api/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { USER_ROLE } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const createTRPCContext = async (
  opts: { headers: Headers },
) => {
  const session = await getSession();

  return {
    session,
    ...opts,
  };
};

export type Context = Awaited<
  ReturnType<typeof createTRPCContext>
>;
```

`createTRPCContext` は API リクエストのたびに呼ばれて、「今誰がログインしてるか」をコンテキストに入れます。

#### 2-2. tRPC インスタンス初期化

```typescript
// filepath: src/server/api/trpc.ts（続き）
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});
```

| コード | 意味 |
|--------|------|
| `superjson` | Date や BigInt を JSON で送れるようにする変換器 |
| `errorFormatter` | zod のバリデーションエラーを使いやすい形に整形 |

#### 2-3. 認証ミドルウェアとプロシージャ

```typescript
// filepath: src/server/api/trpc.ts（続き）
const isAuthenticated = t.middleware(
  async ({ ctx, next }) => {
    if (!ctx.session?.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'ログインが必要です',
      });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.session.userId },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });
```

前半は、`ctx.session?.userId` が無ければ `UNAUTHORIZED` を投げて先へ進ませない門番です。
目を留めてほしいのは、その直後に `prisma.user.findUnique` でデータベースを引き直しているところです。
JWT の有効期限は 7 日間あるので、たった今アカウントを止めても、相手の手元にあるトークンは形の上では有効なままです。
トークンの中身だけを信じる作りだと、止めたはずの相手を最大 7 日間止められません。
リクエストのたびにデータベースを見に行くのは、この時間差を埋めるためです。

**確認ポイント**:
- [ ] セッションの `userId` で DB のユーザーを取り直している

```typescript
// filepath: src/server/api/trpc.ts（続き）
    if (!currentUser) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'ユーザーが見つかりません',
      });
    }

    if (!currentUser.isActive) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'このアカウントは無効化されています',
      });
    }
```

分岐を 2 つに分けているのは、返すべき答えが違うからです。
ユーザーが見つからない側は、退会などでレコードが消えた状態にあたります。
相手が誰なのか確かめられないので `UNAUTHORIZED` を返し、ログインし直せば通る可能性を残します。
`isActive` が `false` の側は、誰かは分かっているが利用を止めてある状態なので `FORBIDDEN` を返します。
まとめて 1 つのエラーにすると、画面側は「もう一度ログインしてください」と案内すべきかどうかを判断できません。

**確認ポイント**:
- [ ] DB にユーザーがない場合と無効化済みの場合を分けている

```typescript
// filepath: src/server/api/trpc.ts（続き）
    return next({
      ctx: {
        session: {
          ...ctx.session,
          role: currentUser.role,
        },
      },
    });
  },
);
```

**確認ポイント**:
- [ ] 未ログイン時に `UNAUTHORIZED` を返す分岐がある
- [ ] DB から `isActive` を確認している

```typescript
// filepath: src/server/api/trpc.ts（続き）
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (ctx.session?.role !== USER_ROLE.ADMIN) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '管理者権限が必要です',
    });
  }

  return next({ ctx });
});
```

`isAdmin` は、これ単体では守りになりません。
見ているのは `ctx.session?.role` だけで、その値は 1 つ前の `isAuthenticated` がデータベースの内容で上書きしたものだからです。
`isAuthenticated` を通さずにこれだけを使うと、権限を下げた直後のユーザーが、古いトークンに残った `ADMIN` のまま管理者向け API を呼べてしまいます。
本当の守りは `isAuthenticated` 側にあり、`isAdmin` はそこで確定した値をふるいにかける役です。
次のコードで `.use()` を並べる順番が、そのまま守りの順番になります。

**確認ポイント**:
- [ ] 管理者以外を `FORBIDDEN` にする `isAdmin` がある

```typescript
// filepath: src/server/api/trpc.ts（続き）
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure =
  t.procedure.use(isAuthenticated);
export const adminProcedure =
  t.procedure.use(isAuthenticated).use(isAdmin);
export const createCallerFactory = t.createCallerFactory;
```

**3 種類の API**:

| 種別 | 認証 | 使う場面 | API 例 |
|------|------|---------|-------|
| `publicProcedure` | 不要 | 誰でも呼べる | ログイン、登録 |
| `protectedProcedure` | 必須 | ログインユーザーのみ | タスク操作、プロジェクト管理 |
| `adminProcedure` | 管理者のみ | 管理機能 | ユーザー管理 |

> `isAuthenticated` ミドルウェアは、Cookie のセッション情報だけでなく DB からユーザーの最新状態を取得します。アカウントが無効化されていたら、ここで弾きます。

**確認ポイント**:
- [ ] `src/server/api/trpc.ts` を教材のコードで作り直した
- [ ] `publicProcedure` / `protectedProcedure` / `adminProcedure` の 3 つが export されている

**学んだこと**: tRPC のミドルウェアで「ログイン必須」「管理者のみ」といった認証制御を API 定義にチェーン（`.use()`）するだけで追加できます。

---

### Step 3: auth.ts を作り直す（認証ルーター・15分）
**ゴール**: ログイン・登録・ログアウト・セッション取得の 4 つの API を作ります。

ここが今日のメインです。配布スターターには、Day 05 と Day 06 の画面を先に動かすため、完成済みの認証 API が入っています。ここでは動いているコードを答えとして眺めるだけにせず、`auth.ts` の中身を削除し、手順どおりに自分で作り直します。

まず、共通のヘルパーを作ります。

#### 3-0. select ヘルパーを作る

`src/server/api/routers/_helpers/select.ts` を開き、教材のコードと見比べます。
内容が異なる場合は、中身を教材のコードへ置き換えてください。

```typescript
// filepath: src/server/api/routers/_helpers/select.ts
import { z } from 'zod';
import { PROJECT_MEMBER_ROLE } from '@/lib/constant/roles';

export const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
} as const;

export const USER_DETAIL_SELECT = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  role: true,
  isActive: true,
} as const;

export const projectMemberRoleSchema =
  z.nativeEnum(PROJECT_MEMBER_ROLE);
```

Prisma（読み方はプリズマ、TypeScript からデータベースを操作するための道具）の `select` を毎回書くのは面倒なので、共通化しておきます。
`as const` で型を絞ることで、返り値の型が正確になります。

#### 3-1. auth.ts のインポートとバリデーション

`src/server/api/routers/auth.ts` を開き、中身をすべて削除してから作り直します。
ファイル自体は削除せず、空になった同じファイルへ次のコードを書いてください。

```typescript
// filepath: src/server/api/routers/auth.ts
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { USER_ROLE } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';
import {
  checkLoginRateLimit,
  extractClientIp,
  rateLimitToTRPCError,
  recordLoginSuccess,
} from '@/lib/rate-limit';
import { createSession, deleteSession, type SessionUser } from '@/lib/session';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc';
import { USER_DETAIL_SELECT } from './_helpers/select';
```

取り込んだ道具は役割ごとに分かれています。
`bcrypt` はパスワードの照合、`z` は入力の検証、`prisma` はデータベースへの問い合わせに使います。
`@/lib/rate-limit` から取り込んだ 4 つは、ログイン失敗の回数を数えて、当てずっぽうの試行を止めるための道具です。
最後の `publicProcedure` はログイン前でも呼べる手続き、`protectedProcedure` はログイン済みだけが呼べる手続きを作ります。
ログインと登録に `publicProcedure` を使わないと、まだログインしていない人がログインできない API になってしまいます。

**確認ポイント**:
- [ ] 認証 API に必要な import が揃っている

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});
```

このあと出てくる `registerSchema` と見比べると、`password` の条件が `min(1)` だけになっています。
ログイン側で 8 文字以上や記号必須まで課すと、入力を弾いた時点で「その形では登録されていない」と相手へ教えることになります。
ここでの検証は、空の値をデータベース照合まで流さないための入口チェックにとどめます。
正しいかどうかを決めるのは、このあとの `bcrypt.compare` の仕事です。

**確認ポイント**:
- [ ] ログイン入力は email と password を検証している

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
const registerSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(/[A-Z]/, 'パスワードには大文字を含める必要があります')
    .regex(/[a-z]/, 'パスワードには小文字を含める必要があります')
    .regex(/[0-9]/, 'パスワードには数字を含める必要があります')
    .regex(/[^A-Za-z0-9]/, 'パスワードには特殊文字を含める必要があります'),
});
```

> zod でバリデーションを定義しておくと、tRPC が自動で入力チェックしてくれます。フロント側でもバックエンド側でも同じスキーマを使える。

#### 3-2. エラーハンドラーとログイン処理

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
function handleUnexpectedError(context: string, error: unknown): never {
  console.error('[auth] unexpected error', { context, error });
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `${context}中にエラーが発生しました。しばらくしてから再度お試しください。`,
    cause: error,
  });
}
```

戻り値の型が `never` なのは、この関数が値を返さず必ず例外を投げるからです。
呼んだ側は、この行から先へ進まないと型の上でも分かります。
本物のエラーは `console.error` でサーバーのログにだけ残し、画面へ返すのは決まった文言だけにします。
データベースのエラー文をそのまま返すと、テーブル名や列名といった内部の作りが相手に見えてしまうためです。
末尾の `cause: error` は、原因を捨てずに開発時の調査へ残しておくための指定です。

**確認ポイント**:
- [ ] 予期しないエラーを `TRPCError` に変換している

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
export const authRouter = createTRPCRouter({
  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    const ip = extractClientIp(ctx.headers);

    // brute force 対策: 直近 15 分の失敗回数を email 単独 / email×IP / IP 単独の3軸で rate-limit。
    // checkLoginRateLimit は許可と同時に失敗行を先取りで記録する（成功時は recordLoginSuccess が削除）
    const limitResult = await checkLoginRateLimit(input.email, ip);
    if (!limitResult.allowed) {
      throw rateLimitToTRPCError(limitResult);
    }
```

ログイン処理の最初の仕事は、データベースを引くことではなく回数を数えることです。
`checkLoginRateLimit` を `prisma.user.findUnique` より前に置くのは、当てずっぽうのパスワードを何万回も試す攻撃を、照合へ届く前に止めるためです。
数える軸は、`extractClientIp` で取り出した接続元 IP と、送られてきたメールアドレスの両方です。
IP だけで数えると、接続元を変えながら同じアカウントを狙う手口を数え落とします。
逆にメールだけで数えると、1 つの IP から大量のアカウントを試す手口が素通りします。

**確認ポイント**:
- [ ] IP を取り出し、ログイン試行回数を先に確認している

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
    try {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user?.password) {
        // 失敗は checkLoginRateLimit が先取りで記録済みのため、ここでは追加記録しない
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'メールアドレスまたはパスワードが正しくありません',
        });
      }

      const isPasswordValid = await bcrypt.compare(input.password, user.password);
```

`user?.password` という 1 つの条件で、ユーザーが存在しない場合とパスワードが登録されていない場合をまとめて弾いています。
返す文言は、このあとのパスワード不一致とまったく同じです。
片方だけ「そのメールアドレスは登録されていません」と返すと、攻撃者は総当たりで有効なメールアドレスの一覧を作れてしまいます。
照合に `===` ではなく `bcrypt.compare` を使うのは、データベースに入っているのがハッシュ化された文字列で、入力された生のパスワードとは一致しないためです。
`bcrypt.compare` は、入力を同じ手順で変換してから見比べます。

**確認ポイント**:
- [ ] ユーザー有無とパスワード照合を同じエラーで確認している

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
      if (!isPasswordValid) {
        // 失敗は checkLoginRateLimit が先取りで記録済みのため、ここでは追加記録しない
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'メールアドレスまたはパスワードが正しくありません',
        });
      }

      if (!user.isActive) {
        // 無効判定はパスワード照合が通ったあとに行う。先に判定すると、正しいパスワードを
        // 知らなくても「無効化されたアカウントが存在する」ことを列挙できてしまうため。
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'このアカウントは無効化されています',
        });
      }
```

`isActive` の判定をパスワード照合より後ろへ置いた理由は、コード中のコメントのとおりです。
先に判定すると、パスワードを知らない相手でも「このメールアドレスは無効化済みのアカウントとして実在する」と読み取れてしまいます。
判定を 1 つ入れ替えるだけで、隠しておきたい事実が漏れます。
認証の処理では、書いてある順番そのものが守りの一部になります。
上から読んだときに、通過条件が厳しい順に並んでいるかを確かめてください。

**確認ポイント**:
- [ ] パスワード照合後に `isActive` を確認している

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
      const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      // セッション発行の前に成功記録を確定させる。順序が逆だと、記録の失敗で 500 を返す一方で
      // 認証済みセッションだけが残るため。
      await recordLoginSuccess(input.email, ip);
      await createSession(sessionUser);
```

ここまで来た人だけが、ログイン成功として扱われます。
`recordLoginSuccess` を `createSession` より先に呼ぶのは、Cookie を配ったあとで失敗記録の削除に失敗すると、ログインできた本人が失敗回数に縛られたまま残るからです。
記録を先に確定させておけば、途中で落ちても発行済みのセッションだけが宙に浮く事態を避けられます。
`SessionUser` へ詰めるのは `id` / `email` / `role` の 3 つだけです。
ここへ `password` を足すと、ハッシュ化済みとはいえトークンの中身として誰でも読める場所へ出てしまいます。

**確認ポイント**:
- [ ] 成功記録を確定してからセッションを発行している

```typescript
// filepath: src/server/api/routers/auth.ts（続き）

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      handleUnexpectedError('ログイン処理', error);
    }
  }),
```

返しているのは画面表示に要る 5 項目だけで、`user` をそのまま返してはいません。
`prisma.user.findUnique` の戻り値にはハッシュ化済みのパスワードも入っており、返してしまうと総当たりの材料を相手へ渡すことになります。
`catch` の中で `TRPCError` だけを投げ直しているのは、`UNAUTHORIZED` のような意図した失敗を 500 エラーへ塗り替えないためです。
それ以外の想定外だけが `handleUnexpectedError` へ回り、ログには残しつつ当たり障りのない文言に置き換わります。

**ログイン処理の流れ**:

```mermaid
flowchart TD
    A[メール・パスワード受信] --> B{試行回数は上限内？}
    B -->|No| I[TOO MANY REQUESTS]
    B -->|Yes| C{ユーザーとパスワードは正しい？}
    C -->|No| E[UNAUTHORIZED エラー]
    C -->|Yes| D{アカウント有効？}
    D -->|No| F[FORBIDDEN エラー]
    D -->|Yes| G[成功記録を確定]
    G --> H[JWT 生成 + Cookie 保存]
```

> **なぜ同じエラーメッセージ？** 「メールが存在しない」と「パスワードが違う」を区別すると、攻撃者に「このメールは登録済み」と教えてしまいます。セキュリティのために同じメッセージを返します。
>
> `checkLoginRateLimit` は、同じメールや IP から短時間に
> 失敗が続いたとき、パスワード照合へ進む前に止めます。
> 成功時は `recordLoginSuccess` で失敗記録を削除してから
> セッションを発行します。順序を逆にすると、記録の削除に
> 失敗したのに認証 Cookie だけが残るため、この順にします。

#### 3-3. 登録・ログアウト・セッション取得

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      try {
        const existing = await prisma.user.findUnique({
          where: { email: input.email },
        });
```

登録処理の最初は、同じメールアドレスが既に使われていないかの確認です。
ただし、この検索は重複を止める最後の砦ではありません。
ほぼ同時に 2 件の登録が届くと、どちらも「まだ無い」と判断して通り抜ける瞬間があるからです。
最終的に重複を止めるのは、`schema.prisma` で `email` に付けてある一意制約のほうです。
ここでの検索は、利用者へ分かりやすいエラーを返すための確認だと考えてください。

**確認ポイント**:
- [ ] 登録前に同じメールアドレスのユーザーを探している

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message:
              'このメールアドレスは既に登録されています',
          });
        }

        const hashedPassword = await bcrypt.hash(
          input.password,
          10,
        );
```

**確認ポイント**:
- [ ] 重複メールを `CONFLICT` で弾いている
- [ ] `bcrypt.hash` でパスワードをハッシュ化している

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
        const user = await prisma.user.create({
          data: {
            email: input.email,
            name: input.name,
            password: hashedPassword,
            role: USER_ROLE.USER,
            isActive: true,
          },
        });
```

このコードで一番大事な行は `role: USER_ROLE.USER` です。
ここを `input.role` にして利用者の入力から受け取る作りにすると、登録フォームへ `role: "ADMIN"` を混ぜて送るだけで、誰でも管理者アカウントを作れてしまいます。
登録 API は誰でも呼べる `publicProcedure` なので、権限だけは入力から切り離してサーバー側で固定します。
`isActive: true` も同じ考え方で、有効か無効かを利用者に決めさせません。
入力に混ぜてよいのは、間違っても本人しか困らない値だけです。

**確認ポイント**:
- [ ] 新規ユーザーを `USER_ROLE.USER` で作成している

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
        const sessionUser: SessionUser = {
          id: user.id,
          email: user.email,
          role: user.role,
        };

        await createSession(sessionUser);

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        handleUnexpectedError('ユーザー登録処理', error);
      }
    }),
```

登録が終わったらそのまま `createSession` を呼び、ログイン画面へ戻さずに済ませます。
ここを省くと、登録し終えた人がもう一度メールアドレスとパスワードを打ち直すことになり、その一手間で離脱する人が出ます。
返す `user` から `password` を外してあるのは、ログインの戻り値とそろえた理由です。
`catch` の形もログインと合わせてあるので、`TRPCError` はそのまま画面へ、それ以外は `handleUnexpectedError` へ渡ります。

**確認ポイント**:
- [ ] 登録直後、`createSession` でログイン状態にしている

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
  logout: publicProcedure.mutation(async () => {
    await deleteSession();
    return { success: true };
  }),

  getSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.session.userId },
      select: USER_DETAIL_SELECT,
    });

    if (!user || !user.isActive) {
      return null;
    }

    return { user };
  }),
```

**確認ポイント**:
- [ ] `logout` は Cookie を削除している
- [ ] `getSession` は未ログインなら `null` を返す

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
  getCurrentUser: protectedProcedure.query(
    async ({ ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.session.userId },
        select: {
          ...USER_DETAIL_SELECT,
          createdAt: true,
          updatedAt: true,
        },
      });
```

5 つの API のうち、`protectedProcedure` で作るのは `getCurrentUser` だけです。
未ログインなら `null` を返せばよい `getSession` と違って、こちらは本人しか呼ばない前提なので、入口で弾いてしまうほうが安全です。
`ctx.session.userId` を鍵にしてデータベースを引き直すのは、トークンを作ったあとに名前やアイコンが変わっていても、最新の値を返すためです。
`select` に `createdAt` と `updatedAt` を足しているのは、プロフィール画面で登録日と更新日を出すからです。
必要な項目だけを並べておけば、パスワードのような返してはいけない列が紛れ込みません。

**確認ポイント**:
- [ ] `getCurrentUser` はログイン中ユーザーの詳細を取得している

```typescript
// filepath: src/server/api/routers/auth.ts（続き）
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません',
        });
      }

      if (!user.isActive) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'このアカウントは無効化されています',
        });
      }

      return user;
    },
  ),
});
```

| API | 種別 | 認証 | 用途 |
|-----|------|------|------|
| `login` | mutation | 不要 | ログイン |
| `register` | mutation | 不要 | ユーザー登録 |
| `logout` | mutation | 不要 | ログアウト |
| `getSession` | query | 不要 | 現在のセッション確認（null 許容） |
| `getCurrentUser` | query | 必須 | ログインユーザーの詳細取得 |

> `bcrypt.hash(password, 10)` の `10` はソルトラウンド。数字が大きいほど安全だが遅くなります。10 が一般的なバランス。

**確認ポイント**:
- [ ] `src/server/api/routers/_helpers/select.ts` を教材のコードと照合した
- [ ] `src/server/api/routers/auth.ts` を教材のコードで作り直した
- [ ] `authRouter` に 5 つの API（login / register / logout / getSession / getCurrentUser）がある

**学んだこと**: パスワードは平文で保存せず `bcrypt.hash` でハッシュ化し、照合は `bcrypt.compare` で行います。

---

### Step 4: API を繋ぎ直す（ルーター登録 + HTTP ハンドラー・5分）
**ゴール**: 作った auth ルーターを tRPC に登録し、HTTP リクエストを受け付けられるようにします。

#### 4-1. root.ts（ルーターを束ねる）

`src/server/api/root.ts` を開き、中身を教材のコードへ置き換えます。

```typescript
// filepath: src/server/api/root.ts
import { authRouter } from './routers/auth';
import { createCallerFactory, createTRPCRouter } from './trpc';

export const appRouter = createTRPCRouter({
  auth: authRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
```

いまここに並んでいるのは `auth` の 1 つだけです。プロジェクトやタスクのルーターは、それを実際に使う Day 09 以降で 1 つずつ足していきます。

#### 4-2. route.ts（HTTP ハンドラー）

`src/app/api/trpc/[trpc]/route.ts` を開き、中身を教材のコードへ置き換えます。

```typescript
// filepath: src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { NextRequest } from 'next/server';
import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({ headers: req.headers }),
  });

export { handler as GET, handler as POST };
```

Next.js の App Router では、`src/app/api/trpc/[trpc]/route.ts` に置くだけで `/api/trpc/*` のリクエストをすべて tRPC が処理します。

**確認ポイント**:
- [ ] `src/server/api/root.ts` を教材のコードで作り直した
- [ ] `src/app/api/trpc/[trpc]/route.ts` を教材のコードで作り直した

---

### Step 5: middleware.ts を作る（ルート保護・8分）
**ゴール**: ログインしていないユーザーを自動でログイン画面にリダイレクトする仕組みを作ります。

このファイルは Next.js の Edge Runtime で動きます。
すべてのリクエストの「入口」で、Cookie に有効な JWT があるかを確認します。

`src/middleware.ts` を新規作成します。置き場所は `src/app/` の中ではなく、`src/` の直下です。

```typescript
// filepath: src/middleware.ts
import { jwtVerify } from 'jose/jwt/verify';
import { type NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'session';

const PUBLIC_PATHS = ['/login', '/register'];
```

`COOKIE_NAME` を `session.ts` から取り込まず、同じ値をここへ書き直しています。
middleware は Edge Runtime で動くため、`next/headers` の `cookies()` を使うファイルを読み込めないからです。
2 か所の値がずれると、middleware が Cookie を見つけられず、ログイン済みの人まで全員ログイン画面へ戻されます。
片方を変えるときは、必ずもう片方も直してください。
`PUBLIC_PATHS` に並べたパスは、ログイン前でも開ける入口です。
うっかりここへ `/dashboard` を書き足すと、そのページだけ認証を通さず中身が見えてしまいます。

**確認ポイント**:
- [ ] Cookie 名と公開パスを定数で定義している

```typescript
// filepath: src/middleware.ts（続き）
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) =>
      pathname === path
      || pathname.startsWith(`${path}/`),
  );
}

function isValidCallbackPath(path: string): boolean {
  return (
    path.startsWith('/')
    && !path.startsWith('//')
    && !path.includes('://')
    && !path.includes('\\')
  );
}

function getJwtSecret(): Uint8Array {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}
```

**確認ポイント**:
- [ ] 公開パス判定と callbackUrl 検証の helper がある
- [ ] `JWT_SECRET` を Edge Runtime でも読める形にしている

```typescript
// filepath: src/middleware.ts（続き）
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開ページはスキップ
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // tRPC エンドポイントはスキップ
  // （tRPC 層の protectedProcedure で認証を担保）
  if (pathname.startsWith('/api/trpc')) {
    return NextResponse.next();
  }
```

**確認ポイント**:
- [ ] `/login` / `/register` / `/api/trpc` は middleware で通している

```typescript
// filepath: src/middleware.ts（続き）
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Cookie なし → ログインへリダイレクト
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'callbackUrl',
      isValidCallbackPath(pathname)
        ? pathname
        : '/dashboard',
    );
    return NextResponse.redirect(loginUrl);
  }
```

**確認ポイント**:
- [ ] Cookie がないときに `/login` へ戻している
- [ ] `callbackUrl` に外部 URL を入れない検証をしている

```typescript
// filepath: src/middleware.ts（続き）
  // JWT 検証
  try {
    await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });
    return NextResponse.next();
  } catch {
    // 無効なトークン: Cookie 削除してログインへ
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}
```

`jwtVerify` が確かめるのは、署名が秘密鍵と合っているかと、`exp` の期限が切れていないかの 2 点です。
どちらかが崩れていれば例外になり、処理は `catch` 側へ落ちます。
そこで Cookie を削除してからログイン画面へ送るのは、壊れたトークンを持ったままリダイレクトを繰り返す状態を避けるためです。
署名を見ずに中身のデコードだけで通す作りにすると、期限切れのトークンでも、自作のトークンでも入れてしまいます。
middleware が守っているのはページの表示だけで、API 側の守りは Step 2 の `protectedProcedure` が受け持ちます。

**確認ポイント**:
- [ ] JWT が有効なら通し、無効なら Cookie を削除している

```typescript
// filepath: src/middleware.ts（続き）
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

`config.matcher` は、middleware を動かす URL を絞り込む指定です。
`_next/static` や画像、`favicon.ico` を外しているのは、画像 1 枚を読むたびに JWT の検証を走らせても得るものが無く、表示が遅くなるだけだからです。
`(?!...)` は「この語で始まらないもの」を表す書き方で、通したいパスをここへ並べます。
逆に外しすぎると、守りたいページが middleware を素通りしてしまうので、足すのは画像やスタイルのような表示用ファイルだけにとどめます。

**middleware の判定フロー**:

```mermaid
flowchart TD
    A[リクエスト受信] --> B{公開パス？}
    B -->|Yes| C[そのまま通す]
    B -->|No| D{tRPC API？}
    D -->|Yes| C
    D -->|No| E{Cookie あり？}
    E -->|No| F[/login にリダイレクト]
    E -->|Yes| G{JWT 有効？}
    G -->|Yes| C
    G -->|No| H[Cookie 削除 + /login]

    style C fill:#e8f5e9
    style F fill:#ffebee
    style H fill:#ffebee
```

> **なぜ middleware で `session.ts` を import しない？** middleware は Edge Runtime で動くため、`cookies()` を使う `session.ts` は import できません。`jose` を直接使って JWT 検証します。

> **`isValidCallbackPath` の役割**: `callbackUrl` に外部 URL を仕込む Open Redirect 攻撃を防ぎます。`/` で始まり `://` を含まないパスのみ許可します。

**確認ポイント**:
- [ ] `src/middleware.ts` が作成できた（`src/app/` ではなく `src/` 直下）
- [ ] `config.matcher` でアセットファイルを除外している

**学んだこと**: Next.js の middleware はすべてのリクエストの入口で動きます。認証チェックを一箇所に集約できるのでページごとにチェックコードを書く必要がありません。

---

### Step 6: ログインして動作確認する（5分）

**ゴール**: ここまで作った認証バックエンドが実際に動くことを確認します。

開発サーバーを起動します。

```bash
npm run dev
```

> Docker が起動していること、DB スキーマとシードデータが入っていることを確認します。
> Day 01 の scaffold を正常完了していれば済んでいますが、不安なら次の2つを実行してから進んでください。

```bash
npm run db:push
npm run db:seed
```

ブラウザで `http://localhost:3000/login` を開きます。

![ログイン失敗時の表示](./screenshots/login-error.png)

**seed データのログイン情報**:

| メール | パスワード | 権限 |
|--------|-----------|------|
| `admin@example.com` | `password123` | 管理者 |

1. メールとパスワードを入力してログインボタンを押す
2. 「おかえりなさい、管理者さん」トーストが表示される
3. ダッシュボードに遷移する

![ログイン後のダッシュボード](./screenshots/dashboard.png)

**確認ポイント**:
- [ ] `npm run dev` でエラーが出ない
- [ ] ログインが成功してトーストが表示される
- [ ] ダッシュボードに遷移する

> **うまくいかないとき**: ターミナルのエラーメッセージを確認します。よくある原因は「つまずきポイント」セクションにまとめてあります。

---

### Step 7: DevTools で JWT と Cookie を確認する（5分）

**ゴール**: ブラウザに保存された JWT トークンの中身を確認し、認証ガードの動作を体験します。

#### 7-1. Cookie を確認する

1. DevTools を開く（`F12` または `Cmd+Option+I`）
2. **Application** タブ → 左メニューの **Cookies** → `http://localhost:3000`
3. `session` という名前の Cookie を見つける

| 確認項目 | 期待値 |
|---------|-------|
| Name | `session` |
| HttpOnly | チェックあり |
| SameSite | `Strict` |
| Path | `/` |

#### 7-2. JWT をデコードする

> 本番環境の JWT は絶対に外部サイトに貼り付けないでください。ここで使うのは開発環境のトークンなので問題ありません。

1. `session` Cookie の値（長い文字列）をコピー
2. ブラウザで `https://jwt.io` を開く
3. 「Encoded」欄に貼り付ける

jwt.io の Payload セクションでは、次のフィールドを確認できます。

| フィールド | 表示例 | 意味 |
|----------|--------|------|
| `userId` | `"cm..."` | ユーザー ID |
| `email` | `"admin@example.com"` | メールアドレス |
| `role` | `"ADMIN"` | 権限 |
| `exp` | `1234567890` | 有効期限（UNIX 時間、約 7 日後） |

> **UNIX 時間**: ブラウザのコンソールで `new Date(1234567890 * 1000)` と入力すると、人間が読める日時に変換できます。

#### 7-3. Cookie を削除して認証ガードを体感する

1. Application → Cookies → `session` を右クリック → **Delete**
2. ブラウザで `/dashboard` にアクセス
3. **自動的に `/login` にリダイレクトされる**

このリダイレクトが、Step 5 で作った middleware の仕事です。

4. もう一度ログインするとダッシュボードが表示される

**確認ポイント**:
- [ ] `session` Cookie が存在する
- [ ] jwt.io で userId, email, role, exp が確認できた
- [ ] Cookie 削除後に `/dashboard` が表示できなくなった
- [ ] 再ログインでダッシュボードが復活した

**学んだこと**: JWT は暗号化しません。行うのは「署名」です。中身は誰でもデコードできます。ただし改ざんすると署名が合わなくなります。

---

## Pro パターンで書こう（認証ガードは early return で道順を見せる）

Step 5 の middleware は「公開パス → tRPC → Cookie なし → JWT 無効」と early return で判定を重ねています。
この書き方を他のコードでも使ってみましょう。

### Before（改善前のコード）

```tsx
export function AuthGuard({
  authStatus,
  children,
}: {
  authStatus: 'loading' | 'guest' | 'authenticated';
  children: React.ReactNode;
}) {
  return authStatus === 'loading' ? (
    <main>セッション確認中</main>
  ) : authStatus === 'guest' ? (
    <main>ログイン画面へ移動します</main>
  ) : (
    <>{children}</>
  );
}
```

**問題点**: 条件が増えるほど `?` と `:` の対応を目で追う必要が出ます。
3 つ目の状態を足すときは、既にある入れ子のどこへ差し込むかを考えることになります。
認証ガードは、あとから「メール未確認」「権限不足」といった分岐が増えやすい場所です。
分岐を足すたびに全体を読み直す形だと、差し込む位置を 1 つ間違えただけで、通してはいけない相手を通してしまいます。

### After（プロが書くコード）

```tsx
export function AuthGuard({
  authStatus,
  children,
}: {
  authStatus: 'loading' | 'guest' | 'authenticated';
  children: React.ReactNode;
}) {
  if (authStatus === 'loading') {
    return <main>セッション確認中</main>;
  }

  if (authStatus === 'guest') {
    return <main>ログイン画面へ移動します</main>;
  }

  return <>{children}</>;
}
```

**強み**: 判定の順番が上から下へそのまま読めます。新しいガード条件を足すときも、`if` と `return` を 1 組増やすだけで済みます。

> **覚えておきたいエッセンス**: 認証ガードは分岐が増えやすい場所。三項演算子で詰め込むより、**先に返して本筋を残す**ほうが読みやすく育てやすいです。

---

## 今日のまとめ

- [ ] `src/lib/session.ts` — JWT セッション管理を作り直した
- [ ] `src/server/api/trpc.ts` — tRPC の土台を作り直した
- [ ] `src/server/api/routers/auth.ts` — 認証ルーターを作り直した
- [ ] `src/server/api/root.ts` + `route.ts` — API を繋ぎ直した
- [ ] `src/middleware.ts` — ルート保護を作った
- [ ] ログインが実際に動くことを確認した
- [ ] DevTools で JWT と Cookie の中身を確認した

## つまずきポイント

| エラー/問題 | 原因 | 解決方法 |
|------------|------|---------|
| `JWT_SECRET is not set` | `.env` に JWT_SECRET がない | scaffold が自動設定するので `.env` を確認。なければ 32 文字以上の文字列を追加 |
| `Cannot find module '@/lib/session'` | ファイルパスの typo | `src/lib/session.ts` にあるか確認 |
| `Cannot find module '@/server/api/root'` | root.ts が未作成 | Step 4 の root.ts を作成 |
| ログインしてもトーストが出ない | auth ルーターが root.ts に登録されていない | root.ts で `auth: authRouter` を確認 |
| `UNAUTHORIZED: ログインが必要です` | Cookie が保存されていない | DevTools → Application → Cookies で `session` を確認 |
| `prisma.user.findUnique is not a function` | Prisma Client が生成されていない | `npx prisma generate` を実行 |
| `relation "User" does not exist` | DB にテーブルがない | `npm run db:push && npm run db:seed` を実行 |
| middleware.ts が効かない | ファイルの置き場所が違う | `src/middleware.ts`（`src/app/` ではなく `src/` 直下） |

## 次回予告

Day 08 では、サイドバー付きのアプリレイアウトを作ります。
ログアウトボタン、ユーザー情報ウィジェット、ナビゲーション——
今日作った認証バックエンドの上に、使いやすい UI を組み立てていきます。
