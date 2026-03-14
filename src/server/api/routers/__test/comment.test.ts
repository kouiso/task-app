import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestComment,
  createTestProject,
  createTestTask,
  createTestUser,
} from '../../../../test/helpers';

describe('commentRouter', () => {
  describe('getByTaskId', () => {
    it('should return all comments for a task', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);
      await createTestComment(task.id, user.id, { content: 'Comment 1' });
      await createTestComment(task.id, user.id, { content: 'Comment 2' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const comments = await caller.comment.getByTaskId({ taskId: task.id });

      expect(comments).toHaveLength(2);
      expect(comments.some((c) => c.content === 'Comment 1')).toBe(true);
      expect(comments.some((c) => c.content === 'Comment 2')).toBe(true);
    });

    it('should return empty array when no comments exist', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const comments = await caller.comment.getByTaskId({ taskId: task.id });

      expect(comments).toHaveLength(0);
    });

    it('should include user information in comments', async () => {
      const user = await createTestUser({ name: 'Comment Author' });
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);
      await createTestComment(task.id, user.id, { content: 'Test Comment' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const comments = await caller.comment.getByTaskId({ taskId: task.id });

      expect(comments?.at(0)).toBeDefined();
      if (comments?.at(0)) {
        expect(comments.at(0)?.user?.name).toBe('Comment Author');
      }
    });

    it('should order comments by createdAt desc', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      await createTestComment(task.id, user.id, { content: 'First Comment' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createTestComment(task.id, user.id, { content: 'Second Comment' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const comments = await caller.comment.getByTaskId({ taskId: task.id });

      expect(comments?.at(0)?.content).toBe('Second Comment');
      expect(comments?.at(1)?.content).toBe('First Comment');
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.comment.getByTaskId({ taskId: 'clsometask' })).rejects.toThrow(
        'ログインが必要です',
      );
    });
  });

  describe('create', () => {
    it('should create a new comment', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const comment = await caller.comment.create({
        content: 'New Comment',
        taskId: task.id,
      });

      expect(comment.content).toBe('New Comment');
      expect(comment.taskId).toBe(task.id);
      expect(comment.userId).toBe(user.id);
    });

    it('should trim whitespace from content', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const comment = await caller.comment.create({
        content: '  Trimmed Content  ',
        taskId: task.id,
      });

      expect(comment.content).toBe('Trimmed Content');
    });

    it('should fail with empty content', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(
        caller.comment.create({
          content: '',
          taskId: task.id,
        }),
      ).rejects.toThrow();
    });

    it('should fail with whitespace-only content', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(
        caller.comment.create({
          content: '   ',
          taskId: task.id,
        }),
      ).rejects.toThrow();
    });

    it('should include user information in response', async () => {
      const user = await createTestUser({ name: 'Comment Creator' });
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const comment = await caller.comment.create({
        content: 'Test Comment',
        taskId: task.id,
      });

      expect(comment.user).toBeDefined();
      expect(comment.user.name).toBe('Comment Creator');
    });

    it('should reject non-member comment creation', async () => {
      const owner = await createTestUser();
      const nonMember = await createTestUser({ email: 'nonmember@example.com' });
      const project = await createTestProject(owner.id);
      const task = await createTestTask(project.id, owner.id);

      const caller = await createAuthenticatedCaller(nonMember.id, nonMember.email, nonMember.role);

      await expect(
        caller.comment.create({
          content: 'Non-member comment',
          taskId: task.id,
        }),
      ).rejects.toThrow('このタスクへのアクセス権限がありません');
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.comment.create({
          content: 'Unauthorized Comment',
          taskId: 'clsometask',
        }),
      ).rejects.toThrow('ログインが必要です');
    });
  });

  describe('update', () => {
    it('should update comment content', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);
      const comment = await createTestComment(task.id, user.id, { content: 'Original Content' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.comment.update({
        id: comment.id,
        content: 'Updated Content',
      });

      expect(updated.content).toBe('Updated Content');
    });

    it('should trim whitespace from updated content', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);
      const comment = await createTestComment(task.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.comment.update({
        id: comment.id,
        content: '  Trimmed Updated  ',
      });

      expect(updated.content).toBe('Trimmed Updated');
    });

    it('should fail with empty content', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);
      const comment = await createTestComment(task.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(
        caller.comment.update({
          id: comment.id,
          content: '',
        }),
      ).rejects.toThrow();
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.comment.update({
          id: 'clsomeid',
          content: 'Updated',
        }),
      ).rejects.toThrow('ログインが必要です');
    });
  });

  describe('delete', () => {
    it('should delete comment', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);
      const comment = await createTestComment(task.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.comment.delete({ id: comment.id });

      expect(result.success).toBe(true);

      const deletedComment = await prisma.comment.findUnique({ where: { id: comment.id } });
      expect(deletedComment).toBeNull();
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.comment.delete({ id: 'clsomeid' })).rejects.toThrow('ログインが必要です');
    });
  });
});
