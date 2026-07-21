#!/usr/bin/env bash
set -euo pipefail

# このスクリプトは「空ディレクトリから教材を始める人」が最初に迷わんように、
# 必要な前提確認と最小限の土台づくりを 1 回で揃えるために置いている。

PROJECT_DIR="$(pwd)"

RUNTIME_DEPS=(
  next@15.5.18
  react@^18.3.1
  react-dom@^18.3.1
  @trpc/client@^11.8.0
  @trpc/server@^11.8.0
  @trpc/react-query@^11.8.0
  @trpc/next@^11.8.0
  @tanstack/react-query@^5.59.0
  prisma@^6.16.2
  @prisma/client@^6.16.2
  jose@^6.2.1
  bcryptjs@^2.4.3
  zod@^3.25.76
  react-hook-form@^7.71.1
  @hookform/resolvers@^3.10.0
  class-variance-authority@^0.7.1
  tailwind-merge@^3.4.0
  clsx@^2.1.1
  lucide-react@^0.563.0
  recharts@^3.2.1
  react-day-picker@^9.13.0
  @radix-ui/react-slot@^1.2.4
  @radix-ui/react-dialog@^1.1.15
  @radix-ui/react-dropdown-menu@^2.1.16
  @radix-ui/react-label@^2.1.8
  @radix-ui/react-tabs@^1.1.13
  tailwindcss-animate@^1.0.7
  date-fns@^4.1.0
  react-hot-toast@^2.4.1
  superjson@^2.2.2
  server-only@^0.0.1
  react-is@^19.2.4
  @radix-ui/react-accordion@^1.2.12
  @radix-ui/react-alert-dialog@^1.1.15
  @radix-ui/react-avatar@^1.1.11
  @radix-ui/react-checkbox@^1.3.3
  @radix-ui/react-popover@^1.1.15
  @radix-ui/react-select@^2.2.6
  @radix-ui/react-separator@^1.1.8
  @radix-ui/react-switch@^1.2.6
)

DEV_DEPS=(
  @biomejs/biome@^2.4.15
  vitest@^3.2.4
  @vitest/coverage-v8@^3.2.4
  @testing-library/react@^16.2.0
  @testing-library/jest-dom@^6.6.3
  jsdom@^26.0.0
  @types/bcryptjs@^2.4.6
  @types/node@^22
  @types/react@^18.3.12
  @types/react-dom@^18.3.1
  tsx@^4.19.0
  dotenv@^17.4.2
  typescript@^5.6.3
  tailwindcss@^4.1.18
  @tailwindcss/postcss@^4.1.18
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
  require_command "node" "Node.js が見つかりません。Node.js 22 以上を入れてから再実行してください: https://nodejs.org/"
  local node_version
  if ! node_version="$(node -v 2>&1)"; then
    print_error "Node.js の確認に失敗しました: ${node_version}"
    if [[ "$node_version" == *"not trusted"* ]]; then
      print_error "mise を使っている場合は、このフォルダで 'mise trust' と 'mise install' を実行してください。"
    fi
    exit 1
  fi
  local major
  major="$(version_major "$node_version")"
  if [ "${major:-0}" -lt 22 ]; then
    print_error "Node.js ${node_version} は非対応です。Node.js 22 以上が必要です: https://nodejs.org/"
    exit 1
  fi
}

check_npm() {
  require_command "npm" "npm が見つかりません。Node.js 22 系と一緒に npm 10 以上を入れてください: https://nodejs.org/"
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

  print_error "PostgreSQL の利用手段が見つかりません。Docker を起動するか、ローカル PostgreSQL と psql/pg_isready を用意してください。"
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
  # README.md / material / scripts などの配布物を一時退避して実行後に戻す。
  local stash_dir
  stash_dir="$(mktemp -d)"
  for item in README.md .env .env.example material scripts "$(basename "$0")" _ui-components _lib-utils _lib-base _constants _trpc-base _server-routers _server-base _app-api-trpc _prisma _docker _seed _app-components; do
    if [ -e "$item" ]; then
      mv "$item" "$stash_dir/"
    fi
  done

  # create-next-app はカレントディレクトリ名を npm package name として検証する。
  # 配布 ZIP を置いた親フォルダに大文字が含まれても詰まらないよう、
  # 常に安全な小文字名の一時ディレクトリで生成してから中身を戻す。
  local create_dir
  create_dir="/tmp/task-app-scaffold-$$-$(date +%s)"
  mkdir -p "$create_dir"

  # 教材との差分を減らすため、Next.js 15 系に固定する。
  npx create-next-app@15.5.18 "$create_dir" \
    --typescript \
    --tailwind \
    --app \
    --src-dir \
    --import-alias "@/*" \
    --no-eslint \
    --use-npm \
    --yes

  shopt -s dotglob nullglob
  for item in "$create_dir"/*; do
    [ -e "$item" ] && mv "$item" .
  done
  shopt -u dotglob nullglob
  rm -rf "$create_dir"

  # 退避した配布物を元の位置に戻す
  shopt -s dotglob nullglob
  for item in "$stash_dir"/*; do
    [ -e "$item" ] && mv "$item" .
  done
  shopt -u dotglob nullglob
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

  # 教材内のコード断片と同じスタイルでチェックできるよう、配布用設定を固定する。
  cat <<'EOF' > biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.3.15/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  },
  "linter": {
    "enabled": true,
    "includes": [
      "**",
      "!**/node_modules",
      "!**/dist",
      "!**/.next",
      "!**/scripts",
      "!**/scripts/**",
      "!**/material",
      "!**/material/**",
      "!**/prisma/migrations"
    ],
    "rules": {
      "recommended": true,
      "complexity": {
        "noBannedTypes": "error",
        "noUselessConstructor": "error",
        "useArrowFunction": "error",
        "noStaticOnlyClass": "warn",
        "noForEach": "warn",
        "useLiteralKeys": "off"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "useConst": "error",
        "useTemplate": "error",
        "noNonNullAssertion": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noArrayIndexKey": "warn",
        "noDebugger": "error",
        "noConsole": {
          "level": "error",
          "options": {
            "allow": ["warn", "error"]
          }
        }
      }
    }
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 100,
    "attributePosition": "auto",
    "includes": [
      "**",
      "!**/node_modules",
      "!**/dist",
      "!**/.next",
      "!**/scripts",
      "!**/scripts/**",
      "!**/material",
      "!**/material/**",
      "!**/prisma/migrations"
    ]
  },
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  },
  "javascript": {
    "formatter": {
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingCommas": "all",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false,
      "quoteStyle": "single"
    }
  }
}
EOF
  echo "Biome 設定を作成しました。"
}

