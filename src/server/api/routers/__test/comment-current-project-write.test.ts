// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ids = vi.hoisted(() => ({
  actor: 'claaaaaaaaaaaaaaaaaaaaaaa',
  other: 'clbbbbbbbbbbbbbbbbbbbbbbb',
  projectA: 'clccccccccccccccccccccccc',
  projectB: 'clddddddddddddddddddddddd',
  task: 'cleeeeeeeeeeeeeeeeeeeeeee',
  comment: 'clfffffffffffffffffffffff',
}));

type Role = 'MEMBER' | 'VIEWER' | null;
const state = vi.hoisted(() => ({
  snapshotRole: 'MEMBER' as Role,
  currentRole: 'MEMBER' as Role,
  snapshotProjectId: ids.projectA,
  currentProjectId: ids.projectA,
  snapshotOwnerId: ids.actor,
  currentOwnerId: ids.actor,
  projectExists: true,
  taskExists: true,
  commentExists: true,
  throwWriteP2025: false,
  wrote: false,
  events: [] as string[],
}));

const mocks = vi.hoisted(() => ({
  globalCreate: vi.fn(),
  globalUpdate: vi.fn(),
  globalDelete: vi.fn(),
  txCreate: vi.fn(),
  txUpdate: vi.fn(),
  txDelete: vi.fn(),
}));

const taskRecord = (projectId: string, role: Role) => ({
  id: ids.task,
  projectId,
  project: { members: role ? [{ role }] : [] },
});

const commentRecord = (projectId: string, role: Role, userId: string) => ({
  id: ids.comment,
  userId,
  taskId: ids.task,
  task: taskRecord(projectId, role),
});

vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: vi.fn(async () => {
      state.events.push('lock-project');
      return state.projectExists ? [{ id: state.snapshotProjectId }] : [];
    }),
    task: {
      findUnique: vi.fn(async () => {
        state.events.push('read-current-task');
        return state.taskExists ? taskRecord(state.currentProjectId, state.currentRole) : null;
      }),
    },
    comment: {
      findUnique: vi.fn(async () => {
        state.events.push('read-current-comment');
        return state.commentExists
          ? commentRecord(state.currentProjectId, state.currentRole, state.currentOwnerId)
          : null;
      }),
      create: mocks.txCreate,
      update: mocks.txUpdate,
      delete: mocks.txDelete,
    },
  };

  return {
    prisma: {
      user: {
        findUnique: vi.fn(async () => ({ id: ids.actor, role: 'USER', isActive: true })),
      },
      task: {
        findUnique: vi.fn(async () => {
          state.events.push('read-task-snapshot');
          return taskRecord(state.snapshotProjectId, state.snapshotRole);
        }),
      },
      comment: {
        findUnique: vi.fn(async () => {
          state.events.push('read-comment-snapshot');
          return commentRecord(state.snapshotProjectId, state.snapshotRole, state.snapshotOwnerId);
        }),
        findMany: vi.fn(),
        create: mocks.globalCreate,
        update: mocks.globalUpdate,
        delete: mocks.globalDelete,
      },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => {
        state.events.push('begin-transaction');
        return await run(tx);
      }),
    },
  };
});

import { commentRouter } from '@/server/api/routers/comment';

const caller = () =>
  commentRouter.createCaller({
    headers: new Headers(),
    session: { userId: ids.actor, role: 'USER' as const },
  });

const p2025 = () =>
  new Prisma.PrismaClientKnownRequestError('missing', {
    code: 'P2025',
    clientVersion: '6',
  });

beforeEach(() => {
  vi.clearAllMocks();
  state.snapshotRole = 'MEMBER';
  state.currentRole = 'MEMBER';
  state.snapshotProjectId = ids.projectA;
  state.currentProjectId = ids.projectA;
  state.snapshotOwnerId = ids.actor;
  state.currentOwnerId = ids.actor;
  state.projectExists = true;
  state.taskExists = true;
  state.commentExists = true;
  state.throwWriteP2025 = false;
  state.wrote = false;
  state.events.length = 0;

  const write = async () => {
    if (state.throwWriteP2025) throw p2025();
    state.wrote = true;
    return { id: ids.comment, content: 'updated', user: { id: ids.actor } };
  };
  mocks.globalCreate.mockImplementation(write);
  mocks.globalUpdate.mockImplementation(write);
  mocks.globalDelete.mockImplementation(write);
  mocks.txCreate.mockImplementation(async () => {
    state.events.push('create-comment');
    return await write();
  });
  mocks.txUpdate.mockImplementation(async () => {
    state.events.push('update-comment');
    return await write();
  });
  mocks.txDelete.mockImplementation(async () => {
    state.events.push('delete-comment');
    return await write();
  });
});

