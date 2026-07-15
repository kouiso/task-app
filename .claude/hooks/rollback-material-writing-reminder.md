# ROLLBACK: material-writing-reminder.sh

2026-07-15 の修正をやり直したい/壊れた時の手順。

## このフックは何をするか

`material/**/*.md` を Write/Edit した時に、`material-writing` の6手順を**モデルの文脈へ注入**する（PreToolUse）。

**役割の限界**: 書き込みの「**後**」に届く安全網。PreToolUse の `additionalContext` は tool 結果の隣に配置される仕様のため、モデルは書いてから読む。「書く前」に効くのは `CLAUDE.md` の記述だけ。

## 一番速いロールバック（30秒）

フックが暴走して作業が止まった場合:

```bash
# 方法1: 登録を外す（推奨・確実）
# .claude/settings.json の hooks.PreToolUse から
#   material-writing-reminder.sh のエントリを削除する

# 方法2: スクリプトを即無効化（設定を触らず殺す）
printf '#!/bin/bash\nexit 0\n' > .claude/hooks/material-writing-reminder.sh
chmod +x .claude/hooks/material-writing-reminder.sh
```

**このフックは fail-open 設計**（全経路 `exit 0`）なので、理論上 Write/Edit をブロックしない。
ブロックされた場合はこのフック以外が原因の可能性が高い。まず `.claude/settings.json` の
hooks セクション全体を確認すること。

## 2026-07-15 に直したバグ（戻さないこと）

| # | バグ | 症状 | 修正 |
|---|---|---|---|
| 1 | `FILE_PATH="${TOOL_INPUT_file_path:-}"` | Claude Code は stdin に **JSON** で渡すため常に空 → 即 `exit 0` → **一度も発火せず** | `jq -r '.tool_input.file_path // empty'` で stdin から取得 |
| 2 | `cat >&2` + `exit 0` | `exit 0` 時に解釈されるのは **stdout の JSON だけ**。人間はトランスクリプトで見えるが**モデルには届かない** | `hookSpecificOutput.additionalContext` を stdout へ JSON 出力 |
| 3 | `basename "$CLAUDE_PROJECT_DIR" != "task-app"` | worktree（`.claude/worktrees/<name>`）では basename が別名になり**死ぬ** | `*task-app*` の部分一致に変更 |

## 動作確認（dry-run）

```bash
export CLAUDE_PROJECT_DIR="$PWD"

# 1. material/*.md → 注入される（カナリア MW-CANARY-HOOK-91b2d7 が出る）
echo '{"tool_input":{"file_path":"'"$PWD"'/material/30days-curriculum/day13_x.md"}}' \
  | ./.claude/hooks/material-writing-reminder.sh | jq .

# 2. material外 → 出力なし（負の対照）
echo '{"tool_input":{"file_path":"'"$PWD"'/src/app/page.tsx"}}' \
  | ./.claude/hooks/material-writing-reminder.sh    # → 空

# 3. 壊れたJSON → fail-open（出力なし・exit 0）
echo 'not json' | ./.claude/hooks/material-writing-reminder.sh; echo $?   # → 0
```

2026-07-15 に上記6ケース（+ .md以外 / 別プロジェクト / JSON妥当性）を全て確認済み。

## 要件

- Claude Code **v2.1.9+**（`additionalContext` 対応。CHANGELOG v2.1.9 で追加）
- `jq`（無ければ fail-open で何もしない）

## 関連

- 主機構: `CLAUDE.md` の「教材を書く前に必ず読む」節（**こちらが書く前に効く唯一の経路**）
- 本体: `.claude/skills/material-writing/SKILL.md`
- 同型バグ: `.claude/hooks/plan-memory-reminder.sh` も同じ環境変数バグを持つ（PostToolUse・別セマンティクス・別コミットで対応）
