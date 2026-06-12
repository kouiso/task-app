import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { TASK_PRIORITY } from '@/lib/constant/priority';
import { USER_ROLE } from '@/lib/constant/roles';
import { TASK_STATUS } from '@/lib/constant/status';
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { getUserProjectIds } from './_helpers/permission';

export const reportRouter = createTRPCRouter({
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const projectIds = await getUserProjectIds(ctx.session.userId);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        inReviewTasks: 0,
        todoTasks: 0,
        completionRate: 0,
        totalTimeSpent: 0,
        averageTimePerTask: 0,
        recentTasks: [],
        statusData: [],
        priorityData: [],
        projectStats: [],
      };
    }

    // アーカイブ済みプロジェクトのタスクは集計対象外にし、プロジェクト数・統計との整合を取る。
    const projectScope = {
      projectId: { in: projectIds },
      project: { isArchived: false },
    } as const;

    // ダッシュボードの「アクティブな作業」を母数とするため、CANCELLED は集計から除外する。
    const activeTasksFilter = {
      ...projectScope,
      NOT: { status: TASK_STATUS.CANCELLED },
    } as const;

    const [
      projects,
      totalTasks,
      completedTasks,
      inProgressTasks,
      inReviewTasks,
      todoTasks,
      totalTimeAggregate,
      recentTasks,
      statusGroups,
      priorityGroups,
      projectTaskGroups,
      projectDoneGroups,
    ] = await Promise.all([
      // アーカイブ済みプロジェクトは「アクティブな状況」の集計対象外とし、
      // プロジェクト数(totalProjects)とプロジェクト統計(projectStats)から除外する。
      prisma.project.findMany({
        where: { id: { in: projectIds }, isArchived: false },
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where: activeTasksFilter }),
      prisma.task.count({
        where: {
          ...projectScope,
          status: TASK_STATUS.DONE,
        },
      }),
      prisma.task.count({
        where: {
          ...projectScope,
          status: TASK_STATUS.IN_PROGRESS,
        },
      }),
      prisma.task.count({
        where: {
          ...projectScope,
          status: TASK_STATUS.IN_REVIEW,
        },
      }),
      prisma.task.count({
        where: {
          ...projectScope,
          status: TASK_STATUS.TODO,
        },
      }),
      prisma.task.aggregate({
        where: activeTasksFilter,
        _sum: { timeSpentMinutes: true },
      }),
      prisma.task.findMany({
        where: activeTasksFilter,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: activeTasksFilter,
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: activeTasksFilter,
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ['projectId'],
        where: activeTasksFilter,
        _count: { _all: true },
        _sum: { timeSpentMinutes: true },
      }),
      prisma.task.groupBy({
        by: ['projectId'],
        where: {
          ...projectScope,
          status: TASK_STATUS.DONE,
        },
        _count: { _all: true },
      }),
    ]);

    const totalTimeSpent = totalTimeAggregate._sum.timeSpentMinutes ?? 0;
    const averageTimePerTask = totalTasks > 0 ? totalTimeSpent / totalTasks : 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const doneCountByProject = new Map(
      projectDoneGroups.map((group) => [group.projectId, group._count._all]),
    );
    const taskStatsByProject = new Map(
      projectTaskGroups.map((group) => [
        group.projectId,
        {
          totalTasks: group._count._all,
          totalTimeSpent: group._sum.timeSpentMinutes ?? 0,
        },
      ]),
    );

    return {
      totalProjects: projects.length,
      totalTasks,
      completedTasks,
      inProgressTasks,
      inReviewTasks,
      todoTasks,
      completionRate,
      totalTimeSpent,
      averageTimePerTask,
      recentTasks,
      statusData: statusGroups.map((group) => ({
        key: group.status,
        value: group._count._all,
      })),
      priorityData: priorityGroups.map((group) => ({
        key: group.priority,
        value: group._count._all,
      })),
      projectStats: projects.map((project) => {
        const taskStats = taskStatsByProject.get(project.id) ?? {
          totalTasks: 0,
          totalTimeSpent: 0,
        };
        const completedTaskCount = doneCountByProject.get(project.id) ?? 0;

        return {
          id: project.id,
          name: project.name,
          totalTasks: taskStats.totalTasks,
          completedTasks: completedTaskCount,
          progress:
            taskStats.totalTasks > 0 ? (completedTaskCount / taskStats.totalTasks) * 100 : 0,
          totalTimeHours: taskStats.totalTimeSpent / 60,
        };
      }),
    };
  }),

  getWeeklyReport: protectedProcedure
    .input(
      z.object({
        weeks: z.number().min(1).max(12).default(4),
        userId: z.string().cuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.userId && input.userId !== ctx.session.userId) {
        if (ctx.session.role !== USER_ROLE.ADMIN) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: '管理者権限が必要です',
          });
        }
      }

      const targetUserId = input.userId ?? ctx.session.userId;
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - input.weeks * 7);
      startDate.setHours(0, 0, 0, 0);

      const where = {
        completedAt: { gte: startDate, lte: now },
        assigneeId: targetUserId,
      };

      const tasks = await prisma.task.findMany({
        where,
        select: {
          id: true,
          completedAt: true,
          status: true,
          priority: true,
          project: { select: { id: true, name: true } },
        },
      });

      const weeklyData = Array.from({ length: input.weeks }, (_, i) => {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (input.weeks - i - 1) * 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekTasks = tasks.filter(
          (task) => task.completedAt && task.completedAt >= weekStart && task.completedAt < weekEnd,
        );

        return {
          week: `${i + 1}週目`,
          weekStart: weekStart.toISOString().split('T')[0],
          totalCompleted: weekTasks.length,
          byStatus: Object.fromEntries(
            Object.values(TASK_STATUS).map((status) => [
              status,
              weekTasks.filter((t) => t.status === status).length,
            ]),
          ),
          byPriority: Object.fromEntries(
            Object.values(TASK_PRIORITY).map((priority) => [
              priority,
              weekTasks.filter((t) => t.priority === priority).length,
            ]),
          ),
        };
      });

      return {
        weeks: input.weeks,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        weeklyData,
        totalCompleted: tasks.length,
      };
    }),
});
