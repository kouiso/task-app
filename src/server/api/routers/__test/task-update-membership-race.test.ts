// @vitest-environment jsdom
import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ids = vi.hoisted(() => ({
  actor: 'claaaaaaaaaaaaaaaaaaaaaaa',
  assignee: 'clbbbbbbbbbbbbbbbbbbbbbbb',
  projectA: 'clccccccccccccccccccccccc',
  projectB: 'clddddddddddddddddddddddd',
  task: 'cleeeeeeeeeeeeeeeeeeeeeee',
}));
const ACTOR = ids.actor;
const ASSIGNEE = ids.assignee;
const PROJECT_A = ids.projectA;
const PROJECT_B = ids.projectB;
const TASK = ids.task;
const UPDATED_AT = new Date('2026-09-30T00:00:00.000Z');
const CLIENT_AT = new Date('2030-01-01T00:00:00.000Z');

type Role = 'MEMBER' | 'VIEWER' | null;
type Transition =
  | 'none'
  | 'remove-source-caller'
  | 'demote-source-caller'
  | 'remove-destination-caller'
  | 'remove-assignee'
  | 'move-task-with-client-time'
  | 'complete-task-with-client-time';

const state = vi.hoisted(() => ({
  sourceProjectId: ids.projectA,
  targetProjectId: ids.projectA,
  existingAssigneeId: null as string | null,
  existingStatus: 'TODO' as 'TODO' | 'DONE',
  transition: 'none' as Transition,
  sourceRole: 'MEMBER' as Role,
  destinationRole: 'MEMBER' as Role,
  assigneeInTarget: true,
  currentProjectId: ids.projectA,
  currentUpdatedAt: new Date('2026-09-30T00:00:00.000Z'),
  missingProjects: new Set<string>(),
  events: [] as string[],
}));

const mocks = vi.hoisted(() => ({
  findTask: vi.fn(),
  globalMembership: vi.fn(),
  txUpdate: vi.fn(),
}));

vi.mock('@/server/api/routers/_helpers/permission', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/api/routers/_helpers/permission')>()),
  findTaskWithPermission: mocks.findTask,
}));

vi.mock('@/lib/prisma', () => {
  const applyTransition = () => {
    if (state.transition === 'remove-source-caller') state.sourceRole = null;
    if (state.transition === 'demote-source-caller') state.sourceRole = 'VIEWER';
    if (state.transition === 'remove-destination-caller') state.destinationRole = null;
    if (state.transition === 'remove-assignee') state.assigneeInTarget = false;
    if (state.transition === 'move-task-with-client-time') {
      state.currentProjectId = ids.projectB;
      state.currentUpdatedAt = CLIENT_AT;
    }
    if (state.transition === 'complete-task-with-client-time') {
      state.currentUpdatedAt = CLIENT_AT;
    }
    state.events.push(`transition:${state.transition}`);
  };

  const membership = (userId: string, projectId: string) => {
    if (userId === ids.assignee) return state.assigneeInTarget ? { id: 'assignee-member' } : null;
    const role = projectId === state.sourceProjectId ? state.sourceRole : state.destinationRole;
    return role ? { role } : null;
  };

  const tx = {
    $queryRaw: vi.fn(async (query: { values: unknown[] }) => {
      const projectId = String(query.values[0]);
      state.events.push(`lock:${projectId}`);
      return state.missingProjects.has(projectId) ? [] : [{ id: projectId }];
    }),
    projectMember: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { userId_projectId: { userId: string; projectId: string } };
        }) => {
          const { userId, projectId } = where.userId_projectId;
          state.events.push(`tx-member:${userId}:${projectId}`);
          return membership(userId, projectId);
        },
      ),
    },
    task: {
      findFirst: vi.fn(async () => ({ position: 4 })),
      update: mocks.txUpdate,
    },
  };

  return {
    prisma: {
      user: { findUnique: vi.fn(async () => ({ id: ids.actor, role: 'USER', isActive: true })) },
      projectMember: {
        findUnique: mocks.globalMembership,
      },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => {
        applyTransition();
        return run(tx);
      }),
    },
  };
});

import { taskRouter } from '@/server/api/routers/task';

