# Deployment

This runbook describes the first Vercel deployment path for task-app.

## Prerequisites

- Node.js 22 or newer.
- npm 10 or newer.
- A Vercel project connected to `kouiso/task-app`.
- A PostgreSQL database reachable from Vercel.
- A 32+ character `JWT_SECRET`.
- Optional Sentry project DSNs.

## Environment Variables

Set these in Vercel for Production, Preview, and Development as appropriate.

| Variable | Required | Example / source |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string with `?schema=public`. |
| `JWT_SECRET` | Yes | 32+ character random secret. |
| `NODE_ENV` | Yes | `production` on Vercel production. |
| `NEXT_PUBLIC_BASE_URL` | Recommended | Production site URL for robots/sitemap. |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Browser Sentry DSN. |
| `SENTRY_DSN` | Optional | Server/Edge Sentry DSN. |
| `_DEVELOPER_EMAIL` | Optional | Seed admin email. |
| `_DEVELOPER_FIRSTNAME` | Optional | Seed admin first name. |
| `_DEVELOPER_LASTNAME` | Optional | Seed admin last name. |

Do not put production secrets in `.env.example` or commit real `.env` files.

## First Deploy Walkthrough

1. Create or select the Vercel project.
2. Connect the GitHub repository and set the production branch to `main`.
3. Add `DATABASE_URL`, `JWT_SECRET`, and optional Sentry variables in Vercel Project Settings.
4. Confirm the build command is `npm run vercel-build`.
5. Confirm the install command is Vercel default npm install.
6. Deploy once from `main`.
7. Open the deployment logs and confirm:
   - `prisma generate` completed.
   - `next build` completed.
   - No missing env var error was thrown by `src/lib/env.ts`.
8. Run database migration or push from a controlled terminal if the database is new:

   ```sh
   DATABASE_URL="postgresql://..." npm run db:push
   ```

9. Seed only when demo/admin seed data is intended:

   ```sh
   DATABASE_URL="postgresql://..." npm run db:seed
   ```

10. Visit `/login`, sign in with the seeded admin, and smoke-check dashboard, projects, tasks, and reports.

## Secret Rotation

### JWT Secret

Rotating `JWT_SECRET` invalidates all current session cookies.

1. Generate a new 32+ character secret.
2. Update `JWT_SECRET` in Vercel for all relevant environments.
3. Redeploy.
4. Announce that users must sign in again.
5. Confirm login creates a new `session` cookie and protected pages load.

### Database URL

1. Provision the replacement database or credential.
2. Apply schema with `npm run db:push` or the approved migration path.
3. Update `DATABASE_URL` in Vercel.
4. Redeploy.
5. Run smoke checks against read/write flows.
6. Keep old credentials temporarily until rollback is no longer needed.

### Sentry DSN

1. Create the new Sentry project or client key.
2. Update `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`.
3. Redeploy.
4. Trigger a controlled non-production test error if available.
5. Confirm server, edge, and browser events arrive.

## Rollback

Use Vercel's deployment history to promote the last known good deployment when the new deploy fails after build. If the issue involves data, pause writes if possible and follow `doc/INCIDENT_RESPONSE.md` before changing database state.
