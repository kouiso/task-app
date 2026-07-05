import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestComment,
  createTestProject,
  createTestTask,
  createTestUser,
} from '../../../../test/helpers';

// コメント仕様(comment.ts / doc/12_comment_feature.md)を起点に検証する。
// 閲覧はメンバー、投稿は canEdit、編集・削除は「メンバー かつ 自分のコメント」のみ可能。

type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
const NON_EXISTENT_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxx';

let seq = 0;
const uniqueEmail = (p: string) => `${p}-${Date.now()}-${seq++}@example.com`;

async function setup(role: MemberRole) {
  const actor = await createTestUser({ email: uniqueEmail('cm-actor') });
  const project = await createTestProject(actor.id);
  if (role !== 'OWNER') {
    await prisma.projectMember.update({
      where: { userId_projectId: { userId: actor.id, projectId: project.id } },
      data: { role },
    });
  }
  const task = await createTestTask(project.id, actor.id);
  const caller = await createAuthenticatedCaller(actor.id, actor.email, actor.role);
  return { actor, project, task, caller };
}

describe('commentRouter', () => {
  describe('getByTaskId（一覧）', () => {
    it('メンバーはタスクのコメントを取得できる(VIEWERでも可)', async () => {
      const { actor, task, caller } = await setup('VIEWER');
      const comment = await createTestComment(task.id, actor.id, { content: 'コメント本文' });

      const result = await caller.comment.getByTaskId({ taskId: task.id });
      expect(result.map((c) => c.id)).toContain(comment.id);
    });

    it('存在しないタスクは NOT_FOUND', async () => {
      const { caller } = await setup('OWNER');
      await expect(caller.comment.getByTaskId({ taskId: NON_EXISTENT_ID })).rejects.toThrow(
        'タスクが見つかりません',
      );
    });

    it('非メンバーは取得を拒否される', async () => {
      const { task } = await setup('OWNER');
      const stranger = await createTestUser({ email: uniqueEmail('cm-stranger') });
      const caller = await createAuthenticatedCaller(stranger.id, stranger.email, stranger.role);

      await expect(caller.comment.getByTaskId({ taskId: task.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });
  });

  describe('create（投稿）', () => {
    it('canEditメンバーはコメントを投稿できる', async () => {
      const { task, caller } = await setup('MEMBER');
      const result = await caller.comment.create({ taskId: task.id, content: '進捗報告です' });
      expect(result.content).toBe('進捗報告です');
    });

    it('VIEWERは投稿を拒否される', async () => {
      const { task, caller } = await setup('VIEWER');
      await expect(caller.comment.create({ taskId: task.id, content: 'x' })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('空のコメントは拒否される', async () => {
      const { task, caller } = await setup('OWNER');
      await expect(caller.comment.create({ taskId: task.id, content: '   ' })).rejects.toThrow(
        'コメント内容は必須です',
      );
    });
  });

  describe('update（編集）', () => {
    it('自分のコメントは編集できる', async () => {
      const { actor, task, caller } = await setup('MEMBER');
      const comment = await createTestComment(task.id, actor.id, { content: '元の内容' });

      const result = await caller.comment.update({ id: comment.id, content: '編集後の内容' });
      expect(result.content).toBe('編集後の内容');
    });

    it('他人のコメントは編集できない', async () => {
      const { project, task, caller } = await setup('OWNER');
      const colleague = await createTestUser({ email: uniqueEmail('cm-colleague') });
      await prisma.projectMember.create({
        data: { projectId: project.id, userId: colleague.id, role: 'MEMBER' },
      });
      const othersComment = await createTestComment(task.id, colleague.id, { content: '他人の' });

      await expect(caller.comment.update({ id: othersComment.id, content: 'X' })).rejects.toThrow(
        '自分のコメントのみ編集・削除できます',
      );
    });

    it('存在しないコメントは NOT_FOUND', async () => {
      const { caller } = await setup('OWNER');
      await expect(caller.comment.update({ id: NON_EXISTENT_ID, content: 'X' })).rejects.toThrow(
        'コメントが見つかりません',
      );
    });
  });

  describe('delete（削除）', () => {
    it('自分のコメントは削除できる', async () => {
      const { actor, task, caller } = await setup('MEMBER');
      const comment = await createTestComment(task.id, actor.id);

      const result = await caller.comment.delete({ id: comment.id });
      expect(result.success).toBe(true);
      expect(await prisma.comment.findUnique({ where: { id: comment.id } })).toBeNull();
    });

    it('他人のコメントは削除できない', async () => {
      const { project, task, caller } = await setup('OWNER');
      const colleague = await createTestUser({ email: uniqueEmail('cm-del-colleague') });
      await prisma.projectMember.create({
        data: { projectId: project.id, userId: colleague.id, role: 'MEMBER' },
      });
      const othersComment = await createTestComment(task.id, colleague.id);

      await expect(caller.comment.delete({ id: othersComment.id })).rejects.toThrow(
        '自分のコメントのみ編集・削除できます',
      );
    });
  });
});
