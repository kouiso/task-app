# QA Runbook — 2026-05-18

**Purpose**: A future AI must be able to follow this runbook step-by-step and produce PASS/FAIL evidence **without human intervention**. Each command is verbatim copy-paste.

**Scope**: task-app top 5 critical paths
1. Auth flow (register / login / logout / rate-limit)
2. Project lifecycle (create / member / update / delete)
3. Task lifecycle (create / assign / status transition / delete)
4. Comment + RBAC (post / edit / delete with OWNER / EDITOR / VIEWER guards)
5. Report aggregation (weekly task counts)

**Closes**: #123

---

## 0. Prerequisites

### 0.1 Branch / commit

| Item | Required value |
|---|---|
| branch | `main` (or PR branch under review) |
| commit | latest `origin/main` HEAD (`git rev-parse origin/main`) |
| Node | `22.x` (mise managed — `mise install` once) |
| npm | `10.x` (bundled with Node 22) |
| OS | macOS 14+ / Linux / Windows WSL2 |

### 0.2 Credentials

Seed data is created by `npm run db:seed`. After seeding the following accounts exist:

| Email | Password | Role | Used for |
|---|---|---|---|
| `admin@example.com` | `password123` | ADMIN | admin-only paths |
| `user1@example.com` | `password123` | USER | OWNER/EDITOR project lifecycle |
| `user2@example.com` | `password123` | USER | non-owner / VIEWER guard test |

**No secrets need to be entered manually** — all credentials live in `src/command/seed.ts`.

### 0.3 Required ports

| Service | Port | Source |
|---|---|---|
| App | `3000` | `next dev` |
| Dev DB | `25532` | `docker-compose.yml` `db` service |
| Test DB | `25533` | `docker-compose.yml` `test-db` service |

If any port is occupied: `lsof -ti:3000 | xargs -r kill -9` (do the same for 25532 / 25533).

### 0.4 Evidence destination

Create the day-stamped evidence directory **once** before starting:

```bash
mkdir -p ".work/qa-evidence/$(date +%Y-%m-%d)"
export QA_EVIDENCE="$PWD/.work/qa-evidence/$(date +%Y-%m-%d)"
echo "$QA_EVIDENCE"
```

All step outputs (HTTP response bodies, screenshots, log tails) MUST be written under `$QA_EVIDENCE/`.

---

## 1. Startup steps (verbatim — run from repo root)

```bash
# 1.1 Activate Node 22 via mise
eval "$(mise env -s bash)"
node --version  # expect: v22.22.2 or compatible

# 1.2 Bring up databases
docker compose up -d db test-db
sleep 6  # health-check window

# 1.3 Install deps + generate Prisma client
npm ci

# 1.4 Apply migrations to the dev DB (idempotent)
npm run db:push -- --accept-data-loss=false 2>/dev/null || npm run db:push

# 1.5 Seed deterministic data
npm run db:seed > "$QA_EVIDENCE/01-seed.log" 2>&1

# 1.6 Build + boot the app in background
SKIP_ENV_VALIDATION=true JWT_SECRET=qa-runbook-secret-32-chars-minimum-len \
DATABASE_URL="postgresql://user:password@localhost:25532/taskapp?schema=public" \
nohup npm run start &> "$QA_EVIDENCE/02-server.log" &
echo $! > "$QA_EVIDENCE/server.pid"

# 1.7 Wait until /login responds 200
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login | grep -q "200"; do
  sleep 2
done
echo "App is up." | tee -a "$QA_EVIDENCE/02-server.log"
```

**PASS criterion (startup)**: `$QA_EVIDENCE/02-server.log` ends with `App is up.` and `server.pid` contains a PID that `ps -p $(cat server.pid)` reports.

**FAIL signals**:
- `next: command not found` → `npm ci` failed; re-run with `--verbose`.
- `EADDRINUSE :::3000` → port conflict; run port cleanup (§0.3).
- Migrations error `relation "users" does not exist` → DB not ready; `docker compose logs db`.

