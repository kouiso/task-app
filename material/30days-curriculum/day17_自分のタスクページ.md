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

export default function MyTasksPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">マイタスク</h1>
    </div>
  );
}
```

✅ **確認ポイント**: /my-tasksにアクセスして「マイタスク」が表示される

【スクリーンショット: 確認画面】

---

### Step 2: セッションから自分のIDを取得（15分）

💻 **実装**:

```typescript
// filepath: src/app/my-tasks/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

export default function MyTasksPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">ログインしてください</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">マイタスク</h1>
      <p className="text-sm text-muted-foreground">
        {session.user.name} さんのタスク
      </p>
    </div>
  );
}
```

✅ **確認ポイント**: ログインユーザー名が表示される

【スクリーンショット: 確認画面】

---

### Step 3: 自分のタスクを取得（15分）

💻 **実装**:

```typescript
// filepath: src/app/my-tasks/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/component/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/component/ui/table';

export default function MyTasksPage() {
  const { data: session } = useSession();

  const { data: tasks, isLoading } = api.task.getMyTasks.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">マイタスク</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>優先度</TableHead>
              <TableHead>期限</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks?.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.title}</TableCell>
                <TableCell>
                  <Badge>{task.status}</Badge>
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
      </div>
    </div>
  );
}
```

✅ **確認ポイント**: 自分に割り当てられたタスクだけが表示される

【スクリーンショット: 確認画面】

---

### Step 4: プロジェクト名も表示（10分）

💻 **実装**:

```typescript
// filepath: src/app/my-tasks/page.tsx（プロジェクト名追加）
export default function MyTasksPage() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>プロジェクト</TableHead>
            <TableHead>タイトル</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>優先度</TableHead>
            <TableHead>期限</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks?.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <Badge
                  style={{ backgroundColor: task.project.color }}
                  className="text-white"
                >
                  {task.project.name}
                </Badge>
              </TableCell>
              <TableCell>{task.title}</TableCell>
              <TableCell>
                <Badge>{task.status}</Badge>
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
    </div>
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
- **style prop**: 動的な色をインラインスタイルで設定
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
