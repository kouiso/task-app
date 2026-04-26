# Day → 機能グループ マッピング（Phase 0-D 成果物）

**作成日**: 2026-04-19
**プラン**: task-app 有償教材「本質的完成」プラン v2.0
**決定根拠**: 磯貝さん Q1 (フル refactor) + Q2 (機能グループ粒度)

---

## 目的

30 日カリキュラムを **ドメイン/機能軸**（磯貝さん原則 D）で再マッピングし、各機能グループで
`src/ refactor → 教材書き直し → 検証 → Checkpoint 判定` を**直列に閉じる**単位を明確化する。

**Q5 Checkpoint 決定**: 週次固定（Day 7/14/21/30）ではなく、**機能グループ完了時**をチェックポイントとする。

---

## マッピング表

| Group | 機能テーマ | Day | Day タイトル | Worktree | 主要 src/ ファイル | 実装規模 |
|-------|-----------|-----|-------------|----------|------------------|---------|
| **G0** | Foundation<br>（scaffold + 最初の画面） | 01 | 開発環境を整えて、初めてのアプリを動かそう | main | `scripts/scaffold-from-scratch.sh` (Phase 0-A)<br>`src/app/layout.tsx` | - |
| G0 | 〃 | 02 | ダッシュボードに自分だけのメッセージを追加しよう | main | `src/app/dashboard/page.tsx` | - |
| G0 | 〃 | 03 | GitHubに保存する | main | - (Git 操作のみ) | - |
| G0 | 〃 | 04 | ネットに公開 | main | - (Vercel デプロイ) | - |
| **G1** | Auth<br>（認証基盤） | 05 | ログイン画面のUI | task-app-wt-05 | `src/app/(auth)/login/page.tsx`<br>`src/component/auth/login-form.tsx` | 168L router |
| G1 | 〃 | 06 | ユーザー登録画面 | task-app-wt-05 | `src/app/(auth)/register/page.tsx`<br>`src/router/auth.ts` (signup) | 〃 |
| G1 | 〃 | 07 | ログイン体験を改善しよう | task-app-wt-05 | `src/lib/auth/*`<br>`src/router/auth.ts` (login/logout) | 〃 |
| G1 | 〃 | 08 | サイドバーを完成させよう | task-app-wt-05 | `src/component/layout/sidebar.tsx` | 〃 |
| **G2** | Project<br>（プロジェクト CRUD） | 09 | プロジェクト一覧画面 | task-app-wt-05 | `src/app/project/page.tsx`<br>`src/router/project.ts` (list) | 488L router |
| G2 | 〃 | 10 | プロジェクト新規作成 | task-app-wt-05 | `src/app/project/new/page.tsx`<br>`src/router/project.ts` (create) | 〃 |
| G2 | 〃 | 11 | プロジェクト編集・削除 | task-app-wt-05 | `src/router/project.ts` (update/delete) | 〃 |
| G2 | 〃 | 12 | メンバー追加 | task-app-wt-05 | `src/component/project/member-*.tsx`<br>`src/router/project.ts` (addMember) | 〃 |
| **G3** | Task<br>（タスク CRUD + 運用） | 13 | タスク一覧画面 | task-app-wt-12 | `src/app/task/page.tsx`<br>`src/router/task.ts` (list) | 410L router |
| G3 | 〃 | 14 | タスク新規作成 | task-app-wt-12 | `src/app/task/new/page.tsx`<br>`src/router/task.ts` (create) | 〃 |
| G3 | 〃 | 15 | タスク編集・削除 | task-app-wt-12 | `src/router/task.ts` (update/delete) | 〃 |
| G3 | 〃 | 16 | ステータス変更・タイマー | task-app-wt-12 | `src/component/task/timer.tsx`<br>`src/router/task.ts` (status/timer) | 〃 |
| G3 | 〃 | 17 | 自分のタスクページ | task-app-wt-12 | `src/app/task/mine/page.tsx` | 〃 |
| **G4** | Comment<br>（コメント + RBAC） | 18 | コメント投稿 | task-app-wt-12 | `src/component/comment/comment-form.tsx`<br>`src/router/comment.ts` (create) | 153L router |
| G4 | 〃 | 19 | コメント編集・削除 | task-app-wt-12 | `src/router/comment.ts` (update/delete, RBAC) | 〃 |
| **G5** | Search<br>（検索・フィルタ・タグ） | 20 | タスク検索機能 | task-app-wt-19 | `src/component/search/*`<br>`src/router/search.ts` | 236L router |
| **G6** | Report + User Admin<br>（ダッシュボード + 管理） | 21 | 統計カードを表示 | task-app-wt-19 | `src/app/dashboard/stats/*`<br>`src/router/report.ts` (stats) | 234L + 314L router |
| G6 | 〃 | 22 | グラフを表示 | task-app-wt-19 | `src/component/report/chart-*.tsx`<br>`src/router/report.ts` (chartData) | 〃 |
| G6 | 〃 | 23 | 週次レポート | task-app-wt-19 | `src/router/report.ts` (weeklyReport) | 〃 |
| G6 | 〃 | 24 | ユーザー一覧（管理者用） | task-app-wt-19 | `src/app/admin/user/page.tsx`<br>`src/router/user.ts` (listAll) | 〃 |
| G6 | 〃 | 25 | プロフィール編集 | task-app-wt-19 | `src/app/profile/page.tsx`<br>`src/router/user.ts` (update) | 〃 |
| **G7** | Polish + Deploy<br>（仕上げ + リリース） | 26 | エラーページを作って、バグを退治しよう | task-app-wt-26 | `src/app/error.tsx`<br>`src/app/not-found.tsx` | - |
| G7 | 〃 | 27 | プロジェクト詳細・アーカイブを実装しよう | task-app-wt-26 | `src/app/project/[id]/page.tsx`<br>`src/router/project.ts` (archive) | 488L 拡張 |
| G7 | 〃 | 28 | タスク一括操作を実装しよう | task-app-wt-26 | `src/component/task/bulk-action.tsx`<br>`src/router/task.ts` (bulkUpdate) | 410L 拡張 |
| G7 | 〃 | 29 | ユーザー詳細・編集ページを作ろう | task-app-wt-26 | `src/app/admin/user/[id]/page.tsx` | - |
| G7 | 〃 | 30 | 完成版を公開！卒業！ | task-app-wt-26 | 全体デプロイ確認 | - |

