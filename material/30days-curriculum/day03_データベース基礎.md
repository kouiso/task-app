# Day 3: データベースって何？PostgreSQL入門

## 🎯 今日のゴール

今日の学習が終わると、以下のことができるようになります：

- **データベースとは何か**が、例え話で説明できる
- **Prismaスキーマファイル**（データベースの設計図）が読める
- **Prisma Studio**でデータを見たり、編集したりできる
- **User、Project、Task**の3つのテーブルの関係性が理解できる
- アプリで表示されているデータが「どこから来ているか」がわかる

昨日見た「ログイン画面」や「ダッシュボード」に表示されていた情報が、実は**データベースに保存されている**こと。そして、そのデータを**自分の目で見る**こと。これが今日のゴールです！

---

## 🤔 なぜこれを学ぶのか？

Webアプリケーションの「見た目」は、実は「データ」を表示しているだけです。

> 💡 **例え話**: レストランのメニューと厨房の在庫
> 
> - **メニュー（見た目）**: 「ハンバーグ定食 ¥850」
> - **厨房の在庫（データベース）**: 実際の食材（肉、野菜、米など）
> 
> メニューを見ただけでは、「本当に作れるか」はわかりません。厨房に行って、在庫を確認する必要があります。
> 
> Webアプリも同じ：
> - **画面（見た目）**: 「田中太郎さん、プロジェクト5個、タスク12個」
> - **データベース（在庫）**: 実際のデータ（ユーザー情報、プロジェクト情報、タスク情報）
> 
> データベースを理解すれば、「どんなデータを保存すればいいか」「データをどう取り出すか」がわかります。

### なぜPrismaを使うのか？

Prismaは「ORM（Object-Relational Mapping）」というツールです。データベースを**もっと簡単に**扱えるようにしてくれます。

> 💡 **例え話**: 翻訳機
> 
> - **データベース**: 外国語（SQL語）しか話せない人
> - **あなた**: 日本語しか話せない
> - **Prisma**: 翻訳機
> 
> 本来、データベースと話すには「SQL」という言語を学ぶ必要があります。でも、Prismaを使えば、TypeScriptで書いたコードを自動的にSQLに翻訳してくれます。
> 
> ```typescript
> // Prismaを使った場合（わかりやすい！）
> const user = await prisma.user.findUnique({
>   where: { email: 'admin@example.com' }
> });
> 
> // 実際に実行されるSQL（複雑...）
> // SELECT * FROM users WHERE email = 'admin@example.com' LIMIT 1;
> ```

---

## 📊 実装ステップ一覧

今日行う作業の全体像：

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | データベースの基本概念を理解する | 15分 |
| Step 2 | Prismaスキーマファイルを開いて眺める | 10分 |
| Step 3 | Userモデルを完全理解する | 15分 |
| Step 4 | Prisma Studioを起動してデータを見る | 10分 |
| Step 5 | Projectモデルを理解する | 10分 |
| Step 6 | Taskモデルを理解する | 10分 |
| Step 7 | リレーション（関係性）を理解する | 20分 |

**合計時間**: 約1時間30分

---

### Step 1: データベースの基本概念を理解する

**🔰 初心者向け解説**: 

データベースは「データを整理して保存する場所」です。

> 💡 **例え話**: 図書館
> 
> データベースは「図書館」のようなものです：
> 
> - **図書館全体** = データベース全体（PostgreSQL）
> - **本棚のエリア** = テーブル（users、projects、tasksなど）
> - **1冊の本** = 1レコード（1人のユーザー、1つのプロジェクトなど）
> - **本の項目** = カラム（名前、メールアドレス、パスワードなど）
> 
> 例えば、「users」テーブル（本棚）には：
> - 田中太郎さんの本（レコード1）
> - 佐藤花子さんの本（レコード2）
> - 鈴木一郎さんの本（レコード3）
> 
> それぞれの本には：
> - タイトル（名前）
> - 著者（メールアドレス）
> - 出版年（登録日）
> などの情報（カラム）が書かれています。

