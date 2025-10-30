import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z
    .enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED', 'BLOCKED'])
    .default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  projectId: z.string().cuid(),
  createdById: z.string().cuid(),
  assigneeId: z.string().cuid().optional(),
});

const taskUpdateSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED', 'BLOCKED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
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
  getAll: publicProcedure
    .input(
      z
        .object({
          projectId: z.string().cuid().optional(),
          status: z
            .enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED', 'BLOCKED'])
            .optional(),
          assigneeId: z.string().cuid().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const where: any = {};

      if (input?.projectId) where.projectId = input.projectId;
      if (input?.status) where.status = input.status;
      if (input?.assigneeId) where.assigneeId = input.assigneeId;

      return await prisma.task.findMany({
        where,
        include: {
          project: true,
          createdBy: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      });
    }),

  getById: publicProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ input }) => {
    const task = await prisma.task.findUnique({
      where: { id: input.id },
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  }),

  create: publicProcedure.input(taskCreateSchema).mutation(async ({ input }) => {
    const maxPosition = await prisma.task.findFirst({
      where: { projectId: input.projectId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return await prisma.task.create({
      data: {
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        position: (maxPosition?.position ?? -1) + 1,
      },
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }),

  update: publicProcedure.input(taskUpdateSchema).mutation(async ({ input }) => {
    const { id, ...data } = input;

    const updateData: any = { ...data };
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    }

    return await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }),

  delete: publicProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ input }) => {
    await prisma.task.delete({
      where: { id: input.id },
    });
    return { success: true };
  }),

  updateTimer: publicProcedure.input(taskTimerSchema).mutation(async ({ input }) => {
    const task = await prisma.task.findUnique({
      where: { id: input.id },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (input.action === 'start') {
      if (task.isTimerActive) {
        throw new Error('Timer is already running');
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
      throw new Error('Timer is not running');
    }

    const elapsedMinutes = Math.floor((Date.now() - task.timerStartedAt.getTime()) / 60000);

    return await prisma.task.update({
      where: { id: input.id },
      data: {
        isTimerActive: false,
        timerStartedAt: null,
        timeSpentMinutes: task.timeSpentMinutes + elapsedMinutes,
      },
    });
  }),

  addTime: publicProcedure.input(taskTimeUpdateSchema).mutation(async ({ input }) => {
    return await prisma.task.update({
      where: { id: input.id },
      data: {
        timeSpentMinutes: {
          increment: input.minutesToAdd,
        },
      },
    });
  }),
});
