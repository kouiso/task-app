import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestProject,
  createTestTask,
  createTestUser,
} from '../../../../test/helpers';

// タスク仕様(task.ts / doc/09_task_create_edit.md / doc/10_task_delete_search.md)を起点に検証する。
// 編集系は canEdit(OWNER/ADMIN/MEMBER)、削除系は canDelete(OWNER/ADMIN)、閲覧はメンバーであること。

type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
const NON_EXISTENT_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxx';

let seq = 0;
const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${seq++}@example.com`;

// acting ユーザーを指定ロールの唯一メンバーとして持つプロジェクトを用意する
async function setup(role: MemberRole) {
  const actor = await createTestUser({ email: uniqueEmail('task-actor') });
  const project = await createTestProject(actor.id); // 作成者は OWNER
  if (role !== 'OWNER') {
    await prisma.projectMember.update({
      where: { userId_projectId: { userId: actor.id, projectId: project.id } },
      data: { role },
    });
  }
  const caller = await createAuthenticatedCaller(actor.id, actor.email, actor.role);
  return { actor, project, caller };
}

describe('taskRouter', () => {
  describe('getAll（一覧）', () => {
    it('自分のプロジェクトのタスクを返す', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id, { title: 'My Task' });

      const result = await caller.task.getAll();
      expect(result.map((t) => t.id)).toContain(task.id);
    });

    it('status でフィルタできる', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      await createTestTask(project.id, actor.id, { status: 'TODO' });
      const done = await createTestTask(project.id, actor.id, { status: 'DONE' });

      const result = await caller.task.getAll({ status: 'DONE' });
      expect(result.map((t) => t.id)).toEqual([done.id]);
    });

    it('権限の無いプロジェクトIDを指定すると拒否される', async () => {
      const { caller } = await setup('MEMBER');
      const other = await createTestUser({ email: uniqueEmail('task-other') });
      const otherProject = await createTestProject(other.id);

      await expect(caller.task.getAll({ projectId: otherProject.id })).rejects.toThrow(
        'このプロジェクトへのアクセス権限がありません',
      );
    });
  });

  describe('getById（詳細）', () => {
    it('メンバーはタスク詳細を閲覧できる', async () => {
      const { actor, project, caller } = await setup('VIEWER');
      const task = await createTestTask(project.id, actor.id);
      const result = await caller.task.getById({ id: task.id });
      expect(result.id).toBe(task.id);
    });

    it('非メンバーは閲覧を拒否される', async () => {
      const { actor, project } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id);
      const stranger = await createTestUser({ email: uniqueEmail('task-stranger') });
      const caller = await createAuthenticatedCaller(stranger.id, stranger.email, stranger.role);

      await expect(caller.task.getById({ id: task.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('存在しないタスクは NOT_FOUND', async () => {
      const { caller } = await setup('MEMBER');
      await expect(caller.task.getById({ id: NON_EXISTENT_ID })).rejects.toThrow(
        'タスクが見つかりません',
      );
    });
  });

  describe('create（作成）', () => {
    it('MEMBER(canEdit)はタスクを作成できる', async () => {
      const { project, caller } = await setup('MEMBER');
      const task = await caller.task.create({ title: '新タスク', projectId: project.id });
      expect(task.title).toBe('新タスク');
      expect(task.status).toBe('TODO');
    });

    it('VIEWERはタスク作成を拒否される(canEdit権限なし)', async () => {
      const { project, caller } = await setup('VIEWER');
      await expect(caller.task.create({ title: 'X', projectId: project.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('タイトルが空なら拒否する', async () => {
      const { project, caller } = await setup('OWNER');
      await expect(caller.task.create({ title: '', projectId: project.id })).rejects.toThrow(
        'タイトルは必須です',
      );
    });

    it('存在しないプロジェクトは NOT_FOUND', async () => {
      const { caller } = await setup('OWNER');
      await expect(caller.task.create({ title: 'X', projectId: NON_EXISTENT_ID })).rejects.toThrow(
        'プロジェクトが見つかりません',
      );
    });

    it('担当者がプロジェクト未参加なら拒否する', async () => {
      const { project, caller } = await setup('OWNER');
      const outsider = await createTestUser({ email: uniqueEmail('task-outsider') });
      await expect(
        caller.task.create({ title: 'X', projectId: project.id, assigneeId: outsider.id }),
      ).rejects.toThrow('担当者にはこのプロジェクトのメンバーを指定してください');
    });

    it('プロジェクトメンバーを担当者に指定できる', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await caller.task.create({
        title: '担当付き',
        projectId: project.id,
        assigneeId: actor.id,
      });
      expect(task.assigneeId).toBe(actor.id);
    });
  });

  describe('update（更新）', () => {
    it('MEMBERはタスクを更新できる', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id);
      const result = await caller.task.update({ id: task.id, title: '更新後' });
      expect(result.title).toBe('更新後');
    });

    it('VIEWERは更新を拒否される', async () => {
      const { actor, project, caller } = await setup('VIEWER');
      const task = await createTestTask(project.id, actor.id);
      await expect(caller.task.update({ id: task.id, title: 'X' })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('ステータスをDONEにすると completedAt が記録される', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id, { status: 'TODO' });
      const result = await caller.task.update({ id: task.id, status: 'DONE' });
      expect(result.status).toBe('DONE');
      expect(result.completedAt).not.toBeNull();
    });

    it('楽観ロック: 古い expectedUpdatedAt では競合エラー', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id);
      const staleDate = new Date(task.updatedAt.getTime() - 1000).toISOString();
      await expect(
        caller.task.update({ id: task.id, title: 'X', expectedUpdatedAt: staleDate }),
      ).rejects.toThrow('タスクの内容が更新されています');
    });

    it('存在しないタスクは NOT_FOUND', async () => {
      const { caller } = await setup('OWNER');
      await expect(caller.task.update({ id: NON_EXISTENT_ID, title: 'X' })).rejects.toThrow(
        'タスクが見つかりません',
      );
    });
  });

  describe('delete（削除）', () => {
    it('OWNER(canDelete)はタスクを削除できる', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id);
      const result = await caller.task.delete({ id: task.id });
      expect(result.success).toBe(true);
      expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
    });

    it('MEMBERは削除を拒否される(canDelete権限なし)', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id);
      await expect(caller.task.delete({ id: task.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });
  });

  describe('addTime（時間追加）', () => {
    it('canEditがあれば作業時間を加算できる', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id);
      const result = await caller.task.addTime({ id: task.id, minutesToAdd: 30 });
      expect(result.timeSpentMinutes).toBe(30);
    });
  });

  describe('bulkComplete / bulkDelete / bulkUpdateStatus（一括操作）', () => {
    it('bulkComplete: 対象タスクを完了にする', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const t1 = await createTestTask(project.id, actor.id, { status: 'TODO' });
      const t2 = await createTestTask(project.id, actor.id, { status: 'IN_PROGRESS' });

      const result = await caller.task.bulkComplete({ ids: [t1.id, t2.id] });
      expect(result.count).toBe(2);
      const updated = await prisma.task.findMany({ where: { id: { in: [t1.id, t2.id] } } });
      expect(updated.every((t) => t.status === 'DONE')).toBe(true);
    });

    it('bulkDelete: OWNERは一括削除できる', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const t1 = await createTestTask(project.id, actor.id);
      const t2 = await createTestTask(project.id, actor.id);
      const result = await caller.task.bulkDelete({ ids: [t1.id, t2.id] });
      expect(result.count).toBe(2);
    });

    it('bulkDelete: MEMBERは一括削除を拒否される', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id);
      await expect(caller.task.bulkDelete({ ids: [task.id] })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('bulkUpdateStatus: ステータスを一括変更する', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const t1 = await createTestTask(project.id, actor.id, { status: 'TODO' });
      const t2 = await createTestTask(project.id, actor.id, { status: 'TODO' });
      const result = await caller.task.bulkUpdateStatus({
        ids: [t1.id, t2.id],
        status: 'IN_PROGRESS',
      });
      expect(result.count).toBe(2);
    });

    it('一括操作で他人のプロジェクトのタスクは拒否される', async () => {
      const { caller } = await setup('OWNER');
      const other = await createTestUser({ email: uniqueEmail('task-bulk-other') });
      const otherProject = await createTestProject(other.id);
      const otherTask = await createTestTask(otherProject.id, other.id);
      // タスク自体は存在するため、メンバーでないことによる権限エラーになる
      await expect(caller.task.bulkComplete({ ids: [otherTask.id] })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('一括操作で存在しないタスクIDが含まれると NOT_FOUND', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id);
      await expect(caller.task.bulkComplete({ ids: [task.id, NON_EXISTENT_ID] })).rejects.toThrow(
        'タスクが見つかりません',
      );
    });
  });

  describe('認証ガード', () => {
    it('未認証ではタスク一覧取得が拒否される', async () => {
      const caller = await createTestCaller();
      await expect(caller.task.getAll()).rejects.toThrow('ログインが必要です');
    });
  });
});