#### データベースの基本用語

| 用語 | 意味 | 例え | 具体例 |
|------|------|------|--------|
| **データベース** | データを保存する全体 | 図書館全体 | taskapp |
| **テーブル** | データの種類ごとの箱 | 本棚のエリア | users、projects、tasks |
| **レコード（行）** | 1つのデータ | 1冊の本 | 田中太郎さんの情報 |
| **カラム（列）** | データの項目 | 本のタイトル、著者など | 名前、メールアドレスなど |
| **主キー（Primary Key）** | レコードを識別する番号 | 図書管理番号 | id |
| **外部キー（Foreign Key）** | 他のテーブルへの参照 | 「◯◯の続編」という記述 | userId（usersテーブルのid） |

**🎯 ポイント**:

- **テーブル**: Excelのシートのようなもの。1つのテーブルには1種類のデータを保存
- **リレーション**: テーブル同士の関係。「このタスクは、このユーザーが作った」みたいな繋がり

---

### Step 2: Prismaスキーマファイルを開いて眺める

**🔰 初心者向け解説**: 

Prismaスキーマファイル（`schema.prisma`）は、データベースの**設計図**です。

> 💡 **例え話**: 
> schema.prismaは「家の設計図」のようなものです。
> 
> - **設計図**: どの部屋に、どんな家具を置くか書いてある
> - **schema.prisma**: どのテーブルに、どんなカラムがあるか書いてある
> 
> 建築中の家で「設計図を見れば、完成形がわかる」のと同じように、schema.prismaを見れば「どんなデータを保存できるか」がわかります。

**💻 実装方法**:

1. VS Codeで`task-app`プロジェクトを開く

2. 左側のファイルツリーで、`prisma`フォルダを展開

3. `schema.prisma`ファイルをクリックして開く

4. ファイルの上部を見てみましょう：

