import { Prisma } from '@prisma/client';
import type { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userRouter } from '../user';

const SELF_ID = 'claaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_ID = 'clbbbbbbbbbbbbbbbbbbbbbbb';
const SESSION_EMAIL = 'self@example.test';
const CURRENT_PASSWORD = 'OldPass123!';
const NEW_PASSWORD = 'NewPass456!';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  createSession: vi.fn(),
  writeStructuredLog: vi.fn(),
}));

// Prismaの動的delegateを直接spyすると復元後の別テストに影響するため、モジュール境界を分けます。
vi.mock('@/lib/prisma', async (importOriginal) => {
  const { prisma } = await importOriginal<typeof import('@/lib/prisma')>();
  return {
    prisma: {
      user: {
        findUnique: mocks.findUnique,
        findFirst: mocks.findFirst,
        update: mocks.update,
        updateMany: mocks.updateMany,
      },
      // 共通setupによる実DBの後片付けを保つためです。
      $transaction: prisma.$transaction.bind(prisma),
      $disconnect: prisma.$disconnect.bind(prisma),
    },
  };
});

vi.mock('@/lib/session', () => ({
  createSession: mocks.createSession,
  getSession: vi.fn(),
}));

vi.mock('@/lib/observability', () => ({
  getRequestIdFromHeaders: vi.fn(() => 'user-regression-test'),
  setSentryRequestContext: vi.fn(),
  writeStructuredLog: mocks.writeStructuredLog,
}));

type SessionRole = 'USER' | 'ADMIN';

function caller(
  session: { userId: string; email: string; role: SessionRole; version?: number } | null = {
    userId: SELF_ID,
    email: SESSION_EMAIL,
    role: 'ADMIN',
  },
) {
  return userRouter.createCaller({
    headers: new Headers(),
    requestId: 'user-regression-test',
    session: session ? { ...session, version: session.version ?? 0, exp: 4_102_444_800 } : null,
  });
}

function knownError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError(`injected ${code}`, {
    code,
    clientVersion: Prisma.prismaVersion.client,
    ...(meta ? { meta } : {}),
  });
}

async function expectTrpcCode(promise: Promise<unknown>, code: TRPCError['code'], cause?: unknown) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toMatchObject({ code });
  if (cause !== undefined) {
    expect(error).toMatchObject({ cause });
  }
  return error;
}

