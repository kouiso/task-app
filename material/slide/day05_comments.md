---
marp: true
theme: default
class:
  - lead
  - invert
paginate: true
header: 'Day 5: 💬 コメント機能の実装'
footer: 'Next.js 15 + TypeScript Task Management App'
---

# Day 5: 💬 コメント機能の実装
## Real-time Comments with React Query v5

タスクへのコメント機能を実装し、チームコラボレーションを実現しよう

---

## 🎯 **今日の学習目標**

### 📚 **技術習得目標**
- **React Query v5** でのリアルタイム同期
- **Material-UI** でのインタラクティブUI作成
- **Next.js App Router** でのAPIルート実装
- **Prisma** でのリレーション操作

### 🚀 **実装目標**
- コメントのCRUD操作
- リアルタイム更新機能
- 権限ベースの編集・削除
- レスポンシブなコメントUI

---

## 📋 **完成イメージ**

```typescript
// 完成後の機能
✅ コメント投稿・表示
✅ リアルタイム更新（30秒間隔）
✅ コメント編集・削除
✅ 権限チェック（自分のコメントのみ編集可能）
✅ 相対時間表示（「2分前」等）
✅ アバター表示・ユーザー名表示
```

---

## 🏗️ **Step 1: API Routes実装**

### コメント一覧・作成API

```typescript
// src/app/api/tasks/[taskId]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = params;

    // タスクへのアクセス権確認
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { createdById: session.user.id },
          { assigneeId: session.user.id },
        ],
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
```

---

### コメント作成処理

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = params;
    const body = await request.json();
    const { content } = body;

    // バリデーション
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        taskId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
```

---

## 🎨 **Step 2: React Query Setup**

### コメント取得フック

```typescript
// コンポーネント内での実装
const {
  data: comments = [],
  isLoading,
  error,
} = useQuery({
  queryKey: ['comments', taskId],
  queryFn: async (): Promise<Comment[]> => {
    const response = await fetch(`/api/tasks/${taskId}/comments`);
    if (!response.ok) {
      throw new Error('Failed to fetch comments');
    }
    return response.json();
  },
  refetchInterval: 30000, // 🔄 30秒ごとの自動更新
});
```

### コメント作成Mutation

```typescript
const createCommentMutation = useMutation({
  mutationFn: async (content: string) => {
    const response = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error('Failed to create comment');
    }
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    setNewComment(''); // フォームをクリア
  },
});
```

---

## 🧩 **Step 3: UI Components実装**

### コメント入力フォーム

```tsx
<Card sx={{ mb: 3 }}>
  <CardContent>
    <form onSubmit={handleSubmitComment}>
      <Box display="flex" gap={2}>
        <Avatar sx={{ width: 32, height: 32 }}>
          {session?.user?.name?.charAt(0)}
        </Avatar>
        <Box flex={1}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="コメントを入力..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            variant="outlined"
            size="small"
          />
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              startIcon={<Send />}
              disabled={!newComment.trim() || createCommentMutation.isPending}
              size="small"
            >
              {createCommentMutation.isPending ? '投稿中...' : '投稿'}
            </Button>
          </Box>
        </Box>
      </Box>
    </form>
  </CardContent>
</Card>
```

---

### コメント表示コンポーネント

```tsx
{comments.map((comment, index) => (
  <Card key={comment.id} variant="outlined" sx={{ mb: 2 }}>
    <CardContent>
      <Box display="flex" gap={2}>
        <Avatar sx={{ width: 32, height: 32 }}>
          {comment.user.name?.charAt(0)}
        </Avatar>
        <Box flex={1}>
          <Box display="flex" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {comment.user.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dayjs(comment.createdAt).fromNow()}
                {comment.updatedAt !== comment.createdAt && ' (編集済み)'}
              </Typography>
            </Box>
            {canEditComment(comment) && (
              <IconButton size="small" onClick={(e) => handleMenuClick(e, comment.id)}>
                <MoreVert />
              </IconButton>
            )}
          </Box>

          <Typography variant="body2" mt={1} sx={{ whiteSpace: 'pre-wrap' }}>
            {comment.content}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
))}
```

---

## ⚡ **Step 4: リアルタイム機能**

### 自動更新の設定

```typescript
// React Queryの設定でリアルタイム同期
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,  // ウィンドウフォーカス時に更新
      refetchOnReconnect: true,    // 再接続時に更新
      staleTime: 30000,            // 30秒でデータを古いとみなす
    },
  },
});

// コンポーネントでの設定
useQuery({
  queryKey: ['comments', taskId],
  queryFn: fetchComments,
  refetchInterval: 30000,          // 30秒ごとの定期更新
});
```

### キャッシュ無効化による即座の更新

```typescript
// コメント作成・更新・削除後の処理
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
  // 関連するキャッシュも更新
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
},
```

---

## 🔐 **Step 5: 権限管理**

### 編集権限チェック

```typescript
const canEditComment = (comment: Comment) => {
  return session?.user?.id === comment.user.id;
};

