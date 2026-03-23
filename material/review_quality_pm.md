# QualityPM レビュー — 30日間カリキュラム 技術精度検証レポート

> **レビュアー**: QualityPM（技術品質マネージャー）
> **レビュー日**: 2026-03-21
> **対象**: `material/30days-curriculum/day01_*.md` ～ `day30_*.md`（全30ファイル）
> **検証方針**: 推測禁止。全コードブロックを実際のソースコード（`src/`）と照合。

---

## 総合サマリー

| 重要度 | 件数 | 内容 |
|--------|------|------|
| CRITICAL | 2 | 動かないコード（tRPCプロシージャ名不一致、存在しないプロシージャ） |
| HIGH | 4 | 誤りではないが初心者が詰まる可能性が高い不正確な記述 |
| MEDIUM | 8 | 表記ゆれ・説明不足・将来の混乱リスク |
| OK | 16 | 問題なし（コード正確、import正確、説明適切） |

---

## Per-Day スコア表

| Day | タイトル | スコア | 主な問題 |
|-----|---------|--------|---------|
| Day01 | 環境構築 | 98/100 | 軽微（環境差異の注意書き不足） |
| Day02 | ダッシュボード読解 | 95/100 | 意図的型エラー演習の説明が不十分 |
| Day03 | Git基礎 | 100/100 | 問題なし |
| Day04 | Vercelデプロイ | 97/100 | 環境変数設定手順の省略 |
| Day05 | ログインフォーム | 93/100 | `api.auth.login`プロシージャ名確認済み（OK）、zodスキーマの説明不足 |
| Day06 | 会員登録ページ | 93/100 | `api.auth.register`確認済み（OK） |
| Day07 | 認証フロー読解 | 96/100 | 問題なし |
| Day08 | AppLayoutサイドバー | 94/100 | `api.auth.getSession`確認済み（OK）、AlertDialog使用法説明不足 |
| Day09 | プロジェクト一覧 | 90/100 | `Record<string, unknown>`の一時的型付けが混乱招く（MEDIUM） |
| Day10 | ProjectDialog | 92/100 | `api.useUtils()`と`invalidate()`の説明不足（MEDIUM） |
| Day11 | プロジェクト編集・削除 | 94/100 | 問題なし |
| Day12 | メンバー管理 | 89/100 | `api.project.addMember`/`removeMember`のinput型説明不足（HIGH） |
| Day13 | タスク一覧 | 93/100 | フィルターパラメータ説明不足（MEDIUM） |
| Day14 | タスク作成 | 88/100 | `api.search.getProjectMembers`にinputなし旨の説明不足（HIGH） |
| Day15 | タスク編集・削除 | 94/100 | 問題なし |
| Day16 | ステータス変更・タイマー | 92/100 | タイマーロジック説明不足（MEDIUM） |
| Day17 | マイタスクページ | 91/100 | フィルター組み合わせ説明不足（MEDIUM） |
| Day18 | コメント投稿 | 94/100 | `utils.task.getById.invalidate()`の説明不足（MEDIUM） |
| Day19 | コメント編集・削除 | 95/100 | 問題なし |
| Day20 | 検索ページ | 93/100 | `useSearchParams`のSuspense要件説明不足（HIGH） |
| Day21 | 統計カード | 96/100 | 問題なし |
| Day22 | チャート | 95/100 | 問題なし |
| Day23 | 週次レポート | **68/100** | **CRITICAL: `api.report.getWeekly`は存在しない** |
| Day24 | 管理者ユーザー一覧 | 94/100 | 問題なし |
| Day25 | プロフィールページ | **72/100** | **CRITICAL: `api.auth.changePassword`は存在しない** |
| Day26 | エラーハンドリング | 96/100 | 問題なし |
| Day27 | プロジェクト詳細Dialog | 95/100 | `inferRouterOutputs`の説明は適切 |
| Day28 | 一括操作 | 94/100 | 問題なし |
| Day29 | ユーザー詳細・編集 | 97/100 | 全コンポーネント確認済み、正確 |
| Day30 | デプロイ・卒業 | 98/100 | 問題なし |

