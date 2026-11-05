import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import type { UserRole } from './constant/roles';
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
  // JWTはステートレスで個別失効できないため、発行時点のUser.sessionVersionを埋め込み、
  // パスワード変更・ログアウト・無効化で繰り上がったDB側の値と照合して旧トークンを拒否する
  sv: number;
  exp: number;
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  sessionVersion: number;
}

const COOKIE_NAME = 'session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7日間

/**
 * SessionPayloadの型ガード
 */
function isSessionPayload(payload: JWTPayload): payload is JWTPayload & SessionPayload {
  return (
    typeof payload['userId'] === 'string' &&
    typeof payload['email'] === 'string' &&
    typeof payload['role'] === 'string' &&
    // svを持たない旧形式トークンはここで弾かれ、期限切れと同じく未ログイン扱いになる
    typeof payload['sv'] === 'number' &&
    typeof payload['exp'] === 'number'
  );
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  // SignJWTのコンストラクタがRecord<string, unknown>を要求するため明示的に変換
  const jwtPayload: Record<string, unknown> = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    sv: payload.sv,
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

    if (!isSessionPayload(payload)) {
      console.error('Invalid session payload structure');
      return null;
    }

    return payload;
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
    sv: user.sessionVersion,
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
    sessionVersion: session.sv,
  };
}
