import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestProject,
  createTestTask,
  createTestUser,
} from '../../../../test/helpers';

describe('searchRouter', () => {
  describe('search', () => {
    it('should find tasks by keyword in title', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id, { title: 'Fix login bug' });
      await createTestTask(project.id, user.id, { title: 'Add dashboard' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.search.search({ keyword: 'login' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks.at(0)?.title).toBe('Fix login bug');
    });

    it('should find tasks by keyword in description', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id, {
        title: 'Task A',
        description: 'This involves authentication',
      });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.search.search({ keyword: 'authentication' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks.at(0)?.title).toBe('Task A');
    });

    it('should filter tasks by status', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id, { title: 'Done Task', status: 'DONE' });
      await createTestTask(project.id, user.id, { title: 'Todo Task', status: 'TODO' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.search.search({ status: 'DONE' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks.at(0)?.title).toBe('Done Task');
    });

    it('should filter tasks by priority', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id, { title: 'Urgent Task', priority: 'URGENT' });
      await createTestTask(project.id, user.id, { title: 'Low Task', priority: 'LOW' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.search.search({ priority: 'URGENT' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks.at(0)?.title).toBe('Urgent Task');
    });

    it('should find matching projects when keyword is provided', async () => {
      const user = await createTestUser();
      await createTestProject(user.id, { name: 'Alpha Project' });
      await createTestProject(user.id, { name: 'Beta Project' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.search.search({ keyword: 'Alpha' });

      expect(result.projects).toHaveLength(1);
      expect(result.projects.at(0)?.name).toBe('Alpha Project');
    });

    it('should only return tasks the user is involved in', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const project = await createTestProject(user.id);
      const otherProject = await createTestProject(otherUser.id);

      await createTestTask(project.id, user.id, { title: 'My Task' });
      await createTestTask(otherProject.id, otherUser.id, { title: 'Other Task' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.search.search({});

      const titles = result.tasks.map((t) => t.title);
      expect(titles).toContain('My Task');
      expect(titles).not.toContain('Other Task');
    });

    it('should include tasks where user is assignee', async () => {
      const creator = await createTestUser();
      const assignee = await createTestUser({ email: 'assignee@example.com' });
      const project = await createTestProject(creator.id);

      await prisma.projectMember.create({
        data: { userId: assignee.id, projectId: project.id, role: 'MEMBER' },
      });

      await createTestTask(project.id, creator.id, {
        title: 'Assigned Task',
        assigneeId: assignee.id,
      });

      const caller = await createAuthenticatedCaller(assignee.id, assignee.email, assignee.role);

      const result = await caller.search.search({});

      expect(result.tasks.some((t) => t.title === 'Assigned Task')).toBe(true);
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.search.search({})).rejects.toThrow('ログインが必要です');
    });
  });

  describe('quickSearch', () => {
    it('should find tasks by keyword', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id, { title: 'Important Feature' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.search.quickSearch({ keyword: 'Important' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks.at(0)?.title).toBe('Important Feature');
    });

    it('should find projects by keyword', async () => {
      const user = await createTestUser();
      await createTestProject(user.id, { name: 'Marketing Campaign' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.search.quickSearch({ keyword: 'Marketing' });

      expect(result.projects).toHaveLength(1);
      expect(result.projects.at(0)?.name).toBe('Marketing Campaign');
    });

    it('should reject empty keyword', async () => {
      const user = await createTestUser();
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(caller.search.quickSearch({ keyword: '' })).rejects.toThrow();
    });

    it('should return totalCount', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id, { name: 'Test Project' });
      await createTestTask(project.id, user.id, { title: 'Test Task' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.search.quickSearch({ keyword: 'Test' });

      expect(result.totalCount).toBe(result.tasks.length + result.projects.length);
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.search.quickSearch({ keyword: 'test' })).rejects.toThrow(
        'ログインが必要です',
      );
    });
  });

  describe('getUserProjects', () => {
    it('should return projects the user is a member of', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser({ email: 'other@example.com' });

      await createTestProject(user.id, { name: 'My Project' });
      await createTestProject(otherUser.id, { name: 'Not My Project' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const projects = await caller.search.getUserProjects();

      expect(projects).toHaveLength(1);
      expect(projects.at(0)?.name).toBe('My Project');
    });

    it('should include task count', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id);
      await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const projects = await caller.search.getUserProjects();

      expect(projects.at(0)?._count?.tasks).toBe(2);
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.search.getUserProjects()).rejects.toThrow('ログインが必要です');
    });
  });

  describe('getProjectMembers', () => {
    it('should return unique members from user projects', async () => {
      const user = await createTestUser({ name: 'User A' });
      const memberB = await createTestUser({ email: 'b@example.com', name: 'User B' });
      const project = await createTestProject(user.id);

      await prisma.projectMember.create({
        data: { userId: memberB.id, projectId: project.id, role: 'MEMBER' },
      });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const members = await caller.search.getProjectMembers();

      expect(members.length).toBeGreaterThanOrEqual(2);
      const names = members.map((m) => m.name);
      expect(names).toContain('User A');
      expect(names).toContain('User B');
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.search.getProjectMembers()).rejects.toThrow('ログインが必要です');
    });
  });
});
