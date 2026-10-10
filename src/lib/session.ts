import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { USER_ROLE, type UserRole } from './constant/roles';
import { env } from './env';

function getKey(): Uint8Array {
  const SECRET_KEY = env.JWT_SECRET;
  const encoded = new TextEncoder().encode(SECRET_KEY);
  // jsdomテスト環境ではTextEncoder.encodeがUint8Arrayに見えるが実際には異なるオブジェクトを返すため、明示的に変換
  return new Uint8Array(encoded);
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  version: number;
  exp: number;
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  version: number;
}

const COOKIE_NAME = 'session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7日間

const POSTGRES_INTEGER_MAX = 2_147_483_647;

function readSessionPayload(payload: JWTPayload): SessionPayload | null {
  if (
    typeof payload['userId'] === 'string' &&
    typeof payload['email'] === 'string' &&
    (payload['role'] === USER_ROLE.USER || payload['role'] === USER_ROLE.ADMIN) &&
    typeof payload['exp'] === 'number'
  ) {
    const version = Object.hasOwn(payload, 'version') ? payload['version'] : 0;
    if (
      typeof version === 'number' &&
      Number.isInteger(version) &&
      version >= 0 &&
      version <= POSTGRES_INTEGER_MAX
    ) {
      return {
        userId: payload['userId'],
        email: payload['email'],
        role: payload['role'],
        version,
        exp: payload['exp'],
      };
    }
  }

  return null;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  // SignJWTのコンストラクタがRecord<string, unknown>を要求するため明示的に変換
  const jwtPayload: Record<string, unknown> = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    version: payload.version,
    exp: payload.exp,
  };

  return await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ['HS256'],
    });

    const session = readSessionPayload(payload);
    if (!session) {
      console.error('Invalid session payload structure');
      return null;
    }

    return session;
  } catch {
    console.error('Failed to verify session token');
    return null;
  }
}

export async function createSession(user: SessionUser): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    version: user.version,
    exp: expiresAt,
  };

  const token = await signSessionToken(payload);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production' && process.env['PLAYWRIGHT_TEST'] !== '1',
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

  return await verifySessionToken(token);
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
    version: session.version,
  };
}
