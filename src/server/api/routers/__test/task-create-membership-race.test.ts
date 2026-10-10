// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ACTOR = 'claaaaaaaaaaaaaaaaaaaaaaa';
const ASSIGNEE = 'clbbbbbbbbbbbbbbbbbbbbbbb';
const PROJECT = 'clccccccccccccccccccccccc';

const state = vi.hoisted(() => ({
  projectExists: true,
  callerRole: 'MEMBER' as 'MEMBER' | 'VIEWER' | null,
  assigneeMember: true,
  searchMembers: [] as Array<{
    user: { id: string; name: string | null; email: string };
  }>,
  events: [] as string[],
}));

const mocks = vi.hoisted(() => ({
  legacyProjectFind: vi.fn(),
  legacyMembershipFind: vi.fn(),
  memberListFind: vi.fn(),
  taskCreate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: vi.fn(async () => {
      state.events.push('lock-project');
      return state.projectExists ? [{ id: PROJECT }] : [];
    }),
    projectMember: {
      findUnique: vi.fn(async ({ where }: { where: { userId_projectId: { userId: string } } }) => {
        const userId = where.userId_projectId.userId;
        if (userId === ACTOR) {
          state.events.push('read-current-caller');
          return state.callerRole ? { role: state.callerRole } : null;
        }
        state.events.push('read-current-assignee');
        return state.assigneeMember ? { id: 'assignee-membership' } : null;
      }),
    },
    task: {
      findFirst: vi.fn(async () => {
        state.events.push('read-position');
        return null;
      }),
      create: mocks.taskCreate,
    },
  };

  return {
    prisma: {
      user: {
        findUnique: vi.fn(async () => ({ id: ACTOR, role: 'USER', isActive: true })),
      },
      project: { findUnique: mocks.legacyProjectFind },
      projectMember: {
        findUnique: mocks.legacyMembershipFind,
        findMany: mocks.memberListFind,
      },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => {
        state.events.push('begin-transaction');
        return run(tx);
      }),
    },
  };
});

import { searchRouter } from '@/server/api/routers/search';
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

beforeEach(() => {
  state.projectExists = true;
  state.callerRole = 'MEMBER';
  state.assigneeMember = true;
  state.searchMembers = [{ user: { id: ACTOR, name: 'Actor', email: 'actor@example.test' } }];
  state.events.length = 0;
  vi.clearAllMocks();

  // 修正前の create が読むロック外スナップショットです。
  mocks.legacyProjectFind.mockImplementation(async () => {
    state.events.push('read-stale-project');
    return state.projectExists ? { id: PROJECT, members: [{ role: 'MEMBER' }] } : null;
  });
  mocks.legacyMembershipFind.mockImplementation(async () => {
    state.events.push('read-stale-membership');
    return { id: 'stale-membership' };
  });
  mocks.memberListFind.mockImplementation(async () => state.searchMembers);
  mocks.taskCreate.mockImplementation(async ({ data }: { data: { assignee?: unknown } }) => {
    state.events.push('create-task');
    return { id: 'task-created', assigneeId: data.assignee ? ASSIGNEE : null };
  });
});

describe('task.create membership snapshot', () => {
  it('locks before reading caller permission and creates without an assignee', async () => {
    const result = await taskRouter.createCaller(context()).create({
      title: 'normal create',
      projectId: PROJECT,
    });

    expect(result).toMatchObject({ id: 'task-created', assigneeId: null });
    expect(state.events).toEqual([
      'begin-transaction',
      'lock-project',
      'read-position',
      'read-current-caller',
      'create-task',
    ]);
    expect(mocks.legacyProjectFind).not.toHaveBeenCalled();
    expect(mocks.legacyMembershipFind).not.toHaveBeenCalled();
  });

  it('checks the assignee through the locked transaction before creating', async () => {
    const result = await taskRouter.createCaller(context()).create({
      title: 'assigned create',
      projectId: PROJECT,
      assigneeId: ASSIGNEE,
    });

    expect(result).toMatchObject({ id: 'task-created', assigneeId: ASSIGNEE });
    expect(state.events.indexOf('lock-project')).toBeLessThan(
      state.events.indexOf('read-current-assignee'),
    );
    expect(state.events.indexOf('read-current-assignee')).toBeLessThan(
      state.events.indexOf('create-task'),
    );
  });

  it.each([
    ['removed', null],
    ['downgraded', 'VIEWER'],
  ] as const)('rejects a caller whose membership is %s after the lock', async (_label, role) => {
    state.callerRole = role;

    await expect(
      taskRouter.createCaller(context()).create({ title: 'forbidden', projectId: PROJECT }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(state.events.slice(0, 4)).toEqual([
      'begin-transaction',
      'lock-project',
      'read-position',
      'read-current-caller',
    ]);
    expect(mocks.taskCreate).not.toHaveBeenCalled();
  });

  it('rejects an assignee removed before the project lock is acquired', async () => {
    state.assigneeMember = false;

    await expect(
      taskRouter.createCaller(context()).create({
        title: 'removed assignee',
        projectId: PROJECT,
        assigneeId: ASSIGNEE,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mocks.taskCreate).not.toHaveBeenCalled();
  });

  it('keeps NOT_FOUND when the project row cannot be locked', async () => {
    state.projectExists = false;

    await expect(
      taskRouter.createCaller(context()).create({ title: 'missing project', projectId: PROJECT }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(state.events).toEqual(['begin-transaction', 'lock-project']);
    expect(mocks.taskCreate).not.toHaveBeenCalled();
  });
});

describe('search.getMembersByProject membership filter', () => {
  it('constrains the returned rows by caller membership in the same findMany call', async () => {
    const result = await searchRouter.createCaller(context()).getMembersByProject({
      projectId: PROJECT,
    });

    expect(result).toEqual([{ id: ACTOR, name: 'Actor', email: 'actor@example.test' }]);
    expect(mocks.memberListFind).toHaveBeenCalledWith({
      where: {
        projectId: PROJECT,
        project: { members: { some: { userId: ACTOR } } },
      },
      select: { user: { select: expect.any(Object) } },
      orderBy: { user: { name: 'asc' } },
    });
    expect(mocks.legacyMembershipFind).not.toHaveBeenCalled();
  });

  it('rejects when the membership-constrained query returns no rows', async () => {
    state.searchMembers = [];

    await expect(
      searchRouter.createCaller(context()).getMembersByProject({ projectId: PROJECT }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
