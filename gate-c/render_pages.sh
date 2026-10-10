#!/bin/bash
# Gate C: 全PDFを頁PNG化 + 頁数/サイズ一覧を生成する
# 使い方: bash gate-c/render_pages.sh <pdf_dir> <out_dir>
set -u
PDF_DIR="${1:?pdf dir}"
OUT="${2:?out dir}"
mkdir -p "$OUT"
printf '| pdf | pages | bytes | sha256 |\n|---|---|---|---|\n' > "$OUT/page-inventory.md"
for pdf in "$PDF_DIR"/*.pdf; do
  name=$(basename "$pdf")
  stem="${name%.pdf}"
  pages=$(pdfinfo "$pdf" | awk '/^Pages:/{print $2}')
  bytes=$(stat -f %z "$pdf")
  sha=$(shasum -a 256 "$pdf" | cut -d' ' -f1)
  printf '| %s | %s | %s | %s |\n' "$name" "$pages" "$bytes" "$sha" >> "$OUT/page-inventory.md"
  mkdir -p "$OUT/$stem"
  pdftoppm -r 60 -png "$pdf" "$OUT/$stem/page"
done
echo "done -> $OUT/page-inventory.md"
