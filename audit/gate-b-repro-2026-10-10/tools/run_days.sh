#!/usr/bin/env bash
set -u
export PATH="$(mise where node@22.22.2)/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
cd /Users/devin/gate-b-repro/repro
MAT=/Users/devin/repos/task-app/material/30days-curriculum
LOGS=/Users/devin/gate-b-repro/logs
: > "$LOGS/ledger.jsonl"
: > "$LOGS/days-summary.log"
for md in "$MAT"/day*.md; do
  day=$(basename "$md" | cut -d_ -f1)
  echo "=== $day $(basename "$md")" | tee -a "$LOGS/days-summary.log"
  python3 /Users/devin/gate-b-repro/apply_day.py "$md" "$day" >> "$LOGS/days-summary.log" 2>&1
  if [ -f package.json ]; then
    npx tsc --noEmit > "$LOGS/tsc-$day.log" 2>&1
    ec=$?
    nerr=$(grep -c 'error TS' "$LOGS/tsc-$day.log" || true)
    echo "TSC_$day exit=$ec errors=$nerr" | tee -a "$LOGS/days-summary.log"
    [ "$ec" -ne 0 ] && head -15 "$LOGS/tsc-$day.log" | tee -a "$LOGS/days-summary.log"
  fi
done
echo ALL_DAYS_DONE >> "$LOGS/days-summary.log"
