import { TRPCError } from '@trpc/server';
import { hasPermission, isProjectMemberRole, type PermissionKey } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';

export const getUserProjectIds = async (userId: string): Promise<string[]> => {
  const userProjects = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  return userProjects.map((p) => p.projectId);
};

// Prisma生成型と自前定義型の両方を受け入れるためstringで統一し、isProjectMemberRole型ガードで検証
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