```prisma
// filepath: prisma/schema.prisma (上部)
// ---------------------------------------------------------
// Prismaの設定部分
// ---------------------------------------------------------

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**🔍 コードの深掘り解説**:

- `generator client`: Prismaクライアント（TypeScriptからデータベースを操作するためのコード）を生成する設定
- `provider = "prisma-client-js"`: JavaScriptとTypeScript用のクライアントを生成
- `datasource db`: データベースの接続設定
- `provider = "postgresql"`: PostgreSQLデータベースを使う
- `url = env("DATABASE_URL")`: 接続先のURL（.envファイルから読み込む）

**📝 今は理解できなくてOK**

今は「へー、こういう設定があるんだ」と眺めるだけで大丈夫です。重要なのは次のステップから！

---

### Step 3: Userモデルを完全理解する

**🔰 初心者向け解説**: 

モデルは「テーブルの設計図」です。Userモデルを見て、「ユーザーテーブルにはどんな情報が保存されるか」を理解しましょう。

**💻 実装方法**:

`schema.prisma`をスクロールして、`model User`の部分を見てみましょう：

```prisma
// filepath: prisma/schema.prisma (Userモデル部分)
// ---------------------------------------------------------
// ユーザー情報を保存するテーブルの設計図
// ---------------------------------------------------------

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

  // Relations（他のテーブルとの関係）
  createdTasks  Task[]          @relation("TaskCreator")
  assignedTasks Task[]          @relation("TaskAssignee")
  projects      ProjectMember[]
  comments      Comment[]
  accounts      Account[]
  sessions      Session[]

  @@map("users")
}
```

**🔍 各カラムの詳細解説**:

#### 基本情報カラム

| カラム名 | 型 | 意味 | 例 |
|---------|---|------|-----|
| `id` | String | ユーザーの識別番号（一意） | "cm4abc123xyz" |
| `email` | String | メールアドレス | "admin@example.com" |
| `name` | String? | 名前（?は省略可能） | "田中太郎" |
| `password` | String? | パスワード（ハッシュ化済み） | "$2a$10$..." |
| `role` | UserRole | 役割（USER または ADMIN） | "ADMIN" |
| `isActive` | Boolean | アカウントの有効/無効 | true |
| `createdAt` | DateTime | 登録日時 | 2024-12-29 10:30:00 |
| `updatedAt` | DateTime | 最終更新日時 | 2024-12-29 15:20:00 |

#### 特殊な記号の意味

| 記号 | 意味 | 例 |
|------|------|-----|
| `@id` | 主キー（このカラムで各レコードを識別） | `id @id` |
| `@unique` | 一意（同じ値は2つ存在できない） | `email @unique` |
| `@default(...)` | デフォルト値 | `@default(true)` |
| `?` | 省略可能（nullを許可） | `name String?` |
| `@map("...")` | データベースでのカラム名 | `@map("is_active")` |
| `@@map("...")` | データベースでのテーブル名 | `@@map("users")` |

> 💡 **例え話**: 社員証
> 
> Userモデルは「社員証」のようなものです：
> 
> - **id**: 社員番号（絶対にユニーク）
> - **email**: メールアドレス（これもユニーク。同じメアドで2人登録できない）
> - **name**: 名前（書いてなくてもOK）
> - **role**: 役職（一般社員 or 管理者）
> - **isActive**: 在籍中かどうか（退職した人はfalse）
> - **createdAt**: 入社日
> - **updatedAt**: 最後に情報を更新した日

#### リレーション部分の意味

```prisma
createdTasks  Task[]          @relation("TaskCreator")
assignedTasks Task[]          @relation("TaskAssignee")
projects      ProjectMember[]
```

これは「このユーザーが関係している他のデータ」を表しています：

- **createdTasks**: このユーザーが**作成した**タスクの一覧
- **assignedTasks**: このユーザーに**割り当てられた**タスクの一覧
- **projects**: このユーザーが**参加している**プロジェクトの一覧

詳しくはStep 7で学びます！

---

### Step 4: Prisma Studioを起動してデータを見る

**🔰 初心者向け解説**: 

Prisma Studioは、データベースの中身を**ブラウザで見る**ことができるツールです。

> 💡 **例え話**: 
> Prisma Studioは「図書館の検索システム」のようなものです。
> 
> - **普通の方法**: 本棚を直接見に行く（SQLを書いてデータベースに問い合わせる）
> - **Prisma Studio**: 検索端末で検索する（GUIでデータを見る）
> 
> 検索端末なら、本の一覧を見たり、詳細を確認したり、場合によっては編集もできます。

**💻 実装方法**:

#### Step 4-1: Prisma Studioを起動

1. VS Codeのターミナルを開く
   - メニュー → ターミナル → 新しいターミナル

2. 以下のコマンドを実行:
   ```bash
   npm run db:studio
   ```

3. 以下のようなメッセージが表示されます:
   ```
   Environment variables loaded from .env
   Prisma schema loaded from prisma/schema.prisma
   Prisma Studio is up on http://localhost:5555
   ```

4. ブラウザで以下のURLを開く:
   ```
   http://localhost:5555
   ```

5. Prisma Studioの画面が開きます！

#### Step 4-2: usersテーブルを見てみる

1. 画面左側に、テーブルの一覧が表示されています：
   - users
   - projects
   - tasks
   - comments
   など

2. **users**をクリック

3. ユーザーの一覧が表示されます！

表示される内容（例）:

| id | email | name | role | isActive | createdAt |
|----|-------|------|------|----------|-----------|
| cm4... | admin@example.com | 管理者 | ADMIN | ✓ | 2024-12-29... |
| cm4... | user1@example.com | ユーザー1 | USER | ✓ | 2024-12-29... |

**📝 見てわかること**:

- 昨日ログインした`admin@example.com`のデータがここにある！
- `password`は暗号化されているので、読めない文字列になっている（セキュリティのため）
- `role`が"ADMIN"のユーザーと"USER"のユーザーがいる

#### Step 4-3: データをクリックして詳細を見る

1. 任意のユーザー行をクリック

2. 右側に詳細が表示されます：
   ```
   id: cm4abc123xyz
   email: admin@example.com
   name: 管理者
   role: ADMIN
   isActive: true
   createdAt: 2024-12-29T13:00:00.000Z
   updatedAt: 2024-12-29T13:00:00.000Z
   ```

3. さらにスクロールすると、**Relations（関係）**が表示されます：
   - createdTasks: 3 records
   - assignedTasks: 5 records
   - projects: 2 records

   これは「このユーザーが作ったタスクが3つ」「割り当てられたタスクが5つ」「参加プロジェクトが2つ」という意味です！

**✅ 動作確認**:

Prisma Studioで以下を試してみましょう：

1. `email`が`user1@example.com`のユーザーを探す
2. そのユーザーの`name`を確認
3. `role`が何か確認（おそらく"USER"）

**🔍 深掘り**:

Prisma Studioでできることは他にもたくさんあります：

- **データの編集**: レコードをクリックして、値を変更できる（保存ボタンを押すまで反映されない）
- **データの追加**: 「Add record」ボタンで新しいデータを追加
- **データの削除**: レコードを選択して削除

**⚠️ 注意**: 今は編集しないでください。データを壊す可能性があります。「見る」だけにしましょう。

---

### Step 5: Projectモデルを理解する

**🔰 初心者向け解説**: 

Projectモデルは、「プロジェクト」のデータ構造です。

**💻 実装方法**:

`schema.prisma`で`model Project`の部分を見てみましょう：

```prisma
// filepath: prisma/schema.prisma (Projectモデル部分)
// ---------------------------------------------------------
// プロジェクト情報を保存するテーブルの設計図
// ---------------------------------------------------------

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

  // Relations
  tasks   Task[]
  members ProjectMember[]

  @@map("projects")
}
```

**🔍 各カラムの詳細解説**:

| カラム名 | 型 | 意味 | 例 |
|---------|---|------|-----|
| `id` | String | プロジェクトの識別番号 | "cm5xyz789abc" |
| `name` | String | プロジェクト名 | "新サイト構築" |
| `description` | String? | 説明（省略可） | "ECサイトのリニューアル" |
| `color` | String | プロジェクトの色 | "#ff5722" |
| `isArchived` | Boolean | アーカイブ済みか | false |
| `startDate` | DateTime? | 開始日 | 2024-01-01 |
| `endDate` | DateTime? | 終了日 | 2024-03-31 |
| `createdAt` | DateTime | 作成日時 | 2024-12-29... |
| `updatedAt` | DateTime | 更新日時 | 2024-12-29... |

> 💡 **例え話**: プロジェクトファイル
> 
> Projectモデルは「プロジェクトファイル（フォルダ）」のようなものです：
> 
> - **name**: フォルダ名（「2024年度_新サイト構築」）
> - **description**: フォルダの説明メモ
> - **color**: フォルダの色（整理しやすいように色分け）
> - **isArchived**: 「このフォルダは終了済み」という付箋
> - **startDate / endDate**: プロジェクトの期間
> - **tasks**: フォルダの中に入っているタスク（ファイル）
> - **members**: このプロジェクトに参加しているメンバー

**💻 Prisma Studioで確認**:

1. Prisma Studioで`projects`テーブルをクリック

2. サンプルプロジェクトが表示されます：
   - "Webサイトリニューアル"
   - "モバイルアプリ開発"
   など

3. プロジェクトをクリックして詳細を見る

4. **Relations**を確認：
   - tasks: このプロジェクトに属するタスクの数
   - members: このプロジェクトのメンバーの数

---

### Step 6: Taskモデルを理解する

**🔰 初心者向け解説**: 

Taskモデルは、このアプリの**核心**です。タスク管理アプリなので、一番重要なデータ構造です。

**💻 実装方法**:

`schema.prisma`で`model Task`の部分を見てみましょう：

```prisma
// filepath: prisma/schema.prisma (Taskモデル部分)
// ---------------------------------------------------------
// タスク情報を保存するテーブルの設計図
// ---------------------------------------------------------

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

  // Relations
  projectId   String  @map("project_id")
  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdById String  @map("created_by_id")
  createdBy   User    @relation("TaskCreator", fields: [createdById], references: [id])
  assigneeId  String? @map("assignee_id")
  assignee    User?   @relation("TaskAssignee", fields: [assigneeId], references: [id])

  comments Comment[]

  @@map("tasks")
}
```

**🔍 各カラムの詳細解説**:

#### 基本情報

| カラム名 | 型 | 意味 | 例 |
|---------|---|------|-----|
| `id` | String | タスクの識別番号 | "cm6abc456def" |
| `title` | String | タスクのタイトル | "ログイン画面の実装" |
| `description` | String? | 詳細説明 | "Material-UIを使用して..." |

#### ステータス関連

| カラム名 | 型 | 意味 | 例 |
|---------|---|------|-----|
| `status` | TaskStatus | 進行状況 | TODO / IN_PROGRESS / DONE など |
| `priority` | TaskPriority | 優先度 | LOW / MEDIUM / HIGH / URGENT |
| `dueDate` | DateTime? | 期限 | 2024-12-31 |
| `completedAt` | DateTime? | 完了日時 | 2024-12-29... |

#### 作業時間関連

| カラム名 | 型 | 意味 | 例 |
|---------|---|------|-----|
| `estimatedHours` | Float? | 見積もり時間（時間） | 3.5 |
| `actualHours` | Float | 実際の作業時間（時間） | 4.2 |
| `timeSpentMinutes` | Float | 作業時間（分） | 252 |
| `isTimerActive` | Boolean | タイマーが動いているか | true / false |
| `timerStartedAt` | DateTime? | タイマー開始時刻 | 2024-12-29 14:30:00 |

#### その他

| カラム名 | 型 | 意味 | 例 |
|---------|---|------|-----|
| `position` | Int | 表示順序 | 1, 2, 3... |

> 💡 **例え話**: 付箋（TODO）
> 
> Taskモデルは「付箋（TODO）」のようなものです：
> 
> - **title**: 付箋に大きく書いたタスク名（「牛乳を買う」）
> - **description**: 付箋の裏に小さく書いた詳細（「低脂肪、1リットル」）
> - **status**: 付箋の色（黄色=未着手、青=進行中、緑=完了）
> - **priority**: 付箋の★マーク（★★★=緊急）
> - **dueDate**: 付箋の右上に書いた期限（「12/31まで」）
> - **estimatedHours**: 「これ、何時間かかる？」のメモ
> - **isTimerActive**: ストップウォッチが動いているか
> - **projectId**: どのプロジェクトボードに貼るか
> - **assigneeId**: 誰がこの付箋を担当するか

#### Enum（列挙型）の理解

TaskStatusとTaskPriorityは**Enum（列挙型）**です。「決められた値のどれか」しか入りません。

```prisma
enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
  CANCELLED
  BLOCKED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

