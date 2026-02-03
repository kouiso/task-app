#!/bin/bash
# 全教材の品質チェック一括実行

set -e

OUTPUT_DIR="material/quality_reports"
mkdir -p "$OUTPUT_DIR"

echo "🔍 全教材の品質チェックを開始します..."
echo ""

TOTAL_FILES=0
PASSED_FILES=0
FAILED_FILES=0

for file in material/30days-curriculum/day*.md; do
  if [ -f "$file" ]; then
    TOTAL_FILES=$((TOTAL_FILES + 1))
    basename=$(basename "$file" .md)
    report_file="$OUTPUT_DIR/${basename}_report.txt"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 $basename"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if bash script/check_quality.sh "$file" > "$report_file" 2>&1; then
      echo "✅ PASS"
      PASSED_FILES=$((PASSED_FILES + 1))
    else
      echo "❌ FAIL - 詳細: $report_file"
      FAILED_FILES=$((FAILED_FILES + 1))
      cat "$report_file"
    fi

    echo ""
  fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 品質チェック結果サマリー"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "合計: $TOTAL_FILES ファイル"
echo "✅ PASS: $PASSED_FILES"
echo "❌ FAIL: $FAILED_FILES"
echo ""

if [ $FAILED_FILES -eq 0 ]; then
  echo "🎉 全ファイルが品質基準をクリアしました！"
  exit 0
else
  echo "⚠️  $FAILED_FILES ファイルが品質基準を満たしていません"
  echo "詳細レポート: $OUTPUT_DIR/"
  exit 1
fi
