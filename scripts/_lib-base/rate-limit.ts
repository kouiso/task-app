import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

const WINDOW_MS = 15 * 60 * 1000; // 15 分
const EMAIL_IP_LIMIT = 5; // 同一 email × IP の組み合わせで 5 回失敗 → block
const EMAIL_LIMIT = 10; // 同一 email 単独（IP を跨いだ合算）で 10 回失敗 → block (IP ローテーション対策)
const IP_LIMIT = 20; // 同一 IP のみで 20 回失敗 → block (bot 単一 IP 対策)
const RECORD_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 日
const UNKNOWN_IP = 'unknown';

// Vercel / Cloudflare / 一般的 reverse proxy が立てる header から client IP を抽出する。
// 先頭 = 最も近い proxy 直前の client。Spoofing 対策はインフラ側で行う前提。
// header が無い環境では 'unknown' を返し、IP 軸のカウントからは除外する
// （全員が 'unknown' を共有すると header の無い環境で相乗りロックアウトが起きるため）。
export function extractClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return UNKNOWN_IP;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: 'email_locked' | 'ip_locked'; retryAfterMs: number };

// rate-limit チェックと「試行枠の予約」を 1 トランザクションで行う。
// カウント (check) と記録 (record) を別々にすると、並行リクエストが全部カウント 0 の
// 状態でチェックを通過してしまうため、認証前に失敗行を先取りで INSERT しておく。
// 成功時は recordLoginSuccess が window 内の失敗行（予約行を含む）を消すので、
// 正規ユーザーの成功ログインは失敗としてカウントされない。
// 残る競合: READ COMMITTED では同時実行中のリクエスト数ぶんだけ上限を数件超過し得るが、
// 各試行が必ず 1 行を先に消費するため「無制限に素通り」は起きない（教材として許容する設計）。
export async function checkLoginRateLimit(email: string, ip: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_MS);
  const retentionCutoff = new Date(now - RECORD_RETENTION_MS);
  const hasKnownIp = ip !== UNKNOWN_IP;

  return await prisma.$transaction(async (tx) => {
    // 30 日より古いレコードは lazy cleanup
    await tx.loginAttempt.deleteMany({
      where: { createdAt: { lt: retentionCutoff } },
    });

    const emailFails = await tx.loginAttempt.count({
      where: { email, success: false, createdAt: { gte: windowStart } },
    });
    if (emailFails >= EMAIL_LIMIT) {
      return { allowed: false, reason: 'email_locked', retryAfterMs: WINDOW_MS } as const;
    }

    if (hasKnownIp) {
      const emailIpFails = await tx.loginAttempt.count({
        where: { email, ip, success: false, createdAt: { gte: windowStart } },
      });
      if (emailIpFails >= EMAIL_IP_LIMIT) {
        return { allowed: false, reason: 'email_locked', retryAfterMs: WINDOW_MS } as const;
      }

      const ipFails = await tx.loginAttempt.count({
        where: { ip, success: false, createdAt: { gte: windowStart } },
      });
      if (ipFails >= IP_LIMIT) {
        return { allowed: false, reason: 'ip_locked', retryAfterMs: WINDOW_MS } as const;
      }
    }

    // 認証前の先取り INSERT（予約）。認証に成功したら recordLoginSuccess が削除する
    await tx.loginAttempt.create({ data: { email, ip, success: false } });
    return { allowed: true } as const;
  });
}

// login 成功時の記録。window 内の失敗履歴（checkLoginRateLimit の予約行を含む）を削除して、
// 正規ユーザーが直後に再 login できるようにする。
export async function recordLoginSuccess(email: string, ip: string): Promise<void> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  await prisma.$transaction([
    prisma.loginAttempt.deleteMany({
      where: { email, success: false, createdAt: { gte: windowStart } },
    }),
    prisma.loginAttempt.create({ data: { email, ip, success: true } }),
  ]);
}

export function rateLimitToTRPCError(
  result: Exclude<RateLimitResult, { allowed: true }>,
): TRPCError {
  const minutes = Math.ceil(result.retryAfterMs / 60_000);
  const message =
    result.reason === 'email_locked'
      ? `ログイン試行回数が上限に達しました。${minutes} 分後にもう一度お試しください`
      : `このアクセス元からの試行回数が上限に達しました。${minutes} 分後にもう一度お試しください`;
  return new TRPCError({ code: 'TOO_MANY_REQUESTS', message });
}
