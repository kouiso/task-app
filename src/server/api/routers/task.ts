import { Prisma, ProjectMemberRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { TASK_PRIORITY } from '@/lib/constant/priority';
import { taskPrioritySchema, taskStatusSchema } from '@/lib/constant/query';
import { hasPermission, type PermissionKey } from '@/lib/constant/roles';
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
  estimatedHours: z.number().min(0).optional().nullable(),
  actualHours: z.number().min(0).optional(),
  projectId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional().nullable(),
});

const taskTimeUpdateSchema = z.object({
  id: z.string().cuid(),
  minutesToAdd: z.number().int().min(1, '作業時間は1分以上で指定してください').safe(),
});

const MAX_BULK_TASKS = 100;
const bulkTaskIdsSchema = z
  .array(z.string().cuid())
  .min(1)
  .max(MAX_BULK_TASKS)
  .refine((ids) => new Set(ids).size === ids.length, 'タスクIDを重複して指定できません');
const getRolesWithPermission = (permission: PermissionKey): ProjectMemberRole[] =>
  Object.values(ProjectMemberRole).filter((role) => hasPermission(role, permission));
const TASK_EDIT_ROLES = getRolesWithPermission('canEdit');
const TASK_DELETE_ROLES = getRolesWithPermission('canDelete');

const buildBulkPermissionWhere = (
  tasks: { id: string; projectId: string }[],
  userId: string,
  roles: ProjectMemberRole[],
): Prisma.TaskWhereInput => ({
  // ロックしたプロジェクトから移動した行を、別プロジェクトの権限で更新しない。
  OR: tasks.map(({ id, projectId }) => ({ id, projectId })),
  project: {
    members: {
      some: { userId, role: { in: roles } },
    },
  },
});

const assertBulkWriteCount = (count: number, expected: number) => {
  if (count !== expected) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '一括操作の途中で権限が変更されました。もう一度お試しください',
    });
  }
};

