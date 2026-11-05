import type { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { PermissionKey } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { lockProjectsOfTasks } from './_helpers/lock';
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

/**
 * getByTaskId/createの両方で同一のタスク存在確認+メンバー権限検証が必要なため集約。
 * findTaskWithPermission（_helpers）はtask routerに特化しているためcomment独自で定義。
 * db はロック取得後の再確認を同じトランザクションで行うための差し替え口。
 */
const findTaskAndAssertMembership = async (
  taskId: string,
  userId: string,
  permission?: PermissionKey,
  db: Prisma.TransactionClient = prisma,
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
  db: Prisma.TransactionClient = prisma,
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
      await findTaskAndAssertMembership(input.taskId, ctx.session.userId);

      return await prisma.comment.findMany({
        where: { taskId: input.taskId },
        include: {
          user: {
            select: USER_SELECT,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  create: protectedProcedure.input(commentCreateSchema).mutation(async ({ ctx, input }) => {
    return await prisma.$transaction(async (tx) => {
      // create は書き込みに where 条件を付けられないため、removeMember などと同じ
      // プロジェクト行ロックを先に取り、そのトランザクション内で認可を再確認する。
      // 確認のあとにメンバー削除・降格・タスク移動が割り込んでも、確定済みの結果で判定できる。
      await lockProjectsOfTasks(tx, { id: input.taskId });
      await findTaskAndAssertMembership(input.taskId, ctx.session.userId, 'canEdit', tx);

      return await tx.comment.create({
        data: {
          content: input.content,
          taskId: input.taskId,
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
    return await prisma.$transaction(async (tx) => {
      // create と同じく、コメントの親タスクが属するプロジェクト行をロックしてから再確認する。
      await lockProjectsOfTasks(tx, { comments: { some: { id } } });
      await findCommentAndAssertOwnership(id, ctx.session.userId, 'canEdit', tx);

      return await tx.comment.update({
        where: { id },
        data,
        include: {
          user: {
            select: USER_SELECT,
          },
        },
      });
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.$transaction(async (tx) => {
        await lockProjectsOfTasks(tx, { comments: { some: { id: input.id } } });
        await findCommentAndAssertOwnership(input.id, ctx.session.userId, 'canEdit', tx);

        await tx.comment.delete({
          where: { id: input.id },
        });
        return { success: true };
      });
    }),
});
