#!/usr/bin/env bash
# Day01〜30の写経ループを自動実行するオーケストレーター。
# Usage: 00_orchestrator.sh [--resume] <target_app_dir>
#   --resume: .planning/loop-state.json の current_day から再開
#   (なし): Day01 から新規スタート
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATE_FILE="$REPO_DIR/.planning/loop-state.json"
MATERIAL_DIR="$REPO_DIR/material/30days-curriculum"

# .planning/loop-state.json はランタイム状態のため gitignore 対象。
# フレッシュチェックアウトでは存在しないので、なければ初期状態で作成する。
mkdir -p "$(dirname "$STATE_FILE")"
if [[ ! -f "$STATE_FILE" ]]; then
  cat > "$STATE_FILE" <<'EOF'
{
  "loop_count": 0,
  "current_day": "00",
  "last_status": "NOT_STARTED",
  "fail_history": [],
  "started_at": null,
  "last_updated": null
}
EOF
fi

RESUME=false
TARGET_DIR=""

# 引数パース
for arg in "$@"; do
  if [[ "$arg" == "--resume" ]]; then
    RESUME=true
  else
    TARGET_DIR="$arg"
  fi
done

if [[ -z "$TARGET_DIR" ]]; then
  echo "Usage: 00_orchestrator.sh [--resume] <target_app_dir>"
  exit 1
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "ERROR: target_app_dir '$TARGET_DIR' not found"
  exit 1
fi

# state helper (requires python3)
read_state() {
  python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(d.get(sys.argv[2],''))" "$STATE_FILE" "$1"
}

write_state() {
  python3 - "$STATE_FILE" "$1" "$2" <<'EOF'
import json, sys
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f:
    d = json.load(f)
d[key] = value
with open(path, 'w') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
EOF
}

append_fail() {
  python3 - "$STATE_FILE" "$1" "$2" <<'EOF'
import json, sys
from datetime import datetime, timezone
path, day, reason = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f:
    d = json.load(f)
loop = d.get('loop_count', 0)
d.setdefault('fail_history', []).append({
    'loop': loop,
    'day': day,
    'reason': reason,
    'timestamp': datetime.now(timezone.utc).isoformat()
})
d['last_updated'] = datetime.now(timezone.utc).isoformat()
with open(path, 'w') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
EOF
}

NOW=$(python3 -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).isoformat())")

# 開始処理
if [[ "$RESUME" == "true" ]]; then
  START_DAY=$(read_state current_day)
  LOOP_N=$(read_state loop_count)
  echo "▶ Resume from Day $START_DAY (loop $LOOP_N)"
else
  # ループカウンタを+1して新規スタート
  LOOP_N=$(python3 -c "import json; d=json.load(open('$STATE_FILE')); print(d.get('loop_count',0)+1)")
  python3 - "$STATE_FILE" "$LOOP_N" "$NOW" <<'EOF'
import json, sys
path, loop_n, now = sys.argv[1], int(sys.argv[2]), sys.argv[3]
with open(path) as f:
    d = json.load(f)
d['loop_count'] = loop_n
d['current_day'] = '01'
d['last_status'] = 'RUNNING'
d['started_at'] = now
d['last_updated'] = now
with open(path, 'w') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
EOF
  START_DAY="01"
  echo "▶ Start loop $LOOP_N from Day 01"
fi

FAIL_COUNT=0

for DAY_N in $(seq 1 30); do
  DAY_NUM=$(printf "%02d" "$DAY_N")

  # 再開時：START_DAY より前はスキップ
  if [[ "$START_DAY" != "01" ]] && [[ "$DAY_NUM" < "$START_DAY" ]]; then
    echo "  ⏭ Skip Day $DAY_NUM (already done)"
    continue
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Day $DAY_NUM / 30  (loop $LOOP_N)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # 状態更新
  write_state current_day "$DAY_NUM"
  write_state last_status "RUNNING"

  # 教材ファイルを探す（同名 Day 番号で複数ヒットしたら明示的に失敗させる）
  shopt -s nullglob
  MD_CANDIDATES=("$MATERIAL_DIR/day${DAY_NUM}_"*.md)
  shopt -u nullglob
  if [[ ${#MD_CANDIDATES[@]} -eq 0 ]]; then
    echo "  ❌ FAIL — Day $DAY_NUM: markdown file not found in $MATERIAL_DIR"
    append_fail "$DAY_NUM" "markdown file not found"
    write_state last_status "FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    break
  elif [[ ${#MD_CANDIDATES[@]} -gt 1 ]]; then
    echo "  ❌ FAIL — Day $DAY_NUM: multiple markdown files matched: ${MD_CANDIDATES[*]}"
    append_fail "$DAY_NUM" "multiple markdown files matched"
    write_state last_status "FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    break
  fi
  MD_FILE="${MD_CANDIDATES[0]}"

  # Step 1: コードブロックを適用
  if ! python3 "$SCRIPT_DIR/apply_day.py" "$MD_FILE" "$TARGET_DIR"; then
    echo "  ❌ FAIL — Day $DAY_NUM: apply_day.py failed"
    append_fail "$DAY_NUM" "apply_day.py failed"
    write_state last_status "FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    break
  fi

  # Step 2: ビルド検証
  if ! python3 "$SCRIPT_DIR/verify_day.py" "$DAY_NUM" "$TARGET_DIR"; then
    append_fail "$DAY_NUM" "npm run build failed"
    write_state last_status "FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    break
  fi

  # Step 3: スナップショット
  bash "$SCRIPT_DIR/snapshot_day.sh" "$LOOP_N" "$DAY_NUM" "$TARGET_DIR" || true

  write_state last_updated "$(python3 -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).isoformat())")"
  echo "  ✅ Day $DAY_NUM complete"
done

echo ""
if [[ "$FAIL_COUNT" -eq 0 ]]; then
  write_state last_status "COMPLETED"
  echo "🎉 修正0件で Day01〜30 完走！ループ $LOOP_N 合格"
  exit 0
else
  echo "❌ ループ $LOOP_N FAIL (失敗 $FAIL_COUNT 件)"
  echo "   修正後に: bash 00_orchestrator.sh --resume $TARGET_DIR"
  cat "$STATE_FILE"
  exit 1
fi
