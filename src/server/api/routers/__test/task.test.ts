import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestProject,
  createTestTask,
  createTestUser,
} from '../../../../test/helpers';

describe('taskRouter', () => {
  describe('getAll', () => {
    it('should return all tasks', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id, { title: 'Task 1' });
      await createTestTask(project.id, user.id, { title: 'Task 2' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const tasks = await caller.task.getAll();

      expect(tasks).toHaveLength(2);
      expect(tasks[0]?.title).toBeTruthy();
    });

    it('should filter tasks by projectId', async () => {
      const user = await createTestUser();
      const project1 = await createTestProject(user.id, { name: 'Project 1' });
      const project2 = await createTestProject(user.id, { name: 'Project 2' });
      await createTestTask(project1.id, user.id, { title: 'Project 1 Task' });
      await createTestTask(project2.id, user.id, { title: 'Project 2 Task' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const tasks = await caller.task.getAll({ projectId: project1.id });

      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.projectId).toBe(project1.id);
    });

    it('should filter tasks by status', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id, { status: 'TODO' });
      await createTestTask(project.id, user.id, { status: 'IN_PROGRESS' });
      await createTestTask(project.id, user.id, { status: 'DONE' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const tasks = await caller.task.getAll({ status: 'TODO' });

      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.status).toBe('TODO');
    });

    it('should filter tasks by assigneeId', async () => {
      const user1 = await createTestUser({ email: 'user1@example.com' });
      const user2 = await createTestUser({ email: 'user2@example.com' });
      const project = await createTestProject(user1.id);
      await createTestTask(project.id, user1.id, { assigneeId: user1.id });
      await createTestTask(project.id, user1.id, { assigneeId: user2.id });

      const caller = await createAuthenticatedCaller(user1.id, user1.email, user1.role);

      const tasks = await caller.task.getAll({ assigneeId: user1.id });

      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.assigneeId).toBe(user1.id);
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.task.getAll()).rejects.toThrow('ログインが必要です');
    });
  });

  describe('getById', () => {
    it('should return task by id', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id, { title: 'Get By ID Task' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.task.getById({ id: task.id });

      expect(result.id).toBe(task.id);
      expect(result.title).toBe('Get By ID Task');
    });

    it('should fail when task not found', async () => {
      const user = await createTestUser();
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(caller.task.getById({ id: 'clnonexistent' })).rejects.toThrow('Task not found');
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.task.getById({ id: 'clsomeid' })).rejects.toThrow('ログインが必要です');
    });
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const task = await caller.task.create({
        title: 'New Task',
        description: 'Task description',
        status: 'TODO',
        priority: 'HIGH',
        projectId: project.id,
        createdById: user.id,
      });

      expect(task.title).toBe('New Task');
      expect(task.description).toBe('Task description');
      expect(task.status).toBe('TODO');
      expect(task.priority).toBe('HIGH');
      expect(task.projectId).toBe(project.id);
    });

    it('should create task with default status', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const task = await caller.task.create({
        title: 'Default Status Task',
        projectId: project.id,
        createdById: user.id,
      });

      expect(task.status).toBe('TODO');
    });

    it('should create task with default priority', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const task = await caller.task.create({
        title: 'Default Priority Task',
        projectId: project.id,
        createdById: user.id,
      });

      expect(task.priority).toBe('MEDIUM');
    });

    it('should create task with assignee', async () => {
      const user = await createTestUser();
      const assignee = await createTestUser({ email: 'assignee@example.com' });
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const task = await caller.task.create({
        title: 'Assigned Task',
        projectId: project.id,
        createdById: user.id,
        assigneeId: assignee.id,
      });

      expect(task.assigneeId).toBe(assignee.id);
    });

    it('should set position correctly', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const task1 = await caller.task.create({
        title: 'Task 1',
        projectId: project.id,
        createdById: user.id,
      });

      const task2 = await caller.task.create({
        title: 'Task 2',
        projectId: project.id,
        createdById: user.id,
      });

      expect(task1.position).toBe(0);
      expect(task2.position).toBe(1);
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.task.create({
          title: 'Unauthorized Task',
          projectId: 'clsomeproject',
          createdById: 'clsomeuser',
        }),
      ).rejects.toThrow('ログインが必要です');
    });
  });

  describe('update', () => {
    it('should update task title', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id, { title: 'Original Title' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.task.update({
        id: task.id,
        title: 'Updated Title',
      });

      expect(updated.title).toBe('Updated Title');
    });

    it('should update task status', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id, { status: 'TODO' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.task.update({
        id: task.id,
        status: 'DONE',
      });

      expect(updated.status).toBe('DONE');
    });

    it('should update task priority', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id, { priority: 'LOW' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.task.update({
        id: task.id,
        priority: 'URGENT',
      });

      expect(updated.priority).toBe('URGENT');
    });

    it('should update task assignee', async () => {
      const user = await createTestUser();
      const newAssignee = await createTestUser({ email: 'newassignee@example.com' });
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.task.update({
        id: task.id,
        assigneeId: newAssignee.id,
      });

      expect(updated.assigneeId).toBe(newAssignee.id);
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(
        caller.task.update({
          id: 'clsomeid',
          title: 'Updated',
        }),
      ).rejects.toThrow('ログインが必要です');
    });
  });

  describe('delete', () => {
    it('should delete task', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.task.delete({ id: task.id });

      expect(result.success).toBe(true);

      const deletedTask = await prisma.task.findUnique({ where: { id: task.id } });
      expect(deletedTask).toBeNull();
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.task.delete({ id: 'clsomeid' })).rejects.toThrow('ログインが必要です');
    });
  });

  describe('updateTimer', () => {
    it('should start timer', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.task.updateTimer({
        id: task.id,
        action: 'start',
      });

      expect(result.isTimerActive).toBe(true);
      expect(result.timerStartedAt).not.toBeNull();
    });

    it('should stop timer and record time', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await caller.task.updateTimer({ id: task.id, action: 'start' });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await caller.task.updateTimer({
        id: task.id,
        action: 'stop',
      });

      expect(result.isTimerActive).toBe(false);
      expect(result.timerStartedAt).toBeNull();
    });

    it('should fail to start timer when already running', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await caller.task.updateTimer({ id: task.id, action: 'start' });

      await expect(caller.task.updateTimer({ id: task.id, action: 'start' })).rejects.toThrow(
        'Timer is already running',
      );
    });

    it('should fail to stop timer when not running', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(caller.task.updateTimer({ id: task.id, action: 'stop' })).rejects.toThrow(
        'Timer is not running',
      );
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.task.updateTimer({ id: 'clsomeid', action: 'start' })).rejects.toThrow(
        'ログインが必要です',
      );
    });
  });

  describe('addTime', () => {
    it('should add time to task', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const result = await caller.task.addTime({
        id: task.id,
        minutesToAdd: 60,
      });

      expect(result.timeSpentMinutes).toBe(60);
    });

    it('should accumulate time correctly', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await caller.task.addTime({ id: task.id, minutesToAdd: 30 });
      const result = await caller.task.addTime({ id: task.id, minutesToAdd: 45 });

      expect(result.timeSpentMinutes).toBe(75);
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.task.addTime({ id: 'clsomeid', minutesToAdd: 60 })).rejects.toThrow(
        'ログインが必要です',
      );
    });
  });
});
