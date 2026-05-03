# src/ Runtime Bug Hunt — 2026-04-29

**Scope**: Runtime bugs a learner would encounter following Day 01 → Day 30 curriculum.
**Method**: Read-only inspection of src/ + curriculum cross-reference.
**Out of scope**: pure a11y/SEO/test-coverage/styling.

## Summary
- Total findings: 7
- P0 (LAUNCH-BLOCK / learner physically stuck): 1
- P1 (completion-blocker / wrong data shown / silent fail): 5
- P2 (degraded UX but learner can continue): 1

## Findings

### BUG-001 — Search result edit link never opens edit mode
- **Severity**: P1
- **Confidence**: High
- **File**: src/app/search/page.tsx; src/app/task/page.tsx
- **Lines**: L170-L172; L45-L53
- **Related curriculum Day**: Day 20 (search result task actions)
- **Reproduction**:
  1. Create at least one task, then search for it on `/search`.
  2. Click the task card edit button in the search results.
- **Expected**: The app navigates to the task page and opens the task dialog in edit mode, as Day 20 says "編集ボタンで編集モードで開く".
- **Actual**: Search appends `edit=true`, but the task page only reads `taskId`, so it opens the detail dialog instead of edit mode.

```tsx
const handleTaskEdit = (taskId: string) => {
  router.push(`/task?taskId=${taskId}&edit=true`);
};

const taskIdParam = searchParams.get('taskId');
useEffect(() => {
  if (taskIdParam) {
    setSelectedTask(taskIdParam);
    setDetailOpen(true);
  }
}, [taskIdParam]);
```
- **Root cause**: The producer and consumer of the URL contract disagree. `/search` emits an `edit=true` query parameter, but `/task` has no code path that reads it, loads the selected task into `editingTask`, or opens `TaskDialog`.
- **Suggested fix**: In `src/app/task/page.tsx`, read `searchParams.get('edit')`, and when it is true after tasks load, call the same edit path used by the card edit button. Alternatively, change the search edit action to a supported route/action.

### BUG-002 — URL-backed search form keeps stale filters when params are removed
- **Severity**: P1
- **Confidence**: High
- **File**: src/app/search/page.tsx
- **Lines**: L102-L128
- **Related curriculum Day**: Day 20 (URL parameter search restoration)
- **Reproduction**:
  1. Visit `/search?status=TODO&priority=HIGH` and confirm the form is populated.
  2. Navigate with browser history or a shared link to `/search?status=TODO` in the same mounted page.
- **Expected**: The priority field resets to "all" because the `priority` query parameter is absent.
- **Actual**: The effect only calls `form.setValue` when a parameter is present, so removed parameters leave the previous form state in place.

```tsx
for (const { key, transform } of paramMap) {
  const value = searchParams.get(key);
  if (value) {
    const transformed = transform ? transform(value) : value;
    form.setValue(key, transformed);
  }
}
```
- **Root cause**: The URL is intended to be the source of truth, but the sync effect treats missing parameters as "do nothing" rather than "reset this field to default". That makes browser back/forward and shared URLs produce searches that do not match the visible URL.
- **Suggested fix**: Build the full form state from `searchParams` on every change and call `form.reset(...)`, including defaults for missing fields.

### BUG-003 — Bulk complete/status endpoints let VIEWER members mutate tasks
- **Severity**: P1
- **Confidence**: High
- **File**: src/server/api/routers/task.ts
- **Lines**: L367-L416
- **Related curriculum Day**: Day 28 (bulk task operations)
- **Reproduction**:
  1. Add a second user to a project as `VIEWER`.
  2. As that user, call bulk complete or bulk status change for a visible task.
- **Expected**: VIEWER can view but cannot edit tasks.
- **Actual**: `bulkComplete` and `bulkUpdateStatus` only verify membership, then run `updateMany`.

