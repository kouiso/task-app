#!/usr/bin/env bash
# dist/pdf の 36 冊を course-library が配る ZIP の形へ束ねる。
# 照合は check-textbook-zip.sh に寄せ、作った側と検査側で条件がずれないようにする。
set -euo pipefail
pdf_dir=${1:?usage: package-textbook-zip.sh <pdf-dir> <output-zip>}
output=${2:?usage: package-textbook-zip.sh <pdf-dir> <output-zip>}
count=$(find "$pdf_dir" -maxdepth 1 -type f -name '*.pdf' | wc -l | tr -d ' ')
if [ "$count" -ne 36 ]; then
  echo "expected 36 PDFs in $pdf_dir (got $count)" >&2
  exit 1
fi
case "$output" in
  /*) ;;
  *) output="$PWD/$output" ;;
esac
stage=$(mktemp -d)
trap 'rm -rf -- "$stage"' EXIT
mkdir "$stage/task-app-textbook"
cp "$pdf_dir"/*.pdf "$stage/task-app-textbook/"
rm -f -- "$output"
(cd "$stage" && zip -qr "$output" task-app-textbook)
bash "$(dirname "$0")/check-textbook-zip.sh" "$output"
