# Next.js idioms review (C-1/C-2/C-3)

更新日: 2026-04-17
対象: `src/app`, `src/server/api/routers`, `prisma/schema.prisma`, `src/server/api/trpc.ts`, `src/trpc/react.tsx`, `src/lib/session.ts`, `src/lib/prisma.ts`

## C-1 App Router / Next.js idioms

### 良い点

- App Router 構成には乗っている。ルートは `src/app` 配下に整理され、`layout.tsx` / `loading.tsx` / `error.tsx` / `not-found.tsx` を使う前提の構造になっている。
- API 境界は `src/app/api/trpc/[trpc]/route.ts` に集約されており、画面から直接 Prisma を叩いていない。
- `src/app/login/page.tsx`, `src/app/project/page.tsx`, `src/app/search/page.tsx`, `src/app/task/page.tsx` など、`useSearchParams()` を使うページは `Suspense` でラップしており、App Router の制約は踏んでいる。
- `src/app/page.tsx` は server component に整理され、`getSession()` + `redirect()` で root redirect をサーバー側へ移せた。

### 観測された癖

- 実質的には「App Router の殻 + 広い client rendering」に近い。`src/app` の `page.tsx` の大半が `'use client'` で、データ取得も `api.*.useQuery()` に寄っている。
- root の `force-dynamic` は削除済みで、全体動的化の悪影響は一段減った。ただし画面単位ではまだ client-first が強い。

### anti-pattern

- Fixed: root layout の `force-dynamic` は除去済み。
- Fixed: root の client redirect は server redirect に置き換え済み。
- Found: 画面単位で `'use client'` が多く、Server Component をほぼ活用していない。
- Absent: Pages Router との混在、App Router 外からの直 Prisma 参照、API 境界の分散は見当たらない。

### 重要ギャップ

- 最重要: `dashboard` / `report` / `project` / `task` が server-first ではなく client-first なので、初期表示性能と Next.js idiom の整合性がまだ弱い。
- 次点: `user/[id]` など詳細画面が route-level `notFound()` を使わず、画面内分岐に留まっている。

## C-2 use client 最小化 / loading-error-not-found

### use client の状況

- `src/app/providers.tsx` だけでなく、`src/app/page.tsx`, `dashboard/page.tsx`, `project/page.tsx`, `task/page.tsx`, `search/page.tsx`, `report/page.tsx`, `report/weekly/page.tsx`, `user/page.tsx`, `user/[id]/page.tsx`, `profile/*` など主要ページが広く client component 化されている。
- `AppLayout` 配下で一覧取得、集計、URL 同期、ダイアログ制御まで 1 ファイルに抱えるページが多い。特に `project/page.tsx`, `task/page.tsx`, `search/page.tsx` は責務が大きい。

### loading / error / not-found coverage

- `loading.tsx` がある: `dashboard`, `my-task`, `project`, `report`, `search`, `task`
- `error.tsx` がある: ルート全体、`project`, `task`
- `not-found.tsx` がある: ルート全体のみ

### 評価

- `loading.tsx` は一部ルートで整備されているが、`login`, `register`, `profile`, `user`, `user/[id]`, `about`, `report/weekly` にはセグメント専用 loading がない。
- `error.tsx` は局所的で、主要 CRUD 画面の一部にしかない。`search`, `report`, `user`, `profile` では query failure を toast や条件分岐で吸収しており、ルート error boundary に寄せ切れていない。
- `not-found` は `src/app/not-found.tsx` のみで、`user/[id]` や `project` / `task` の詳細分岐は `notFound()` を使わず画面内メッセージに留まる。

### anti-pattern

- Found: client page 内で `isLoading` を見て `PageLoadingSpinner` を返す実装が多く、`loading.tsx` と役割が二重化している。
- Found: 取得失敗時に route-level error boundary ではなく toast + 画面残留で済ませるページが多い。
- Absent: `use client` の乱用はあるが、Server Component 内で client-only hook を誤用している箇所は見当たらない。

### 重要ギャップ

- 最重要: `user/[id]` など識別子依存の画面が `notFound()` を使っておらず、App Router の標準導線に乗っていない。
- 次点: route `loading.tsx` があるのに、各 page でも独自 spinner を返していて責務が散っている。

## C-3 tRPC / Prisma design

### 良い点

- `src/server/api/trpc.ts` の `protectedProcedure` / `adminProcedure` で認証・認可の入口は明確。
- `src/server/api/routers/_helpers/permission.ts` と `select.ts` で、権限確認と select 断片をある程度共通化している。
- 入力検証は各 router で zod を使っており、`cuid`, `datetime`, enum など最低限の型境界は守れている。
- `src/lib/prisma.ts` は singleton 化されており、開発時の PrismaClient 多重生成を避けている。
- `src/lib/session.ts` の cookie は `httpOnly` / `sameSite: 'strict'` / `secure` 条件付きで、JWT payload も型ガードしている。
- Prisma schema は relation が素直で、`Task` に必要な index も入っている。

### 設計上の観測

- router は「thin controller」ではなく、query 組み立てと権限分岐をそれぞれの router に多く持つ構成。
- `taskRouter`, `projectRouter`, `userRouter` で `updateData` の組み立てや `findUnique -> 権限確認 -> update/delete` の反復が多い。
- フロントは `src/trpc/react.tsx` で React Query + `httpBatchLink` を使う素直な構成。`staleTime` はあるが、server-side prefetch/hydration は未使用。

### anti-pattern

- Found: `dashboard/page.tsx` と `report/page.tsx` が client 側で `task.getAll` / `project.getAll` の全件に近いデータを取得し、集計までブラウザで行っている。集計 API か Server Component に寄せた方が自然。
- Found: `src/lib/session.ts` の `decrypt()` で `console.error` を直接出しており、運用ノイズになりやすい。
- Found: bulk 系や複数段階更新に `$transaction` は使っていない。現状の単純性では破綻していないが、整合性を強く要求する操作には余地がある。
- Absent: App 層から Prisma を直接 import する破綻、認可なし mutation、zod 未検証の生入力処理は目立っていない。

### 重要ギャップ

- 最重要: 集計・レポート用途の読み取りが client 集中で、tRPC が「画面用 CRUD transport」に寄りすぎている。Next.js + tRPC + Prisma の組み合わせとしては server-side 集計 endpoint / RSC 活用が弱い。
- 次点: router ごとの権限制御は成立しているが、重複ロジックが増えており、将来的な仕様変更で不整合が入りやすい。

## 総評

- C-1: App Router は採用しているが、実態は client-first。Next.js idiom の活用度は中程度。
- C-2: `use client` は最小化できていない。`loading/error/not-found` は部分整備で、標準導線の使い切りには届いていない。
- C-3: tRPC/Prisma の基本設計は堅実。認証・認可・型境界は比較的良い。一方で、集計の置き場所と router 重複は今後の主要負債になりうる。