const context = () => ({
  headers: new Headers(),
  session: {
    userId: ACTOR,
    email: 'actor@example.test',
    role: 'USER' as const,
    exp: 4_102_444_800,
  },
});

const existingTask = () => ({
  id: TASK,
  title: 'before',
  status: state.existingStatus,
  projectId: state.sourceProjectId,
  assigneeId: state.existingAssigneeId,
  updatedAt: UPDATED_AT,
  project: { members: [{ role: 'MEMBER' }] },
});

beforeEach(() => {
  state.sourceProjectId = PROJECT_A;
  state.targetProjectId = PROJECT_A;
  state.existingAssigneeId = null;
  state.existingStatus = 'TODO';
  state.transition = 'none';
  state.sourceRole = 'MEMBER';
  state.destinationRole = 'MEMBER';
  state.assigneeInTarget = true;
  state.currentProjectId = PROJECT_A;
  state.currentUpdatedAt = UPDATED_AT;
  state.missingProjects.clear();
  state.events.length = 0;
  vi.clearAllMocks();
  mocks.findTask.mockImplementation(async () => existingTask());
  mocks.globalMembership.mockImplementation(
    async ({ where }: { where: { userId_projectId: { userId: string; projectId: string } } }) => {
      const { userId, projectId } = where.userId_projectId;
      state.events.push(`global-member:${userId}:${projectId}`);
      return userId === ASSIGNEE ? { id: 'stale-assignee-member' } : { role: 'MEMBER' };
    },
  );
  mocks.txUpdate.mockImplementation(
    async ({
      where,
      data,
    }: {
      where: {
        projectId?: string;
        updatedAt: Date;
        AND?: { updatedAt: Date };
      };
      data: Record<string, unknown>;
    }) => {
      const matchesCurrentRow =
        (where.projectId === undefined || where.projectId === state.currentProjectId) &&
        where.updatedAt.getTime() === state.currentUpdatedAt.getTime() &&
        (where.AND === undefined ||
          where.AND.updatedAt.getTime() === state.currentUpdatedAt.getTime());
      if (!matchesCurrentRow) {
        throw new Prisma.PrismaClientKnownRequestError('missing', {
          code: 'P2025',
          clientVersion: '6.0.0',
        });
      }
      return {
        ...existingTask(),
        ...data,
        id: TASK,
      };
    },
  );
});

