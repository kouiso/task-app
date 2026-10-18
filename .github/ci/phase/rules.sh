#!/usr/bin/env bash
bash scripts/sync-ai-rules.sh
git diff --exit-code .gemini/styleguide.md .github/copilot-instructions.md || {
  echo "DRIFT DETECTED: bridge ファイルが AGENTS.md と一致しません。修正: bash scripts/sync-ai-rules.sh を実行してコミット"
  exit 1
}
