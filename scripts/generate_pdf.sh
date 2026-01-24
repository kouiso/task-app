#!/bin/bash
# =============================================================================
# PDF生成スクリプト
# Markdown → PDF (md-mermaid-to-pdf + カスタムCSS)
# =============================================================================

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 引数チェック
if [ $# -lt 1 ]; then
    echo -e "${YELLOW}使い方:${NC}"
    echo "  $0 <markdown_file> [output_dir]"
    echo ""
    echo "例:"
    echo "  $0 material/30days-curriculum/day04_typescript基礎.md"
    echo "  $0 material/30days-curriculum/day04_typescript基礎.md dist/pdf"
    exit 1
fi

MARKDOWN_FILE="$1"
OUTPUT_DIR="${2:-dist/pdf}"
CSS_FILE="material/30days-curriculum/styles/tutorial.css"

# ファイル存在チェック
if [ ! -f "$MARKDOWN_FILE" ]; then
    echo -e "${RED}❌ ファイルが見つかりません: $MARKDOWN_FILE${NC}"
    exit 1
fi

# 出力ディレクトリ作成
mkdir -p "$OUTPUT_DIR"

# 出力ファイル名を生成
BASENAME=$(basename "$MARKDOWN_FILE" .md)
OUTPUT_PDF="$OUTPUT_DIR/${BASENAME}.pdf"

echo -e "${YELLOW}📄 PDF生成中...${NC}"
echo "  入力: $MARKDOWN_FILE"
echo "  出力: $OUTPUT_PDF"
echo "  CSS:  $CSS_FILE"

# md-mermaid-to-pdf で変換
npx md-mermaid-to-pdf "$MARKDOWN_FILE" \
    --stylesheet "$CSS_FILE" \
    --pdf-options '{"format": "A4", "margin": {"top": "20mm", "bottom": "20mm", "left": "15mm", "right": "15mm"}, "printBackground": true}' \
    --dest "$OUTPUT_PDF"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ PDF生成完了！${NC}"
    echo "  出力: $OUTPUT_PDF"
    echo ""

    # ファイルサイズ表示
    SIZE=$(ls -lh "$OUTPUT_PDF" | awk '{print $5}')
    echo "  サイズ: $SIZE"
else
    echo ""
    echo -e "${RED}❌ PDF生成に失敗しました${NC}"
    exit 1
fi