```ts
bulkComplete: protectedProcedure
  .input(z.object({ ids: z.array(z.string().cuid()).min(1) }))
  .mutation(async ({ ctx, input }) => {
    await findTasksWithPermission(input.ids, ctx.session.userId);

    const completedAt = new Date();
    return await prisma.task.updateMany({
      where: { id: { in: input.ids } },
      data: { status: TASK_STATUS.DONE, completedAt },
    });
  }),
```
- **Root cause**: `findTasksWithPermission` defaults to membership-only validation. Single-task update uses `findTaskWithPermission(..., 'canEdit')`, but the bulk update procedures omit the equivalent permission check.
- **Suggested fix**: Add a helper variant that accepts a required permission and use `canEdit` for `bulkComplete` and `bulkUpdateStatus`.

### BUG-004 — Bulk selection can mutate hidden tasks after filtering
- **Severity**: P1
- **Confidence**: High
- **File**: src/app/task/page.tsx
- **Lines**: L174-L211, L186-L201
- **Related curriculum Day**: Day 28 (bulk task operations with filters)
- **Reproduction**:
  1. Select tasks in the all-tasks view.
  2. Change the project or status filter so some selected tasks disappear.
  3. Click "完了にする" or choose a bulk status.
- **Expected**: Bulk actions apply only to currently visible selected rows, or selection is cleared when the result set changes.
- **Actual**: `selectedTasks` is independent from the filtered `tasks` query and is not cleared on filter changes, so hidden task IDs remain in the mutation payload.

```tsx
const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

const handleBulkComplete = () => {
  if (selectedTasks.size > 0) {
    bulkCompleteMutation.mutate({ ids: Array.from(selectedTasks) });
  }
};
```
- **Root cause**: Selection state is global to the page, but the visible task list is scoped by `filterProject` and `filterStatus`. There is no reconciliation when filters or fetched tasks change.
- **Suggested fix**: Clear `selectedTasks` on filter changes, or intersect `selectedTasks` with the current `tasks.map(t => t.id)` before rendering counts and sending mutations.

### BUG-005 — Admin editing their own user record always submits forbidden fields
- **Severity**: P1
- **Confidence**: High
- **File**: src/app/user/[id]/edit/user-edit-client.tsx; src/server/api/routers/user.ts
- **Lines**: L84-L89, L179-L201
- **Related curriculum Day**: Day 29 (user detail/edit page)
- **Reproduction**:
  1. Log in as an admin.
  2. Open `/user/<your-own-id>/edit`, change only the name, and submit.
- **Expected**: The admin can update their own displayed profile fields or the form should prevent unsupported fields.
- **Actual**: The client always sends `role` and `isActive`; the server rejects any self-update containing those fields.

```tsx
updateUser.mutate({
  id: userId,
  ...values,
  avatar: normalizeAvatarValue(values.avatar),
});

if (data.role !== undefined || data.isActive !== undefined) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'roleとisActiveは変更できません',
  });
}
```
- **Root cause**: The shared user edit form is used for both admin editing others and self-editing, but the self-update contract forbids fields that the form always includes in its payload.
- **Suggested fix**: When `isOwnProfile` is true, omit `role` and `isActive` from the mutation input or route the user to the dedicated `/profile/edit` flow.

### BUG-006 — Forbidden user detail/edit pages spin forever
- **Severity**: P0
- **Confidence**: High
- **File**: src/app/user/[id]/user-detail-client.tsx; src/app/user/[id]/edit/user-edit-client.tsx
- **Lines**: L41-L67; L57-L106
- **Related curriculum Day**: Day 29 (dynamic user detail/edit routes)
- **Reproduction**:
  1. Log in as a non-admin user.
  2. Open another existing user's `/user/<id>` or `/user/<id>/edit` URL directly.
- **Expected**: The page shows a forbidden message or redirects, matching the Day 29 permission model.
- **Actual**: The tRPC query returns `FORBIDDEN`, `user` stays undefined, and both clients render `PageLoadingSpinner` indefinitely.

