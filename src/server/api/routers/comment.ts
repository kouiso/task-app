import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const commentCreateSchema = z.object({
  content: z.string().trim().min(1, 'Comment content is required'),
  taskId: z.string().cuid(),
});

const commentUpdateSchema = z.object({
  id: z.string().cuid(),
  content: z.string().trim().min(1, 'Comment content is required'),
});

export const commentRouter = createTRPCRouter({
  getByTaskId: protectedProcedure
    .input(z.object({ taskId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      // タスクのプロジェクトメンバーシップ確認
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
        include: {
          project: {
            include: {
              members: { where: { userId: ctx.session.userId } },
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

      return await prisma.comment.findMany({
        where: { taskId: input.taskId },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  create: protectedProcedure.input(commentCreateSchema).mutation(async ({ ctx, input }) => {
    // タスクのプロジェクトメンバーシップ確認
    const task = await prisma.task.findUnique({
      where: { id: input.taskId },
      include: {
        project: {
          include: {
            members: { where: { userId: ctx.session.userId } },
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

    return await prisma.comment.create({
      data: {
        content: input.content,
        taskId: input.taskId,
        userId: ctx.session.userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }),

  update: protectedProcedure.input(commentUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    // コメント所有者確認
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!comment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Comment not found',
      });
    }

    if (comment.userId !== ctx.session.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only edit your own comments',
      });
    }

    return await prisma.comment.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // コメント所有者確認
      const comment = await prisma.comment.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });

      if (!comment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Comment not found',
        });
      }

      if (comment.userId !== ctx.session.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own comments',
        });
      }

      await prisma.comment.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});