// 管理者権限も考慮する場合
const canDeleteComment = (comment: Comment) => {
  return (
    session?.user?.id === comment.user.id ||
    session?.user?.role === 'ADMIN' ||
    comment.task.createdById === session?.user?.id
  );
};
```

### UI での権限制御

```tsx
{canEditComment(comment) && (
  <IconButton
    size="small"
    onClick={(e) => handleMenuClick(e, comment.id)}
  >
    <MoreVert />
  </IconButton>
)}

<Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
  <MenuItem onClick={() => handleEditComment(selectedComment)}>
    <Edit fontSize="small" sx={{ mr: 1 }} />
    編集
  </MenuItem>
  <MenuItem onClick={() => setDeleteDialogOpen(true)}>
    <Delete fontSize="small" sx={{ mr: 1 }} />
    削除
  </MenuItem>
</Menu>
```

---

## 🚀 **実践演習**

### 📝 **演習 1: 基本的なコメント機能実装**

1. **API Routes作成**
   ```bash
   # 以下のファイルを作成してください
   src/app/api/tasks/[taskId]/comments/route.ts
   src/app/api/tasks/[taskId]/comments/[commentId]/route.ts
   ```

2. **コンポーネント作成**
   ```bash
   src/components/TaskComments.tsx
   ```

3. **動作確認**
   - コメントの投稿
   - コメントの表示
   - リアルタイム更新の確認

---

### 📝 **演習 2: 編集・削除機能の実装**

```typescript
// コメント編集状態の管理
const [editingComment, setEditingComment] = useState<string | null>(null);
const [editContent, setEditContent] = useState('');

// 編集開始
const handleEditComment = (comment: Comment) => {
  setEditingComment(comment.id);
  setEditContent(comment.content);
  setAnchorEl(null);
};

// 編集完了
const handleUpdateComment = async () => {
  if (!editingComment || !editContent.trim()) return;

  updateCommentMutation.mutate({
    commentId: editingComment,
    content: editContent.trim(),
  });
};
```

---

### 📝 **演習 3: エラーハンドリング強化**

```typescript
// エラー状態の表示
if (error) {
  return (
    <Box textAlign="center" py={4}>
      <Typography color="error">
        コメントの読み込みに失敗しました
      </Typography>
      <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['comments', taskId] })}>
        再試行
      </Button>
    </Box>
  );
}

// 楽観的更新（オプション）
const createCommentMutation = useMutation({
  mutationFn: createComment,
  onMutate: async (newCommentContent) => {
    // キャンセル進行中のクエリ
    await queryClient.cancelQueries({ queryKey: ['comments', taskId] });

    // 以前の値を保存
    const previousComments = queryClient.getQueryData(['comments', taskId]);

    // 楽観的に更新
    const optimisticComment = {
      id: 'temp-' + Date.now(),
      content: newCommentContent,
      user: session.user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    queryClient.setQueryData(['comments', taskId], (old: Comment[] = []) => [
      optimisticComment,
      ...old,
    ]);

    return { previousComments };
  },
  onError: (err, newComment, context) => {
    queryClient.setQueryData(['comments', taskId], context?.previousComments);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
  },
});
```

---

## 🎓 **学習ポイントまとめ**

### 1. **React Query v5 の活用**
- `useQuery` でのデータ取得
- `useMutation` でのデータ変更
- `refetchInterval` でのリアルタイム同期
- キャッシュ無効化による即座の更新

### 2. **Material-UI コンポーネント活用**
- `Card`, `Avatar`, `Menu` の組み合わせ
- `Dialog` での確認ダイアログ
- レスポンシブデザインの実装

### 3. **Next.js App Router API実装**
- Dynamic Route での パラメータ取得
- セッション管理とセキュリティ
- エラーハンドリングのベストプラクティス

### 4. **UX 向上のテクニック**
- 楽観的更新
- ローディング状態の表示
- エラー回復機能

---

## 🚀 **次のステップ**

### Day 6 予定: **検索・フィルタリング機能**
- 全文検索の実装
- 高度なフィルタリング
- URL パラメータとの同期
- パフォーマンス最適化

### 発展課題
- [ ] メンション機能（@ユーザー名）
- [ ] 絵文字リアクション
- [ ] ファイル添付機能
- [ ] コメント通知システム

---

## 💡 **Tips & Troubleshooting**

### よくある問題と解決法

**問題:** コメントが即座に反映されない
**解決:** `queryClient.invalidateQueries()` の呼び出しを確認

**問題:** 編集中にコンポーネントが再レンダリングされる
**解決:** 編集状態を適切に管理、キー値の設定

**問題:** 権限チェックが正しく動作しない
**解決:** セッションの型定義とAPIでの権限確認を再確認

### パフォーマンス最適化
- コメント一覧の仮想化（長いリスト対応）
- 画像レイジーローディング
- デバウンス処理の活用

---

## 🎉 **完了！**

Day 5のコメント機能実装が完了しました！

### 習得したスキル
✅ React Query v5 でのリアルタイム同期
✅ Material-UI でのインタラクティブUI
✅ Next.js App Router でのAPI実装
✅ 権限ベースの機能制御

**明日は検索・フィルタリング機能で、タスク管理をさらに便利にしていきます！** 🚀
