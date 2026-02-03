#!/bin/bash
# 教材品質チェック統合スクリプト

set -e

TARGET_FILE="$1"

if [ -z "$TARGET_FILE" ]; then
  echo "❌ エラー: ファイルパスを指定してください"
  echo "使用法: bash script/check_quality.sh material/30days-curriculum/dayXX_xxx.md"
  exit 1
fi

if [ ! -f "$TARGET_FILE" ]; then
  echo "❌ エラー: ファイルが見つかりません: $TARGET_FILE"
  exit 1
fi

echo "🔍 品質チェック開始: $TARGET_FILE"
echo ""

# 1. 視覚化チェック（表・スクショ・Mermaid図）
echo "📊 [1/4] 視覚化チェック..."
python3 script/check_visualization.py "$TARGET_FILE"

# 2. コードブロック長さチェック（25行以下）
echo ""
echo "📏 [2/4] コードブロック長さチェック..."
python3 script/check_step_length.py "$TARGET_FILE"

# 3. ステップ連続性チェック（省略なし）
echo ""
echo "🔗 [3/4] ステップ連続性チェック..."
python3 script/check_no_skip.py "$TARGET_FILE"

# 4. 禁止ワードチェック
echo ""
echo "🚫 [4/4] 禁止ワードチェック..."
FORBIDDEN_WORDS=("同様に" "残りも" "以下略" "簡単です")
FOUND_FORBIDDEN=0

for word in "${FORBIDDEN_WORDS[@]}"; do
  if grep -q "$word" "$TARGET_FILE"; then
    echo "❌ 禁止ワード発見: '$word'"
    grep -n "$word" "$TARGET_FILE"
    FOUND_FORBIDDEN=1
  fi
done

if [ $FOUND_FORBIDDEN -eq 0 ]; then
  echo "✅ 禁止ワードなし"
fi

echo ""
echo "✅ 全チェック完了"
