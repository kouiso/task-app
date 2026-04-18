import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestProject,
  createTestTask,
  createTestUser,
} from '../../../../test/helpers';

async function createProjectCallerWithRole(role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER') {
  const owner = await createTestUser({ email: `task-owner-${Date.now()}@example.com` });
  const actor = await createTestUser({
    email: `task-${role.toLowerCase()}-${Date.now()}@example.com`,
  });
  const project = await createTestProject(owner.id);

  if (role !== 'OWNER') {
    await prisma.projectMember.create({
      data: {
        userId: actor.id,
        projectId: project.id,
        role,
      },
    });
  }

  const callerUser = role === 'OWNER' ? owner : actor;
  const caller = await createAuthenticatedCaller(callerUser.id, callerUser.email, callerUser.role);

  return { caller, owner, actor: callerUser, project };
}

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
      expect(tasks.map((task) => task.title)).toEqual(['Task 2', 'Task 1']);
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

    it('should reject deactivated users even with a valid session', async () => {
      const user = await createTestUser({
        email: 'inactive-task-reader@example.com',
        isActive: false,
      });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(caller.task.getAll()).rejects.toThrow('このアカウントは無効化されています');
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

      await expect(caller.task.getById({ id: 'clnonexistent' })).rejects.toThrow(
        'タスクが見つかりません',
      );
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
      });

      expect(task.priority).toBe('MEDIUM');
    });

    it('should create task with assignee', async () => {
      const user = await createTestUser();
      const assignee = await createTestUser({ email: 'assignee@example.com' });
      const project = await createTestProject(user.id);
      await prisma.projectMember.create({
        data: {
          userId: assignee.id,
          projectId: project.id,
          role: 'MEMBER',
        },
      });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const task = await caller.task.create({
        title: 'Assigned Task',
        projectId: project.id,
        assigneeId: assignee.id,
      });

      expect(task.assigneeId).toBe(assignee.id);
    });

    it('should reject assignee who is not a project member', async () => {
      const user = await createTestUser({ email: 'task-owner@example.com' });
      const outsider = await createTestUser({ email: 'outsider@example.com' });
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(
        caller.task.create({
          title: 'Invalid Assignee Task',
          projectId: project.id,
          assigneeId: outsider.id,
        }),
      ).rejects.toThrow('担当者にはこのプロジェクトのメンバーを指定してください');
    });

    it('should set position correctly', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const task1 = await caller.task.create({
        title: 'Task 1',
        projectId: project.id,
      });

      const task2 = await caller.task.create({
        title: 'Task 2',
        projectId: project.id,
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
      await prisma.projectMember.create({
        data: {
          userId: newAssignee.id,
          projectId: project.id,
          role: 'MEMBER',
        },
      });
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const updated = await caller.task.update({
        id: task.id,
        assigneeId: newAssignee.id,
      });

      expect(updated.assigneeId).toBe(newAssignee.id);
    });

    it('should reject updating assignee to a non-member', async () => {
      const user = await createTestUser({ email: 'task-editor@example.com' });
      const outsider = await createTestUser({ email: 'task-outsider@example.com' });
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(
        caller.task.update({
          id: task.id,
          assigneeId: outsider.id,
        }),
      ).rejects.toThrow('担当者にはこのプロジェクトのメンバーを指定してください');
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

    it('should reject VIEWER from updating task', async () => {
      const { caller, owner, project } = await createProjectCallerWithRole('VIEWER');
      const task = await createTestTask(project.id, owner.id, { title: 'Viewer Update Target' });

      await expect(
        caller.task.update({
          id: task.id,
          title: 'Blocked Update',
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should allow OWNER and MEMBER to update task', async () => {
      const ownerContext = await createProjectCallerWithRole('OWNER');
      const ownerTask = await createTestTask(ownerContext.project.id, ownerContext.owner.id, {
        title: 'Owner Task',
      });
      const ownerUpdated = await ownerContext.caller.task.update({
        id: ownerTask.id,
        title: 'Owner Updated',
      });

      expect(ownerUpdated.title).toBe('Owner Updated');

      const memberContext = await createProjectCallerWithRole('MEMBER');
      const memberTask = await createTestTask(memberContext.project.id, memberContext.owner.id, {
        title: 'Member Task',
      });
      const memberUpdated = await memberContext.caller.task.update({
        id: memberTask.id,
        title: 'Member Updated',
      });

      expect(memberUpdated.title).toBe('Member Updated');
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
        'タイマーは既に実行中です',
      );
    });

    it('should fail to stop timer when not running', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(caller.task.updateTimer({ id: task.id, action: 'stop' })).rejects.toThrow(
        'タイマーは実行されていません',
      );
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.task.updateTimer({ id: 'clsomeid', action: 'start' })).rejects.toThrow(
        'ログインが必要です',
      );
    });

    it('should reject VIEWER from updating timer', async () => {
      const { caller, owner, project } = await createProjectCallerWithRole('VIEWER');
      const task = await createTestTask(project.id, owner.id);

      await expect(caller.task.updateTimer({ id: task.id, action: 'start' })).rejects.toMatchObject(
        {
          code: 'FORBIDDEN',
        },
      );
    });

    it('should allow OWNER and MEMBER to update timer', async () => {
      const ownerContext = await createProjectCallerWithRole('OWNER');
      const ownerTask = await createTestTask(ownerContext.project.id, ownerContext.owner.id);
      const ownerStarted = await ownerContext.caller.task.updateTimer({
        id: ownerTask.id,
        action: 'start',
      });
      expect(ownerStarted.isTimerActive).toBe(true);

      const memberContext = await createProjectCallerWithRole('MEMBER');
      const memberTask = await createTestTask(memberContext.project.id, memberContext.owner.id);
      const memberStarted = await memberContext.caller.task.updateTimer({
        id: memberTask.id,
        action: 'start',
      });
      expect(memberStarted.isTimerActive).toBe(true);
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

    it('should reject VIEWER from adding time', async () => {
      const { caller, owner, project } = await createProjectCallerWithRole('VIEWER');
      const task = await createTestTask(project.id, owner.id);

      await expect(caller.task.addTime({ id: task.id, minutesToAdd: 15 })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('should allow OWNER and MEMBER to add time', async () => {
      const ownerContext = await createProjectCallerWithRole('OWNER');
      const ownerTask = await createTestTask(ownerContext.project.id, ownerContext.owner.id);
      const ownerResult = await ownerContext.caller.task.addTime({
        id: ownerTask.id,
        minutesToAdd: 20,
      });
      expect(ownerResult.timeSpentMinutes).toBe(20);

      const memberContext = await createProjectCallerWithRole('MEMBER');
      const memberTask = await createTestTask(memberContext.project.id, memberContext.owner.id);
      const memberResult = await memberContext.caller.task.addTime({
        id: memberTask.id,
        minutesToAdd: 25,
      });
      expect(memberResult.timeSpentMinutes).toBe(25);
    });
  });
});