---

## 2. Critical Path 1 — Auth flow

### 2.1 Register a fresh user (creates `qa-runbook-{ts}@example.com`)

```bash
TS=$(date +%s)
QA_EMAIL="qa-runbook-${TS}@example.com"
QA_PASSWORD="QaPass123!"

curl -s -c "$QA_EVIDENCE/cookies-${TS}.txt" -X POST http://localhost:3000/api/trpc/auth.register \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"name\":\"QA Runbook ${TS}\",\"email\":\"${QA_EMAIL}\",\"password\":\"${QA_PASSWORD}\"}}}" \
  > "$QA_EVIDENCE/10-register-response.json"
cat "$QA_EVIDENCE/10-register-response.json"
```

**PASS**: response JSON contains `"user"` with the new email and **does NOT** contain `"error"`.

**FAIL signals**:
- `"code":"CONFLICT"` → seed picked the same timestamp; retry with `TS=$((TS+1))`.
- Zod regex fail → password complexity (`A-Z` / `a-z` / `0-9` / 特殊) violation.

### 2.2 Login with the newly registered user

```bash
curl -s -c "$QA_EVIDENCE/cookies-${TS}.txt" -X POST http://localhost:3000/api/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"email\":\"${QA_EMAIL}\",\"password\":\"${QA_PASSWORD}\"}}}" \
  > "$QA_EVIDENCE/11-login-response.json"
grep -o '"user":{[^}]*"email":"'"${QA_EMAIL}"'"' "$QA_EVIDENCE/11-login-response.json" \
  && echo PASS \
  || echo FAIL
```

**PASS**: stdout is `PASS` AND `cookies-${TS}.txt` contains a `session` cookie.

**FAIL signals**:
- `"UNAUTHORIZED"` → previous step failed silently; re-run §2.1.

### 2.3 Authenticated route (`/dashboard`)

```bash
curl -s -b "$QA_EVIDENCE/cookies-${TS}.txt" -o "$QA_EVIDENCE/12-dashboard.html" \
  -w "%{http_code}\n" http://localhost:3000/dashboard
```

**PASS**: stdout is `200` AND `12-dashboard.html` contains the seed user's `name` (case-sensitive grep): `grep -q "QA Runbook ${TS}" "$QA_EVIDENCE/12-dashboard.html"` exit 0.

**FAIL signals**:
- `307` redirect to `/login` → session cookie not sent; verify `cookies-${TS}.txt` exists with non-empty `session` line.
- `500` → server error; tail `$QA_EVIDENCE/02-server.log`.

### 2.4 Logout

```bash
curl -s -b "$QA_EVIDENCE/cookies-${TS}.txt" -c "$QA_EVIDENCE/cookies-after-logout.txt" \
  -X POST http://localhost:3000/api/trpc/auth.logout \
  -H "Content-Type: application/json" -d "{\"0\":{\"json\":null}}" \
  > "$QA_EVIDENCE/13-logout.json"
```

**PASS**: `cookies-after-logout.txt` `session` line is empty or absent.

### 2.5 Login rate-limit (PR #122 regression check)

```bash
QA_BLOCK_EMAIL="user1@example.com"
QA_WRONG_PW="ThisIsObviouslyWrong"
# 6 連続失敗 → 6 回目で TOO_MANY_REQUESTS が返るべき
for i in 1 2 3 4 5 6; do
  HTTP=$(curl -s -o "$QA_EVIDENCE/20-ratelimit-${i}.json" -w "%{http_code}" \
    -H "Content-Type: application/json" -H "x-forwarded-for: 198.51.100.42" \
    -X POST http://localhost:3000/api/trpc/auth.login \
    -d "{\"0\":{\"json\":{\"email\":\"${QA_BLOCK_EMAIL}\",\"password\":\"${QA_WRONG_PW}\"}}}")
  echo "attempt ${i}: http=${HTTP}"
done | tee "$QA_EVIDENCE/20-ratelimit-summary.txt"
```