configure_package_json() {
  npm pkg set \
    name="task-app" \
    scripts.dev="next dev" \
    scripts.build="prisma generate && next build" \
    scripts.start="next start" \
    scripts.lint="biome check src prisma.config.ts next.config.ts package.json tsconfig.json" \
    scripts.lint:fix="biome check --write src prisma.config.ts next.config.ts package.json tsconfig.json" \
    scripts.fix="biome check --write src prisma.config.ts next.config.ts package.json tsconfig.json" \
    scripts.format="biome format --write src prisma.config.ts next.config.ts package.json tsconfig.json" \
    scripts.type-check="next typegen && tsc --noEmit" \
    scripts.db:generate="prisma generate" \
    scripts.db:push="prisma db push" \
    scripts.db:migrate="prisma migrate dev" \
    scripts.db:seed="tsx src/command/seed.ts" \
    scripts.test="vitest run"
}

configure_tsconfig() {
  node <<'EOF'
const fs = require('node:fs');
const path = 'tsconfig.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
const excludes = new Set(config.exclude ?? []);
for (const entry of [
  'node_modules',
  'scripts',
  'material',
  'src/server',
  'src/trpc',
  'src/component/project',
  'src/component/task',
  'src/lib/task-form.ts',
]) {
  excludes.add(entry);
}
config.exclude = [...excludes];
fs.writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
EOF
}

