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
    it('should return all projects', async () => {
      const user = await createTestUser();
      await createTestProject(user.id, { name: 'Project 1' });
      await createTestProject(user.id, { name: 'Project 2' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const projects = await caller.project.getAll();

      expect(projects).toHaveLength(2);
    });

    it('should filter projects by userId', async () => {
      const user1 = await createTestUser({ email: 'user1@example.com' });
      const user2 = await createTestUser({ email: 'user2@example.com' });
      await createTestProject(user1.id);
      await createTestProject(user2.id);

      const caller = await createAuthenticatedCaller(user1.id, user1.email, user1.role);

      const projects = await caller.project.getAll({ userId: user1.id });

      expect(projects).toHaveLength(1);
      expect(projects[0].members.some((m) => m.userId === user1.id)).toBe(true);
    });

    it('should filter projects by archived status', async () => {
      const user = await createTestUser();
      await createTestProject(user.id, { isArchived: false });
      await createTestProject(user.id, { isArchived: true });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const projects = await caller.project.getAll({ isArchived: false });

      expect(projects).toHaveLength(1);
      expect(projects[0].isArchived).toBe(false);
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.project.getAll()).rejects.toThrow('ログインが必要です');
    });
  });

  describe('getById', () => {
    it('should return project by id', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id, { name: 'Test Project' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.project.getById({ id: project.id });

      expect(result.id).toBe(project.id);
      expect(result.name).toBe('Test Project');
    });

    it('should fail when project not found', async () => {
      const user = await createTestUser();
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(caller.project.getById({ id: 'clnonexistent' })).rejects.toThrow(
        'Project not found',
      );
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.project.getById({ id: 'clsomeid' })).rejects.toThrow(
        'ログインが必要です',
      );
    });
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const user = await createTestUser();

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const project = await caller.project.create({
        name: 'New Project',
        description: 'Project description',
        color: '#FF5722',
        ownerId: user.id,
      });

      expect(project.name).toBe('New Project');
      expect(project.description).toBe('Project description');
      expect(project.color).toBe('#FF5722');
      expect(project.members).toHaveLength(1);
      expect(project.members[0].role).toBe('OWNER');
    });

    it('should create project with default color', async () => {
      const user = await createTestUser();

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const project = await caller.project.create({
        name: 'Default Color Project',
        ownerId: user.id,
      });

      expect(project.color).toBe('#1976d2');
    });

    it('should create project with owner as member', async () => {
      const user = await createTestUser();

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const project = await caller.project.create({
        name: 'Owner Member Project',
        ownerId: user.id,
      });

      expect(project.members).toHaveLength(1);
      expect(project.members[0].userId).toBe(user.id);
      expect(project.members[0].role).toBe('OWNER');
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.project.create({
          name: 'Unauthorized Project',
          ownerId: 'clsomeuser',
        }),
      ).rejects.toThrow('ログインが必要です');
    });
  });

  describe('update', () => {
    it('should update project name', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id, { name: 'Original Name' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.project.update({
        id: project.id,
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should update project description', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.project.update({
        id: project.id,
        description: 'New description',
      });

      expect(updated.description).toBe('New description');
    });

    it('should update project color', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.project.update({
        id: project.id,
        color: '#00FF00',
      });

      expect(updated.color).toBe('#00FF00');
    });

    it('should archive project', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id, { isArchived: false });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.project.update({
        id: project.id,
        isArchived: true,
      });

      expect(updated.isArchived).toBe(true);
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.project.update({
          id: 'clsomeid',
          name: 'Updated',
        }),
      ).rejects.toThrow('ログインが必要です');
    });
  });

  describe('delete', () => {
    it('should delete project', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.project.delete({ id: project.id });

      expect(result.success).toBe(true);

      const deletedProject = await prisma.project.findUnique({ where: { id: project.id } });
      expect(deletedProject).toBeNull();
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.project.delete({ id: 'clsomeid' })).rejects.toThrow('ログインが必要です');
    });
  });

  describe('addMember', () => {
    it('should add member to project', async () => {
      const user = await createTestUser();
      const newMember = await createTestUser({ email: 'newmember@example.com' });
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.project.addMember({
        projectId: project.id,
        userId: newMember.id,
        role: 'MEMBER',
      });

      expect(result.userId).toBe(newMember.id);
      expect(result.role).toBe('MEMBER');
    });

    it('should add member with ADMIN role', async () => {
      const user = await createTestUser();
      const admin = await createTestUser({ email: 'admin@example.com' });
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.project.addMember({
        projectId: project.id,
        userId: admin.id,
        role: 'ADMIN',
      });

      expect(result.role).toBe('ADMIN');
    });

    it('should fail when adding duplicate member', async () => {
      const user = await createTestUser();
      const member = await createTestUser({ email: 'member@example.com' });
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await caller.project.addMember({
        projectId: project.id,
        userId: member.id,
        role: 'MEMBER',
      });

      await expect(
        caller.project.addMember({
          projectId: project.id,
          userId: member.id,
          role: 'MEMBER',
        }),
      ).rejects.toThrow('User is already a member of this project');
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.project.addMember({
          projectId: 'clsomeproject',
          userId: 'clsomeuser',
          role: 'MEMBER',
        }),
      ).rejects.toThrow('ログインが必要です');
    });
  });

  describe('removeMember', () => {
    it('should remove member from project', async () => {
      const user = await createTestUser();
      const member = await createTestUser({ email: 'member@example.com' });
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await caller.project.addMember({
        projectId: project.id,
        userId: member.id,
        role: 'MEMBER',
      });

      const result = await caller.project.removeMember({
        projectId: project.id,
        userId: member.id,
      });

      expect(result.success).toBe(true);

      const memberInDb = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: member.id,
            projectId: project.id,
          },
        },
      });

      expect(memberInDb).toBeNull();
    });

    it('should fail when removing the only owner', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(
        caller.project.removeMember({
          projectId: project.id,
          userId: user.id,
        }),
      ).rejects.toThrow('Cannot remove the only owner of the project');
    });

    it('should fail when member not found', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(
        caller.project.removeMember({
          projectId: project.id,
          userId: 'clnonexistent',
        }),
      ).rejects.toThrow('Member not found');
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.project.removeMember({
          projectId: 'clsomeproject',
          userId: 'clsomeuser',
        }),
      ).rejects.toThrow('ログインが必要です');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const user = await createTestUser();
      const member = await createTestUser({ email: 'member@example.com' });
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await caller.project.addMember({
        projectId: project.id,
        userId: member.id,
        role: 'MEMBER',
      });

      const result = await caller.project.updateMemberRole({
        projectId: project.id,
        userId: member.id,
        role: 'ADMIN',
      });

      expect(result.role).toBe('ADMIN');
    });

    it('should update member to VIEWER role', async () => {
      const user = await createTestUser();
      const member = await createTestUser({ email: 'member@example.com' });
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await caller.project.addMember({
        projectId: project.id,
        userId: member.id,
        role: 'ADMIN',
      });

      const result = await caller.project.updateMemberRole({
        projectId: project.id,
        userId: member.id,
        role: 'VIEWER',
      });

      expect(result.role).toBe('VIEWER');
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.project.updateMemberRole({
          projectId: 'clsomeproject',
          userId: 'clsomeuser',
          role: 'ADMIN',
        }),
      ).rejects.toThrow('ログインが必要です');
    });
  });
});