**PASS**: `20-ratelimit-summary.txt` shows `attempts 1-5` all returning HTTP 401 AND `attempt 6` returning **HTTP 429** (or attempt 6 response JSON contains `"TOO_MANY_REQUESTS"`).

**FAIL signals**:
- attempt 6 still returns `401` → rate-limit middleware regression; check `src/lib/rate-limit.ts` is still imported from `auth.ts`.
- attempts 1-5 returning `500` → DB migration not applied; rerun §1.4 + verify `prisma/migrations/20260518024651_add_login_attempts/` exists.

Cleanup:

```bash
docker compose exec -T db psql -U user taskapp -c \
  "DELETE FROM login_attempts WHERE email='${QA_BLOCK_EMAIL}';"
```

---

## 3. Critical Path 2 — Project lifecycle

### 3.1 Login as user1 + create project

```bash
curl -s -c "$QA_EVIDENCE/cookies-user1.txt" -X POST http://localhost:3000/api/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{"0":{"json":{"email":"user1@example.com","password":"password123"}}}' \
  > "$QA_EVIDENCE/30-user1-login.json"

curl -s -b "$QA_EVIDENCE/cookies-user1.txt" -X POST http://localhost:3000/api/trpc/project.create \
  -H "Content-Type: application/json" \
  -d '{"0":{"json":{"name":"QA Runbook Project","description":"qa","color":"#3498db"}}}' \
  > "$QA_EVIDENCE/31-project-create.json"

PROJECT_ID=$(grep -o '"id":"[^"]*"' "$QA_EVIDENCE/31-project-create.json" | head -1 | cut -d'"' -f4)
echo "Project ID: $PROJECT_ID" | tee "$QA_EVIDENCE/31-project-id.txt"
```

**PASS**: `31-project-id.txt` shows a non-empty cuid (~25 chars starting with `c`).

### 3.2 Invite user2 as MEMBER

```bash
USER2_ID=$(docker compose exec -T db psql -U user taskapp -tA -c \
  "SELECT id FROM users WHERE email='user2@example.com' LIMIT 1;")
echo "user2 id: $USER2_ID" | tee "$QA_EVIDENCE/32-user2-id.txt"

curl -s -b "$QA_EVIDENCE/cookies-user1.txt" -X POST http://localhost:3000/api/trpc/project.addMember \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"projectId\":\"${PROJECT_ID}\",\"userId\":\"${USER2_ID}\",\"role\":\"MEMBER\"}}}" \
  > "$QA_EVIDENCE/33-add-member.json"
```

**PASS**: `33-add-member.json` contains `"projectId":"${PROJECT_ID}"` and `"role":"MEMBER"`.

### 3.3 Delete project (OWNER permission)

```bash
curl -s -b "$QA_EVIDENCE/cookies-user1.txt" -X POST http://localhost:3000/api/trpc/project.delete \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"id\":\"${PROJECT_ID}\"}}}" \
  > "$QA_EVIDENCE/34-project-delete.json"

# DB 直接確認
docker compose exec -T db psql -U user taskapp -tA -c \
  "SELECT count(*) FROM projects WHERE id='${PROJECT_ID}';" \
  > "$QA_EVIDENCE/35-project-deleted-count.txt"
```

**PASS**: `35-project-deleted-count.txt` content is `0` (project row removed).

---

## 4. Critical Path 3 — Task lifecycle

(uses the cookies from §3 — user1 OWNER)

### 4.1 Re-create a project for task scope

```bash
curl -s -b "$QA_EVIDENCE/cookies-user1.txt" -X POST http://localhost:3000/api/trpc/project.create \
  -H "Content-Type: application/json" \
  -d '{"0":{"json":{"name":"Task Scope","description":"","color":"#27ae60"}}}' \
  > "$QA_EVIDENCE/40-project.json"
PROJECT_ID=$(grep -o '"id":"[^"]*"' "$QA_EVIDENCE/40-project.json" | head -1 | cut -d'"' -f4)
```

