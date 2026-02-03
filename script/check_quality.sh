#!/bin/bash
# 教材品質チェック統合スクリプト
# すべてのチェックを実行し、最終結果をまとめる

# set -e を削除 - すべてのチェックを実行するため

TARGET_FILE="$1"
SCRIPT_DIR="$(dirname "$0")"
FAILED=0

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
echo "=========================================="
echo "📊 Step 1: 視覚化チェック"
echo "=========================================="
if python3 "$SCRIPT_DIR/check_visualization.py" "$TARGET_FILE"; then
  echo "✅ Step 1 PASS"
else
  echo "❌ Step 1 FAIL"
  FAILED=1
fi

# 2. コードブロック長さチェック（25行以下）
echo ""
echo "=========================================="
echo "📏 Step 2: コードブロック長さチェック"
echo "=========================================="
if python3 "$SCRIPT_DIR/check_step_length.py" "$TARGET_FILE"; then
  echo "✅ Step 2 PASS"
else
  echo "❌ Step 2 FAIL"
  FAILED=1
fi

# 3. ステップ連続性チェック（省略なし）
echo ""
echo "=========================================="
echo "🔗 Step 3: ステップ連続性チェック"
echo "=========================================="
if python3 "$SCRIPT_DIR/check_no_skip.py" "$TARGET_FILE"; then
  echo "✅ Step 3 PASS"
else
  echo "❌ Step 3 FAIL"
  FAILED=1
fi

# 4. 禁止ワードチェック
echo ""
echo "=========================================="
echo "🚫 Step 4: 禁止ワードチェック"
echo "=========================================="
FORBIDDEN_WORDS=("同様に" "残りも" "以下略" "簡単です" "同じように")
FOUND_FORBIDDEN=0

for word in "${FORBIDDEN_WORDS[@]}"; do
  if grep -q "$word" "$TARGET_FILE"; then
    echo "❌ 禁止ワード発見: '$word'"
    grep -n "$word" "$TARGET_FILE" | head -5
    FOUND_FORBIDDEN=1
  fi
done

if [ $FOUND_FORBIDDEN -eq 0 ]; then
  echo "✅ 禁止ワードなし"
  echo "✅ Step 4 PASS"
else
  echo "❌ Step 4 FAIL"
  FAILED=1
fi

# 5. 技術スタックチェック（shadcn/ui必須、MUI禁止）
echo ""
echo "=========================================="
echo "🛠️ Step 5: 技術スタックチェック"
echo "=========================================="
if [ -f "$SCRIPT_DIR/check_tech_stack.py" ]; then
  if python3 "$SCRIPT_DIR/check_tech_stack.py" "$TARGET_FILE"; then
    echo "✅ Step 5 PASS"
  else
    echo "❌ Step 5 FAIL"
    FAILED=1
  fi
else
  echo "⏭️ Step 5 SKIP (スクリプトなし)"
fi

# 最終結果
echo ""
echo "=========================================="
echo "📋 品質チェック結果"
echo "=========================================="
if [ $FAILED -eq 0 ]; then
  echo "✅ ALL CHECKS PASS"
  exit 0
else
  echo "❌ SOME CHECKS FAIL"
  exit 1
fi
