#!/usr/bin/env bash
# setup-dev.sh — 完成品デバッグ用の環境を一発で構築するスクリプト
#
# 教材用の scaffold-from-scratch.sh と異なり、以下を行う:
#   - tsconfig.json の exclude を教材用に絞らない（全ファイルを型チェック対象にする）
#   - フルデータの seed を投入する（全ステータス・全優先度・全ロールを網羅）
#
# 実行:
#   bash scripts/setup-dev.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── ユーティリティ ──────────────────────────────────────────────────────────

print_step() {
  echo ""
  echo "▶ $*"
}

print_error() {
  echo "エラー: $*" >&2
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    print_error "$2"
    exit 1
  fi
}

# ─── 前提チェック ─────────────────────────────────────────────────────────────

check_prerequisites() {
  print_step "前提条件を確認しています..."

  require_command "node" "Node.js が見つかりません。Node.js 20 以上をインストールしてください: https://nodejs.org/"
  require_command "npm" "npm が見つかりません。Node.js と一緒にインストールしてください。"
  require_command "docker" "Docker が見つかりません。Docker Desktop をインストールしてください: https://www.docker.com/products/docker-desktop/"

  if ! docker info >/dev/null 2>&1; then
    print_error "Docker Desktop が起動していません。起動してから再実行してください。"
    exit 1
  fi

  echo "  OK: Node.js $(node -v)"
  echo "  OK: npm $(npm -v)"
  echo "  OK: Docker 起動中"
}

# ─── 依存パッケージ ───────────────────────────────────────────────────────────

install_dependencies() {
  print_step "依存パッケージをインストールしています..."
  cd "$PROJECT_DIR"
  npm install
  echo "  OK: npm install 完了"
}

# ─── .env ────────────────────────────────────────────────────────────────────

setup_env() {
  print_step ".env を準備しています..."
  cd "$PROJECT_DIR"

  if [ -f ".env" ]; then
    echo "  .env が既に存在するためスキップします。"
    return 0
  fi

  if [ ! -f ".env.example" ]; then
    print_error ".env.example が見つかりません。"
    exit 1
  fi

  cp .env.example .env
  echo "  OK: .env.example → .env にコピーしました。"
  echo "  必要に応じて .env の内容を編集してください。"
}

# ─── Docker DB 起動 ───────────────────────────────────────────────────────────

start_database() {
  print_step "PostgreSQL コンテナを起動しています..."
  cd "$PROJECT_DIR"

  if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml が見つかりません。"
    exit 1
  fi

  docker compose up -d db test-db

  echo "  DB の起動を待っています..."
  local retries=30
  while [ $retries -gt 0 ]; do
    if docker compose exec -T db pg_isready -U user -d taskapp >/dev/null 2>&1; then
      echo "  OK: DB 起動完了"
      return 0
    fi
    retries=$((retries - 1))
    sleep 1
  done

  print_error "DB の起動がタイムアウトしました。docker compose logs db を確認してください。"
  exit 1
}

# ─── Prisma ──────────────────────────────────────────────────────────────────

setup_prisma() {
  print_step "Prisma スキーマを DB に反映しています..."
  cd "$PROJECT_DIR"

  npx prisma generate
  npx prisma db push
  echo "  OK: prisma generate + db push 完了"
}

# ─── フルデータ seed ──────────────────────────────────────────────────────────

run_seed_dev() {
  print_step "デバッグ用フルデータを投入しています..."
  cd "$PROJECT_DIR"

  local seed_src="${SCRIPT_DIR}/_seed-dev/seed-dev.ts"

  if [ ! -f "$seed_src" ]; then
    print_error "_seed-dev/seed-dev.ts が見つかりません。"
    exit 1
  fi

  # tsx で直接実行（--tsconfig で教材用 exclude を無視）
  npx tsx "$seed_src"
  echo "  OK: seed-dev 完了"
}

# ─── 完了メッセージ ───────────────────────────────────────────────────────────

print_summary() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ✅ デバッグ環境のセットアップが完了しました"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  開発サーバーを起動するには:"
  echo "    npm run dev"
  echo ""
  echo "  ログインアカウント（パスワード共通: password123）:"
  echo "    admin@example.com   — 管理者"
  echo "    owner@example.com   — プロジェクトオーナー"
  echo "    member1@example.com — メンバー"
  echo "    member2@example.com — メンバー"
  echo "    viewer@example.com  — ビューワー"
  echo ""
  echo "  投入データ:"
  echo "    プロジェクト 3 件（進行中 2 件 / アーカイブ 1 件）"
  echo "    タスク 15 件（全ステータス・全優先度を網羅）"
  echo "    コメント 10 件"
  echo ""
}

# ─── メイン ──────────────────────────────────────────────────────────────────

main() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  完成品デバッグ環境 セットアップ"
  echo "  対象: ${PROJECT_DIR}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  check_prerequisites
  install_dependencies
  setup_env
  start_database
  setup_prisma
  run_seed_dev
  print_summary
}

main "$@"