> 💡 **例え話**: 信号機
> 
> Enumは「信号機の色」のようなものです。
> 
> - 信号の色は「赤、黄、青」の**3つだけ**。「緑」とか「紫」にはならない。
> - TaskStatusも「TODO、IN_PROGRESS、DONE...」の**決められた値だけ**。適当な値は入らない。
> 
> これにより、「ステータスが"完了"なのか"DONE"なのか"done"なのか」という混乱を防げます。

**💻 Prisma Studioで確認**:

1. Prisma Studioで`tasks`テーブルをクリック

2. サンプルタスクが表示されます

3. タスクをクリックして詳細を見る

4. **status**や**priority**の値を確認（ENUMで定義された値のどれかになっている）

5. **Relations**を確認：
   - project: このタスクが属するプロジェクト
   - createdBy: このタスクを作った人
   - assignee: このタスクの担当者
   - comments: このタスクのコメント

---

### Step 7: リレーション（関係性）を理解する

**🔰 初心者向け解説**: 

リレーションは「テーブル同士の関係」です。これが理解できると、データベースの真の力がわかります！

> 💡 **例え話**: 家族関係図
> 
> リレーションは「家族関係図」のようなものです。
> 
> - **田中太郎さん**（User）
> - **新サイト構築プロジェクト**（Project）
> - **ログイン画面の実装**（Task）
> 
> これらの関係：
> - 田中太郎さんは「新サイト構築」プロジェクトのメンバー
> - 田中太郎さんは「ログイン画面の実装」タスクを作成した
> - 「ログイン画面の実装」は「新サイト構築」プロジェクトに属する
> 
> このように、データは単独ではなく、**お互いに関係している**んです。

