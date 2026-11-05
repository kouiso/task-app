import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';

// プロジェクト行をロックする。メンバー削除（project.removeMember）も同じ行をロックするので、
// ロックを取ったあとの認可確認は、削除と同時に走っても削除済みのメンバーを通さない。
// 複数のプロジェクトを取るときは ID 順にそろえる。相互に移動する 2 件が逆順で待ち合わないようにするため。
export const lockProjectRows = async (tx: Prisma.TransactionClient, projectIds: string[]) => {
  for (const projectId of [...new Set(projectIds)].sort()) {
    const lockedProjects = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "projects" WHERE "id" = ${projectId} FOR UPDATE`,
    );
    if (lockedProjects.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'プロジェクトが見つかりません',
      });
    }
  }
};

// 対象のタスクが属するプロジェクトを id の順にロックする。ロックを待つ間にタスクが別の
// プロジェクトへ移ることがあるため、読み直してもロック済みの集合に収まるまで繰り返す。
// 読み直しで取り済みより小さい id が現れたら、順序が逆転してデッドロックし得るので、
// ロックを取らずに CONFLICT で返す（トランザクション全体が取り消される）。
export const lockProjectsOfTasks = async (
  tx: Prisma.TransactionClient,
  where: Prisma.TaskWhereInput,
): Promise<void> => {
  const locked = new Set<string>();
  let highest = '';
  for (;;) {
    const rows = await tx.task.findMany({
      where,
      select: { projectId: true },
      distinct: ['projectId'],
    });
    const pending = rows.map((row) => row.projectId).filter((id) => !locked.has(id));
    if (pending.length === 0) {
      return;
    }
    if (pending.some((id) => id < highest)) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: '他の操作と重なりました。もう一度お試しください',
      });
    }
    for (const projectId of pending.sort()) {
      await lockProjectRows(tx, [projectId]);
      locked.add(projectId);
      highest = projectId;
    }
  }
};
