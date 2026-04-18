# Static Quality Gate Evidence

- Timestamp (JST): 2026-04-18 15:46:08 JST
- Repository: `/Users/kouiso/ghq/kouiso/task-app`
- Phase: `B-1 Static Quality Gate`
- Node: `v25.6.1`
- npm: `11.9.0`
- OS: `Darwin Mac-mini.local 25.1.0 Darwin Kernel Version 25.1.0 arm64`

## Overall Verdict

**FAIL**

判定理由:

- `npm run type-check` / `npm run lint` / `npm run test -- --coverage` / `npm run build` はすべて成功
- ただし coverage の line percentage が `32.67%` で、plan 要件 `>= 80%` を満たさない
- そのため B-1 の overall verdict は **FAIL**

## Check Summary

| Check | Command | Exit Code | Duration (s) | Verdict |
|---|---|---:|---:|---|
| 1 | `npm run type-check` | 0 | 2.221 | PASS |
| 2 | `npm run lint` | 0 | 0.406 | PASS |
| 3 | `npm run test -- --coverage` | 0 | 51.270 | FAIL |
| 4 | `npm run build` | 0 | 11.795 | PASS |

## Coverage Summary

| Metric | Percentage |
|---|---:|
| Statements | 32.67% |
| Branches | 64.03% |
| Functions | 35.52% |
| Lines | 32.67% |

補足:

- 権威ソース:
  - `/tmp/task-app-test-coverage.log`
  - `coverage/index.html`
- `coverage/coverage-summary.json` は未生成
- `coverage/index.html` の総計と CLI 出力は一致
- line coverage `32.67%` のため、coverage gate は **FAIL**

## Sandbox Note

先行調査で記録した `localhost:5436` 接続失敗は、サンドボックス内の localhost TCP 制限によるものでした。

- サンドボックス内 probe: `localhost:5436` / `127.0.0.1:5436` / `::1:5436` がすべて `EPERM`
- サンドボックス外の実行では `npm run test -- --coverage` が exit code `0` で成功

したがって、先行 FAIL は実アプリのテスト失敗ではなく、検証環境制約に起因する偽陽性でした。

## 1. Type Check

- Command: `npm run type-check`
- Exit Code: `0`
- Duration: `2.221s`
- Verdict: **PASS**

### stdout excerpt

```text
> task-app@1.0.0 type-check
> next typegen && tsc --noEmit

Generating route types...
✓ Route types generated successfully
```

### stderr excerpt

```text
(no stderr)
```

## 2. Lint

- Command: `npm run lint`
- Exit Code: `0`
- Duration: `0.406s`
- Verdict: **PASS**

### stdout excerpt

```text
> task-app@1.0.0 lint
> biome check .

Checked 165 files in 86ms. No fixes applied.
```

### stderr excerpt

```text
(no stderr)
```

## 3. Test

- Command: `npm run test -- --coverage`
- Exit Code: `0`
- Duration: `51.270s`
- Verdict: **FAIL**
  - テスト実行自体は PASS
  - ただし line coverage `32.67%` が `>= 80%` を満たさないため、B-1 判定としては FAIL

### stdout excerpt

```text
Test Files  14 passed (14)
     Tests  190 passed (190)
  Start at  23:44:46
  Duration  51.27s (transform 230ms, setup 226ms, collect 681ms, tests 49.24s, environment 241ms, prepare 103ms)

% Coverage report from v8
All files          |   32.67 |    64.03 |   35.52 |   32.67
```

### stderr excerpt

```text
(no stderr)
```

### test result summary

```text
Passed: 190
Failed: 0
Skipped: 0
Total: 190
```

### authoritative coverage summary

| Metric | Percentage |
|---|---:|
| Statements | 32.67% |
| Branches | 64.03% |
| Functions | 35.52% |
| Lines | 32.67% |

## 4. Build

- Command: `npm run build`
- Exit Code: `0`
- Duration: `11.795s`
- Verdict: **PASS**

### stdout excerpt

```text
✓ Generating static pages (18/18)
Finalizing page optimization ...
Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ƒ /                                      154 B         102 kB
├ ○ /dashboard                           3.03 kB         184 kB
├ ○ /task                                7.88 kB         238 kB
└ ƒ /user/[id]/edit                      6.32 kB         222 kB
```

### stderr excerpt

```text
Loaded Prisma config from prisma.config.ts.

Prisma config detected, skipping environment variable loading.
⚠ Compiled with warnings in 1169ms

./node_modules/@prisma/instrumentation/node_modules/@opentelemetry/instrumentation/build/esm/platform/node/instrumentation.js
Critical dependency: the request of a dependency is an expression
```

## Evidence Files

- Primary logs: `docs/evidence/2026-04-17/static-quality-gate-logs/`
- Local sandbox diagnostic logs:
  - `docs/evidence/2026-04-17/static-quality-gate-logs/test-coverage-retry.stdout.log`
  - `docs/evidence/2026-04-17/static-quality-gate-logs/test-coverage-retry.stderr.log`
  - `docs/evidence/2026-04-17/static-quality-gate-logs/test-coverage-envcheck.stdout.log`
  - `docs/evidence/2026-04-17/static-quality-gate-logs/test-coverage-envcheck.stderr.log`
- External successful run:
  - `/tmp/task-app-test-coverage.log`
  - `coverage/index.html`
  - `coverage/coverage-final.json`
