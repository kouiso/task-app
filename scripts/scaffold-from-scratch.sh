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
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/task_app"
JWT_SECRET="replace-with-a-secure-secret"
NEXTAUTH_URL="http://localhost:3000"
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
