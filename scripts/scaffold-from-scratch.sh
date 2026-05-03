#!/usr/bin/env bash
set -euo pipefail

# このスクリプトは「空ディレクトリから教材を始める人」が最初に迷わんように、
# 必要な前提確認と最小限の土台づくりを 1 回で揃えるために置いている。

PROJECT_DIR="$(pwd)"

RUNTIME_DEPS=(
  @trpc/client
  @trpc/server
  @trpc/react-query
  @trpc/next
  @tanstack/react-query@^5
  prisma
  @prisma/client
  jose
  bcryptjs
  zod
  react-hook-form
  @hookform/resolvers
  class-variance-authority
  tailwind-merge
  clsx
  lucide-react
  recharts
  react-day-picker
  @radix-ui/react-slot
  @radix-ui/react-dialog
  @radix-ui/react-dropdown-menu
  @radix-ui/react-label
  @radix-ui/react-tabs
)

DEV_DEPS=(
  @biomejs/biome
  vitest
  @testing-library/react
  @testing-library/jest-dom
  jsdom
  @types/bcryptjs
)

print_error() {
  echo "エラー: $*" >&2
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    print_error "$2"
    exit 1
  fi
}

version_major() {
  echo "$1" | sed -E 's/^[^0-9]*([0-9]+).*/\1/'
}

check_node() {
  require_command "node" "Node.js が見つかりません。Node.js 20 以上を入れてから再実行してください: https://nodejs.org/"
  local major
  major="$(version_major "$(node -v)")"
  if [ "${major:-0}" -lt 20 ]; then
    print_error "Node.js $(node -v) は非対応です。Node.js 20 以上が必要です: https://nodejs.org/"
    exit 1
  fi
}

check_npm() {
  require_command "npm" "npm が見つかりません。Node.js 20 系と一緒に npm 10 以上を入れてください: https://nodejs.org/"
  local major
  major="$(version_major "$(npm -v)")"
  if [ "${major:-0}" -lt 10 ]; then
    print_error "npm $(npm -v) は非対応です。npm 10 以上が必要です。Node.js の更新後に再実行してください。"
    exit 1
  fi
}

check_postgres() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    return 0
  fi

  if command -v psql >/dev/null 2>&1 && command -v pg_isready >/dev/null 2>&1; then
    return 0
  fi

  print_error "PostgreSQL の利用手段が見つかりません。Docker Desktop を起動するか、ローカル PostgreSQL と psql/pg_isready を用意してください。"
  echo "例:" >&2
  echo "  - Docker Desktop: https://www.docker.com/products/docker-desktop/" >&2
  echo "  - PostgreSQL: https://www.postgresql.org/download/" >&2
  exit 1
}

ensure_empty_or_existing_next_app() {
  if [ -f "package.json" ] || [ -d "src/app" ]; then
    echo "既存の Next.js 土台があるため create-next-app はスキップします。"
    return 0
  fi

  # 教材との差分を減らすため、生成は公式の create-next-app に寄せて固定する。
  npx create-next-app@latest . \
    --typescript \
    --tailwind \
    --app \
    --src-dir \
    --import-alias "@/*" \
    --no-eslint \
    --use-npm
}

install_dependencies() {
  # 再実行時も npm 側で整合性を取れるので、個別判定より同じ宣言を入れ直す方が教材向き。
  npm install "${RUNTIME_DEPS[@]}"
  npm install -D "${DEV_DEPS[@]}"
}

remove_eslint_config() {
  rm -f eslint.config.js eslint.config.mjs eslint.config.cjs
  rm -f .eslintrc .eslintrc.js .eslintrc.cjs .eslintrc.json .eslintrc.yaml .eslintrc.yml
}

init_biome() {
  if [ -f "biome.json" ] || [ -f "biome.jsonc" ]; then
    echo "Biome 設定が既にあるため初期化はスキップします。"
    return 0
  fi

  # ESLint を外したあとに Biome を入れる流れを明示すると、学習者が役割分担を理解しやすい。
  npx @biomejs/biome@latest init
}

write_env_example() {
  if [ -f ".env.example" ]; then
    echo ".env.example は既にあるため上書きしません。"
    return 0
  fi

  cat <<'EOF' > .env.example
# ------------------------------------------------------------------------------
# 開発者情報 (seedコマンドで管理者ユーザーを作成する際に使用)
# ------------------------------------------------------------------------------
_DEVELOPER_EMAIL=
_DEVELOPER_FIRSTNAME=
_DEVELOPER_LASTNAME=

# ------------------------------------------------------------------------------
# Docker Compose
# ------------------------------------------------------------------------------
# ホスト側のポート設定 (競合する場合はここを変更してください)
_DOCKER_COMPOSE_HOST_PORT_DB=5432
_DOCKER_COMPOSE_HOST_PORT_BACKEND=3000
_DOCKER_COMPOSE_HOST_PORT_BACKEND_DEBUG=9229
_DOCKER_COMPOSE_HOST_PORT_SCHEMASPY=8080
_DOCKER_COMPOSE_HOST_PORT_TEST_DB=5433

# ------------------------------------------------------------------------------
# アプリケーション設定
# ------------------------------------------------------------------------------
# Prisma connection string
# ホストマシンから接続する場合のURL (マイグレーション等で使用)
# ポート番号は _DOCKER_COMPOSE_HOST_PORT_DB と合わせる必要があります
DATABASE_URL="postgresql://user:password@localhost:${_DOCKER_COMPOSE_HOST_PORT_DB}/taskapp?schema=public"

# Vitest が使うテスト用DB接続URL
# ポート番号は _DOCKER_COMPOSE_HOST_PORT_TEST_DB と合わせる必要があります
TEST_DATABASE_URL="postgresql://user:password@localhost:${_DOCKER_COMPOSE_HOST_PORT_TEST_DB}/taskapp_test?schema=public"

# JWT Authentication (32文字以上必須。本番では必ず変更してください)
JWT_SECRET="your-jwt-secret-key-32-chars-minimum-please-change"

# App
NODE_ENV="development"

# 本番URL (robots.txt/sitemapで使用。ローカル開発では空でOK)
# NEXT_PUBLIC_BASE_URL="https://your-app.vercel.app"

# ------------------------------------------------------------------------------
# Sentry エラーモニタリング (オプション)
# ------------------------------------------------------------------------------
# 設定しない場合は Sentry は無効化されます（ローカル開発・CI では通常不要）
# DSN は https://sentry.io のプロジェクト設定から取得してください
# NEXT_PUBLIC_SENTRY_DSN="https://xxxx@xxxx.ingest.sentry.io/xxxx"
# SENTRY_DSN="https://xxxx@xxxx.ingest.sentry.io/xxxx"
EOF
}

main() {
  echo "教材用の初期土台を ${PROJECT_DIR} に作成します。"

  check_node
  check_npm
  check_postgres

  ensure_empty_or_existing_next_app
  install_dependencies
  remove_eslint_config
  init_biome
  write_env_example

  echo
  echo "初期セットアップは完了やで。"
  echo "カリキュラムの Day 02 に進んで、次の実装を始めてください。"
}

main "$@"