#### リレーションの種類

##### 1. 1対多（One-to-Many）

「1つのAに対して、複数のBがある」という関係。

```prisma
model Project {
  id    String @id
  name  String
  tasks Task[]  // ← 1つのProjectに複数のTask
}

model Task {
  id        String  @id
  title     String
  projectId String  // ← 各Taskはどれか1つのProjectに属する
  project   Project @relation(fields: [projectId], references: [id])
}
```

> 💡 **例え話**: 本棚と本
> 
> - **1つの本棚**（Project）に**複数の本**（Task）が入っている
> - 各本は、必ずどれか1つの本棚に入っている
> 
> 「新サイト構築」プロジェクトには：
> - 「ログイン画面の実装」タスク
> - 「ダッシュボードの実装」タスク
> - 「ユーザー登録の実装」タスク
> など、複数のタスクが紐づいています。

##### 2. 多対多（Many-to-Many）

「複数のAが複数のBに関係する」という関係。

```prisma
model User {
  id       String          @id
  name     String
  projects ProjectMember[]  // ← 1人のUserが複数のProjectに参加
}

model Project {
  id      String          @id
  name    String
  members ProjectMember[]  // ← 1つのProjectに複数のUserが参加
}

model ProjectMember {
  id        String  @id
  userId    String
  user      User    @relation(fields: [userId], references: [id])
  projectId String
  project   Project @relation(fields: [projectId], references: [id])
  role      ProjectMemberRole
}
```

