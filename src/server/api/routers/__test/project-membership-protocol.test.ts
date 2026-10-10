// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ACTOR = 'claaaaaaaaaaaaaaaaaaaaaaa';
const TARGET = 'clbbbbbbbbbbbbbbbbbbbbbbb';
const PROJECT = 'clccccccccccccccccccccccc';

type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

const state = vi.hoisted(() => ({
  callerRole: 'OWNER' as MemberRole | null,
  targetExists: false,
  events: [] as string[],
}));

const mocks = vi.hoisted(() => ({
  legacyMembershipFind: vi.fn(),
  legacyMembershipCreate: vi.fn(),
  membershipCreate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: vi.fn(async () => {
      state.events.push('lock-project');
      return [{ id: PROJECT }];
    }),
    projectMember: {
      findUnique: vi.fn(async ({ where }: { where: { userId_projectId: { userId: string } } }) => {
        const userId = where.userId_projectId.userId;
        if (userId === ACTOR) {
          state.events.push('read-current-caller');
          return state.callerRole ? { role: state.callerRole } : null;
        }
        state.events.push('read-current-target');
        return state.targetExists ? { role: 'MEMBER' } : null;
      }),
      create: mocks.membershipCreate,
    },
  };

  return {
    prisma: {
      user: {
        findUnique: vi.fn(async () => ({ id: ACTOR, role: 'USER', isActive: true })),
      },
      projectMember: {
        findUnique: mocks.legacyMembershipFind,
        create: mocks.legacyMembershipCreate,
      },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => {
        state.events.push('begin-transaction');
        return run(tx);
      }),
    },
  };
});

import { projectRouter } from '@/server/api/routers/project';

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
  state.callerRole = 'OWNER';
  state.targetExists = false;
  state.events.length = 0;
  vi.clearAllMocks();
  // 修正前の addMember は actor のロック外スナップショットを読みます。
  mocks.legacyMembershipFind.mockImplementation(
    async ({ where }: { where: { userId_projectId: { userId: string } } }) => {
      if (where.userId_projectId.userId === ACTOR) {
        state.events.push('read-stale-caller');
        return { role: 'OWNER' };
      }
      state.events.push('read-stale-target');
      return state.targetExists ? { role: 'MEMBER' } : null;
    },
  );
  mocks.legacyMembershipCreate.mockImplementation(
    async ({ data }: { data: { role: MemberRole } }) => {
      state.events.push('create-without-lock');
      return { ...data, user: { id: TARGET, name: 'Target', email: 'target@example.test' } };
    },
  );
  mocks.membershipCreate.mockImplementation(async ({ data }: { data: { role: MemberRole } }) => {
    state.events.push('create-membership');
    return { ...data, user: { id: TARGET, name: 'Target', email: 'target@example.test' } };
  });
});

describe('project.addMember membership protocol', () => {
  it('keeps the distributed project router on the same membership protocol', () => {
    const source = readFileSync(resolve('src/server/api/routers/project.ts'), 'utf8');
    const scaffold = readFileSync(resolve('scripts/_server-routers/project.ts'), 'utf8');

    expect(scaffold).toBe(source);
  });

  it('locks the project before checking the current caller and creating a member', async () => {
    const result = await projectRouter.createCaller(context()).addMember({
      projectId: PROJECT,
      userId: TARGET,
      role: 'MEMBER',
    });

    expect(result).toMatchObject({ projectId: PROJECT, userId: TARGET, role: 'MEMBER' });
    expect(state.events).toEqual([
      'begin-transaction',
      'lock-project',
      'read-current-caller',
      'read-current-target',
      'create-membership',
    ]);
    expect(mocks.legacyMembershipFind).not.toHaveBeenCalled();
    expect(mocks.legacyMembershipCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['removed', null],
    ['downgraded', 'VIEWER'],
  ] as const)('rejects a caller who is %s when the lock is acquired', async (_label, role) => {
    state.callerRole = role;

    await expect(
      projectRouter.createCaller(context()).addMember({
        projectId: PROJECT,
        userId: TARGET,
        role: 'MEMBER',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(state.events).toEqual(['begin-transaction', 'lock-project', 'read-current-caller']);
    expect(mocks.membershipCreate).not.toHaveBeenCalled();
  });

  it('uses the current role to reject an OWNER grant after an OWNER-to-ADMIN demotion', async () => {
    state.callerRole = 'ADMIN';

    await expect(
      projectRouter.createCaller(context()).addMember({
        projectId: PROJECT,
        userId: TARGET,
        role: 'OWNER',
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'オーナー権限の付与はオーナーのみ可能です',
    });
    expect(state.events).toEqual(['begin-transaction', 'lock-project', 'read-current-caller']);
    expect(mocks.membershipCreate).not.toHaveBeenCalled();
  });

  it('keeps allowing an ADMIN to add a non-OWNER member', async () => {
    state.callerRole = 'ADMIN';

    const result = await projectRouter.createCaller(context()).addMember({
      projectId: PROJECT,
      userId: TARGET,
      role: 'VIEWER',
    });

    expect(result).toMatchObject({ role: 'VIEWER' });
    expect(state.events.at(-1)).toBe('create-membership');
  });

  it('keeps the existing-member conflict after acquiring the project lock', async () => {
    state.targetExists = true;

    await expect(
      projectRouter.createCaller(context()).addMember({
        projectId: PROJECT,
        userId: TARGET,
        role: 'MEMBER',
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'このユーザーは既にプロジェクトのメンバーです',
    });
    expect(state.events).toEqual([
      'begin-transaction',
      'lock-project',
      'read-current-caller',
      'read-current-target',
    ]);
    expect(mocks.membershipCreate).not.toHaveBeenCalled();
  });
});
