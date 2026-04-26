# Handoff: task-app (Day 04 rewrite + Playwright screenshots)

## 元セッション

- **session id:** `6bc7a4fc-1bc5-4e41-8de3-8da8fa25f46b`
- **jsonl:** `/Users/kouiso/.claude/projects/-Users-kouiso-ghq-kouiso-task-app/6bc7a4fc-1bc5-4e41-8de3-8da8fa25f46b.jsonl`
- **規模:** 1.1MB / 14 user msgs / 17 tool uses
- **中断理由:** Codex bg 起動で詰まり、最後 detach 起動できたが進捗確認前にトークン上限
- **branch:** `main`

## ゴール

1. **Copilot 出した 11 本の Draft PR を review → ready → merge まで自走** (最優先)
2. カリキュラム curriculum-plan の Day 01〜Day 04 を整備し、Playwright スクショを Codex バックグラウンドで撮らせる

## 最優先タスク: Copilot Draft PR 11 本の捌き

Apr 20〜24 に Copilot SWE Agent が出した Draft PR 11 本がそのまま放置されてる。順次 review → ready → merge まで自走させる。

| # | title | created |
|---|---|---|
| #85 | fix: アバター画像未反映 + tRPC prototype pollution 脆弱性修正 | 04-24 |
| #84 | fix: プロフィール編集後の内容が即時反映されない問題を修正 | 04-24 |
| #83 | fix: task.update で DONE ステータス変更時に completedAt を自動設定し週次レポートを修正 | 04-24 |
| #82 | fix: 新規ユーザー登録後のリダイレクト先をログイン画面に変更 | 04-24 |
| #81 | fix: 新規登録画面のエラーメッセージをユーザー向け表示に修正 | 04-24 |
| #80 | fix: タイマー開始ボタン押下時にUIが変化しない問題を修正 | 04-24 |
| #79 | fix: 作業時間が記録・表示されない問題の修正 + @trpc/* 11.8.0 セキュリティアップデート | 04-24 |
| #78 | fix: ログイン/登録時にPrisma生エラーがUIに露出する問題を修正 | 04-24 |
| #69 | fix: アーカイブ表示ON時に進行中プロジェクトも表示されるよう修正 | 04-20 |
| #68 | fix: 作業時間記録ダイアログを閉じるとタスク詳細が開く問題を修正 | 04-20 |
| #67 | fix: ログイン後にエラー画面へ遷移する問題の調査・修正 | 04-20 |

### 各 PR の捌き方 (1 本ずつループ)

```bash
# 1. PR 内容確認
gh pr view <N> --repo kouiso/task-app
gh pr diff <N> --repo kouiso/task-app

# 2. 厳密レビュー (codex は性悪説で audit / scope creep / root-cause 確認)
#    - issue との対応取れてるか
#    - 余計な変更入ってないか (scope creep)
#    - root cause 直してるか / 症状対処で終わってないか
#    - 言い訳コメントで逃げてないか

# 3. CI 状態確認
gh pr checks <N> --repo kouiso/task-app

# 4. 修正必要なら fix を入れる、または Copilot に追記指示
gh pr comment <N> --repo kouiso/task-app --body "<指摘>"

# 5. CI green かつ review OK なら ready 化 → merge
gh pr ready <N> --repo kouiso/task-app
gh pr merge <N> --repo kouiso/task-app --squash --delete-branch
```

### 並行 review の方針

11 本同時は重いので、依存関係見て小グループで分ける:
- **新規登録/ログイン系** (#78, #81, #82): 同じ画面触る可能性あり、conflict 注意
- **タイマー/作業時間系** (#79, #80, #68): 同じく
- **その他独立系** (#85, #84, #83, #69, #67): 並行 OK

Codex に投げる時は **PR 1 本ごと別 background worker** で。マージ順は依存度低いやつから。

### 注意 (Copilot PR 特有)

- ❌ Copilot が「動作確認しました」と書いてても信じない (実機検証してない)
- ❌ scope 拡げて他ファイルまで触ってる PR は分割要求 (scope creep)
- ❌ test 追加せず fix だけの PR は「regression guard 追加して」と差し戻し
- ✅ tRPC prototype pollution (#85) は security 系なので最優先 / 単独 merge
- ✅ 依存パッケージ更新 (#79 の `@trpc/* 11.8.0`) は他 PR と分けて単体 merge

## サブタスク: Day 01〜Day 04 整備

## 直前の状態

### Copilot PR 11 本

- 全部 Draft 状態のまま放置
- review / merge 未着手

### Phase 0 BLOCKER (修正済み)

- Option A 採用: Day 01 → `/dashboard` 導線 + Day 02 前提整合 → **GO 判定**

### Day 04 rewrite

- `codex exec` を Bash bg で投入 (`/tmp/day04-prompt.txt` 経由)
- 進捗未確認のまま中断

### Playwright スクショ

- `codex exec --dangerously-bypass-approvals-and-sandbox` で detach 起動
- **PID 59421** で稼働開始
- ログ: `/tmp/codex-playwright.log`
- prompt: `/tmp/codex-playwright-prompt.txt`
- ⚠️ **`/tmp` は再起動でクリアされる** → 今は消えてる可能性大、要再投入

### 直近の成果物

- `docs/curriculum-plan/day-to-group-map.md`
- `prompt/templates/pro-pattern-template.md`

## 次の 1 アクション

**Step 1 (最優先): Copilot Draft PR 11 本の捌き**

```bash
cd /Users/kouiso/ghq/kouiso/task-app
gh pr list --repo kouiso/task-app --state open --json number,title,isDraft

# security 系 #85 から着手 (tRPC prototype pollution)
gh pr view 85 --repo kouiso/task-app
gh pr diff 85 --repo kouiso/task-app
gh pr checks 85 --repo kouiso/task-app
```

11 本ループの方針は上記「各 PR の捌き方」参照。

**Step 2: カリキュラム整備の続き**

```bash
git log --oneline -10
ls docs/curriculum-plan/
ls prompt/templates/

# Day 04 と Playwright スクショの完了状況を確認
ls -la /tmp/codex-playwright.log /tmp/day04-prompt.txt 2>/dev/null
ps -p 59421 2>/dev/null   # PID 59421 がまだ生きてるか

# 未完なら codex exec を Bash run_in_background:true で再投入
```

## 注意事項

- ❌ `mcp__codex__codex` (同期) で長時間タスク握らない (前回詰んだ原因)
- ❌ `/tmp/*` を持続前提で扱わない (再起動で消える)
- ✅ `codex exec --dangerously-bypass-approvals-and-sandbox "<prompt>"` を Bash `run_in_background: true` で投げる
- ✅ ログは `/tmp/codex-*.log` に吐かせて `tail -f` で監視
- ✅ 並行投げる時は PID と log path を必ず記録
- ⚠️ 磯貝さん語: 「codex をバックグラウンドでやってくれといってるのになんでやってくれないんですか？」「自分で調べて下さい。cli でもいいからお願いだから言うとおりにして下さい。」 → 並行 bg 指示が来たら即実行

## 引継ぎ実行手順

1. PC でこの cwd に入って `claude` 起動
2. 本ファイル (`docs/handoff-resume-2026-04-25.md`) を読ませる
3. 「Day 04 と Playwright の完了状況確認 → 未完なら codex bg で再投入」と指示
4. スマホからは Claude Code Remote / iTerm tmux で監視
