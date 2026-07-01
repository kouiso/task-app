# Next.js Pro Patterns

- target version: `next` `15.3.6`（App Router）
- last updated: `2026-04-19`
- purpose: `30日カリキュラム Before/After セクションで使う Pro パターン参照資料`

`task-app` は [`src/app/layout.tsx`](/Users/kouiso/ghq/kouiso/task-app/src/app/layout.tsx:1) を root layout にし、[`src/app/error.tsx`](/Users/kouiso/ghq/kouiso/task-app/src/app/error.tsx:1) / [`src/app/not-found.tsx`](/Users/kouiso/ghq/kouiso/task-app/src/app/not-found.tsx:1) / 各 route の `loading.tsx` を配置している。ここでは App Router の現行構成をベースに、2026-04 時点でも崩れにくい構成パターンをまとめる。

## Pattern 1: まず Server Component、必要箇所だけ Client Component に切り出す

現状の `task-app` は page 全体が client 化されている箇所も多い。教材では最初から境界を意識し、page で `redirect` や初期 data を扱い、操作部だけ client に寄せる。

### Before
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/trpc/react';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isLoading } = api.auth.getSession.useQuery();
  const { data: overview } = api.report.getOverview.useQuery();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, router, session]);

  return <pre>{JSON.stringify(overview, null, 2)}</pre>;
}
```

### After
```tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { HydrateClient, trpc } from '@/trpc/server';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  await trpc.report.getOverview.prefetch();

  return (
    <HydrateClient>
      <DashboardClient />
    </HydrateClient>
  );
}
```

### Why
- 認証 redirect と初期 data 取得を server 側へ寄せられ、初回描画が安定する。
- client bundle に不要な server ロジックを含めず、配信 JS を抑えやすい。
- page の責務が「境界」と「配線」になり、 UI 部品の見通しが良くなる。

**該当Day**: Day 05, Day 13, Day 21

## Pattern 2: `"use client"` は最小境界だけに置く

[`src/app/providers.tsx`](/Users/kouiso/ghq/kouiso/task-app/src/app/providers.tsx:1) のように entrypoint にだけ置くと、下位 import 全体が client bundle になる範囲をコントロールしやすい。

### Before
```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { QuickSearch } from '@/component/layout/quick-search';
import { UserMenu } from '@/component/layout/user-menu';

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header>
      <Link href="/dashboard">Task App</Link>
      <QuickSearch />
      <button onClick={() => setOpen((value) => !value)}>menu</button>
      {open ? <UserMenu /> : null}
    </header>
  );
}
```

### After
```tsx
import Link from 'next/link';
import { HeaderMenuButton } from './header-menu-button';
import { QuickSearch } from '@/component/layout/quick-search';

export default function Header() {
  return (
    <header className="flex items-center gap-4">
      <Link href="/dashboard">Task App</Link>
      <QuickSearch />
      <HeaderMenuButton />
    </header>
  );
}
```

```tsx
'use client';

import { useState } from 'react';
import { UserMenu } from '@/component/layout/user-menu';

export function HeaderMenuButton() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setOpen((value) => !value)}>menu</button>
      {open ? <UserMenu /> : null}
    </div>
  );
}
```

### Why
- `"use client"` を付けたファイル配下の import まで client 扱いになるため、境界は狭いほど良い。
- Server Component のまま残せる部分が増え、キャッシュや streaming を活かしやすい。
- UI の interactive 部分だけ独立し、再利用や単体差し替えが容易になる。

**該当Day**: Day 08, Day 26

## Pattern 3: `loading.tsx` / `error.tsx` / `not-found.tsx` を route 単位で置く

`task-app` には root の `error.tsx`、各 route の `loading.tsx`、global の `not-found.tsx` がすでにある。Day 26 で「後付け」ではなく、機能単位で最初から置く方が整う。

### Before
```tsx
import { unstable_noStore } from 'next/cache';

export default async function ProjectPage() {
  unstable_noStore();

  try {
    const projects = await fetch('http://localhost:3000/api/projects').then((res) => res.json());
    return <pre>{JSON.stringify(projects, null, 2)}</pre>;
  } catch {
    return <p>読み込みに失敗しました</p>;
  }
}
```

### After
```tsx
import { notFound } from 'next/navigation';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = id === 'missing' ? null : { id, name: 'Task App' };

  if (!project) {
    notFound();
  }

  return <h1>{project.name}</h1>;
}
```

```tsx
export default function Loading() {
  return <p>プロジェクトを読み込み中...</p>;
}
```

```tsx
'use client';

export default function ErrorPage({
  reset,
}: {
  reset: () => void;
}) {
  return <button onClick={reset}>再試行</button>;
}
```

```tsx
import Link from 'next/link';

