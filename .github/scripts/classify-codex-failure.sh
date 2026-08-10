#!/usr/bin/env bash
# Codex ステップが落ちた原因が OpenAI の利用上限かどうかを切り分ける。
# 上限なら 0 で抜けてジョブを緑にする（開発側で直せない事象で失敗通知を鳴らさないため）。
# それ以外の失敗は従来どおり赤にして、本当の不具合を見逃さないようにする。
set -uo pipefail

# 上限判定はモデル名が有効でないと成立せん（無効なら 404 が先に返る）ため、
# ワークフローが使うモデルで駄目なら広く使えるモデルでもう一度確かめる。
PROBE_MODELS="${PROBE_MODEL:-gpt-5.5} gpt-4o-mini"
# ローカルでモックを立てて分岐を検証できるようにしている
PROBE_URL="${OPENAI_API_URL:-https://api.openai.com/v1/responses}"
RESPONSE_FILE="$(mktemp)"
trap 'rm -f "${RESPONSE_FILE}"' EXIT

# self-hosted runner に jq が無い場合でも動かす必要があるので、生の JSON から拾う
extract_error_code() {
  grep -o '"\(code\|type\)"[[:space:]]*:[[:space:]]*"[^"]*"' "${RESPONSE_FILE}" 2>/dev/null |
    sed 's/.*"\([^"]*\)"$/\1/' |
    grep -v '^invalid_request_error$' |
    head -1
}

for model in ${PROBE_MODELS}; do
  http=$(curl -sS -o "${RESPONSE_FILE}" -w '%{http_code}' \
    "${PROBE_URL}" \
    -H "Authorization: Bearer ${OPENAI_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d "{\"model\":\"${model}\",\"input\":\"ping\"}") || http="000"

  error_code="$(extract_error_code)"

  case "${error_code}" in
    insufficient_quota | billing_hard_limit_reached | billing_not_active | quota_exceeded | rate_limit_exceeded)
      echo "::notice::OpenAI の利用上限に達しているため Codex をスキップしました (${model}: ${error_code})"
      exit 0
      ;;
  esac

  if [ "${http}" = "429" ]; then
    echo "::notice::OpenAI が 429 を返したため Codex をスキップしました (${model})"
    exit 0
  fi

  echo "probe ${model}: HTTP ${http}, error ${error_code:-none}"
done

echo "::error::Codex が利用上限以外の理由で失敗しました。ログを確認してください"
exit 1
