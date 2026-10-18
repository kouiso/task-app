import { describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestProject,
  createTestTask,
  createTestUser,
} from '../../../../test/helpers';
import * as permission from '../_helpers/permission';

// タスク仕様(task.ts / doc/09_task_create_edit.md / doc/10_task_delete_search.md)を起点に検証する。
// 編集系は canEdit(OWNER/ADMIN/MEMBER)、削除系は canDelete(OWNER/ADMIN)、閲覧はメンバーであること。

type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
const NON_EXISTENT_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxx';

let seq = 0;
const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${seq++}@example.com`;

// acting ユーザーを指定ロールの唯一メンバーとして持つプロジェクトを用意する
async function setup(role: MemberRole) {
  const actor = await createTestUser({ email: uniqueEmail('task-actor') });
  const project = await createTestProject(actor.id); // 作成者は OWNER
  if (role !== 'OWNER') {
    await prisma.projectMember.update({
      where: { userId_projectId: { userId: actor.id, projectId: project.id } },
      data: { role },
    });
  }
  const caller = await createAuthenticatedCaller(actor.id, actor.email, actor.role);
  return { actor, project, caller };
}

// 別のトランザクションのロックを待っている接続が現れるまで待つ。現れなければテストを失敗させる。
// 固定時間の待ちでは遅い環境で順序が崩れるので、実際にロック待ちに入ったことを確かめる。
async function waitUntilSomeoneWaitsForLock(): Promise<void> {
  for (let i = 0; i < 250; i++) {
    const waiting = await prisma.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM pg_stat_activity
      WHERE wait_event_type = 'Lock' AND datname = current_database()`;
    if ((waiting[0]?.n ?? 0) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('ロック待ちに入った接続が見つかりませんでした');
}

