import { SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { middleware } from '@/middleware';

vi.mock('@/lib/observability', () => ({
  getRequestIdFromHeaders: () => 'test-request',
  setRequestIdHeader: () => undefined,
  setSentryRequestContext: async () => undefined,
  writeStructuredLog: () => undefined,
}));
const secret = 'middleware-secret-regression-32-characters';
const request = (path: string, token?: string) =>
  new NextRequest(`http://localhost${path}`, {
    headers: token ? { cookie: `session=${token}` } : {},
  });
describe('middleware configuration and token errors', () => {
  beforeEach(() => vi.stubEnv('JWT_SECRET', secret));
  afterEach(() => vi.unstubAllEnvs());
  it('surfaces missing configuration without treating the cookie as invalid', async () => {
    const token = await new SignJWT({ userId: 'reader' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(secret));
    vi.stubEnv('JWT_SECRET', '');
    await expect(middleware(request('/dashboard', token))).rejects.toThrow('JWT_SECRET is not set');
  });
  it('removes an invalid token and redirects to login', async () => {
    const response = await middleware(request('/dashboard', 'invalid-token'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login');
    expect(response.cookies.get('session')?.value).toBe('');
  });
  it('passes a correctly signed HS256 token', async () => {
    const token = await new SignJWT({ userId: 'reader' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(secret));
    const response = await middleware(request('/dashboard', token));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('set-cookie')).toBeNull();
  });
  it.each(['expired', 'wrong-key', 'HS384'])('still rejects a %s token', async (variant) => {
    const signingKey = variant === 'wrong-key' ? `${secret}-other` : secret;
    const token = await new SignJWT({ userId: 'reader' })
      .setProtectedHeader({ alg: variant === 'HS384' ? 'HS384' : 'HS256' })
      .setExpirationTime(variant === 'expired' ? 1 : '1h')
      .sign(new TextEncoder().encode(signingKey));
    const response = await middleware(request('/dashboard', token));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login');
    expect(response.cookies.get('session')?.value).toBe('');
  });
  it.each([
    '/login',
    '/register',
    '/api/trpc/auth.getSession',
  ])('preserves early public/API handling for %s', async (path) => {
    vi.stubEnv('JWT_SECRET', '');
    const response = await middleware(request(path, 'existing-session'));
    expect(response.status).toBe(200);
  });
  it('preserves the no-cookie callback redirect', async () => {
    vi.stubEnv('JWT_SECRET', '');
    const response = await middleware(request('/project'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login?callbackUrl=%2Fproject');
  });
});
