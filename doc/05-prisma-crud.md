# Day 05: Prismaでのデータベース操作基礎

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **Prismaでのデータ取得を理解する** | タスク一覧表示 | ✅ find, findUnique, findFirstが使える |
| **リレーション処理を習得する** | 関連データの取得 | ✅ includeでリレーション先を取得できる |
| **型安全なクエリを書く** | バグ削減 | ✅ 型推論でエラーを防げる |

## 💼 なぜこれを学ぶのか?

Prismaは、データベースクエリをTypeScriptで**型安全に**書くためのORM(オブジェクト関係マッピング)です。

- **SQL不要**: TypeScriptメソッドチェーンでクエリを構築
- **型安全**: 存在しないカラムや不正な値をコンパイル時に検出
- **リレーション処理が簡単**: 複雑なJOINをシンプルに表現

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | findメソッド基礎 | 3ステップ | 25分 |
| **Part 2** | リレーション処理 | 2ステップ | 20分 |
| **Part 3** | 型安全性の活用 | 2ステップ | 15分 |
| **合計** | - | **7ステップ** | **約60分** |

---

## 実装内容

### Part 1: findメソッド基礎(25分)

#### Step 1.1: Prisma Clientの初期化を理解する(所要時間:8分)

**このステップで学ぶこと**: Prisma ClientをTypeScriptプロジェクトで使うための準備。

**なぜ必要?**: Prisma Clientは`@prisma/client`からインポートして、すべてのデータベース操作を実行します。シングルトンパターンで保管することで、複数のインスタンスを作成するのを防ぎます。

**コードの仕組み解説**:
- `PrismaClient`: データベース接続を管理するクラス
- シングルトンパターン: 同じインスタンスを再利用
- 開発時のログ: `log: ['query']`でクエリを確認可能

以下のコードを確認してください:

```typescript
// filepath: src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**確認方法**:
1. `src/lib/prisma.ts`ファイルが存在することを確認
2. Prisma Studioを起動: `npx prisma studio`

---

#### Step 1.2: find系メソッドを習得する(所要時間:8分)

**このステップで学ぶこと**: Prismaの基本的なデータ取得メソッド。

**なぜ必要?**: `find`メソッドはPrismaで最も使う操作です。`findMany`, `findUnique`, `findFirst`を使い分けることで、効率的にデータを取得できます。

**コードの仕組み解説**:

```typescript
import { prisma } from '@/lib/prisma';

// 複数レコード取得(すべてのユーザーを取得)
const users = await prisma.user.findMany();

// 複数レコード取得(条件付き)
const activeUsers = await prisma.user.findMany({
  where: { isActive: true },
});

// 単一レコード取得(主キーで検索)
const user = await prisma.user.findUnique({
  where: { id: 'user-123' },
});

// 単一レコード取得(条件で検索、複数件は最初の1件)
const admin = await prisma.user.findFirst({
  where: { role: 'ADMIN' },
});

// ページング処理
const page1Users = await prisma.user.findMany({
  skip: 0,    // 最初の0番目からスタート
  take: 10,   // 10件取得
});
```

**メソッドの選択基準**:
| メソッド | 用途 | 戻り値 |
|---------|------|--------|
| findMany | 複数件取得 | 配列 |
| findUnique | 主キー/ユニークキーで1件 | オブジェクト/null |
| findFirst | 条件で1件(あれば最初の1件) | オブジェクト/null |
| count | 件数をカウント | 数値 |

**確認方法**:
1. Prisma Studioでデータ確認
2. 実際にクエリを実行して結果を確認

---

#### Step 1.3: whereクエリを使いこなす(所要時間:9分)

**このステップで学ぶこと**: whereで複雑な検索条件を指定する方法。

**なぜ必要?**: whereは単純な等値比較だけでなく、大小比較や複合条件も表現できます。

**コードの仕組み解説**:

```typescript
import { prisma } from '@/lib/prisma';

// 等値比較
await prisma.task.findMany({ where: { status: 'TODO' } });

// 大小比較
await prisma.task.findMany({
  where: {
    dueDate: { gte: new Date('2024-01-01') }, // 以上
  },
});

// 複合条件(AND)
await prisma.task.findMany({
  where: {
    status: 'TODO',
    priority: 'HIGH',
  },
});

// OR条件
await prisma.task.findMany({
  where: {
    OR: [
      { status: 'TODO' },
      { status: 'IN_PROGRESS' },
    ],
  },
});

// NOT条件
await prisma.task.findMany({
  where: {
    status: { not: 'DONE' },
  },
});

// 部分一致
await prisma.task.findMany({
  where: {
    title: { contains: 'バグ修正' },
  },
});
```

**whereオペレーター一覧**:
| オペレーター | 意味 |
|-----------|------|
| `equals` / 省略 | 等値 |
| `not` | 否定 |
| `in` | リストのいずれか |
| `notIn` | リストのいずれでもない |
| `lt` / `lte` | より小さい / 以下 |
| `gt` / `gte` | より大きい / 以上 |
| `contains` | 部分一致(大文字小文字区別) |
| `startsWith` / `endsWith` | 開始/終了 |

---

### Part 2: リレーション処理(20分)

#### Step 2.1: includeでリレーション先を取得する(所要時間:10分)

**このステップで学ぶこと**: 関連テーブルのデータを一緒に取得する方法。

**なぜ必要?**: Taskを取得するときに、作成者(User)やプロジェクト(Project)の情報も一緒に取得したいことがあります。includeを使うことで、1回のクエリで取得できます。

**コードの仕組み解説**:

```typescript
import { prisma } from '@/lib/prisma';

