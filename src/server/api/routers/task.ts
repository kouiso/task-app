import type { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { TASK_PRIORITY } from '@/lib/constant/priority';
import { taskPrioritySchema, taskStatusSchema } from '@/lib/constant/query';
import { TASK_STATUS } from '@/lib/constant/status';
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import {
  assertMemberPermission,
  findTasksWithPermission,
  findTaskWithPermission,
  getUserProjectIds,
} from './_helpers/permission';
import { USER_SELECT } from './_helpers/select';

const taskCreateSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  status: taskStatusSchema.default(TASK_STATUS.TODO),
  priority: taskPrioritySchema.default(TASK_PRIORITY.MEDIUM),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  projectId: z.string().cuid(),
  assigneeId: z.string().cuid().optional(),
});

const taskUpdateSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().min(0).optional().nullable(),
  actualHours: z.number().min(0).optional(),
  assigneeId: z.string().cuid().optional().nullable(),
});

const taskTimerSchema = z.object({
  id: z.string().cuid(),
  action: z.enum(['start', 'stop']),
});

const taskTimeUpdateSchema = z.object({
  id: z.string().cuid(),
  minutesToAdd: z.number().min(0),
});

export const taskRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().cuid().optional(),
          status: taskStatusSchema.optional(),
          assigneeId: z.string().cuid().optional(),
          limit: z.number().min(1).max(100).default(100),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TaskWhereInput = {};
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;

      const projectIds = await getUserProjectIds(ctx.session.userId);

      where.projectId = { in: projectIds };

      if (input?.projectId) {
        if (!projectIds.includes(input.projectId)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'このプロジェクトへのアクセス権限がありません',
          });
        }
        where.projectId = input.projectId;
      }
      if (input?.status) where.status = input.status;
      if (input?.assigneeId) where.assigneeId = input.assigneeId;

      return await prisma.task.findMany({
        where,
        include: {
          project: true,
          createdBy: {
            select: USER_SELECT,
          },
          assignee: {
            select: USER_SELECT,
          },
          comments: {
            include: {
              user: {
                select: USER_SELECT,
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const task = await prisma.task.findUnique({
        where: { id: input.id },
        include: {
          project: {
            include: {
              members: {
                where: { userId: ctx.session.userId },
              },
            },
          },
          createdBy: {
            select: USER_SELECT,
          },
          assignee: {
            select: USER_SELECT,
          },
          comments: {
            include: {
              user: {
                select: USER_SELECT,
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      assertMemberPermission(task.project.members);

      return task;
    }),

  create: protectedProcedure.input(taskCreateSchema).mutation(async ({ ctx, input }) => {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      include: {
        members: {
          where: { userId: ctx.session.userId },
        },
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'プロジェクトが見つかりません',
      });
    }

    assertMemberPermission(project.members);

    const maxPosition = await prisma.task.findFirst({
      where: { projectId: input.projectId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const createData: Prisma.TaskCreateInput = {
      title: input.title,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      position: (maxPosition?.position ?? -1) + 1,
      project: {
        connect: { id: input.projectId },
      },
      createdBy: {
        connect: { id: ctx.session.userId },
      },
    };
    if (input.description !== undefined) {
      createData.description = input.description;
    }
    if (input.estimatedHours !== undefined) {
      createData.estimatedHours = input.estimatedHours;
    }
    if (input.assigneeId) {
      createData.assignee = {
        connect: { id: input.assigneeId },
      };
    }

    return await prisma.task.create({
      data: createData,
      include: {
        project: true,
        createdBy: {
          select: USER_SELECT,
        },
        assignee: {
          select: USER_SELECT,
        },
      },
    });
  }),

  update: protectedProcedure.input(taskUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    await findTaskWithPermission(id, ctx.session.userId);

    const updateData: Prisma.TaskUpdateInput = {};
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }
    if (data.estimatedHours !== undefined) {
      updateData.estimatedHours = data.estimatedHours;
    }
    if (data.actualHours !== undefined) {
      updateData.actualHours = data.actualHours;
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    }
    if (data.assigneeId !== undefined) {
      if (data.assigneeId === null) {
        updateData.assignee = { disconnect: true };
      } else {
        updateData.assignee = { connect: { id: data.assigneeId } };
      }
    }

    return await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        createdBy: {
          select: USER_SELECT,
        },
        assignee: {
          select: USER_SELECT,
        },
      },
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const task = await findTaskWithPermission(input.id, ctx.session.userId);
      assertMemberPermission(task.project.members, 'canDelete');

      await prisma.task.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),

  updateTimer: protectedProcedure.input(taskTimerSchema).mutation(async ({ ctx, input }) => {
    const task = await findTaskWithPermission(input.id, ctx.session.userId);

    if (input.action === 'start') {
      if (task.isTimerActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'タイマーは既に実行中です',
        });
      }

      return await prisma.task.update({
        where: { id: input.id },
        data: {
          isTimerActive: true,
          timerStartedAt: new Date(),
        },
      });
    }
    if (!task.isTimerActive || !task.timerStartedAt) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'タイマーは実行されていません',
      });
    }

    const MS_PER_MINUTE = 60_000;
    const elapsedMinutes = Math.floor((Date.now() - task.timerStartedAt.getTime()) / MS_PER_MINUTE);

    return await prisma.task.update({
      where: { id: input.id },
      data: {
        isTimerActive: false,
        timerStartedAt: null,
        timeSpentMinutes: task.timeSpentMinutes + elapsedMinutes,
      },
    });
  }),

  addTime: protectedProcedure.input(taskTimeUpdateSchema).mutation(async ({ ctx, input }) => {
    await findTaskWithPermission(input.id, ctx.session.userId);

    return await prisma.task.update({
      where: { id: input.id },
      data: {
        timeSpentMinutes: {
          increment: input.minutesToAdd,
        },
      },
    });
  }),

  bulkComplete: protectedProcedure
    .input(z.object({ ids: z.array(z.string().cuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await findTasksWithPermission(input.ids, ctx.session.userId);

      const completedAt = new Date();
      return await prisma.task.updateMany({
        where: { id: { in: input.ids } },
        data: { status: TASK_STATUS.DONE, completedAt },
      });
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string().cuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const tasks = await findTasksWithPermission(input.ids, ctx.session.userId);
      for (const task of tasks) {
        assertMemberPermission(task.project.members, 'canDelete');
      }

      return await prisma.task.deleteMany({
        where: { id: { in: input.ids } },
      });
    }),

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string().cuid()).min(1),
        status: taskStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await findTasksWithPermission(input.ids, ctx.session.userId);

      const data: Prisma.TaskUpdateManyMutationInput = {
        status: input.status,
      };

      if (input.status === TASK_STATUS.DONE) {
        data.completedAt = new Date();
      } else {
        data.completedAt = null;
      }

      return await prisma.task.updateMany({
        where: { id: { in: input.ids } },
        data,
      });
    }),
});
