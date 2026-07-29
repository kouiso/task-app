#!/bin/bash
# material-writing-gate.sh
# PreToolUse hook (matcher: Write|Edit): 文体スペックを読まずに教材へ書くのを止める。
#
# WHY: 同じディレクトリの material-writing-reminder.sh は、自分でも書いているとおり
#   「書いた後に届く安全網」である。PreToolUse の additionalContext はツール結果の隣に
#   届くので、モデルは書いてから読む。外部レビューで指摘された「AIっぽい・翻訳文みたい」は
#   書く前に効く機構が無いことが原因で、注意の払い方では止まらない。
#   ここは permissionDecision で書き込みそのものを拒否する。
#
# 判定材料は material-writing-skill-marker.sh がセッションIDごとに置く印だけ。
# 印が無ければ deny する。逃げ道は「スキルを読む」1つだけなので、詰まることはない。
#
# 対象は material/**/*.md のみ。それ以外のパスは常に通す。
# 緊急停止: リポジトリ直下に .claude/disable-material-writing-gate を作る。
#
# 契約: 判定できない場合（jq が無い、payload が壊れている、対象外パス）は exit 0。
#   deny するのは「対象パス かつ 印が無い」と確定したときだけ。
#
# ROLLBACK: .claude/hooks/rollback-material-writing-gate.md を参照。

set -uo pipefail

INPUT="$(cat 2>/dev/null || true)"
[[ -n "$INPUT" ]] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}"
[[ "$CLAUDE_PROJECT_DIR" == *task-app* ]] || exit 0
[[ -f "$CLAUDE_PROJECT_DIR/.claude/disable-material-writing-gate" ]] && exit 0

FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
[[ -n "$FILE_PATH" ]] || exit 0

# 対象は教材本文だけ。監査記録・スクリプト・設定は文体スペックの管轄外なので通す。
[[ ( "$FILE_PATH" == */material/* || "$FILE_PATH" == material/* ) && "$FILE_PATH" == *.md ]] || exit 0

SESSION="$(printf '%s' "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || true)"
# セッションIDが取れない＝判定材料が無い。ここで deny すると復旧手段まで塞ぐので通す。
[[ -n "$SESSION" ]] || exit 0

MARKER="${TMPDIR:-/tmp}/task-app-material-writing-loaded/$SESSION"
[[ -f "$MARKER" ]] && exit 0

REASON='教材ファイルへの書き込みを止めました。

このセッションはまだ .claude/skills/material-writing を読み込んでいません。
外部レビューで指摘された「AIっぽい・翻訳文みたい」は、書いたあとに直すのでは
戻らないため、書く前に文体スペックを通す必要があります。

次の1手: Skill ツールで material-writing を読み込んでから、同じ書き込みをやり直してください。

対象は material/ 配下の .md だけです。監査記録・スクリプト・設定は影響を受けません。
緊急停止が要る場合は .claude/disable-material-writing-gate を作ってください。'

jq -n --arg reason "$REASON" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'

exit 0
