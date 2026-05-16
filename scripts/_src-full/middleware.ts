import { jwtVerify } from 'jose';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Edge Runtime対応のJWT認証ミドルウェア
 *
 * Day 01-06: 認証なしで全ページアクセス可能（学習用）
 * Day 07 で AUTH_ENABLED=true に切り替えて認証を有効化する
 */

const COOKIE_NAME = 'session';

const PUBLIC_PATHS = ['/login', '/register'];

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

  // Day 01-06: 認証を無効化して全ページにアクセス可能にする
  // Day 07 で .env に AUTH_ENABLED=true を追加して認証を有効化する
  const authEnabled = process.env['AUTH_ENABLED'] === 'true';
  if (!authEnabled) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // tRPCエンドポイントはミドルウェアによるリダイレクトをスキップする。
  if (pathname.startsWith('/api/trpc')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'callbackUrl',
      isValidCallbackPath(pathname) ? pathname : '/dashboard',
    );
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });
    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