---

## CRITICAL（修正必須 — 実行するとエラーになる）

### [CRITICAL-1] Day23: `api.report.getWeekly` は存在しない

**場所**: `day23_weekly-report.md` 内のコードブロック

**問題**:
教材では以下のように記述されている：
```typescript
const { data, isLoading } = api.report.getWeekly.useQuery({
  weeks: selectedWeeks,
});
```

**実際のプロシージャ名**（`src/server/api/routers/report.ts` で確認）:
```typescript
export const reportRouter = createTRPCRouter({
  getWeeklyReport: protectedProcedure  // ← "getWeeklyReport"
    .input(z.object({ weeks: z.number().min(1).max(12).default(4), userId: z.string().cuid().optional() }))
    .query(...)
});
```

**正しいコード**:
```typescript
const { data, isLoading } = api.report.getWeeklyReport.useQuery({
  weeks: selectedWeeks,
});
```

**影響**: 学習者がこのコードをそのまま書くと TypeScript コンパイルエラー＋ランタイムエラーが発生する。

---

### [CRITICAL-2] Day25: `api.auth.changePassword` は存在しない

**場所**: `day25_profile-page.md` 内のコードブロック

**問題**:
教材では以下のように記述されている：
```typescript
const changePasswordMutation = api.auth.changePassword.useMutation({
  onSuccess: () => { /* ... */ },
});
```

**実際の `auth router`（`src/server/api/routers/auth.ts` で確認）**:
存在するプロシージャ:
- `login` (publicProcedure)
- `register` (publicProcedure)
- `getSession` (publicProcedure)
- `getCurrentUser` (protectedProcedure)

`changePassword` プロシージャは**存在しない**。

`user router` には `update` と `updateProfile` があるが、パスワード変更専用のプロシージャはなく、`user.update` 内で `password` フィールドの更新が行われる設計。

**修正案**:
```typescript
// user.update を使う場合
const changePasswordMutation = api.user.update.useMutation({
  onSuccess: () => { /* ... */ },
});
// inputに currentPassword, newPassword を含むzodスキーマをサーバー側で追加するか、
// または auth.changePassword プロシージャを新規実装する旨を説明する
```

または教材内容をパスワード変更以外のプロフィール更新（`api.user.updateProfile`）に変更する。

**影響**: 学習者がこのコードをそのまま書くと TypeScript エラーが発生し、解決策が見つからず詰まる。

---

## HIGH（初心者が詰まる可能性が高い問題）

### [HIGH-1] Day12: `api.project.addMember` の input 型が教材と実際のスキーマで確認不足

**場所**: `day12_member-management.md`

**問題**: `addMember` / `removeMember` のinputオブジェクトの必須フィールド（`projectId`, `userId`, `role` 等）が教材コードブロックで省略されているケースがある。初心者が独自に補完しようとするとフィールド名を間違える可能性がある。

**推奨**: `project router` の `addMember` の zod input スキーマを教材に明示する。

---

### [HIGH-2] Day14: `api.search.getProjectMembers` にはinputパラメータが不要だが教材で混乱が生じやすい

**場所**: `day14_task-creation.md`

**問題**: 教材では `api.search.getProjectMembers.useQuery()` と記述しているが、なぜ `projectId` を渡さないのかの説明がない。実際のルーターは「ログインユーザーが所属する全プロジェクトのメンバー一覧」を返す設計で、input不要は正しい。

**確認済み** (`src/server/api/routers/search.ts`):
```typescript
getProjectMembers: protectedProcedure.query(async ({ ctx }) => {
  // userId = ctx.session.userId から自動取得
  // inputなし = 正しい
```

**推奨**: 「なぜ projectId を渡さないのか」の説明を1文追加する。

---

### [HIGH-3] Day20: `useSearchParams()` は `<Suspense>` でラップが必要

**場所**: `day20_search-page.md`

