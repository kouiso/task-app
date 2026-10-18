#!/usr/bin/env bash
[ -s "$RUNNER_TEMP/snapshot.log" ] || { echo "Missing snapshot log" >&2; exit 1; }
if grep -q 'build を判定できんかった日' "$RUNNER_TEMP/snapshot.log"; then
  echo "::error::build を判定できんかった日がある。DB へ届いてへんので、この緑は何も保証せん"
  grep -n 'build を判定できんかった日' -A 2 "$RUNNER_TEMP/snapshot.log"
  exit 1
fi
echo "SKIP なし。30日ぶん全部を判定しとる"
