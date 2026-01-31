#!/bin/bash
# PDF生成スクリプト（Task.dev から呼び出し）
# 使用例: bash script/generate_pdf.sh single /path/to/file.md 1
#         bash script/generate_pdf.sh all 1

set -e

# 関数定義
generate_single_pdf() {
  local file="$1"
  local open_flag="${2:-0}"

  if [ -z "$file" ]; then
    echo "❌ エラー: ファイルパスを指定してください"
    echo "使用法: bash script/generate_pdf.sh single docs/file.md [OPEN]"
    exit 1
  fi

  mkdir -p material/pdf
  local basename=$(basename "$file" .md)

  echo "📄 変換中: $file"

  npx md-mermaid-to-pdf "$file" "material/pdf/$basename.pdf" \
    --stylesheet material/style/tutorial.css

  local pdf_path="material/pdf/$basename.pdf"
  echo "✅ 完了: $pdf_path"

  # OPEN フラグが "1" または "true" の場合、PDFを開く
  if [ "$open_flag" = "1" ] || [ "$open_flag" = "true" ]; then
    if command -v open &> /dev/null; then
      open "$pdf_path"
    elif command -v xdg-open &> /dev/null; then
      xdg-open "$pdf_path"
    elif command -v start &> /dev/null; then
      start "$pdf_path"
    else
      echo "⚠️  警告: PDF を自動で開くコマンドが見つかりません"
      echo "手動で開いてください: $pdf_path"
    fi
  fi
}

generate_all_pdfs() {
  local open_flag="${1:-0}"

  mkdir -p material/pdf
  echo "📂 material/ 配下のファイルをスキャン中..."

  local last_pdf=""

  for file in material/30days-curriculum/day*.md; do
    if [ -f "$file" ]; then
      local basename=$(basename "$file" .md)
      echo "📄 変換中: $file"

      npx md-mermaid-to-pdf "$file" "material/pdf/$basename.pdf" \
        --stylesheet material/style/tutorial.css

      last_pdf="material/pdf/$basename.pdf"
      echo "✅ $basename.pdf"
    fi
  done

  if [ -n "$last_pdf" ]; then
    echo ""
    echo "✅ PDF生成完了: $last_pdf"

    # OPEN フラグが "1" または "true" の場合、最後のPDFを開く
    if [ "$open_flag" = "1" ] || [ "$open_flag" = "true" ]; then
      if command -v open &> /dev/null; then
        open "$last_pdf"
      elif command -v xdg-open &> /dev/null; then
        xdg-open "$last_pdf"
      elif command -v start &> /dev/null; then
        start "$last_pdf"
      else
        echo "⚠️  警告: PDF を自動で開くコマンドが見つかりません"
        echo "手動で開いてください: $last_pdf"
      fi
    fi
  else
    echo "⚠️  変換するファイルがありません"
  fi
}

# メイン処理
main() {
  local command="${1:-}"

  case "$command" in
  single)
    generate_single_pdf "$2" "$3"
    ;;
  all)
    generate_all_pdfs "$2"
    ;;
  *)
    echo "❌ エラー: コマンドを指定してください"
    echo "使用法:"
    echo "  bash scripts/generate-pdf.sh single <FILE> [OPEN]"
    echo "  bash scripts/generate-pdf.sh all [OPEN]"
    echo ""
    echo "例:"
    echo "  bash scripts/generate-pdf.sh single material/30days-curriculum/day01.md"
    echo "  bash scripts/generate-pdf.sh single material/30days-curriculum/day01.md 1"
    echo "  bash scripts/generate-pdf.sh all"
    echo "  bash scripts/generate-pdf.sh all 1"
    exit 1
    ;;
  esac
}

main "$@"
