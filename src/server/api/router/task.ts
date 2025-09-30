import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TaskStatus, TaskPriority } from '@prisma/client';

const taskInputSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(255, 'タイトルは255文字以内で入力してください'),
  description: z.string().optional(),
  projectId: z.string().cuid('無効なプロジェクトIDです'),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  estimatedHours: z.number().min(0).optional(),
  dueDate: z.date().optional(),
  assigneeId: z.string().cuid().optional(),
});

const taskUpdateSchema = taskInputSchema.partial().extend({
  id: z.string().cuid(),
  status: z.nativeEnum(TaskStatus).optional(),
});

const taskFilterSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  search: z.string().optional(),
  dueDateFrom: z.date().optional(),
  dueDateTo: z.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const taskRouter = createTRPCRouter({
  // タスク一覧取得
  getAll: protectedProcedure
    .input(taskFilterSchema)
    .query(async ({ ctx, input }) => {
      const where: any = {
        OR: [
          { createdById: ctx.session.user.id },
          { assigneeId: ctx.session.user.id },
        ],
      };

      // フィルタ条件を追加
      if (input.status) where.status = input.status;
      if (input.priority) where.priority = input.priority;
      if (input.assigneeId) where.assigneeId = input.assigneeId;
      if (input.projectId) where.projectId = input.projectId;
      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: 'insensitive' } },
          { description: { contains: input.search, mode: 'insensitive' } },
        ];
      }
      if (input.dueDateFrom || input.dueDateTo) {
        where.dueDate = {};
        if (input.dueDateFrom) where.dueDate.gte = input.dueDateFrom;
        if (input.dueDateTo) where.dueDate.lte = input.dueDateTo;
      }

      const [tasks, total] = await Promise.all([
        ctx.prisma.task.findMany({
          where,
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
            project: {
              select: { id: true, name: true, color: true },
            },
            comments: {
              select: { id: true },
            },
          },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' },
          ],
          take: input.limit,
          skip: input.offset,
        }),
        ctx.prisma.task.count({ where }),
      ]);

      return {
        tasks: tasks.map(task => ({
          ...task,
          commentCount: task.comments.length,
          comments: undefined,
        })),
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // 特定タスク取得
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findFirst({
        where: {
          id: input.id,
          OR: [
            { createdById: ctx.session.user.id },
            { assigneeId: ctx.session.user.id },
          ],
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true, color: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      return task;
    }),

  // タスク作成
  create: protectedProcedure
    .input(taskInputSchema)
    .mutation(async ({ ctx, input }) => {
      // プロジェクトアクセス権確認
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          members: {
            some: { userId: ctx.session.user.id },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'このプロジェクトにタスクを作成する権限がありません',
        });
      }

      const task = await ctx.prisma.task.create({
        data: {
          ...input,
          createdById: ctx.session.user.id,
          assigneeId: input.assigneeId || ctx.session.user.id,
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      return task;
    }),

  // タスク更新
  update: protectedProcedure
    .input(taskUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // タスク存在確認と権限チェック
      const existingTask = await ctx.prisma.task.findFirst({
        where: {
          id,
          OR: [
            { createdById: ctx.session.user.id },
            { assigneeId: ctx.session.user.id },
          ],
        },
      });

      if (!existingTask) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      const task = await ctx.prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      return task;
    }),

  // タスク削除
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findFirst({
        where: {
          id: input.id,
          createdById: ctx.session.user.id, // 作成者のみ削除可能
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      await ctx.prisma.task.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // タイマー開始
  startTimer: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.$transaction(async (tx) => {
        // 他のアクティブタイマーを停止
        const activeTasks = await tx.task.findMany({
          where: {
            createdById: ctx.session.user.id,
            isTimerActive: true,
            NOT: { id: input.id },
          },
        });

        for (const activeTask of activeTasks) {
          if (activeTask.timerStartedAt) {
            const elapsedMinutes =
              (Date.now() - activeTask.timerStartedAt.getTime()) / (1000 * 60);

            await tx.task.update({
              where: { id: activeTask.id },
              data: {
                isTimerActive: false,
                timerStartedAt: null,
                timeSpentMinutes: {
                  increment: elapsedMinutes,
                },
                actualHours: {
                  increment: elapsedMinutes / 60,
                },
              },
            });
          }
        }

        // 対象タスクのタイマーを開始
        const updatedTask = await tx.task.update({
          where: { id: input.id },
          data: {
            isTimerActive: true,
            timerStartedAt: new Date(),
            status: TaskStatus.IN_PROGRESS,
          },
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
            project: {
              select: { id: true, name: true, color: true },
            },
          },
        });

        return updatedTask;
      });

      return result;
    }),

  // タイマー停止
  stopTimer: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: {
          timerStartedAt: true,
          timeSpentMinutes: true,
          isTimerActive: true,
        },
      });

      if (!task || !task.isTimerActive || !task.timerStartedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'タイマーが開始されていません',
        });
      }

      const elapsedMinutes =
        (Date.now() - task.timerStartedAt.getTime()) / (1000 * 60);

      const updatedTask = await ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          isTimerActive: false,
          timerStartedAt: null,
          timeSpentMinutes: task.timeSpentMinutes + elapsedMinutes,
          actualHours: (task.timeSpentMinutes + elapsedMinutes) / 60,
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      return {
        task: updatedTask,
        addedMinutes: Math.round(elapsedMinutes),
      };
    }),

  // 手動時間追加
  addManualTime: protectedProcedure
    .input(z.object({
      id: z.string().cuid(),
      minutes: z.number().min(1).max(1440), // 1分から24時間
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          timeSpentMinutes: {
            increment: input.minutes,
          },
          actualHours: {
            increment: input.minutes / 60,
          },
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      return task;
    }),
});
