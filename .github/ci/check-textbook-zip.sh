#!/usr/bin/env bash
# 配布する教材 ZIP が course-library の約束どおり 36 冊だけを持つかを見る。
# 展開した時に task-app-textbook/ の下へ PDF が並ぶ形だけを許可する。
set -euo pipefail
zip_path=${1:?usage: check-textbook-zip.sh <zip>}
[ -s "$zip_path" ] || { echo "textbook ZIP is missing or empty: $zip_path" >&2; exit 1; }
entries=$(unzip -Z1 "$zip_path")
pdfs=$(printf '%s\n' "$entries" | grep -cE '^task-app-textbook/[^/]+\.pdf$' || true)
unexpected=$(printf '%s\n' "$entries" | grep -Ev '^task-app-textbook/$|^task-app-textbook/[^/]+\.pdf$' || true)
if [ "$pdfs" -ne 36 ]; then
  echo "textbook ZIP must contain 36 PDFs under task-app-textbook/ (got $pdfs)" >&2
  exit 1
fi
if [ -n "$unexpected" ]; then
  echo "textbook ZIP has unexpected entries:" >&2
  printf '%s\n' "$unexpected" >&2
  exit 1
fi
