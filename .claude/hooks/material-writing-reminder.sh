#!/bin/bash
# material-writing-reminder.sh
# PreToolUse hook: material/** への Write/Edit 時に思考プロセス6手順をリマインドする
# fail-open: hook が失敗しても作業をブロックしない (exit 0)
# ハードブロックなし: 意味判定は機械には無理なので、リマインダに徹する

# cwd ガード: CLAUDE_PROJECT_DIR が task-app 配下でなければ即 exit 0
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}"
if [[ -z "$CLAUDE_PROJECT_DIR" ]]; then
  exit 0
fi

if [[ "$(basename "$CLAUDE_PROJECT_DIR")" != "task-app" ]]; then
  exit 0
fi

# Write/Edit の対象ファイルパスを取得
FILE_PATH="${TOOL_INPUT_file_path:-}"
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# material/** への書き込みのみ対象
if [[ "$FILE_PATH" != */material/* ]]; then
  exit 0
fi

# stderr にリマインダを出力（ブロックはしない）
cat >&2 << 'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 教材執筆リマインダ: /material-writing の思考プロセス6手順を通してから書いてください
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 偏愛語を疑う（落ちる・壊れる・設計・仕組み・本質…）
2. 対象に実体があるか判定する（指示対象を1文で説明できるか？）
3. NGなら比喩に逃げず具体へ書き直す
4. 構文の癖を直す（過去形→現在形、対比→2文分割）
5. 動詞・助詞・形容詞の選択ミスを正す
6. 重言・翻訳調を消す

詳細: .claude/skills/material-writing/SKILL.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

# 常に exit 0 (fail-open — ブロックしない)
exit 0