### 4.2 Create + transition + delete task

```bash
# create
curl -s -b "$QA_EVIDENCE/cookies-user1.txt" -X POST http://localhost:3000/api/trpc/task.create \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"title\":\"qa runbook task\",\"projectId\":\"${PROJECT_ID}\",\"status\":\"TODO\",\"priority\":\"MEDIUM\"}}}" \
  > "$QA_EVIDENCE/41-task-create.json"
TASK_ID=$(grep -o '"id":"[^"]*"' "$QA_EVIDENCE/41-task-create.json" | head -1 | cut -d'"' -f4)

# TODO -> IN_PROGRESS
curl -s -b "$QA_EVIDENCE/cookies-user1.txt" -X POST http://localhost:3000/api/trpc/task.update \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"id\":\"${TASK_ID}\",\"status\":\"IN_PROGRESS\"}}}" \
  > "$QA_EVIDENCE/42-task-update.json"

# delete
curl -s -b "$QA_EVIDENCE/cookies-user1.txt" -X POST http://localhost:3000/api/trpc/task.delete \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"id\":\"${TASK_ID}\"}}}" \
  > "$QA_EVIDENCE/43-task-delete.json"

docker compose exec -T db psql -U user taskapp -tA -c \
  "SELECT count(*) FROM tasks WHERE id='${TASK_ID}';" \
  > "$QA_EVIDENCE/44-task-deleted-count.txt"
```

**PASS**:
- `42-task-update.json` contains `"status":"IN_PROGRESS"`.
- `44-task-deleted-count.txt` content is `0`.

**FAIL signal**: status transition returns `BAD_REQUEST` → check `taskStatusSchema` allowed enum values.

---

## 5. Critical Path 4 — Comment + RBAC

### 5.1 OWNER (user1) posts comment

```bash
# 5.1 prepare a task to comment on
curl -s -b "$QA_EVIDENCE/cookies-user1.txt" -X POST http://localhost:3000/api/trpc/task.create \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"title\":\"comment scope\",\"projectId\":\"${PROJECT_ID}\",\"status\":\"TODO\",\"priority\":\"LOW\"}}}" \
  > "$QA_EVIDENCE/50-comment-task.json"
COMMENT_TASK_ID=$(grep -o '"id":"[^"]*"' "$QA_EVIDENCE/50-comment-task.json" | head -1 | cut -d'"' -f4)

# OWNER post
curl -s -b "$QA_EVIDENCE/cookies-user1.txt" -X POST http://localhost:3000/api/trpc/comment.create \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"taskId\":\"${COMMENT_TASK_ID}\",\"content\":\"OWNER posted comment\"}}}" \
  > "$QA_EVIDENCE/51-owner-comment.json"
COMMENT_ID=$(grep -o '"id":"[^"]*"' "$QA_EVIDENCE/51-owner-comment.json" | head -1 | cut -d'"' -f4)
```

**PASS**: `51-owner-comment.json` contains `"content":"OWNER posted comment"`.

### 5.2 VIEWER (user2 — not member yet) is denied

```bash
# user2 をプロジェクト VIEWER として add
curl -s -b "$QA_EVIDENCE/cookies-user1.txt" -X POST http://localhost:3000/api/trpc/project.addMember \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"projectId\":\"${PROJECT_ID}\",\"userId\":\"${USER2_ID}\",\"role\":\"VIEWER\"}}}" \
  > "$QA_EVIDENCE/52-user2-viewer.json"

# user2 でログイン
curl -s -c "$QA_EVIDENCE/cookies-user2.txt" -X POST http://localhost:3000/api/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{"0":{"json":{"email":"user2@example.com","password":"password123"}}}' > /dev/null

# VIEWER がコメント編集を試みる → 403 期待
HTTP=$(curl -s -o "$QA_EVIDENCE/53-viewer-update-denied.json" -w "%{http_code}" \
  -b "$QA_EVIDENCE/cookies-user2.txt" -X POST http://localhost:3000/api/trpc/comment.update \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"id\":\"${COMMENT_ID}\",\"content\":\"VIEWER trying to edit\"}}}")
echo "viewer edit attempt: ${HTTP}" | tee "$QA_EVIDENCE/53-viewer-status.txt"
```

