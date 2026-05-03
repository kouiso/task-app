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
  prisma@^6
  @prisma/client@^6
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
  tailwindcss-animate
  date-fns
  react-hot-toast
  superjson
  server-only
  react-is
  @radix-ui/react-accordion
  @radix-ui/react-alert-dialog
  @radix-ui/react-avatar
  @radix-ui/react-checkbox
  @radix-ui/react-popover
  @radix-ui/react-select
  @radix-ui/react-separator
  @radix-ui/react-switch
)

DEV_DEPS=(
  @biomejs/biome
  vitest
  @testing-library/react
  @testing-library/jest-dom
  jsdom
  @types/bcryptjs
  tsx
  dotenv
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

  # create-next-app は空ディレクトリを要求するため、
  # 教材配布物（スクリプト自身 + _ui-components/ + _lib-utils/）を一時退避して実行後に戻す。
  local stash_dir
  stash_dir="$(mktemp -d)"
  for item in "$(basename "$0")" _src-full _ui-components _lib-utils _server _lib-core _lib-base _constants _trpc-base _server-routers _prisma _docker _seed _app-components; do
    if [ -e "$item" ]; then
      mv "$item" "$stash_dir/"
    fi
  done

  # 教材との差分を減らすため、生成は公式の create-next-app に寄せて固定する。
  npx create-next-app@latest . \
    --typescript \
    --tailwind \
    --app \
    --src-dir \
    --import-alias "@/*" \
    --no-eslint \
    --use-npm

  # 退避した配布物を元の位置に戻す
  for item in "$stash_dir"/*; do
    [ -e "$item" ] && mv "$item" .
  done
  rmdir "$stash_dir" 2>/dev/null || true
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

copy_ui_components() {
  # 教材配布物の _ui-components/ から shadcn/ui コンポーネントをコピーする。
  # scaffold と同じディレクトリに _ui-components/ が置かれている前提。
  local script_dir
  script_dir="$(cd "$(dirname "$0")" && pwd)"
  local ui_src="${script_dir}/_ui-components"

  if [ ! -d "$ui_src" ]; then
    echo "_ui-components/ が見つかりません。shadcn/ui コンポーネントは手動で追加してください。"
    return 0
  fi

  mkdir -p src/component/ui
  cp -r "$ui_src"/* src/component/ui/
  echo "shadcn/ui コンポーネントを src/component/ui/ にコピーしました。"
}

copy_lib_utils() {
  # cn() ユーティリティを配置する。shadcn/ui コンポーネントが依存する。
  local script_dir
  script_dir="$(cd "$(dirname "$0")" && pwd)"
  local utils_src="${script_dir}/_lib-utils"

  if [ ! -d "$utils_src" ]; then
    echo "_lib-utils/ が見つかりません。lib/utils.ts は手動で追加してください。"
    return 0
  fi

  mkdir -p src/lib
  cp -r "$utils_src"/* src/lib/
  echo "lib ユーティリティを src/lib/ にコピーしました。"
}

copy_scaffold_support() {
  local script_dir
  script_dir="$(cd "$(dirname "$0")" && pwd)"

  # lib-base: env.ts, prisma.ts（DB接続に必要な最小限）
  if [ -d "${script_dir}/_lib-base" ]; then
    mkdir -p src/lib
    cp "${script_dir}/_lib-base"/*.ts src/lib/
    echo "lib ベースファイル (env.ts, prisma.ts) を配置しました。"
  fi

  # constants: roles, status, priority 等
  if [ -d "${script_dir}/_constants" ]; then
    mkdir -p src/lib/constant
    cp "${script_dir}/_constants"/*.ts src/lib/constant/
    echo "定数ファイルを src/lib/constant/ に配置しました。"
  fi

  # trpc-base: クライアント設定のみ（サーバーは教材で書く）
  if [ -d "${script_dir}/_trpc-base" ]; then
    mkdir -p src/trpc
    cp "${script_dir}/_trpc-base"/* src/trpc/
    echo "tRPC クライアント設定を src/trpc/ に配置しました。"
  fi

  # server-routers: tRPC ルーター（Day 07 で auth を自作した後、各 Day で root.ts に登録して有効化する）
  if [ -d "${script_dir}/_server-routers" ]; then
    mkdir -p src/server/api/routers/_helpers
    cp "${script_dir}/_server-routers"/*.ts src/server/api/routers/
    cp "${script_dir}/_server-routers/_helpers"/*.ts src/server/api/routers/_helpers/ 2>/dev/null
    echo "tRPC ルーターを src/server/api/routers/ に配置しました（Day 07 以降で有効化）。"
  fi
}

copy_app_components() {
  # カリキュラムで「既存」と明示されている実装済みコンポーネントを配置する。
  # 学習者は自分では作らず、既存ファイルとして読み取り・利用する。
  local script_dir
  script_dir="$(cd "$(dirname "$0")" && pwd)"
  local comp_src="${script_dir}/_app-components"

  if [ ! -d "$comp_src" ]; then
    echo "_app-components/ が見つかりません。既存コンポーネントは手動で追加してください。"
    return 0
  fi

  # project コンポーネント（Day 09/10/11 で既存扱い）
  if [ -d "${comp_src}/project" ]; then
    mkdir -p src/component/project
    cp "${comp_src}/project"/*.tsx src/component/project/
    echo "project コンポーネントを src/component/project/ に配置しました。"
  fi

  # task コンポーネント（Day 13 で既存扱い）
  if [ -d "${comp_src}/task" ]; then
    mkdir -p src/component/task
    cp "${comp_src}/task"/*.tsx src/component/task/
    echo "task コンポーネントを src/component/task/ に配置しました。"
  fi
}


copy_prisma_files() {
  local script_dir
  script_dir="$(cd "$(dirname "$0")" && pwd)"

  # schema.prisma + prisma.config.ts
  if [ -d "${script_dir}/_prisma" ]; then
    mkdir -p prisma
    cp "${script_dir}/_prisma/schema.prisma" prisma/ 2>/dev/null
    cp "${script_dir}/_prisma/prisma.config.ts" . 2>/dev/null
    echo "Prisma スキーマを配置しました。"
  fi

  # docker-compose.yml
  if [ -d "${script_dir}/_docker" ]; then
    cp "${script_dir}/_docker/docker-compose.yml" . 2>/dev/null
    echo "docker-compose.yml を配置しました。"
  fi

  # seed コマンド
  if [ -d "${script_dir}/_seed" ]; then
    mkdir -p src/command
    cp "${script_dir}/_seed/seed.ts" src/command/ 2>/dev/null
    echo "seed コマンドを配置しました。"
  fi
}

setup_database() {
  # Docker が使える場合のみ DB を自動セットアップ
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker が見つかりません。DB は手動でセットアップしてください。"
    return 0
  fi

  if [ ! -f "docker-compose.yml" ]; then
    echo "docker-compose.yml がありません。DB セットアップをスキップします。"
    return 0
  fi

  echo "Docker で PostgreSQL を起動しています..."
  docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null

  # DB の準備ができるまで少し待つ
  echo "DB の起動を待っています..."
  sleep 3

  # .env がなければ .env.example からコピー
  if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    echo ".env.example を .env にコピーしました。"
  fi

  # Prisma マイグレーション + クライアント生成
  if [ -f "prisma/schema.prisma" ]; then
    echo "Prisma マイグレーションを実行しています..."
    npx prisma migrate dev --name init 2>/dev/null || npx prisma db push 2>/dev/null
    npx prisma generate 2>/dev/null
    echo "DB セットアップが完了しました。"
  fi
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
  copy_ui_components
  copy_lib_utils
  copy_scaffold_support
  copy_app_components
  copy_prisma_files
  setup_database

  echo
  echo "初期セットアップは完了やで。"
  echo "カリキュラムの Day 02 に進んで、次の実装を始めてください。"
}

main "$@"
