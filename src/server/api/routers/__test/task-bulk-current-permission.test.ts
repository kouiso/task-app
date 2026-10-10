// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ids = vi.hoisted(() => ({
  actor: 'claaaaaaaaaaaaaaaaaaaaaaa',
  a: 'clbbbbbbbbbbbbbbbbbbbbbbb',
  b: 'clccccccccccccccccccccccc',
  one: 'clddddddddddddddddddddddd',
  two: 'cleeeeeeeeeeeeeeeeeeeeeee',
}));
interface Row {
  id: string;
  projectId: string;
  status: string;
  completedAt: Date | null;
}
interface Where {
  id?: { in: string[] };
  OR?: { id: string; projectId: string }[];
  project: { members: { some: { role: { in: string[] } } } };
  status?: string | { not: string };
}
interface Write {
  where: Where;
  data?: { status?: string; completedAt?: Date | null };
}
const state = vi.hoisted(() => ({
  currentRole: 'OWNER' as string | null,
  statementRole: 'OWNER' as string | null,
  rows: [] as Row[],
  snapshots: [] as { id: string; projectId: string; project: { members: { role: string }[] } }[],
  events: [] as string[],
}));
const snapshots = vi.hoisted(() => vi.fn());
vi.mock('@/server/api/routers/_helpers/permission', async (original) => ({
  ...(await original<typeof import('@/server/api/routers/_helpers/permission')>()),
  findTasksWithPermission: snapshots,
}));
const matches = (row: Row, where: Where) => {
  if (!state.statementRole || !where.project.members.some.role.in.includes(state.statementRole))
    return false;
  if (
    where.OR &&
    !where.OR.some((target) => target.id === row.id && target.projectId === row.projectId)
  )
    return false;
  if (where.id && !where.id.in.includes(row.id)) return false;
  return (
    !where.status ||
    (typeof where.status === 'string'
      ? row.status === where.status
      : row.status !== where.status.not)
  );
};
vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: vi.fn(async (query: { values: unknown[] }) => {
      const projectId = String(query.values[0]);
      state.events.push(`lock:${projectId}`);
      state.statementRole = state.currentRole;
      return [{ id: projectId }];
    }),
    task: {
      updateMany: vi.fn(async ({ where, data }: Write) => {
        state.events.push('update');
        let count = 0;
        for (const row of state.rows) {
          if (!matches(row, where)) continue;
          count++;
          if (data?.status !== undefined) row.status = data.status;
          if (data?.completedAt !== undefined) row.completedAt = data.completedAt;
        }
        return { count };
      }),
      deleteMany: vi.fn(async ({ where }: Write) => {
        state.events.push('delete');
        const selected = state.rows.filter((row) => matches(row, where));
        state.rows = state.rows.filter((row) => !selected.includes(row));
        return { count: selected.length };
      }),
    },
  };
  return {
    prisma: {
      user: { findUnique: vi.fn(async () => ({ id: ids.actor, role: 'USER', isActive: true })) },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => {
        state.events.push('begin');
        const before = state.rows.map((row) => ({ ...row }));
        try {
          return await run(tx);
        } catch (error: unknown) {
          state.rows = before;
          throw error;
        }
      }),
    },
  };
});

import { taskRouter } from '@/server/api/routers/task';

const caller = () =>
  taskRouter.createCaller({
    headers: new Headers(),
    session: { userId: ids.actor, role: 'USER' as const },
  });
const methods = ['complete', 'delete', 'status'] as const;
const invoke = (method: (typeof methods)[number]) => {
  const client = caller(),
    input = { ids: state.snapshots.map((row) => row.id) };
  return method === 'complete'
    ? client.bulkComplete(input)
    : method === 'delete'
      ? client.bulkDelete(input)
      : client.bulkUpdateStatus({ ...input, status: 'IN_PROGRESS' });
};
beforeEach(() => {
  vi.clearAllMocks();
  state.currentRole = 'OWNER';
  state.statementRole = 'OWNER';
  state.rows = [{ id: ids.one, projectId: ids.a, status: 'TODO', completedAt: null }];
  state.snapshots = state.rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    project: { members: [{ role: 'OWNER' }] },
  }));
  state.events.length = 0;
  snapshots.mockImplementation(async () => {
    state.events.push('snapshot');
    return state.snapshots;
  });
});
describe.each(methods)('bulk %s current project permission', (method) => {
  it('locks the project before its permission-bearing write', async () => {
    await expect(invoke(method)).resolves.toEqual({ count: 1 });
    expect(state.events.slice(0, 3)).toEqual(['snapshot', 'begin', `lock:${ids.a}`]);
  });
  it.each([
    null,
    'VIEWER',
  ])('rejects committed membership removal/demotion %s despite old OWNER snapshot', async (role) => {
    state.currentRole = role;
    await expect(invoke(method)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(state.rows).toEqual([
      { id: ids.one, projectId: ids.a, status: 'TODO', completedAt: null },
    ]);
  });
  it('binds every selected id to the project that was locked', async () => {
    state.rows = [{ id: ids.one, projectId: ids.b, status: 'TODO', completedAt: null }];
    await expect(invoke(method)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(state.rows[0]).toMatchObject({ projectId: ids.b, status: 'TODO' });
  });
  it('locks multiple projects in deterministic order', async () => {
    state.rows = [
      { id: ids.one, projectId: ids.b, status: 'TODO', completedAt: null },
      { id: ids.two, projectId: ids.a, status: 'TODO', completedAt: null },
    ];
    state.snapshots = state.rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      project: { members: [{ role: 'OWNER' }] },
    }));
    await expect(invoke(method)).resolves.toEqual({ count: 2 });
    expect(state.events.filter((event) => event.startsWith('lock:'))).toEqual([
      `lock:${ids.a}`,
      `lock:${ids.b}`,
    ]);
  });
});
