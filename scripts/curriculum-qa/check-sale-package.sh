#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ZIP_PATH="${1:-${PROJECT_ROOT}/task-app-curriculum-v1.1.zip}"

if [ ! -f "${ZIP_PATH}" ]; then
  echo "販売用 ZIP が見つかりません: ${ZIP_PATH}" >&2
  exit 1
fi

ZIP_ENTRIES_FILE="$(mktemp)"
trap 'rm -f "${ZIP_ENTRIES_FILE}"' EXIT
unzip -Z1 "${ZIP_PATH}" > "${ZIP_ENTRIES_FILE}"

has_exact_entry() {
  local expected="$1"
  grep -Fxq "${expected}" "${ZIP_ENTRIES_FILE}"
}

has_entry_prefix() {
  local prefix="$1"
  grep -Fq "${prefix}" "${ZIP_ENTRIES_FILE}"
}

required_entries=(
  "task-app/README.md"
  "task-app/.env.example"
  "task-app/.mise.toml"
  "task-app/.node-version"
  "task-app/doc/SUPPORTED_ENVIRONMENTS.md"
  "task-app/material/30days-curriculum/"
  "task-app/scripts/scaffold-from-scratch.sh"
)

for entry in "${required_entries[@]}"; do
  if ! has_exact_entry "${entry}"; then
    echo "販売用 ZIP に必要なファイルがありません: ${entry}" >&2
    exit 1
  fi
done

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

required_support_files=(
  "_app-api-trpc/route.ts"
  "_app-base/layout.tsx"
  "_app-base/providers.tsx"
  "_app-components/project/project-card.tsx"
  "_app-components/project/project-detail-dialog.tsx"
  "_app-components/project/project-detail-view.tsx"
  "_app-components/project/project-dialog.tsx"
  "_app-components/task/status-badge.tsx"
  "_app-components/task/task-card.tsx"
  "_app-components/task/task-detail-dialog.tsx"
  "_app-components/task/task-dialog.tsx"
  "_app-components/task/time-log-dialog.tsx"
  "_constants/index.ts"
  "_constants/priority.ts"
  "_constants/project.ts"
  "_constants/query.ts"
  "_constants/roles.ts"
  "_constants/status.ts"
  "_docker/docker-compose.yml"
  "_lib-base/badge-variant.ts"
  "_lib-base/date.ts"
  "_lib-base/env.ts"
  "_lib-base/prisma.ts"
  "_lib-base/rate-limit.ts"
  "_lib-base/session.ts"
  "_lib-base/task-form.ts"
  "_lib-utils/utils.ts"
  "_prisma/prisma.config.ts"
  "_prisma/schema.prisma"
  "_seed/seed.ts"
  "_server-base/root.ts"
  "_server-base/trpc.ts"
  "_server-routers/_helpers/permission.ts"
  "_server-routers/_helpers/select.ts"
  "_server-routers/auth.ts"
  "_server-routers/comment.ts"
  "_server-routers/report.ts"
  "_server-routers/user.ts"
  "_trpc-base/query-client.ts"
  "_trpc-base/query-constants.ts"
  "_trpc-base/react.tsx"
  "_trpc-base/server.ts"
  "_ui-components/accordion.tsx"
  "_ui-components/alert-dialog.tsx"
  "_ui-components/alert.tsx"
  "_ui-components/avatar.tsx"
  "_ui-components/badge.tsx"
  "_ui-components/button.tsx"
  "_ui-components/calendar.tsx"
  "_ui-components/card.tsx"
  "_ui-components/checkbox.tsx"
  "_ui-components/delete-confirm-dialog.tsx"
  "_ui-components/dialog.tsx"
  "_ui-components/dropdown-menu.tsx"
  "_ui-components/form.tsx"
  "_ui-components/input.tsx"
  "_ui-components/label.tsx"
  "_ui-components/loading-spinner.tsx"
  "_ui-components/page-skeleton.tsx"
  "_ui-components/password-input.tsx"
  "_ui-components/popover.tsx"
  "_ui-components/progress.tsx"
  "_ui-components/select.tsx"
  "_ui-components/separator.tsx"
  "_ui-components/sheet.tsx"
  "_ui-components/skeleton.tsx"
  "_ui-components/switch.tsx"
  "_ui-components/table.tsx"
  "_ui-components/tabs.tsx"
  "_ui-components/textarea.tsx"
  "_ui-components/user-badges.tsx"
)

for relative_path in "${required_support_files[@]}"; do
  if ! has_exact_entry "task-app/scripts/${relative_path}"; then
    echo "販売用 ZIP に必須の scaffold 補助ファイルがありません: scripts/${relative_path}" >&2
    exit 1
  fi
done

# build-zip.sh が選んだ代表ファイルだけでなく、scaffold が利用できる補助ファイルを
# すべて照合する。配布処理に新しいディレクトリや除外条件を足したときも、
# 元ファイルと ZIP のずれをここで検出する。
for directory in "${support_directories[@]}"; do
  while IFS= read -r source_file; do
    relative_path="${source_file#"${PROJECT_ROOT}/scripts/"}"
    case "${relative_path}" in
      "_server-routers/project.ts"|"_server-routers/task.ts"|"_server-routers/search.ts") continue ;;
    esac
    if ! has_exact_entry "task-app/scripts/${relative_path}"; then
      echo "販売用 ZIP に scaffold 補助ファイルがありません: scripts/${relative_path}" >&2
      exit 1
    fi
  done < <(find "${PROJECT_ROOT}/scripts/${directory}" -type f | LC_ALL=C sort)
done

if ! LC_ALL=C grep -Eq '^task-app/material/30days-curriculum/day01_.*\.md$' "${ZIP_ENTRIES_FILE}"; then
  echo "販売用 ZIP に Day 01 の教材がありません。" >&2
  exit 1
fi

forbidden_entries=(
  "task-app/package.json"
  "task-app/src/"
  "task-app/prisma/"
  "task-app/node_modules/"
  "task-app/.git/"
  "task-app/scripts/_server-routers/project.ts"
  "task-app/scripts/_server-routers/task.ts"
  "task-app/scripts/_server-routers/search.ts"
)

for entry in "${forbidden_entries[@]}"; do
  if has_entry_prefix "${entry}"; then
    echo "販売用 ZIP に完成アプリのファイルが混入しています: ${entry}" >&2
    echo "この状態では scaffold-from-scratch.sh が create-next-app をスキップします。" >&2
    exit 1
  fi
done

echo "販売用 ZIP の初期状態を確認しました: 完成アプリ本体の混入なし"
