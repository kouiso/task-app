# Day 18: コメント投稿を実装しよう

## 🎯 今日のゴール

タスクに対してコメントを投稿できる機能を実装します。コメント履歴を表示し、新しいコメントを追加できるようにします。

【スクリーンショット: コメントセクション】

## 🤔 なぜこれを作るのか?

タスクの進捗や課題を共有するコミュニケーション機能です。**コメントは付箋のようなもの**。ノートに付箋を貼って補足情報を書き足すように、タスクにコメントを追加することで、背景情報や議論の履歴を残せます。後から見返したときに「なぜこうなったか」が分かります。

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | コメント一覧表示 | 15分 |
| Step 2 | コメント投稿フォーム | 15分 |
| Step 3 | コメント投稿API呼び出し | 10分 |
| Step 4 | リアルタイム更新 | 10分 |

**合計時間**: 約50分

---

### Step 1: コメント一覧表示（15分）

💻 **実装**:

```typescript
// filepath: src/component/task/TaskComments.tsx
'use client';

import { api } from '@/trpc/react';
import { Avatar, AvatarFallback } from '@/component/ui/avatar';
import { Card, CardContent } from '@/component/ui/card';
import { Loader2 } from 'lucide-react';

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { data: comments, isLoading } = api.comment.getByTask.useQuery({
    taskId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">コメント</h3>
      {comments?.map((comment) => (
        <Card key={comment.id} className="mb-3">
          <CardContent className="p-4">
            <div className="flex items-center mb-2">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarFallback>{comment.user.name?.[0]}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{comment.user.name}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {new Date(comment.createdAt).toLocaleString('ja-JP')}
              </span>
            </div>
            <p className="text-sm">{comment.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

✅ **確認ポイント**: コメント一覧が表示される

【スクリーンショット: 確認画面】

---

### Step 2: コメント投稿フォーム（15分）

💻 **実装**:

```typescript
// filepath: src/component/task/TaskComments.tsx（フォーム追加）
import { useState } from 'react';
import { Button } from '@/component/ui/button';
import { Textarea } from '@/component/ui/textarea';

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('コメント投稿:', content);
    setContent('');
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">コメント</h3>

      {/* コメント一覧 */}
      {comments?.map((comment) => (
        <Card key={comment.id} className="mb-3">
          {/* 既存のコメント表示 */}
        </Card>
      ))}

      {/* 投稿フォーム */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit}>
            <Textarea
              placeholder="コメントを入力..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="mb-3"
            />
            <Button type="submit" disabled={!content.trim()}>
              投稿
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

✅ **確認ポイント**: コメント入力フォームが表示される

【スクリーンショット: 確認画面】

---

### Step 3: コメント投稿API呼び出し（10分）

💻 **実装**:

```typescript
// filepath: src/component/task/TaskComments.tsx（API連携部分）
export function TaskComments({ taskId }: TaskCommentsProps) {
  const [content, setContent] = useState('');

  const createCommentMutation = api.comment.create.useMutation({
    onSuccess: () => {
      setContent('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createCommentMutation.mutate({
      taskId,
      content: content.trim(),
    });
  };

  return (
    // UI は同じ
    <Button
      type="submit"
      disabled={!content.trim() || createCommentMutation.isPending}
    >
      {createCommentMutation.isPending ? '投稿中...' : '投稿'}
    </Button>
  );
}
```

✅ **確認ポイント**: コメントが投稿される

【スクリーンショット: 確認画面】

---

### Step 4: リアルタイム更新（10分）

💻 **実装**:

```typescript
// filepath: src/component/task/TaskComments.tsx（キャッシュ更新部分）
export function TaskComments({ taskId }: TaskCommentsProps) {
  const utils = api.useUtils();

  const { data: comments } = api.comment.getByTask.useQuery({ taskId });

  const createCommentMutation = api.comment.create.useMutation({
    onSuccess: () => {
      setContent('');
      utils.comment.getByTask.invalidate({ taskId });
    },
  });

  return (
    // UI は同じ
  );
}
```

✅ **確認ポイント**: 投稿後すぐに新しいコメントが表示される

【スクリーンショット: 確認画面】

---

## 📝 学んだこと

- **Avatar コンポーネント**: ユーザーアイコン表示（イニシャル表示）
- **Card コンポーネント**: カード風の背景
- **toLocaleString**: 日時を日本語フォーマットで表示
- **trim()**: 前後の空白を削除してバリデーション
- **invalidate()**: tRPCキャッシュを無効化して再取得

## 📋 今日のまとめ

- [ ] コメント一覧を表示できた
- [ ] コメント投稿フォームを実装できた
- [ ] コメント投稿APIを呼び出せた
- [ ] リアルタイムで更新されるようにした

## ⚠️ つまずきポイント

| 問題 | 原因 | 解決策 |
|------|------|--------|
| コメントが空でも投稿できる | trim() でチェックしていない | !content.trim() で無効化 |
| 投稿後にリストが更新されない | キャッシュが残っている | invalidate() でキャッシュクリア |
| 日時がUTC表示になる | toLocaleString のロケール未指定 | 'ja-JP' を引数に渡す |

## 🔗 次回予告

Day 19では、コメントの編集・削除機能を実装します。
