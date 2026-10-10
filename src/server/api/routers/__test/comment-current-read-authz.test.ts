// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ids = vi.hoisted(() => ({
  actor: 'claaaaaaaaaaaaaaaaaaaaaaa',
  projectA: 'clbbbbbbbbbbbbbbbbbbbbbbb',
  projectB: 'clccccccccccccccccccccccc',
  task: 'clddddddddddddddddddddddd',
  comment: 'cleeeeeeeeeeeeeeeeeeeeeee',
}));

type Role = 'MEMBER' | 'VIEWER' | null;
const state = vi.hoisted(() => ({
  snapshotProjectId: ids.projectA,
  snapshotRole: 'MEMBER' as Role,
  currentProjectId: ids.projectA,
  currentRole: 'MEMBER' as Role,
  currentTaskExists: true,
  comments: [{ id: ids.comment, taskId: ids.task, content: 'current comment' }],
  readError: null as Error | null,
  events: [] as string[],
}));

const mocks = vi.hoisted(() => ({
  taskFindUnique: vi.fn(),
  commentFindMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async () => ({ id: ids.actor, role: 'USER', isActive: true })),
    },
    task: { findUnique: mocks.taskFindUnique },
    comment: { findMany: mocks.commentFindMany },
  },
}));

import { commentRouter } from '@/server/api/routers/comment';

const caller = () =>
  commentRouter.createCaller({
    headers: new Headers(),
    session: { userId: ids.actor, role: 'USER' as const },
  });

const taskRecord = (projectId: string, role: Role) => ({
  id: ids.task,
  projectId,
  project: { members: role ? [{ role }] : [] },
});

beforeEach(() => {
  vi.clearAllMocks();
  state.snapshotProjectId = ids.projectA;
  state.snapshotRole = 'MEMBER';
  state.currentProjectId = ids.projectA;
  state.currentRole = 'MEMBER';
  state.currentTaskExists = true;
  state.comments = [{ id: ids.comment, taskId: ids.task, content: 'current comment' }];
  state.readError = null;
  state.events.length = 0;

  mocks.taskFindUnique.mockImplementation(async () => {
    const afterCommentRead = state.events.includes('read-current-comments');
    state.events.push(afterCommentRead ? 'recheck-current-task' : 'read-task-snapshot');
    if (afterCommentRead && !state.currentTaskExists) return null;
    return afterCommentRead
      ? taskRecord(state.currentProjectId, state.currentRole)
      : taskRecord(state.snapshotProjectId, state.snapshotRole);
  });
  mocks.commentFindMany.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => {
      state.events.push('read-current-comments');
      if (state.readError) throw state.readError;

      const asRecord = (value: unknown) =>
        typeof value === 'object' && value !== null
          ? (value as Record<string, unknown>)
          : undefined;
      const task = asRecord(where)?.['task'];
      const project = asRecord(task)?.['project'];
      const members = asRecord(project)?.['members'];
      const some = asRecord(members)?.['some'];
      const membershipUserId = asRecord(some)?.['userId'];

      if (membershipUserId !== ids.actor) {
        return state.comments;
      }
      return state.currentRole ? state.comments : [];
    },
  );
});

describe('comment.getByTaskId current authorization', () => {
  it('rejects after membership was removed from an authorized snapshot', async () => {
    state.currentRole = null;

    await expect(caller().getByTaskId({ taskId: ids.task })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(state.events).toEqual(['read-current-comments', 'recheck-current-task']);
  });

  it('rejects after the task moved to a project without current membership', async () => {
    state.currentProjectId = ids.projectB;
    state.currentRole = null;

    await expect(caller().getByTaskId({ taskId: ids.task })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(state.events).toEqual(['read-current-comments', 'recheck-current-task']);
  });

  it('returns comments through the membership-constrained read', async () => {
    state.currentRole = 'VIEWER';

    await expect(caller().getByTaskId({ taskId: ids.task })).resolves.toEqual(state.comments);
    expect(state.events).toEqual(['read-current-comments']);
    expect(mocks.commentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          taskId: ids.task,
          task: { project: { members: { some: { userId: ids.actor } } } },
        },
      }),
    );
  });

  it('keeps NOT_FOUND when the task disappeared before the empty-result recheck', async () => {
    state.currentTaskExists = false;
    state.comments = [];

    await expect(caller().getByTaskId({ taskId: ids.task })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(state.events).toEqual(['read-current-comments', 'recheck-current-task']);
  });

  it('returns an authorized empty list after a current membership recheck', async () => {
    state.comments = [];

    await expect(caller().getByTaskId({ taskId: ids.task })).resolves.toEqual([]);
    expect(state.events).toEqual(['read-current-comments', 'recheck-current-task']);
  });

  it('does not swallow a database read failure', async () => {
    const failure = new Error('database read failed');
    state.readError = failure;

    await expect(caller().getByTaskId({ taskId: ids.task })).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: failure.message,
    });
    expect(state.events).toEqual(['read-current-comments']);
  });
});
