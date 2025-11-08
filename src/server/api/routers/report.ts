import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const reportRouter = createTRPCRouter({
  getWeeklyReport: protectedProcedure
    .input(
      z.object({
        weeks: z.number().min(1).max(12).default(4),
        userId: z.string().cuid().optional(),
      }),
    )
    .query(async ({ input }) => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - input.weeks * 7);

      const where = {
        completedAt: { gte: startDate, lte: now },
        ...(input.userId && { assigneeId: input.userId }),
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
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekTasks = tasks.filter(
          (task) => task.completedAt && task.completedAt >= weekStart && task.completedAt < weekEnd,
        );

        return {
          week: `Week ${i + 1}`,
          weekStart: weekStart.toISOString().split('T')[0],
          totalCompleted: weekTasks.length,
          byStatus: Object.fromEntries(
            ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED', 'BLOCKED'].map((status) => [
              status,
              weekTasks.filter((t) => t.status === status).length,
            ]),
          ),
          byPriority: Object.fromEntries(
            ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => [
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
