# Day 16: RBAC — ロールベースアクセス制御

## 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **認可 vs 認証の区別** | セキュリティ設計の基礎 | ✅ 2 つの概念を正確に説明できる |
| **ロール enum 設計** | Prisma スキーマ | ✅ UserRole / ProjectMemberRole を使い分けられる |
| **tRPC ミドルウェア** | adminProcedure の仕組み | ✅ ミドルウェアチェーンを理解できる |
| **フロントエンド権限チェック** | 条件付きレンダリング | ✅ ロールに応じた UI 制御ができる |
| **プロジェクトメンバー役割管理** | addMember / updateMemberRole | ✅ OWNER 保護ロジックを実装できる |

## なぜこれを学ぶのか?

**「ログインできる」と「何でもできる」は違います。** Day 6 の NextAuth で「誰が操作しているか」(認証)を解決しました。Day 16 では「その人に何が許可されているか」(認可)を設計します。

- **認証(Authentication)**: 「あなたは誰?」→ JWT / Session で確認
- **認可(Authorization)**: 「あなたは何ができる?」→ ロール / 権限テーブルで確認

実務では認可の設計ミスが情報漏洩や権限昇格攻撃につながるため、体系的に学ぶ価値があります。

## 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | ロール enum 設計と Prisma スキーマ | 2ステップ | 20分 |
| **Part 2** | tRPC ミドルウェアによる認可 | 2ステップ | 25分 |
| **Part 3** | フロントエンド権限チェックとメンバー管理 | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: ロール enum 設計と Prisma スキーマ(20分)

#### Step 1.1: 2 層のロール設計(所要時間:10分)

**このステップで学ぶこと**: システム全体のロールとプロジェクト単位のロールを分けて管理する設計。

**なぜ必要?**: 1 つの enum にすべてを詰め込むと、「管理者だがこのプロジェクトのオーナーではない」のような複合条件を表現できなくなります。

**コードの仕組み解説**:

```typescript
// filepath: src/lib/constant/roles.ts

// ---- 第 1 層: システムロール ----
// 全体の管理者かどうかを決める
export const USER_ROLE = {
  USER: 'USER',    // 一般ユーザー
  ADMIN: 'ADMIN',  // システム管理者(全プロジェクトを閲覧できる等)
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

// ---- 第 2 層: プロジェクトメンバーロール ----
// プロジェクト内での役割を決める
// 1 ユーザーが複数プロジェクトに異なるロールで参加できる
export const PROJECT_MEMBER_ROLE = {
  OWNER: 'OWNER',   // プロジェクト作成者。全権限 + アーカイブ
  ADMIN: 'ADMIN',   // メンバー管理も可。アーカイブは不可
  MEMBER: 'MEMBER', // タスク編集可。削除・メンバー管理は不可
  VIEWER: 'VIEWER', // 閲覧のみ
} as const;

export type ProjectMemberRole =
  (typeof PROJECT_MEMBER_ROLE)[keyof typeof PROJECT_MEMBER_ROLE];
```

**2 層設計の使い分け**:

| ロール層 | 格納場所 | チェック場所 |
|---------|---------|------------|
| `UserRole` | `User.role` | tRPC `adminProcedure` / プロジェクト一覧の他ユーザー閲覧 |
| `ProjectMemberRole` | `ProjectMember.role` | タスク操作 / メンバー管理 / プロジェクト削除 |

---

#### Step 1.2: 権限テーブルとロールガード(所要時間:10分)

**このステップで学ぶこと**: ロールと操作を対応付けるテーブル構造と型ガード関数。

**なぜ必要?**: `if (role === 'OWNER' || role === 'ADMIN')` を毎回書くと、ロールが増えたときに漏れが出ます。権限テーブルを 1 箇所に集中させることで変更が 1 点で済みます。

**コードの仕組み解説**:

