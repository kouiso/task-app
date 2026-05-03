import type { RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { cookies } from 'next/headers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, decrypt, encrypt, type SessionPayload, verifySession } from './session';

describe('session', () => {
  const mockedCookies = vi.mocked(cookies);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('encrypt/decrypt でセッションを往復できる', async () => {
    const payload: SessionPayload = {
      userId: 'user_123',
      email: 'user@example.com',
      role: 'USER',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };

    const token = await encrypt(payload);
    const decrypted = await decrypt(token);

    expect(decrypted).toMatchObject({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });
    expect(decrypted?.exp).toBeTypeOf('number');
  });

  it('不正なトークンは null を返し、詳細情報をログに出さない', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(decrypt('invalid-token')).resolves.toBeNull();

    expect(errorSpy).toHaveBeenCalledWith('Failed to decrypt token');
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
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };
    const token = await encrypt(payload);

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
    });
  });
});