> 💡 **例え話**: 部活とメンバー
> 
> - **田中さん**は「野球部」と「ボランティア部」に入っている（1人が複数の部活）
> - **野球部**には田中さん、佐藤さん、鈴木さんがいる（1つの部活に複数のメンバー）
> 
> 間に**ProjectMember**という「中間テーブル」があることで、この関係を表現できます。

#### リレーションの確認方法

**💻 Prisma Studioで実際に見てみよう**:

1. Prisma Studioで`users`テーブルを開く

2. `admin@example.com`のユーザーをクリック

3. 下にスクロールして**Relations**セクションを見る：
   ```
   createdTasks: 3 records
   assignedTasks: 5 records
   projects: 2 records
   ```

4. **「createdTasks」の「3 records」をクリック**

5. このユーザーが作成した3つのタスクが表示される！

6. タスクの1つをクリックすると、そのタスクの詳細が見られる

7. さらにそのタスクの**project**をクリックすると、タスクが属するプロジェクトに飛べる！

**🎉 これがリレーションの力！**

データが「点」ではなく「線」で繋がっている。だから、「このユーザーが参加しているプロジェクトの、進行中のタスク」みたいな複雑な情報も簡単に取得できるんです。

#### コードでリレーションを使う例

```typescript
// ユーザーとその関連データをまとめて取得
const user = await prisma.user.findUnique({
  where: { email: 'admin@example.com' },
  include: {
    createdTasks: true,      // 作成したタスク
    assignedTasks: true,     // 割り当てられたタスク
    projects: {              // 参加プロジェクト
      include: {
        project: true        // プロジェクト詳細も含める
      }
    }
  }
});

// 結果: user.createdTasks に、ユーザーが作ったタスクの配列が入っている
console.log(user.createdTasks); // [{ id: '...', title: 'ログイン画面', ... }, ...]
```

