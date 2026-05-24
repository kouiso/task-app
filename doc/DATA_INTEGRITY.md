# Data Integrity Runbook

This document tracks the seed-data and orphan-cleanup policy for task-app.

## Seed Idempotency

`npm run db:seed` is intended to be safe to run repeatedly in local/demo environments.

The seed command uses stable user emails and `user.upsert` for seeded users:

- `admin@example.com` or `_DEVELOPER_EMAIL`
- `user1@example.com`
- `user2@example.com`

Project, task, member, and comment seed records are reset before each seed run by deleting deterministic seed-only project IDs:

- `seed-project-website-renewal`
- `seed-project-mobile-app`

Deleting those projects cascades to seeded tasks, project members, and task comments before the seed recreates them. Human-readable project names such as `Webサイトリニューアル` are never used as deletion keys because real users may create projects with the same names.

The seed recreates the visible demo project names after cleanup:

- `Webサイトリニューアル`
- `モバイルアプリ開発`

This keeps two consecutive seed runs from duplicating rows while preserving the stable seeded users and protecting non-seed projects.

## Orphan Cleanup Policy

Current Prisma relation policy:

| Parent deletion | Related records | Policy |
| --- | --- | --- |
| `Project` | `Task` | `onDelete: Cascade` |
| `Project` | `ProjectMember` | `onDelete: Cascade` |
| `Task` | `Comment` | `onDelete: Cascade` |
| `User` | `Account` | `onDelete: Cascade` |
| `User` | `Session` | `onDelete: Cascade` |
| `User` | `ProjectMember` | `onDelete: Cascade` |
| `User` | `Task.createdBy` | Restrict by default |
| `User` | `Task.assignee` | Restrict by default |
| `User` | `Comment.user` | Restrict by default |

User deletion is intentionally restricted when the user owns created tasks, assigned tasks, or comments. That prevents silent deletion or reassignment of audit/history data. The application should deactivate users with `isActive = false` for normal offboarding. Hard deletion requires an explicit cleanup or reassignment plan.

Project deletion cascades through project-owned data. That is the expected behavior for demo/seed projects and for project cleanup flows where tasks and comments have no value outside the project.

## Verification Checklist

For a local database on the supported test port:

```sh
npm run db:push
npm run db:seed
npm run db:seed
```

Expected row counts after the second seed:

- users: 3 seeded users, unless local data already has extra users
- projects with seed IDs above: 2
- tasks under those projects: 5
- comments under those tasks: 2
- project members under those projects: 5

For orphan checks:

- Delete a seeded project and confirm its tasks, comments, and project members are gone.
- Attempt to delete a seeded user with created/assigned tasks or comments and confirm the database rejects it.
- Deactivate users for normal operational offboarding instead of hard deletion.