```tsx
const { data: user, isLoading, error } =
  api.user.getById.useQuery({ id: userId }, { enabled: userId.length > 0 });

if (!user) {
  return (
    <AppLayout>
      <PageLoadingSpinner />
    </AppLayout>
  );
}
```
- **Root cause**: Error state is toasted but not rendered as a terminal state. Because the server component only checks that the user exists, forbidden users reach the client component, where the client mistakes "no data due to error" for "still loading".
- **Suggested fix**: Branch on `error` before `!user` and render an access-denied state or redirect to `/user`/`/dashboard`.

### BUG-007 — Project detail flashes "not found" before the detail query loads
- **Severity**: P2
- **Confidence**: High
- **File**: src/app/project/page.tsx; src/component/project/project-detail-view.tsx
- **Lines**: L76-L79, L226-L236; L37-L47
- **Related curriculum Day**: Day 27 (project detail page)
- **Reproduction**:
  1. Open `/project?projectId=<valid-project-id>` directly or from the dashboard.
  2. Observe the first render while `project.getById` is still loading.
- **Expected**: A loading state appears until the project detail query resolves.
- **Actual**: `projectDetail` is initially undefined and `ProjectDetailView` renders "プロジェクトが見つかりません。"

```tsx
const { data: projectDetail } = api.project.getById.useQuery(
  { id: selectedProject ?? '' },
  { enabled: !!selectedProject },
);

if (!projectDetail) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
      <p>プロジェクトが見つかりません。</p>
```
- **Root cause**: The parent discards the query loading/error state and passes only data into a view that conflates `undefined` (loading) with `null/not found`.
- **Suggested fix**: Keep `isLoading`/`error` from `project.getById` and render loading, error, and not-found states separately.

## Methodology Notes
- Files read: material/30days-curriculum/00_カリキュラム目次.md; material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md through day30_完成版を公開！卒業！.md via targeted search; material/30days-curriculum/appendix_*.md via targeted search; prisma/schema.prisma; src/middleware.ts; src/lib/session.ts; src/lib/date.ts; src/lib/task-form.ts; src/lib/utils.ts; src/lib/constant/roles.ts; src/server/api/trpc.ts; src/server/api/routers/auth.ts; src/server/api/routers/project.ts; src/server/api/routers/task.ts; src/server/api/routers/search.ts; src/server/api/routers/report.ts; src/server/api/routers/user.ts; src/server/api/routers/comment.ts; src/server/api/routers/_helpers/permission.ts; src/server/api/routers/_helpers/select.ts; src/app/login/page.tsx; src/app/register/page.tsx; src/app/dashboard/page.tsx; src/app/project/page.tsx; src/app/task/page.tsx; src/app/search/page.tsx; src/app/my-task/page.tsx; src/app/report/page.tsx; src/app/report/weekly/page.tsx; src/app/profile/page.tsx; src/app/profile/edit/page.tsx; src/app/profile/change-password/page.tsx; src/app/user/page.tsx; src/app/user/[id]/page.tsx; src/app/user/[id]/edit/page.tsx; src/app/user/[id]/user-detail-client.tsx; src/app/user/[id]/edit/user-edit-client.tsx; src/component/layout/app-layout.tsx; src/component/layout/quick-search.tsx; src/component/project/project-card.tsx; src/component/project/project-detail-view.tsx; src/component/project/project-dialog.tsx; src/component/task/task-card.tsx; src/component/task/task-detail-dialog.tsx; src/component/task/task-dialog.tsx; src/component/task/task-timer.tsx; src/component/task/time-log-dialog.tsx.
- Files NOT read (out of time / out of scope): src/component/ui/**/*.tsx internals except delete-confirm-dialog references were not fully inspected; src/app/about/page.tsx, src/app/error.tsx, src/app/not-found.tsx, src/app/*/loading.tsx were not deeply traced because findings centered on curriculum feature flows; tests under src/**/__test__ were not reviewed except through search hits.
- Confidence rating rubric: High means the exact source and destination code paths were traced end-to-end by read-only inspection; Medium means the pattern is strongly supported but would benefit from runtime reproduction; Low means plausible but not reported here without stronger evidence.
