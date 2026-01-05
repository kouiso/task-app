# Day 03: TypeScriptの型定義とPrismaスキーマ

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **Prismaスキーマを理解する** | データベース設計 | ✅ モデルとリレーションを読み解ける |
| **型定義の活用方法を学ぶ** | 型安全な開発 | ✅ Prismaが生成する型を使える |
| **Enumの使い方を理解する** | ステータス管理 | ✅ 状態を型で表現できる |

## 💼 なぜこれを学ぶのか?

TypeScriptとPrismaを組み合わせることで、**データベースからUIまで一貫した型安全性**を実現できます。

- **コンパイル時のエラー検出**: 実行前に多くのバグを発見
- **自動補完**: エディタがフィールド名やメソッドを提案
- **リファクタリングの安全性**: 型の変更が影響範囲を明示

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | Prismaスキーマの理解 | 3ステップ | 30分 |
| **Part 2** | 型定義の活用 | 2ステップ | 20分 |
| **Part 3** | Enumの使い方 | 2ステップ | 15分 |
| **合計** | - | **7ステップ** | **約65分** |

---

## 実装内容

### Part 1: Prismaスキーマの理解(30分)

#### Step 1.1: schema.prismaの基本構造を理解する(所要時間:10分)

**このステップで学ぶこと**: Prismaスキーマファイルの構造と役割。

**なぜ必要?**: `prisma/schema.prisma`は、データベースの設計図です。ここに定義したモデルがテーブルになり、TypeScriptの型も自動生成されます。建築で例えると、設計図(schema)から実際の建物(テーブル)と模型(型)が作られるようなものです。

**コードの仕組み解説**:
- `generator`: Prisma Clientの生成設定
- `datasource`: データベース接続設定
- `model`: データベースのテーブル定義
- `enum`: 列挙型の定義

以下のコードを確認してください:

```prisma
// filepath: prisma/schema.prisma
// Prisma Schema for PostgreSQL

// Prisma Clientを生成する設定
generator client {
  provider = "prisma-client-js"
}

// データベース接続設定
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**確認方法**:
1. `prisma/schema.prisma`を開く
2. 先頭の`generator`と`datasource`を確認

---

#### Step 1.2: Userモデルを理解する(所要時間:10分)

**このステップで学ぶこと**: ユーザー情報を管理するモデルの構造。

**なぜ必要?**: Userモデルは認証とユーザー管理の基盤です。すべてのタスクやプロジェクトはユーザーに紐づきます。

**コードの仕組み解説**:
- `@id`: 主キー(一意の識別子)
- `@default(cuid())`: 自動生成されるユニークID
- `@unique`: 重複を許可しない
- `@map("snake_case")`: データベースのカラム名を指定
- `@@map("users")`: テーブル名を指定

以下のコードを確認してください:

```prisma
// filepath: prisma/schema.prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime? @map("email_verified")
  name          String?
  avatar        String?
  image         String?
  password      String?
  role          UserRole  @default(USER)
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // リレーション(他のテーブルとの関係)
  createdTasks  Task[]          @relation("TaskCreator")
  assignedTasks Task[]          @relation("TaskAssignee")
  projects      ProjectMember[]
  comments      Comment[]
  accounts      Account[]
  sessions      Session[]

  @@map("users")
}
```

**フィールドの意味**:
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String | ユーザーの一意識別子(CUID) |
| email | String | メールアドレス(ログインに使用) |
| name | String? | 表示名(任意) |
| password | String? | ハッシュ化されたパスワード |
| role | UserRole | 権限(USER または ADMIN) |
| isActive | Boolean | アカウントが有効かどうか |

**確認方法**:
1. Prisma Studioを起動: `npx prisma studio`
2. ブラウザで`http://localhost:5555`を開く
3. Userテーブルのデータを確認

---

#### Step 1.3: TaskモデルとProjectモデルを理解する(所要時間:10分)

**このステップで学ぶこと**: TaskAppの中心となるモデルの構造。

