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
    projectMember: {
      findUnique: vi.fn(async () => {
        state.events.push('current-authority');
        return state.exists && state.role ? { role: state.role } : null;
      }),
    },
    project: {
      update: vi.fn(async ({ data }: { data: { isArchived: boolean } }) => {
        state.events.push('write');
        state.written = true;
        return { id: ids.project, ...data };
      }),
    },
  };
  return {
    prisma: {
      user: { findUnique: vi.fn(async () => ({ id: ids.actor, role: 'USER', isActive: true })) },
      projectMember: { findUnique: vi.fn(async () => ({ role: 'OWNER' })) },
      project: {
        update: vi.fn(async ({ data }: { data: { isArchived: boolean } }) => {
          state.events.push('legacy-write');
          state.written = true;
          return { id: ids.project, ...data };
        }),
      },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => {
        state.events.push('begin');
        return await run(tx);
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
describe.each(['archive', 'unarchive'] as const)('%s uses current archive permission', (method) => {
  it('locks before authority check and writes explicit requested state', async () => {
    await expect(caller()[method]({ id: ids.project })).resolves.toMatchObject({
      isArchived: method === 'archive',
    });
    expect(state.events).toEqual(['begin', 'lock', 'current-authority', 'write']);
  });
  it.each([
    null,
    'VIEWER',
    'MEMBER',
    'ADMIN',
  ])('rejects current role %s despite former OWNER', async (role) => {
    state.role = role;
    await expect(caller()[method]({ id: ids.project })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(state.written).toBe(false);
  });
  it('preserves FORBIDDEN for a project no longer present', async () => {
    state.exists = false;
    await expect(caller()[method]({ id: ids.project })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(state.written).toBe(false);
  });
});
