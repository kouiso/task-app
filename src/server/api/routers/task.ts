import type { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';

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
  getAll: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().cuid().optional(),
          status: z
            .enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED', 'BLOCKED'])
            .optional(),
          assigneeId: z.string().cuid().optional(),
          limit: z.number().min(1).max(1000).default(100),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const where: Prisma.TaskWhereInput = {};
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;

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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      if (task.project.members.length === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this task',
        });
      }

      return task;
    }),

  create: protectedProcedure.input(taskCreateSchema).mutation(async ({ input }) => {
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
        connect: { id: input.createdById },
      },
    };
    if (input.description) {
      createData.description = input.description;
    }
    if (input.estimatedHours) {
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
          select: { id: true, name: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }),

  update: protectedProcedure.input(taskUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            members: {
              where: { userId: ctx.session.userId },
            },
          },
        },
      },
    });

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }

    if (task.project.members.length === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this task',
      });
    }

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
          select: { id: true, name: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
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
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      if (task.project.members.length === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this task',
        });
      }

      await prisma.task.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),

  updateTimer: protectedProcedure.input(taskTimerSchema).mutation(async ({ input }) => {
    const task = await prisma.task.findUnique({
      where: { id: input.id },
    });

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }

    if (input.action === 'start') {
      if (task.isTimerActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Timer is already running',
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
        message: 'Timer is not running',
      });
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

  addTime: protectedProcedure.input(taskTimeUpdateSchema).mutation(async ({ input }) => {
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
      const tasks = await prisma.task.findMany({
        where: { id: { in: input.ids } },
        include: {
          project: {
            include: {
              members: {
                where: { userId: ctx.session.userId },
              },
            },
          },
        },
      });

      if (tasks.length !== input.ids.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or more tasks not found',
        });
      }

      const unauthorizedTask = tasks.find((task) => task.project.members.length === 0);
      if (unauthorizedTask) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to one or more tasks',
        });
      }

      const completedAt = new Date();
      return await prisma.task.updateMany({
        where: { id: { in: input.ids } },
        data: { status: 'DONE', completedAt },
      });
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string().cuid()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const tasks = await prisma.task.findMany({
        where: { id: { in: input.ids } },
        include: {
          project: {
            include: {
              members: {
                where: { userId: ctx.session.userId },
              },
            },
          },
        },
      });

      if (tasks.length !== input.ids.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or more tasks not found',
        });
      }

      const unauthorizedTask = tasks.find((task) => task.project.members.length === 0);
      if (unauthorizedTask) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to one or more tasks',
        });
      }

      return await prisma.task.deleteMany({
        where: { id: { in: input.ids } },
      });
    }),

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string().cuid()).min(1),
        status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED', 'BLOCKED']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tasks = await prisma.task.findMany({
        where: { id: { in: input.ids } },
        include: {
          project: {
            include: {
              members: {
                where: { userId: ctx.session.userId },
              },
            },
          },
        },
      });

      if (tasks.length !== input.ids.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or more tasks not found',
        });
      }

      const unauthorizedTask = tasks.find((task) => task.project.members.length === 0);
      if (unauthorizedTask) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to one or more tasks',
        });
      }

      const data: { status: typeof input.status; completedAt?: Date | null } = {
        status: input.status,
      };

      if (input.status === 'DONE') {
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
