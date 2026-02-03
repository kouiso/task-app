# Day 15: タスク編集・削除

## 🎯 今日のゴール

既存のタスクを編集・削除できる機能を実装します。変更内容を保存し、不要なタスクを削除できるようにします。

【スクリーンショット: タスク編集画面】

## 🤔 なぜこれを作るのか?

タスク情報は常に変化します。**タスク編集は文章の推敲のようなもの**。一度書いた文章でも、後から読み返して修正することで、より正確になります。タスクも同じく、状況に応じて内容を更新することで、チームの認識を統一できます。

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | 編集ページを作成 | 10分 |
| Step 2 | 既存データの取得・表示 | 15分 |
| Step 3 | 更新処理の実装 | 15分 |
| Step 4 | 削除処理の実装 | 10分 |

**合計時間**: 約50分

---

### Step 1: 編集ページを作成（10分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[projectId]/tasks/[taskId]/edit/page.tsx
'use client';

import { useParams } from 'next/navigation';

export default function EditTaskPage() {
  const params = useParams();
  const taskId = params.taskId as string;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">タスク編集</h1>
    </div>
  );
}
```

✅ **確認ポイント**: /projects/[projectId]/tasks/[taskId]/editにアクセスできる

【スクリーンショット: 確認画面】

---

### Step 2: 既存データの取得・表示（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[projectId]/tasks/[taskId]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/trpc/react';
import { Input } from '@/component/ui/input';
import { Label } from '@/component/ui/label';
import { Loader2 } from 'lucide-react';

export default function EditTaskPage() {
  const params = useParams();
  const taskId = params.taskId as string;

  const { data: task, isLoading } = api.task.getById.useQuery({ id: taskId });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(
        task.dueDate
          ? new Date(task.dueDate).toISOString().split('T')[0]
          : ''
      );
    }
  }, [task]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">タスク編集</h1>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">タイトル *</Label>
          <Input
            id="title"
            required
            className="w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        {/* 他のフィールドも同様 */}
      </div>
    </div>
  );
}
```

✅ **確認ポイント**: タスクの既存データがフォームに表示される

【スクリーンショット: 確認画面】

---

### Step 3: 更新処理の実装（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[projectId]/tasks/[taskId]/edit/page.tsx（更新処理部分）
import { useRouter } from 'next/navigation';
import { Button } from '@/component/ui/button';

export default function EditTaskPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const projectId = params.projectId as string;
  const router = useRouter();

  const updateMutation = api.task.update.useMutation({
    onSuccess: () => {
      router.push(`/projects/${projectId}/tasks`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: taskId,
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* フィールド */}
        <Button
          type="submit"
          className="w-full"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? '更新中...' : '更新'}
        </Button>
      </form>
    </div>
  );
}
```

✅ **確認ポイント**: タスクが更新され、一覧ページに戻る

【スクリーンショット: 確認画面】

---

### Step 4: 削除処理の実装（10分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[projectId]/tasks/[taskId]/edit/page.tsx（削除処理部分）
export default function EditTaskPage() {
  const deleteMutation = api.task.delete.useMutation({
    onSuccess: () => {
      router.push(`/projects/${projectId}/tasks`);
    },
  });

  const handleDelete = () => {
    if (confirm('このタスクを削除しますか？')) {
      deleteMutation.mutate({ id: taskId });
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* フィールド */}

        <div className="flex gap-4">
          <Button
            type="submit"
            className="flex-1"
            disabled={updateMutation.isPending}
          >
            更新
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            削除
          </Button>
        </div>
      </form>
    </div>
  );
}
```

✅ **確認ポイント**: 確認ダイアログが表示され、タスクが削除される

【スクリーンショット: 確認画面】

---

## 📝 学んだこと

- **useEffect**: データ取得後にstateを初期化するタイミング制御
- **日付のフォーマット**: ISOString から YYYY-MM-DD 形式への変換
- **confirm関数**: ブラウザ標準の確認ダイアログ
- **flex レイアウト**: gap と flex-1 で横並びボタン
- **variant="destructive"**: 赤色ボタン（削除操作に適した色）

## 📋 今日のまとめ

- [ ] タスク編集ページを作成できた
- [ ] 既存データをフォームに表示できた
- [ ] 更新処理を実装できた
- [ ] 削除処理と確認ダイアログを実装できた

## ⚠️ つまずきポイント

| 問題 | 原因 | 解決策 |
|------|------|--------|
| フォームが空のまま | useEffect の依存配列に task がない | 依存配列に [task] を追加 |
| 日付がずれる | タイムゾーンの考慮不足 | split('T')[0] で日付部分のみ取得 |
| 削除が即実行される | confirm の戻り値をチェックしていない | if (confirm(...)) で確認 |

## 🔗 次回予告

Day 16では、タスクのステータス変更とタイマー機能を実装します。
