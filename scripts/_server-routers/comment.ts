import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { PermissionKey } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { assertMemberPermission } from './_helpers/permission';
import { USER_SELECT } from './_helpers/select';

const commentCreateSchema = z.object({
  content: z.string().trim().min(1, 'コメント内容は必須です'),
  taskId: z.string().cuid(),
});

const commentUpdateSchema = z.object({
  id: z.string().cuid(),
  content: z.string().trim().min(1, 'コメント内容は必須です'),
});

const lockCommentProject = async (tx: Prisma.TransactionClient, projectId: string) => {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT "id" FROM "projects" WHERE "id" = ${projectId} FOR UPDATE`,
  );
  return rows.length > 0;
};

/**
 * getByTaskId/createの両方で同一のタスク存在確認+メンバー権限検証が必要なため集約。
 * findTaskWithPermission（_helpers）はtask routerに特化しているためcomment独自で定義。
 */
const findTaskAndAssertMembership = async (
  taskId: string,
  userId: string,
  permission?: PermissionKey,
  db: Pick<Prisma.TransactionClient, 'task'> = prisma,
) => {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          members: { where: { userId } },
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

  assertMemberPermission(task.project.members, permission);

  return task;
};

/**
 * update/deleteの両方で同一の「コメント取得→メンバー確認→作者確認」パターンが必要なため集約。
 */
const findCommentAndAssertOwnership = async (
  commentId: string,
  userId: string,
  permission?: PermissionKey,
  db: Pick<Prisma.TransactionClient, 'comment'> = prisma,
) => {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: {
      userId: true,
      task: {
        include: {
          project: {
            include: {
              members: { where: { userId } },
            },
          },
        },
      },
    },
  });

  if (!comment) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'コメントが見つかりません',
    });
  }

  assertMemberPermission(comment.task.project.members, permission);

  if (comment.userId !== userId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '自分のコメントのみ編集・削除できます',
    });
  }

  return comment;
};

export const commentRouter = createTRPCRouter({
  getByTaskId: protectedProcedure
    .input(z.object({ taskId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const comments = await prisma.comment.findMany({
        where: {
          taskId: input.taskId,
          task: {
            project: {
              members: { some: { userId: ctx.session.userId } },
            },
          },
        },
        include: {
          user: {
            select: USER_SELECT,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (comments.length === 0) {
        await findTaskAndAssertMembership(input.taskId, ctx.session.userId);
      }

      return comments;
    }),

  create: protectedProcedure.input(commentCreateSchema).mutation(async ({ ctx, input }) => {
    const task = await findTaskAndAssertMembership(input.taskId, ctx.session.userId, 'canEdit');

    return await prisma.$transaction(async (tx) => {
      if (!(await lockCommentProject(tx, task.projectId))) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'タスクの内容が更新されています。最新の内容を再読み込みしてください',
        });
      }

      const currentTask = await findTaskAndAssertMembership(
        input.taskId,
        ctx.session.userId,
        'canEdit',
        tx,
      );
      if (currentTask.projectId !== task.projectId) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'タスクの内容が更新されています。最新の内容を再読み込みしてください',
        });
      }

      return await tx.comment.create({
        data: {
          content: input.content,
          taskId: currentTask.id,
          userId: ctx.session.userId,
        },
        include: {
          user: {
            select: USER_SELECT,
          },
        },
      });
    });
  }),

  update: protectedProcedure.input(commentUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const comment = await findCommentAndAssertOwnership(id, ctx.session.userId, 'canEdit');

    try {
      return await prisma.$transaction(async (tx) => {
        if (!(await lockCommentProject(tx, comment.task.projectId))) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'コメントの内容が更新されています。最新の内容を再読み込みしてください',
          });
        }

        const currentComment = await findCommentAndAssertOwnership(
          id,
          ctx.session.userId,
          'canEdit',
          tx,
        );
        if (currentComment.task.projectId !== comment.task.projectId) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'コメントの内容が更新されています。最新の内容を再読み込みしてください',
          });
        }

        return await tx.comment.update({
          where: {
            id,
            taskId: currentComment.task.id,
            userId: ctx.session.userId,
          },
          data,
          include: {
            user: {
              select: USER_SELECT,
            },
          },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'コメントが見つかりません' });
      }
      throw err;
    }
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await findCommentAndAssertOwnership(input.id, ctx.session.userId, 'canEdit');

      try {
        return await prisma.$transaction(async (tx) => {
          if (!(await lockCommentProject(tx, comment.task.projectId))) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'コメントの内容が更新されています。最新の内容を再読み込みしてください',
            });
          }

          const currentComment = await findCommentAndAssertOwnership(
            input.id,
            ctx.session.userId,
            'canEdit',
            tx,
          );
          if (currentComment.task.projectId !== comment.task.projectId) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'コメントの内容が更新されています。最新の内容を再読み込みしてください',
            });
          }

          await tx.comment.delete({
            where: {
              id: input.id,
              taskId: currentComment.task.id,
              userId: ctx.session.userId,
            },
          });
          return { success: true };
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'コメントが見つかりません' });
        }
        throw err;
      }
    }),
});
