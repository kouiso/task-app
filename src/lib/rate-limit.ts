import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

// Vercel / Cloudflare / 一般的 reverse proxy が立てる header から client IP を抽出する。
// 先頭 = 最も近い proxy 直前の client。Spoofing 対策はインフラ側で行う前提。
// テスト環境などで何も無い場合は 'unknown' を返してカウントに含めない設計（攻撃成立しないため）。
export function extractClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

const WINDOW_MS = 15 * 60 * 1000; // 15 分
const EMAIL_LIMIT = 5; // 同一 email × IP の組み合わせで 5 回失敗 → block
const IP_LIMIT = 20; // 同一 IP のみで 20 回失敗 → block (bot 単一 IP 対策)
const RECORD_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 日

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: 'email_locked' | 'ip_locked'; retryAfterMs: number };

// 直近 WINDOW_MS の失敗回数を email × ip と ip 単独で並列カウントし、
// 上限超過時は 429 相当を返す。
// 30 日より古いレコードは同時に lazy cleanup する。
export async function checkLoginRateLimit(email: string, ip: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_MS);
  const retentionCutoff = new Date(now - RECORD_RETENTION_MS);

  const [emailFails, ipFails] = await Promise.all([
    prisma.loginAttempt.count({
      where: {
        email,
        ip,
        success: false,
        createdAt: { gte: windowStart },
      },
    }),
    prisma.loginAttempt.count({
      where: {
        ip,
        success: false,
        createdAt: { gte: windowStart },
      },
    }),
    prisma.loginAttempt.deleteMany({
      where: { createdAt: { lt: retentionCutoff } },
    }),
  ]);

  if (emailFails >= EMAIL_LIMIT) {
    return { allowed: false, reason: 'email_locked', retryAfterMs: WINDOW_MS };
  }
  if (ipFails >= IP_LIMIT) {
    return { allowed: false, reason: 'ip_locked', retryAfterMs: WINDOW_MS };
  }
  return { allowed: true };
}

// login 試行結果を記録する。成功時は email の失敗履歴を reset（古い IP からの reattempt は許容）。
export async function recordLoginAttempt(
  email: string,
  ip: string,
  success: boolean,
): Promise<void> {
  if (success) {
    // 該当 email の失敗履歴を WINDOW 内分だけ削除して、正規ユーザーが直後に再 login できるようにする
    const windowStart = new Date(Date.now() - WINDOW_MS);
    await prisma.$transaction([
      prisma.loginAttempt.deleteMany({
        where: { email, success: false, createdAt: { gte: windowStart } },
      }),
      prisma.loginAttempt.create({ data: { email, ip, success: true } }),
    ]);
  } else {
    await prisma.loginAttempt.create({ data: { email, ip, success: false } });
  }
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
