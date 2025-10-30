import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

const commentCreateSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  taskId: z.string().cuid(),
  userId: z.string().cuid(),
});

const commentUpdateSchema = z.object({
  id: z.string().cuid(),
  content: z.string().min(1, 'Comment content is required'),
});

export const commentRouter = createTRPCRouter({
  getByTaskId: publicProcedure
    .input(z.object({ taskId: z.string().cuid() }))
    .query(async ({ input }) => {
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

  create: publicProcedure.input(commentCreateSchema).mutation(async ({ input }) => {
    return await prisma.comment.create({
      data: input,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }),

  update: publicProcedure.input(commentUpdateSchema).mutation(async ({ input }) => {
    const { id, ...data } = input;

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

  delete: publicProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ input }) => {
    await prisma.comment.delete({
      where: { id: input.id },
    });
    return { success: true };
  }),
});
