#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/check-branch-reconciliation.sh <source-ref> <reconciled-ref>

Checks that splitting a large source branch into smaller pull requests preserved
the final tracked-file state. Both arguments must resolve to commits.
EOF
}

if [[ $# -ne 2 ]]; then
  usage >&2
  exit 64
fi

source_ref=$1
reconciled_ref=$2

resolve_commit() {
  local ref=$1

  if ! git rev-parse --verify --quiet "${ref}^{commit}"; then
    printf 'error: ref does not resolve to a commit: %s\n' "$ref" >&2
    exit 65
  fi
}

source_commit=$(resolve_commit "$source_ref")
reconciled_commit=$(resolve_commit "$reconciled_ref")
source_tree=$(git rev-parse "${source_commit}^{tree}")
reconciled_tree=$(git rev-parse "${reconciled_commit}^{tree}")

printf 'Source:     %s (%s)\n' "$source_ref" "$source_commit"
printf 'Reconciled: %s (%s)\n' "$reconciled_ref" "$reconciled_commit"
printf 'Source tree:     %s\n' "$source_tree"
printf 'Reconciled tree: %s\n' "$reconciled_tree"

if [[ "$source_tree" == "$reconciled_tree" ]]; then
  printf 'PASS: tracked-file trees are identical (%s).\n' "$source_tree"
  exit 0
fi

printf 'FAIL: tracked-file trees differ.\n' >&2
printf '\nChanged paths (source -> reconciled):\n' >&2
git diff --name-status "$source_commit" "$reconciled_commit" >&2
printf '\nSummary (source -> reconciled):\n' >&2
git diff --stat "$source_commit" "$reconciled_commit" >&2
exit 1
