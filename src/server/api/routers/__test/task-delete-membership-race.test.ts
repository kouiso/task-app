// @vitest-environment jsdom
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ids = vi.hoisted(() => ({
  actor: 'claaaaaaaaaaaaaaaaaaaaaaa',
  project: 'clbbbbbbbbbbbbbbbbbbbbbbb',
  task: 'clccccccccccccccccccccccc',
  other: 'clddddddddddddddddddddddd',
}));
const state = vi.hoisted(() => ({
  role: 'ADMIN' as 'ADMIN' | 'VIEWER' | null,
  projectExists: true,
  currentProject: ids.project,
  deleted: false,
  events: [] as string[],
}));
const mocks = vi.hoisted(() => ({ snapshot: vi.fn(), legacyDelete: vi.fn(), delete: vi.fn() }));
vi.mock('@/server/api/routers/_helpers/permission', async (original) => ({
  ...(await original<typeof import('@/server/api/routers/_helpers/permission')>()),
  findTaskWithPermission: mocks.snapshot,
}));
vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: vi.fn(async () => {
      state.events.push('lock');
      return state.projectExists ? [{ id: ids.project }] : [];
    }),
    projectMember: {
      findUnique: vi.fn(async () => {
        state.events.push('current-authority');
        return state.role ? { role: state.role } : null;
      }),
    },
    task: { delete: mocks.delete },
  };
  return {
    prisma: {
      user: { findUnique: vi.fn(async () => ({ id: ids.actor, role: 'USER', isActive: true })) },
      task: { delete: mocks.legacyDelete },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => {
        state.events.push('begin');
        return run(tx);
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
beforeEach(() => {
  vi.clearAllMocks();
  state.role = 'ADMIN';
  state.projectExists = true;
  state.currentProject = ids.project;
  state.deleted = false;
  state.events.length = 0;
  mocks.snapshot.mockImplementation(async () => {
    state.events.push('snapshot');
    return { id: ids.task, projectId: ids.project, project: { members: [{ role: 'ADMIN' }] } };
  });
  mocks.legacyDelete.mockImplementation(async () => {
    state.events.push('legacy-delete');
    state.deleted = true;
    return { id: ids.task };
  });
  mocks.delete.mockImplementation(
    async ({ where }: { where: { id: string; projectId?: string } }) => {
      state.events.push('delete');
      if (where.id !== ids.task || where.projectId !== state.currentProject)
        throw new Prisma.PrismaClientKnownRequestError('gone', {
          code: 'P2025',
          clientVersion: '6',
        });
      state.deleted = true;
      return { id: ids.task };
    },
  );
});
describe('task.delete current authorization', () => {
  it('deletes only after project lock and current authority', async () => {
    await expect(caller().delete({ id: ids.task })).resolves.toEqual({ success: true });
    expect(state.events).toEqual(['snapshot', 'begin', 'lock', 'current-authority', 'delete']);
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: ids.task, projectId: ids.project } });
    expect(mocks.legacyDelete).not.toHaveBeenCalled();
  });
  it.each([
    null,
    'VIEWER',
  ] as const)('rejects stale ADMIN authority after removal or demotion %s', async (role) => {
    state.role = role;
    await expect(caller().delete({ id: ids.task })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(state.deleted).toBe(false);
    expect(mocks.delete).not.toHaveBeenCalled();
  });
  it('rejects a moved task instead of deleting it by id alone', async () => {
    state.currentProject = ids.other;
    await expect(caller().delete({ id: ids.task })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(state.deleted).toBe(false);
  });
  it('rejects a disappeared snapshot project', async () => {
    state.projectExists = false;
    await expect(caller().delete({ id: ids.task })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(state.deleted).toBe(false);
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
