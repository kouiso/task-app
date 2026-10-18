#!/usr/bin/env bash
missing=""
for n in $(seq -w 1 30); do
  grep -q "^day${n}:" "$RUNNER_TEMP/snapshot.log" || missing="$missing day${n}"
done
if [ -n "$missing" ]; then
  echo "::error::30日ぶん揃ってへん。判定されてへん日:$missing"
  exit 1
fi
echo "day01〜day30 の30日ぶん、全部が判定されとる"
