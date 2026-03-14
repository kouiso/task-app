import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestProject,
  createTestTask,
  createTestUser,
} from '../../../../test/helpers';

describe('userRouter', () => {
  describe('getAll', () => {
    it('should return all users', async () => {
      const user1 = await createTestUser({ email: 'user1@example.com', role: 'ADMIN' });
      await createTestUser({ email: 'user2@example.com' });
      await createTestUser({ email: 'user3@example.com' });

      const caller = await createAuthenticatedCaller(user1.id, user1.email, user1.role);

      const users = await caller.user.getAll();

      expect(users.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter users by isActive', async () => {
      const user = await createTestUser({ role: 'ADMIN' });
      await createTestUser({ email: 'active@example.com', isActive: true });
      await createTestUser({ email: 'inactive@example.com', isActive: false });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const activeUsers = await caller.user.getAll({ isActive: true });

      expect(activeUsers.every((u) => u.isActive)).toBe(true);
    });

    it('should filter users by role', async () => {
      const user = await createTestUser({ role: 'ADMIN' });
      await createTestUser({ email: 'user1@example.com', role: 'USER' });
      await createTestUser({ email: 'admin1@example.com', role: 'ADMIN' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const admins = await caller.user.getAll({ role: 'ADMIN' });

      expect(admins.every((u) => u.role === 'ADMIN')).toBe(true);
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.user.getAll()).rejects.toThrow('ログインが必要です');
    });
  });

  describe('getById', () => {
    it('should return user by id', async () => {
      const user = await createTestUser({ email: 'getbyid@example.com', name: 'Get By ID User' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.user.getById({ id: user.id });

      expect(result.id).toBe(user.id);
      expect(result.email).toBe('getbyid@example.com');
      expect(result.name).toBe('Get By ID User');
    }, 10000);

    it('should include user projects', async () => {
      const user = await createTestUser();
      await createTestProject(user.id, { name: 'User Project' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.user.getById({ id: user.id });

      expect(result.projects).toBeDefined();
      expect(result.projects.length).toBeGreaterThan(0);
    });

    it('should include user assigned tasks', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id, { assigneeId: user.id, status: 'TODO' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.user.getById({ id: user.id });

      expect(result.assignedTasks).toBeDefined();
      expect(result.assignedTasks.length).toBeGreaterThan(0);
    });

    it('should fail when user not found', async () => {
      const admin = await createTestUser({ email: 'admin-notfound@example.com', role: 'ADMIN' });
      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      await expect(caller.user.getById({ id: 'clnonexistent' })).rejects.toThrow(
        'ユーザーが見つかりません',
      );
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.user.getById({ id: 'clsomeid' })).rejects.toThrow('ログインが必要です');
    });

    it('should deny non-admin access to other users', async () => {
      const user = await createTestUser({ email: 'viewer@example.com' });
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(caller.user.getById({ id: otherUser.id })).rejects.toThrow(
        'この操作を行う権限がありません',
      );
    });

    it('should allow admin to access other users', async () => {
      const admin = await createTestUser({ email: 'admin-viewer@example.com', role: 'ADMIN' });
      const otherUser = await createTestUser({ email: 'other-target@example.com' });
      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      const result = await caller.user.getById({ id: otherUser.id });
      expect(result.id).toBe(otherUser.id);
    });
  });

  describe('getByEmail', () => {
    it('should return user by email', async () => {
      const admin = await createTestUser({ role: 'ADMIN' });
      await createTestUser({ email: 'findme@example.com', name: 'Find Me User' });

      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      const result = await caller.user.getByEmail({ email: 'findme@example.com' });

      expect(result.email).toBe('findme@example.com');
      expect(result.name).toBe('Find Me User');
    });

    it('should fail when user not found', async () => {
      const admin = await createTestUser({ role: 'ADMIN' });
      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      await expect(caller.user.getByEmail({ email: 'notfound@example.com' })).rejects.toThrow(
        'ユーザーが見つかりません',
      );
    });

    it('should require admin role', async () => {
      const user = await createTestUser({ email: 'public@example.com' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(caller.user.getByEmail({ email: 'public@example.com' })).rejects.toThrow(
        '管理者権限が必要です',
      );
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const admin = await createTestUser({ role: 'ADMIN' });
      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      const user = await caller.user.create({
        email: 'newuser@example.com',
        name: 'New User',
        role: 'USER',
      });

      expect(user.email).toBe('newuser@example.com');
      expect(user.name).toBe('New User');
      expect(user.role).toBe('USER');
    });

    it('should create user with default role', async () => {
      const admin = await createTestUser({ role: 'ADMIN' });
      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      const user = await caller.user.create({
        email: 'defaultrole@example.com',
      });

      expect(user.role).toBe('USER');
    });

    it('should fail when creating user with duplicate email', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      const admin = await createTestUser({ role: 'ADMIN' });
      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      await expect(
        caller.user.create({
          email: 'duplicate@example.com',
          name: 'Duplicate User',
        }),
      ).rejects.toThrow('このメールアドレスは既に使用されています');
    });

    it('should require admin role', async () => {
      const user = await createTestUser();
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(
        caller.user.create({
          email: 'publiccreate@example.com',
          name: 'Public Create User',
        }),
      ).rejects.toThrow('管理者権限が必要です');
    });
  });

  describe('update', () => {
    it('should update user name', async () => {
      const user = await createTestUser({ name: 'Original Name' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.user.update({
        id: user.id,
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should update user avatar', async () => {
      const user = await createTestUser();

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.user.update({
        id: user.id,
        avatar: 'https://example.com/avatar.jpg',
      });

      expect(updated.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('should update user role', async () => {
      const admin = await createTestUser({ role: 'ADMIN' });
      const user = await createTestUser({ role: 'USER' });

      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      const updated = await caller.user.update({
        id: user.id,
        role: 'ADMIN',
      });

      expect(updated.role).toBe('ADMIN');
    });

    it('should update user active status', async () => {
      const admin = await createTestUser({ role: 'ADMIN' });
      const user = await createTestUser({ isActive: true });

      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      const updated = await caller.user.update({
        id: user.id,
        isActive: false,
      });

      expect(updated.isActive).toBe(false);
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.user.update({
          id: 'clsomeid',
          name: 'Updated',
        }),
      ).rejects.toThrow('ログインが必要です');
    });
  });

  describe('delete', () => {
    it('should soft delete user by setting isActive to false', async () => {
      const admin = await createTestUser({ role: 'ADMIN' });
      const user = await createTestUser({ isActive: true });

      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      const result = await caller.user.delete({ id: user.id });

      expect(result.success).toBe(true);

      const deletedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(deletedUser).not.toBeNull();
      expect(deletedUser?.isActive).toBe(false);
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.user.delete({ id: 'clsomeid' })).rejects.toThrow('ログインが必要です');
    });
  });

  describe('register (via auth.register)', () => {
    it('should register a new user', async () => {
      const caller = await createTestCaller();

      const result = await caller.auth.register({
        email: 'register@example.com',
        name: 'Register User',
        password: 'Password123!',
      });

      expect(result.user.email).toBe('register@example.com');
      expect(result.user.name).toBe('Register User');
      expect(result.user.role).toBe('USER');
    });

    it('should hash password', async () => {
      const caller = await createTestCaller();

      await caller.auth.register({
        email: 'hashed@example.com',
        name: 'Hashed User',
        password: 'Password123!',
      });

      const userInDb = await prisma.user.findUnique({ where: { email: 'hashed@example.com' } });

      expect(userInDb?.password).not.toBe('Password123!');
      expect(userInDb?.password).toBeTruthy();
    });

    it('should fail with duplicate email', async () => {
      await createTestUser({ email: 'duplicate-register@example.com' });

      const caller = await createTestCaller();

      await expect(
        caller.auth.register({
          email: 'duplicate-register@example.com',
          name: 'Duplicate Register',
          password: 'Password123!',
        }),
      ).rejects.toThrow('このメールアドレスは既に登録されています');
    });

    it('should be publicly accessible', async () => {
      const caller = await createTestCaller();

      const result = await caller.auth.register({
        email: 'publicregister@example.com',
        name: 'Public Register User',
        password: 'Password123!',
      });

      expect(result.user.email).toBe('publicregister@example.com');
    });
  });
});
