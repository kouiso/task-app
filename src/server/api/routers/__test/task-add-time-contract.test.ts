// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ids = vi.hoisted(() => ({
  actor: 'claaaaaaaaaaaaaaaaaaaaaaa',
  projectA: 'clbbbbbbbbbbbbbbbbbbbbbbb',
  projectB: 'clccccccccccccccccccccccc',
  task: 'clddddddddddddddddddddddd',
}));

type Role = 'MEMBER' | 'VIEWER' | null;
type Transition = 'none' | 'remove-caller' | 'downgrade-caller' | 'move-task';

const state = vi.hoisted(() => ({
  callerRole: 'MEMBER' as Role,
  currentProjectId: ids.projectA,
  transition: 'none' as Transition,
  projectExists: true,
  totalMinutes: 0,
  events: [] as string[],
  transactionTail: Promise.resolve() as Promise<unknown>,
}));

const mocks = vi.hoisted(() => ({
  findTask: vi.fn(),
  globalTaskUpdate: vi.fn(),
  txTaskUpdate: vi.fn(),
}));

vi.mock('@/server/api/routers/_helpers/permission', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/api/routers/_helpers/permission')>()),
  findTaskWithPermission: mocks.findTask,
}));

vi.mock('@/lib/prisma', () => {
  const applyTransition = () => {
    if (state.transition === 'remove-caller') state.callerRole = null;
    if (state.transition === 'downgrade-caller') state.callerRole = 'VIEWER';
    if (state.transition === 'move-task') state.currentProjectId = ids.projectB;
    state.events.push(`transition:${state.transition}`);
  };

  const tx = {
    $queryRaw: vi.fn(async (query: { values: unknown[] }) => {
      const projectId = String(query.values[0]);
      state.events.push(`lock:${projectId}`);
      return state.projectExists ? [{ id: projectId }] : [];
    }),
    projectMember: {
      findUnique: vi.fn(async () => {
        state.events.push('read-current-caller');
        return state.callerRole ? { role: state.callerRole } : null;
      }),
    },
    task: { update: mocks.txTaskUpdate },
  };

  return {
    prisma: {
      user: {
        findUnique: vi.fn(async () => ({
          id: ids.actor,
          role: 'USER',
          isActive: true,
        })),
      },
      task: { update: mocks.globalTaskUpdate },
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => {
        const execute = async () => {
          state.events.push('begin-transaction');
          applyTransition();
          return await run(tx);
        };
        const result = state.transactionTail.then(execute, execute);
        state.transactionTail = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      }),
    },
  };
});

import { taskRouter } from '@/server/api/routers/task';

const context = () => ({
  headers: new Headers(),
  session: {
    userId: ids.actor,
    email: 'actor@example.test',
    role: 'USER' as const,
    exp: 4_102_444_800,
  },
});

beforeEach(() => {
  state.callerRole = 'MEMBER';
  state.currentProjectId = ids.projectA;
  state.transition = 'none';
  state.projectExists = true;
  state.totalMinutes = 0;
  state.events.length = 0;
  state.transactionTail = Promise.resolve();
  vi.clearAllMocks();

  mocks.findTask.mockImplementation(async () => {
    state.events.push('read-authorized-snapshot');
    return {
      id: ids.task,
      projectId: ids.projectA,
      project: { members: [{ role: 'MEMBER' }] },
    };
  });
  mocks.globalTaskUpdate.mockImplementation(
    async ({ data }: { data: { timeSpentMinutes: { increment: number } } }) => {
      state.events.push('update-without-lock');
      state.totalMinutes += data.timeSpentMinutes.increment;
      return {
        id: ids.task,
        projectId: state.currentProjectId,
        timeSpentMinutes: state.totalMinutes,
      };
    },
  );
  mocks.txTaskUpdate.mockImplementation(
    async ({
      where,
      data,
    }: {
      where: {
        id: string;
        projectId?: string;
        timeSpentMinutes?: { lte: number };
        updatedAt?: Date;
        AND?: unknown;
      };
      data: { timeSpentMinutes: { increment: number } };
    }) => {
      state.events.push('increment-task');
      if (
        where.projectId !== state.currentProjectId ||
        (where.timeSpentMinutes !== undefined && state.totalMinutes > where.timeSpentMinutes.lte)
      ) {
        throw new Prisma.PrismaClientKnownRequestError('missing', {
          code: 'P2025',
          clientVersion: '6.0.0',
        });
      }
      state.totalMinutes += data.timeSpentMinutes.increment;
      return {
        id: ids.task,
        projectId: where.projectId,
        timeSpentMinutes: state.totalMinutes,
      };
    },
  );
});

