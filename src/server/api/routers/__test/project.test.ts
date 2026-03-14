import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestProject,
  createTestUser,
} from '../../../../test/helpers';

describe('projectRouter', () => {
  describe('getAll', () => {
    it('should return only projects the user is a member of', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser({ email: 'other@example.com' });
      await createTestProject(user.id, { name: 'My Project' });
      await createTestProject(otherUser.id, { name: 'Other Project' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const projects = await caller.project.getAll();

      expect(projects).toHaveLength(1);
      expect(projects.at(0)?.name).toBe('My Project');
    });

    it('should filter archived projects', async () => {
      const user = await createTestUser();
      await createTestProject(user.id, { name: 'Active', isArchived: false });
      await createTestProject(user.id, { name: 'Archived', isArchived: true });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const activeProjects = await caller.project.getAll({ isArchived: false });
      expect(activeProjects).toHaveLength(1);
      expect(activeProjects.at(0)?.name).toBe('Active');

      const archivedProjects = await caller.project.getAll({ isArchived: true });
      expect(archivedProjects).toHaveLength(1);
      expect(archivedProjects.at(0)?.name).toBe('Archived');
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.project.getAll()).rejects.toThrow('ログインが必要です');
    });
  });

  describe('getById', () => {
    it('should return project for a member', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id, { name: 'Test Project' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.project.getById({ id: project.id });

      expect(result.name).toBe('Test Project');
      expect(result.members).toBeDefined();
    });

    it('should reject non-member access', async () => {
      const owner = await createTestUser();
      const nonMember = await createTestUser({ email: 'nonmember@example.com' });
      const project = await createTestProject(owner.id);

      const caller = await createAuthenticatedCaller(nonMember.id, nonMember.email, nonMember.role);

      await expect(caller.project.getById({ id: project.id })).rejects.toThrow(
        'このプロジェクトへのアクセス権限がありません',
      );
    });

    it('should throw NOT_FOUND for non-existent project', async () => {
      const user = await createTestUser();
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(caller.project.getById({ id: 'cm000000000000000000000000' })).rejects.toThrow(
        'プロジェクトが見つかりません',
      );
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.project.getById({ id: 'cm000000000000000000000000' })).rejects.toThrow(
        'ログインが必要です',
      );
    });
  });

  describe('create', () => {
    it('should create project with OWNER role auto-assigned', async () => {
      const user = await createTestUser();
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const project = await caller.project.create({ name: 'New Project' });

      expect(project.name).toBe('New Project');
      expect(project.members).toHaveLength(1);
      expect(project.members.at(0)?.userId).toBe(user.id);
      expect(project.members.at(0)?.role).toBe('OWNER');
    });

    it('should use default color when not specified', async () => {
      const user = await createTestUser();
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const project = await caller.project.create({ name: 'Color Test' });

      expect(project.color).toBe('#1976d2');
    });

    it('should reject empty project name', async () => {
      const user = await createTestUser();
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(caller.project.create({ name: '' })).rejects.toThrow();
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.project.create({ name: 'Test' })).rejects.toThrow('ログインが必要です');
    });
  });

  describe('update', () => {
    it('should allow OWNER to update project', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.project.update({
        id: project.id,
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should allow ADMIN to update project', async () => {
      const owner = await createTestUser();
      const admin = await createTestUser({ email: 'admin@example.com' });
      const project = await createTestProject(owner.id);

      await prisma.projectMember.create({
        data: { userId: admin.id, projectId: project.id, role: 'ADMIN' },
      });

      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      const updated = await caller.project.update({
        id: project.id,
        name: 'Admin Updated',
      });

      expect(updated.name).toBe('Admin Updated');
    });

    it('should reject MEMBER from updating project', async () => {
      const owner = await createTestUser();
      const member = await createTestUser({ email: 'member@example.com' });
      const project = await createTestProject(owner.id);

      await prisma.projectMember.create({
        data: { userId: member.id, projectId: project.id, role: 'MEMBER' },
      });

      const caller = await createAuthenticatedCaller(member.id, member.email, member.role);

      await expect(caller.project.update({ id: project.id, name: 'Rejected' })).rejects.toThrow(
        'プロジェクトのオーナーまたは管理者のみが更新できます',
      );
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.project.update({ id: 'cm000000000000000000000000', name: 'Test' }),
      ).rejects.toThrow('ログインが必要です');
    });
  });

  describe('delete', () => {
    it('should allow OWNER to delete project', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.project.delete({ id: project.id });

      expect(result.success).toBe(true);

      const deleted = await prisma.project.findUnique({ where: { id: project.id } });
      expect(deleted).toBeNull();
    });

    it('should reject non-OWNER from deleting project', async () => {
      const owner = await createTestUser();
      const admin = await createTestUser({ email: 'admin@example.com' });
      const project = await createTestProject(owner.id);

      await prisma.projectMember.create({
        data: { userId: admin.id, projectId: project.id, role: 'ADMIN' },
      });

      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      await expect(caller.project.delete({ id: project.id })).rejects.toThrow(
        'プロジェクトのオーナーのみが削除できます',
      );
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.project.delete({ id: 'cm000000000000000000000000' })).rejects.toThrow(
        'ログインが必要です',
      );
    });
  });

  describe('addMember', () => {
    it('should allow OWNER to add a member', async () => {
      const owner = await createTestUser();
      const newUser = await createTestUser({ email: 'new@example.com' });
      const project = await createTestProject(owner.id);

      const caller = await createAuthenticatedCaller(owner.id, owner.email, owner.role);

      const member = await caller.project.addMember({
        projectId: project.id,
        userId: newUser.id,
        role: 'MEMBER',
      });

      expect(member.userId).toBe(newUser.id);
      expect(member.role).toBe('MEMBER');
    });

    it('should allow ADMIN to add a member', async () => {
      const owner = await createTestUser();
      const admin = await createTestUser({ email: 'admin@example.com' });
      const newUser = await createTestUser({ email: 'new@example.com' });
      const project = await createTestProject(owner.id);

      await prisma.projectMember.create({
        data: { userId: admin.id, projectId: project.id, role: 'ADMIN' },
      });

      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      const member = await caller.project.addMember({
        projectId: project.id,
        userId: newUser.id,
        role: 'MEMBER',
      });

      expect(member.userId).toBe(newUser.id);
    });

    it('should reject duplicate member addition', async () => {
      const owner = await createTestUser();
      const existingMember = await createTestUser({ email: 'existing@example.com' });
      const project = await createTestProject(owner.id);

      await prisma.projectMember.create({
        data: { userId: existingMember.id, projectId: project.id, role: 'MEMBER' },
      });

      const caller = await createAuthenticatedCaller(owner.id, owner.email, owner.role);

      await expect(
        caller.project.addMember({
          projectId: project.id,
          userId: existingMember.id,
          role: 'MEMBER',
        }),
      ).rejects.toThrow('このユーザーは既にプロジェクトのメンバーです');
    });

    it('should reject MEMBER from adding members', async () => {
      const owner = await createTestUser();
      const member = await createTestUser({ email: 'member@example.com' });
      const newUser = await createTestUser({ email: 'new@example.com' });
      const project = await createTestProject(owner.id);

      await prisma.projectMember.create({
        data: { userId: member.id, projectId: project.id, role: 'MEMBER' },
      });

      const caller = await createAuthenticatedCaller(member.id, member.email, member.role);

      await expect(
        caller.project.addMember({
          projectId: project.id,
          userId: newUser.id,
          role: 'MEMBER',
        }),
      ).rejects.toThrow('この操作を実行する権限がありません');
    });

    it('should reject VIEWER from adding members', async () => {
      const owner = await createTestUser();
      const viewer = await createTestUser({ email: 'viewer@example.com' });
      const newUser = await createTestUser({ email: 'new@example.com' });
      const project = await createTestProject(owner.id);

      await prisma.projectMember.create({
        data: { userId: viewer.id, projectId: project.id, role: 'VIEWER' },
      });

      const caller = await createAuthenticatedCaller(viewer.id, viewer.email, viewer.role);

      await expect(
        caller.project.addMember({
          projectId: project.id,
          userId: newUser.id,
          role: 'MEMBER',
        }),
      ).rejects.toThrow('この操作を実行する権限がありません');
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.project.addMember({
          projectId: 'cm000000000000000000000000',
          userId: 'cm000000000000000000000001',
          role: 'MEMBER',
        }),
      ).rejects.toThrow('ログインが必要です');
    });
  });

  describe('removeMember', () => {
    it('should allow OWNER to remove a member', async () => {
      const owner = await createTestUser();
      const member = await createTestUser({ email: 'member@example.com' });
      const project = await createTestProject(owner.id);

      await prisma.projectMember.create({
        data: { userId: member.id, projectId: project.id, role: 'MEMBER' },
      });

      const caller = await createAuthenticatedCaller(owner.id, owner.email, owner.role);

      const result = await caller.project.removeMember({
        projectId: project.id,
        userId: member.id,
      });

      expect(result.success).toBe(true);

      const removed = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: member.id, projectId: project.id } },
      });
      expect(removed).toBeNull();
    });

    it('should reject removing the last OWNER', async () => {
      const owner = await createTestUser();
      const project = await createTestProject(owner.id);

      const caller = await createAuthenticatedCaller(owner.id, owner.email, owner.role);

      await expect(
        caller.project.removeMember({
          projectId: project.id,
          userId: owner.id,
        }),
      ).rejects.toThrow('プロジェクト唯一のオーナーは削除できません');
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.project.removeMember({
          projectId: 'cm000000000000000000000000',
          userId: 'cm000000000000000000000001',
        }),
      ).rejects.toThrow('ログインが必要です');
    });
  });

  describe('archive', () => {
    it('should allow OWNER to archive project', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.project.archive({ id: project.id });

      expect(result.isArchived).toBe(true);
    });

    it('should reject ADMIN from archiving project', async () => {
      const owner = await createTestUser();
      const admin = await createTestUser({ email: 'admin@example.com' });
      const project = await createTestProject(owner.id);

      await prisma.projectMember.create({
        data: { userId: admin.id, projectId: project.id, role: 'ADMIN' },
      });

      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      await expect(caller.project.archive({ id: project.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('should reject VIEWER from archiving project', async () => {
      const owner = await createTestUser();
      const viewer = await createTestUser({ email: 'viewer@example.com' });
      const project = await createTestProject(owner.id);

      await prisma.projectMember.create({
        data: { userId: viewer.id, projectId: project.id, role: 'VIEWER' },
      });

      const caller = await createAuthenticatedCaller(viewer.id, viewer.email, viewer.role);

      await expect(caller.project.archive({ id: project.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.project.archive({ id: 'cm000000000000000000000000' })).rejects.toThrow(
        'ログインが必要です',
      );
    });
  });

  describe('unarchive', () => {
    it('should allow OWNER to unarchive project', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id, { isArchived: true });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.project.unarchive({ id: project.id });

      expect(result.isArchived).toBe(false);
    });

    it('should reject VIEWER from unarchiving project', async () => {
      const owner = await createTestUser();
      const viewer = await createTestUser({ email: 'viewer@example.com' });
      const project = await createTestProject(owner.id, { isArchived: true });

      await prisma.projectMember.create({
        data: { userId: viewer.id, projectId: project.id, role: 'VIEWER' },
      });

      const caller = await createAuthenticatedCaller(viewer.id, viewer.email, viewer.role);

      await expect(caller.project.unarchive({ id: project.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.project.unarchive({ id: 'cm000000000000000000000000' })).rejects.toThrow(
        'ログインが必要です',
      );
    });
  });
});