// Taskとそのリレーション先を取得
const task = await prisma.task.findUnique({
  where: { id: 'task-123' },
  include: {
    project: true,        // ProjectFullを取得
    createdBy: true,      // 作成者(User)を取得
    assignee: true,       // 担当者(User)を取得
    comments: true,       // すべてのコメントを取得
  },
});

// フィールドを制限する場合
const task2 = await prisma.task.findUnique({
  where: { id: 'task-123' },
  include: {
    project: true,
    createdBy: {
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    },
    comments: {
      where: { /* フィルター */ },
      orderBy: { createdAt: 'desc' },
      take: 5, // 最新5件
    },
  },
});
```

**includeの構文**:
- `true`: すべてのフィールドを取得
- オブジェクト: 詳細な指定
  - `select`: 取得フィールドを限定
  - `where`: フィルター条件
  - `orderBy`: ソート
  - `take` / `skip`: ページング

**確認方法**:
1. Prisma Studioでリレーション先のテーブルを確認
2. task/[id]/page.tsxでincludeの使われ方を確認

---

#### Step 2.2: selectとの違いを理解する(所要時間:10分)

**このステップで学ぶこと**: selectでフィールドを限定する方法。

**なぜ必要?**: 取得データのサイズを削減し、パフォーマンスを向上させられます。APIレスポンスにもセキュリティ上不要なフィールドを除外できます。

**コードの仕組み解説**:

```typescript
import { prisma } from '@/lib/prisma';

// includeを使う場合(すべてのフィールドを取得)
const task1 = await prisma.task.findUnique({
  where: { id: 'task-123' },
  include: { createdBy: true }, // Userのすべてのフィールド
});

// selectを使う場合(特定フィールドだけ)
const task2 = await prisma.task.findUnique({
  where: { id: 'task-123' },
  select: {
    id: true,
    title: true,
    status: true,
    createdBy: {
      select: {
        id: true,
        name: true,
        avatar: true,
        // email, passwordなどは取得しない
      },
    },
  },
});
```

**include vs select**:
| 特徴 | include | select |
|------|---------|--------|
| フィールド指定 | 自動(全取得) | 手動(限定) |
| パフォーマンス | 大きいデータ | 小さいデータ |
| リレーション | ✅ 対応 | ✅ 対応 |
| セキュリティ | 注意 | 安全 |

---

### Part 3: 型安全性の活用(15分)

#### Step 3.1: Prismaの型推論を活用する(所要時間:8分)

**このステップで学ぶこと**: Prismaが自動生成する型の使い方。

**なぜ必要?**: includeで取得したデータの型は、Prismaが自動的に推論してくれます。これにより、存在しないプロパティへのアクセスはコンパイル時にエラーになります。

**コードの仕組み解説**:

```typescript
import { prisma } from '@/lib/prisma';

// 型が自動推論される
const task = await prisma.task.findUnique({
  where: { id: 'task-123' },
  include: {
    project: true,
    createdBy: true,
  },
});

// task の型は:
// Task & {
//   project: Project;
//   createdBy: User;
// }

// 使用例
console.log(task.title);              // ✅ OK
console.log(task.project.name);       // ✅ OK (includeで取得)
console.log(task.createdBy.email);    // ✅ OK (includeで取得)
console.log(task.assignee?.email);    // ⚠️ 型エラー (includeにないので注意)
```

**確認方法**:
1. VS Codeでマウスホバーして型を確認
2. 存在しないプロパティアクセスでエラーを確認

---

#### Step 3.2: カスタム型定義で型安全性を高める(所要時間:7分)

**このステップで学ぶこと**: includeの結果を型定義として再利用する方法。

**なぜ必要?**: 同じincludeパターンを複数の場所で使う場合、型定義として保存することで保守性が向上します。

**コードの仕組み解説**:

```typescript
// filepath: src/types/task.ts
import type { Task, User, Project, Comment } from '@prisma/client';

// Taskのリレーション取得パターン
export type TaskWithDetails = Task & {
  project: Project;
  createdBy: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
  assignee: Pick<User, 'id' | 'name' | 'email' | 'avatar'> | null;
  comments: (Comment & {
    user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
  })[];
};

// tRPCルーターで使用
import type { TaskWithDetails } from '@/types/task';

const getTasksRouter = async (): Promise<TaskWithDetails[]> => {
  return await prisma.task.findMany({
    include: {
      project: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
    },
  });
};
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. Prisma Clientを使ってデータ取得
2. findMany, findUnique, findFirstの使い分け
3. whereで検索条件を指定
4. includeでリレーション取得
5. 型安全なクエリの記述

---

## まとめ

- **Prisma Client**: 型安全なORM
- **findMany**: 複数件取得
- **findUnique**: 主キーで1件取得
- **findFirst**: 条件で1件取得
- **where**: 検索条件の指定
- **include**: リレーション先も一緒に取得
- **select**: 取得フィールドを限定(パフォーマンス)

次回(Day 6)では、NextAuth.jsによる認証基盤の構築を学びます。
