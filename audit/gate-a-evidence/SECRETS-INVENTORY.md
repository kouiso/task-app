# Devin secrets 棚卸し（最終構造化・削除実行なし）

対象: list_secrets で見える org15 + personal8 + 追加分。全件実引用で裏取り済み。

## 削除候補（4件・実害評価つき）

| name | scope | 実害評価 |
|---|---|---|
| GOOGLE_KOUISO_PW | personal | 実害ゼロ。`GOOGLE_KOUISO_PASS` と sha256 完全同一値（6a9cfafc…・24文字）。PASS を正本に統合 |
| GOOGLE_CHAT_HORSEMANAGER_SPACE_WEBHOOK_URL | org | 実害ほぼゼロ。2026-10-09 ルーティング全面変更で全投稿は AAQAHkdKYSM（EARLYNOTIFY）のみへ移行済み。旧スペースは不使用 |
| MCP_API_KEY | org | 実害ゼロ（確認範囲）。repo/workflow/memory/MCP設定/blueprint を rg 総当たりで引用ゼロ。env 注入のみの予備枠 |
| GITHUB_PAT_KOUISO | personal | 実害ゼロ。org 版（repo+workflow+write:org 実測）が kouiso/character-chat へ 200 到達。説明先 adult-ai-app は 301→character-chat 改名済 |

## 用途不明→判定済み（1件）

| ROYAL_KEY | org | royal-mcp（programming-life.net の WordPress MCP）の `X-Royal-MCP-API-Key` ヘッダと設定直読で判明。現時点で initialize 失敗中（WP側が MCP 応答でなく HTML を返す）→ secret 自体は keep、修復対象はエンドポイント |

## 保持必須（21件・live 引用あり）

- org: `ANGKOR_GOOGLE_PASSWORD`（QA垢）/ `DEVIN_API_KEY`（Admin API + devin*.yml）/ `FACTORY_API_KEY`（Droid API）/ `GITHUB_PAT_KOUISO`（GitHub汎用）/ `MCP_ASC_{ALLOW_WRITES,ISSUER_ID,KEY_ID,P8}`（ASC MCP一式・/v1/apps 200実測・自動再同期）/ `OP_SERVICE_ACCOUNT_TOKEN`（1Password全経路の親）/ `SENTRY_API_TOKEN`（alert-to-issue CF index.js:429）/ `SLACK_BOT_TOKEN`（certificate workflows）/ `_2FA_ANGKOR_GOOGLE`
- personal: `CODEX_AUTH_JSON`（Codex auth.json・test_codex_ci.py）/ `GOOGLE_KOUISO_PASS`（正本）/ `OPENAI_RITMO_PASSWORD`+`_2FA_OPENAI_RITMO` / `XSERVER_PANEL_PASS` / `_2FA_GOOGLE_KOUISO`
- 注意: `SLACK_BOT_TOKEN`/`DEVIN_API_KEY`/`SENTRY_API_TOKEN` は GitHub Actions secrets にも同名存在するが別 store。Devin側を消すとセッション内 curl/復元経路が死ぬ

削除判断は統括→本人承認の後で実行。本資料は推奨表のみで実行は伴わない。
