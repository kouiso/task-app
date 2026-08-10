#!/usr/bin/env bash
# Devin CLI を CI から非対話で回し、レビュー結果を DEVIN_OUTPUT_FILE に書き出す。
# Codex から置き換えた本体。呼び出し側は DEVIN_PROMPT を渡すだけでええ。
set -euo pipefail

: "${DEVIN_PROMPT:?DEVIN_PROMPT is required}"
OUTPUT_FILE="${DEVIN_OUTPUT_FILE:-devin-review.md}"
MODEL="${DEVIN_MODEL:-swe-1-7}"

if ! command -v devin >/dev/null 2>&1; then
  # curl の出力を直接 bash に流すと、取得したものが何か確認できないまま実行することになる。
  # 配布側がバージョンごとに更新するスクリプトなので checksum は固定できず、
  # せめて一旦ファイルへ落として中身の存在を確かめてから実行する。
  INSTALLER="$(mktemp)"
  curl -fsSL https://cli.devin.ai/install.sh -o "${INSTALLER}"
  if [ ! -s "${INSTALLER}" ]; then
    echo "::error::Devin CLI のインストーラを取得できませんでした"
    exit 1
  fi
  bash "${INSTALLER}"
  rm -f "${INSTALLER}"

  # install.sh は shell rc に PATH を追記するだけで、Actions の非対話 shell には効かん
  for dir in "${HOME}/.local/bin" "${HOME}/.devin/bin" "${HOME}/bin" /usr/local/bin; do
    if [ -x "${dir}/devin" ]; then
      export PATH="${dir}:${PATH}"
      [ -n "${GITHUB_PATH:-}" ] && echo "${dir}" >> "${GITHUB_PATH}"
      break
    fi
  done
fi

if ! command -v devin >/dev/null 2>&1; then
  echo "::error::devin コマンドが見つかりません。インストール先の想定が変わった可能性があります"
  exit 1
fi

PROMPT_FILE="$(mktemp)"
printf '%s\n' "${DEVIN_PROMPT}" > "${PROMPT_FILE}"

# --permission-mode dangerous は全ツールを自動承認するため、ここで gh を未認証にして
# コメント投稿・push・merge を封じる（封じ込めはプロンプトでなく環境側でやる）
GH_CONFIG_DIR="$(mktemp -d)"
export GH_CONFIG_DIR GH_TOKEN="" GITHUB_TOKEN=""

# --permission-mode auto / smart は print モードで確認待ちのまま止まる。
# --sandbox / autonomous は RITMO の org ポリシーで塞がれている。
devin --respect-workspace-trust false \
  --model "${MODEL}" \
  --permission-mode dangerous \
  --prompt-file "${PROMPT_FILE}" \
  -p | tee "${OUTPUT_FILE}"
