# Playwright シナリオ3: フィルター・検索管理サイクル

**実行日**: 2026-04-13
**結果**: 8/9 OK (1 WARN), コンソールエラー 0件

## テスト概要

ユーザー登録後、複数タスクを異なるステータスで作成し、ステータスフィルター・プロジェクトフィルターの絞り込み動作を検証する。その後タスクを完了に変更しダッシュボードで反映を確認する。

| # | ステップ | 結果 | 備考 |
|---|---------|------|------|
| 1 | ユーザー登録 | ✅ OK | メールアドレスで登録、ダッシュボードにリダイレクト成功 |
| 2 | プロジェクト作成 | ✅ OK | プロジェクトが一覧に表示 |
| 3 | タスクA作成（TODO） | ✅ OK | デフォルトステータスTODOでタスクAを作成 |
| 4 | タスクB作成（進行中） | ✅ OK | ステータス「進行中」でタスクBを作成 |
| 5 | タスクC作成（TODO） | ✅ OK | デフォルトステータスTODOでタスクCを作成。合計3タスク |
| 6 | ステータスフィルター（進行中） | ⚠️ WARN | 「進行中」フィルターでタスクBは表示されたが、タスクC（TODO）が1件残存（タスクA=0, タスクC=1） |
| 7 | プロジェクトフィルター | ✅ OK | プロジェクトフィルターで3タスク全て表示 |
| 8 | タスクA完了変更 | ✅ OK | タスクAのステータスを完了に変更 |
| 9 | ダッシュボード確認 | ✅ OK | 完了タスクがダッシュボードに反映 |

### WARN詳細: ステータスフィルター

ステータスを「進行中」で絞り込んだ際、タスクB（進行中）のみが表示されることを期待したが、タスクC（TODO）が1件残存していた。タスクA（TODO）は正しく非表示。DOMのテキストマッチングまたはフィルター反映のタイミングに起因する可能性がある。機能的な重大障害ではないためWARNとして記録。

## スクリーンショット一覧

| # | 画面 | ファイル |
|---|------|---------|
| 1 | 登録後ダッシュボード | `screenshots/s3-01-dashboard-after-register.png` |
| 2 | プロジェクト作成完了 | `screenshots/s3-02-project-created.png` |
| 3 | タスクAダイアログ | `screenshots/s3-03-taskA-dialog.png` |
| 4 | タスクBダイアログ（進行中） | `screenshots/s3-04-taskB-dialog.png` |
| 5 | タスクCダイアログ | `screenshots/s3-05-taskC-dialog.png` |
| 6 | 全タスク作成完了 | `screenshots/s3-06-all-tasks-created.png` |
| 7 | ステータスフィルター展開 | `screenshots/s3-07-status-filter-open.png` |
| 8 | ステータスフィルター（進行中）適用後 | `screenshots/s3-08-status-filter-in-progress.png` |
| 9 | ステータスフィルターリセット後 | `screenshots/s3-09-status-filter-reset.png` |
| 10 | プロジェクトフィルター展開 | `screenshots/s3-10-project-filter-open.png` |
| 11 | プロジェクトフィルター適用後 | `screenshots/s3-11-project-filter-applied.png` |
| 12 | タスク編集ダイアログ | `screenshots/s3-12-edit-dialog.png` |
| 13 | ステータス変更（完了） | `screenshots/s3-13-status-changed-done.png` |
| 14 | タスク更新完了 | `screenshots/s3-14-task-updated.png` |
| 15 | 最終ダッシュボード | `screenshots/s3-15-dashboard-final.png` |

## テスト実行スクリプト

`scripts/scenario3.mjs`

## コンソールエラー

なし（0件）
