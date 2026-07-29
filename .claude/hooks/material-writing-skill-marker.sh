#!/bin/bash
# material-writing-skill-marker.sh
# PostToolUse hook (matcher: Skill): material-writing を読み込んだセッションに印を置く。
#
# WHY: material-writing-gate.sh が「このセッションは文体スペックを読んだか」を
#   判定するための唯一の材料。Claude Code には「スキルを読み込んだ」というイベントが
#   無いので、Skill ツールの呼び出しを観測して自分で記録する。
#
# 印はリポジトリの外（一時ディレクトリ）へ置く。リポジトリ内へ置くと、
# セッションごとのゴミが git status に出て、教材の差分に紛れる。
#
# 契約: 常に exit 0。失敗しても書き込みを妨げない（印が付かない側に倒れるので、
#   ゲートは「未読」と判定して deny する。これは fail-closed だが、逃げ道は
#   「スキルを読む」だけなので詰まない）。
#
# ROLLBACK: .claude/hooks/rollback-material-writing-gate.md を参照。

set -uo pipefail

INPUT="$(cat 2>/dev/null || true)"
[[ -n "$INPUT" ]] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

SKILL="$(printf '%s' "$INPUT" | jq -r '.tool_input.skill // .tool_input.command // empty' 2>/dev/null || true)"
[[ "$SKILL" == *material-writing* ]] || exit 0

SESSION="$(printf '%s' "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || true)"
[[ -n "$SESSION" ]] || exit 0

# 実行ユーザーごとに分ける。共有ホストで /tmp を直に使うと、先に作った利用者の
# 0755 ディレクトリへ後の利用者が書けず、印を置けないまま deny され続ける。
MARKER_DIR="${TMPDIR:-/tmp}/task-app-material-writing-loaded-$(id -u)"
mkdir -p "$MARKER_DIR" 2>/dev/null || exit 0
chmod 700 "$MARKER_DIR" 2>/dev/null || true
: > "$MARKER_DIR/$SESSION" 2>/dev/null || true

exit 0
