#!/usr/bin/env bash
# sync-ai-rules.sh — AGENTS.md を single source として bridge ファイルを再生成する
# 使い方: bash scripts/sync-ai-rules.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS="$REPO_ROOT/AGENTS.md"
GEMINI="$REPO_ROOT/.gemini/styleguide.md"
COPILOT="$REPO_ROOT/.github/copilot-instructions.md"

if [[ ! -f "$AGENTS" ]]; then
  echo "ERROR: AGENTS.md が見つかりません: $AGENTS" >&2
  exit 1
fi

AGENTS_CONTENT=$(cat "$AGENTS")

GEMINI_PROLOG='<!-- AUTO-GENERATED from AGENTS.md by scripts/sync-ai-rules.sh -->
<!-- DO NOT HAND-EDIT — changes will be overwritten on next sync -->
<!-- To update: edit AGENTS.md, then run: bash scripts/sync-ai-rules.sh -->

# task-app — Gemini Code Assist スタイルガイド

## レビュー言語

- すべてのレビューコメントは **日本語** で記述してください
- 内部の思考プロセス（think）のみ英語で行い、出力は日本語にしてください

## PR サマリー

- PR の要約はポエティックで読みやすい形式で記述してください（CodeRabbit 風）
- 変更内容の本質を捉えた、わかりやすく印象的な表現を使用してください

---

<!-- ===== AGENTS.md CONTENT (auto-synced) ===== -->'

COPILOT_PROLOG='<!-- AUTO-GENERATED from AGENTS.md by scripts/sync-ai-rules.sh -->
<!-- DO NOT HAND-EDIT — changes will be overwritten on next sync -->
<!-- To update: edit AGENTS.md, then run: bash scripts/sync-ai-rules.sh -->'

generate_gemini() {
  printf '%s\n\n%s\n' "$GEMINI_PROLOG" "$AGENTS_CONTENT"
}

generate_copilot() {
  printf '%s\n\n%s\n' "$COPILOT_PROLOG" "$AGENTS_CONTENT"
}

mkdir -p "$REPO_ROOT/.gemini" "$REPO_ROOT/.github"
generate_gemini > "$GEMINI"
generate_copilot > "$COPILOT"
echo "Generated: $GEMINI"
echo "Generated: $COPILOT"
echo "Done. AGENTS.md → bridge ファイル同期完了。"
