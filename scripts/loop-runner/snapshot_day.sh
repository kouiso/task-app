#!/usr/bin/env bash
# Day完了時点の git スナップショットを打つ。
# Usage: snapshot_day.sh <loop_number> <day_number> <target_app_dir>
set -euo pipefail

LOOP_N="$1"
DAY_N="$2"
TARGET_DIR="$3"

TAG="loop-${LOOP_N}-day-${DAY_N}-end"
MSG="loop-${LOOP_N} day-${DAY_N} end"

cd "$TARGET_DIR"

git add -A
git commit -m "$MSG" --allow-empty
git tag "$TAG" 2>/dev/null || echo "  (tag $TAG already exists, skipping)"

echo "  📌 snapshot: $TAG"
