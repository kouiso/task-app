import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { env } from './env';

function getKey(): Uint8Array {
  const SECRET_KEY = env.JWT_SECRET;
  const encoded = new TextEncoder().encode(SECRET_KEY);
  // In jsdom test environment, TextEncoder.encode returns an object that looks like
  // Uint8Array but isn't. Convert it to a real Uint8Array.
  return new Uint8Array(encoded);
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

type UserRole = 'USER' | 'ADMIN';

const COOKIE_NAME = 'session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7日間

/**
 * SessionPayloadの型ガード
 */
function isSessionPayload(payload: unknown): payload is SessionPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const p = payload as Record<string, unknown>;

  return (
    typeof p['userId'] === 'string' &&
    typeof p['email'] === 'string' &&
    typeof p['role'] === 'string' &&
    typeof p['exp'] === 'number'
  );
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  // SessionPayloadをRecord<string, unknown>に変換（型安全な方法）
  const jwtPayload: Record<string, unknown> = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    exp: payload.exp,
  };

  return await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey());
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ['HS256'],
    });

    // 型ガードを使用して安全に変換
    if (!isSessionPayload(payload)) {
      console.error('Invalid session payload structure:', payload);
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    return null;
  }
}

export async function createSession(user: SessionUser): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: expiresAt,
  };

  const token = await encrypt(payload);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return await decrypt(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifySession(): Promise<SessionUser | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return {
    id: session.userId,
    email: session.email,
    role: session.role,
  };
}