**📝 今は完全に理解できなくてOK**

今は「データが繋がっているんだ」という感覚が掴めれば十分です。実際にコードを書く時（Day 8以降）に、改めて学びます。

---

## 🎉 今日の成果

🎊 **お疲れさまでした！** 🎊

今日は、アプリの「心臓部」であるデータベースを理解しました！

### 今日達成したこと

✅ データベースの基本概念を理解（図書館の例え）
✅ Prismaスキーマファイルを読めるようになった
✅ Userモデルの全カラムの意味を理解
✅ Prisma Studioでデータを見た、触った
✅ Projectモデルの構造を理解
✅ Taskモデルの詳細な構造を理解
✅ リレーション（1対多、多対多）の概念を理解

### これができるようになりました

- ✨ schema.prismaファイルが読める
- ✨ 「このデータはどこに保存されているか」がわかる
- ✨ Prisma Studioでデータを閲覧・確認できる
- ✨ User、Project、Taskの関係性が理解できた
- ✨ 「データベース」という言葉が怖くなくなった

### 重要な気づき

今日、一番重要な気づきは：

**「画面に表示されているものは、すべてデータベースから来ている」**

- ログイン画面のユーザー情報 → usersテーブル
- ダッシュボードのプロジェクト一覧 → projectsテーブル
- タスク一覧 → tasksテーブル

データベースがわかれば、アプリの**80%が理解できた**と言っても過言ではありません！

---

## 🧠 理解度チェック（復習）

### Q1: データベース、テーブル、レコード、カラムの違いを例え話で説明してください。

<details>
<summary>答えを見る</summary>

**答え**: 図書館の例えで：

- **データベース**: 図書館全体
- **テーブル**: 本棚のエリア（「小説」「雑誌」のように種類ごと）
- **レコード**: 1冊の本
- **カラム**: 本のタイトル、著者、出版年などの項目

</details>

### Q2: Prismaの役割は何ですか？なぜ使うのですか？

<details>
<summary>答えを見る</summary>

**答え**: PrismaはORM（Object-Relational Mapping）ツールです。

**役割**: TypeScriptのコードを、データベースが理解できるSQL言語に翻訳してくれる「翻訳機」のような存在。

**なぜ使うか**: SQL言語を直接書かなくても、TypeScriptでデータベースを操作できるので、開発が簡単になる。また、型安全性が保たれる（間違ったデータを入れようとするとエラーになる）。

</details>

### Q3: `@id`、`@unique`、`@default`の意味は何ですか？

<details>
<summary>答えを見る</summary>

**答え**:

- **@id**: 主キー。このカラムでレコードを一意に識別する。（例：社員番号）
- **@unique**: 一意制約。同じ値が2つ存在できない。（例：メールアドレスは重複不可）
- **@default**: デフォルト値。値が指定されなかった時に自動で入る値。（例：`@default(true)`なら、何も指定しないとtrueになる）

</details>

### Q4: `String?`の`?`は何を意味しますか？

<details>
<summary>答えを見る</summary>

**答え**: `?`は「省略可能（nullable）」という意味です。

- `String`: 必ず値が必要
- `String?`: 値がなくてもOK（nullを許可）

例：`name String?`は「名前は入力してもしなくてもいい」という意味です。

</details>

### Q5: 1対多のリレーションを、日常の例え話で説明してください。

<details>
<summary>答えを見る</summary>

**答え**: いくつか例があります：

**例1: 本棚と本**
- 1つの本棚に、複数の本が入っている
- 各本は、どれか1つの本棚に入っている

**例2: 親と子**
- 1人の親に、複数の子どもがいる
- 各子どもには、1人の親がいる（この例では簡略化）

**例3: ProjectとTask**
- 1つのプロジェクトに、複数のタスクがある
- 各タスクは、どれか1つのプロジェクトに属する

</details>

### Q6: Prisma Studioで何ができますか？

