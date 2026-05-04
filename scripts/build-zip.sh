#!/usr/bin/env bash
set -euo pipefail

# このスクリプトは販売用ZIP（task-app-curriculum-v1.0.zip）を作るためにある。
# 内部ドキュメント・ソースコード・CI設定などは除外し、受講者に渡すファイルだけを梱包する。
# 何度実行しても同じ結果になるよう冪等に設計してある。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BUILD_DIR="/tmp/task-app-curriculum-build"
ZIP_NAME="task-app-curriculum-v1.0.zip"
OUTPUT_ZIP="${PROJECT_ROOT}/${ZIP_NAME}"

echo "=== task-app 販売用ZIP ビルド開始 ==="
echo "プロジェクトルート: ${PROJECT_ROOT}"
echo "ビルド一時ディレクトリ: ${BUILD_DIR}"

# 前回のビルド残骸を掃除してからやり直す（冪等性の担保）
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# ---- カリキュラム本文（内部ドキュメントを除いた .md だけコピー） ----
CURRICULUM_SRC="${PROJECT_ROOT}/material/30days-curriculum"
CURRICULUM_DST="${BUILD_DIR}/material/30days-curriculum"
mkdir -p "${CURRICULUM_DST}"

rsync -a \
  --include="day*.md" \
  --include="00_カリキュラム目次.md" \
  --include="appendix_*.md" \
  --exclude="audit_*.md" \
  --exclude="review_*.md" \
  --exclude="round4*.md" \
  --exclude="completion_report*.md" \
  --exclude="*_quality_report.txt" \
  --exclude="CURRICULUM_PLAN.md" \
  --exclude="*.json" \
  --exclude="*" \
  "${CURRICULUM_SRC}/" "${CURRICULUM_DST}/"

# ---- スクリーンショットディレクトリ（丸ごとコピー） ----
if [ -d "${CURRICULUM_SRC}/screenshots" ]; then
  rsync -a "${CURRICULUM_SRC}/screenshots/" "${CURRICULUM_DST}/screenshots/"
fi

# ---- スクリプト類 ----
SCRIPTS_SRC="${PROJECT_ROOT}/scripts"
SCRIPTS_DST="${BUILD_DIR}/scripts"
mkdir -p "${SCRIPTS_DST}"

# scaffold スクリプト本体
cp "${SCRIPTS_SRC}/scaffold-from-scratch.sh" "${SCRIPTS_DST}/"

# scaffold が参照するサブディレクトリ群（存在するものだけコピー）
for dir in \
  _ui-components \
  _lib-utils \
  _lib-base \
  _constants \
  _trpc-base \
  _server-routers \
  _prisma \
  _docker \
  _seed \
  _app-components
do
  if [ -d "${SCRIPTS_SRC}/${dir}" ]; then
    rsync -a "${SCRIPTS_SRC}/${dir}/" "${SCRIPTS_DST}/${dir}/"
  fi
done

# ---- プロジェクトルート直下のファイル ----
cp "${PROJECT_ROOT}/README.md" "${BUILD_DIR}/"

if [ -f "${PROJECT_ROOT}/.env.example" ]; then
  cp "${PROJECT_ROOT}/.env.example" "${BUILD_DIR}/"
fi

# ---- ZIP 作成（前回の残骸があれば上書き） ----
rm -f "${OUTPUT_ZIP}"
cd /tmp
zip -r "${OUTPUT_ZIP}" "task-app-curriculum-build" -x "*.DS_Store"

ZIP_SIZE=$(du -sh "${OUTPUT_ZIP}" | cut -f1)
echo ""
echo "=== ビルド完了 ==="
echo "出力ファイル: ${OUTPUT_ZIP}"
echo "ZIP サイズ: ${ZIP_SIZE}"
