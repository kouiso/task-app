# Playwright シナリオ1: 新規ユーザー タスク完了サイクル

**実行日**: 2026-04-13
**結果**: 5/5 OK, コンソールエラー 0件

## テスト概要

新規ユーザーが登録からタスク完了までの一連のフローを検証する。

| # | ステップ | 結果 | 備考 |
|---|---------|------|------|
| 1 | ユーザー登録 | ✅ OK | メールアドレスで登録、ダッシュボードにリダイレクト成功 |
| 2 | プロジェクト作成 | ✅ OK | プロジェクトが一覧に表示 |
| 3 | タスク作成 | ✅ OK | タスクが一覧に表示 |
| 4 | ステータス変更（完了） | ✅ OK | タスクを完了ステータスに変更 |
| 5 | ダッシュボード確認 | ✅ OK | 完了タスクがダッシュボードに反映 |

## スクリーンショット一覧

| # | 画面 | ファイル |
|---|------|---------|
| 1 | 登録ページ | `screenshots/s1-01-register-page.png` |
| 2 | 登録フォーム入力済み | `screenshots/s1-02-register-filled.png` |
| 3 | 登録後ダッシュボード | `screenshots/s1-03-dashboard-after-register.png` |
| 4 | プロジェクト一覧ページ | `screenshots/s1-04-project-page.png` |
| 5 | プロジェクト作成ダイアログ | `screenshots/s1-05-project-dialog.png` |
| 6 | プロジェクトダイアログ入力済み | `screenshots/s1-06-project-dialog-filled.png` |
| 7 | プロジェクト作成完了 | `screenshots/s1-07-project-created.png` |
| 8 | タスク一覧ページ | `screenshots/s1-08-task-page.png` |
| 9 | タスク作成ダイアログ | `screenshots/s1-09-task-dialog.png` |
| 10 | タスクダイアログ入力済み | `screenshots/s1-10-task-dialog-filled.png` |
| 11 | タスク作成完了 | `screenshots/s1-11-task-created.png` |
| 12 | 編集前のタスク | `screenshots/s1-12-task-before-edit.png` |
| 13 | タスク編集ダイアログ | `screenshots/s1-13-task-edit-dialog.png` |
| 14 | ステータスSelect展開 | `screenshots/s1-14-status-select-open.png` |
| 15 | ステータス変更後 | `screenshots/s1-15-status-changed.png` |
| 16 | タスク更新完了 | `screenshots/s1-16-task-updated.png` |
| 17 | 最終ダッシュボード | `screenshots/s1-17-dashboard-final.png` |

## テスト実行スクリプト

`scripts/scenario1.mjs`

## コンソールエラー

なし（0件）