function allowAuthenticatedUser(role: SessionRole = 'ADMIN') {
  mocks.findUnique.mockResolvedValue({
    id: SELF_ID,
    email: SESSION_EMAIL,
    role,
    isActive: true,
    sessionVersion: 0,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  allowAuthenticatedUser();
  mocks.findFirst.mockResolvedValue(null);
  mocks.update.mockResolvedValue({
    id: SELF_ID,
    email: SESSION_EMAIL,
    name: 'Self',
    avatar: null,
    role: 'ADMIN',
    isActive: true,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
  mocks.createSession.mockResolvedValue('unused-test-token');
  mocks.updateMany.mockResolvedValue({ count: 1 });
});

describe('userRouter database error regression', () => {
  it('update の書き込み時 P2025 を NOT_FOUND にする', async () => {
    mocks.update.mockRejectedValue(knownError('P2025'));

    await expectTrpcCode(caller().update({ id: OTHER_ID, name: 'Updated' }), 'NOT_FOUND');
  });

  it('updateProfile の条件不一致 P2025 を失効セッションとして拒否する', async () => {
    mocks.update.mockRejectedValue(knownError('P2025'));

    await expectTrpcCode(
      caller().updateProfile({ name: 'Updated', email: SESSION_EMAIL }),
      'UNAUTHORIZED',
    );
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it.each([
    [{ target: ['email'] }, 'modelName なし'],
    [{ target: ['email'], modelName: 'User' }, 'User.email'],
  ])('updateProfile は厳密な email P2002 を CONFLICT にする: %s', async (meta, _label) => {
    mocks.update.mockRejectedValue(knownError('P2002', meta));

    await expectTrpcCode(
      caller().updateProfile({ name: 'Updated', email: 'new@example.test' }),
      'CONFLICT',
    );
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it.each([
    [{ target: ['email', 'name'], modelName: 'User' }, '複合一意制約'],
    [{ target: ['email'], modelName: 'Project' }, '別モデル'],
    [{ target: 'users_email_key', modelName: 'User' }, '文字列形式のtarget'],
    [undefined, 'metadataなし'],
  ])('updateProfile は email 以外の P2002 を再送出する: %s', async (meta, _label) => {
    const cause = knownError('P2002', meta);
    mocks.update.mockRejectedValue(cause);

    await expectTrpcCode(
      caller().updateProfile({ name: 'Updated', email: 'new@example.test' }),
      'INTERNAL_SERVER_ERROR',
      cause,
    );
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it.each([
    ['update', async () => caller().update({ id: OTHER_ID, name: 'Updated' })],
    [
      'updateProfile',
      async () => caller().updateProfile({ name: 'Updated', email: SESSION_EMAIL }),
    ],
  ])('%s は未知の書き込みエラーを同じ cause で再送出する', async (_name, invoke) => {
    const cause = new Error('unknown database failure');
    mocks.update.mockRejectedValue(cause);

    await expectTrpcCode(invoke(), 'INTERNAL_SERVER_ERROR', cause);
  });

  it('changePassword は updateMany の未知エラーを同じ cause で再送出する', async () => {
    const cause = new Error('unknown database failure');
    const password = bcrypt.hashSync(CURRENT_PASSWORD, 4);
    allowAuthenticatedUser();
    mocks.findUnique
      .mockResolvedValueOnce({
        id: SELF_ID,
        email: SESSION_EMAIL,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 0,
      })
      .mockResolvedValueOnce({ password, isActive: true, sessionVersion: 0 });
    mocks.updateMany.mockRejectedValue(cause);

    await expectTrpcCode(
      caller().changePassword({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD }),
      'INTERNAL_SERVER_ERROR',
      cause,
    );
  });
});

describe('userRouter guard and session ordering regression', () => {
  it('未認証をDB参照より先に拒否する', async () => {
    await expectTrpcCode(caller(null).update({ id: SELF_ID, name: 'Updated' }), 'UNAUTHORIZED');

    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('DB上の最新roleを優先し、古いADMINセッションで他ユーザーを更新させない', async () => {
    allowAuthenticatedUser('USER');

    await expectTrpcCode(
      caller({ userId: SELF_ID, email: SESSION_EMAIL, role: 'ADMIN' }).update({
        id: OTHER_ID,
        name: 'Updated',
      }),
      'FORBIDDEN',
    );

    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('sessionVersion上限ではパスワードを更新しない', async () => {
    const maxVersion = 2_147_483_647;
    const password = bcrypt.hashSync(CURRENT_PASSWORD, 4);
    mocks.findUnique
      .mockResolvedValueOnce({
        id: SELF_ID,
        email: SESSION_EMAIL,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: maxVersion,
      })
      .mockResolvedValueOnce({ password, isActive: true, sessionVersion: maxVersion });

    await expectTrpcCode(
      caller({
        userId: SELF_ID,
        email: SESSION_EMAIL,
        role: 'ADMIN',
        version: maxVersion,
      }).changePassword({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD }),
      'CONFLICT',
    );

    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it.each(['P2025', 'P2002'])('cookie更新の %s が起きてもDB更新を成功として返す', async (code) => {
    const cookieCause = knownError(code, { target: ['email'], modelName: 'User' });
    mocks.update.mockResolvedValue({
      id: SELF_ID,
      email: 'new@example.test',
      name: 'Updated',
      avatar: null,
      role: 'ADMIN',
      isActive: true,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    mocks.createSession.mockRejectedValue(cookieCause);

    await expect(
      caller().updateProfile({ name: 'Updated', email: 'new@example.test' }),
    ).resolves.toMatchObject({ success: true, sessionReissued: false });

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.createSession).toHaveBeenCalledTimes(1);
    expect(mocks.writeStructuredLog).toHaveBeenCalledWith({
      level: 'error',
      event: 'auth.session_reissue_failed',
      requestId: 'user-regression-test',
      path: 'user.updateProfile',
      status: 200,
      userId: SELF_ID,
    });
    expect(JSON.stringify(mocks.writeStructuredLog.mock.calls)).not.toContain(cookieCause.message);
  });

  it('updateProfile はctx versionと有効状態を更新条件に固定する', async () => {
    await caller().updateProfile({ name: 'Updated', email: SESSION_EMAIL });

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SELF_ID, sessionVersion: 0, isActive: true },
      }),
    );
  });

  it('DBの最新emailでctxを上書きし、同じemailならCookieを再発行しない', async () => {
    mocks.findUnique.mockResolvedValue({
      id: SELF_ID,
      email: 'current@example.test',
      role: 'ADMIN',
      isActive: true,
      sessionVersion: 0,
    });
    mocks.update.mockResolvedValue({
      id: SELF_ID,
      email: 'current@example.test',
      name: 'Updated',
      avatar: null,
      role: 'ADMIN',
      isActive: true,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await caller({
      userId: SELF_ID,
      email: 'stale@example.test',
      role: 'ADMIN',
      version: 0,
    }).updateProfile({ name: 'Updated', email: 'current@example.test' });

    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it('changePassword は固定version・読取password・activeをCAS条件にする', async () => {
    const password = bcrypt.hashSync(CURRENT_PASSWORD, 4);
    mocks.findUnique
      .mockResolvedValueOnce({
        id: SELF_ID,
        email: SESSION_EMAIL,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 0,
      })
      .mockResolvedValueOnce({ password, isActive: true, sessionVersion: 0 });

    await expect(
      caller().changePassword({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD }),
    ).resolves.toMatchObject({ success: true, sessionReissued: true });

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: SELF_ID, sessionVersion: 0, password, isActive: true },
      data: { password: expect.any(String), sessionVersion: { increment: 1 } },
    });
    expect(mocks.createSession).toHaveBeenCalledWith({
      id: SELF_ID,
      email: SESSION_EMAIL,
      role: 'ADMIN',
      version: 1,
    });
  });

  it('changePassword のCAS不一致はCookieを発行せず失効として返す', async () => {
    const password = bcrypt.hashSync(CURRENT_PASSWORD, 4);
    mocks.findUnique
      .mockResolvedValueOnce({
        id: SELF_ID,
        email: SESSION_EMAIL,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 0,
      })
      .mockResolvedValueOnce({ password, isActive: true, sessionVersion: 0 });
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expectTrpcCode(
      caller().changePassword({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD }),
      'UNAUTHORIZED',
    );

    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it('changePassword のCookie失敗は保存成功と再ログイン要否を返す', async () => {
    const password = bcrypt.hashSync(CURRENT_PASSWORD, 4);
    mocks.findUnique
      .mockResolvedValueOnce({
        id: SELF_ID,
        email: SESSION_EMAIL,
        role: 'ADMIN',
        isActive: true,
        sessionVersion: 0,
      })
      .mockResolvedValueOnce({ password, isActive: true, sessionVersion: 0 });
    mocks.createSession.mockRejectedValue(new Error('cookie-secret-detail'));

    await expect(
      caller().changePassword({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD }),
    ).resolves.toMatchObject({ success: true, sessionReissued: false });
    expect(mocks.writeStructuredLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.session_reissue_failed',
        path: 'user.changePassword',
      }),
    );
    expect(JSON.stringify(mocks.writeStructuredLog.mock.calls)).not.toContain(
      'cookie-secret-detail',
    );
  });
});