describe('task.addTime contract', () => {
  it('keeps source and distributed scaffold byte-identical', () => {
    const source = readFileSync(resolve('src/server/api/routers/task.ts'), 'utf8');
    const scaffold = readFileSync(resolve('scripts/_server-routers/task.ts'), 'utf8');

    expect(scaffold).toBe(source);
  });

  it.each([
    0,
    -1,
    0.5,
    Number.MAX_SAFE_INTEGER + 1,
    Number.POSITIVE_INFINITY,
    Number.NaN,
  ])('rejects invalid minutes %s before reading the task', async (minutesToAdd) => {
    await expect(
      taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mocks.findTask).not.toHaveBeenCalled();
    expect(mocks.globalTaskUpdate).not.toHaveBeenCalled();
    expect(mocks.txTaskUpdate).not.toHaveBeenCalled();
  });

  it('locks the snapshot project and checks current permission before incrementing', async () => {
    await expect(
      taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd: 30 }),
    ).resolves.toMatchObject({ timeSpentMinutes: 30 });

    expect(state.events).toEqual([
      'read-authorized-snapshot',
      'begin-transaction',
      'transition:none',
      `lock:${ids.projectA}`,
      'read-current-caller',
      'increment-task',
    ]);
    expect(mocks.globalTaskUpdate).not.toHaveBeenCalled();
    expect(mocks.txTaskUpdate.mock.calls[0]?.[0].where).toEqual({
      id: ids.task,
      projectId: ids.projectA,
      timeSpentMinutes: { lte: Number.MAX_SAFE_INTEGER - 30 },
    });
  });

  it.each([
    ['removed', 'remove-caller'],
    ['downgraded', 'downgrade-caller'],
  ] as const)('rejects a caller %s before the project lock', async (_label, transition) => {
    state.transition = transition;

    await expect(
      taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd: 15 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mocks.txTaskUpdate).not.toHaveBeenCalled();
  });

  it('rejects a task moved away from the authorized project snapshot', async () => {
    state.transition = 'move-task';

    await expect(
      taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd: 15 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(state.totalMinutes).toBe(0);
    expect(mocks.txTaskUpdate.mock.calls[0]?.[0].where).toEqual({
      id: ids.task,
      projectId: ids.projectA,
      timeSpentMinutes: { lte: Number.MAX_SAFE_INTEGER - 15 },
    });
  });

  it('rejects when the authorized project row no longer exists', async () => {
    state.projectExists = false;

    await expect(
      taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd: 15 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(mocks.txTaskUpdate).not.toHaveBeenCalled();
  });

  it('keeps both legitimate parallel increments without an updatedAt predicate', async () => {
    await expect(
      Promise.all([
        taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd: 20 }),
        taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd: 25 }),
      ]),
    ).resolves.toHaveLength(2);

    expect(state.totalMinutes).toBe(45);
    expect(mocks.txTaskUpdate).toHaveBeenCalledTimes(2);
    for (const [call] of mocks.txTaskUpdate.mock.calls) {
      expect(call.where).toEqual({
        id: ids.task,
        projectId: ids.projectA,
        timeSpentMinutes: {
          lte: Number.MAX_SAFE_INTEGER - call.data.timeSpentMinutes.increment,
        },
      });
      expect(call.where).not.toHaveProperty('updatedAt');
      expect(call.where).not.toHaveProperty('AND');
    }
  });
});

describe('task.addTime precision boundaries', () => {
  it('rejects an unsafe aggregate without changing it', async () => {
    state.totalMinutes = Number.MAX_SAFE_INTEGER;
    await expect(
      taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd: 1 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(state.totalMinutes).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('rejects an existing aggregate beyond exact integer precision', async () => {
    state.totalMinutes = 2 ** 53;
    await expect(
      taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd: 1 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(state.totalMinutes).toBe(2 ** 53);
  });
  it('allows the last exactly representable safe minute', async () => {
    state.totalMinutes = Number.MAX_SAFE_INTEGER - 1;
    await expect(
      taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd: 1 }),
    ).resolves.toMatchObject({ timeSpentMinutes: Number.MAX_SAFE_INTEGER });
  });
  it('retains existing Float fractional totals without introducing an integer-only storage rule', async () => {
    state.totalMinutes = 0.5;
    await expect(
      taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd: 1 }),
    ).resolves.toMatchObject({ timeSpentMinutes: 1.5 });
  });
  it('allows only one of two concurrent minutes at the precision boundary', async () => {
    state.totalMinutes = Number.MAX_SAFE_INTEGER - 1;
    const results = await Promise.allSettled([
      taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd: 1 }),
      taskRouter.createCaller(context()).addTime({ id: ids.task, minutesToAdd: 1 }),
    ]);
    expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((x) => x.status === 'rejected');
    expect(rejected && rejected.status === 'rejected' ? rejected.reason : undefined).toMatchObject({
      code: 'CONFLICT',
    });
    expect(state.totalMinutes).toBe(Number.MAX_SAFE_INTEGER);
  });
});
