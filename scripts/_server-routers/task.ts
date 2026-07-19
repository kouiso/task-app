import { Prisma } from '@prisma/client';
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
  expectedUpdatedAt: z.string().datetime().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().min(0).optional().nullable(),
  actualHours: z.number().min(0).optional(),
  projectId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional().nullable(),
});

const taskTimeUpdateSchema = z.object({
  id: z.string().cuid(),
  minutesToAdd: z.number().min(0),
});

async function assertTaskAssigneeBelongsToProject(
  projectId: string,
  assigneeId: string,
): Promise<void> {
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: assigneeId,
        projectId,
      },
    },
    select: { id: true },
  });

  if (!member) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '担当者にはこのプロジェクトのメンバーを指定してください',
    });
  }
}

export const taskRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().cuid().optional(),
          status: taskStatusSchema.optional(),
          priority: taskPrioritySchema.optional(),
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
      if (input?.priority) where.priority = input.priority;
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

    assertMemberPermission(project.members, 'canEdit');

    if (input.assigneeId) {
      await assertTaskAssigneeBelongsToProject(input.projectId, input.assigneeId);
    }

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
    const { id, expectedUpdatedAt, ...data } = input;

    const existingTask = await findTaskWithPermission(id, ctx.session.userId, 'canEdit');

    // 楽観ロック: 事前に updatedAt を比較してから update する方式だと、
    // 比較と更新の間に他の更新が入って後勝ちになる。updatedAt を WHERE 条件に
    // 含めた条件付き update（末尾）に比較と更新を 1 回のクエリでまとめる。
    // ネストした connect/disconnect ではなく外部キーを直接書く Unchecked 型で
    // データを組み立てる。
    const updateData: Prisma.TaskUncheckedUpdateInput = {};
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.completedAt === undefined) {
        if (data.status === TASK_STATUS.DONE) {
          updateData.completedAt = new Date();
        } else {
          updateData.completedAt = null;
        }
      }
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

    const isProjectChanging =
      data.projectId !== undefined && data.projectId !== existingTask.projectId;
    const targetProjectId = isProjectChanging ? (data.projectId as string) : existingTask.projectId;

    if (isProjectChanging) {
      // 移動先プロジェクトでも canEdit 権限を持つかを確認
      const destinationMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: ctx.session.userId,
            projectId: targetProjectId,
          },
        },
      });
      assertMemberPermission(destinationMember ? [destinationMember] : [], 'canEdit');
      updateData.projectId = targetProjectId;

      // 位置はプロジェクト単位の連番なので移動先の末尾に付け直す、重複や割り込みを防ぐ
      const maxPosition = await prisma.task.findFirst({
        where: { projectId: targetProjectId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      updateData.position = (maxPosition?.position ?? -1) + 1;
    }

    if (data.assigneeId !== undefined) {
      if (data.assigneeId === null) {
        updateData.assigneeId = null;
      } else {
        await assertTaskAssigneeBelongsToProject(targetProjectId, data.assigneeId);
        updateData.assigneeId = data.assigneeId;
      }
    } else if (isProjectChanging && existingTask.assigneeId) {
      // プロジェクト変更時に既存担当者が新プロジェクトのメンバーでない場合は外す
      const assigneeStillMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: existingTask.assigneeId,
            projectId: targetProjectId,
          },
        },
        select: { id: true },
      });
      if (!assigneeStillMember) {
        updateData.assigneeId = null;
      }
    }

    try {
      // updateMany + 件数チェック + 再取得の3手だと、チェックと再取得の間に別の更新が
      // 割り込む余地が残る（TOCTOU）。updatedAt を含めた where で単一の update に
      // まとめ、条件不一致（他ユーザーの更新・削除で updatedAt がずれた）は Prisma が
      // 投げる P2025 を捕捉して CONFLICT に変換する。
      return await prisma.task.update({
        where: expectedUpdatedAt ? { id, updatedAt: new Date(expectedUpdatedAt) } : { id },
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
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        // 0 件更新 = 読み込み後に他のユーザーが更新（または削除）済み
        throw new TRPCError({
          code: 'CONFLICT',
          message:
            'タスクは他のユーザーによって更新されています。最新の内容を再読み込みしてください',
        });
      }
      throw err;
    }
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

  addTime: protectedProcedure.input(taskTimeUpdateSchema).mutation(async ({ ctx, input }) => {
    await findTaskWithPermission(input.id, ctx.session.userId, 'canEdit');

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
      const tasks = await findTasksWithPermission(input.ids, ctx.session.userId);
      for (const task of tasks) {
        assertMemberPermission(task.project.members, 'canEdit');
      }

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
      const tasks = await findTasksWithPermission(input.ids, ctx.session.userId);
      for (const task of tasks) {
        assertMemberPermission(task.project.members, 'canEdit');
      }

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
