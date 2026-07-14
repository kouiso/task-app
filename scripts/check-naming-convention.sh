#!/usr/bin/env bash
# check-naming-convention.sh — ファイル・フォルダ名のkebab-case規約を検証する
# 使い方: bash scripts/check-naming-convention.sh
#
# 規約: 英語のファイル・フォルダ名は小文字単数形ケバブケース(kebab-case)。
# 例外(ツール/エコシステムの慣習で名前が固定されているもの):
#   - Python: snake_case (PEP 8)
#   - Prisma migration: <timestamp>_<snake_case> (Prisma生成)
#   - GitHub/OSS慣習の固定ファイル名: README.md, LICENSE, CODEOWERS, ARCHITECTURE.md 等
#   - ツール固有の固定ファイル名: Makefile, SKILL.md, migration_lock.toml,
#     pull_request_template.md (GitHub認識パス) 等
#   - 日本語ファイル名(material/**, *.pdf等の日本語コンテンツ)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

violations=0

is_exempt() {
  local path="$1"
  local basename
  basename="$(basename "$path")"

  # 日本語(非ASCII)を含むパスは対象外(コンテンツの言語選択)
  # grep -P はBSD grep(macOS)非対応のため、python3で移植性のある非ASCII判定を行う
  if ! python3 -c "import sys; sys.exit(0 if sys.argv[1].isascii() else 1)" "$basename" 2>/dev/null; then
    return 0
  fi

  # material/ 配下(教材コンテンツ)は対象外
  case "$path" in
    material/*) return 0 ;;
    edu-creator/*) return 0 ;;
  esac

  # Python: snake_case許容(PEP 8)
  case "$basename" in
    *.py) return 0 ;;
  esac

  # Prisma migration: <timestamp>_<snake_case> はPrisma生成物
  case "$path" in
    prisma/migrations/*) return 0 ;;
  esac

  # patch-package生成物: <pkg>+<version>.patch (@scope含む)
  case "$path" in
    patches/*.patch) return 0 ;;
  esac

  # 既存レガシーの猶予リスト(全リポジトリで広く参照されており改名の影響範囲が大きいため
  # 現状維持。新規シェルスクリプトはkebab-case必須)
  case "$path" in
    scripts/curriculum-qa/check_quality.sh) return 0 ;;
    scripts/generate_pdf.sh) return 0 ;;
    scripts/loop-runner/00_orchestrator.sh) return 0 ;;
    scripts/loop-runner/snapshot_day.sh) return 0 ;;
  esac

  # GitHub/OSS慣習の固定ファイル名(拡張子問わず完全一致)
  case "$basename" in
    README.md|LICENSE|LICENSE_INVENTORY.md|CODEOWNERS|AGENTS.md|CLAUDE.md|SKILL.md|Makefile|Dockerfile) return 0 ;;
    ARCHITECTURE.md|DATABASE_MIGRATIONS.md|DATA_INTEGRITY.md|DEPENDENCY_POLICY.md) return 0 ;;
    DEPLOYMENT.md|INCIDENT_RESPONSE.md|LP_MVP.md|METRICS.md|RUNBOOK.md) return 0 ;;
    SUPPORTED_ENVIRONMENTS.md|SUPPORT_POLICY.md|THIRD_PARTY_LICENSES.md) return 0 ;;
    UX_STATE_CATALOG.md|VERIFICATION_GUIDE.md|ZIP_CONTENTS.md|ACCESSIBILITY.md) return 0 ;;
    ATTRIBUTION.md|pull_request_template.md|migration_lock.toml) return 0 ;;
    CODE_OF_CONDUCT.md|CONTRIBUTING.md|SECURITY.md|CHANGELOG.md) return 0 ;;
  esac

  # __test, _xxx プレフィックス(scripts/のscaffold用マーカー・vitestの慣習)は
  # プレフィックス自体は対象外、プレフィックス以降がkebab-caseかは別途チェックする
  return 1
}

strip_known_prefix() {
  local name="$1"
  # scripts/ 配下の "_" scaffoldマーカー、テストの "__test" は接頭辞のみ除去
  name="${name#_}"
  echo "$name"
}

is_kebab_case() {
  local name="$1"
  # 拡張子を分離(最初のドットまでを本体とする。複数拡張子は許容)
  local stem="${name%%.*}"
  stem="$(strip_known_prefix "$stem")"
  [ -z "$stem" ] && return 0
  # 小文字英数字とハイフンのみ、大文字・アンダースコア・スペース禁止
  echo "$stem" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$'
}

while IFS= read -r path; do
  basename="$(basename "$path")"
  [ "$basename" = "__test" ] && continue
  is_exempt "$path" && continue
  if ! is_kebab_case "$basename"; then
    echo "::error file=$path::kebab-case違反: '$basename' は英語小文字単数形ケバブケースではありません"
    violations=$((violations + 1))
  fi
done < <(git -c core.quotepath=false ls-files)

if [ "$violations" -gt 0 ]; then
  echo ""
  echo "❌ kebab-case命名規約違反: ${violations}件"
  echo "AGENTS.md の「ファイル・フォルダ命名規約」を参照してください。"
  exit 1
fi

echo "✅ kebab-case命名規約チェック: 違反なし"
