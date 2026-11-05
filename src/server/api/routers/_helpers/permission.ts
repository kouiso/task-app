import { type Prisma, ProjectMemberRole } from '@prisma/client';
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

// 書き込みの WHERE 条件に埋め込む認可用のロール一覧を出す。
// assertMemberPermission と同じ hasPermission で判定するため、読み取り側と条件がずれない。
export const rolesWithPermission = (permission: PermissionKey): ProjectMemberRole[] =>
  Object.values(ProjectMemberRole).filter((role) => hasPermission(role, permission));

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

// db はロック取得後の再確認を同じトランザクションで行うための差し替え口。
// 認可確認と書き込みの間に権限が変わる（TOCTOU）のを防ぐ経路では、
// 行ロックを取ったトランザクションのクライアントを渡す。
export const findTaskWithPermission = async (
  taskId: string,
  userId: string,
  permission?: PermissionKey,
  db: Prisma.TransactionClient = prisma,
) => {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: taskWithPermissionInclude(userId),
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
