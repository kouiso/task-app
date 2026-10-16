#!/usr/bin/env bash
set -euo pipefail
entry_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd "$entry_dir/../.." && pwd)
phase=${1:-full}
case "$phase" in
  zip-env|zip-install|zip-prisma|zip-type|zip-build-script|zip-extract) ;;
  *) cd "$repo_root" ;;
esac
run_phases() {
  local next
  for next in "$@"; do bash "$entry_dir/run.sh" "$next"; done
}
case "$phase" in
  fast) run_phases build lint type-check unit ;;
  performance)
    export DATABASE_URL='postgresql://user:password@localhost:5432/taskapp?schema=public'
    export JWT_SECRET='perf-ci-jwt-secret-32-chars-minimum'
    export SKIP_ENV_VALIDATION=true NEXT_PUBLIC_BASE_URL=http://localhost:3000
    run_phases perf-lint perf-type perf-build perf-lighthouse
    ;;
  material) run_phases sale-package vendor-submodule vendor-files material-text material-quality material-images material-imports material-corpus ;;
  snapshot)
    : "${RUNNER_TEMP:?Set RUNNER_TEMP to an isolated writable evidence directory}"
    run_phases snapshot-test snapshot-db snapshot-clean snapshot-build snapshot-coverage snapshot-no-skip ;;
  pdf)
    : "${RUNNER_TEMP:?Set RUNNER_TEMP to an isolated writable evidence directory}"
    : "${PDF_BOOK_BUILD_LOG_DIR:?Set PDF_BOOK_BUILD_LOG_DIR to an isolated writable log directory}"
    export PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-"$repo_root/.pw-browsers"}
    export PDF_BOOK_LINK_MAP=${PDF_BOOK_LINK_MAP:-"$repo_root/scripts/pdf-book/pdf-link-map.json"}
    export CURRICULUM_QA_REQUIRE_BROWSER=1
    run_phases pdf-browser-test pdf-full-build pdf-local-verify ;;
  zip)
    run_phases zip-build zip-exists zip-contents
    zip_temp=$(mktemp -d)
    trap 'rm -rf -- "$zip_temp"' EXIT
    cp dist/task-app.zip "$zip_temp/task-app.zip"
    cd "$zip_temp"
    bash "$entry_dir/run.sh" zip-extract
    cd extracted
    run_phases zip-env zip-install zip-prisma zip-type zip-build-script
    ;;
  full)
    # 選別せず全ゲートへ入る。依存や原稿が欠けた作業ツリーを成功扱いにしない。
    for required in node_modules .env Makefile material/30days-curriculum; do
      if [ ! -e "$required" ]; then echo "Missing local CI prerequisite: $required" >&2; exit 1; fi
    done
    : "${RUNNER_TEMP:?Set RUNNER_TEMP to an isolated writable evidence directory}"
    : "${PDF_BOOK_BUILD_LOG_DIR:?Set PDF_BOOK_BUILD_LOG_DIR to an isolated writable log directory}"
    command -v license-checker >/dev/null
    run_phases fast naming audit license semgrep secrets rules material pdf snapshot zip performance
    ;;
  license)
    deny=${DISALLOWED_LICENSES-'GPL;GPL-2.0;GPL-3.0;LGPL;LGPL-3.0;AGPL-3.0;SSPL;EUPL;CDDL-1.0;EPL-1.0;OPL-1.0'}
    license-checker --production --json --failOn "$deny"
    ;;
  secrets|semgrep|rules|perf-lint|perf-type|perf-build|perf-lighthouse|license-changes|build|lint|type-check|unit|naming|audit|sale-package|vendor-submodule|vendor-files|material-text|material-quality|material-images|material-imports|material-corpus|pdf-local-verify|pdf-selftest|pdf-browser-test|pdf-build|pdf-verify|pdf-full-build|pdf-full-verify|snapshot-test|snapshot-db|snapshot-clean|snapshot-build|snapshot-coverage|snapshot-no-skip|zip-build|zip-exists|zip-contents|zip-extract|zip-env|zip-install|zip-prisma|zip-type|zip-build-script)
    # 子プロセスも -e / pipefail を持つ。末尾の echo で失敗を隠さない。
    bash -eo pipefail "$entry_dir/phase/$phase.sh"
    ;;
  *) echo "Unknown CI phase: $phase" >&2; exit 2 ;;
esac
