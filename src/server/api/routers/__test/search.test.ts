import { describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestCaller,
  createTestProject,
  createTestTask,
  createTestUser,
} from '../../../../test/helpers';

// 検索仕様(search.ts)を起点に search / quickSearch / getUserProjects /
// getProjectMembers / getMembersByProject を検証する。検索は常に自分が参加するプロジェクトに限定される。

let seq = 0;
const uniqueEmail = (p: string) => `${p}-${Date.now()}-${seq++}@example.com`;

describe('searchRouter', () => {
  describe('search（詳細検索）', () => {
    it('キーワードでタスクをタイトル部分一致検索できる(大文字小文字無視)', async () => {
      const user = await createTestUser({ email: uniqueEmail('s-kw') });
      const project = await createTestProject(user.id);
      const hit = await createTestTask(project.id, user.id, { title: 'Apple Pie Recipe' });
      await createTestTask(project.id, user.id, { title: 'Banana Bread' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.search.search({ keyword: 'apple' });

      expect(result.tasks.map((t) => t.id)).toEqual([hit.id]);
    });

    it('自分が参加しないプロジェクトのタスクは検索結果に含まれない', async () => {
      const user = await createTestUser({ email: uniqueEmail('s-scope') });
      const other = await createTestUser({ email: uniqueEmail('s-scope-other') });
      const otherProject = await createTestProject(other.id);
      await createTestTask(otherProject.id, other.id, { title: 'Secret Task' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.search.search({ keyword: 'Secret' });

      expect(result.tasks).toHaveLength(0);
    });

    it('status フィルタでタスクを絞り込める', async () => {
      const user = await createTestUser({ email: uniqueEmail('s-status') });
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id, { status: 'TODO' });
      const done = await createTestTask(project.id, user.id, { status: 'DONE' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.search.search({ status: 'DONE' });

      expect(result.tasks.map((t) => t.id)).toEqual([done.id]);
    });

    it('キーワードでプロジェクトも検索できる', async () => {
      const user = await createTestUser({ email: uniqueEmail('s-proj') });
      const project = await createTestProject(user.id, { name: 'Marketing Campaign' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.search.search({ keyword: 'Marketing' });

      expect(result.projects.map((p) => p.id)).toContain(project.id);
    });
  });

  describe('quickSearch（クイック検索）', () => {
    it('キーワードでタスクとプロジェクトを横断検索する', async () => {
      const user = await createTestUser({ email: uniqueEmail('q-kw') });
      const project = await createTestProject(user.id, { name: 'Zephyr' });
      await createTestTask(project.id, user.id, { title: 'Zephyr deploy' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.search.quickSearch({ keyword: 'Zephyr' });

      expect(result.totalCount).toBeGreaterThanOrEqual(2);
    });

    it('空のキーワードは拒否される', async () => {
      const user = await createTestUser({ email: uniqueEmail('q-empty') });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.search.quickSearch({ keyword: '' })).rejects.toThrow(
        'キーワードは必須です',
      );
      await expect(caller.search.quickSearch({ keyword: '   ' })).rejects.toThrow(
        'キーワードは必須です',
      );
    });
  });

  describe('getUserProjects（参加プロジェクト一覧）', () => {
    it('自分が参加するプロジェクトを返す', async () => {
      const user = await createTestUser({ email: uniqueEmail('gup') });
      const mine = await createTestProject(user.id);
      const other = await createTestUser({ email: uniqueEmail('gup-other') });
      await createTestProject(other.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.search.getUserProjects();

      expect(result.map((p) => p.id)).toEqual([mine.id]);
    });
  });

  describe('getProjectMembers（メンバー候補）', () => {
    it('自分の参加プロジェクトのメンバーを重複なく返す', async () => {
      const user = await createTestUser({ email: uniqueEmail('gpm') });
      const project = await createTestProject(user.id);
      const colleague = await createTestUser({ email: uniqueEmail('gpm-colleague') });
      await prisma.projectMember.create({
        data: { projectId: project.id, userId: colleague.id, role: 'MEMBER' },
      });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.search.getProjectMembers();

      const ids = result.map((u) => u.id);
      expect(ids).toContain(user.id);
      expect(ids).toContain(colleague.id);
    });
  });

  describe('getMembersByProject（指定プロジェクトのメンバー）', () => {
    it('メンバーはそのプロジェクトのメンバー一覧を取得できる', async () => {
      const user = await createTestUser({ email: uniqueEmail('gmbp') });
      const project = await createTestProject(user.id);

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.search.getMembersByProject({ projectId: project.id });

      expect(result.map((u) => u.id)).toContain(user.id);
    });

    it('非メンバーは取得を拒否される', async () => {
      const owner = await createTestUser({ email: uniqueEmail('gmbp-owner') });
      const stranger = await createTestUser({ email: uniqueEmail('gmbp-stranger') });
      const project = await createTestProject(owner.id);

      const caller = await createAuthenticatedCaller(stranger.id, stranger.email, stranger.role);
      await expect(caller.search.getMembersByProject({ projectId: project.id })).rejects.toThrow(
        'このプロジェクトのメンバーではありません',
      );
    });
  });

  describe('認証ガード', () => {
    it('未認証では検索が拒否される', async () => {
      const caller = await createTestCaller();
      await expect(caller.search.search({ keyword: 'x' })).rejects.toThrow('ログインが必要です');
    });
  });

  // R22: 「閲覧できるタスク」と「条件に合うタスク」の共通部分が検索結果。
  // ANDの並び順は結果に影響しないが、権限条件を省いたりORへ変えると
  // 他プロジェクトのタスクが漏れる。順序不変性と不合格形の検出を固定する。
  describe('AND条件の順序不変性（R22）', () => {
    it('AND条件の順序を入れ替えても結果のID集合は一致する', async () => {
      const user = await createTestUser({ email: uniqueEmail('r22-order') });
      const project = await createTestProject(user.id);
      const t1 = await createTestTask(project.id, user.id, { title: 'Alpha Task' });
      const t2 = await createTestTask(project.id, user.id, { title: 'Beta Task' });

      const membership = { projectId: { in: [project.id] } };
      const keywordCond = { OR: [{ title: { contains: 'Task' } }] };
      const statusCond = { status: 'TODO' as const };

      const forward = await prisma.task.findMany({
        where: { AND: [membership, keywordCond, statusCond] },
        select: { id: true },
      });
      const reversed = await prisma.task.findMany({
        where: { AND: [statusCond, keywordCond, membership] },
        select: { id: true },
      });

      expect(new Set(forward.map((t) => t.id))).toEqual(new Set(reversed.map((t) => t.id)));
      expect(forward.map((t) => t.id).sort()).toEqual([t1.id, t2.id].sort());
    });

    it('権限条件をORへ変えると他プロジェクトのタスクが漏れる', async () => {
      const user = await createTestUser({ email: uniqueEmail('r22-or') });
      const project = await createTestProject(user.id);
      await createTestTask(project.id, user.id, { title: 'Mine Shared' });
      const other = await createTestUser({ email: uniqueEmail('r22-or-o') });
      const otherProject = await createTestProject(other.id);
      const foreign = await createTestTask(otherProject.id, other.id, {
        title: 'Foreign Shared',
      });

      // 不合格形: 権限条件とキーワード条件をORで結ぶと、
      // どちらか一方だけ満たすタスクまで拾ってしまう
      const leaked = await prisma.task.findMany({
        where: {
          OR: [{ projectId: { in: [project.id] } }, { title: { contains: 'Shared' } }],
        },
        select: { id: true },
      });

      expect(leaked.map((t) => t.id)).toContain(foreign.id);
    });

    it('検索条件とメンバーシップはANDで効く（同名タスクは常に除外）', async () => {
      const user = await createTestUser({ email: uniqueEmail('r22-and') });
      const project = await createTestProject(user.id);
      const mine = await createTestTask(project.id, user.id, {
        title: 'Shared Name',
        status: 'TODO',
      });
      const other = await createTestUser({ email: uniqueEmail('r22-and-o') });
      const otherProject = await createTestProject(other.id);
      await createTestTask(otherProject.id, other.id, {
        title: 'Shared Name',
        status: 'TODO',
      });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.search.search({
        keyword: 'Shared Name',
        status: 'TODO',
      });

      // キーワード一致・status一致・所属の3条件がすべてANDで効き、
      // 他プロジェクトの同名タスクは返らない
      expect(result.tasks.map((t) => t.id)).toEqual([mine.id]);
    });
  });
});