const lockTaskProjects = async (tx: Prisma.TransactionClient, projectIds: string[]) => {
  const locked = new Set<string>();
  for (const projectId of [...new Set(projectIds)].sort()) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "projects" WHERE "id" = ${projectId} FOR UPDATE`,
    );
    if (rows.length > 0) {
      locked.add(projectId);
    }
  }
  return locked;
};

const getNextTaskPositionFromLockedProject = async (
  tx: Prisma.TransactionClient,
  projectId: string,
) => {
  const maxPosition = await tx.task.findFirst({
    where: { projectId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  return (maxPosition?.position ?? -1) + 1;
};

const getNextTaskPosition = async (tx: Prisma.TransactionClient, projectId: string) => {
  const lockedProjects = await lockTaskProjects(tx, [projectId]);
  if (!lockedProjects.has(projectId)) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'プロジェクトが見つかりません',
    });
  }
  return await getNextTaskPositionFromLockedProject(tx, projectId);
};

async function assertTaskAssigneeBelongsToProject(
  projectId: string,
  assigneeId: string,
  db: Pick<Prisma.TransactionClient, 'projectMember'>,
): Promise<void> {
  const member = await db.projectMember.findUnique({
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
          limit: z.number().int().min(1).max(100).default(100),
          offset: z.number().int().min(0).default(0),
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
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
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
    return await prisma.$transaction(async (tx) => {
      // メンバー削除・権限変更も同じプロジェクト行をロックするため、
      // ロック取得後の所属と権限だけを作成可否の判定に使う。
      const position = await getNextTaskPosition(tx, input.projectId);
      const callerMembership = await tx.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: ctx.session.userId,
            projectId: input.projectId,
          },
        },
        select: { role: true },
      });
      assertMemberPermission(callerMembership ? [callerMembership] : [], 'canEdit');

      if (input.assigneeId) {
        await assertTaskAssigneeBelongsToProject(input.projectId, input.assigneeId, tx);
      }

      const createData: Prisma.TaskCreateInput = {
        title: input.title,
        status: input.status,
        completedAt: input.status === TASK_STATUS.DONE ? new Date() : null,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        position,
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

      return await tx.task.create({
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
    });
  }),

  update: protectedProcedure.input(taskUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, expectedUpdatedAt, ...data } = input;

    const existingTask = await findTaskWithPermission(id, ctx.session.userId, 'canEdit');

    // 楽観ロック: ここで updatedAt を比較して即座に CONFLICT を判定しても、
    // 比較と末尾の update の間に他の更新が割り込む余地が残る（TOCTOU）。
    // 比較は末尾の update の where に含め、比較と更新を 1 回のクエリでまとめる。
    const updateData: Prisma.TaskUpdateInput = {};
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
      // completedAt は入力スキーマに存在せず、ステータス遷移からだけ決まる。
      // 画面から直接指定できると DONE のまま日時を書き換えられ、週次集計の週が動いてしまう。
      if (data.status !== existingTask.status) {
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

    const isProjectChanging =
      data.projectId !== undefined && data.projectId !== existingTask.projectId;
    const targetProjectId = isProjectChanging ? (data.projectId as string) : existingTask.projectId;

    try {
      // 比較（read）と更新（write）の間に他の更新が割り込む余地をなくすため、
      // updatedAt を where に含めた単一の update で
      // 比較と更新を 1 回のクエリにまとめる。
      // 条件不一致（他ユーザーの更新・削除で updatedAt がずれた）は Prisma が
      // 投げる P2025 を捕捉して CONFLICT に変換する。
      return await prisma.$transaction(async (tx) => {
        const transactionUpdateData: Prisma.TaskUpdateInput = { ...updateData };
        // 双方向の移動でも同じ順番で取ることで、A→B と B→A の相互待ちを防ぐ。
        const lockedProjects = await lockTaskProjects(tx, [
          existingTask.projectId,
          targetProjectId,
        ]);
        if (!lockedProjects.has(existingTask.projectId)) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'タスクの内容が更新されています。最新の内容を再読み込みしてください',
          });
        }

        const sourceMember = await tx.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId: ctx.session.userId,
              projectId: existingTask.projectId,
            },
          },
          select: { role: true },
        });
        assertMemberPermission(sourceMember ? [sourceMember] : [], 'canEdit');

        if (isProjectChanging) {
          if (!lockedProjects.has(targetProjectId)) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'プロジェクトが見つかりません',
            });
          }
          const destinationMember = await tx.projectMember.findUnique({
            where: {
              userId_projectId: {
                userId: ctx.session.userId,
                projectId: targetProjectId,
              },
            },
            select: { role: true },
          });
          assertMemberPermission(destinationMember ? [destinationMember] : [], 'canEdit');
          transactionUpdateData.project = { connect: { id: targetProjectId } };
          transactionUpdateData.position = await getNextTaskPositionFromLockedProject(
            tx,
            targetProjectId,
          );
        }

        if (data.assigneeId !== undefined) {
          if (data.assigneeId === null) {
            transactionUpdateData.assignee = { disconnect: true };
          } else {
            await assertTaskAssigneeBelongsToProject(targetProjectId, data.assigneeId, tx);
            transactionUpdateData.assignee = { connect: { id: data.assigneeId } };
          }
        } else if (isProjectChanging && existingTask.assigneeId) {
          // 移動先をロックした後の所属だけを使い、除名済みの担当者を新しいプロジェクトへ持ち込まない。
          const assigneeStillMember = await tx.projectMember.findUnique({
            where: {
              userId_projectId: {
                userId: existingTask.assigneeId,
                projectId: targetProjectId,
              },
            },
            select: { id: true },
          });
          if (!assigneeStillMember) {
            transactionUpdateData.assignee = { disconnect: true };
          }
        }

        return await tx.task.update({
          where: {
            id,
            // 認可とcompletedAtを判断したsnapshotのproject・更新時刻を、
            // クライアント指定の楽観ロック時刻とは別条件で最後まで拘束する。
            projectId: existingTask.projectId,
            updatedAt: expectedUpdatedAt ? new Date(expectedUpdatedAt) : existingTask.updatedAt,
            AND: { updatedAt: existingTask.updatedAt },
          },
          data: transactionUpdateData,
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
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new TRPCError({
          code: 'CONFLICT',
          // 自分自身の別操作（時間記録の追加など）による更新でも起こり得るため、
          // 「他のユーザー」と断定しない文言にする
          message: 'タスクの内容が更新されています。' + '最新の内容を再読み込みしてください',
        });
      }
      throw err;
    }
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const task = await findTaskWithPermission(input.id, ctx.session.userId, 'canDelete');
      try {
        return await prisma.$transaction(async (tx) => {
          // 待機中の除名・降格を反映した権限で、認可したプロジェクトのタスクだけを削除する。
          const lockedProjects = await lockTaskProjects(tx, [task.projectId]);
          if (!lockedProjects.has(task.projectId)) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: '対象の最新の状態を確認してください',
            });
          }
          const currentMember = await tx.projectMember.findUnique({
            where: { userId_projectId: { userId: ctx.session.userId, projectId: task.projectId } },
            select: { role: true },
          });
          assertMemberPermission(currentMember ? [currentMember] : [], 'canDelete');
          await tx.task.delete({ where: { id: input.id, projectId: task.projectId } });
          return { success: true };
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          throw new TRPCError({ code: 'CONFLICT', message: '対象の最新の状態を確認してください' });
        }
        throw err;
      }
    }),

  addTime: protectedProcedure.input(taskTimeUpdateSchema).mutation(async ({ ctx, input }) => {
    const task = await findTaskWithPermission(input.id, ctx.session.userId, 'canEdit');

    try {
      return await prisma.$transaction(async (tx) => {
        // メンバー削除・降格やタスク移動と同じプロジェクト行をロックし、
        // 加算直前の所属と権限だけを保存可否の判定に使う。
        const lockedProjects = await lockTaskProjects(tx, [task.projectId]);
        if (!lockedProjects.has(task.projectId)) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'タスクの内容が更新されています。最新の内容を再読み込みしてください',
          });
        }

        const currentMember = await tx.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId: ctx.session.userId,
              projectId: task.projectId,
            },
          },
          select: { role: true },
        });
        assertMemberPermission(currentMember ? [currentMember] : [], 'canEdit');

        return await tx.task.update({
          where: {
            id: input.id,
            // 認可したプロジェクトから移動したタスクへ、古い権限で加算しない。
            projectId: task.projectId,
            // 整数の合計を正確に保存できる範囲を、同じUPDATEの条件で確認する。
            timeSpentMinutes: {
              lte: Number.MAX_SAFE_INTEGER - input.minutesToAdd,
            },
          },
          data: {
            timeSpentMinutes: {
              increment: input.minutesToAdd,
            },
          },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'タスクの内容が更新されています。最新の内容を再読み込みしてください',
        });
      }
      throw err;
    }
  }),

  bulkComplete: protectedProcedure
    .input(z.object({ ids: bulkTaskIdsSchema }))
    .mutation(async ({ ctx, input }) => {
      const tasks = await findTasksWithPermission(input.ids, ctx.session.userId);
      for (const task of tasks) {
        assertMemberPermission(task.project.members, 'canEdit');
      }

      const completedAt = new Date();
      return await prisma.$transaction(async (tx) => {
        // 待機中の権限変更を古い文スナップショットで通さないよう、
        // メンバー変更と同じプロジェクト行をID順に先にロックする。
        await lockTaskProjects(
          tx,
          tasks.map((task) => task.projectId),
        );
        const where = buildBulkPermissionWhere(tasks, ctx.session.userId, TASK_EDIT_ROLES);
        // 完了日時を保ち、全対象の権限を再確認するため、
        // 完了済みの行を先に更新・ロックする。
        const unchanged = await tx.task.updateMany({
          where: { ...where, status: TASK_STATUS.DONE },
          data: { status: TASK_STATUS.DONE },
        });
        const changed = await tx.task.updateMany({
          where: { ...where, status: { not: TASK_STATUS.DONE } },
          data: { status: TASK_STATUS.DONE, completedAt },
        });
        const count = unchanged.count + changed.count;
        assertBulkWriteCount(count, input.ids.length);
        return { count };
      });
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: bulkTaskIdsSchema }))
    .mutation(async ({ ctx, input }) => {
      const tasks = await findTasksWithPermission(input.ids, ctx.session.userId);
      for (const task of tasks) {
        assertMemberPermission(task.project.members, 'canDelete');
      }

      return await prisma.$transaction(async (tx) => {
        // 待機中の権限変更を古い文スナップショットで通さないよう、
        // メンバー変更と同じプロジェクト行をID順に先にロックする。
        await lockTaskProjects(
          tx,
          tasks.map((task) => task.projectId),
        );
        const result = await tx.task.deleteMany({
          where: buildBulkPermissionWhere(tasks, ctx.session.userId, TASK_DELETE_ROLES),
        });
        assertBulkWriteCount(result.count, input.ids.length);
        return result;
      });
    }),

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        ids: bulkTaskIdsSchema,
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

      return await prisma.$transaction(async (tx) => {
        // 待機中の権限変更を古い文スナップショットで通さないよう、
        // メンバー変更と同じプロジェクト行をID順に先にロックする。
        await lockTaskProjects(
          tx,
          tasks.map((task) => task.projectId),
        );
        const where = buildBulkPermissionWhere(tasks, ctx.session.userId, TASK_EDIT_ROLES);
        // 完了済みの行を先にロックし、後続の未完了行更新との二重計上を防ぐ。
        const unchanged =
          input.status === TASK_STATUS.DONE
            ? await tx.task.updateMany({
                where: { ...where, status: TASK_STATUS.DONE },
                data: { status: TASK_STATUS.DONE },
              })
            : { count: 0 };
        const changed = await tx.task.updateMany({
          where:
            input.status === TASK_STATUS.DONE
              ? { ...where, status: { not: TASK_STATUS.DONE } }
              : where,
          data,
        });
        const count = unchanged.count + changed.count;
        assertBulkWriteCount(count, input.ids.length);
        return { count };
      });
    }),
});
