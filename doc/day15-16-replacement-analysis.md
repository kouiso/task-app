# Day 15 / Day 16 代替トピック分析

作成日: 2026-05-04

## 現状の問題

| Day | 現在のトピック | 問題 |
|-----|--------------|------|
| Day 15 | ファイルアップロード (Cloudinary) | src/ に実装なし |
| Day 16 | WebSocket / Socket.io リアルタイム | src/ に実装なし |

上記2トピックはアプリに存在しない外部サービス・機能を前提としており、
写経テストで動作確認が取れない。

## 実装済み機能一覧 (src/ 調査結果)

### tRPC ルーター

#### task.ts
- `getAll` — ページネーション付きタスク一覧
- `getById` — タスク詳細
- `create` / `update` / `delete`
- `updateTimer` — タイマー開始/停止 (start/stop)
- `addTime` — 手動工数追加
- `bulkComplete` / `bulkDelete` / `bulkUpdateStatus` — 一括操作

#### project.ts
- `getAll` / `getById` / `create` / `update` / `delete`
- `archive` — アーカイブ
- `addMember` / `removeMember` / `getAvailableUsers`

#### report.ts
- `getOverview` — ダッシュボード統計 (completionRate, statusData, priorityData, projectStats)
- `getWeeklyReport` — 週次トレンドデータ

#### search.ts
- `search` — フルテキスト + 多条件フィルター (keyword, status, priority, assignedTo, 日付範囲)
- `quickSearch` — 軽量キーワード検索

#### comment.ts
- `create` / `update` / `delete`

#### user.ts / auth.ts
- `login` / `register` / `logout` / `getSession` / `getCurrentUser`
- `getAll` / `create` / `update` / `delete` (admin)
- `updateProfile` / `changePassword`

### Prisma スキーマ (Task モデル)

タイマー関連フィールド:
- `isTimerActive: Boolean`
- `timerStartedAt: DateTime?`
- `timeSpentMinutes: Float`
- `actualHours: Float`
- `estimatedHours: Float?`

ロール関連:
- `UserRole: USER | ADMIN`
- `ProjectMemberRole: OWNER | ADMIN | MEMBER | VIEWER`

### コンポーネント

- `src/component/task/task-timer.tsx` — タイマー UI
- `src/component/task/time-log-dialog.tsx` — 工数ログダイアログ
- `src/server/api/routers/_helpers/permission.ts` — 権限ヘルパー

## 推奨代替トピック

### Day 15 代替案: 「タスクタイマー・工数管理」

**対象実装:**
- `src/server/api/routers/task.ts` — `updateTimer`, `addTime`
- `src/component/task/task-timer.tsx`
- `src/component/task/time-log-dialog.tsx`
- Prisma: `isTimerActive`, `timerStartedAt`, `timeSpentMinutes`, `actualHours`, `estimatedHours`

**難易度:** 中級〜上級
- 状態機械 (timer start/stop)
- ローカル状態更新 + 再取得 (mutation 成功後に親コールバック経由で再取得)
- 日時計算・経過時間フォーマット

> **注意:** `timeSpentMinutes` は `updateTimer` (タイマー停止時) が自動計算して更新するフィールド。
> `actualHours` は `update` mutation で手動入力する別フィールド。混同しないこと。

**重複しない理由:** Day 9-10 はタスク基本 CRUD、Day 12 はコメント。タイマー機能は未登場。

---

### Day 16 代替案: 「ロールベースアクセス制御 (RBAC)」

**対象実装:**
- `src/server/api/routers/_helpers/permission.ts`
- `src/server/api/trpc.ts` — `adminProcedure`, `protectedProcedure`
- `UserRole` / `ProjectMemberRole` enum
- 条件付き UI レンダリング (admin-only 操作)

**難易度:** 中級〜上級
- 認可ロジック (authorization vs authentication)
- ミドルウェア設計
- フロント/バック双方での権限チェック

**重複しない理由:** Day 6 は NextAuth 認証 (authentication)。RBAC 権限設計 (authorization) は別トピック。

---

### Day 16 代替案 (B): 「一括操作 + 高度な検索フィルター」

**対象実装:**
- `src/server/api/routers/task.ts` — `bulkComplete`, `bulkDelete`, `bulkUpdateStatus`
- `src/server/api/routers/search.ts` — `search` (日付範囲・複合フィルター)

**難易度:** 中級〜上級
- チェックボックス選択 UI
- 複合クエリ構築
- 検索フィルター UX パターン

**重複しない理由:** Day 10 は単一タスク削除・検索基礎。一括操作と複合フィルターは未登場。
