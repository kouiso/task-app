import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { hasPermission, isProjectMemberRole, type ProjectMemberRole } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const commentCreateSchema = z.object({
  content: z.string().trim().min(1, 'コメント内容は必須です'),
  taskId: z.string().cuid(),
});

const commentUpdateSchema = z.object({
  id: z.string().cuid(),
  content: z.string().trim().min(1, 'コメント内容は必須です'),
});

export const commentRouter = createTRPCRouter({
  getByTaskId: protectedProcedure
    .input(z.object({ taskId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
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
          message: 'タスクが見つかりません',
        });
      }

      if (task.project.members.length === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'このタスクへのアクセス権限がありません',
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
        message: 'タスクが見つかりません',
      });
    }

    if (task.project.members.length === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'このタスクへのアクセス権限がありません',
      });
    }

    const member = task.project.members[0];
    if (!member || !isProjectMemberRole(member.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'この操作を実行する権限がありません',
      });
    }
    const memberRole: ProjectMemberRole = member.role;
    // VIEWERはコメント投稿不可（canEditで一括判定）
    if (!hasPermission(memberRole, 'canEdit')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'この操作を実行する権限がありません',
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

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!comment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'コメントが見つかりません',
      });
    }

    if (comment.userId !== ctx.session.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: '自分のコメントのみ編集できます',
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
      const comment = await prisma.comment.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });

      if (!comment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'コメントが見つかりません',
        });
      }

      if (comment.userId !== ctx.session.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '自分のコメントのみ削除できます',
        });
      }

      await prisma.comment.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});
