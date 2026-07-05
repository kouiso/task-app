import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestProject,
  createTestTask,
  createTestUser,
} from '../../../../test/helpers';

// レポート仕様(report.ts)を起点に getOverview / getWeeklyReport を検証する。
// getOverview はアクティブ(非アーカイブ)プロジェクトを母数とし、CANCELLED は集計から除外する。

let seq = 0;
const uniqueEmail = (p: string) => `${p}-${Date.now()}-${seq++}@example.com`;

// 完了タスクを作成して completedAt を設定するヘルパー(週次レポート用)
async function createCompletedTask(projectId: string, userId: string, completedAt: Date) {
  const task = await createTestTask(projectId, userId, { status: 'DONE', assigneeId: userId });
  await prisma.task.update({ where: { id: task.id }, data: { completedAt } });
  return task;
}

describe('reportRouter', () => {
  describe('getOverview（概要）', () => {
    it('プロジェクトが無いユーザーはすべて0を返す', async () => {
      const user = await createTestUser({ email: uniqueEmail('ov-empty') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const overview = await caller.report.getOverview();
      expect(overview.totalProjects).toBe(0);
      expect(overview.totalTasks).toBe(0);
      expect(overview.completionRate).toBe(0);
      expect(overview.projectStats).toEqual([]);
    });

    it('CANCELLEDを除外してタスク数・完了率を集計する', async () => {
      const user = await createTestUser({ email: uniqueEmail('ov-agg') });
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id, { status: 'DONE' });
      await createTestTask(project.id, user.id, { status: 'TODO' });
      await createTestTask(project.id, user.id, { status: 'CANCELLED' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const overview = await caller.report.getOverview();

      // 母数は CANCELLED を除いた 2 件、完了 1 件 → 50%
      expect(overview.totalTasks).toBe(2);
      expect(overview.completedTasks).toBe(1);
      expect(overview.todoTasks).toBe(1);
      expect(overview.completionRate).toBe(50);
    });

    it('アーカイブ済みプロジェクトは一覧・統計・タスク集計から除外される', async () => {
      const user = await createTestUser({ email: uniqueEmail('ov-arch') });
      const activeProject = await createTestProject(user.id, { name: 'Active' });
      const archivedProject = await createTestProject(user.id, {
        name: 'Archived',
        isArchived: true,
      });
      await createTestTask(activeProject.id, user.id, { status: 'DONE' });
      await createTestTask(archivedProject.id, user.id, { status: 'TODO' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const overview = await caller.report.getOverview();

      expect(overview.totalProjects).toBe(1);
      expect(overview.projectStats).toHaveLength(1);
      expect(overview.projectStats.at(0)?.id).toBe(activeProject.id);
      // アーカイブ側の未完了タスクは母数に含めない → 完了率100%
      expect(overview.totalTasks).toBe(1);
      expect(overview.completedTasks).toBe(1);
      expect(overview.completionRate).toBe(100);
    });

    it('ステータス別・優先度別の内訳と最近のタスクを返す', async () => {
      const user = await createTestUser({ email: uniqueEmail('ov-breakdown') });
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id, { status: 'TODO', priority: 'HIGH' });
      await createTestTask(project.id, user.id, { status: 'IN_PROGRESS', priority: 'LOW' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const overview = await caller.report.getOverview();

      const statusTotal = overview.statusData.reduce((s, d) => s + d.value, 0);
      const priorityTotal = overview.priorityData.reduce((s, d) => s + d.value, 0);
      expect(statusTotal).toBe(2);
      expect(priorityTotal).toBe(2);
      expect(overview.recentTasks.length).toBeGreaterThan(0);
    });
  });

  describe('getWeeklyReport（週次レポート）', () => {
    it('期間内の完了タスク数を集計する', async () => {
      const user = await createTestUser({ email: uniqueEmail('wk-basic') });
      const project = await createTestProject(user.id);
      await createCompletedTask(project.id, user.id, new Date());

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const report = await caller.report.getWeeklyReport({ weeks: 4 });

      expect(report.weeks).toBe(4);
      expect(report.weeklyData).toHaveLength(4);
      expect(report.totalCompleted).toBe(1);
    });

    it('weeks パラメータの週数だけ weeklyData を返す', async () => {
      const user = await createTestUser({ email: uniqueEmail('wk-range') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      expect((await caller.report.getWeeklyReport({ weeks: 8 })).weeklyData).toHaveLength(8);
      expect((await caller.report.getWeeklyReport({ weeks: 12 })).weeklyData).toHaveLength(12);
    });

    it('範囲外(0 や 13)の weeks は拒否される', async () => {
      const user = await createTestUser({ email: uniqueEmail('wk-invalid') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.report.getWeeklyReport({ weeks: 0 })).rejects.toThrow();
      await expect(caller.report.getWeeklyReport({ weeks: 13 })).rejects.toThrow();
    });

    it('ADMINは他ユーザーのレポートを取得できる', async () => {
      const admin = await createTestUser({ email: uniqueEmail('wk-admin'), role: 'ADMIN' });
      const target = await createTestUser({ email: uniqueEmail('wk-target') });
      const project = await createTestProject(target.id);
      await createCompletedTask(project.id, target.id, new Date());

      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);
      const report = await caller.report.getWeeklyReport({ weeks: 4, userId: target.id });
      expect(report.totalCompleted).toBe(1);
    });

    it('一般ユーザーは他ユーザーのレポートを取得できない', async () => {
      const user = await createTestUser({ email: uniqueEmail('wk-normal'), role: 'USER' });
      const other = await createTestUser({ email: uniqueEmail('wk-other') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.report.getWeeklyReport({ weeks: 4, userId: other.id })).rejects.toThrow(
        '管理者権限が必要です',
      );
    });
  });

  describe('認証ガード', () => {
    it('未認証では概要取得が拒否される', async () => {
      const caller = await createTestCaller();
      await expect(caller.report.getOverview()).rejects.toThrow('ログインが必要です');
    });
  });
});
