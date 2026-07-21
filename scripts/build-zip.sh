#!/usr/bin/env bash
set -euo pipefail

# このスクリプトは販売用ZIP（task-app-curriculum-v1.1.zip）を作るためにある。
# 受講者が ZIP 展開後に scaffold-from-scratch.sh を実行して学習を始められるよう、
# カリキュラム本文と初期土台を生成するための補助ファイルだけを梱包する。
# 何度実行しても同じ結果になるよう冪等に設計してある。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BUILD_PARENT="/tmp/task-app-curriculum-package"
BUILD_DIR="${BUILD_PARENT}/task-app"
ZIP_NAME="task-app-curriculum-v1.1.zip"
OUTPUT_ZIP="${PROJECT_ROOT}/${ZIP_NAME}"

echo "=== task-app 販売用ZIP ビルド開始 ==="
echo "プロジェクトルート: ${PROJECT_ROOT}"
echo "ビルド一時ディレクトリ: ${BUILD_DIR}"

# 前回のビルド残骸を掃除してからやり直す（冪等性の担保）
rm -rf "${BUILD_PARENT}"
mkdir -p "${BUILD_DIR}"
trap 'rm -rf "${BUILD_PARENT}"' EXIT

# ---- 教材 + scaffold 補助ファイル ----
# 完成アプリの package.json / src / prisma は入れない。
# これらがあると scaffold-from-scratch.sh が create-next-app をスキップし、
# Day 01 の説明と実際の開始状態が食い違うためである。
required_files=(
  "README.md"
  ".env.example"
  ".mise.toml"
  ".node-version"
  "doc/SUPPORTED_ENVIRONMENTS.md"
  "scripts/scaffold-from-scratch.sh"
)

for relative_path in "${required_files[@]}"; do
  source_path="${PROJECT_ROOT}/${relative_path}"
  if [ ! -f "${source_path}" ]; then
    echo "必要な配布ファイルが見つかりません: ${relative_path}" >&2
    exit 1
  fi
  mkdir -p "${BUILD_DIR}/$(dirname "${relative_path}")"
  cp -p "${source_path}" "${BUILD_DIR}/${relative_path}"
done

rsync -a "${PROJECT_ROOT}/material/" "${BUILD_DIR}/material/"

support_directories=(
  "_app-api-trpc"
  "_app-base"
  "_app-components"
  "_constants"
  "_docker"
  "_lib-base"
  "_lib-utils"
  "_prisma"
  "_seed"
  "_server-base"
  "_server-routers"
  "_trpc-base"
  "_ui-components"
)

for directory in "${support_directories[@]}"; do
  source_directory="${PROJECT_ROOT}/scripts/${directory}"
  if [ ! -d "${source_directory}" ]; then
    echo "必要な scaffold 補助ディレクトリが見つかりません: scripts/${directory}" >&2
    exit 1
  fi
  mkdir -p "${BUILD_DIR}/scripts/${directory}"
  if [ "${directory}" = "_server-routers" ]; then
    rsync -a --exclude="project.ts" \
      "${source_directory}/" "${BUILD_DIR}/scripts/${directory}/"
  else
    rsync -a "${source_directory}/" "${BUILD_DIR}/scripts/${directory}/"
  fi
done

# ---- ZIP 作成（前回の残骸があれば上書き） ----
rm -f "${OUTPUT_ZIP}"
cd "${BUILD_PARENT}"
zip -qr "${OUTPUT_ZIP}" "task-app" -x "*.DS_Store"

bash "${PROJECT_ROOT}/scripts/curriculum-qa/check-sale-package.sh" "${OUTPUT_ZIP}"

ZIP_SIZE=$(du -sh "${OUTPUT_ZIP}" | cut -f1)
FILE_COUNT=$(find "${BUILD_DIR}" -type f | wc -l | tr -d " ")
echo ""
echo "=== ビルド完了 ==="
echo "出力ファイル: ${OUTPUT_ZIP}"
echo "ZIP サイズ: ${ZIP_SIZE}"
echo "配布ファイル数: ${FILE_COUNT}"
