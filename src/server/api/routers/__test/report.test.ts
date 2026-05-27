import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestProject,
  createTestTask,
  createTestUser,
} from '../../../../test/helpers';

describe('reportRouter', () => {
  describe('getWeeklyReport', () => {
    it('should return weekly report with completed task count', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);
      const task = await createTestTask(project.id, user.id, {
        status: 'DONE',
        assigneeId: user.id,
      });

      // completedAtを設定
      await prisma.task.update({
        where: { id: task.id },
        data: { completedAt: new Date() },
      });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const report = await caller.report.getWeeklyReport({ weeks: 4 });

      expect(report.weeks).toBe(4);
      expect(report.totalCompleted).toBe(1);
      expect(report.weeklyData).toHaveLength(4);
      expect(report.startDate).toBeDefined();
      expect(report.endDate).toBeDefined();
    });

    it('should return empty data when no completed tasks exist', async () => {
      const user = await createTestUser();

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const report = await caller.report.getWeeklyReport({ weeks: 4 });

      expect(report.totalCompleted).toBe(0);
      expect(report.weeklyData).toHaveLength(4);
      for (const week of report.weeklyData) {
        expect(week.totalCompleted).toBe(0);
      }
    });

    it('should include byStatus and byPriority breakdown', async () => {
      const user = await createTestUser();

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const report = await caller.report.getWeeklyReport({ weeks: 4 });

      for (const week of report.weeklyData) {
        expect(week.byStatus).toBeDefined();
        expect(week.byStatus).toHaveProperty('TODO');
        expect(week.byStatus).toHaveProperty('IN_PROGRESS');
        expect(week.byStatus).toHaveProperty('IN_REVIEW');
        expect(week.byStatus).toHaveProperty('DONE');
        expect(week.byPriority).toBeDefined();
        expect(week.byPriority).toHaveProperty('LOW');
        expect(week.byPriority).toHaveProperty('MEDIUM');
        expect(week.byPriority).toHaveProperty('HIGH');
        expect(week.byPriority).toHaveProperty('URGENT');
      }
    });

    it('should count recurring tasks in weekly progress output', async () => {
      const user = await createTestUser({ email: 'recurring-report@example.com' });
      const project = await createTestProject(user.id);

      const recurringTaskA = await createTestTask(project.id, user.id, {
        title: '日次スタンドアップ',
        status: 'DONE',
        assigneeId: user.id,
      });
      const recurringTaskB = await createTestTask(project.id, user.id, {
        title: '日次スタンドアップ',
        status: 'DONE',
        assigneeId: user.id,
      });

      await prisma.task.update({
        where: { id: recurringTaskA.id },
        data: { completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      });
      await prisma.task.update({
        where: { id: recurringTaskB.id },
        data: { completedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) },
      });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const report = await caller.report.getWeeklyReport({ weeks: 4 });

      expect(report.totalCompleted).toBe(2);
      expect(report.weeklyData.reduce((sum, week) => sum + week.byStatus.DONE, 0)).toBe(2);
    });

    it('should allow ADMIN to view other user reports', async () => {
      const admin = await createTestUser({ role: 'ADMIN', email: 'admin@example.com' });
      const targetUser = await createTestUser({ email: 'target@example.com' });
      const project = await createTestProject(targetUser.id);
      const task = await createTestTask(project.id, targetUser.id, {
        status: 'DONE',
        assigneeId: targetUser.id,
      });

      await prisma.task.update({
        where: { id: task.id },
        data: { completedAt: new Date() },
      });

      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);

      const report = await caller.report.getWeeklyReport({
        weeks: 4,
        userId: targetUser.id,
      });

      expect(report.totalCompleted).toBe(1);
    });

    it('should reject non-ADMIN from viewing other user reports', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser({ email: 'other@example.com' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(
        caller.report.getWeeklyReport({ weeks: 4, userId: otherUser.id }),
      ).rejects.toThrow('管理者権限が必要です');
    });

    it('should respect weeks parameter range', async () => {
      const user = await createTestUser();
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const report4 = await caller.report.getWeeklyReport({ weeks: 4 });
      expect(report4.weeklyData).toHaveLength(4);

      const report8 = await caller.report.getWeeklyReport({ weeks: 8 });
      expect(report8.weeklyData).toHaveLength(8);

      const report12 = await caller.report.getWeeklyReport({ weeks: 12 });
      expect(report12.weeklyData).toHaveLength(12);
    });

    it('should reject weeks outside valid range', async () => {
      const user = await createTestUser();
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      await expect(caller.report.getWeeklyReport({ weeks: 0 })).rejects.toThrow();
      await expect(caller.report.getWeeklyReport({ weeks: 13 })).rejects.toThrow();
    });

    it('should include week labels in weeklyData', async () => {
      const user = await createTestUser();
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const report = await caller.report.getWeeklyReport({ weeks: 4 });

      expect(report.weeklyData.at(0)?.week).toBe('1週目');
      expect(report.weeklyData.at(1)?.week).toBe('2週目');
      expect(report.weeklyData.at(2)?.week).toBe('3週目');
      expect(report.weeklyData.at(3)?.week).toBe('4週目');
    });

    it('should require authentication', async () => {
      const caller = await createTestCaller();

      await expect(caller.report.getWeeklyReport({ weeks: 4 })).rejects.toThrow(
        'ログインが必要です',
      );
    });
  });

  describe('getOverview', () => {
    it('should aggregate tasks beyond the default list limit', async () => {
      const user = await createTestUser({ email: 'overview@example.com' });
      const project = await createTestProject(user.id);

      await prisma.task.createMany({
        data: Array.from({ length: 101 }, (_, index) => {
          let status: 'DONE' | 'IN_PROGRESS' | 'IN_REVIEW' | 'TODO' | 'CANCELLED';
          if (index < 40) status = 'DONE';
          else if (index < 70) status = 'IN_PROGRESS';
          else if (index < 85) status = 'IN_REVIEW';
          else if (index < 95) status = 'TODO';
          else status = 'CANCELLED';
          return {
            title: `Overview Task ${index + 1}`,
            description: 'overview test',
            status,
            priority: 'MEDIUM' as const,
            position: index,
            projectId: project.id,
            createdById: user.id,
            assigneeId: user.id,
          };
        }),
      });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const overview = await caller.report.getOverview();

      expect(overview.totalProjects).toBe(1);
      // totalTasks は CANCELLED を除外する (101 - 6 = 95)
      expect(overview.totalTasks).toBe(95);
      expect(overview.completedTasks).toBe(40);
      expect(overview.inProgressTasks).toBe(30);
      expect(overview.inReviewTasks).toBe(15);
      expect(overview.todoTasks).toBe(10);
      expect(overview.recentTasks).toHaveLength(5);
      // プロジェクト別の totalTasks も CANCELLED を除外する
      expect(overview.projectStats.at(0)?.totalTasks).toBe(95);
    });
  });
});
