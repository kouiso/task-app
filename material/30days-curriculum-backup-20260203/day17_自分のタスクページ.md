# Day 17: 自分のタスクページを作ろう

## 🎯 今日のゴール

ログイン中のユーザーに割り当てられたタスクだけを表示する「マイタスク」ページを実装します。

【スクリーンショット: マイタスクページ】

## 🤔 なぜこれを作るのか?

複数のプロジェクトに参加していると、自分が何をすべきか分からなくなります。**マイタスクは個人の受信トレイのようなもの**。メールボックスに自分宛のメールだけが届くように、マイタスクには自分が担当するタスクだけが表示されます。これで「今日何をすべきか」が一目でわかります。

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | マイタスクページ作成 | 10分 |
| Step 2 | セッションから自分のIDを取得 | 15分 |
| Step 3 | 自分のタスクを取得 | 15分 |
| Step 4 | プロジェクト名も表示 | 10分 |

**合計時間**: 約50分

---

### Step 1: マイタスクページ作成（10分）

💻 **実装**:

```typescript
// filepath: src/app/my-tasks/page.tsx
'use client';

import { Box, Typography } from '@mui/material';

export default function MyTasksPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">マイタスク</Typography>
    </Box>
  );
}
```

✅ **確認ポイント**: /my-tasksにアクセスして「マイタスク」が表示される

【スクリーンショット: 確認画面】

---

### Step 2: セッションから自分のIDを取得（15分）

💻 **実装**:

```typescript
// filepath: src/app/my-tasks/page.tsx（パート1/2）
import { useSession } from 'next-auth/react';
import { CircularProgress } from '@mui/material';

export default function MyTasksPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session?.user?.id) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>ログインしてください</Typography>
      </Box>
    );
  }

  return (
```

```typescript
// filepath: src/app/my-tasks/page.tsx（パート2/2）
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">マイタスク</Typography>
      <Typography variant="body2" color="text.secondary">
        {session.user.name} さんのタスク
      </Typography>
    </Box>
  );
}
```

✅ **確認ポイント**: ログインユーザー名が表示される

【スクリーンショット: 確認画面】

---

### Step 3: 自分のタスクを取得（15分）

💻 **実装**:

```typescript
// filepath: src/app/my-tasks/page.tsx（パート1/3）
import { api } from '@/trpc/react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';

export default function MyTasksPage() {
  const { data: session } = useSession();

  const { data: tasks, isLoading } = api.task.getMyTasks.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  if (isLoading) {
    return <CircularProgress />;
  }
```

```typescript
// filepath: src/app/my-tasks/page.tsx（パート2/3）

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>マイタスク</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>タイトル</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>優先度</TableCell>
              <TableCell>期限</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks?.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.title}</TableCell>
                <TableCell>
                  <Chip label={task.status} size="small" />
                </TableCell>
                <TableCell>{task.priority}</TableCell>
                <TableCell>
```

```typescript
// filepath: src/app/my-tasks/page.tsx（パート3/3）
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString('ja-JP')
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
```

✅ **確認ポイント**: 自分に割り当てられたタスクだけが表示される

【スクリーンショット: 確認画面】

---

### Step 4: プロジェクト名も表示（10分）

💻 **実装**:

```typescript
// filepath: src/app/my-tasks/page.tsx（パート1/2）
export default function MyTasksPage() {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>プロジェクト</TableCell>
            <TableCell>タイトル</TableCell>
            <TableCell>ステータス</TableCell>
            <TableCell>優先度</TableCell>
            <TableCell>期限</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks?.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <Chip
                  label={task.project.name}
                  size="small"
                  sx={{ bgcolor: task.project.color, color: 'white' }}
                />
              </TableCell>
```

```typescript
// filepath: src/app/my-tasks/page.tsx（パート2/2）
              <TableCell>{task.title}</TableCell>
              <TableCell>
                <Chip label={task.status} size="small" />
              </TableCell>
              <TableCell>{task.priority}</TableCell>
              <TableCell>
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString('ja-JP')
                  : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
```

✅ **確認ポイント**: プロジェクト名がプロジェクトの色で表示される

【スクリーンショット: 確認画面】

---

## 📝 学んだこと

- **useSession**: NextAuthでログイン情報を取得
- **enabled オプション**: tRPCクエリの実行タイミングを制御
- **リレーションデータ**: task.project.name のようにネストしたデータにアクセス
- **sx prop でスタイル**: bgcolor と color で動的に色を設定
- **条件付きレンダリング**: session の有無で表示を切り替え

## 📋 今日のまとめ

- [ ] マイタスクページを作成できた
- [ ] セッションから自分のIDを取得できた
- [ ] 自分のタスクだけを取得・表示できた
- [ ] プロジェクト名も表示できた

## ⚠️ つまずきポイント

| 問題 | 原因 | 解決策 |
|------|------|--------|
| タスクが全件表示される | クエリで絞り込んでいない | getMyTasks API で assigneeId でフィルタ |
| ログイン前にエラー | session が undefined のまま実行 | enabled: !!session?.user?.id で制御 |
| プロジェクト名が表示されない | リレーションを include していない | Prisma クエリで include: { project: true } |

## 🔗 次回予告

Day 18では、タスクにコメントを投稿する機能を実装します。
