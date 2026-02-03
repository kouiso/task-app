# Day 19: コメント編集・削除を実装しよう

## 🎯 今日のゴール

投稿したコメントを編集・削除できる機能を実装します。自分のコメントだけに編集・削除ボタンを表示します。

【スクリーンショット: コメント編集モード】

## 🤔 なぜこれを作るのか?

誤字や情報の変更に対応するための機能です。**コメント編集は消しゴムと修正ペンのようなもの**。ノートに書いた文章を消したり書き直したりできるように、一度投稿したコメントも後から修正できると便利です。

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | 編集・削除ボタン表示 | 10分 |
| Step 2 | 編集モード切り替え | 15分 |
| Step 3 | 編集API呼び出し | 10分 |
| Step 4 | 削除API呼び出し | 10分 |

**合計時間**: 約45分

---

### Step 1: 編集・削除ボタン表示（10分）

💻 **実装**:

```typescript
// filepath: src/component/task/TaskComments.tsx
'use client';

import { useSession } from 'next-auth/react';
import { api } from '@/trpc/react';
import { Button } from '@/component/ui/button';
import { Avatar, AvatarFallback } from '@/component/ui/avatar';
import { Card, CardContent } from '@/component/ui/card';
import { Pencil, Trash2 } from 'lucide-react';

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { data: session } = useSession();
  const { data: comments } = api.comment.getByTask.useQuery({ taskId });

  return (
    <div className="mt-6">
      {comments?.map((comment) => (
        <Card key={comment.id} className="mb-3">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center mb-2">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback>{comment.user.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">{comment.user.name}</span>
              </div>

              {session?.user?.id === comment.userId && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm">{comment.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

✅ **確認ポイント**: 自分のコメントにのみ編集・削除ボタンが表示される

【スクリーンショット: 確認画面】

---

### Step 2: 編集モード切り替え（15分）

💻 **実装**:

```typescript
// filepath: src/component/task/TaskComments.tsx（編集モード部分）
import { useState } from 'react';
import { Textarea } from '@/component/ui/textarea';

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = (commentId: string, content: string) => {
    setEditingId(commentId);
    setEditContent(content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div className="mt-6">
      {comments?.map((comment) => (
        <Card key={comment.id} className="mb-3">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              {/* ヘッダー部分 */}

              {session?.user?.id === comment.userId && !editingId && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleStartEdit(comment.id, comment.content)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {editingId === comment.id ? (
              <div>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="mb-2"
                />
                <div className="flex gap-2">
                  <Button size="sm">保存</Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm">{comment.content}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

✅ **確認ポイント**: 編集ボタンで編集モードに切り替わる

【スクリーンショット: 確認画面】

---

### Step 3: 編集API呼び出し（10分）

💻 **実装**:

```typescript
// filepath: src/component/task/TaskComments.tsx（編集API部分）
export function TaskComments({ taskId }: TaskCommentsProps) {
  const utils = api.useUtils();

  const updateCommentMutation = api.comment.update.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setEditContent('');
      utils.comment.getByTask.invalidate({ taskId });
    },
  });

  const handleSaveEdit = (commentId: string) => {
    if (!editContent.trim()) return;

    updateCommentMutation.mutate({
      id: commentId,
      content: editContent.trim(),
    });
  };

  return (
    // UI は同じ
    <Button
      size="sm"
      onClick={() => handleSaveEdit(comment.id)}
      disabled={updateCommentMutation.isPending}
    >
      {updateCommentMutation.isPending ? '保存中...' : '保存'}
    </Button>
  );
}
```

✅ **確認ポイント**: コメントが更新される

【スクリーンショット: 確認画面】

---

### Step 4: 削除API呼び出し（10分）

💻 **実装**:

```typescript
// filepath: src/component/task/TaskComments.tsx（削除API部分）
export function TaskComments({ taskId }: TaskCommentsProps) {
  const deleteCommentMutation = api.comment.delete.useMutation({
    onSuccess: () => {
      utils.comment.getByTask.invalidate({ taskId });
    },
  });

  const handleDelete = (commentId: string) => {
    if (!confirm('このコメントを削除しますか?')) return;

    deleteCommentMutation.mutate({ id: commentId });
  };

  return (
    <div className="mt-6">
      {comments?.map((comment) => (
        <Card key={comment.id} className="mb-3">
          <CardContent className="p-4">
            {session?.user?.id === comment.userId && !editingId && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleStartEdit(comment.id, comment.content)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(comment.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

✅ **確認ポイント**: 確認ダイアログが表示され、コメントが削除される

【スクリーンショット: 確認画面】

---

## 📝 学んだこと

- **Button variant="ghost" size="icon"**: アイコンだけのボタン（省スペース）
- **条件付きレンダリング**: 三項演算子で編集モードと表示モードを切り替え
- **権限チェック**: session.user.id === comment.userId で本人確認
- **状態管理**: editingId で「どのコメントを編集中か」を管理
- **confirm関数**: 削除前の確認ダイアログ

## 📋 今日のまとめ

- [ ] 編集・削除ボタンを表示できた
- [ ] 編集モードに切り替えられるようにした
- [ ] 編集APIを呼び出してコメントを更新できた
- [ ] 削除APIを呼び出してコメントを削除できた

## ⚠️ つまずきポイント

| 問題 | 原因 | 解決策 |
|------|------|--------|
| 他人のコメントも編集できる | 権限チェックがない | session.user.id === comment.userId で判定 |
| 編集中に削除ボタンが表示される | 条件式に editingId を含めていない | !editingId を追加 |
| キャンセル後に内容が残る | state をクリアしていない | setEditContent('') を実行 |

## 🔗 次回予告

Day 20では、タスクの検索機能を実装します。
