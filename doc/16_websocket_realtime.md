# Day 16: リアルタイム機能・WebSocket通知

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **WebSocket 通信** | リアルタイム更新 | ✅ 複数クライアント間で同期できる |
| **新規コメント通知** | リアルタイム表示 | ✅ コメント投稿直後に全員に通知 |
| **オンライン状態表示** | プレゼンス | ✅ ユーザーのオンライン状態表示 |

## 💼 なぜこれを学ぶのか?

**HTTP はリクエスト・レスポンス型**。サーバーからの主動的な通知ができません。WebSocket を使うと、サーバーからクライアントへ「あなたのタスクにコメントがきました」と主動通知できます。

- **HTTP Polling**: 定期的にサーバーに聞く(非効率)
- **WebSocket**: サーバーが主動的に通知(効率的・リアルタイム)

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | Socket.io セットアップ | 2ステップ | 25分 |
| **Part 2** | リアルタイムコメント | 2ステップ | 20分 |
| **Part 3** | プレゼンス・オンライン状態 | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: Socket.io セットアップ(25分)

#### Step 1.1: Socket.io サーバー実装(所要時間:12分)

**このステップで学ぶこと**: Next.js での WebSocket サーバー実装。

**なぜ必要?**: クライアント同士が通信できるように、サーバーがメッセージを仲介。

**コードの仕組み解説**:

```bash
# インストール
npm install socket.io socket.io-client
```

```typescript
// filepath: src/server/socket.ts
import { Server as HTTPServer } from 'http';
import { Socket as ServerSocket, Server } from 'socket.io';
import { prisma } from '@/lib/prisma';

let io: Server | null = null;

export function initializeSocket(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: ServerSocket) => {
    const userId = socket.handshake.auth.userId;

    console.log(`[Socket] User ${userId} connected`);

    // ユーザーを "online" ルームに追加
    socket.join(`user:${userId}:online`);
    socket.join('global'); // 全ユーザー向け

    // コメント投稿イベント
    socket.on('comment:create', async (data) => {
      const { taskId, content, userId: authorId } = data;

      try {
        // コメント保存(API経由も可)
        const comment = await prisma.comment.create({
          data: {
            content,
            taskId,
            authorId,
          },
          include: {
            author: { select: { id: true, name: true, avatar: true } },
          },
        });

        // タスク関与者(作成者・割り当て先)に通知
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          select: { creatorId: true, assigneeId: true },
        });

        if (task) {
          // 関与者の全セッションに通知
          io?.to(`user:${task.creatorId}:online`).emit('comment:created', {
            comment,
            taskId,
          });

          if (task.assigneeId) {
            io?.to(`user:${task.assigneeId}:online`).emit('comment:created', {
              comment,
              taskId,
            });
          }
        }

        // クライアントへ確認
        socket.emit('comment:created:success', { comment });
      } catch (error) {
        socket.emit('error', { message: 'コメント作成に失敗しました' });
      }
    });

    // ユーザーのオンライン状態を通知
    socket.on('user:online', async (userId) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, avatar: true },
      });

      if (user) {
        // 他のすべてのクライアントに通知
        io?.emit('user:online', user);
      }
    });

    // 接続解除時
    socket.on('disconnect', () => {
      io?.emit('user:offline', userId);
      console.log(`[Socket] User ${userId} disconnected`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}
```

---

#### Step 1.2: Socket.io クライアント実装(所要時間:13分)

**このステップで学ぶこと**: フロント側でのソケット接続。

**なぜ必要?**: サーバーとの通信路を確立。イベントを送受信。

**コードの仕組み解説**:

```typescript
// filepath: src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(userId: string) {
  if (socket?.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
    auth: { userId },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to server');
    socket?.emit('user:online', userId);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected from server');
  });

  socket.on('error', (error) => {
    console.error('[Socket] Error:', error);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
}

export function getSocket() {
  return socket;
}
```

```typescript
// filepath: src/components/providers.tsx
'use client';

import { useEffect } from 'react';
import { api } from '@/trpc/react';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export function Providers({ children }: { children: React.ReactNode }) {
  const { data: session } = api.auth.getSession.useQuery();

  useEffect(() => {
    if (session?.user) {
      connectSocket(session.user.id);
    }

    return () => {
      disconnectSocket();
    };
  }, [session?.user?.id]);

  return <>{children}</>;
}
```

---

### Part 2: リアルタイムコメント(20分)

#### Step 2.1: コメント投稿・リアルタイム受信(所要時間:10分)

**このステップで学ぶこと**: WebSocket でコメントをリアルタイムで全員に配信。

**なぜ必要?**: 複数人が同じタスクを見ている場合、コメント投稿直後に全員の画面に表示される。

**コードの仕組み解説**:

```typescript
// filepath: src/app/dashboard/tasks/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { api } from '@/trpc/react';

export default function TaskDetailPage() {
  const taskId = useParams().id as string;
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  const { data: task } = api.task.getById.useQuery({ id: taskId });
  const createComment = api.comment.create.useMutation();

  // WebSocket イベントリスナー
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // サーバーからのコメント受信
    socket.on('comment:created', ({ comment, taskId: receivedTaskId }) => {
      if (receivedTaskId === taskId) {
        // このタスクへのコメントなら、UIに追加
        setComments((prev) => [...prev, comment]);
      }
    });

    return () => {
      socket.off('comment:created');
    };
  }, [taskId]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    try {
      // API経由でコメント作成(tRPC)
      await createComment.mutateAsync({
        taskId,
        content: newComment,
      });

      // WebSocket で通知(オプション)
      // const socket = getSocket();
      // socket?.emit('comment:create', {
      //   taskId,
      //   content: newComment,
      //   userId: session.user.id,
      // });

      setNewComment('');
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  return (
    <Box>
      {/* ... タスク詳細 ... */}

      {/* コメント欄 */}
      <Box>
        {comments.map((comment) => (
          <Box key={comment.id}>
            <Typography>{comment.author.name}</Typography>
            <Typography>{comment.content}</Typography>
          </Box>
        ))}
      </Box>

      <TextField
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder='コメントを入力...'
      />

      <Button onClick={handlePostComment}>投稿</Button>
    </Box>
  );
}
```

---

#### Step 2.2: コメント削除・リアルタイム同期(所要時間:10分)

**このステップで学ぶこと**: 削除も WebSocket で全員に通知。

**なぜ必要?**: 誰かが削除したコメントは、全員の画面から消える。

**コードの仕組み解説**:

```typescript
// filepath: src/server/socket.ts (追加)
io.on('connection', (socket: ServerSocket) => {
  // ... 既存コード ...

  // コメント削除イベント
  socket.on('comment:delete', async (data) => {
    const { commentId, taskId } = data;

    try {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { taskId: true, authorId: true },
      });

      if (comment?.authorId === userId) {
        // 削除実行
        await prisma.comment.delete({ where: { id: commentId } });

        // 全クライアントに通知
        io?.to(`task:${taskId}`).emit('comment:deleted', { commentId });

        socket.emit('comment:deleted:success');
      }
    } catch (error) {
      socket.emit('error', { message: '削除に失敗しました' });
    }
  });
});
```

```typescript
// フロント側
useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  socket.on('comment:deleted', ({ commentId }) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  });

  return () => {
    socket.off('comment:deleted');
  };
}, []);
```

---

### Part 3: プレゼンス・オンライン状態(15分)

#### Step 3.1: ユーザーのオンライン状態表示(所要時間:15分)

**このステップで学ぶこと**: 誰がオンラインか表示。

**なぜ必要?**: チームメンバーが今オンラインか一目で分かる。

**コードの仕組み解説**:

```typescript
// filepath: src/components/online-users.tsx
'use client';

import { useEffect, useState } from 'react';
import { Box, Avatar, Tooltip, AvatarGroup } from '@mui/material';
import { getSocket } from '@/lib/socket';

interface OnlineUser {
  id: string;
  name: string;
  avatar: string | null;
}

export function OnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // ユーザーがオンラインになった
    socket.on('user:online', (user: OnlineUser) => {
      setOnlineUsers((prev) => {
        const exists = prev.find((u) => u.id === user.id);
        if (!exists) {
          return [...prev, user];
        }
        return prev;
      });
    });

    // ユーザーがオフラインになった
    socket.on('user:offline', (userId: string) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== userId));
    });

    return () => {
      socket.off('user:online');
      socket.off('user:offline');
    };
  }, []);

  return (
    <Box>
      <AvatarGroup max={5}>
        {onlineUsers.map((user) => (
          <Tooltip key={user.id} title={user.name}>
            <Avatar
              src={user.avatar || undefined}
              sx={{ border: '2px solid #4caf50' }} // 緑の枠でオンライン状態
            />
          </Tooltip>
        ))}
      </AvatarGroup>
    </Box>
  );
}
```

```typescript
// ダッシュボードに表示
export default function Dashboard() {
  return (
    <Box>
      <Typography variant='h5'>オンラインメンバー</Typography>
      <OnlineUsers />
    </Box>
  );
}
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. **WebSocket サーバー**
   - [ ] Socket.io セットアップ
   - [ ] イベント処理(comment:create, user:online)
   - [ ] ルーム管理(user:xxx:online)

2. **WebSocket クライアント**
   - [ ] connectSocket で接続
   - [ ] イベントリスナー登録
   - [ ] 自動再接続

3. **リアルタイム更新**
   - [ ] コメント投稿・受信
   - [ ] コメント削除・同期
   - [ ] オンライン状態表示

---

## まとめ

- **WebSocket**: サーバー ↔ クライアント の双方向通信
- **Socket.io**: WebSocket のラッパー(フォールバック対応)
- **ルーム**: user:xxx:online で特定ユーザーに送信
- **イベント**: comment:created, user:online など
- **再接続**: 自動的に再接続(reconnectionAttempts)

次回(Day 17)は テスト実装・Vitest + Playwright です。
