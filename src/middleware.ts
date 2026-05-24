import { jwtVerify } from 'jose';
import { type NextRequest, NextResponse } from 'next/server';
import {
  getRequestIdFromHeaders,
  setRequestIdHeader,
  setSentryRequestContext,
  writeStructuredLog,
} from '@/lib/observability';

/**
 * Edge Runtime対応のJWT認証ミドルウェア
 * session.tsはServer Component APIのcookies()を使うためimport不可
 * joseを直接使用してJWT検証を行う
 */

const COOKIE_NAME = 'session';

const PUBLIC_PATHS = ['/login', '/register', '/lp'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isValidCallbackPath(path: string): boolean {
  return (
    path.startsWith('/') && !path.startsWith('//') && !path.includes('://') && !path.includes('\\')
  );
}

function getJwtSecret(): Uint8Array {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const startedAt = Date.now();
  const requestId = getRequestIdFromHeaders(request.headers);

  await setSentryRequestContext(requestId, pathname);

  const requestHeaders = new Headers(request.headers);
  setRequestIdHeader(requestHeaders, requestId);

  function finalize(response: NextResponse, status: number): NextResponse {
    setRequestIdHeader(response.headers, requestId);
    writeStructuredLog({
      event: 'http.request',
      requestId,
      method: request.method,
      path: pathname,
      status,
      durationMs: Date.now() - startedAt,
    });
    return response;
  }

  if (isPublicPath(pathname)) {
    return finalize(NextResponse.next({ request: { headers: requestHeaders } }), 200);
  }

  // tRPCエンドポイントはミドルウェアによるリダイレクトをスキップする。
  // publicProcedure（login/register/getSession等）はJWT不在でも動作させる必要があり、
  // protectedProcedure・adminProcedureによりtRPC層で認証・認可を担保しているため。
  if (pathname.startsWith('/api/trpc')) {
    return finalize(NextResponse.next({ request: { headers: requestHeaders } }), 200);
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'callbackUrl',
      isValidCallbackPath(pathname) ? pathname : '/dashboard',
    );
    return finalize(NextResponse.redirect(loginUrl), 307);
  }

  try {
    await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });
    return finalize(NextResponse.next({ request: { headers: requestHeaders } }), 200);
  } catch {
    // 無効なトークン: Cookie削除してログインにリダイレクト
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return finalize(response, 307);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