---

## G6 分割オプション（要検討）

**課題**: G6 が Report (3 Day) + User Admin (2 Day) の混成で、磯貝さん原則 D（ドメイン軸）に厳密には反する。

**案 A: 統合のまま (現状案)**
- G6 = Day 21-25（5 Day 一括）
- 利点: worktree 切替コスト削減、ダッシュボード画面の一貫性
- 欠点: ドメイン軸の純度が低い

**案 B: G6a Report / G6b User に分割**
- G6a Report = Day 21-23（統計・グラフ・週次）
- G6b User = Day 24-25（管理 + プロフィール）
- 利点: ドメイン純度向上
- 欠点: worktree 作成増、User ドメインが 2 Day のみで薄い

**結論**: Phase 1 G6 着手時に磯貝さんに確認し決定。現時点は案 A (統合) で進める。

---

## Worktree 割当ポリシー

- **1 worktree = 1 機能グループ** を原則とする（磯貝さん feedback_worktree_parallelism.md 遵守）
- グループ完了後、worktree を main に統合するまでを 1 単位
- 並列化は **Step A (src/ refactor) の下位タスク内** のみ（router / app / component の別 Codex 委任）
- 統合レビューは Claude が直列で実施

---

## 直列実行順序（確定）

```
Phase 0 (基盤整備)
    ↓
G0 Foundation (Day 01-04)
    ↓
G1 Auth (Day 05-08)
    ↓
G2 Project (Day 09-12)
    ↓
G3 Task (Day 13-17)
    ↓
G4 Comment (Day 18-19)
    ↓
G5 Search (Day 20)
    ↓
G6 Report + User (Day 21-25)
    ↓
G7 Polish + Deploy (Day 26-30)
    ↓
Phase 2 (全体統合検証)
```

**並列化禁止理由**:
1. G2 は G1 の auth middleware を前提（Session → project.ts の `protectedProcedure`）
2. G3 は G2 の `projectId` を前提
3. G4 は G3 の `taskId` を前提
4. G6 は G2-G5 全ドメインを前提（統計対象）
5. G7 は G1-G6 全画面を前提（エラー境界・アーカイブ対象）

---

## 各グループの Done Definition (6 軸) 判定責任

各グループ Step D (Checkpoint 判定) では以下を全通過必須。

| 軸 | 判定者 | 検証方法 |
|----|--------|---------|
| A. 完走性 | Claude | Codex 委任 walkthrough |
| B. Scaffold-first | Claude | `rg "git clone\|gh repo clone"` = 0 hit |
| C. src/ ceiling | Claude | 対象ファイルに `any`/`as` 逃げが 0 |
| D. Before/After 教示 | Claude | 各 Day `rg -c "### Before\|### After"` ≥ 2 |
| E. ワクワク感 | 磯貝さん + Claude | Playwright スクショ目視 |
| F. 商品信頼性 | Claude | 禁止語・矛盾 0 hit |

**不通過時**: Step A/B/C に差し戻し → 修正 → 再判定。判定レポートは `docs/evidence/<date>/group-G<N>-verdict.md` に記録。

---

## 合格基準

- Phase 1 開始前に、Phase 0 全 6 ステップが完了していること
- 各グループ完了時、Done Definition 6 軸全通過の verdict.md が存在すること
- 磯貝さん承認なしに次グループへ進まないこと
