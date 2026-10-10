import { SignJWT } from 'jose';
import type { RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { cookies } from 'next/headers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from './env';
import {
  createSession,
  type SessionPayload,
  signSessionToken,
  verifySession,
  verifySessionToken,
} from './session';

describe('session', () => {
  const mockedCookies = vi.mocked(cookies);

  const signRawPayload = async (payload: Record<string, unknown>) =>
    await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(env.JWT_SECRET));

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('signSessionToken/verifySessionToken でセッションを往復できる', async () => {
    const payload: SessionPayload = {
      userId: 'user_123',
      email: 'user@example.com',
      role: 'USER',
      version: 7,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };

    const token = await signSessionToken(payload);
    const decrypted = await verifySessionToken(token);

    expect(decrypted).toMatchObject({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      version: payload.version,
    });
    expect(decrypted?.exp).toBeTypeOf('number');
  });

  it('不正なトークンは null を返し、詳細情報をログに出さない', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(verifySessionToken('invalid-token')).resolves.toBeNull();

    expect(errorSpy).toHaveBeenCalledWith('Failed to verify session token');
  });

  it('createSession は安全な cookie 属性で保存する', async () => {
    const cookieStore = {
      [Symbol.iterator]: vi.fn(),
      size: 0,
      get: vi.fn(),
      getAll: vi.fn(),
      has: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
    mockedCookies.mockResolvedValue(cookieStore as Awaited<ReturnType<typeof cookies>>);

    const token = await createSession({
      id: 'user_123',
      email: 'user@example.com',
      role: 'ADMIN',
      version: 3,
    });

    expect(token).toBeTypeOf('string');
    expect(cookieStore.set).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        secure: false,
      }),
    );
  });

  it('verifySession は cookie 上のセッションから user 情報を返す', async () => {
    const payload: SessionPayload = {
      userId: 'user_456',
      email: 'member@example.com',
      role: 'USER',
      version: 5,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };
    const token = await signSessionToken(payload);

    mockedCookies.mockResolvedValue({
      [Symbol.iterator]: vi.fn(),
      size: 1,
      get: vi.fn(
        (): RequestCookie => ({
          name: 'session',
          value: token,
        }),
      ),
      getAll: vi.fn(),
      has: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    } as Awaited<ReturnType<typeof cookies>>);

    await expect(verifySession()).resolves.toEqual({
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      version: payload.version,
    });
  });

  it('version claimが無い旧JWTだけをversion 0として受け入れる', async () => {
    const token = await signRawPayload({
      userId: 'legacy_user',
      email: 'legacy@example.com',
      role: 'USER',
    });

    await expect(verifySessionToken(token)).resolves.toMatchObject({ version: 0 });
  });

  it.each([
    null,
    '0',
    0.5,
    -1,
    Number.POSITIVE_INFINITY,
    2_147_483_648,
  ])('異常なversion claim %sを拒否する', async (version) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const token = await signRawPayload({
      userId: 'invalid_version_user',
      email: 'invalid@example.com',
      role: 'USER',
      version,
    });

    await expect(verifySessionToken(token)).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('Invalid session payload structure');
  });

  it.each([
    'OWNER',
    'constructor',
    '__proto__',
  ])('未定義のrole claim %sを拒否する', async (role) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const token = await signRawPayload({
      userId: 'invalid_role_user',
      email: 'invalid-role@example.com',
      role,
      version: 0,
    });

    await expect(verifySessionToken(token)).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('Invalid session payload structure');
  });
});
