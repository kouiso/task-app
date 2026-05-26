# Incident Response

This runbook covers production incidents for task-app.

## Triage Order

1. Confirm user impact.
   - Which path or workflow is broken?
   - Is it production only or also preview/local?
   - Is data loss possible?
2. Check Vercel deployment status.
   - Latest deployment health.
   - Build/runtime logs.
   - Recent environment variable changes.
3. Check Sentry.
   - New issue count.
   - First seen time.
   - Affected release/deployment.
   - Stack trace and user/session breadcrumbs.
4. Check database health.
   - Connection failures.
   - Migration/schema mismatch.
   - Slow queries or exhausted connections.
5. Decide mitigation.
   - Roll back Vercel deployment.
   - Rotate a bad secret.
   - Disable a broken optional integration.
   - Stop writes or restore data if corruption is suspected.

## Sentry Alert Flow

1. Open the Sentry alert and copy the issue URL.
2. Confirm whether the event is browser, server, or edge.
3. Compare the first seen timestamp with the Vercel deployment timeline.
4. Identify the route, tRPC procedure, or middleware path involved.
5. Add labels/severity in the tracking issue.
6. If the error affects authentication, data writes, or admin flows, treat it as high severity.
7. Create a hotfix branch from `main` and attach Sentry/Vercel evidence to the PR.

## Vercel Rollback and PITR

Use Vercel deployment rollback first when code deploy caused the incident and data has not been corrupted.

1. Open Vercel project deployments.
2. Select the last known good production deployment.
3. Promote it to production.
4. Confirm `/login`, `/dashboard`, project list, task list, and one tRPC mutation.
5. Keep the incident open until root cause is documented.

For database recovery, use the PostgreSQL provider's point-in-time recovery (PITR) controls. Vercel itself can roll back deployments, but database PITR depends on the backing database provider and plan.

1. Stop or reduce writes if data corruption is ongoing.
2. Record current time, suspected corruption start time, and affected tables.
3. Export/snapshot current state if the provider supports it.
4. Restore to a new database at the selected point in time.
5. Validate users, projects, tasks, comments, and project members.
6. Update `DATABASE_URL` only after validation.
7. Redeploy and run smoke checks.
8. Preserve the old database until the incident is closed.

## Communication Template

```text
Status: investigating | mitigating | resolved
Severity: low | medium | high | critical
Started: YYYY-MM-DD HH:mm TZ
Affected users/workflows:
Current impact:
Mitigation:
Next update:
Owner:
Evidence:
- Vercel deployment/log URL:
- Sentry issue URL:
- Database/provider event URL:
```

## Closure Checklist

- User impact window documented.
- Root cause documented.
- Fix or rollback linked.
- Verification evidence attached.
- Follow-up issue created for prevention.
- Support/errata communication sent when learners or purchasers were affected.
