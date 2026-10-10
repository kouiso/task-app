/** @vitest-environment jsdom */

import { TRPCError } from '@trpc/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createCallerFactory, createTRPCRouter, protectedProcedure, publicProcedure } from './trpc';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

const testRouter = createTRPCRouter({
  success: publicProcedure.query(() => ({ ok: true })),
  badRequest: publicProcedure.input(z.object({ secret: z.string() })).mutation(({ input }) => {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `invalid: ${input.secret}` });
  }),
  forbidden: publicProcedure.query(() => {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }),
  notFound: publicProcedure.query(() => {
    throw new TRPCError({ code: 'NOT_FOUND' });
  }),
  conflict: publicProcedure.query(() => {
    throw new TRPCError({ code: 'CONFLICT' });
  }),
  rateLimited: publicProcedure.query(() => {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
  }),
  unexpected: publicProcedure.query(() => {
    throw new Error('unexpected-sensitive-detail');
  }),
  protectedPing: protectedProcedure.query(() => ({ ok: true })),
  protectedVersion: protectedProcedure.query(({ ctx }) => ctx.session.version),
});

const createCaller = createCallerFactory(testRouter);
const context = {
  requestId: 'request_test_1234',
  headers: new Headers(),
  session: null,
};

describe('tRPC structured log status', () => {
  const originalNodeEnv = process.env['NODE_ENV'];
  const originalSentryDsn = process.env['SENTRY_DSN'];
  const originalPublicSentryDsn = process.env['NEXT_PUBLIC_SENTRY_DSN'];
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    process.env['NODE_ENV'] = 'production';
    delete process.env['SENTRY_DSN'];
    delete process.env['NEXT_PUBLIC_SENTRY_DSN'];
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    infoSpy.mockClear();
    mocks.findUnique.mockReset();
  });

  afterAll(() => {
    const restoreEnv = (key: string, value: string | undefined) => {
      if (value === undefined) {
        delete process.env[key];
        return;
      }
      process.env[key] = value;
    };

    restoreEnv('NODE_ENV', originalNodeEnv);
    restoreEnv('SENTRY_DSN', originalSentryDsn);
    restoreEnv('NEXT_PUBLIC_SENTRY_DSN', originalPublicSentryDsn);
    infoSpy.mockRestore();
  });

  const lastLog = () => {
    const value: unknown = infoSpy.mock.lastCall?.[0];
    expect(typeof value).toBe('string');
    return JSON.parse(value as string) as Record<string, unknown>;
  };

  it('成功と標準のtRPCエラーを対応するHTTP statusで記録する', async () => {
    const caller = createCaller(context);

    await expect(caller.success()).resolves.toEqual({ ok: true });
    expect(lastLog()).toMatchObject({ path: 'success', status: 200 });

    const cases = [
      {
        invoke: () => caller.badRequest({ secret: 'do-not-log-this' }),
        code: 'BAD_REQUEST',
        status: 400,
      },
      { invoke: () => caller.protectedPing(), code: 'UNAUTHORIZED', status: 401 },
      { invoke: () => caller.forbidden(), code: 'FORBIDDEN', status: 403 },
      { invoke: () => caller.notFound(), code: 'NOT_FOUND', status: 404 },
      { invoke: () => caller.conflict(), code: 'CONFLICT', status: 409 },
      { invoke: () => caller.rateLimited(), code: 'TOO_MANY_REQUESTS', status: 429 },
    ] as const;

    for (const testCase of cases) {
      await expect(testCase.invoke()).rejects.toMatchObject({ code: testCase.code });
      expect(lastLog()).toMatchObject({ status: testCase.status });
    }

    expect(infoSpy.mock.calls.flat().join('\n')).not.toContain('do-not-log-this');
  });

  it('想定外エラーを500で記録して呼び出し元にも失敗を返す', async () => {
    const caller = createCaller(context);

    await expect(caller.unexpected()).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
    expect(lastLog()).toMatchObject({ path: 'unexpected', status: 500 });
    expect(infoSpy.mock.calls.flat().join('\n')).not.toContain('unexpected-sensitive-detail');
  });

  it('DBと一致するsession versionだけをprotected procedureへ通す', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'user_123',
      role: 'USER',
      isActive: true,
      sessionVersion: 3,
    });
    const caller = createCaller({
      ...context,
      session: {
        userId: 'user_123',
        email: 'user@example.com',
        role: 'USER',
        version: 3,
        exp: 4_102_444_800,
      },
    });

    await expect(caller.protectedVersion()).resolves.toBe(3);

    mocks.findUnique.mockResolvedValue({
      id: 'user_123',
      role: 'USER',
      isActive: true,
      sessionVersion: 4,
    });
    await expect(caller.protectedVersion()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
