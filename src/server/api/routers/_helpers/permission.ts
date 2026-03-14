import { TRPCError } from '@trpc/server';
import { hasPermission, isProjectMemberRole, type PermissionKey } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';

export const assertMemberPermission = (
  members: { role: string }[],
  permission?: PermissionKey,
): void => {
  const member = members[0];

  if (!member) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'この操作を実行する権限がありません',
    });
  }

  if (permission) {
    if (!isProjectMemberRole(member.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'この操作を実行する権限がありません',
      });
    }

    if (!hasPermission(member.role, permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'この操作を実行する権限がありません',
      });
    }
  }
};

const taskWithPermissionInclude = (userId: string) =>
  ({
    project: {
      include: {
        members: {
          where: { userId },
        },
      },
    },
  }) as const;

/**
 * タスク取得 + 存在確認 + メンバー権限確認をまとめて実行し、検証済みタスクを返す。
 * 同一パターンが update/delete/updateTimer/addTime で重複するためここに集約。
 */
export const findTaskWithPermission = async (taskId: string, userId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskWithPermissionInclude(userId),
  });

  if (!task) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'タスクが見つかりません',
    });
  }

  assertMemberPermission(task.project.members);

  return task;
};

/**
 * 複数タスク取得 + 件数確認 + 全タスクのメンバー権限確認をまとめて実行し、検証済みタスク配列を返す。
 * bulkComplete/bulkDelete/bulkUpdateStatus で重複するパターンをここに集約。
 */
export const findTasksWithPermission = async (ids: string[], userId: string) => {
  const tasks = await prisma.task.findMany({
    where: { id: { in: ids } },
    include: taskWithPermissionInclude(userId),
  });

  if (tasks.length !== ids.length) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'タスクが見つかりません',
    });
  }

  for (const task of tasks) {
    assertMemberPermission(task.project.members);
  }

  return tasks;
};
