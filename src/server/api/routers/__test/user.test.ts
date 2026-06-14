import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestUser,
} from '../../../../test/helpers';

// ユーザー管理仕様(user.ts)を起点に検証する。
// 一覧/作成/メール検索/削除は ADMIN 限定。詳細・更新は本人または ADMIN。

let seq = 0;
const uniqueEmail = (p: string) => `${p}-${Date.now()}-${seq++}@example.com`;
const NON_EXISTENT_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxx';
const VALID_PASSWORD = 'Password123!';

const adminCaller = async () => {
  const admin = await createTestUser({ email: uniqueEmail('u-admin'), role: 'ADMIN' });
  return { admin, caller: await createAuthenticatedCaller(admin.id, admin.email, admin.role) };
};

describe('userRouter', () => {
  describe('getAll（一覧・ADMIN限定）', () => {
    it('ADMINは全ユーザーを取得できる', async () => {
      const { admin, caller } = await adminCaller();
      const other = await createTestUser({ email: uniqueEmail('u-list') });

      const result = await caller.user.getAll();
      const ids = result.map((u) => u.id);
      expect(ids).toContain(admin.id);
      expect(ids).toContain(other.id);
    });

    it('role でフィルタできる', async () => {
      const { admin, caller } = await adminCaller();
      const normal = await createTestUser({ email: uniqueEmail('u-normal'), role: 'USER' });

      const result = await caller.user.getAll({ role: 'USER' });
      const ids = result.map((u) => u.id);
      expect(ids).toContain(normal.id);
      expect(ids).not.toContain(admin.id);
    });

    it('一般ユーザーは取得を拒否される', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-deny'), role: 'USER' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.user.getAll()).rejects.toThrow('管理者権限が必要です');
    });
  });

  describe('getById（詳細・本人またはADMIN）', () => {
    it('本人は自分の詳細を取得できる', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-self') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.user.getById({ id: user.id });
      expect(result.id).toBe(user.id);
    });

    it('ADMINは他ユーザーの詳細を取得できる', async () => {
      const { caller } = await adminCaller();
      const target = await createTestUser({ email: uniqueEmail('u-admin-view') });
      const result = await caller.user.getById({ id: target.id });
      expect(result.id).toBe(target.id);
    });

    it('一般ユーザーは他人の詳細取得を拒否される', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-view-deny'), role: 'USER' });
      const other = await createTestUser({ email: uniqueEmail('u-view-target') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.user.getById({ id: other.id })).rejects.toThrow(
        'この操作を行う権限がありません',
      );
    });

    it('存在しないユーザーは NOT_FOUND', async () => {
      const { caller } = await adminCaller();
      await expect(caller.user.getById({ id: NON_EXISTENT_ID })).rejects.toThrow(
        'ユーザーが見つかりません',
      );
    });
  });

  describe('create（作成・ADMIN限定）', () => {
    it('ADMINはユーザーを作成できる', async () => {
      const { caller } = await adminCaller();
      const result = await caller.user.create({
        email: 'created@example.com',
        name: '作成ユーザー',
      });
      expect(result.email).toBe('created@example.com');
    });

    it('重複メールアドレスは拒否される', async () => {
      const { caller } = await adminCaller();
      await createTestUser({ email: 'exists@example.com' });
      await expect(caller.user.create({ email: 'exists@example.com' })).rejects.toThrow(
        'このメールアドレスは既に使用されています',
      );
    });

    it('一般ユーザーは作成を拒否される', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-create-deny'), role: 'USER' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.user.create({ email: 'x@example.com' })).rejects.toThrow(
        '管理者権限が必要です',
      );
    });
  });

  describe('update（更新・本人またはADMIN）', () => {
    it('本人は自分の名前を更新できる', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-upd-self') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.user.update({ id: user.id, name: '新しい名前' });
      expect(result.name).toBe('新しい名前');
    });

    it('本人による role/isActive の変更は拒否される', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-upd-role') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.user.update({ id: user.id, role: 'ADMIN' })).rejects.toThrow(
        'roleとisActiveは変更できません',
      );
    });

    it('一般ユーザーは他人の更新を拒否される', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-upd-deny'), role: 'USER' });
      const other = await createTestUser({ email: uniqueEmail('u-upd-other') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.user.update({ id: other.id, name: 'X' })).rejects.toThrow(
        '管理者権限が必要です',
      );
    });

    it('ADMINは他ユーザーの role を変更できる', async () => {
      const { caller } = await adminCaller();
      const target = await createTestUser({ email: uniqueEmail('u-promote'), role: 'USER' });
      const result = await caller.user.update({ id: target.id, role: 'ADMIN' });
      expect(result.role).toBe('ADMIN');
    });
  });

  describe('delete（無効化・ADMIN限定）', () => {
    it('ADMINによる削除はソフトデリート(isActive=false)になる', async () => {
      const { caller } = await adminCaller();
      const target = await createTestUser({ email: uniqueEmail('u-del') });

      const result = await caller.user.delete({ id: target.id });
      expect(result.success).toBe(true);

      const after = await prisma.user.findUnique({ where: { id: target.id } });
      expect(after).not.toBeNull();
      expect(after?.isActive).toBe(false);
    });

    it('一般ユーザーは削除を拒否される', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-del-deny'), role: 'USER' });
      const target = await createTestUser({ email: uniqueEmail('u-del-target') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.user.delete({ id: target.id })).rejects.toThrow('管理者権限が必要です');
    });
  });

  describe('updateProfile（プロフィール更新）', () => {
    it('名前とメールを更新できる', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-prof') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.user.updateProfile({
        name: 'プロフィール更新',
        email: 'updated-profile@example.com',
      });
      expect(result.name).toBe('プロフィール更新');
      expect(result.email).toBe('updated-profile@example.com');
    });

    it('他ユーザーが使用中のメールへの変更は拒否される', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-prof-self') });
      await createTestUser({ email: 'taken@example.com' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(
        caller.user.updateProfile({ name: 'X', email: 'taken@example.com' }),
      ).rejects.toThrow('このメールアドレスは既に使用されています');
    });
  });

  describe('changePassword（パスワード変更）', () => {
    it('正しい現在のパスワードで変更できる', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-pw'), password: VALID_PASSWORD });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.user.changePassword({
        currentPassword: VALID_PASSWORD,
        newPassword: 'NewPass456!',
      });
      expect(result.success).toBe(true);
    });

    it('現在のパスワードが誤っていると拒否される', async () => {
      const user = await createTestUser({
        email: uniqueEmail('u-pw-wrong'),
        password: VALID_PASSWORD,
      });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(
        caller.user.changePassword({ currentPassword: 'WrongPass1!', newPassword: 'NewPass456!' }),
      ).rejects.toThrow('現在のパスワードが正しくありません');
    });

    it('新しいパスワードが要件を満たさないと拒否される', async () => {
      const user = await createTestUser({
        email: uniqueEmail('u-pw-weak'),
        password: VALID_PASSWORD,
      });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(
        caller.user.changePassword({ currentPassword: VALID_PASSWORD, newPassword: 'weak' }),
      ).rejects.toThrow('新しいパスワードは8文字以上で入力してください');
    });
  });

  describe('認証ガード', () => {
    it('未認証では一覧取得が拒否される', async () => {
      const caller = await createTestCaller();
      await expect(caller.user.getAll()).rejects.toThrow('ログインが必要です');
    });
  });
});
