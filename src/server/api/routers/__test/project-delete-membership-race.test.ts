// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ids = vi.hoisted(() => ({
  actor: 'claaaaaaaaaaaaaaaaaaaaaaa',
  project: 'clbbbbbbbbbbbbbbbbbbbbbbb',
}));
const state = vi.hoisted(() => ({
  role: 'OWNER' as string | null,
  exists: true,
  deleted: false,
  events: [] as string[],
}));
vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: vi.fn(async () => {
      state.events.push('lock');
      return state.exists ? [{ id: ids.project }] : [];
    }),
    projectMember: {
      findUnique: vi.fn(async () => {
        state.events.push('current-authority');
        return state.role ? { role: state.role } : null;
      }),
    },
    project: {
      delete: vi.fn(async () => {
        state.events.push('delete');
        state.deleted = true;
        return { id: ids.project };
      }),
    },
  };
  return {
    prisma: {
      user: { findUnique: vi.fn(async () => ({ id: ids.actor, role: 'USER', isActive: true })) },
      project: {
        findUnique: vi.fn(async () => ({ id: ids.project, members: [{ role: 'OWNER' }] })),
        delete: vi.fn(async () => {
          state.events.push('legacy-delete');
          state.deleted = true;
          return { id: ids.project };
        }),
      },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => {
        state.events.push('begin');
        return run(tx);
      }),
    },
  };
});

import { projectRouter } from '@/server/api/routers/project';

const caller = () =>
  projectRouter.createCaller({
    headers: new Headers(),
    session: { userId: ids.actor, role: 'USER' as const },
  });
beforeEach(() => {
  vi.clearAllMocks();
  state.role = 'OWNER';
  state.exists = true;
  state.deleted = false;
  state.events.length = 0;
});
describe('project.delete current OWNER authorization', () => {
  it('checks current OWNER after project lock', async () => {
    await expect(caller().delete({ id: ids.project })).resolves.toEqual({ success: true });
    expect(state.events).toEqual(['begin', 'lock', 'current-authority', 'delete']);
  });
  it.each([null, 'VIEWER', 'ADMIN'])('rejects removed or non-OWNER role %s', async (role) => {
    state.role = role;
    await expect(caller().delete({ id: ids.project })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(state.deleted).toBe(false);
  });
  it('reports missing locked project without deletion', async () => {
    state.exists = false;
    await expect(caller().delete({ id: ids.project })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(state.deleted).toBe(false);
    expect(state.events).toEqual(['begin', 'lock']);
  });
});
