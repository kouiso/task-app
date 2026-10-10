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
  calls: [] as Array<{ kind: string; where: Record<string, unknown> }>,
}));

const mocks = vi.hoisted(() => ({
  getUserProjectIds: vi.fn(async () => [ids.project]),
  projectFindMany: vi.fn(),
  taskCount: vi.fn(),
  taskAggregate: vi.fn(),
  taskFindMany: vi.fn(),
  taskGroupBy: vi.fn(),
}));

vi.mock('@/server/api/routers/_helpers/permission', () => ({
  getUserProjectIds: mocks.getUserProjectIds,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async () => ({ id: ids.actor, role: 'USER', isActive: true })),
    },
    project: { findMany: mocks.projectFindMany },
    task: {
      count: mocks.taskCount,
      aggregate: mocks.taskAggregate,
      findMany: mocks.taskFindMany,
      groupBy: mocks.taskGroupBy,
    },
  },
}));

import { reportRouter } from '@/server/api/routers/report';

const caller = () =>
  reportRouter.createCaller({
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

const authorized = (kind: string, where: Record<string, unknown>) => {
  state.calls.push({ kind, where });
  if (state.readError) throw state.readError;
  return hasCurrentMembership(where) && state.currentMember;
};

beforeEach(() => {
  vi.clearAllMocks();
  state.currentMember = true;
  state.readError = null;
  state.calls.length = 0;
  mocks.getUserProjectIds.mockResolvedValue([ids.project]);
  mocks.projectFindMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    authorized('project.findMany', where)
      ? [{ id: ids.project, name: 'Current project' }]
      : hasCurrentMembership(where)
        ? []
        : [{ id: ids.project, name: 'Leaked project' }],
  );
  mocks.taskCount.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    authorized('task.count', where) || !hasCurrentMembership(where) ? 1 : 0,
  );
  mocks.taskAggregate.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => ({
    _sum: {
      timeSpentMinutes:
        authorized('task.aggregate', where) || !hasCurrentMembership(where) ? 60 : null,
    },
  }));
  mocks.taskFindMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    authorized('task.findMany', where) || !hasCurrentMembership(where)
      ? [{ id: ids.task, title: 'Current task', status: 'DONE', priority: 'HIGH' }]
      : [],
  );
  mocks.taskGroupBy.mockImplementation(
    async ({ by, where }: { by: string[]; where: Record<string, unknown> }) => {
      const visible =
        authorized(`task.groupBy:${by.join(',')}`, where) || !hasCurrentMembership(where);
      if (!visible) return [];
      if (by[0] === 'status') return [{ status: 'DONE', _count: { _all: 1 } }];
      if (by[0] === 'priority') return [{ priority: 'HIGH', _count: { _all: 1 } }];
      return [{ projectId: ids.project, _count: { _all: 1 }, _sum: { timeSpentMinutes: 60 } }];
    },
  );
});

describe('report.getOverview current authorization', () => {
  it('returns no project or task aggregates after membership removal', async () => {
    state.currentMember = false;

    await expect(caller().getOverview()).resolves.toMatchObject({
      totalProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      recentTasks: [],
      statusData: [],
      priorityData: [],
      projectStats: [],
    });
    expect(state.calls).toHaveLength(12);
    expect(state.calls.every((call) => hasCurrentMembership(call.where))).toBe(true);
    expect(mocks.getUserProjectIds).not.toHaveBeenCalled();
  });

  it('preserves active-project and non-cancelled filters for an authorized member', async () => {
    const result = await caller().getOverview();

    expect(result.totalProjects).toBe(1);
    expect(result.recentTasks).toHaveLength(1);
    expect(state.calls).toHaveLength(12);
    expect(state.calls.every((call) => hasCurrentMembership(call.where))).toBe(true);
    expect(state.calls[0]?.where).toMatchObject({ isArchived: false });
    const activeCalls = state.calls.filter((call) =>
      [
        'task.count',
        'task.aggregate',
        'task.findMany',
        'task.groupBy:status',
        'task.groupBy:priority',
      ].includes(call.kind),
    );
    expect(activeCalls.some((call) => JSON.stringify(call.where).includes('CANCELLED'))).toBe(true);
  });

  it('does not swallow a report database failure', async () => {
    state.readError = new Error('report database read failed');

    await expect(caller().getOverview()).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'report database read failed',
    });
  });
});
