#!/usr/bin/env bash
set -euo pipefail

# このスクリプトは販売用ZIP（task-app-curriculum-v1.1.zip）を作るためにある。
# 受講者が ZIP 展開後に npm install / build / test まで確認できるよう、
# カリキュラム本文だけでなく現在のアプリ本体と Prisma migrations も梱包する。
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

# ---- アプリ本体 + カリキュラム + scaffold 補助ファイル ----
rsync -a "${PROJECT_ROOT}/" "${BUILD_DIR}/" \
  --exclude=".git/" \
  --exclude=".github/" \
  --exclude=".claude/" \
  --exclude=".copilot/" \
  --exclude=".agents/" \
  --exclude=".gemini/" \
  --exclude=".serena/" \
  --exclude=".vercel/" \
  --exclude=".devcontainer/" \
  --exclude=".docker/" \
  --exclude=".husky/" \
  --exclude=".vscode/" \
  --exclude=".mcp.json" \
  --exclude=".next/" \
  --exclude="node_modules/" \
  --exclude="coverage/" \
  --exclude="dist/" \
  --exclude="build/" \
  --exclude="out/" \
  --exclude="playwright-report/" \
  --exclude="test-results/" \
  --exclude="node-compile-cache/" \
  --exclude="scripts/curriculum-qa/" \
  --exclude="src/server/api/routers/project.ts" \
  --exclude="scripts/_server-routers/project.ts" \
  --exclude="*.tsbuildinfo" \
  --exclude="*.log" \
  --exclude="/*.png" \
  --exclude="/audit-skips.json" \
  --exclude="/context-mode-*" \
  --exclude="/prisma/*.db" \
  --exclude="*.env" \
  --exclude=".env.*" \
  --exclude="!.env.example" \
  --exclude="task-app-curriculum-*.zip"

# .env.example は学習者の初回セットアップに必要なので、環境除外より後で明示コピーする。
if [ -f "${PROJECT_ROOT}/.env.example" ]; then
  cp "${PROJECT_ROOT}/.env.example" "${BUILD_DIR}/.env.example"
fi

# root.ts を Day 08 終了時点の状態(auth のみ登録)に差し替える。
# src/server/api/routers/project.ts を除外した以上、完成品の root.ts(project登録済み)を
# そのまま配布するとビルドが通らない。scaffold-from-scratch.sh が使っている
# _server-base/root.ts と同じ初期状態ファイルをここでも使う。
if [ -f "${PROJECT_ROOT}/scripts/_server-base/root.ts" ]; then
  cp "${PROJECT_ROOT}/scripts/_server-base/root.ts" "${BUILD_DIR}/src/server/api/root.ts"
fi

# ---- ZIP 作成（前回の残骸があれば上書き） ----
rm -f "${OUTPUT_ZIP}"
cd "${BUILD_PARENT}"
zip -r "${OUTPUT_ZIP}" "task-app" -x "*.DS_Store"

ZIP_SIZE=$(du -sh "${OUTPUT_ZIP}" | cut -f1)
MIGRATION_COUNT=$(find "${BUILD_DIR}/prisma/migrations" -name "migration.sql" | wc -l | tr -d " ")
echo ""
echo "=== ビルド完了 ==="
echo "出力ファイル: ${OUTPUT_ZIP}"
echo "ZIP サイズ: ${ZIP_SIZE}"
echo "Prisma migrations: ${MIGRATION_COUNT}"
