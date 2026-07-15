#!/bin/bash
# plan-memory-reminder.sh
# PostToolUse hook: plan ファイル(plan-*.md / plan_*.md)の作成・編集を検知し、
# MEMORY.md の更新をモデルの文脈へ注入する。
#
# ── 過去のバグ（2026-07-15 修正。二度と戻さない）──
# (1) FILE_PATH="${TOOL_INPUT_file_path:-}" と環境変数を読んでいた。
#     Claude Code は stdin に JSON で渡す。よって常に空 → if が成立せず → 一度も発火せず。
#     登録だけはされていたため「守られている」という偽の安心を作っていた。
# (2) echo で stdout に出していた。exit 0 時の素の stdout はトランスクリプト止まりで
#     モデルには届かない。hookSpecificOutput.additionalContext で返す必要がある。
#
# ── 仕様の裏取り（推測ではなく実測。2026-07-15）──
#   PostToolUse でも additionalContext がモデルに届くことを、専用プローブで確認済み:
#     プローブ hook が {"hookSpecificOutput":{"hookEventName":"PostToolUse",
#       "additionalContext":"POSTTOOL-CANARY-a4f81c ..."}} を返す
#     → 冷えたセッションに Write させた後「文脈に届いた POSTTOOL-CANARY-* を挙げよ」
#     → 回答: 「POSTTOOL-CANARY-a4f81c」（見ていない文字列は復唱できない＝注入の証明）
#   注: 検証時、グローバルの enforce-codex-delegation.sh が Write をブロックすると
#       セッションが Bash へ迂回し、matcher:"Write" のこの hook は発火しない。
#       この hook を実地検証するときは、その干渉を先に排除すること。
#
# fail-open: 失敗しても作業をブロックしない（常に exit 0）。
# 要件: Claude Code v2.1.9+（additionalContext 対応）, jq

set -uo pipefail

INPUT="$(cat 2>/dev/null || true)"

# jq が無ければ何もしない（fail-open）
command -v jq >/dev/null 2>&1 || exit 0

# cwd ガード: task-app 配下でなければ何もしない。
# worktree（.../task-app/.claude/worktrees/<name>）でも効くよう部分一致にする。
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}"
[[ "$CLAUDE_PROJECT_DIR" == *task-app* ]] || exit 0

# 対象ファイルパスを stdin JSON から取得（過去バグ(1)）
FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
[[ -n "$FILE_PATH" ]] || exit 0

# plan ファイルのみ対象。
# 絶対パス・相対パス（先頭にディレクトリが付かない bare 形）の両方を受ける。
# 実測(2026-07-15, v2.1.210)では Claude Code は常に絶対パスへ正規化して渡すが、
# それは観測された挙動であって文書化された契約ではないため、bare 形も受けておく
# （Geminiレビュー指摘 PR#284。1行で済む防御なので実測結果に依存しない形にする）。
case "$FILE_PATH" in
  */plan-*.md|*/plan_*.md|plan-*.md|plan_*.md) ;;
  *) exit 0 ;;
esac

BASENAME="$(basename "$FILE_PATH")"
REMINDER="[plan-memory フック発火] plan ファイル ${BASENAME} を編集しました。

MEMORY.md にこのプランのパスと目的を1行で追記してください（未追記なら今）。
理由: プランはセッションを跨いで参照される。MEMORY.md に載っていないプランは、
次のセッションから存在しないのと同じになる。"

jq -n --arg ctx "$REMINDER" \
  '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}'

exit 0
