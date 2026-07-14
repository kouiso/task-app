# Day 18: パフォーマンス最適化・DBクエリ

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **N+1問題解決** | DB最適化 | ✅ include/select で回避できる |
| **インデックス作成** | クエリ高速化 | ✅ WHERE句に使うカラムにインデックス |
| **キャッシング戦略** | メモリ効率 | ✅ TanStack Query で管理 |

## 💼 なぜこれを学ぶのか?

**ユーザー数が増えるとDB遅延が顕著に**。最初は気付かないが、本番環境で1秒→10秒に悪化することも。早期の最適化が重要。

- **N+1 問題**: 1つのクエリで N+1 回アクセス(クエリ数爆増)
- **インデックス**: 条件検索を高速化
- **キャッシング**: 同じクエリを繰り返さない

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | N+1 問題の検出と解決 | 2ステップ | 25分 |
| **Part 2** | データベース インデックス | 2ステップ | 20分 |
| **Part 3** | キャッシング戦略 | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: N+1 問題の検出と解決(25分)

#### Step 1.1: N+1 問題とは(所要時間:12分)

**このステップで学ぶこと**: クエリ数が爆増する罠。

**なぜ必要?**: ユーザー10万人 × N回のクエリ = 超遅い。

**コードの仕組み解説**:

```typescript
// ❌ N+1 問題のあるコード
export async function getTasksWithComments(taskIds: string[]) {
  // 1. タスク一覧取得(1クエリ)
  const tasks = await prisma.task.findMany({
    where: { id: { in: taskIds } },
  });

  // 2. 各タスクごとにコメント取得(N回のクエリ)
  const result = await Promise.all(
    tasks.map(async (task) => {
      const comments = await prisma.comment.findMany({
        where: { taskId: task.id },
      });
      return { task, comments };
    })
  );

  // 合計: 1 + N クエリ(N=タスク数)
  return result;
}

// 使用例: 100個のタスク取得 → 101 クエリ実行!

// ✅ 最適化版(include を使用)
export async function getTasksWithComments(taskIds: string[]) {
  const tasks = await prisma.task.findMany({
    where: { id: { in: taskIds } },
    include: {
      comments: true,
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  // 合計: 1 クエリ(JOIN で一度に取得)
  return tasks;
}
```

**さらに最適化(select で不要なフィールドを除外)**:

```typescript
// comments テーブルのすべてのカラムは不要な場合
export async function getTasksWithComments(taskIds: string[]) {
  const tasks = await prisma.task.findMany({
    where: { id: { in: taskIds } },
    include: {
      comments: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, name: true } },
        },
      },
      creator: { select: { id: true, name: true } },
    },
  });

  return tasks;
}
// → より必要なデータのみ転送(ネットワーク削減)
```

---

#### Step 1.2: Prisma Studio でクエリ確認(所要時間:13分)

**このステップで学ぶこと**: クエリが何回実行されているか確認。

**なぜ必要?**: 最適化前後で比較。改善を数値で示す。

**コードの仕組み解説**:

```bash
# Prisma Studio を起動
npx prisma studio
# → http://localhost:5555 で UI を確認
# Logs タブで実行されたクエリを確認
```

**クエリログ出力**:

```typescript
// filepath: prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  // ログ出力を有効化
  // "query" : SQL クエリ表示
  // "info" : 情報ログ
  // "warn" : 警告ログ
  // "error": エラーログ
  log = ["query", "info", "warn", "error"]
}
```

**実際のログ出力**:
```
prisma:query SELECT * FROM "Task" WHERE "id" IN ($1, $2, $3) -- 1ms
prisma:query SELECT * FROM "Comment" WHERE "taskId" = $1 -- 0.5ms
prisma:query SELECT * FROM "Comment" WHERE "taskId" = $2 -- 0.5ms
prisma:query SELECT * FROM "Comment" WHERE "taskId" = $3 -- 0.4ms
```

---

### Part 2: データベース インデックス(20分)

#### Step 2.1: WHERE句に使うカラムにインデックス(所要時間:10分)

**このステップで学ぶこと**: インデックスで検索を高速化。

**なぜ必要?**: インデックスなし = フルスキャン(全行チェック)。遅い。

**コードの仕組み解説**:

```prisma
// filepath: prisma/schema.prisma
model Task {
  id        String   @id @default(cuid())
  title     String
  status    String   // ← WHERE status = 'TODO' で頻繁に使用
  projectId String?
  creatorId String   // ← WHERE creatorId = xxx で使用

  // インデックス設定
  @@index([status])      // status でインデックス
  @@index([creatorId])
  @@index([projectId])
  @@index([createdAt])   // ORDER BY createdAt で使用
}

model Comment {
  id        String   @id @default(cuid())
  taskId    String   // ← WHERE taskId = xxx で使用
  authorId  String

  @@index([taskId])
  @@index([authorId])
  @@index([createdAt])
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique // @unique は自動的にインデックス
  role      String   // ← WHERE role = 'ADMIN' で使用

  @@index([role])
  @@index([isActive])
}
```

