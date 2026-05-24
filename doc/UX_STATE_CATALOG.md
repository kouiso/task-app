# UX State Catalog

Issue #116 の mobile / tablet / desktop walkthrough と empty / error / loading state の確認結果を記録するためのカタログです。スクリーンショットは `npm run test:e2e:ux` で `docs/evidence/ux-state-catalog/issue-116/` に保存します。

## Viewport Matrix

| 名称 | 幅 | 高さ | 用途 |
| --- | ---: | ---: | --- |
| SP | 375px | 812px | iPhone 相当の片手操作、サイドバー折り返し、フォーム入力 |
| Tablet | 768px | 1024px | 縦長タブレット、一覧と詳細の情報密度 |
| Desktop | 1280px | 800px | 標準的なノート PC、管理画面の横幅 |

## Page Walkthrough

| 画面 | パス | 認証 | 通常表示 screenshot |
| --- | --- | --- | --- |
| ログイン | `/login` | 不要 | `{viewport}-login-normal.png` |
| 新規登録 | `/register` | 不要 | `{viewport}-register-normal.png` |
| ダッシュボード | `/dashboard` | 必要 | `{viewport}-dashboard-normal.png` |
| プロジェクト | `/project` | 必要 | `{viewport}-project-normal.png` |
| タスク | `/task` | 必要 | `{viewport}-task-normal.png` |
| マイタスク | `/my-task` | 必要 | `{viewport}-my-task-normal.png` |
| 検索 | `/search` | 必要 | `{viewport}-search-normal.png` |
| レポート | `/report` | 必要 | `{viewport}-report-normal.png` |
| 週次レポート | `/report/weekly` | 必要 | `{viewport}-report-weekly-normal.png` |
| ユーザー一覧 | `/user` | 必要 | `{viewport}-user-normal.png` |
| プロフィール | `/profile` | 必要 | `{viewport}-profile-normal.png` |
| プロフィール編集 | `/profile/edit` | 必要 | `{viewport}-profile-edit-normal.png` |
| パスワード変更 | `/profile/change-password` | 必要 | `{viewport}-profile-change-password-normal.png` |
| Not Found | `/this-page-does-not-exist-for-ux-catalog` | 必要 | `{viewport}-not-found-normal.png` |

## State Coverage

| 状態 | 対象画面 | screenshot | 判定観点 |
| --- | --- | --- | --- |
| Empty | `/project` | `{viewport}-project-empty.png` | `プロジェクトが見つかりません。` と作成導線が表示される |
| Empty | `/task` | `{viewport}-task-empty.png` | `タスクが見つかりません。` と作成導線が表示される |
| Empty | `/my-task` | `{viewport}-my-task-empty.png` | `あなたに割り当てられたタスクはありません` が表示される |
| Empty | `/search` | `{viewport}-search-empty.png` | 検索前の補助文、または検索結果 0 件の案内が表示される |
| Loading | `/dashboard` | `{viewport}-dashboard-loading.png` | スピナーが中央に表示され、レイアウト崩れがない |
| Error | `/task` | `{viewport}-task-network-error.png` | ネットワーク失敗時もアプリ全体が落ちず、再試行可能な表示に留まる |
| Error | Not Found | `{viewport}-not-found-normal.png` | 存在しない URL で戻る導線が表示される |

## Dialog Interaction

| 対象 | 操作 | 期待値 |
| --- | --- | --- |
| タスク作成 dialog | 新規タスクボタンをクリック | `role="dialog"` が表示される |
| タスク作成 dialog | `Esc` を押す | dialog が閉じる |
| タスク作成 dialog | `Esc` で閉じた後 | focus がトリガーボタンへ戻る |
| プロジェクト作成 / 編集 dialog | Figma catalog 追加時に同じ観点で確認 | outside click と focus return を確認対象に追加する |

## Figma Catalog 作成メモ

Figma には 3 つのページを作成します。

| Figma page | 内容 |
| --- | --- |
| `SP 375` | `sp-375-*` の通常 / empty / loading / error frame |
| `Tablet 768` | `tablet-768-*` の通常 / empty / loading / error frame |
| `Desktop 1280` | `desktop-1280-*` の通常 / empty / loading / error frame |

各 frame 名は screenshot 名と同じにし、状態差分を横並びにします。Figma 上の注釈は「表示条件」「期待されるユーザー導線」「未対応の UI debt」の 3 項目に統一します。
