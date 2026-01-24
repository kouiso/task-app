# Day 07: Week 1 復習・ダッシュボード基礎実装

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **Week 1の全知識を統合する** | 開発実践 | ✅ 環境〜認証まで説明できる |
| **簡易ダッシュボードを実装する** | UI実装 | ✅ タスク一覧を表示できる |
| **開発フローを習得する** | 日常業務 | ✅ 新機能開発の流れを経験 |

## 💼 なぜこれを学ぶのか?

**Week 1で学んだすべてを実践します**。実は、タスク管理アプリの核となる「タスク一覧の表示」は、Days 1-6で学んだ技術を組み合わせるだけで実装できます。

- **ルーティング**: Day 2で学んだ
- **UI**: Day 4で学んだ
- **データベース**: Day 3・5で学んだ
- **認証**: Day 6で学んだ

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | ダッシュボードレイアウト | 2ステップ | 25分 |
| **Part 2** | タスク一覧取得・表示 | 2ステップ | 20分 |
| **Part 3** | Week 1統合テスト | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: ダッシュボードレイアウト(25分)

#### Step 1.1: ダッシュボードページのレイアウトを作成(所要時間:12分)

**このステップで学ぶこと**: 認証済みユーザーのメインページ。

**なぜ必要?**: ダッシュボードは、認証後の中心となるページです。ナビゲーション、サイドバー、メインコンテンツ領域を配置します。

**コードの仕組み解説**:

```typescript
// filepath: src/app/dashboard/layout.tsx
import { AppLayout } from '@/component/layout/app-layout';
import { DashboardNav } from '@/component/layout/dashboard-nav';
import { Box } from '@mui/material';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* サイドバー */}
        <Box
          sx={{
            width: 240,
            bgcolor: 'primary.main',
            color: 'white',
            padding: 2,
            boxShadow: 1,
          }}
        >
          <DashboardNav />
        </Box>

        {/* メインコンテンツ */}
        <Box
          sx={{
            flex: 1,
            padding: 3,
            bgcolor: '#f5f5f5',
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </AppLayout>
  );
}
```

**レイアウト構造**:
```
┌─────────────────────────────┐
│        AppLayout            │ ← Day 6の認証チェック
├──────────┬──────────────────┤
│ NavBar   │   Main Content   │
│ (240px)  │  (flex: 1)       │
├──────────┼──────────────────┤
│ Tasks    │  {children}      │
│ Projects │                  │
│ Settings │                  │
└──────────┴──────────────────┘
```

---

#### Step 1.2: ナビゲーション・コンポーネント(所要時間:13分)

**このステップで学ぶこと**: MUIコンポーネント(List, ListItem)での navigation。

**なぜ必要?**: ユーザーが「タスク」「プロジェクト」「設定」など、異なるセクションへ簡単に移動できるようにします。

**コードの仕組み解説**:

```typescript
// filepath: src/components/layout/dashboard-nav.tsx
'use client';

import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import {
  Dashboard,
  CheckCircle,
  Folder,
  Settings,
  Logout,
} from '@mui/icons-material';
import Link from 'next/link';
import { api } from '@/trpc/react';

export function DashboardNav() {
  const logout = api.auth.logout.useMutation();

  const handleLogout = async () => {
    await logout.mutateAsync();
    window.location.href = '/login';
  };

  const navItems = [
    { href: '/dashboard', label: 'ダッシュボード', icon: Dashboard },
    { href: '/dashboard/tasks', label: 'タスク', icon: CheckCircle },
    { href: '/dashboard/projects', label: 'プロジェクト', icon: Folder },
    { href: '/dashboard/settings', label: '設定', icon: Settings },
  ];

  return (
    <>
      <Typography variant='h6' sx={{ mb: 2, fontWeight: 'bold' }}>
        Task App
      </Typography>

      <List>
        {navItems.map((item) => (
          <ListItem
            key={item.href}
            component={Link}
            href={item.href}
            sx={{
              borderRadius: 1,
              mb: 1,
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <item.icon />
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />

      <ListItem
        onClick={handleLogout}
        sx={{
          borderRadius: 1,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.1)',
          },
        }}
      >
        <ListItemIcon sx={{ color: 'white' }}>
          <Logout />
        </ListItemIcon>
        <ListItemText primary='ログアウト' />
      </ListItem>
    </>
  );
}
```

**ナビゲーション機能**:
- Link を使って各ページへ遷移
- logout.mutateAsync()で Day 6のlogoutを呼び出し
- ログアウト後、ブラウザをリロード

---

### Part 2: タスク一覧の取得・表示(20分)

#### Step 2.1: タスク一覧取得APIを実装(所要時間:10分)

**このステップで学ぶこと**: 認証済みユーザーのタスクを取得するtRPCルーター。

**なぜ必要?**: セッションを確認してから、そのユーザーのタスクのみを取得します。Day 3(Prisma)+ Day 6(認証)の統合です。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

