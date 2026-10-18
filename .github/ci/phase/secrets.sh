#!/usr/bin/env bash
# 上流 action v3.96.0 の advanced scan と同じ検査範囲・コンテナ引数を使う。
git status >/dev/null
base=${BASE:-}
head=${HEAD:-}
if [ -n "$base" ] || [ -n "$head" ]; then
  base_commit=$(git rev-parse "$base")
  head_commit=$(git rev-parse "$head")
  if [ "$base_commit" = "$head_commit" ]; then
    echo 'BASE and HEAD resolve to the same commit' >&2
    exit 1
  fi
fi
docker run --rm -v .:/tmp -w /tmp ghcr.io/trufflesecurity/trufflehog:latest \
  git file:///tmp/ --since-commit "$base" --branch "$head" \
  --fail --no-update --github-actions --only-verified
