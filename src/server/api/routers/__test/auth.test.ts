import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestUser,
} from '../../../../test/helpers';

// 認証仕様(auth.ts / doc/06_nextauth.md)を起点に、login / register / logout /
// getSession / getCurrentUser の正常系・バリデーション・レート制限・アカウント無効化を検証する。

// 登録バリデーションを満たすパスワード(8文字以上 + 大文字 + 小文字 + 数字 + 特殊文字)
const VALID_PASSWORD = 'Password123!';

describe('authRouter', () => {
  // レート制限は loginAttempt テーブルを参照するが、共通の afterEach では TRUNCATE されない。
  // 同一IPの失敗が累積して後続テストを誤ってブロックしないよう、各テスト前に明示的にクリアする。
  beforeEach(async () => {
    await prisma.loginAttempt.deleteMany();
  });

  describe('register（新規登録）', () => {
    it('有効な入力で登録でき、role=USER・isActive=true・パスワードはハッシュ化される', async () => {
      const caller = await createTestCaller();

      const result = await caller.auth.register({
        name: '新規ユーザー',
        email: 'new-user@example.com',
        password: VALID_PASSWORD,
      });

      expect(result.user.email).toBe('new-user@example.com');
      expect(result.user.name).toBe('新規ユーザー');
      expect(result.user.role).toBe('USER');

      const created = await prisma.user.findUnique({ where: { email: 'new-user@example.com' } });
      expect(created?.role).toBe('USER');
      expect(created?.isActive).toBe(true);
      expect(created?.password).not.toBe(VALID_PASSWORD);
    });

    it('重複メールアドレスは拒否する', async () => {
      await createTestUser({ email: 'dup@example.com' });
      const caller = await createTestCaller();

      await expect(
        caller.auth.register({ name: 'X', email: 'dup@example.com', password: VALID_PASSWORD }),
      ).rejects.toThrow('このメールアドレスは既に登録されています');
    });

    it('名前が空ならバリデーションエラー', async () => {
      const caller = await createTestCaller();
      await expect(
        caller.auth.register({ name: '', email: 'a@example.com', password: VALID_PASSWORD }),
      ).rejects.toThrow('名前を入力してください');
    });

    it('メール形式が不正ならバリデーションエラー', async () => {
      const caller = await createTestCaller();
      await expect(
        caller.auth.register({ name: 'X', email: 'invalid-email', password: VALID_PASSWORD }),
      ).rejects.toThrow('有効なメールアドレスを入力してください');
    });

    it('8文字未満のパスワードは拒否する', async () => {
      const caller = await createTestCaller();
      await expect(
        caller.auth.register({ name: 'X', email: 'a@example.com', password: 'Ab1!' }),
      ).rejects.toThrow('パスワードは8文字以上で入力してください');
    });

    it('大文字を含まないパスワードは拒否する', async () => {
      const caller = await createTestCaller();
      await expect(
        caller.auth.register({ name: 'X', email: 'a@example.com', password: 'password1!' }),
      ).rejects.toThrow('パスワードには大文字を含める必要があります');
    });

    it('数字を含まないパスワードは拒否する', async () => {
      const caller = await createTestCaller();
      await expect(
        caller.auth.register({ name: 'X', email: 'a@example.com', password: 'Password!' }),
      ).rejects.toThrow('パスワードには数字を含める必要があります');
    });

    it('特殊文字を含まないパスワードは拒否する', async () => {
      const caller = await createTestCaller();
      await expect(
        caller.auth.register({ name: 'X', email: 'a@example.com', password: 'Password123' }),
      ).rejects.toThrow('パスワードには特殊文字を含める必要があります');
    });
  });

  describe('login（ログイン）', () => {
    it('正しい資格情報でログインに成功しユーザー情報を返す', async () => {
      const user = await createTestUser({ email: 'login@example.com', password: VALID_PASSWORD });
      const caller = await createTestCaller();

      const result = await caller.auth.login({
        email: 'login@example.com',
        password: VALID_PASSWORD,
      });

      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe('login@example.com');
    });

    it('パスワードが誤っている場合は認証エラー', async () => {
      await createTestUser({ email: 'login2@example.com', password: VALID_PASSWORD });
      const caller = await createTestCaller();

      await expect(
        caller.auth.login({ email: 'login2@example.com', password: 'WrongPass1!' }),
      ).rejects.toThrow('メールアドレスまたはパスワードが正しくありません');
    });

    it('存在しないユーザーは(有無を秘匿し)同一の認証エラー', async () => {
      const caller = await createTestCaller();
      await expect(
        caller.auth.login({ email: 'nope@example.com', password: VALID_PASSWORD }),
      ).rejects.toThrow('メールアドレスまたはパスワードが正しくありません');
    });

    it('無効化アカウントはログインを拒否する', async () => {
      await createTestUser({
        email: 'inactive@example.com',
        password: VALID_PASSWORD,
        isActive: false,
      });
      const caller = await createTestCaller();

      await expect(
        caller.auth.login({ email: 'inactive@example.com', password: VALID_PASSWORD }),
      ).rejects.toThrow('このアカウントは無効化されています');
    });

    it('メール形式が不正ならバリデーションエラー', async () => {
      const caller = await createTestCaller();
      await expect(
        caller.auth.login({ email: 'invalid', password: VALID_PASSWORD }),
      ).rejects.toThrow('有効なメールアドレスを入力してください');
    });

    it('パスワードが空ならバリデーションエラー', async () => {
      const caller = await createTestCaller();
      await expect(caller.auth.login({ email: 'a@example.com', password: '' })).rejects.toThrow(
        'パスワードを入力してください',
      );
    });

    it('同一email×IPで5回失敗するとレート制限でブロックされる', async () => {
      await createTestUser({ email: 'brute@example.com', password: VALID_PASSWORD });
      const caller = await createTestCaller();

      for (let i = 0; i < 5; i++) {
        await expect(
          caller.auth.login({ email: 'brute@example.com', password: 'WrongPass1!' }),
        ).rejects.toThrow();
      }

      // 6回目は正しいパスワードでもブロックされる
      await expect(
        caller.auth.login({ email: 'brute@example.com', password: VALID_PASSWORD }),
      ).rejects.toThrow('上限に達しました');
    });

    it('ログイン成功で失敗カウントがリセットされ、直後はブロックされない', async () => {
      await createTestUser({ email: 'reset@example.com', password: VALID_PASSWORD });
      const caller = await createTestCaller();

      for (let i = 0; i < 4; i++) {
        await expect(
          caller.auth.login({ email: 'reset@example.com', password: 'WrongPass1!' }),
        ).rejects.toThrow();
      }

      const ok = await caller.auth.login({ email: 'reset@example.com', password: VALID_PASSWORD });
      expect(ok.user.email).toBe('reset@example.com');

      // カウントがリセットされているため、次の失敗はレート制限ではなく通常の認証エラーになる
      await expect(
        caller.auth.login({ email: 'reset@example.com', password: 'WrongPass1!' }),
      ).rejects.toThrow('メールアドレスまたはパスワードが正しくありません');
    });
  });

  describe('logout（ログアウト）', () => {
    it('ログアウトは success:true を返す', async () => {
      const caller = await createTestCaller();
      const result = await caller.auth.logout();
      expect(result.success).toBe(true);
    });
  });

  describe('getSession（セッション取得）', () => {
    it('未認証では null を返す', async () => {
      const caller = await createTestCaller();
      expect(await caller.auth.getSession()).toBeNull();
    });

    it('認証済み(有効ユーザー)ではユーザーを返す', async () => {
      const user = await createTestUser({ email: 'sess@example.com' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.auth.getSession();
      expect(result?.user.id).toBe(user.id);
    });

    it('無効化ユーザーのセッションは null を返す', async () => {
      const user = await createTestUser({ email: 'sess-inactive@example.com', isActive: false });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      expect(await caller.auth.getSession()).toBeNull();
    });
  });

  describe('getCurrentUser（現在のユーザー）', () => {
    it('認証済みでユーザー情報(createdAt含む)を返す', async () => {
      const user = await createTestUser({ email: 'cur@example.com' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.auth.getCurrentUser();
      expect(result.id).toBe(user.id);
      expect(result.createdAt).toBeDefined();
    });

    it('未認証では拒否される', async () => {
      const caller = await createTestCaller();
      await expect(caller.auth.getCurrentUser()).rejects.toThrow('ログインが必要です');
    });

    it('セッションのユーザーが削除済みなら NOT_FOUND', async () => {
      const user = await createTestUser({ email: 'deleted@example.com' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await prisma.user.delete({ where: { id: user.id } });

      await expect(caller.auth.getCurrentUser()).rejects.toThrow('ユーザーが見つかりません');
    });

    it('無効化ユーザーは拒否される', async () => {
      const user = await createTestUser({ email: 'cur-inactive@example.com', isActive: false });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(caller.auth.getCurrentUser()).rejects.toThrow(
        'このアカウントは無効化されています',
      );
    });
  });
});
