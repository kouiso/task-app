import { Prisma } from '@prisma/client';
import type { TRPCError } from '@trpc/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { authRouter } from '../auth';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  createSession: vi.fn(),
}));
const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

vi.mock('@/lib/prisma', async (importOriginal) => {
  const { prisma } = await importOriginal<typeof import('@/lib/prisma')>();
  return {
    prisma: {
      user: { findUnique: mocks.findUnique, create: mocks.create },
      $transaction: prisma.$transaction.bind(prisma),
      $disconnect: prisma.$disconnect.bind(prisma),
    },
  };
});

vi.mock('@/lib/session', () => ({
  createSession: mocks.createSession,
  deleteSession: vi.fn(),
}));

vi.mock('@/lib/observability', () => ({
  getRequestIdFromHeaders: vi.fn(() => 'auth-register-conflict-test'),
  setSentryRequestContext: vi.fn(),
  writeStructuredLog: vi.fn(),
}));

function caller() {
  return authRouter.createCaller({
    headers: new Headers(),
    requestId: 'auth-register-conflict-test',
    session: null,
  });
}

function knownError(meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('injected P2002', {
    code: 'P2002',
    clientVersion: Prisma.prismaVersion.client,
    ...(meta ? { meta } : {}),
  });
}

async function expectTrpcCode(promise: Promise<unknown>, code: TRPCError['code'], cause?: unknown) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toMatchObject({ code });
  if (cause !== undefined) expect(error).toMatchObject({ cause });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnique.mockResolvedValue(null);
});

afterAll(() => {
  consoleError.mockRestore();
});

describe('auth.register create-time uniqueness conflict', () => {
  it.each([
    [{ target: ['email'] }, 'modelNameなし'],
    [{ target: ['email'], modelName: 'User' }, 'User.email'],
  ])('事前確認後のemail P2002をCONFLICTにする: %s', async (meta, _label) => {
    mocks.create.mockRejectedValue(knownError(meta));

    await expectTrpcCode(
      caller().register({ name: 'User', email: 'same@example.test', password: 'Password123!' }),
      'CONFLICT',
    );
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it.each([
    [{ target: ['email', 'name'], modelName: 'User' }, '複合制約'],
    [{ target: ['email'], modelName: 'Project' }, '別モデル'],
    [{ target: 'users_email_key', modelName: 'User' }, '文字列target'],
    [undefined, 'metadataなし'],
  ])('email以外のP2002を重複メールへ偽装しない: %s', async (meta, _label) => {
    const cause = knownError(meta);
    mocks.create.mockRejectedValue(cause);

    await expectTrpcCode(
      caller().register({ name: 'User', email: 'same@example.test', password: 'Password123!' }),
      'INTERNAL_SERVER_ERROR',
      cause,
    );
  });
});