format_scaffold_files() {
  npx biome check --write src prisma.config.ts next.config.ts package.json tsconfig.json >/dev/null
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
_DOCKER_COMPOSE_HOST_PORT_DB=25532
_DOCKER_COMPOSE_HOST_PORT_BACKEND=3000
_DOCKER_COMPOSE_HOST_PORT_BACKEND_DEBUG=9229
_DOCKER_COMPOSE_HOST_PORT_SCHEMASPY=8080
_DOCKER_COMPOSE_HOST_PORT_TEST_DB=25533

# ------------------------------------------------------------------------------
# アプリケーション設定
# ------------------------------------------------------------------------------
# Prisma connection string
# ホストマシンから接続する場合のURL (マイグレーション等で使用)
# ポート番号は _DOCKER_COMPOSE_HOST_PORT_DB と合わせる必要があります
DATABASE_URL="postgresql://user:password@localhost:25532/taskapp?schema=public"

# Vitest が使うテスト用DB接続URL
# ポート番号は _DOCKER_COMPOSE_HOST_PORT_TEST_DB と合わせる必要があります
TEST_DATABASE_URL="postgresql://user:password@localhost:25533/taskapp_test?schema=public"

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

  # server-routers: tRPC ルーター（Day 07 で auth を確認した後、各 Day で root.ts に登録して有効化する）
  # project.ts のみ配布しない。Day 09〜12 で受講生が自分の手で1から書く対象のため
  # (他ルーターは D1リファクタが済むまで完成品のまま配布を継続する暫定措置)。
  if [ -d "${script_dir}/_server-routers" ]; then
    mkdir -p src/server/api/routers/_helpers
    for f in "${script_dir}/_server-routers"/*.ts; do
      [ "$(basename "$f")" = "project.ts" ] && continue
      cp "$f" src/server/api/routers/
    done
    cp "${script_dir}/_server-routers/_helpers"/*.ts src/server/api/routers/_helpers/ 2>/dev/null
    echo "tRPC ルーターを src/server/api/routers/ に配置しました（Day 07 以降で有効化。project.ts は Day 09〜12 で自分で書きます）。"
  fi

}

copy_server_base() {
  local script_dir
  script_dir="$(cd "$(dirname "$0")" && pwd)"
  local server_base_src="${script_dir}/_server-base"
  local app_api_src="${script_dir}/_app-api-trpc"

  if [ -d "$server_base_src" ]; then
    mkdir -p src/server/api
    cp "${server_base_src}"/*.ts src/server/api/
    echo "tRPC サーバー基盤を src/server/api/ に配置しました。"
  fi

  if [ -f "${app_api_src}/route.ts" ]; then
    mkdir -p "src/app/api/trpc/[trpc]"
    cp "${app_api_src}/route.ts" "src/app/api/trpc/[trpc]/route.ts"
    echo "tRPC HTTP ハンドラを src/app/api/trpc/[trpc]/ に配置しました。"
  fi
}

copy_app_base() {
  local script_dir
  script_dir="$(cd "$(dirname "$0")" && pwd)"
  local app_base_src="${script_dir}/_app-base"

  if [ ! -d "$app_base_src" ]; then
    return 0
  fi

  cp "${app_base_src}/providers.tsx" src/app/providers.tsx 2>/dev/null
  cp "${app_base_src}/layout.tsx" src/app/layout.tsx 2>/dev/null
  echo "アプリ共通 Provider と layout を配置しました。"
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

compose() {
  if docker compose "$@"; then
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
    return $?
  fi

  return 1
}

env_value() {
  local key="$1"
  local default_value="$2"

  if [ -f ".env" ]; then
    local value
    value="$(grep -E "^${key}=" .env | tail -n 1 | cut -d= -f2- | tr -d '"' || true)"
    if [ -n "$value" ]; then
      echo "$value"
      return 0
    fi
  fi

  echo "$default_value"
}

postgres_ready_on_port() {
  local port="$1"
  local database="$2"
  pg_isready -h localhost -p "$port" -U user -d "$database" >/dev/null 2>&1
}

setup_database() {
  # Docker の有無に関係なく、Next.js build と Prisma generate が参照する
  # 必須環境変数を Day 01 の時点で用意する。
  if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    echo ".env.example を .env にコピーしました。"
  fi

  # Docker が使える場合のみ DB を自動セットアップ
  if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
    echo "Docker が使えないため、DB 起動はスキップします。"
    echo "ローカル PostgreSQL を使う場合は .env の DATABASE_URL を合わせてください。"
    if [ -f "prisma/schema.prisma" ]; then
      npx prisma generate
    fi
    return 0
  fi

  if [ ! -f "docker-compose.yml" ]; then
    echo "docker-compose.yml がありません。DB セットアップをスキップします。"
    return 0
  fi

  echo "Docker で PostgreSQL を起動しています..."
  local app_db_port
  app_db_port="$(env_value "_DOCKER_COMPOSE_HOST_PORT_DB" "25532")"
  if postgres_ready_on_port "$app_db_port" "taskapp"; then
    echo "localhost:${app_db_port} の PostgreSQL が既に応答しているため、アプリ用 DB 起動はスキップします。"
  elif ! compose up -d db; then
    print_error "アプリ用 DB の起動に失敗しました。Docker の状態と 25532 番ポートの競合を確認してください。"
    exit 1
  fi

  local test_db_log
  test_db_log="$(mktemp)"
  local test_db_port
  test_db_port="$(env_value "_DOCKER_COMPOSE_HOST_PORT_TEST_DB" "25533")"
  if postgres_ready_on_port "$test_db_port" "taskapp_test"; then
    echo "localhost:${test_db_port} の PostgreSQL が既に応答しているため、テスト用 DB 起動はスキップします。"
  elif ! compose up -d test-db >"$test_db_log" 2>&1; then
    print_error "テスト用 DB の起動に失敗しました。${test_db_port} 番ポートが使用中の可能性があります。"
    echo "Day 01 のアプリ起動は続行できますが、後でテストを実行する前に .env の _DOCKER_COMPOSE_HOST_PORT_TEST_DB を空いているポートへ変更してください。" >&2
    echo "Docker の詳細:" >&2
    cat "$test_db_log" >&2
  fi
  rm -f "$test_db_log"

  # DB の準備ができるまで少し待つ
  echo "DB の起動を待っています..."
  for _ in {1..30}; do
    if postgres_ready_on_port "$app_db_port" "taskapp"; then
      break
    fi
    sleep 1
  done

  # Prisma スキーマ反映 + クライアント生成
  if [ -f "prisma/schema.prisma" ]; then
    echo "Prisma スキーマをDBに反映しています..."
    npx prisma db push
    npx prisma generate
    if [ -f "src/command/seed.ts" ]; then
      echo "シードデータを投入しています..."
      npm run db:seed
    fi
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
  configure_package_json
  configure_tsconfig
  remove_eslint_config
  init_biome
  write_env_example
  copy_ui_components
  copy_lib_utils
  copy_scaffold_support
  copy_server_base
  copy_app_base
  copy_app_components
  copy_prisma_files
  format_scaffold_files
  setup_database

  echo
  echo "初期セットアップは完了しました。"
  echo "カリキュラムの Day 01 の続きを進めてください。"
}

main "$@"
