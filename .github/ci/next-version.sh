#!/usr/bin/env bash
# deploy-r2.yml の version ジョブが使う、次のリリース版の計算。
# 前のタグ v<X.Y.Z> からのコミットを Conventional Commits の決まりで読み、
# major / minor / patch のどれを上げるかを決めて `version=<X.Y.Z>` を出す。
#
# 破壊的変更の印は2つだけ（https://www.conventionalcommits.org/ja/v1.0.0/）:
# - 件名の `type!:` / `type(scope)!:`
# - 本文の行頭の脚注 `BREAKING CHANGE: ` / `BREAKING-CHANGE: `
# 本文の途中に出てくる「BREAKING CHANGE」という語や、本文の行頭の `fix!:` は印ではない。
# R2 の置き場は版ごとに不変で上書きしないので、誤って major を作ると戻せない。
set -euo pipefail

out="${GITHUB_OUTPUT:-/dev/stdout}"

last=$(git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n1)
if [ -z "$last" ]; then
  # タグが1本も無い初回は、リポジトリが宣言する版をそのまま出す
  # （bump は 2 回目以降に効く。ここで足すと package.json の版より 1 つ先にずれる）
  ver=$(grep -m1 '"version"' package.json | sed 's/[^0-9.]//g')
  echo "初回リリース: package.json の版 ${ver} をそのまま使います" >&2
  echo "version=${ver}" >> "$out"
  exit 0
fi

base="${last#v}"
range="${last}..HEAD"
bump=patch
# 件名と本文は別々に取る。%s%n%b で混ぜると、本文の行を件名の決まりで読んでしまう
if git log "$range" --format='%s' | grep -qE '^[a-zA-Z]+(\([^)]*\))?!:' \
  || git log "$range" --format='%b' | grep -qE '^BREAKING[ -]CHANGE: '; then
  bump=major
elif git log "$range" --format='%s' | grep -qE '^feat(\([^)]*\))?!?:'; then
  bump=minor
fi

IFS=. read -r maj min pat <<< "$base"
case "$bump" in
  major) maj=$((maj + 1)); min=0; pat=0 ;;
  minor) min=$((min + 1)); pat=0 ;;
  patch) pat=$((pat + 1)) ;;
esac
ver="${maj}.${min}.${pat}"
echo "前の版 ${last} → ${ver}（${bump}、対象: ${range}）" >&2
echo "version=${ver}" >> "$out"