export const taskRouter = createTRPCRouter({
  // ユーザーのすべてのタスクを取得
  list: protectedProcedure.query(async ({ ctx }) => {
    const tasks = await prisma.task.findMany({
      where: {
        // 現在のユーザーが作成したタスク
        // OR 割り当てられたタスク
        OR: [
          { creatorId: ctx.session.userId },
          { assigneeId: ctx.session.userId },
        ],
      },
      include: {
        project: true,
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tasks;
  }),

  // 単一タスク取得
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await prisma.task.findUnique({
        where: { id: input.id },
        include: {
          project: true,
          creator: true,
          assignee: true,
          comments: {
            include: { author: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // 権限チェック: 本人、割り当て先、プロジェクトメンバーのみアクセス可
      if (
        task?.creatorId !== ctx.session.userId &&
        task?.assigneeId !== ctx.session.userId
      ) {
        throw new Error('このタスクにはアクセスできません');
      }

      return task;
    }),
});
```

**protectedProcedure**: ctx.session を自動的に取得。認証なしでアクセスするとエラーになります。

---

#### Step 2.2: タスク一覧をUIで表示する(所要時間:10分)

**このステップで学ぶこと**: tRPCフック + MUIテーブル・コンポーネント。

**なぜ必要?**: 取得したタスクを、わかりやすくテーブルで表示します。

**コードの仕組み解説**:

```typescript
// filepath: src/app/dashboard/tasks/page.tsx
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import { api } from '@/trpc/react';
import Link from 'next/link';
import { Add } from '@mui/icons-material';

const priorityColors: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'error',
};

const statusLabels: Record<string, string> = {
  TODO: '未開始',
  IN_PROGRESS: '進行中',
  DONE: '完了',
};

export default function TasksPage() {
  const { data: tasks, isLoading, error } = api.task.list.useQuery();

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Box>エラーが発生しました: {error.message}</Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant='h4'>タスク管理</Typography>
        <Button
          variant='contained'
          startIcon={<Add />}
          component={Link}
          href='/dashboard/tasks/new'
        >
          新規作成
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell>タスク名</TableCell>
              <TableCell>プロジェクト</TableCell>
              <TableCell>優先度</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>担当者</TableCell>
              <TableCell>期限</TableCell>
              <TableCell>アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks?.map((task) => (
              <TableRow
                key={task.id}
                sx={{
                  '&:hover': { bgcolor: '#f9f9f9' },
                  cursor: 'pointer',
                }}
              >
                <TableCell>{task.title}</TableCell>
                <TableCell>{task.project?.name || 'なし'}</TableCell>
                <TableCell>
                  <Chip
                    label={task.priority}
                    color={priorityColors[task.priority] || 'default'}
                    size='small'
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={statusLabels[task.status]}
                    variant='outlined'
                    size='small'
                  />
                </TableCell>
                <TableCell>{task.assignee?.name || '-'}</TableCell>
                <TableCell>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString('ja-JP')
                    : '-'}
                </TableCell>
                <TableCell>
                  <Button
                    size='small'
                    component={Link}
                    href={`/dashboard/tasks/${task.id}`}
                  >
                    詳細
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {tasks?.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color='textSecondary'>
            タスクがありません。新規作成から始めましょう。
          </Typography>
        </Box>
      )}
    </Box>
  );
}
```

---

### Part 3: Week 1統合テスト(15分)

#### Step 3.1: 開発フロー全体の確認(所要時間:15分)

**このステップで学ぶこと**: 環境構築から認証・表示までの全フロー。

**確認リスト**:

```bash
# 1. 環境が起動しているか確認
npm run dev
# → http://localhost:3000 でログイン画面が表示される

# 2. 新規登録フロー
# ログイン画面の「新規登録」をクリック
# メールアドレス、名前、パスワード(大文字小文字数字特殊文字)を入力
# 登録すると自動的にログイン → ダッシュボード表示

# 3. タスク一覧表示確認
# メニューの「タスク」をクリック
# タスク一覧が表示される(シード データが表示されるはず)

# 4. Prisma Studioでデータ確認
npx prisma studio
# User、Task、Projectテーブルが表示される
# ユーザーの登録情報が保存されているか確認

# 5. セッション確認
# DevTools → Application → Cookies → localhost:3000
# sessionToken があり、httpOnly = true か確認

# 6. ログアウト
# メニューの「ログアウト」をクリック
# 自動的にログイン画面にリダイレクト
# sessionToken が削除される
```

---

## ✅ 今日の成果

以下を達成したことを確認:

1. **ダッシュボード・レイアウト実装**
   - [ ] AppLayout で認証チェック
   - [ ] サイドバー表示
   - [ ] ナビゲーション機能

2. **タスク一覧表示実装**
   - [ ] protectedProcedure で認証確認
   - [ ] Prismaで該当ユーザーのタスク取得
   - [ ] MUIテーブルで表示

3. **Week 1全体統合確認**
   - [ ] 環境構築(Day 1)→ 立ち上げできる
   - [ ] ルーティング(Day 2)→ 各ページが表示される
   - [ ] Prisma(Day 3, 5)→ DB操作できる
   - [ ] MUI(Day 4)→ UIが表示される
   - [ ] 認証(Day 6)→ ログイン・ログアウトできる

---

## 📋 Week 1 完了チェックリスト

| 項目 | 完了 |
|------|------|
| 環境構築(Node.js, npm, PostgreSQL, git, env設定) | ✅ |
| Next.js App Router理解 | ✅ |
| TypeScript + Prisma基礎 | ✅ |
| Material-UIコンポーネント使用 | ✅ |
| Prisma CRUD操作 | ✅ |
| NextAuth.jsログイン認証 | ✅ |
| ダッシュボード実装 | ✅ |
| **Week 1全体** | **✅ 完了** |

---

## まとめ

Week 1では、タスク管理アプリの基礎が完成しました。

- **Day 1-3**: 技術の基本(環境・ルーティング・型)
- **Day 4-5**: UI + DB
- **Day 6-7**: 認証 + 統合

これから **Week 2(Days 8-14)** では、より実務的な開発スキル(tRPC、CRUD機能の詳細化)を学びます。

**次回(Day 8)**: Week 2開始 → tRPC深掘り編。プロシージャの詳細、エラーハンドリング、バリデーション処理を実装します。