describe('comment writes use current project authorization', () => {
  it('keeps source and distributed scaffold byte-identical', () => {
    expect(readFileSync(resolve('scripts/_server-routers/comment.ts'), 'utf8')).toBe(
      readFileSync(resolve('src/server/api/routers/comment.ts'), 'utf8'),
    );
  });

  it('creates only after locking and rereading the task', async () => {
    await expect(caller().create({ taskId: ids.task, content: 'progress' })).resolves.toMatchObject(
      {
        id: ids.comment,
      },
    );
    expect(state.events).toEqual([
      'read-task-snapshot',
      'begin-transaction',
      'lock-project',
      'read-current-task',
      'create-comment',
    ]);
    expect(mocks.globalCreate).not.toHaveBeenCalled();
  });

  it.each([
    null,
    'VIEWER',
  ] as const)('rejects create after current membership becomes %s', async (role) => {
    state.currentRole = role;
    await expect(caller().create({ taskId: ids.task, content: 'blocked' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(state.wrote).toBe(false);
  });

  it('rejects create when the task moved from the locked project', async () => {
    state.currentProjectId = ids.projectB;
    await expect(caller().create({ taskId: ids.task, content: 'blocked' })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    expect(state.wrote).toBe(false);
  });

  it('returns NOT_FOUND when the task disappeared after the snapshot', async () => {
    state.taskExists = false;
    await expect(caller().create({ taskId: ids.task, content: 'blocked' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(state.wrote).toBe(false);
  });

  it('updates only after current ownership and authority checks', async () => {
    await expect(caller().update({ id: ids.comment, content: 'updated' })).resolves.toMatchObject({
      id: ids.comment,
    });
    expect(state.events).toEqual([
      'read-comment-snapshot',
      'begin-transaction',
      'lock-project',
      'read-current-comment',
      'update-comment',
    ]);
    expect(mocks.txUpdate.mock.calls[0]?.[0].where).toEqual({
      id: ids.comment,
      taskId: ids.task,
      userId: ids.actor,
    });
    expect(mocks.globalUpdate).not.toHaveBeenCalled();
  });

  it.each([
    null,
    'VIEWER',
  ] as const)('rejects update after current membership becomes %s', async (role) => {
    state.currentRole = role;
    await expect(caller().update({ id: ids.comment, content: 'blocked' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(state.wrote).toBe(false);
  });

  it('rejects update when current ownership changed', async () => {
    state.currentOwnerId = ids.other;
    await expect(caller().update({ id: ids.comment, content: 'blocked' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(state.wrote).toBe(false);
  });

  it('rejects update when the task moved from the locked project', async () => {
    state.currentProjectId = ids.projectB;
    await expect(caller().update({ id: ids.comment, content: 'blocked' })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    expect(state.wrote).toBe(false);
  });

  it('returns NOT_FOUND when the update target disappeared after the snapshot', async () => {
    state.commentExists = false;
    await expect(caller().update({ id: ids.comment, content: 'blocked' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(state.wrote).toBe(false);
  });

  it('deletes only after current ownership and authority checks', async () => {
    await expect(caller().delete({ id: ids.comment })).resolves.toEqual({ success: true });
    expect(state.events).toEqual([
      'read-comment-snapshot',
      'begin-transaction',
      'lock-project',
      'read-current-comment',
      'delete-comment',
    ]);
    expect(mocks.txDelete.mock.calls[0]?.[0].where).toEqual({
      id: ids.comment,
      taskId: ids.task,
      userId: ids.actor,
    });
    expect(mocks.globalDelete).not.toHaveBeenCalled();
  });

  it.each([
    null,
    'VIEWER',
  ] as const)('rejects delete after current membership becomes %s', async (role) => {
    state.currentRole = role;
    await expect(caller().delete({ id: ids.comment })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(state.wrote).toBe(false);
  });

  it('rejects delete when the task moved from the locked project', async () => {
    state.currentProjectId = ids.projectB;
    await expect(caller().delete({ id: ids.comment })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    expect(state.wrote).toBe(false);
  });

  it('returns NOT_FOUND when the delete target disappeared after the snapshot', async () => {
    state.commentExists = false;
    await expect(caller().delete({ id: ids.comment })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(state.wrote).toBe(false);
  });

  it.each([
    'update',
    'delete',
  ] as const)('maps a disappeared %s target to NOT_FOUND', async (kind) => {
    state.throwWriteP2025 = true;
    const operation =
      kind === 'update'
        ? caller().update({ id: ids.comment, content: 'updated' })
        : caller().delete({ id: ids.comment });
    await expect(operation).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
