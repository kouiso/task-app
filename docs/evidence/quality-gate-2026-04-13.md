# Quality Gate Assessment — 2026-04-13

| Command | Exit Code | Status | Summary |
|---------|-----------|--------|---------|
| `npm run lint` | 0 | PASS | 150 files checked, 2 warnings (broken symlinks) |
| `npm run type-check` | 0 | PASS | Clean pass, no errors |
| `npm run test -- --coverage` | 1 | **FAIL** | 160 failed / 13 passed (173 total) |
| `npm run build` | 0 | PASS | Compiled successfully in 1000ms |
| `npm audit --audit-level=high` | 1 | **FAIL** | 24 vulnerabilities (6 moderate, 18 high) |

---

## 1. Lint (`npm run lint` = `biome check .`)

- **Exit Code**: 0
- **Status**: PASS
- **Files Checked**: 150
- **Errors**: 0
- **Warnings**: 2 (broken symlinks in `edu-creator/.claude/rules/` — not code issues)

---

## 2. Type Check (`npm run type-check` = `tsc --noEmit`)

- **Exit Code**: 0
- **Status**: PASS
- **Errors**: 0
- **Warnings**: 0

---

## 3. Test (`npm run test -- --coverage` = `vitest run --coverage`)

- **Exit Code**: 1
- **Status**: FAIL

### Test Results

| Metric | Value |
|--------|-------|
| Test Files | 8 failed / 2 passed (10 total) |
| Tests | 160 failed / 13 passed (173 total) |
| Duration | 15.98s |
| Coverage | N/A (not generated due to failures) |

### Failure Cause

All 160 failures are `PrismaClientInitializationError` (error code P1000):

```
Authentication failed against database server at `...`,
the provided database credentials for `...` are not valid.
```

**Root Cause**: No test database is configured in the local environment. Every test file that imports Prisma client fails at connection time. The 13 passing tests are from files that do not require DB access.

### Affected Test Files (8/10)

- `src/server/routers/task.test.ts`
- `src/server/routers/user.test.ts`
- `src/server/routers/project.test.ts`
- `src/server/routers/report.test.ts`
- `src/server/routers/auth.test.ts`
- `src/server/routers/dashboard.test.ts`
- `src/lib/auth/session.test.ts`
- `src/lib/auth/password.test.ts`

---

## 4. Build (`npm run build` = `prisma generate && next build`)

- **Exit Code**: 0
- **Status**: PASS

### Build Output

| Metric | Value |
|--------|-------|
| Prisma Client | Generated successfully |
| Next.js Compile | 1000ms |
| Static Pages | 2 generated |
| First Load JS (shared) | **102 kB** |
| Largest Route | `/report/weekly` — 307 kB First Load JS |
| Middleware | 39.3 kB |
| Route Type | All dynamic (ƒ) |

---

## 5. npm audit (`npm audit --audit-level=high`)

- **Exit Code**: 1
- **Status**: FAIL

### Vulnerability Summary

| Severity | Count |
|----------|-------|
| Moderate | 6 |
| **High** | **18** |
| Critical | 0 |
| **Total** | **24** |

### High-Severity Packages

| Package | Vulnerability | Fix Available |
|---------|--------------|---------------|
| `@trpc/server` | Prototype pollution | Yes |
| `next` | Multiple CVEs (SSRF, DoS, cache confusion) | Yes |
| `lodash` | Prototype pollution | Yes |
| `effect` / `prisma` transitive | Various | Yes |
| `defu` | Prototype pollution | Yes |
| `glob` / `minimatch` | ReDoS | Yes |
| `path-to-regexp` | ReDoS | Yes |
| `picomatch` | ReDoS | Yes |
| `rollup` | Path traversal | Yes |
| `tar-fs` | Path traversal | Yes |
| `ws` | DoS | Yes |
| `marked` | ReDoS | Yes |
| `highlight.js` | ReDoS | **No fix** (transitive via `md-mermaid-to-pdf` devDep) |

Most vulnerabilities have fixes available via `npm audit fix`. The `highlight.js` issue has no fix and is a transitive dependency of `md-mermaid-to-pdf` (devDependency only).

---

## Overall Assessment

| Gate | Result |
|------|--------|
| Lint | PASS |
| Type Safety | PASS |
| Tests | **FAIL** — DB not configured |
| Build | PASS |
| Security | **FAIL** — 18 high vulnerabilities |

**2/5 gates failed.** Neither failure is a code quality issue:
- **Tests**: Infrastructure problem (no test DB), not code defects
- **Security**: Dependency vulnerabilities, most fixable with `npm audit fix`