```typescript
// filepath: src/lib/constant/roles.ts (続き)

// 各ロールが持つ権限を一覧で定義
// 新しい権限を追加するときはここに 1 行足すだけで全プロシージャに反映される
export const PROJECT_MEMBER_ROLE_PERMISSIONS: Record<
  ProjectMemberRole,
  {
    canEdit: boolean;          // タスク編集
    canDelete: boolean;        // タスク削除
    canManageMembers: boolean; // メンバー追加/削除/ロール変更
    canArchive: boolean;       // プロジェクトアーカイブ
    canView: boolean;          // 閲覧(全ロールが持つ)
  }
> = {
  OWNER:  { canEdit: true,  canDelete: true,  canManageMembers: true,  canArchive: true,  canView: true },
  ADMIN:  { canEdit: true,  canDelete: true,  canManageMembers: true,  canArchive: false, canView: true },
  MEMBER: { canEdit: true,  canDelete: false, canManageMembers: false, canArchive: false, canView: true },
  VIEWER: { canEdit: false, canDelete: false, canManageMembers: false, canArchive: false, canView: true },
};

export type PermissionKey =
  keyof (typeof PROJECT_MEMBER_ROLE_PERMISSIONS)[ProjectMemberRole];

// 型ガード: 文字列が ProjectMemberRole かどうかを安全に確認する
// Prisma の生成型と自前定義型を統一するために使う
export function isProjectMemberRole(value: unknown): value is ProjectMemberRole {
  return typeof value === 'string' && value in PROJECT_MEMBER_ROLE;
}

// 権限チェックの本体
// 例: hasPermission('VIEWER', 'canEdit') === false
export function hasPermission(
  role: ProjectMemberRole,
  permission: PermissionKey
): boolean {
  return PROJECT_MEMBER_ROLE_PERMISSIONS[role][permission];
}
```

**権限マトリックス(早見表)**:

| 権限 | OWNER | ADMIN | MEMBER | VIEWER |
|------|:-----:|:-----:|:------:|:------:|
| canView | ✅ | ✅ | ✅ | ✅ |
| canEdit | ✅ | ✅ | ✅ | ❌ |
| canDelete | ✅ | ✅ | ❌ | ❌ |
| canManageMembers | ✅ | ✅ | ❌ | ❌ |
| canArchive | ✅ | ❌ | ❌ | ❌ |

---

### Part 2: tRPC ミドルウェアによる認可(25分)

#### Step 2.1: adminProcedure — システムロールのミドルウェア(所要時間:12分)

**このステップで学ぶこと**: tRPC ミドルウェアを連結して認証→認可の順にチェックする構造。

**なぜ必要?**: ミドルウェアを連結することで、認証と認可を独立したモジュールにできます。`adminProcedure` は `protectedProcedure` の上に重ねるだけで追加できます。

**コードの仕組み解説**:

```typescript
// filepath: src/server/api/trpc.ts

import { initTRPC, TRPCError } from '@trpc/server';
import { USER_ROLE } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await getSession();
  return { session, ...opts };
};

const t = initTRPC.context<Context>().create({ transformer: superjson });

// ---- ミドルウェア 1: 認証チェック ----
// セッションがない → UNAUTHORIZED
// ユーザーが存在しない → UNAUTHORIZED
// アカウントが無効 → FORBIDDEN
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'ログインが必要です' });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: ctx.session.userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!currentUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'ユーザーが見つかりません' });
  }

  if (!currentUser.isActive) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'このアカウントは無効化されています' });
  }

  // ctx に role を追加して次のミドルウェアで使えるようにする
  return next({
    ctx: { session: { ...ctx.session, role: currentUser.role } },
  });
});

// ---- ミドルウェア 2: 管理者チェック ----
// isAuthenticated の後に連結することで ctx.session.role が確実に存在する
// 単独で使うと ctx.session が null のまま通過してしまうため isAuthenticated 経由専用
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (ctx.session?.role !== USER_ROLE.ADMIN) {
    throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
  }
  return next({ ctx });
});

// ---- プロシージャのエクスポート ----
export const publicProcedure    = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
// adminProcedure = 認証 → 管理者チェック の順にミドルウェアを実行
export const adminProcedure     = t.procedure.use(isAuthenticated).use(isAdmin);
```

**ミドルウェアチェーンの実行フロー**:

```
リクエスト
  ↓
isAuthenticated
  ├─ セッションなし → UNAUTHORIZED (ここで終了)
  ├─ ユーザー不在  → UNAUTHORIZED (ここで終了)
  ├─ 無効アカウント → FORBIDDEN   (ここで終了)
  └─ OK → ctx.session.role を付与して next()
              ↓
           isAdmin (adminProcedure のみ)
             ├─ role !== ADMIN → FORBIDDEN (ここで終了)
             └─ OK → next()
                         ↓
                      プロシージャ本体を実行
```

---

#### Step 2.2: ProjectMemberRole によるリソースレベル認可(所要時間:13分)

**このステップで学ぶこと**: プロジェクトごとに異なるロールを `assertMemberPermission` で一元チェックする。

**なぜ必要?**: ミドルウェアはリクエスト単位。プロジェクトメンバーシップはリソース単位で確認が必要なため、プロシージャ内で都度チェックします。

**permission ヘルパーの仕組み**:

```typescript
// filepath: src/server/api/routers/_helpers/permission.ts

import { TRPCError } from '@trpc/server';
import { hasPermission, isProjectMemberRole, type PermissionKey } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';

// メンバーが指定の権限を持っているか確認する
// members[0] が現在のユーザーのメンバーシップレコード(userId で WHERE 済み)
export const assertMemberPermission = (
  members: { role: string }[],
  permission?: PermissionKey,
): void => {
  const member = members[0];

  if (!member) {
    // プロジェクトのメンバーでない
    throw new TRPCError({ code: 'FORBIDDEN', message: 'この操作を実行する権限がありません' });
  }

  if (permission) {
    if (!isProjectMemberRole(member.role)) {
      // DB の値が既知の enum 値でない(データ不整合)
      throw new TRPCError({ code: 'FORBIDDEN', message: 'この操作を実行する権限がありません' });
    }

    if (!hasPermission(member.role, permission)) {
      // ロールは正当だが権限が不足
      throw new TRPCError({ code: 'FORBIDDEN', message: 'この操作を実行する権限がありません' });
    }
  }
};

// タスクを取得しつつ、呼び出し元ユーザーのメンバーシップを一緒に取得する
// WHERE userId = currentUser にすることで、メンバーでないユーザーは空配列になる
export const findTaskWithPermission = async (
  taskId: string,
  userId: string,
  permission?: PermissionKey,
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          // WHERE で絞ることで「自分のメンバーシップ」だけ取得
          members: { where: { userId } },
        },
      },
    },
  });

  if (!task) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'タスクが見つかりません' });
  }

  // permission が指定された場合はそのロールが必要
  assertMemberPermission(task.project.members, permission);

  return task;
};
```

**プロシージャでの使用例**:

```typescript
// filepath: src/server/api/routers/task.ts (抜粋)

// 削除: canDelete 権限が必要(OWNER / ADMIN のみ)
delete: protectedProcedure
  .input(z.object({ id: z.string().cuid() }))
  .mutation(async ({ ctx, input }) => {
    const task = await findTaskWithPermission(input.id, ctx.session.userId);
    assertMemberPermission(task.project.members, 'canDelete');

    await prisma.task.delete({ where: { id: input.id } });
    return { success: true };
  }),

// タイマー操作: canEdit 権限が必要(VIEWER は不可)
updateTimer: protectedProcedure
  .input(taskTimerSchema)
  .mutation(async ({ ctx, input }) => {
    const task = await findTaskWithPermission(input.id, ctx.session.userId, 'canEdit');
    // ... タイマー処理
  }),
```

---

### Part 3: フロントエンド権限チェックとメンバー管理(15分)

#### Step 3.1: 条件付きレンダリングとメンバー役割管理(所要時間:15分)

**このステップで学ぶこと**: サーバーの権限チェックに加えて、UI でも操作ボタンを隠す方法。

**なぜ必要?**: サーバー側の認可は必須ですが、権限のないボタンを表示するとユーザーが押してからエラーになります。フロントでも事前に隠すことで UX が向上します。

**重要**: UI での非表示は UX のためであり、セキュリティの代替ではありません。必ずサーバー側でも認可チェックを行います。

**フロントエンドでの権限チェック**:

```typescript
// filepath: 知識整理 — フロントエンドの権限チェックパターン

import { hasPermission, type ProjectMemberRole } from '@/lib/constant/roles';

// ユーザー自身のロールを取得してボタン表示を制御する例
function TaskActions({
  task,
  currentUserRole,
}: {
  task: Task;
  currentUserRole: ProjectMemberRole;
}) {
  // サーバーと同じ権限テーブルを使う
  // → バックエンドとフロントエンドで権限定義が一致することを保証
  const canEdit   = hasPermission(currentUserRole, 'canEdit');
  const canDelete = hasPermission(currentUserRole, 'canDelete');

  return (
    <div>
      {/* VIEWER には「編集」ボタンを表示しない */}
      {canEdit && (
        <button onClick={() => openEditDialog(task.id)}>編集</button>
      )}

      {/* MEMBER / VIEWER には「削除」ボタンを表示しない */}
      {canDelete && (
        <button onClick={() => handleDelete(task.id)}>削除</button>
      )}
    </div>
  );
}
```

**プロジェクトメンバー管理の実装**:

```typescript
// filepath: src/server/api/routers/project.ts (抜粋)

// メンバー追加: canManageMembers が必要(OWNER / ADMIN のみ)
addMember: protectedProcedure
  .input(projectMemberSchema)
  .mutation(async ({ ctx, input }) => {
    // 操作者自身のメンバーシップを確認
    const userMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: ctx.session.userId,
          projectId: input.projectId,
        },
      },
    });

    assertMemberPermission(userMember ? [userMember] : [], 'canManageMembers');

    // 既にメンバーなら CONFLICT
    const existing = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
    });
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'このユーザーは既にプロジェクトのメンバーです' });
    }

    return await prisma.projectMember.create({
      data: input,
      include: { user: { select: USER_SELECT } },
    });
  }),

// ロール変更: canManageMembers が必要 + OWNER 保護ロジック
updateMemberRole: protectedProcedure
  .input(
    z.object({
      projectId: z.string().cuid(),
      userId: z.string().cuid(),
      role: projectMemberRoleSchema,
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const userMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: ctx.session.userId,
          projectId: input.projectId,
        },
      },
    });

    assertMemberPermission(userMember ? [userMember] : [], 'canManageMembers');

    // トランザクション: OWNER 保護チェックと更新をアトミックに実行
    return await prisma.$transaction(async (tx) => {
      const targetMember = await tx.projectMember.findUnique({
        where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
      });

      if (!targetMember) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'メンバーが見つかりません' });
      }

      // OWNER を別ロールに降格しようとした場合: 他に OWNER がいるか確認
      if (
        targetMember.role === PROJECT_MEMBER_ROLE.OWNER &&
        input.role !== PROJECT_MEMBER_ROLE.OWNER
      ) {
        const ownerCount = await tx.projectMember.count({
          where: { projectId: input.projectId, role: PROJECT_MEMBER_ROLE.OWNER },
        });

        if (ownerCount === 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'プロジェクト唯一のオーナーの権限は変更できません',
          });
        }
      }

      return await tx.projectMember.update({
        where: { userId_projectId: { userId: input.userId, projectId: input.projectId } },
        data: { role: input.role },
        include: { user: { select: USER_SELECT } },
      });
    });
  }),
```

**OWNER 保護ロジックの必要性**:

```
なぜトランザクションが必要か?

1. OWNER が 2 人いる状態で、2 人を同時に MEMBER に降格しようとした場合:
   - リクエスト A: ownerCount 確認 → 2 人 → OK
   - リクエスト B: ownerCount 確認 → 2 人 → OK (A がまだ完了していない)
   - リクエスト A: role を MEMBER に変更
   - リクエスト B: role を MEMBER に変更 → OWNER が 0 人になってしまう!

2. $transaction を使うことで、ownerCount の確認と role の変更がアトミックになる
   → 競合が起きても OWNER が必ず 1 人以上残ることを保証できる
```

---

## 今日の成果

以下の内容を実装できたことを確認:

1. **認可 vs 認証**
   - [ ] Day 6 の NextAuth が「認証」、今日が「認可」であることを説明できる
   - [ ] 2 層ロール(UserRole / ProjectMemberRole)の使い分けを説明できる

2. **ロール enum と権限テーブル**
   - [ ] `PROJECT_MEMBER_ROLE_PERMISSIONS` を読んで各ロールの権限を確認した
   - [ ] `hasPermission('VIEWER', 'canEdit')` が false を返すことを確認した

3. **tRPC ミドルウェア**
   - [ ] `adminProcedure` が `isAuthenticated → isAdmin` の順で実行されることを確認した
   - [ ] MEMBER ロールで delete を試みて FORBIDDEN が返ることを確認した

4. **メンバー管理**
   - [ ] OWNER が 1 人の状態でロール変更を試みてエラーになることを確認した
   - [ ] addMember で重複追加を試みて CONFLICT が返ることを確認した

---

## 練習問題

1. `ADMIN` ロールと `MEMBER` ロールの権限の違いを `PROJECT_MEMBER_ROLE_PERMISSIONS` を見ながら説明してください。

2. `adminProcedure` のミドルウェアチェーンで `isAdmin` を `isAuthenticated` より前に置くと何が問題になりますか?

3. `VIEWER` がプロジェクトのタスク一覧を見ようとした場合、`findTaskWithPermission` はどのように動作しますか? `canView` が全ロールに true である設計の意図を説明してください。

4. `updateMemberRole` でトランザクションを使わなかった場合、どのような競合が起きますか? 具体的なシナリオで説明してください。

---

## まとめ

- **認証 vs 認可**: Day 6 の NextAuth が「誰か」を解決し、今日が「何ができるか」を解決する
- **2 層ロール**: `UserRole`(システム全体) と `ProjectMemberRole`(プロジェクト単位) を分ける
- **権限テーブルを 1 箇所に集中**: `PROJECT_MEMBER_ROLE_PERMISSIONS` を変更するだけで全プロシージャに反映される
- **ミドルウェアチェーン**: `protectedProcedure` → `adminProcedure` のように積み重ねる
- **フロントは UX、サーバーはセキュリティ**: 両方でチェックするが、セキュリティはサーバーが担保する
- **OWNER 保護**: トランザクションで孤立を防ぐ

次回(Day 17)は Vitest と Playwright を使ったテスト実装です。
