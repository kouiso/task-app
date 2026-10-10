// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ids = vi.hoisted(() => ({
  actor: 'claaaaaaaaaaaaaaaaaaaaaaa',
  project: 'clbbbbbbbbbbbbbbbbbbbbbbb',
  task: 'clccccccccccccccccccccccc',
}));

const state = vi.hoisted(() => ({
  currentMember: true,
  readError: null as Error | null,
}));

const mocks = vi.hoisted(() => ({
  getUserProjectIds: vi.fn(async () => [ids.project]),
  taskFindMany: vi.fn(),
  projectFindMany: vi.fn(async () => []),
}));

vi.mock('@/server/api/routers/_helpers/permission', () => ({
  getUserProjectIds: mocks.getUserProjectIds,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async () => ({ id: ids.actor, role: 'USER', isActive: true })),
    },
    task: { findMany: mocks.taskFindMany },
    project: { findMany: mocks.projectFindMany },
    projectMember: { findMany: vi.fn(async () => []) },
  },
}));

import { searchRouter } from '@/server/api/routers/search';

const caller = () =>
  searchRouter.createCaller({
    headers: new Headers(),
    session: { userId: ids.actor, role: 'USER' as const },
  });

const hasCurrentMembership = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(hasCurrentMembership);
  if (typeof value !== 'object' || value === null) return false;

  const record = value as Record<string, unknown>;
  const members = record['members'];
  if (typeof members === 'object' && members !== null) {
    const some = (members as Record<string, unknown>)['some'];
    if (typeof some === 'object' && some !== null) {
      return (some as Record<string, unknown>)['userId'] === ids.actor;
    }
  }
  return Object.values(record).some(hasCurrentMembership);
};

beforeEach(() => {
  vi.clearAllMocks();
  state.currentMember = true;
  state.readError = null;
  mocks.getUserProjectIds.mockResolvedValue([ids.project]);
  mocks.projectFindMany.mockResolvedValue([]);
  mocks.taskFindMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    if (state.readError) throw state.readError;
    const authorized = hasCurrentMembership(where) && state.currentMember;
    return authorized || !hasCurrentMembership(where)
      ? [{ id: ids.task, projectId: ids.project, title: 'current result' }]
      : [];
  });
});

describe('search task reads use current membership', () => {
  it.each([
    ['search', () => caller().search({ keyword: 'current' })],
    ['quickSearch', () => caller().quickSearch({ keyword: 'current' })],
  ] as const)('%s excludes tasks after membership removal', async (_name, run) => {
    state.currentMember = false;

    await expect(run()).resolves.toMatchObject({ tasks: [], totalCount: 0 });
    expect(mocks.getUserProjectIds).not.toHaveBeenCalled();
  });

  it('keeps caller filters and current membership in the normal search statement', async () => {
    const result = await caller().search({
      keyword: 'current',
      projectId: ids.project,
      status: 'TODO',
      priority: 'HIGH',
    });

    expect(result.tasks).toHaveLength(1);
    const where = mocks.taskFindMany.mock.calls[0]?.[0].where;
    expect(where.AND[0]).toEqual({ project: { members: { some: { userId: ids.actor } } } });
    expect(where.AND[1]).toMatchObject({
      projectId: ids.project,
      status: 'TODO',
      priority: 'HIGH',
    });
  });

  it('does not swallow a task-read database failure', async () => {
    state.readError = new Error('search database read failed');

    await expect(caller().quickSearch({ keyword: 'current' })).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'search database read failed',
    });
  });
});
