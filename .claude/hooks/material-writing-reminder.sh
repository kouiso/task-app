#!/bin/bash
# material-writing-reminder.sh
# PreToolUse hook: material/**/*.md への Write/Edit 時に material-writing の6手順をモデルの文脈へ注入する。
#
# ── 役割の限界（正直に書く。ここを誤解すると「直したのに効かない」が再発する）──
# これは「書いた後の補正（安全網）」であって「書く前の機構」ではない。
# PreToolUse の additionalContext は tool 結果の隣に届く（docs placement table:
# "PreToolUse, PostToolUse...: next to the tool result"）。つまりモデルは書いてから読む。
# 「書く前」に効かせる唯一の経路は CLAUDE.md の常時ロード行（そちらが主機構）。
# 真の pre-write gate が要るなら permissionDecision:"ask" か SessionStart/UserPromptSubmit。
#
# ── 過去のバグ（二度と戻さない）──
# (1) FILE_PATH="${TOOL_INPUT_file_path:-}" と環境変数を読んでいた。
#     Claude Code は stdin に JSON で渡す。よって常に空 → 即 exit 0 → 一度も発火せず。
# (2) stderr + exit 0 で出力していた。exit 0 時に解釈されるのは stdout の JSON だけ。
#     人間はトランスクリプトで見えるがモデルには届かない。
# (3) cwd ガードが basename == "task-app" の完全一致だった。
#     worktree（.claude/worktrees/<name>）では basename が別名になり死ぬ。
#
# fail-open: 失敗しても作業をブロックしない（常に exit 0）。
# 要件: Claude Code v2.1.9+（additionalContext 対応）, jq

set -uo pipefail

# stdin の JSON を受け取る（PreToolUse payload）
INPUT="$(cat 2>/dev/null || true)"

# jq が無ければ何もしない（fail-open）
command -v jq >/dev/null 2>&1 || exit 0

# cwd ガード: task-app 配下でなければ何もしない。
# worktree（.../task-app/.claude/worktrees/<name>）でも効くよう部分一致にする（過去バグ(3)）。
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}"
[[ "$CLAUDE_PROJECT_DIR" == *task-app* ]] || exit 0

# 対象ファイルパスを stdin JSON から取得（過去バグ(1)）
FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
[[ -n "$FILE_PATH" ]] || exit 0

# material 配下の .md のみ対象。
# 絶対パス（*/material/*）と、先頭がそのまま material/ で始まる相対パスの両方を受ける。
# 実測(2026-07-15, v2.1.210)では Claude Code は常に絶対パスへ正規化して渡すが、
# それは観測された挙動であって文書化された契約ではない（Geminiレビュー指摘 PR#284 の横展開）。
[[ ( "$FILE_PATH" == */material/* || "$FILE_PATH" == material/* ) && "$FILE_PATH" == *.md ]] || exit 0

REMINDER='[material-writing フック発火] MW-CANARY-HOOK-91b2d7

教材ファイルを編集しています。`.claude/skills/material-writing/SKILL.md` の手順が未読なら今すぐ読んでください。

書く前・書き直す前の6手順:
1. 偏愛語を疑う（落ちる・壊れる・刺さる・設計・仕組み・本質・流れ…）
2. 対象に実体があるか判定する（その名詞の指示対象を1文で説明できるか？）
3. NGなら比喩に逃げず具体へ書き直す
4. 構文の癖を直す（過去形→現在形、1文内の対比→2文に分割）
5. 動詞・助詞・形容詞の選択ミスを正す（「課題を改善する」→「課題を解決する」）
6. 重言・翻訳調を消す（「することができます」→「できます」）

禁止: 手順書化（「これ書け→チェック」の羅列）。コードの後に必ず「なぜこう動くか」を書く。
判定: 読者が次の似た手続きを自力で書ける見込みがあるか。無ければ手順を増やさず理由を足す。

注: このリマインダは書き込みの「後」に届く（安全網）。次の編集から6手順を先に通してください。'

jq -n --arg ctx "$REMINDER" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", additionalContext: $ctx}}'

exit 0