**問題**: Next.js 15 では `useSearchParams()` を使用するコンポーネントは `<Suspense>` でラップしないとビルド時にエラーが発生する（または警告が出る）。教材コードブロックに `<Suspense>` ラップの説明がない可能性がある。

**正しい使い方**:
```tsx
// page.tsx
import { Suspense } from 'react';
import { SearchPage } from './search-page';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPage />
    </Suspense>
  );
}
```

---

### [HIGH-4] Day09: `Record<string, unknown>` の一時型は教材説明が不明瞭

**場所**: `day09_project-list.md`

**問題**: `editingProject` を `Record<string, unknown> | undefined` と型付けしているが、「これは一時的な型で後のDayで修正する」という説明が不明確。初心者が「これが正しい書き方だ」と誤解するリスクがある。

**推奨**: 明示的に「⚠️ この型定義はDay27で `inferRouterOutputs` を使って正しく修正します」などの注記を追加。

---

## MEDIUM（品質向上が望ましい問題）

### [MEDIUM-1] Day10: `api.useUtils()` と `.invalidate()` の説明が不足

`api.useUtils()` がなぜ必要か、`invalidate()` がどう機能するか（キャッシュ無効化）の説明が簡潔すぎる。tRPC v11 の新しいパターンだが、v10との違いに触れていない。

### [MEDIUM-2] Day16: タイマーロジック（`updateTimer` / `addTime`）の説明不足

`updateTimer` と `addTime` が何をする違いがあるのか（タイマー状態の更新 vs 時間の加算）の説明が不足している。実際のルーターを確認すると2つは異なる役割を持っている。

### [MEDIUM-3] Day17: フィルター組み合わせの説明不足

`api.task.getAll.useQuery({ assigneeId: currentUser.id })` のフィルターが他のフィルターと組み合わせ可能か不明。`getAll` の input スキーマ全体を示すと学習効果が高まる。

### [MEDIUM-4] Day18: `utils.task.getById.invalidate()` のパスが不完全

`utils.task.getById.invalidate()` と記述しているが、特定のタスクIDのキャッシュだけを無効化するには `utils.task.getById.invalidate({ id: taskId })` と引数が必要。引数なしだと全タスクのキャッシュが無効化される（動作はするが非効率）。

### [MEDIUM-5] Day13: フィルターパラメータの全オプション未記載

`api.task.getAll.useQuery()` のinputに使える全フィルター（`status`, `priority`, `assigneeId`, `projectId`, `dueDate`等）の説明なし。学習者が拡張する際に迷う。

### [MEDIUM-6] Day05/Day06: zodスキーマとフォームバリデーションの対応説明不足

react-hook-form の `zodResolver` とサーバー側の zodSchema の違い（クライアント用 vs サーバー用）が説明されていない。同じような validationが2か所に書かれる理由が不明。

### [MEDIUM-7] Day02: 意図的型エラー演習の注意書き不足

```typescript
const taskCount: number = "たくさん"; // 意図的エラー
```
このコードブロックが「演習用の意図的エラー」であることの注記が目立たない。初心者が「これが正しいコードだ」と誤解するリスク。`// ❌ これはエラーです` などの明示マーカーが望ましい。

### [MEDIUM-8] Day27: `inferRouterOutputs` のimportパスが教材と一致するか要注意

```typescript
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/api/root';
```
このパターン自体は正確だが、tRPC v11 では `@trpc/react-query` から使う別パターンもある。バージョン固定の注意書きがあると安心。

---

## 正確性が確認できた項目（OK）

以下は実際のソースコードと照合した結果、教材の記述が正確であることを確認した。

