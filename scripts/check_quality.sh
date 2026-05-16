#!/bin/bash
# script/ 配下にある品質チェック本体を呼び出す互換ラッパー

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$SCRIPT_DIR/../script/check_quality.sh" "$@"