**なぜ必要?**: TaskとProjectはアプリケーションの主要な機能です。これらのモデルを理解することで、機能の実装方法が見えてきます。

**コードの仕組み解説**:

```prisma
// filepath: prisma/schema.prisma
model Project {
  id          String    @id @default(cuid())
  name        String
  description String?
  color       String    @default("#1976d2")
  isArchived  Boolean   @default(false) @map("is_archived")
  startDate   DateTime? @map("start_date")
  endDate     DateTime? @map("end_date")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // リレーション
  tasks   Task[]
  members ProjectMember[]

  @@map("projects")
}

model Task {
  id               String       @id @default(cuid())
  title            String
  description      String?
  status           TaskStatus   @default(TODO)
  priority         TaskPriority @default(MEDIUM)
  dueDate          DateTime?    @map("due_date")
  completedAt      DateTime?    @map("completed_at")
  estimatedHours   Float?       @map("estimated_hours")
  actualHours      Float        @default(0) @map("actual_hours")
  timeSpentMinutes Float        @default(0) @map("time_spent_minutes")
  isTimerActive    Boolean      @default(false) @map("is_timer_active")
  timerStartedAt   DateTime?    @map("timer_started_at")
  position         Int          @default(0)
  createdAt        DateTime     @default(now()) @map("created_at")
  updatedAt        DateTime     @updatedAt @map("updated_at")

  // リレーション
  projectId   String  @map("project_id")
  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdById String  @map("created_by_id")
  createdBy   User    @relation("TaskCreator", fields: [createdById], references: [id])
  assigneeId  String? @map("assignee_id")
  assignee    User?   @relation("TaskAssignee", fields: [assigneeId], references: [id])
  comments    Comment[]

  @@map("tasks")
}
```

**リレーションの解説**:
- `Task`は必ず1つの`Project`に属する(1対多)
- `Task`は1人の作成者(`createdBy`)を持つ
- `Task`は0人または1人の担当者(`assignee`)を持つ
- `Project`は複数の`Task`を持てる

**確認方法**:
1. Prisma Studioでprojectsテーブルを開く
2. 各プロジェクトに紐づくタスクを確認

---

### Part 2: 型定義の活用(20分)

#### Step 2.1: Prismaが生成する型を理解する(所要時間:10分)

**このステップで学ぶこと**: Prisma Clientが自動生成する型の活用方法。

**なぜ必要?**: `npx prisma generate`を実行すると、schema.prismaから TypeScriptの型が自動生成されます。これにより、データベースの構造変更が即座にTypeScriptに反映されます。

**コードの仕組み解説**:
- `import { User, Task, Project } from '@prisma/client'`: 生成された型をインポート
- `Prisma.TaskCreateInput`: タスク作成時の入力型
- `Prisma.TaskUpdateInput`: タスク更新時の入力型

```typescript
// 型のインポート例
import { User, Task, Project, TaskStatus, TaskPriority } from '@prisma/client';
import type { Prisma } from '@prisma/client';

// Userの型(自動生成)
type User = {
  id: string;
  email: string;
  emailVerified: Date | null;
  name: string | null;
  avatar: string | null;
  image: string | null;
  password: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// タスク作成時の入力型
const createInput: Prisma.TaskCreateInput = {
  title: 'New Task',
  status: 'TODO',
  priority: 'MEDIUM',
  project: { connect: { id: 'project-id' } },
  createdBy: { connect: { id: 'user-id' } },
};
```

**確認方法**:
1. VS Codeで`@prisma/client`からの型を確認
2. `Prisma.`と入力して自動補完を確認

---

#### Step 2.2: 型の拡張とカスタム型を理解する(所要時間:10分)

**このステップで学ぶこと**: Prismaの型を拡張して使いやすくする方法。

**なぜ必要?**: データベースから取得したデータには、リレーション先のデータが含まれることがあります。そのような場合の型を定義する方法を学びます。

**コードの仕組み解説**:

```typescript
// filepath: src/types/task.ts
import type { Task, User, Project, Comment } from '@prisma/client';

// タスク + リレーション先の型
export type TaskWithRelations = Task & {
  project: Project;
  createdBy: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
  assignee: Pick<User, 'id' | 'name' | 'email' | 'avatar'> | null;
  comments: (Comment & {
    user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
  })[];
};

// ユーザーの公開情報のみ
export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
```

**Pickユーティリティ型**:
- `Pick<User, 'id' | 'name'>`: Userから特定のフィールドだけを抽出
- セキュリティ上、パスワードなど不要なフィールドを除外するのに便利

**確認方法**:
1. `src/types`フォルダの型定義ファイルを確認
2. tRPCルーターでの型の使われ方を確認

---

### Part 3: Enumの使い方(15分)

#### Step 3.1: ステータスと優先度のEnumを理解する(所要時間:8分)

**このステップで学ぶこと**: 固定の選択肢をEnumで表現する方法。

**なぜ必要?**: タスクのステータスや優先度は、決まった値しか取りません。Enumを使うことで、無効な値の入力を防ぎ、型安全性を高めます。

**コードの仕組み解説**:

```prisma
// filepath: prisma/schema.prisma
enum TaskStatus {
  TODO         // 未着手
  IN_PROGRESS  // 進行中
  IN_REVIEW    // レビュー中
  DONE         // 完了
  CANCELLED    // キャンセル
  BLOCKED      // ブロック中
}

enum TaskPriority {
  LOW     // 低
  MEDIUM  // 中
  HIGH    // 高
  URGENT  // 緊急
}

enum UserRole {
  USER   // 一般ユーザー
  ADMIN  // 管理者
}

enum ProjectMemberRole {
  OWNER   // オーナー
  ADMIN   // 管理者
  MEMBER  // メンバー
  VIEWER  // 閲覧者
}
```

**TypeScriptでの使用例**:

```typescript
import { TaskStatus, TaskPriority } from '@prisma/client';

// Enumの値を使用
const status: TaskStatus = 'TODO';
const priority: TaskPriority = 'HIGH';

// 無効な値はコンパイルエラー
// const invalidStatus: TaskStatus = 'INVALID'; // エラー!
```

**確認方法**:
1. schema.prismaのenum定義を確認
2. VS Codeで`TaskStatus.`と入力して候補を確認

---

#### Step 3.2: Enumを使ったバリデーション(所要時間:7分)

**このステップで学ぶこと**: ZodスキーマでEnumをバリデーションする方法。

**なぜ必要?**: フロントエンドからの入力は信頼できません。Zodを使ってEnumの値を検証することで、不正な値の入力を防ぎます。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/routers/task.ts
import { z } from 'zod';

const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z
    .enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED', 'BLOCKED'])
    .default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
  projectId: z.string().cuid(),
  createdById: z.string().cuid(),
  assigneeId: z.string().cuid().optional(),
});
```

**Zodバリデーションの特徴**:
- `z.enum()`: 許可された値のリストを定義
- `.default()`: 値が指定されない場合のデフォルト値
- `.optional()`: 必須ではないフィールド
- `.cuid()`: CUID形式の文字列を検証

**確認方法**:
1. `src/server/api/routers/task.ts`を開く
2. スキーマ定義を確認

---

## ✅ 今日の成果

以下の内容を理解できたことを確認しましょう:

1. **Prismaスキーマ**: モデル定義とリレーションの書き方
2. **自動生成される型**: `@prisma/client`からインポート
3. **Enum**: 固定の選択肢を型安全に表現
4. **Zodバリデーション**: 入力値の検証

---

## まとめ

- **schema.prisma**: データベースの設計図
- **Model**: テーブル定義(`User`, `Task`, `Project`など)
- **Relation**: テーブル間の関係(1対多、多対多)
- **Enum**: 固定の選択肢(`TaskStatus`, `TaskPriority`)
- **Prisma Client**: 自動生成される型安全なORMクライアント
- **Zod**: ランタイムでの型バリデーション

次回(Day 4)では、Material-UIの基本コンポーネントを学び、UIの構築を始めます。
