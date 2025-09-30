import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const commentInputSchema = z.object({
  content: z.string().min(1, 'コメント内容は必須です').max(1000, 'コメントは1000文字以内で入力してください'),
  taskId: z.string().cuid('無効なタスクIDです'),
});

const commentUpdateSchema = z.object({
  id: z.string().cuid(),
  content: z.string().min(1, 'コメント内容は必須です').max(1000, 'コメントは1000文字以内で入力してください'),
});

export const commentRouter = createTRPCRouter({
  // コメント一覧取得
  getByTaskId: protectedProcedure
    .input(z.object({ taskId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      // タスクアクセス権確認
      const task = await ctx.prisma.task.findFirst({
        where: {
          id: input.taskId,
          OR: [
            { createdById: ctx.session.user.id },
            { assigneeId: ctx.session.user.id },
          ],
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      const comments = await ctx.prisma.comment.findMany({
        where: { taskId: input.taskId },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return comments;
    }),

  // コメント作成
  create: protectedProcedure
    .input(commentInputSchema)
    .mutation(async ({ ctx, input }) => {
      // タスクアクセス権確認
      const task = await ctx.prisma.task.findFirst({
        where: {
          id: input.taskId,
          OR: [
            { createdById: ctx.session.user.id },
            { assigneeId: ctx.session.user.id },
          ],
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'タスクが見つかりません',
        });
      }

      const comment = await ctx.prisma.comment.create({
        data: {
          content: input.content.trim(),
          taskId: input.taskId,
          userId: ctx.session.user.id,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      return comment;
    }),

  // コメント更新
  update: protectedProcedure
    .input(commentUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      // コメント存在確認と権限チェック
      const existingComment = await ctx.prisma.comment.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id, // 自分のコメントのみ編集可能
        },
      });

      if (!existingComment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'コメントが見つかりません',
        });
      }

      const comment = await ctx.prisma.comment.update({
        where: { id: input.id },
        data: { content: input.content.trim() },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      return comment;
    }),

  // コメント削除
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // コメント存在確認と権限チェック
      const comment = await ctx.prisma.comment.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id, // 自分のコメントのみ削除可能
        },
      });

      if (!comment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'コメントが見つかりません',
        });
      }

      await ctx.prisma.comment.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
