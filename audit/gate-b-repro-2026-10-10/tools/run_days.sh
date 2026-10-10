#!/bin/bash
# Gate-B v15 pipeline: per day apply -> tsc --noEmit -> dev boot -> HTTP smoke.
export PATH="/Users/devin/.local/share/mise/installs/node/22.22.2/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
cd /Users/devin/gate-b-repro/repro
MAT=/Users/devin/repos/task-app-gateb/material/30days-curriculum
LOGS=/Users/devin/gate-b-repro/logs
RUN=${GATEB_RUN:-v15}
export GATEB_RUN="$RUN"
: > "$LOGS/days-summary-${RUN}.log"
: > "$LOGS/dev-smoke-${RUN}.jsonl"

for day in $(seq -w 1 30); do
  md=$(ls "$MAT"/day${day}_*.md 2>/dev/null | head -1)
  if [ -z "$md" ]; then
    echo "MISSING_MD day${day}" >> "$LOGS/days-summary-v15.log"
    continue
  fi
  echo "=== day${day}: $(basename "$md")" >> "$LOGS/days-summary-${RUN}.log"

  python3 /Users/devin/gate-b-repro/apply_day_v15.py "$md" "day${day}" \
    > "$LOGS/apply-day${day}-${RUN}.log" 2>&1

  npx tsc --noEmit > "$LOGS/tsc-day${day}-${RUN}.log" 2>&1
  errs=$(grep -c 'error TS' "$LOGS/tsc-day${day}-${RUN}.log")
  echo "TSC_ERRORS day${day}: ${errs}" >> "$LOGS/days-summary-${RUN}.log"

  routes=$(python3 - "$LOGS/apply-day${day}-${RUN}.log" <<'EOF'
import json, re, sys
try:
    rec = json.loads(open(sys.argv[1]).read().split('\n')[0].strip() or '{}')
except Exception:
    rec = {}
routes = set()
for a in rec.get('applied', []):
    m = re.match(r'src/app/(.*)/page\.tsx$', a['path'])
    if m:
        r = re.sub(r'\([^)]*\)/', '', m.group(1))
        routes.add('/' + r if r else '/')
print(' '.join(sorted(routes)))
EOF
)

  (npm run dev -- -p 3100 > "$LOGS/dev-day${day}-${RUN}.log" 2>&1 & echo $! > /tmp/devv15.pid)
  DEVPID=$(cat /tmp/devv15.pid)
  up=0
  for i in $(seq 1 40); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:3100/login" 2>/dev/null)
    if [ "$code" != "000" ]; then up=1; break; fi
    sleep 1.5
  done
  if [ "$up" = "0" ]; then
    echo "DEV_FAIL day${day}: server never responded" >> "$LOGS/days-summary-${RUN}.log"
    kill "$DEVPID" 2>/dev/null; pkill -f 'next.*3100' 2>/dev/null
    continue
  fi
  {
    printf '{"day":"day%s","routes":{' "$day"
    first=1
    for r in / /login /dashboard $routes; do
      code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "http://localhost:3100$r" 2>/dev/null)
      [ "$first" = "1" ] && first=0 || printf ','
      printf '"%s":"%s"' "$r" "$code"
    done
    printf '}}\n'
  } >> "$LOGS/dev-smoke-${RUN}.jsonl"
  kill "$DEVPID" 2>/dev/null; pkill -f 'next.*3100' 2>/dev/null; wait "$DEVPID" 2>/dev/null || true
  sleep 1
  echo "DEV_OK day${day}" >> "$LOGS/days-summary-${RUN}.log"
done
echo "ALL_DAYS_DONE_${RUN}" >> "$LOGS/days-summary-${RUN}.log"