export default function NotFoundPage() {
  return <Link href="/project">プロジェクト一覧へ戻る</Link>;
}
```

### Why
- 読み込み・例外・404 の責務を route convention に預けられる。
- page 内で `try/catch + if loading` を抱え込まず、UI の責務が単純になる。
- nested route ごとに別の fallback を持てるため、部分失敗に強い。

**該当Day**: Day 09, Day 13, Day 26

## Pattern 4: ページタイトルと説明は `metadata` / `generateMetadata` で定義する

[`src/app/layout.tsx`](/Users/kouiso/ghq/kouiso/task-app/src/app/layout.tsx:13) は静的 metadata を使っている。詳細ページや user ページでは `generateMetadata` に切ると教材としても理解しやすい。

### Before
```tsx
'use client';

import { useEffect } from 'react';

export default function UserPage() {
  useEffect(() => {
    document.title = 'ユーザー一覧 | Task App';
  }, []);

  return <h1>ユーザー一覧</h1>;
}
```

### After
```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ユーザー一覧 | Task App',
  description: '管理者向けのユーザー管理ページ',
};

export default function UserPage() {
  return <h1>ユーザー一覧</h1>;
}
```

### Why
- head 情報を Component の副作用から切り離せる。
- Server Component 専用 API なので、初回 HTML から metadata が安定する。
- layout と page の metadata を階層的に整理できる。

**該当Day**: Day 24, Day 29

## Pattern 5: モーダル詳細は parallel routes を前提に設計する

`task-app` は現在 query string + dialog で詳細表示している。Day 27 や Day 29 では、App Router らしく URL を持つ modal を parallel route で設計するのが長期的に強い。

### Before
```tsx
'use client';

import { useState } from 'react';

export default function TaskPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  return (
    <>
      <button onClick={() => setSelectedTaskId('task_1')}>詳細</button>
      {selectedTaskId ? <div role="dialog">task_1 の詳細</div> : null}
    </>
  );
}
```

### After
```tsx
import Link from 'next/link';

export default function TaskPage() {
  return <Link href="/task/task_1">詳細</Link>;
}
```

```tsx
export default function TaskModalDefault() {
  return null;
}
```

```tsx
import { Dialog, DialogContent } from '@/component/ui/dialog';

export default function TaskModal({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Dialog defaultOpen>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}
```

### Why
- modal にも URL を持たせられるため、直リンク・戻る操作・更新時の挙動が自然になる。
- slot ごとに `default.tsx` / `loading.tsx` / `error.tsx` を分離できる。
- page 遷移と overlay 表示を同じ App Router の規約に揃えられる。

**該当Day**: Day 27, Day 29

## Pattern 6: mutation 後の再取得は `revalidatePath` より `revalidateTag` を優先し、パス確定時だけ `revalidatePath`

2026-04 時点の Next.js では tag ベース再検証がより精密。`task-app` は今 client invalidation 中心だが、Server Actions を導入する日にはこの判断軸が必要。

### Before
```ts
'use server';

import { revalidatePath } from 'next/cache';

export async function updateProjectName(projectId: string, name: string) {
  await Promise.resolve({ projectId, name });
  revalidatePath('/dashboard');
  revalidatePath('/project');
  revalidatePath(`/project/${projectId}`);
}
```

### After
```ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateProjectName(projectId: string, name: string) {
  await Promise.resolve({ projectId, name });
  revalidateTag('projects', 'max');
  revalidateTag(`project:${projectId}`, 'max');
  revalidatePath(`/project/${projectId}`);
}
```

### Why
- tag で横断データをまとめて再検証でき、過剰な path invalidation を減らせる。
- 詳細ページの read-your-own-writes が必要な箇所だけ `revalidatePath` を追加できる。
- dashboard / list / detail の関係を整理しやすい。

**該当Day**: Day 23, Day 25, Day 27

## Pattern 7: layout で共有 UI を持ち、page は内容だけにする

`task-app` は現在 `AppLayout` を各 page で呼んでいる。App Router では route group layout に上げると、sidebar と header を 1 回だけ定義できる。

### Before
```tsx
import { AppLayout } from '@/component/layout/app-layout';

export default function ReportPage() {
  return (
    <AppLayout>
      <h1>レポート</h1>
    </AppLayout>
  );
}
```

### After
```tsx
import { AppLayout } from '@/component/layout/app-layout';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
```

```tsx
export default function ReportPage() {
  return <h1>レポート</h1>;
}
```

### Why
- 共通ラッパーの重複を消し、page の責務を画面固有部分に限定できる。
- layout 境界で loading / error / metadata を共有しやすい。
- 認証済みページ群を route group ごとにまとめられる。

**該当Day**: Day 08, Day 21, Day 24

## 適用マトリクス

| Pattern | Day |
|---|---|
| Server Component を基準にする | Day 05, Day 13, Day 21 |
| `"use client"` を最小化する | Day 08, Day 26 |
| `loading.tsx` / `error.tsx` / `not-found.tsx` を置く | Day 09, Day 13, Day 26 |
| metadata API を使う | Day 24, Day 29 |
| parallel routes でモーダルを設計する | Day 27, Day 29 |
| `revalidateTag` と `revalidatePath` を使い分ける | Day 23, Day 25, Day 27 |
| layout に共有 UI を寄せる | Day 08, Day 21, Day 24 |
