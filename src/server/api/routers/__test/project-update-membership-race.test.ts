// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ids = vi.hoisted(() => ({
  actor: 'claaaaaaaaaaaaaaaaaaaaaaa',
  project: 'clbbbbbbbbbbbbbbbbbbbbbbb',
}));
const state = vi.hoisted(() => ({
  role: 'OWNER' as string | null,
  exists: true,
  written: false,
  events: [] as string[],
}));
vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: vi.fn(async () => {
      state.events.push('lock');
      return state.exists ? [{ id: ids.project }] : [];
    }),
    project: {
      findUnique: vi.fn(async () => {
        state.events.push('current-authority');
        return state.exists
          ? { id: ids.project, members: state.role ? [{ role: state.role }] : [] }
          : null;
      }),
      update: vi.fn(async () => {
        state.events.push('update');
        state.written = true;
        return { id: ids.project, name: 'Changed' };
      }),
    },
  };
  return {
    prisma: {
      user: { findUnique: vi.fn(async () => ({ id: ids.actor, role: 'USER', isActive: true })) },
      project: {
        findUnique: vi.fn(async () => ({ id: ids.project, members: [{ role: 'OWNER' }] })),
        update: vi.fn(async () => {
          state.events.push('legacy-update');
          state.written = true;
          return { id: ids.project, name: 'Changed' };
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
  state.written = false;
  state.events.length = 0;
});
describe('project.update current management/archive authorization', () => {
  it('updates only after project lock and current authority', async () => {
    await expect(
      caller().update({ id: ids.project, name: 'Changed', isArchived: true }),
    ).resolves.toMatchObject({ name: 'Changed' });
    expect(state.events).toEqual(['begin', 'lock', 'current-authority', 'update']);
  });
  it.each([
    null,
    'VIEWER',
    'MEMBER',
  ])('rejects stale OWNER after removal/demotion %s', async (role) => {
    state.role = role;
    await expect(caller().update({ id: ids.project, name: 'Changed' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(state.written).toBe(false);
  });
  it('allows current ADMIN ordinary project management', async () => {
    state.role = 'ADMIN';
    await expect(caller().update({ id: ids.project, name: 'Changed' })).resolves.toMatchObject({
      name: 'Changed',
    });
    expect(state.written).toBe(true);
  });
  it('rejects current ADMIN archiving despite stale OWNER snapshot', async () => {
    state.role = 'ADMIN';
    await expect(caller().update({ id: ids.project, isArchived: true })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(state.written).toBe(false);
  });
  it('reports a project deleted before lock was acquired', async () => {
    state.exists = false;
    await expect(caller().update({ id: ids.project, name: 'Changed' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(state.written).toBe(false);
  });
});
