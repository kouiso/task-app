#!/usr/bin/env bash
# material-writing スキルの共通節を、task-app（正本）から他のリポジトリへ写す。
#
# 使い方:
#   bash scripts/sync-skill-common.sh            # 既定の同期先へ書き込む
#   bash scripts/sync-skill-common.sh --check    # 差分があれば exit 1（CI・pre-push 用）
#   bash scripts/sync-skill-common.sh [--check] /path/to/repo ...
#
# 写すもの:
#   - SKILL.md の `<!-- BEGIN common:material-writing v2 -->` 〜 `<!-- END ... -->`（両端の行を含む）
#   - hana652-tech-writing-pack/ と xamfonos-technical-writing-best-practices/（無改変の vendor）。
#     正本で git が追跡しているファイルだけを写す。__pycache__ のような追跡外のファイルまで写すと、
#     同期先の vendor-files.sh（sha256 一覧との照合）が落ちる。
#   - references/ATTRIBUTION.md（vendor の sha256 一覧を含む）
# 共通節の外（リポジトリの値・canary・リポジトリ固有の記録）には触れない。
#
# 既定の同期先は redmine-clone だけ。sns-app は writing-lint のゲート化を局長判断待ちにしているため、
# 承認されてから SKILL.md に印を入れ、ここの DEFAULT_TARGETS に足す。
set -euo pipefail

src_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
skill_rel=".claude/skills/material-writing"
begin='<!-- BEGIN common:material-writing v2 -->'
end='<!-- END common:material-writing v2 -->'
DEFAULT_TARGETS=("$src_root/../redmine-clone")
vendor_dirs=(hana652-tech-writing-pack xamfonos-technical-writing-best-practices)

check=0
targets=()
for arg in "$@"; do
  case "$arg" in
    --check) check=1 ;;
    *) targets+=("$arg") ;;
  esac
done
[ ${#targets[@]} -eq 0 ] && targets=("${DEFAULT_TARGETS[@]}")

# 印は BEGIN → END の順で1組だけ。END が先に来ると、書き込み側の awk が BEGIN から後ろを全部捨てる。
extract_common() {
  awk -v b="$begin" -v e="$end" '
    $0 == e && !inside { bad = 1 }
    $0 == b { if (inside) bad = 1; inside = 1; n_begin++ }
    inside { print }
    $0 == e { inside = 0; n_end++ }
    END { if (bad || inside || n_begin != 1 || n_end != 1) exit 3 }
  ' "$1"
}

# 正本の vendor のうち git が追跡しているファイル（vendor ディレクトリからの相対パス）。
tracked_vendor() {
  git -C "$src_root" -c core.quotepath=off ls-files -- "$skill_rel/$1" | sed "s#^$skill_rel/$1/##" | LC_ALL=C sort
}

git -C "$src_root" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || { echo "正本が git の作業ツリーではありません（追跡ファイルを決められない）: $src_root" >&2; exit 1; }
src_skill="$src_root/$skill_rel/SKILL.md"
src_common=$(extract_common "$src_skill") || { echo "正本の共通節の印が1組ではありません: $src_skill" >&2; exit 1; }
for d in "${vendor_dirs[@]}"; do
  if [ -z "$(tracked_vendor "$d")" ]; then
    echo "正本の vendor に git が追跡しているファイルがありません: $src_root/$skill_rel/$d" >&2
    exit 1
  fi
done

failed=0
for target in "${targets[@]}"; do
  target=$(cd -- "$target" && pwd)
  dst_dir="$target/$skill_rel"
  dst_skill="$dst_dir/SKILL.md"
  if [ ! -f "$dst_skill" ]; then
    echo "SKILL.md がありません（先にリポジトリの値の節と印を用意する）: $dst_skill" >&2
    failed=1
    continue
  fi
  dst_common=$(extract_common "$dst_skill") || { echo "共通節の印が1組ではありません: $dst_skill" >&2; failed=1; continue; }

  if [ "$check" -eq 1 ]; then
    if [ "$src_common" != "$dst_common" ]; then
      echo "共通節が正本と違います: $dst_skill" >&2
      diff <(printf '%s\n' "$src_common") <(printf '%s\n' "$dst_common") | head -20 >&2 || true
      failed=1
    fi
    for d in "${vendor_dirs[@]}"; do
      src_list=$(tracked_vendor "$d")
      dst_list=""
      if [ -d "$dst_dir/$d" ]; then
        dst_list=$(cd "$dst_dir/$d" && find . -type f | sed 's#^\./##' | LC_ALL=C sort)
      fi
      same=1
      if [ "$src_list" != "$dst_list" ]; then
        same=0
      else
        while IFS= read -r f; do
          cmp -s "$src_root/$skill_rel/$d/$f" "$dst_dir/$d/$f" || { same=0; break; }
        done <<< "$src_list"
      fi
      if [ "$same" -eq 0 ]; then
        echo "vendor が正本と違います: $dst_dir/$d" >&2
        failed=1
      fi
    done
    if ! cmp -s "$src_root/$skill_rel/references/ATTRIBUTION.md" "$dst_dir/references/ATTRIBUTION.md"; then
      echo "ATTRIBUTION.md が正本と違います: $dst_dir/references/ATTRIBUTION.md" >&2
      failed=1
    fi
    [ "$failed" -eq 0 ] && echo "OK: $target"
    continue
  fi

  tmp=$(mktemp)
  common_file=$(mktemp)
  printf '%s\n' "$src_common" > "$common_file"
  awk -v b="$begin" -v e="$end" -v cf="$common_file" '
    $0 == b { while ((getline line < cf) > 0) print line; skip = 1; next }
    $0 == e { skip = 0; next }
    !skip { print }
  ' "$dst_skill" > "$tmp"
  mv "$tmp" "$dst_skill"
  rm -f "$common_file"
  for d in "${vendor_dirs[@]}"; do
    src_list=$(tracked_vendor "$d")
    rm -rf "${dst_dir:?}/$d"
    while IFS= read -r f; do
      mkdir -p "$(dirname -- "$dst_dir/$d/$f")"
      cp "$src_root/$skill_rel/$d/$f" "$dst_dir/$d/$f"
    done <<< "$src_list"
  done
  mkdir -p "$dst_dir/references"
  cp "$src_root/$skill_rel/references/ATTRIBUTION.md" "$dst_dir/references/ATTRIBUTION.md"
  echo "synced: $target"
done
exit "$failed"