**複合インデックス(2つ以上のカラムの組み合わせ)**:

```prisma
model Task {
  id        String
  status    String
  priority  String
  creatorId String

  // WHERE status = 'TODO' AND priority = 'HIGH' で高速
  @@index([status, priority])
}
```

**マイグレーション実行**:
```bash
npx prisma migrate dev --name add_indexes
```

---

#### Step 2.2: 実行計画(EXPLAIN)で最適化確認(所要時間:10分)

**このステップで学ぶこと**: クエリが効率的に実行されているか確認。

**なぜ必要?**: インデックス設定が本当に有効か確認。

**コードの仕組み解説**:

```sql
-- PostgreSQL の EXPLAIN で実行計画確認

-- インデックスなし(全スキャン - 遅い)
EXPLAIN ANALYZE
SELECT * FROM "Task" WHERE status = 'TODO' ORDER BY created_at DESC;
-- Seq Scan on task (cost=0.00..5000.00)
--   Filter: (status = 'TODO')
--   Planning Time: 0.200 ms
--   Execution Time: 50.000 ms  -- 遅い!

-- インデックス作成後(インデックススキャン - 速い)
CREATE INDEX idx_task_status_created ON task(status, created_at DESC);

EXPLAIN ANALYZE
SELECT * FROM "Task" WHERE status = 'TODO' ORDER BY created_at DESC;
-- Index Scan using idx_task_status_created (cost=0.42..10.50)
--   Index Cond: (status = 'TODO')
--   Planning Time: 0.150 ms
--   Execution Time: 0.500 ms  -- 高速!
```

---

### Part 3: キャッシング戦略(15分)

#### Step 3.1: TanStack Query のキャッシュ戦略(所要時間:15分)

**このステップで学ぶこと**: クライアント側のキャッシング。

**なぜ必要?**: 同じデータを何度も取得するのは無駄。

**コードの仕組み解説**:

```typescript
// filepath: src/lib/trpc.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // キャッシュ時間: 5分
      staleTime: 5 * 60 * 1000,
      // 画面非表示時、キャッシュを捨てない: 10分
      gcTime: 10 * 60 * 1000,
      // 自動リトライ: 3回
      retry: 3,
    },
    mutations: {
      // mutation 後、関連キャッシュを自動無効化
      onSuccess: (data) => {
        console.log('Mutation succeeded:', data);
      },
    },
  },
});
```

**キャッシュ戦略の例**:

```typescript
// 例1: タスク一覧(変更頻度: 低 → キャッシュ時間: 長)
export function useTaskList() {
  return api.task.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5分
  });
}

// 例2: ユーザープロフィール(変更頻度: 低 → キャッシュ時間: 長)
export function useProfile(userId: string) {
  return api.user.getProfile.useQuery({ userId }, {
    staleTime: 10 * 60 * 1000, // 10分
  });
}

// 例3: リアルタイム通知(変更頻度: 高 → キャッシュなし)
export function useNotifications() {
  return api.notification.list.useQuery(undefined, {
    staleTime: 0, // キャッシュしない
    refetchInterval: 3000, // 3秒ごとに更新
  });
}

// 例4: mutation後のキャッシュ更新
export function useCreateTask() {
  const utils = api.useUtils();
  return api.task.create.useMutation({
    onSuccess: async () => {
      // 関連キャッシュを無効化
      await utils.task.list.invalidate();
      await utils.project.getStats.invalidate();
    },
  });
}
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. **N+1 問題**
   - [ ] 問題認識(クエリ数が爆増)
   - [ ] include で解決
   - [ ] select で最適化

2. **インデックス**
   - [ ] WHERE 句に使うカラム
   - [ ] 複合インデックス
   - [ ] EXPLAIN で確認

3. **キャッシング**
   - [ ] staleTime/gcTime 設定
   - [ ] 変更頻度に応じた戦略
   - [ ] mutation 後の無効化

---

## まとめ

- **N+1 問題**: include/select で 1 クエリに統一
- **インデックス**: WHERE、ORDER BY、JOIN に使うカラム
- **複合インデックス**: 複数カラムの組み合わせ条件
- **staleTime**: データが「古い」と判定されるまでの時間
- **gcTime**: キャッシュがメモリから削除されるまでの時間

次回(Day 19)は セキュリティ対策です。
