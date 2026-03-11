#!/bin/bash
# plan-memory-reminder.sh
# PostToolUse hook: Detects plan file creation/edit and reminds to update MEMORY.md
# Triggered after Write/Edit tool use

# Get the file path from tool input
FILE_PATH="${TOOL_INPUT_file_path:-}"

# Only trigger for plan files in project root
if [[ "$FILE_PATH" == */plan-*.md ]] || [[ "$FILE_PATH" == */plan_*.md ]]; then
  BASENAME=$(basename "$FILE_PATH")
  echo "📋 Plan file detected: $BASENAME"
  echo "⚠️ Remember to update MEMORY.md with this plan's path and purpose."
fi
