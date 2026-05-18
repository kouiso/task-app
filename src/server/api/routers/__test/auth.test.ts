import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestUser,
} from '../../../../test/helpers';

describe('authRouter', () => {
  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const testUser = await createTestUser({
        email: 'login-test@example.com',
        password: 'Password123!',
        name: 'Login Test User',
      });

      const caller = await createTestCaller();

      const result = await caller.auth.login({
        email: 'login-test@example.com',
        password: 'Password123!',
      });

      expect(result.user.id).toBe(testUser.id);
      expect(result.user.email).toBe(testUser.email);
      expect(result.user.name).toBe(testUser.name);
    });

    it('should fail login with incorrect password', async () => {
      await createTestUser({
        email: 'wrong-password@example.com',
        password: 'correctpassword',
      });

      const caller = await createTestCaller();

      await expect(
        caller.auth.login({
          email: 'wrong-password@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow('メールアドレスまたはパスワードが正しくありません');
    });

    it('should fail login when user does not exist', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.auth.login({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow('メールアドレスまたはパスワードが正しくありません');
    });

    it('should fail login when account is deactivated', async () => {
      await createTestUser({
        email: 'deactivated@example.com',
        password: 'Password123!',
        isActive: false,
      });

      const caller = await createTestCaller();

      await expect(
        caller.auth.login({
          email: 'deactivated@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow('このアカウントは無効化されています');
    });

    it('should fail login with invalid email format', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.auth.login({
          email: 'invalid-email',
          password: 'Password123!',
        }),
      ).rejects.toThrow();
    });

    it('should fail login with empty password', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.auth.login({
          email: 'test@example.com',
          password: '',
        }),
      ).rejects.toThrow();
    });

    it('should block login after 5 failed attempts from the same email+ip (rate-limit)', async () => {
      await createTestUser({
        email: 'ratelimit@example.com',
        password: 'CorrectPassword123!',
      });

      const headers = new Headers({ 'x-forwarded-for': '203.0.113.100' });
      const caller = await createTestCaller(null, headers);

      // 5 回失敗を意図的に発生させる
      for (let i = 0; i < 5; i++) {
        await expect(
          caller.auth.login({
            email: 'ratelimit@example.com',
            password: 'WrongPassword999!',
          }),
        ).rejects.toThrow();
      }

      // 6 回目は rate-limit で TOO_MANY_REQUESTS
      await expect(
        caller.auth.login({
          email: 'ratelimit@example.com',
          password: 'CorrectPassword123!',
        }),
      ).rejects.toThrow('上限');

      await prisma.loginAttempt.deleteMany({ where: { email: 'ratelimit@example.com' } });
    });

    it('should reset failure count on successful login', async () => {
      await createTestUser({
        email: 'reset-success@example.com',
        password: 'CorrectPassword123!',
      });

      const headers = new Headers({ 'x-forwarded-for': '203.0.113.101' });
      const caller = await createTestCaller(null, headers);

      // 4 回失敗 → 5 回目は成功 → そのあと 4 回失敗してもまだ block されない
      for (let i = 0; i < 4; i++) {
        await expect(
          caller.auth.login({
            email: 'reset-success@example.com',
            password: 'WrongPassword999!',
          }),
        ).rejects.toThrow();
      }
      const ok = await caller.auth.login({
        email: 'reset-success@example.com',
        password: 'CorrectPassword123!',
      });
      expect(ok.user.email).toBe('reset-success@example.com');

      // 成功 reset 後、また 4 回失敗しても allowed なまま
      for (let i = 0; i < 4; i++) {
        await expect(
          caller.auth.login({
            email: 'reset-success@example.com',
            password: 'WrongPassword999!',
          }),
        ).rejects.toThrow('メールアドレス');
      }

      await prisma.loginAttempt.deleteMany({ where: { email: 'reset-success@example.com' } });
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const caller = await createTestCaller();

      const result = await caller.auth.register({
        email: 'newuser@example.com',
        name: 'New User',
        password: 'Password123!',
      });

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.name).toBe('New User');
      expect(result.user.role).toBe('USER');

      const userInDb = await prisma.user.findUnique({
        where: { email: 'newuser@example.com' },
      });

      expect(userInDb).not.toBeNull();
      expect(userInDb?.password).not.toBe('Password123!');
    });

    it('should fail registration with duplicate email', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      const caller = await createTestCaller();

      await expect(
        caller.auth.register({
          email: 'duplicate@example.com',
          name: 'Duplicate User',
          password: 'Password123!',
        }),
      ).rejects.toThrow('このメールアドレスは既に登録されています');
    });

    it('should fail registration with invalid email', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.auth.register({
          email: 'invalid-email',
          name: 'Invalid Email User',
          password: 'Password123!',
        }),
      ).rejects.toThrow();
    });

    it('should fail registration with short password', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.auth.register({
          email: 'shortpw@example.com',
          name: 'Short Password User',
          password: 'short',
        }),
      ).rejects.toThrow();
    });

    it('should fail registration with empty name', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.auth.register({
          email: 'noname@example.com',
          name: '',
          password: 'Password123!',
        }),
      ).rejects.toThrow();
    });

    it('should set default role to USER', async () => {
      const caller = await createTestCaller();

      const result = await caller.auth.register({
        email: 'defaultrole@example.com',
        name: 'Default Role User',
        password: 'Password123!',
      });

      expect(result.user.role).toBe('USER');
    });

    it('should set isActive to true by default', async () => {
      const caller = await createTestCaller();

      await caller.auth.register({
        email: 'defaultactive@example.com',
        name: 'Default Active User',
        password: 'Password123!',
      });

      const user = await prisma.user.findUnique({
        where: { email: 'defaultactive@example.com' },
      });

      expect(user?.isActive).toBe(true);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const caller = await createTestCaller();

      const result = await caller.auth.logout();

      expect(result.success).toBe(true);
    });
  });

  describe('getSession', () => {
    it('should return session for authenticated user', async () => {
      const testUser = await createTestUser({
        email: 'session@example.com',
        name: 'Session User',
      });

      const caller = await createAuthenticatedCaller(testUser.id, testUser.email, testUser.role);

      const result = await caller.auth.getSession();

      expect(result).not.toBeNull();
      expect(result?.user.id).toBe(testUser.id);
      expect(result?.user.email).toBe(testUser.email);
    });

    it('should return null when not authenticated', async () => {
      const caller = await createTestCaller();

      const result = await caller.auth.getSession();

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const testUser = await createTestUser({
        email: 'inactive-session@example.com',
        isActive: false,
      });

      const caller = await createAuthenticatedCaller(testUser.id, testUser.email, testUser.role);

      const result = await caller.auth.getSession();

      expect(result).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user for authenticated user', async () => {
      const testUser = await createTestUser({
        email: 'current@example.com',
        name: 'Current User',
      });

      const caller = await createAuthenticatedCaller(testUser.id, testUser.email, testUser.role);

      const result = await caller.auth.getCurrentUser();

      expect(result.id).toBe(testUser.id);
      expect(result.email).toBe(testUser.email);
      expect(result.name).toBe(testUser.name);
    });

    it('should fail when not authenticated', async () => {
      const caller = await createTestCaller();

      await expect(caller.auth.getCurrentUser()).rejects.toThrow('ログインが必要です');
    });

    it('should fail when user is deleted', async () => {
      const testUser = await createTestUser({
        email: 'deleted@example.com',
      });

      const caller = await createAuthenticatedCaller(testUser.id, testUser.email, testUser.role);

      await prisma.user.delete({ where: { id: testUser.id } });

      await expect(caller.auth.getCurrentUser()).rejects.toThrow('ユーザーが見つかりません');
    });
  });
});