describe('task.update membership linearization', () => {
  it.each([
    ['source removal', 'remove-source-caller'],
    ['source downgrade', 'demote-source-caller'],
  ] as const)('%s committed before the lock rejects the update', async (_name, transition) => {
    state.transition = transition;
    await expect(
      taskRouter.createCaller(context()).update({ id: TASK, title: 'after' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mocks.txUpdate).not.toHaveBeenCalled();
  });

  it('destination removal committed before both locks rejects a move', async () => {
    state.targetProjectId = PROJECT_B;
    state.transition = 'remove-destination-caller';
    await expect(
      taskRouter.createCaller(context()).update({ id: TASK, projectId: PROJECT_B }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mocks.txUpdate).not.toHaveBeenCalled();
  });

  it('assignee removal committed before the lock rejects a new connection', async () => {
    state.transition = 'remove-assignee';
    await expect(
      taskRouter.createCaller(context()).update({ id: TASK, assigneeId: ASSIGNEE }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mocks.txUpdate).not.toHaveBeenCalled();
  });

  it.each([
    [PROJECT_A, PROJECT_B],
    [PROJECT_B, PROJECT_A],
  ] as const)('locks reverse move %s -> %s in the same ID order', async (source, target) => {
    state.sourceProjectId = source;
    state.currentProjectId = source;
    state.targetProjectId = target;
    await taskRouter.createCaller(context()).update({ id: TASK, projectId: target });
    expect(state.events.filter((event) => event.startsWith('lock:'))).toEqual([
      `lock:${PROJECT_A}`,
      `lock:${PROJECT_B}`,
    ]);
  });

  it('normal update locks the source then checks current caller membership', async () => {
    await expect(
      taskRouter.createCaller(context()).update({ id: TASK, title: 'after' }),
    ).resolves.toMatchObject({ id: TASK, title: 'after' });
    expect(state.events).toEqual([
      'transition:none',
      `lock:${PROJECT_A}`,
      `tx-member:${ACTOR}:${PROJECT_A}`,
    ]);
    expect(mocks.txUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.txUpdate.mock.calls[0]?.[0].where).toMatchObject({
      projectId: PROJECT_A,
      updatedAt: UPDATED_AT,
      AND: { updatedAt: UPDATED_AT },
    });
  });

  it('rejects a task moved away after the authorized snapshot', async () => {
    state.transition = 'move-task-with-client-time';
    await expect(
      taskRouter.createCaller(context()).update({
        id: TASK,
        title: 'must-not-save',
        expectedUpdatedAt: CLIENT_AT.toISOString(),
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(mocks.txUpdate.mock.calls[0]?.[0].where).toMatchObject({
      projectId: PROJECT_A,
      updatedAt: CLIENT_AT,
      AND: { updatedAt: UPDATED_AT },
    });
  });

  it('rejects completedAt derived from a stale TODO snapshot', async () => {
    state.transition = 'complete-task-with-client-time';
    await expect(
      taskRouter.createCaller(context()).update({
        id: TASK,
        status: 'DONE',
        expectedUpdatedAt: CLIENT_AT.toISOString(),
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    const call = mocks.txUpdate.mock.calls[0]?.[0];
    expect(call.where).toMatchObject({
      projectId: PROJECT_A,
      updatedAt: CLIENT_AT,
      AND: { updatedAt: UPDATED_AT },
    });
    expect(call.data.completedAt).toBeInstanceOf(Date);
  });

  it('entering DONE still derives completedAt during the update', async () => {
    await taskRouter.createCaller(context()).update({ id: TASK, status: 'DONE' });
    expect(mocks.txUpdate.mock.calls[0]?.[0].data.completedAt).toBeInstanceOf(Date);
  });

  it('editing an already-DONE task does not replace completedAt', async () => {
    state.existingStatus = 'DONE';
    await taskRouter.createCaller(context()).update({ id: TASK, title: 'after', status: 'DONE' });
    expect(mocks.txUpdate.mock.calls[0]?.[0].data).not.toHaveProperty('completedAt');
  });

  it('explicit null disconnects without looking up an assignee membership', async () => {
    await taskRouter.createCaller(context()).update({ id: TASK, assigneeId: null });
    const call = mocks.txUpdate.mock.calls[0]?.[0];
    expect(call.data.assignee).toEqual({ disconnect: true });
    expect(state.events.some((event) => event.includes(`tx-member:${ASSIGNEE}:`))).toBe(false);
  });

  it('moving without assignee input disconnects an old assignee absent from destination', async () => {
    state.targetProjectId = PROJECT_B;
    state.existingAssigneeId = ASSIGNEE;
    state.assigneeInTarget = false;
    await taskRouter.createCaller(context()).update({ id: TASK, projectId: PROJECT_B });
    const call = mocks.txUpdate.mock.calls[0]?.[0];
    expect(call.data.assignee).toEqual({ disconnect: true });
    expect(call.data.position).toBe(5);
  });

  it('missing destination remains NOT_FOUND', async () => {
    state.targetProjectId = PROJECT_B;
    state.missingProjects.add(PROJECT_B);
    await expect(
      taskRouter.createCaller(context()).update({ id: TASK, projectId: PROJECT_B }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('an optimistic miss remains CONFLICT and keeps the submitted timestamp', async () => {
    const submitted = new Date('2026-09-29T00:00:00.000Z');
    mocks.txUpdate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('missing', {
        code: 'P2025',
        clientVersion: '6.0.0',
      }),
    );
    await expect(
      taskRouter.createCaller(context()).update({
        id: TASK,
        title: 'after',
        expectedUpdatedAt: submitted.toISOString(),
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(mocks.txUpdate.mock.calls[0]?.[0].where.updatedAt).toEqual(submitted);
    expect(mocks.txUpdate.mock.calls[0]?.[0].where.AND.updatedAt).toEqual(UPDATED_AT);
    expect(mocks.txUpdate.mock.calls[0]?.[0].where.projectId).toBe(PROJECT_A);
  });

  it('missing initial task remains NOT_FOUND', async () => {
    mocks.findTask.mockRejectedValueOnce(new TRPCError({ code: 'NOT_FOUND' }));
    await expect(
      taskRouter.createCaller(context()).update({ id: TASK, title: 'after' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
