import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { TASK_PRIORITY } from '@/lib/constant/priority';
import { USER_ROLE } from '@/lib/constant/roles';
import { TASK_STATUS } from '@/lib/constant/status';
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const reportRouter = createTRPCRouter({
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
