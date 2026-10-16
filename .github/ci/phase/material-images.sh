#!/usr/bin/env bash
echo "::group::md5 duplicate scan — 同一内容の画像が別名で存在しないか"
# 由来: PR#285 レビュー。day09-cards.png == day09-complete.png など、
#       同一画像が別キャプションで使い回され「キャプションと画像の整合」
#       (voice-spec ルーブリック6) を壊していた。人手のmd5sum確認は
#       抜けるので、重複が1組でもあれば落とす。
dups=$(find material/30days-curriculum/screenshots -type f -name '*.png' -print0 \
  | xargs -0 -r md5sum | sort | awk '{if ($1 == prev) {print prevline; print $0} prev=$1; prevline=$0}' | sort -u)
if [ -n "$dups" ]; then
  echo "重複スクリーンショットを検出:"
  echo "$dups"
  exit 1
fi
echo "重複なし"
echo "::endgroup::"
