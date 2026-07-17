#!/bin/bash
# 教材品質チェック統合スクリプト
# すべてのチェックを実行し、最終結果をまとめる
# 引数: ファイルパス（複数可）またはディレクトリパス

SCRIPT_DIR="$(dirname "$0")"
FAILED=0
FILES=()

if [ $# -eq 0 ]; then
  echo "❌ エラー: ファイルパスまたはディレクトリを指定してください"
  echo "使用法: bash scripts/curriculum-qa/check_quality.sh material/30days-curriculum/dayXX_xxx.md"
  echo "        bash scripts/curriculum-qa/check_quality.sh material/30days-curriculum/"
  exit 1
fi

# 引数を展開: ディレクトリなら配下の教材md（day/appendix）を収集、ファイルはそのまま追加
# 目次・ロードマップ等のナビ文書は日次教材の構造チェック（Agenda/表/スクショ）の
# 対象外なので、ディレクトリ一括では day/appendix のみを見る（CIのGate2と同じスコープ）
for arg in "$@"; do
  if [ -d "$arg" ]; then
    while IFS= read -r f; do
      FILES+=("$f")
    done < <(find "$arg" -type f \( -name "day[0-9][0-9]_*.md" -o -name "appendix_*.md" \) | sort)
  elif [ -f "$arg" ]; then
    FILES+=("$arg")
  else
    echo "❌ エラー: ファイルが見つかりません: $arg"
    exit 1
  fi
done

if [ ${#FILES[@]} -eq 0 ]; then
  echo "❌ エラー: 対象ファイルが見つかりませんでした"
  exit 1
fi

run_checks_for_file() {
  local TARGET_FILE="$1"
  local FILE_FAILED=0

  echo ""
  echo "🔍 品質チェック開始: $TARGET_FILE"
  echo ""

  # 1. 視覚化チェック（表・スクショ・Mermaid図）
  echo "=========================================="
  echo "📊 Step 1: 視覚化チェック"
  echo "=========================================="
  if [ ! -f "$SCRIPT_DIR/check_visualization.py" ]; then
    echo "❌ Step 1 FAIL (スクリプト欠落: check_visualization.py)"
    FILE_FAILED=1
  elif python3 "$SCRIPT_DIR/check_visualization.py" "$TARGET_FILE"; then
    echo "✅ Step 1 PASS"
  else
    echo "❌ Step 1 FAIL"
    FILE_FAILED=1
  fi

  # 2. コードブロック長さチェック（25行以下）
  echo ""
  echo "=========================================="
  echo "📏 Step 2: コードブロック長さチェック"
  echo "=========================================="
  if [ ! -f "$SCRIPT_DIR/check_step_length.py" ]; then
    echo "❌ Step 2 FAIL (スクリプト欠落: check_step_length.py)"
    FILE_FAILED=1
  elif python3 "$SCRIPT_DIR/check_step_length.py" "$TARGET_FILE"; then
    echo "✅ Step 2 PASS"
  else
    echo "❌ Step 2 FAIL"
    FILE_FAILED=1
  fi

  # 3. ステップ連続性チェック（省略なし）
  echo ""
  echo "=========================================="
  echo "🔗 Step 3: ステップ連続性チェック"
  echo "=========================================="
  if [ ! -f "$SCRIPT_DIR/check_no_skip.py" ]; then
    echo "❌ Step 3 FAIL (スクリプト欠落: check_no_skip.py)"
    FILE_FAILED=1
  elif python3 "$SCRIPT_DIR/check_no_skip.py" "$TARGET_FILE"; then
    echo "✅ Step 3 PASS"
  else
    echo "❌ Step 3 FAIL"
    FILE_FAILED=1
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
    FILE_FAILED=1
  fi

  # 5. 技術スタックチェック（shadcn/ui必須、MUI禁止）
  echo ""
  echo "=========================================="
  echo "🛠️ Step 5: 技術スタックチェック"
  echo "=========================================="
  if [ ! -f "$SCRIPT_DIR/check_tech_stack.py" ]; then
    echo "❌ Step 5 FAIL (スクリプト欠落: check_tech_stack.py)"
    FILE_FAILED=1
  elif python3 "$SCRIPT_DIR/check_tech_stack.py" "$TARGET_FILE"; then
    echo "✅ Step 5 PASS"
  else
    echo "❌ Step 5 FAIL"
    FILE_FAILED=1
  fi

  # 6. コード完全性チェック（filepath:コメント、省略禁止）
  echo ""
  echo "=========================================="
  echo "📝 Step 6: コード完全性チェック"
  echo "=========================================="
  if [ ! -f "$SCRIPT_DIR/check_code_completeness.py" ]; then
    echo "❌ Step 6 FAIL (スクリプト欠落: check_code_completeness.py)"
    FILE_FAILED=1
  elif python3 "$SCRIPT_DIR/check_code_completeness.py" "$TARGET_FILE"; then
    echo "✅ Step 6 PASS"
  else
    echo "❌ Step 6 FAIL"
    FILE_FAILED=1
  fi

  # 7. 文体チェック（敬体一貫・AI構文ゼロ・関西弁混入ゼロ）
  echo ""
  echo "=========================================="
  echo "🗣️ Step 7: 文体チェック"
  echo "=========================================="
  if [ ! -f "$SCRIPT_DIR/check_tone.py" ]; then
    echo "❌ Step 7 FAIL (スクリプト欠落: check_tone.py)"
    FILE_FAILED=1
  elif python3 "$SCRIPT_DIR/check_tone.py" "$TARGET_FILE"; then
    echo "✅ Step 7 PASS"
  else
    echo "❌ Step 7 FAIL"
    FILE_FAILED=1
  fi

  # 8. 理解度チェック（専門用語・確認ポイント）
  echo ""
  echo "=========================================="
  echo "🎓 Step 8: 理解度チェック"
  echo "=========================================="
  if [ ! -f "$SCRIPT_DIR/check_comprehension.py" ]; then
    echo "❌ Step 8 FAIL (スクリプト欠落: check_comprehension.py)"
    FILE_FAILED=1
  elif python3 "$SCRIPT_DIR/check_comprehension.py" "$TARGET_FILE"; then
    echo "✅ Step 8 PASS"
  else
    echo "❌ Step 8 FAIL"
    FILE_FAILED=1
  fi

  return $FILE_FAILED
}

# 全ファイルを処理
for f in "${FILES[@]}"; do
  if ! run_checks_for_file "$f"; then
    FAILED=1
  fi
done

# 最終結果
echo ""
echo "=========================================="
echo "📋 品質チェック結果 (${#FILES[@]} ファイル)"
echo "=========================================="
if [ $FAILED -eq 0 ]; then
  echo "✅ ALL CHECKS PASS"
  exit 0
else
  echo "❌ SOME CHECKS FAIL"
  exit 1
fi