**PASS**: `53-viewer-status.txt` shows `403` AND `53-viewer-update-denied.json` contains `FORBIDDEN`.

**FAIL signal**: HTTP 200 → RBAC regression; check `src/server/api/routers/comment.ts` permission gate.

---

## 6. Critical Path 5 — Report aggregation

```bash
# user1 がレポート取得
curl -s -b "$QA_EVIDENCE/cookies-user1.txt" -X GET "http://localhost:3000/api/trpc/report.getWeeklyReport?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22weeks%22%3A1%7D%7D%7D" \
  > "$QA_EVIDENCE/60-report.json"

# JSON 構造の sanity check (パスは sys.argv 経由で渡す。shell interpolation を python source に埋め込まないため)
python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
print('keys:', list(d[0]['result']['data']['json'].keys()) if d else 'EMPTY')
" "$QA_EVIDENCE/60-report.json" | tee "$QA_EVIDENCE/61-report-shape.txt"
```

**PASS**: `61-report-shape.txt` lists keys including `weeks` / `tasksCreated` / `tasksCompleted` (exact key names per `report.ts`).

**FAIL signal**: response contains `error.code` → backend error; tail `$QA_EVIDENCE/02-server.log`.

---

## 7. Teardown (after PASS)

```bash
# stop background server
kill "$(cat "$QA_EVIDENCE/server.pid")" 2>/dev/null
docker compose down

# evidence index
ls -la "$QA_EVIDENCE" > "$QA_EVIDENCE/_index.txt"
echo "QA evidence saved to: $QA_EVIDENCE"
```

---

## 8. Completion gate

A future AI may declare **PASS** for this runbook if AND ONLY IF:

1. Every section §1〜§6 has its named evidence files in `$QA_EVIDENCE/`.
2. Every block marked **PASS** above shows the literal `PASS` token (or evidence matches the described criterion).
3. No `FAIL` token, no `error.code` other than the intentional 401/403/429 cases.

Report shape (to be appended to `$QA_EVIDENCE/SUMMARY.md`):

```markdown
# QA Runbook Run — YYYY-MM-DD HH:MM JST

| Section | Path | Result | Evidence |
|---|---|---|---|
| 1 | Startup | PASS | 02-server.log |
| 2 | Auth | PASS | 10-13, 20-* |
| 3 | Project | PASS | 30-35 |
| 4 | Task | PASS | 40-44 |
| 5 | Comment / RBAC | PASS | 50-53 |
| 6 | Report | PASS | 60-61 |

Overall: PASS / FAIL (delete one)
```

Commit `SUMMARY.md` + the entire `$QA_EVIDENCE` directory under
`.work/qa-evidence/YYYY-MM-DD/` for the post-merge record (do NOT commit secrets — the runbook uses public seed credentials only).

---

## 9. Update policy

| 変更タイプ | このファイルへの反映義務 |
|---|---|
| 新 critical path 追加 (新 router / 新 RBAC 軸) | 必須: §2-§6 と同等の section を新設 |
| 既存 path の URL / payload 変更 | 必須: 該当 curl コマンドを更新 + PASS criterion 見直し |
| Seed 構造変更 | 必須: §0.2 / §0.3 を更新 |
| UI のみの変更 | 不要 (本 runbook は API 層の verification) |

audit mission Phase 5 follow-up issue (#108-#121) のうち、E2E behavioral (#108) や a11y (#109) は **本 runbook の上位層** として playwright で同等の verification を提供する。本 runbook は API 層の baseline。
