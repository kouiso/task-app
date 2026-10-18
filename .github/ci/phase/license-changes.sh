#!/usr/bin/env bash
# 基準を取得できない時に依存検査を省略しない。
if [ "$EVENT_NAME" = pull_request ]; then
  if ! git fetch origin "$BASE_REF"; then echo 'changes=true' >> "$GITHUB_OUTPUT"; exit 0; fi
  base=FETCH_HEAD
  head=$HEAD_SHA
else
  base=HEAD^
  head=HEAD
fi
if ! changed=$(git diff --name-only "$base" "$head"); then
  echo 'changes=true' >> "$GITHUB_OUTPUT"
elif printf '%s\n' "$changed" | grep -E '(^|/)package(-lock)?\.json$|^\.github/ci/' >/dev/null; then
  echo 'changes=true' >> "$GITHUB_OUTPUT"
else
  echo 'changes=false' >> "$GITHUB_OUTPUT"
fi
