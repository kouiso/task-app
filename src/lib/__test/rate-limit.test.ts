import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../prisma';
import { checkLoginRateLimit, extractClientIp, recordLoginSuccess } from '../rate-limit';

describe('rate-limit', () => {
  beforeEach(async () => {
    await prisma.loginAttempt.deleteMany();
  });

  describe('extractClientIp', () => {
    it('reads x-forwarded-for first hop', () => {
      const h = new Headers({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' });
      expect(extractClientIp(h)).toBe('203.0.113.1');
    });

    it('falls back to x-real-ip', () => {
      const h = new Headers({ 'x-real-ip': '203.0.113.2' });
      expect(extractClientIp(h)).toBe('203.0.113.2');
    });

    it('returns unknown when nothing provided', () => {
      expect(extractClientIp(new Headers())).toBe('unknown');
    });
  });

  describe('checkLoginRateLimit', () => {
    it('allows the first attempt for any email/ip', async () => {
      const r = await checkLoginRateLimit('a@example.com', '203.0.113.10');
      expect(r.allowed).toBe(true);
    });

    it('blocks email_locked after 5 failures from the same email+ip within window', async () => {
      for (let i = 0; i < 5; i++) {
        await expect(checkLoginRateLimit('user@example.com', '203.0.113.20')).resolves.toEqual({
          allowed: true,
        });
      }
      const r = await checkLoginRateLimit('user@example.com', '203.0.113.20');
      expect(r.allowed).toBe(false);
      if (!r.allowed) {
        expect(r.reason).toBe('email_locked');
        expect(r.retryAfterMs).toBeGreaterThan(0);
      }
    });

    it('blocks ip_locked after 20 failures from the same IP across emails', async () => {
      for (let i = 0; i < 20; i++) {
        await expect(checkLoginRateLimit(`u${i}@example.com`, '203.0.113.30')).resolves.toEqual({
          allowed: true,
        });
      }
      const r = await checkLoginRateLimit('different@example.com', '203.0.113.30');
      expect(r.allowed).toBe(false);
      if (!r.allowed) {
        expect(r.reason).toBe('ip_locked');
      }
    });

    it('does not block a different email and IP after many failures elsewhere', async () => {
      for (let i = 0; i < 20; i++) {
        await checkLoginRateLimit(`other-${i}@example.com`, '203.0.113.40');
      }
      const r = await checkLoginRateLimit('victim@example.com', '203.0.113.99');
      expect(r.allowed).toBe(true);
    });

    it('blocks one email after 10 failures across rotated IP addresses', async () => {
      for (let i = 0; i < 10; i++) {
        await expect(
          checkLoginRateLimit('rotated@example.com', `203.0.113.${100 + i}`),
        ).resolves.toEqual({ allowed: true });
      }

      const r = await checkLoginRateLimit('rotated@example.com', '203.0.113.200');
      expect(r.allowed).toBe(false);
      if (!r.allowed) {
        expect(r.reason).toBe('email_locked');
      }
    });

    it('allows only 5 of 10 concurrent attempts for the same email and IP', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          checkLoginRateLimit('concurrent@example.com', '203.0.113.210'),
        ),
      );

      expect(results.filter((result) => result.allowed)).toHaveLength(5);
      expect(results.filter((result) => !result.allowed)).toHaveLength(5);
      expect(
        results
          .filter((result) => !result.allowed)
          .every((result) => result.reason === 'email_locked'),
      ).toBe(true);
    });

    it('does not share an IP lock between callers whose IP is unknown', async () => {
      for (let i = 0; i < 20; i++) {
        await checkLoginRateLimit(`unknown-${i}@example.com`, 'unknown');
      }

      await expect(checkLoginRateLimit('new@example.com', 'unknown')).resolves.toEqual({
        allowed: true,
      });
    });

    it('does not count records older than the 15-minute window', async () => {
      // 20 分前のエントリを直接挿入する（rate-limit は 15分窓）
      const past = new Date(Date.now() - 20 * 60 * 1000);
      for (let i = 0; i < 10; i++) {
        await prisma.loginAttempt.create({
          data: { email: 'old@example.com', ip: '203.0.113.50', success: false, createdAt: past },
        });
      }
      const r = await checkLoginRateLimit('old@example.com', '203.0.113.50');
      expect(r.allowed).toBe(true);
    });

    it('lazy-cleanup removes records older than 30 days', async () => {
      const long = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      await prisma.loginAttempt.create({
        data: { email: 'aged@example.com', ip: '203.0.113.60', success: false, createdAt: long },
      });
      await checkLoginRateLimit('aged@example.com', '203.0.113.60');
      const expired = await prisma.loginAttempt.count({
        where: {
          email: 'aged@example.com',
          createdAt: { lt: new Date(Date.now() - 30 * 86400000) },
        },
      });
      const current = await prisma.loginAttempt.count({ where: { email: 'aged@example.com' } });
      expect(expired).toBe(0);
      expect(current).toBe(1);
    });
  });

  describe('recordLoginSuccess', () => {
    it('success clears failure history for the same email in the window', async () => {
      for (let i = 0; i < 4; i++) {
        await checkLoginRateLimit('reset@example.com', '203.0.113.70');
      }
      await recordLoginSuccess('reset@example.com', '203.0.113.70');
      expect(
        await prisma.loginAttempt.count({
          where: { email: 'reset@example.com', success: false },
        }),
      ).toBe(0);
      const r = await checkLoginRateLimit('reset@example.com', '203.0.113.70');
      expect(r.allowed).toBe(true);
    });
  });
});