<details>
<summary>答えを見る</summary>

**答え**: Prisma Studioでは、以下のことができます：

1. **データの閲覧**: テーブルの中身を見る
2. **データの編集**: レコードの値を変更
3. **データの追加**: 新しいレコードを追加
4. **データの削除**: レコードを削除
5. **リレーションの確認**: 関連するデータに飛べる

ブラウザで`http://localhost:5555`にアクセスすると使えます。

</details>

---

## ❓ よくあるトラブルと解決方法

### トラブル 1: Prisma Studioが起動しない

**原因**: データベース（Docker）が起動していない

**解決方法**:
1. Docker Desktopが起動しているか確認
2. `docker ps`でコンテナが動いているか確認
3. 動いていない場合は`task init`を実行
4. もう一度`npm run db:studio`を実行

### トラブル 2: Prisma Studioでテーブルが空（データがない）

**原因**: シードデータが投入されていない

**解決方法**:
1. ターミナルで`task seed`を実行
2. シードデータが投入される（ユーザー、プロジェクト、タスクなど）
3. Prisma Studioをリロード（F5キー）

### トラブル 3: schema.prismaを編集したら、アプリがエラーになった

**原因**: Prismaクライアントが更新されていない

**解決方法**:
1. **まず、編集を元に戻す**（Ctrl+Zで取り消し）
2. 今は`schema.prisma`を編集しないでください
3. 編集が必要な場合（後日の学習）は、編集後に以下を実行:
   ```bash
   npm run db:generate
   npm run db:push
   ```

### トラブル 4: 「このカラムの意味がわからない」

**解決方法**:
- 今は全部理解できなくてOKです
- よく使うカラム（id、name、email など）から覚えていきましょう
- 実際にコードを書く時（Day 8以降）に、また詳しく学びます

---

## 📚 今日の用語まとめ

| 用語 | 意味 | 例え |
|------|------|------|
| データベース | データを保存する場所 | 図書館全体 |
| テーブル | データの種類ごとの箱 | 本棚のエリア |
| レコード（行） | 1つのデータ | 1冊の本 |
| カラム（列） | データの項目 | 本のタイトル、著者など |
| 主キー | レコードを識別する番号 | 図書管理番号 |
| 外部キー | 他のテーブルへの参照 | 「◯◯の続編」 |
| ORM | DBを簡単に扱えるツール | 翻訳機 |
| Prisma | 今回使うORM | TypeScript⇔SQLの翻訳機 |
| リレーション | テーブル同士の関係 | 家族関係図 |
| 1対多 | 1つに対して複数 | 本棚と本 |
| 多対多 | 複数対複数 | 部活とメンバー |

---

## 🚀 明日の予告: Day 4

明日は、**TypeScriptの基礎**を学びます！

### 明日やること:
- JavaScriptとTypeScriptの違い
- 型（type）とは何か？
- よく使う型の紹介（string、number、boolean、配列、オブジェクト）
- 実際のコードで型を見てみる
- インターフェースとtype aliasの違い

**明日の目標**: TypeScriptのコードが「なんとなく読める」ようになる！

今日学んだデータベースの知識と、明日学ぶTypeScriptの知識が合わさると、「Prismaで型安全にデータベースを操作する」ことの凄さがわかります。

### 今日のおさらい

今夜、寝る前に以下を復習しましょう:

1. Prisma Studioを開いて、もう一度データを眺める
2. `users`、`projects`、`tasks`の3つのテーブルを見る
3. リレーションをクリックして、データが繋がっていることを確認
4. schema.prismaファイルを開いて、モデル定義を眺める

**Prisma Studioの停止方法**:

ターミナルで`Ctrl + C`を押すと、Prisma Studioが停止します。

お疲れさまでした！データベースという「見えないもの」が、少し見えるようになりましたね。明日も楽しみにしていてください！🎉

---

**Day 3 完了！次は [Day 4: TypeScriptの基礎知識](./day04_typescript基礎.md) へ進みましょう！**
