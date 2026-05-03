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

async function createCommentProjectCallerWithRole(role: 'OWNER' | 'EDITOR' | 'VIEWER') {
  const owner = await createTestUser({ email: `comment-owner-${Date.now()}@example.com` });
  const actor = await createTestUser({
    email: `comment-${role.toLowerCase()}-${Date.now()}@example.com`,
  });
  const project = await createTestProject(owner.id);

  if (role !== 'OWNER') {
    await prisma.projectMember.create({
      data: {
        userId: actor.id,
        projectId: project.id,
        role: role === 'EDITOR' ? 'MEMBER' : 'VIEWER',
      },
    });
  }

  const callerUser = role === 'OWNER' ? owner : actor;
  const caller = await createAuthenticatedCaller(callerUser.id, callerUser.email, callerUser.role);

  return { caller, owner, actor: callerUser, project };
}

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
      ).rejects.toThrow('この操作を実行する権限がありません');
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

    it('should reject VIEWER from creating comment', async () => {
      const { caller, owner, project } = await createCommentProjectCallerWithRole('VIEWER');
      const task = await createTestTask(project.id, owner.id);

      await expect(
        caller.comment.create({
          content: 'Viewer comment',
          taskId: task.id,
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should allow OWNER and EDITOR to create comment', async () => {
      const ownerContext = await createCommentProjectCallerWithRole('OWNER');
      const ownerTask = await createTestTask(ownerContext.project.id, ownerContext.owner.id);
      const ownerComment = await ownerContext.caller.comment.create({
        content: 'Owner comment',
        taskId: ownerTask.id,
      });
      expect(ownerComment.content).toBe('Owner comment');

      const editorContext = await createCommentProjectCallerWithRole('EDITOR');
      const editorTask = await createTestTask(editorContext.project.id, editorContext.owner.id);
      const editorComment = await editorContext.caller.comment.create({
        content: 'Editor comment',
        taskId: editorTask.id,
      });
      expect(editorComment.content).toBe('Editor comment');
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

    it('should reject VIEWER from updating own comment', async () => {
      const { caller, actor, project } = await createCommentProjectCallerWithRole('VIEWER');
      const task = await createTestTask(project.id, actor.id);
      const comment = await createTestComment(task.id, actor.id, { content: 'Viewer Original' });

      await expect(
        caller.comment.update({
          id: comment.id,
          content: 'Viewer Updated',
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should allow OWNER and EDITOR to update own comment', async () => {
      const ownerContext = await createCommentProjectCallerWithRole('OWNER');
      const ownerTask = await createTestTask(ownerContext.project.id, ownerContext.owner.id);
      const ownerComment = await createTestComment(ownerTask.id, ownerContext.actor.id, {
        content: 'Owner Original',
      });
      const ownerUpdated = await ownerContext.caller.comment.update({
        id: ownerComment.id,
        content: 'Owner Updated',
      });
      expect(ownerUpdated.content).toBe('Owner Updated');

      const editorContext = await createCommentProjectCallerWithRole('EDITOR');
      const editorTask = await createTestTask(editorContext.project.id, editorContext.owner.id);
      const editorComment = await createTestComment(editorTask.id, editorContext.actor.id, {
        content: 'Editor Original',
      });
      const editorUpdated = await editorContext.caller.comment.update({
        id: editorComment.id,
        content: 'Editor Updated',
      });
      expect(editorUpdated.content).toBe('Editor Updated');
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

    it('should reject VIEWER from deleting own comment', async () => {
      const { caller, actor, project } = await createCommentProjectCallerWithRole('VIEWER');
      const task = await createTestTask(project.id, actor.id);
      const comment = await createTestComment(task.id, actor.id);

      await expect(caller.comment.delete({ id: comment.id })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('should allow OWNER and EDITOR to delete own comment', async () => {
      const ownerContext = await createCommentProjectCallerWithRole('OWNER');
      const ownerTask = await createTestTask(ownerContext.project.id, ownerContext.owner.id);
      const ownerComment = await createTestComment(ownerTask.id, ownerContext.actor.id);
      const ownerDeleted = await ownerContext.caller.comment.delete({ id: ownerComment.id });
      expect(ownerDeleted.success).toBe(true);

      const editorContext = await createCommentProjectCallerWithRole('EDITOR');
      const editorTask = await createTestTask(editorContext.project.id, editorContext.owner.id);
      const editorComment = await createTestComment(editorTask.id, editorContext.actor.id);
      const editorDeleted = await editorContext.caller.comment.delete({ id: editorComment.id });
      expect(editorDeleted.success).toBe(true);
    });
  });
});