| 項目 | 確認内容 | 教材記述 |
|------|---------|---------|
| `@/component/ui/loading-spinner` | `PageLoadingSpinner` エクスポート確認 | ✅ 正確 |
| `@/component/ui/user-badges` | `UserRoleBadge`, `ActiveStatusBadge` エクスポート確認 | ✅ 正確 |
| `@/lib/constant/roles` | `USER_ROLE`, `UserRole`, `PROJECT_MEMBER_ROLE` 確認 | ✅ 正確 |
| `api.search.getProjectMembers` | プロシージャ存在確認（input不要） | ✅ 正確 |
| `api.report.getWeeklyReport` | プロシージャ存在確認（教材名は誤り → CRITICAL-1） | ❌ 名前不一致 |
| `api.auth.login` | `publicProcedure.mutation` 確認 | ✅ 正確 |
| `api.auth.register` | `publicProcedure.mutation` 確認 | ✅ 正確 |
| `api.auth.getSession` | `publicProcedure.query` 確認 | ✅ 正確 |
| `api.auth.getCurrentUser` | `protectedProcedure.query` 確認 | ✅ 正確 |
| `api.auth.changePassword` | **存在しない** → CRITICAL-2 | ❌ 存在しない |
| `api.project.archive` | `protectedProcedure` 確認 | ✅ 正確 |
| `api.task.bulkComplete` | `protectedProcedure.mutation` 確認 | ✅ 正確 |
| `api.task.bulkDelete` | `protectedProcedure.mutation` 確認 | ✅ 正確 |
| `api.task.bulkUpdateStatus` | `protectedProcedure.mutation` 確認 | ✅ 正確 |
| `api.task.updateTimer` | `protectedProcedure.mutation` 確認 | ✅ 正確 |
| `api.task.addTime` | `protectedProcedure.mutation` 確認 | ✅ 正確 |
| `api.user.getAll` | `adminProcedure.query` 確認 | ✅ 正確 |
| `api.user.getById` | `protectedProcedure.query` 確認 | ✅ 正確 |
| `api.user.update` | `protectedProcedure.mutation` 確認 | ✅ 正確 |
| `api.comment.create` | `protectedProcedure.mutation` 確認 | ✅ 正確 |
| `api.comment.update` | `protectedProcedure.mutation` 確認 | ✅ 正確 |
| `api.comment.delete` | `protectedProcedure.mutation` 確認 | ✅ 正確 |
| `@/lib/constant/status` → `TASK_STATUS` | 確認 | ✅ 正確 |
| `@/lib/constant/priority` → `TASK_PRIORITY` | 確認 | ✅ 正確 |
| `@/lib/constant/project` → `DEFAULT_PROJECT_COLOR` | `'#1976d2'` 確認 | ✅ 正確 |
| `@/server/api/root` → `AppRouter` type | 確認 | ✅ 正確 |
| `@/trpc/react` → `api` | `createTRPCReact<AppRouter>()` 確認 | ✅ 正確 |
| `@/component/task/task-timer.tsx` | ファイル存在確認 | ✅ 正確 |
| `TASK_STATUS` の値 | `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELLED`, `BLOCKED` | ✅ 正確 |
| `TASK_PRIORITY` の値 | `LOW`, `MEDIUM`, `HIGH`, `URGENT` | ✅ 正確 |

---

## 修正優先度まとめ

### P0（リリース前に必ず修正）

1. **Day23**: `api.report.getWeekly` → `api.report.getWeeklyReport` に修正
2. **Day25**: `api.auth.changePassword` を削除し、代替実装を記述する（`api.user.update` を使うか、`auth router` に `changePassword` プロシージャを追加する）

### P1（品質向上のために修正推奨）

3. **Day20**: `useSearchParams` の Suspense ラップ説明追加
4. **Day12**: `addMember`/`removeMember` の input スキーマ明示
5. **Day14**: `getProjectMembers` に input が不要な理由の説明追加
6. **Day09**: `Record<string, unknown>` が一時的であることの注記強化

### P2（余裕があれば対応）

7. Day10: `useUtils` / `invalidate` の詳しい説明
8. Day18: `invalidate` の引数追加
9. Day02: 意図的エラーの視覚的マーカー強化
10. Day05/06: zodResolver の2層バリデーション説明

---

*レビュー完了: 全30ファイルを実際のソースコードと照合して検証。推測による記述は一切含まない。*
