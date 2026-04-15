# Playwright シナリオ2: 既存ユーザー デイリータスクサイクル

**実行日**: 2026-04-13
**結果**: 6/6 OK, コンソールエラー 0件

## テスト概要

ユーザー登録後、プロジェクト作成・タスク作成・コメント投稿・ステータス変更までの日常的なタスク管理フローを検証する。

| # | ステップ | 結果 | 備考 |
|---|---------|------|------|
| 1 | ユーザー登録 | ✅ OK | メールアドレスで登録、ダッシュボードにリダイレクト成功 |
| 2 | プロジェクト作成 | ✅ OK | プロジェクトが一覧に表示 |
| 3 | タスク作成 | ✅ OK | タスクが一覧に表示 |
| 4 | コメント投稿 | ✅ OK | タスク詳細ダイアログでコメントを投稿、表示を確認 |
| 5 | ステータス変更（完了） | ✅ OK | タスクを完了ステータスに変更 |
| 6 | ダッシュボード確認 | ✅ OK | 完了タスクがダッシュボードに反映 |

## スクリーンショット一覧

| # | 画面 | ファイル |
|---|------|---------|
| 1 | 登録フォーム入力済み | `screenshots/s2-01-register-filled.png` |
| 2 | 登録後ダッシュボード | `screenshots/s2-02-dashboard-after-register.png` |
| 3 | プロジェクトダイアログ入力済み | `screenshots/s2-03-project-dialog-filled.png` |
| 4 | プロジェクト作成完了 | `screenshots/s2-04-project-created.png` |
| 5 | タスクダイアログ入力済み | `screenshots/s2-05-task-dialog-filled.png` |
| 6 | タスク作成完了 | `screenshots/s2-06-task-created.png` |
| 7 | タスク詳細ダイアログ | `screenshots/s2-07-task-detail-dialog.png` |
| 8 | コメント入力済み | `screenshots/s2-08-comment-filled.png` |
| 9 | コメント投稿完了 | `screenshots/s2-09-comment-posted.png` |
| 10 | タスク編集ダイアログ | `screenshots/s2-10-task-edit-dialog.png` |
| 11 | ステータス変更後 | `screenshots/s2-11-status-changed.png` |
| 12 | タスク更新完了 | `screenshots/s2-12-task-updated.png` |
| 13 | 最終ダッシュボード | `screenshots/s2-13-dashboard-final.png` |

## テスト実行スクリプト

`scripts/scenario2.mjs`

## コンソールエラー

なし（0件）