// プロジェクト行のロックを別のトランザクションで握り、その間に呼び出しを走らせてから、
// メンバーを削除してロックを離す。呼び出しが「確認 → ロック → 保存」のどこで割り込まれても、
// 毎回同じ順序（呼び出しがロックを待つ間にメンバーが削除される）になる。
async function callWhileMemberIsRemoved<T>(
  projectId: string,
  memberId: string,
  call: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  let release: () => void = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let markLocked: () => void = () => {};
  const locked = new Promise<void>((resolve) => {
    markLocked = resolve;
  });

  const remover = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id" = ${projectId} FOR UPDATE`;
    markLocked();
    await released;
    await tx.projectMember.delete({
      where: { userId_projectId: { userId: memberId, projectId } },
    });
  });

  await locked;
  const pending = call().then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );

  // 呼び出しがロック待ちに入るまで待つ。待たずに離すと、順序が毎回変わってしまう。
  for (let i = 0; i < 100; i++) {
    const waiting = await prisma.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type = 'Lock'`;
    if ((waiting[0]?.n ?? 0) > 0) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  release();
  await remover;
  return await pending;
}

describe('taskRouter', () => {
  describe('getAll（一覧）', () => {
    it('自分のプロジェクトのタスクを返す', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id, { title: 'My Task' });

      const result = await caller.task.getAll();
      expect(result.map((t) => t.id)).toContain(task.id);
    });

    it('status でフィルタできる', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      await createTestTask(project.id, actor.id, { status: 'TODO' });
      const done = await createTestTask(project.id, actor.id, { status: 'DONE' });

      const result = await caller.task.getAll({ status: 'DONE' });
      expect(result.map((t) => t.id)).toEqual([done.id]);
    });

    it('権限の無いプロジェクトIDを指定すると拒否される', async () => {
      const { caller } = await setup('MEMBER');
      const other = await createTestUser({ email: uniqueEmail('task-other') });
      const otherProject = await createTestProject(other.id);

      await expect(caller.task.getAll({ projectId: otherProject.id })).rejects.toThrow(
        'このプロジェクトへのアクセス権限がありません',
      );
    });
  });

  describe('getById（詳細）', () => {
    it('メンバーはタスク詳細を閲覧できる', async () => {
      const { actor, project, caller } = await setup('VIEWER');
      const task = await createTestTask(project.id, actor.id);
      const result = await caller.task.getById({ id: task.id });
      expect(result.id).toBe(task.id);
    });

    it('非メンバーは閲覧を拒否される', async () => {
      const { actor, project } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id);
      const stranger = await createTestUser({ email: uniqueEmail('task-stranger') });
      const caller = await createAuthenticatedCaller(stranger.id, stranger.email, stranger.role);

      await expect(caller.task.getById({ id: task.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('存在しないタスクは NOT_FOUND', async () => {
      const { caller } = await setup('MEMBER');
      await expect(caller.task.getById({ id: NON_EXISTENT_ID })).rejects.toThrow(
        'タスクが見つかりません',
      );
    });
  });

  describe('create（作成）', () => {
    it('DONEで作成したタスクには完了日時が記録される', async () => {
      const { project, caller } = await setup('MEMBER');
      const before = Date.now();
      const task = await caller.task.create({
        title: '完了した作業',
        projectId: project.id,
        status: 'DONE',
      });
      expect(task.completedAt).toBeInstanceOf(Date);
      expect(task.completedAt?.getTime()).toBeGreaterThanOrEqual(before);
      expect(task.completedAt?.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('MEMBER(canEdit)はタスクを作成できる', async () => {
      const { project, caller } = await setup('MEMBER');
      const task = await caller.task.create({ title: '新タスク', projectId: project.id });
      expect(task.title).toBe('新タスク');
      expect(task.status).toBe('TODO');
    });

    it('VIEWERはタスク作成を拒否される(canEdit権限なし)', async () => {
      const { project, caller } = await setup('VIEWER');
      await expect(caller.task.create({ title: 'X', projectId: project.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('タイトルが空なら拒否する', async () => {
      const { project, caller } = await setup('OWNER');
      await expect(caller.task.create({ title: '', projectId: project.id })).rejects.toThrow(
        'タイトルは必須です',
      );
    });

    it('存在しないプロジェクトは NOT_FOUND', async () => {
      const { caller } = await setup('OWNER');
      await expect(caller.task.create({ title: 'X', projectId: NON_EXISTENT_ID })).rejects.toThrow(
        'プロジェクトが見つかりません',
      );
    });

    it('担当者がプロジェクト未参加なら拒否する', async () => {
      const { project, caller } = await setup('OWNER');
      const outsider = await createTestUser({ email: uniqueEmail('task-outsider') });
      await expect(
        caller.task.create({ title: 'X', projectId: project.id, assigneeId: outsider.id }),
      ).rejects.toThrow('担当者にはこのプロジェクトのメンバーを指定してください');
    });

    it('プロジェクトメンバーを担当者に指定できる', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await caller.task.create({
        title: '担当付き',
        projectId: project.id,
        assigneeId: actor.id,
      });
      expect(task.assigneeId).toBe(actor.id);
    });

    it('同じプロジェクトへ同時作成しても position が重複しない', async () => {
      const { project, caller } = await setup('OWNER');
      const tasks = await Promise.all(
        Array.from({ length: 6 }, (_, index) =>
          caller.task.create({ title: `同時作成${index}`, projectId: project.id }),
        ),
      );

      expect(new Set(tasks.map((task) => task.position)).size).toBe(tasks.length);
    });

    it('担当者の確認とメンバー削除が競合しても、外れた人を担当にしたタスクは作られない', async () => {
      const { project, caller } = await setup('OWNER');
      const member = await createTestUser({ email: uniqueEmail('task-removed-member') });
      await prisma.projectMember.create({
        data: { userId: member.id, projectId: project.id, role: 'MEMBER' },
      });

      const result = await callWhileMemberIsRemoved(project.id, member.id, () =>
        caller.task.create({ title: '競合', projectId: project.id, assigneeId: member.id }),
      );

      expect(result.ok).toBe(false);
      expect(String((result as { error: unknown }).error)).toContain(
        '担当者にはこのプロジェクトのメンバーを指定してください',
      );
      const leaked = await prisma.task.findMany({
        where: { projectId: project.id, assigneeId: member.id },
      });
      expect(leaked).toEqual([]);
    });
  });

  describe('update（更新）', () => {
    it.each([
      'DONE',
      'TODO',
    ] as const)('expectedUpdatedAtがなくても%sの読み取り後に状態が変われば競合になる', async (status) => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id, { status });
      const completedAt = new Date('2026-01-01T00:00:00.000Z');
      await prisma.task.update({
        where: { id: task.id },
        data: { completedAt: status === 'DONE' ? completedAt : null },
      });
      const concurrentStatus = status === 'DONE' ? 'TODO' : 'DONE';
      const concurrentCompletedAt = concurrentStatus === 'DONE' ? completedAt : null;
      const originalFindTask = permission.findTaskWithPermission;
      const findTaskSpy = vi.spyOn(permission, 'findTaskWithPermission');
      findTaskSpy.mockImplementationOnce(async (...args) => {
        const snapshot = await originalFindTask(...args);
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: concurrentStatus,
            completedAt: concurrentCompletedAt,
            updatedAt: new Date(snapshot.updatedAt.getTime() + 1000),
          },
        });
        return snapshot;
      });

      try {
        await expect(caller.task.update({ id: task.id, status })).rejects.toMatchObject({
          code: 'CONFLICT',
        });
        const stored = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
        expect(stored.status).toBe(concurrentStatus);
        expect(stored.completedAt).toEqual(concurrentCompletedAt);
      } finally {
        findTaskSpy.mockRestore();
      }
    });

    it('完了済みタスクをDONEのまま編集しても完了日時を維持する', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id, { status: 'DONE' });
      const completedAt = new Date('2026-01-01T00:00:00.000Z');
      await prisma.task.update({ where: { id: task.id }, data: { completedAt } });

      const result = await caller.task.update({ id: task.id, title: '編集後', status: 'DONE' });
      expect(result.title).toBe('編集後');
      expect(result.completedAt).toEqual(completedAt);
    });

    it('完了を取り消すと完了日時を消す', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id, { status: 'DONE' });
      await prisma.task.update({ where: { id: task.id }, data: { completedAt: new Date() } });

      const result = await caller.task.update({ id: task.id, status: 'TODO' });
      expect(result.completedAt).toBeNull();
    });

    it('MEMBERはタスクを更新できる', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id);
      const result = await caller.task.update({ id: task.id, title: '更新後' });
      expect(result.title).toBe('更新後');
    });

    it('VIEWERは更新を拒否される', async () => {
      const { actor, project, caller } = await setup('VIEWER');
      const task = await createTestTask(project.id, actor.id);
      await expect(caller.task.update({ id: task.id, title: 'X' })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('ステータスをDONEにすると completedAt が記録される', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id, { status: 'TODO' });
      const result = await caller.task.update({ id: task.id, status: 'DONE' });
      expect(result.status).toBe('DONE');
      expect(result.completedAt).not.toBeNull();
    });

    it('楽観ロック: 古い expectedUpdatedAt では競合エラー', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id);
      const staleDate = new Date(task.updatedAt.getTime() - 1000).toISOString();
      await expect(
        caller.task.update({ id: task.id, title: 'X', expectedUpdatedAt: staleDate }),
      ).rejects.toThrow('タスクの内容が更新されています');
    });

    it('存在しないタスクは NOT_FOUND', async () => {
      const { caller } = await setup('OWNER');
      await expect(caller.task.update({ id: NON_EXISTENT_ID, title: 'X' })).rejects.toThrow(
        'タスクが見つかりません',
      );
    });

    it('同じプロジェクトへ同時移動しても position が重複しない', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const sourceProject = await createTestProject(actor.id);
      const first = await createTestTask(sourceProject.id, actor.id);
      const second = await createTestTask(sourceProject.id, actor.id);

      const moved = await Promise.all([
        caller.task.update({ id: first.id, projectId: project.id }),
        caller.task.update({ id: second.id, projectId: project.id }),
      ]);

      expect(new Set(moved.map((task) => task.position)).size).toBe(moved.length);
    });
  });

  describe('update の担当者指定とメンバー削除の競合', () => {
    it('担当の指定とメンバー削除が競合しても、外れた人は担当にならない', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const member = await createTestUser({ email: uniqueEmail('task-removed-assignee') });
      await prisma.projectMember.create({
        data: { userId: member.id, projectId: project.id, role: 'MEMBER' },
      });
      const task = await createTestTask(project.id, actor.id);

      const result = await callWhileMemberIsRemoved(project.id, member.id, () =>
        caller.task.update({ id: task.id, assigneeId: member.id }),
      );

      expect(result.ok).toBe(false);
      expect(String((result as { error: unknown }).error)).toContain(
        '担当者にはこのプロジェクトのメンバーを指定してください',
      );
      const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      expect(after.assigneeId).toBeNull();
    });

    it('プロジェクト移動は、移動元のロックが解放されるまで待つ', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const destination = await createTestProject(actor.id);
      const task = await createTestTask(project.id, actor.id);

      let release: () => void = () => {};
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      let markLocked: () => void = () => {};
      const locked = new Promise<void>((resolve) => {
        markLocked = resolve;
      });
      // 一括操作が移動元を握っている状態を作る。
      const holder = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id" = ${project.id} FOR UPDATE`;
        markLocked();
        await released;
      });

      await locked;
      const moving = caller.task.update({ id: task.id, projectId: destination.id });
      await waitUntilSomeoneWaitsForLock();
      const during = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      expect(during.projectId).toBe(project.id);

      release();
      await holder;
      await moving;
      const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      expect(after.projectId).toBe(destination.id);
    });

    it('プロジェクト移動とメンバー削除が競合しても、移動先のメンバーでない担当者は外れる', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const destination = await createTestProject(actor.id);
      const member = await createTestUser({ email: uniqueEmail('task-moving-assignee') });
      await prisma.projectMember.create({
        data: { userId: member.id, projectId: destination.id, role: 'MEMBER' },
      });
      await prisma.projectMember.create({
        data: { userId: member.id, projectId: project.id, role: 'MEMBER' },
      });
      const task = await createTestTask(project.id, actor.id);
      await prisma.task.update({ where: { id: task.id }, data: { assigneeId: member.id } });

      // 移動先のメンバーが削除される間に移動する。担当者は移動先のメンバーでなくなる。
      const result = await callWhileMemberIsRemoved(destination.id, member.id, () =>
        caller.task.update({ id: task.id, projectId: destination.id }),
      );

      expect(result.ok).toBe(true);
      const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      expect(after.projectId).toBe(destination.id);
      expect(after.assigneeId).toBeNull();
    });
  });

  describe('完了・中止のタスクを未完了へ戻すときの担当者', () => {
    // removeMember は完了・中止の担当者を実績として残す。退会後の状態を直接作って確かめる。
    async function setupClosedTaskWithAssignee(status: 'DONE' | 'CANCELLED', stillMember: boolean) {
      const { actor, project, caller } = await setup('OWNER');
      const assignee = await createTestUser({ email: uniqueEmail('task-reopen-assignee') });
      await prisma.projectMember.create({
        data: { userId: assignee.id, projectId: project.id, role: 'MEMBER' },
      });
      const task = await createTestTask(project.id, actor.id, { status });
      await prisma.task.update({ where: { id: task.id }, data: { assigneeId: assignee.id } });
      if (!stillMember) {
        await prisma.projectMember.delete({
          where: { userId_projectId: { userId: assignee.id, projectId: project.id } },
        });
      }
      return { project, caller, task, assignee };
    }

    it.each([
      'DONE',
      'CANCELLED',
    ] as const)('update: %s のタスクを TODO に戻すと、外れた人の担当を外す', async (status) => {
      const { caller, task } = await setupClosedTaskWithAssignee(status, false);
      const result = await caller.task.update({ id: task.id, status: 'TODO' });
      expect(result.assigneeId).toBeNull();
    });

    it('update: まだメンバーの担当者は、TODO に戻しても担当のまま', async () => {
      const { caller, task, assignee } = await setupClosedTaskWithAssignee('DONE', true);
      const result = await caller.task.update({ id: task.id, status: 'TODO' });
      expect(result.assigneeId).toBe(assignee.id);
    });

    it('update: 完了のまま編集しても、外れた人の担当は実績として残る', async () => {
      const { caller, task, assignee } = await setupClosedTaskWithAssignee('DONE', false);
      const result = await caller.task.update({ id: task.id, title: '完了後に題名だけ直す' });
      expect(result.assigneeId).toBe(assignee.id);
    });

    it('bulkUpdateStatus: TODO に戻すと、外れた人の担当だけを外す', async () => {
      const gone = await setupClosedTaskWithAssignee('DONE', false);
      const kept = await setupClosedTaskWithAssignee('DONE', true);
      await expect(
        gone.caller.task.bulkUpdateStatus({ ids: [gone.task.id], status: 'TODO' }),
      ).resolves.toEqual({ count: 1 });
      await expect(
        kept.caller.task.bulkUpdateStatus({ ids: [kept.task.id], status: 'TODO' }),
      ).resolves.toEqual({ count: 1 });

      const goneAfter = await prisma.task.findUniqueOrThrow({ where: { id: gone.task.id } });
      const keptAfter = await prisma.task.findUniqueOrThrow({ where: { id: kept.task.id } });
      expect(goneAfter.assigneeId).toBeNull();
      expect(keptAfter.assigneeId).toBe(kept.assignee.id);
    });

    it('update: 戻す処理がロックを待つ間にメンバーが外れたら、担当を外して戻す', async () => {
      const { project, caller, task, assignee } = await setupClosedTaskWithAssignee('DONE', true);
      const result = await callWhileMemberIsRemoved(project.id, assignee.id, () =>
        caller.task.update({ id: task.id, status: 'TODO' }),
      );
      expect(result.ok).toBe(true);
      const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      expect(after.status).toBe('TODO');
      expect(after.assigneeId).toBeNull();
    });

    it('bulkUpdateStatus: 戻す処理がロックを待つ間にメンバーが外れたら、担当を外して戻す', async () => {
      const { project, caller, task, assignee } = await setupClosedTaskWithAssignee('DONE', true);
      const result = await callWhileMemberIsRemoved(project.id, assignee.id, () =>
        caller.task.bulkUpdateStatus({ ids: [task.id], status: 'TODO' }),
      );
      expect(result.ok).toBe(true);
      const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      expect(after.status).toBe('TODO');
      expect(after.assigneeId).toBeNull();
    });

    it('bulkUpdateStatus: ロックを待つ間に付け替えられた担当は、外さずに残す', async () => {
      const { project, caller, task } = await setupClosedTaskWithAssignee('DONE', false);
      const newcomer = await createTestUser({ email: uniqueEmail('task-reopen-newcomer') });
      await prisma.projectMember.create({
        data: { userId: newcomer.id, projectId: project.id, role: 'MEMBER' },
      });

      let release: () => void = () => {};
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      let markLocked: () => void = () => {};
      const locked = new Promise<void>((resolve) => {
        markLocked = resolve;
      });
      // 別の更新がロックを握ったまま、外れた人から現メンバーへ担当を付け替える。
      const reassign = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id" = ${project.id} FOR UPDATE`;
        markLocked();
        await released;
        await tx.task.update({ where: { id: task.id }, data: { assigneeId: newcomer.id } });
      });

      await locked;
      const reopen = caller.task.bulkUpdateStatus({ ids: [task.id], status: 'TODO' });
      // 一括操作がロック待ちに入ってから付け替えを確定させる。
      await waitUntilSomeoneWaitsForLock();
      release();
      await reassign;
      await reopen;

      const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      expect(after.status).toBe('TODO');
      expect(after.assigneeId).toBe(newcomer.id);
    });

    it('bulkUpdateStatus: ロック待ちの間にタスクが小さい id のプロジェクトへ移ったら、CONFLICT で戻す', async () => {
      const { actor, caller } = await setup('OWNER');
      const first = await createTestProject(actor.id);
      const second = await createTestProject(actor.id);
      const [low, high] = [first.id, second.id].sort();
      const task = await createTestTask(high as string, actor.id, { status: 'DONE' });

      let release: () => void = () => {};
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      let markLocked: () => void = () => {};
      const locked = new Promise<void>((resolve) => {
        markLocked = resolve;
      });
      // 別の更新が両方のプロジェクトを握ったまま、タスクを id の小さい側へ移す。
      const mover = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id" IN (${low}, ${high}) ORDER BY "id" FOR UPDATE`;
        markLocked();
        await released;
        await tx.task.update({ where: { id: task.id }, data: { projectId: low as string } });
      });

      await locked;
      const reopen = caller.task.bulkUpdateStatus({ ids: [task.id], status: 'TODO' }).then(
        () => null,
        (error: unknown) => error,
      );
      await waitUntilSomeoneWaitsForLock();
      release();
      await mover;
      const error = await reopen;

      expect(String(error)).toContain('他の操作と重なりました');
      const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      expect(after.status).toBe('DONE');
    });

    it.each([
      'bulkComplete',
      'bulkDelete',
      'bulkUpdateStatus',
    ] as const)('%s: プロジェクトのロックが解放されるまで待つ', async (operation) => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id, { status: 'IN_PROGRESS' });

      let release: () => void = () => {};
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      let markLocked: () => void = () => {};
      const locked = new Promise<void>((resolve) => {
        markLocked = resolve;
      });
      // removeMember などがプロジェクトを握っている状態を作る。
      const holder = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id" = ${project.id} FOR UPDATE`;
        markLocked();
        await released;
      });

      await locked;
      const running =
        operation === 'bulkComplete'
          ? caller.task.bulkComplete({ ids: [task.id] })
          : operation === 'bulkDelete'
            ? caller.task.bulkDelete({ ids: [task.id] })
            : caller.task.bulkUpdateStatus({ ids: [task.id], status: 'DONE' });
      await waitUntilSomeoneWaitsForLock();
      const during = await prisma.task.findUnique({ where: { id: task.id } });
      expect(during?.status).toBe('IN_PROGRESS');

      release();
      await holder;
      await running;
      const after = await prisma.task.findUnique({ where: { id: task.id } });
      expect(after?.status ?? null).toBe(operation === 'bulkDelete' ? null : 'DONE');
    });

    it('bulkComplete: 書き込みの前に対象のタスク行を id の順にロックする', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const first = await createTestTask(project.id, actor.id, { status: 'TODO' });
      const second = await createTestTask(project.id, actor.id, { status: 'DONE' });
      const [lowId, highId] = [first.id, second.id].sort() as [string, string];

      let release: () => void = () => {};
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      let markLocked: () => void = () => {};
      const locked = new Promise<void>((resolve) => {
        markLocked = resolve;
      });
      // 別の処理が id の大きい行を握っている間に、一括操作を走らせる。
      const holder = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "tasks" WHERE "id" = ${highId} FOR UPDATE`;
        markLocked();
        await released;
      });

      await locked;
      const completing = caller.task.bulkComplete({ ids: [lowId, highId] });
      await waitUntilSomeoneWaitsForLock();

      // id の小さい行は、待っている間にもう取られている。
      const probe = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "tasks" WHERE "id" = ${lowId} FOR UPDATE NOWAIT`;
      });
      await expect(probe).rejects.toThrow();

      // 行を握られていても、コメント追加が外部キーの確認で取る KEY SHARE は待たされない。
      // NOWAIT なので、待たされるなら固定時間を待たずに即エラーになる。
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "tasks" WHERE "id" = ${lowId} FOR KEY SHARE NOWAIT`;
      });

      release();
      await holder;
      await completing;
    });

    it('bulkUpdateStatus: 完了へ変える一括操作は担当者に触れない', async () => {
      const { caller, task, assignee } = await setupClosedTaskWithAssignee('CANCELLED', false);
      await caller.task.bulkUpdateStatus({ ids: [task.id], status: 'DONE' });
      const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      expect(after.assigneeId).toBe(assignee.id);
    });
  });

  describe('delete（削除）', () => {
    it('OWNER(canDelete)はタスクを削除できる', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id);
      const result = await caller.task.delete({ id: task.id });
      expect(result.success).toBe(true);
      expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
    });

    it('MEMBERは削除を拒否される(canDelete権限なし)', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id);
      await expect(caller.task.delete({ id: task.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });
  });

  describe('addTime（時間追加）', () => {
    it('canEditがあれば作業時間を加算できる', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id);
      const result = await caller.task.addTime({ id: task.id, minutesToAdd: 30 });
      expect(result.timeSpentMinutes).toBe(30);
    });

    it('小数の分数は拒否する', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id);
      await expect(caller.task.addTime({ id: task.id, minutesToAdd: 0.5 })).rejects.toThrow();
    });
  });

  describe('bulkComplete / bulkDelete / bulkUpdateStatus（一括操作）', () => {
    it.each([
      'bulkComplete',
      'bulkUpdateStatus',
    ] as const)('%s: 完了済みの日時を保持し、再実行でも変更しない', async (operation) => {
      const { actor, project, caller } = await setup('MEMBER');
      const done = await createTestTask(project.id, actor.id, { status: 'DONE' });
      const todo = await createTestTask(project.id, actor.id, { status: 'TODO' });
      const historicalDate = new Date('2026-01-01T00:00:00.000Z');
      await prisma.task.update({ where: { id: done.id }, data: { completedAt: historicalDate } });
      const ids = [done.id, todo.id];
      const complete = () =>
        operation === 'bulkComplete'
          ? caller.task.bulkComplete({ ids })
          : caller.task.bulkUpdateStatus({ ids, status: 'DONE' });

      const before = Date.now();
      expect(await complete()).toEqual({ count: 2 });
      const firstDone = await prisma.task.findUniqueOrThrow({ where: { id: done.id } });
      const firstTodo = await prisma.task.findUniqueOrThrow({ where: { id: todo.id } });
      expect(firstDone.completedAt).toEqual(historicalDate);
      expect(firstTodo.status).toBe('DONE');
      expect(firstTodo.completedAt?.getTime()).toBeGreaterThanOrEqual(before);
      expect(firstTodo.completedAt?.getTime()).toBeLessThanOrEqual(Date.now());

      expect(await complete()).toEqual({ count: 2 });
      const secondDone = await prisma.task.findUniqueOrThrow({ where: { id: done.id } });
      const secondTodo = await prisma.task.findUniqueOrThrow({ where: { id: todo.id } });
      expect(secondDone.completedAt).toEqual(historicalDate);
      expect(secondTodo.completedAt).toEqual(firstTodo.completedAt);
    });

    it('bulkComplete: 対象タスクを完了にする', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const t1 = await createTestTask(project.id, actor.id, { status: 'TODO' });
      const t2 = await createTestTask(project.id, actor.id, { status: 'IN_PROGRESS' });

      const result = await caller.task.bulkComplete({ ids: [t1.id, t2.id] });
      expect(result.count).toBe(2);
      const updated = await prisma.task.findMany({ where: { id: { in: [t1.id, t2.id] } } });
      expect(updated.every((t) => t.status === 'DONE')).toBe(true);
    });

    it('bulkDelete: OWNERは一括削除できる', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const t1 = await createTestTask(project.id, actor.id);
      const t2 = await createTestTask(project.id, actor.id);
      const result = await caller.task.bulkDelete({ ids: [t1.id, t2.id] });
      expect(result.count).toBe(2);
    });

    it('bulkDelete: MEMBERは一括削除を拒否される', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const task = await createTestTask(project.id, actor.id);
      await expect(caller.task.bulkDelete({ ids: [task.id] })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('bulkUpdateStatus: ステータスを一括変更する', async () => {
      const { actor, project, caller } = await setup('MEMBER');
      const t1 = await createTestTask(project.id, actor.id, { status: 'TODO' });
      const t2 = await createTestTask(project.id, actor.id, { status: 'TODO' });
      const result = await caller.task.bulkUpdateStatus({
        ids: [t1.id, t2.id],
        status: 'IN_PROGRESS',
      });
      expect(result.count).toBe(2);
    });

    it('一括操作で他人のプロジェクトのタスクは拒否される', async () => {
      const { caller } = await setup('OWNER');
      const other = await createTestUser({ email: uniqueEmail('task-bulk-other') });
      const otherProject = await createTestProject(other.id);
      const otherTask = await createTestTask(otherProject.id, other.id);
      // タスク自体は存在するため、メンバーでないことによる権限エラーになる
      await expect(caller.task.bulkComplete({ ids: [otherTask.id] })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('一括操作で存在しないタスクIDが含まれると NOT_FOUND', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id);
      await expect(caller.task.bulkComplete({ ids: [task.id, NON_EXISTENT_ID] })).rejects.toThrow(
        'タスクが見つかりません',
      );
    });

    it('一括操作は100件を超える入力を拒否する', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id);
      await expect(caller.task.bulkComplete({ ids: Array(101).fill(task.id) })).rejects.toThrow();
    });

    it('一括操作は重複したタスクIDを拒否する', async () => {
      const { actor, project, caller } = await setup('OWNER');
      const task = await createTestTask(project.id, actor.id);
      await expect(caller.task.bulkComplete({ ids: [task.id, task.id] })).rejects.toThrow(
        'タスクIDを重複して指定できません',
      );
    });
  });

  describe('認証ガード', () => {
    it('未認証ではタスク一覧取得が拒否される', async () => {
      const caller = await createTestCaller();
      await expect(caller.task.getAll()).rejects.toThrow('ログインが必要です');
    });
  });
});
