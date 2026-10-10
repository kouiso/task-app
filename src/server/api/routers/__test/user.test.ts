import bcrypt from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestProject,
  createTestTask,
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

    it('プロジェクトから外れた本人には、そのプロジェクトの担当タスクを返さない', async () => {
      const owner = await createTestUser({ email: uniqueEmail('u-visible-owner') });
      const assignee = await createTestUser({ email: uniqueEmail('u-visible-assignee') });
      const project = await createTestProject(owner.id);
      await prisma.projectMember.create({
        data: { projectId: project.id, userId: assignee.id, role: 'MEMBER' },
      });
      const task = await createTestTask(project.id, owner.id, { assigneeId: assignee.id });
      const caller = await createAuthenticatedCaller(assignee.id, assignee.email, assignee.role);

      expect((await caller.user.getById({ id: assignee.id })).assignedTasks).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: task.id })]),
      );
      await prisma.projectMember.delete({
        where: { userId_projectId: { userId: assignee.id, projectId: project.id } },
      });

      expect((await caller.user.getById({ id: assignee.id })).assignedTasks).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: task.id })]),
      );
    });

    it('グローバルADMINでも、自分が所属しないプロジェクトの担当タスクを返さない', async () => {
      const { caller } = await adminCaller();
      const owner = await createTestUser({ email: uniqueEmail('u-admin-boundary-owner') });
      const target = await createTestUser({ email: uniqueEmail('u-admin-boundary-target') });
      const project = await createTestProject(owner.id);
      await prisma.projectMember.create({
        data: { projectId: project.id, userId: target.id, role: 'MEMBER' },
      });
      const task = await createTestTask(project.id, owner.id, { assigneeId: target.id });

      expect((await caller.user.getById({ id: target.id })).assignedTasks).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: task.id })]),
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

    it('更新項目がない入力を拒否する', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-upd-empty') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.user.update({ id: user.id })).rejects.toThrow(
        '更新する項目を1つ以上指定してください',
      );
    });

    it('本人による role/isActive の変更は拒否される', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-upd-role') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.user.update({ id: user.id, role: 'ADMIN' })).rejects.toThrow(
        'ロールとアクティブ状態は変更できません',
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

    it('無効化と再有効化のたびにversionを進め、古いセッションを復活させない', async () => {
      const { caller: admin } = await adminCaller();
      const target = await createTestUser({ email: uniqueEmail('u-reactivate') });
      const oldCaller = await createAuthenticatedCaller(target.id, target.email, target.role);

      await admin.user.update({ id: target.id, isActive: false });
      await admin.user.update({ id: target.id, isActive: true });

      const current = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
      expect(current).toMatchObject({ isActive: true, sessionVersion: 2 });
      await expect(oldCaller.user.getById({ id: target.id })).rejects.toThrow(
        'セッションが無効になりました',
      );
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

    it('通常のプロフィール更新ではversionを進めず、同じセッションを継続できる', async () => {
      const user = await createTestUser({ email: uniqueEmail('u-prof-version') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await caller.user.updateProfile({ name: '更新後', email: user.email });

      expect(
        await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { sessionVersion: true },
        }),
      ).toEqual({ sessionVersion: 0 });
      await expect(caller.user.getById({ id: user.id })).resolves.toMatchObject({ id: user.id });
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

    it.each([
      ['ASCII', `Aa1!${'x'.repeat(69)}`],
      ['日本語', `Aa1!${'あ'.repeat(22)}xxx`],
      ['絵文字', `Aa1!${'😀'.repeat(17)}x`],
    ])('%sでUTF-8の73バイトになる新しいパスワードを拒否する', async (_kind, newPassword) => {
      const user = await createTestUser({
        email: uniqueEmail('u-pw-bytes'),
        password: VALID_PASSWORD,
      });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(
        caller.user.changePassword({ currentPassword: VALID_PASSWORD, newPassword }),
      ).rejects.toThrow('パスワードはUTF-8で72バイト以内にしてください');
    });

    it('同じversionから競合した変更は一方だけ成功し、古いセッションを失効させる', async () => {
      const user = await createTestUser({
        email: uniqueEmail('u-pw-cas'),
        password: VALID_PASSWORD,
      });
      const firstCaller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const secondCaller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const passwords = ['FirstPass456!', 'SecondPass456!'] as const;

      const results = await Promise.allSettled([
        firstCaller.user.changePassword({
          currentPassword: VALID_PASSWORD,
          newPassword: passwords[0],
        }),
        secondCaller.user.changePassword({
          currentPassword: VALID_PASSWORD,
          newPassword: passwords[1],
        }),
      ]);

      expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
      expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
      const rejected = results.find(({ status }) => status === 'rejected');
      expect(rejected).toMatchObject({ reason: { code: 'UNAUTHORIZED' } });

      const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(updated.sessionVersion).toBe(1);
      const matchingPasswords = await Promise.all(
        passwords.map((password) => bcrypt.compare(password, updated.password ?? '')),
      );
      expect(matchingPasswords.filter(Boolean)).toHaveLength(1);
      await expect(firstCaller.user.getById({ id: user.id })).rejects.toThrow(
        'セッションが無効になりました',
      );

      const currentCaller = await createAuthenticatedCaller(
        user.id,
        user.email,
        user.role,
        updated.sessionVersion,
      );
      await expect(currentCaller.user.getById({ id: user.id })).resolves.toMatchObject({
        id: user.id,
      });
    });

    it('照合待機中に別の変更が確定した場合は古い読取値で上書きしない', async () => {
      const user = await createTestUser({
        email: uniqueEmail('u-pw-wait'),
        password: VALID_PASSWORD,
      });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      let releaseCompare!: () => void;
      let markCompareStarted!: () => void;
      const compareStarted = new Promise<void>((resolve) => {
        markCompareStarted = resolve;
      });
      const compareRelease = new Promise<void>((resolve) => {
        releaseCompare = resolve;
      });
      const compareSpy = vi.spyOn(bcrypt, 'compare').mockImplementationOnce(async () => {
        markCompareStarted();
        await compareRelease;
        return true;
      });

      try {
        const pending = caller.user.changePassword({
          currentPassword: VALID_PASSWORD,
          newPassword: 'WaitingPass456!',
        });
        await compareStarted;
        const concurrentPassword = await bcrypt.hash('ConcurrentPass456!', 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: concurrentPassword, sessionVersion: { increment: 1 } },
        });
        releaseCompare();

        await expect(pending).rejects.toThrow('セッションが無効になりました');
        const current = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
        expect(current.sessionVersion).toBe(1);
        await expect(bcrypt.compare('ConcurrentPass456!', current.password ?? '')).resolves.toBe(
          true,
        );
      } finally {
        releaseCompare();
        compareSpy.mockRestore();
      }
    });
  });

  describe('認証ガード', () => {
    it('未認証では一覧取得が拒否される', async () => {
      const caller = await createTestCaller();
      await expect(caller.user.getAll()).rejects.toThrow('ログインが必要です');
    });
  });
});
