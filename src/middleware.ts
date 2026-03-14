import { jwtVerify } from 'jose';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Edge Runtime対応のJWT認証ミドルウェア
 * session.tsはServer Component APIのcookies()を使うためimport不可
 * joseを直接使用してJWT検証を行う
 */

const COOKIE_NAME = 'session';

/** 認証不要の公開パス */
const PUBLIC_PATHS = ['/login', '/register'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
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

  // 公開パスはスキップ
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // tRPCエンドポイントはミドルウェアによるリダイレクトをスキップする。
  // publicProcedure（login/register/getSession等）はJWT不在でも動作させる必要があり、
  // protectedProcedure・adminProcedureによりtRPC層で認証・認可を担保しているため。
  if (pathname.startsWith('/api/trpc')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  // トークンがない場合はログインにリダイレクト
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // JWT検証
  try {
    await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });
    return NextResponse.next();
  } catch {
    // 無効なトークン: Cookie削除してログインにリダイレクト
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
