import { describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../../lib/prisma';
import {
  createAuthenticatedCaller,
  createTestProject,
  createTestUser,
} from '../../../../test/helpers';

// プロジェクト/RBAC 仕様(project.ts / roles.ts / doc/16_rbac.md)を起点に検証する。
//
// プロジェクトメンバー権限マトリクス:
//   OWNER : view o / edit o / delete o / manageMembers o / archive o
//   ADMIN : view o / edit o / delete o / manageMembers o / archive x
//   MEMBER: view o / edit o / delete x / manageMembers x / archive x
//   VIEWER: view o / edit x / delete x / manageMembers x / archive x
// さらに、プロジェクト削除と OWNER ロールの付与/剥奪/削除は「OWNER のみ」に限定される。

type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

// 指定ロールでプロジェクトメンバーを追加するヘルパー
const addMember = (projectId: string, userId: string, role: MemberRole) =>
  prisma.projectMember.create({ data: { projectId, userId, role } });

// 「acting ユーザーを指定ロールのメンバーとして持つプロジェクト」を用意する。
// オーナーは別ユーザー(owner)とし、acting ユーザーを role で参加させる。
async function setupProjectWithActor(role: MemberRole) {
  const owner = await createTestUser({ email: `owner-${Date.now()}-${Math.random()}@example.com` });
  const actor = await createTestUser({ email: `actor-${Date.now()}-${Math.random()}@example.com` });
  const project = await createTestProject(owner.id);
  if (role === 'OWNER') {
    // OWNER として検証したい場合は acting ユーザー自身をオーナーにする
    await prisma.projectMember.deleteMany({ where: { projectId: project.id } });
    await addMember(project.id, actor.id, 'OWNER');
  } else {
    await addMember(project.id, actor.id, role);
  }
  const caller = await createAuthenticatedCaller(actor.id, actor.email, actor.role);
  return { owner, actor, project, caller };
}

describe('projectRouter', () => {
  describe('getAll（一覧）', () => {
    it('自分がメンバーのプロジェクトのみ返す', async () => {
      const user = await createTestUser({ email: 'ga-user@example.com' });
      const other = await createTestUser({ email: 'ga-other@example.com' });
      const mine = await createTestProject(user.id, { name: 'Mine' });
      await createTestProject(other.id, { name: 'Others' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.project.getAll();

      expect(result).toHaveLength(1);
      expect(result.at(0)?.id).toBe(mine.id);
    });

    it('isArchived=false でアーカイブ済みを除外する', async () => {
      const user = await createTestUser({ email: 'ga-arch@example.com' });
      const active = await createTestProject(user.id, { name: 'Active' });
      await createTestProject(user.id, { name: 'Archived', isArchived: true });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const result = await caller.project.getAll({ isArchived: false });

      expect(result).toHaveLength(1);
      expect(result.at(0)?.id).toBe(active.id);
    });

    it('一般ユーザーが他人の userId を指定すると拒否される', async () => {
      const user = await createTestUser({ email: 'ga-normal@example.com', role: 'USER' });
      const target = await createTestUser({ email: 'ga-target@example.com' });

      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.project.getAll({ userId: target.id })).rejects.toThrow(
        '管理者権限が必要です',
      );
    });

    it('ADMINは他人の userId を指定して取得できる', async () => {
      const admin = await createTestUser({ email: 'ga-admin@example.com', role: 'ADMIN' });
      const target = await createTestUser({ email: 'ga-admin-target@example.com' });
      const targetProject = await createTestProject(target.id, { name: 'Target Project' });

      const caller = await createAuthenticatedCaller(admin.id, admin.email, admin.role);
      const result = await caller.project.getAll({ userId: target.id });

      expect(result.map((p) => p.id)).toContain(targetProject.id);
    });
  });

  describe('getById（詳細）', () => {
    it('メンバーは詳細を閲覧できる(VIEWERでも可)', async () => {
      const { project, caller } = await setupProjectWithActor('VIEWER');
      const result = await caller.project.getById({ id: project.id });
      expect(result.id).toBe(project.id);
    });

    it('非メンバーは閲覧を拒否される', async () => {
      const owner = await createTestUser({ email: 'gb-owner@example.com' });
      const stranger = await createTestUser({ email: 'gb-stranger@example.com' });
      const project = await createTestProject(owner.id);

      const caller = await createAuthenticatedCaller(stranger.id, stranger.email, stranger.role);
      await expect(caller.project.getById({ id: project.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('存在しないプロジェクトは NOT_FOUND', async () => {
      const user = await createTestUser({ email: 'gb-nf@example.com' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.project.getById({ id: 'clxxxxxxxxxxxxxxxxxxxxxxxx' })).rejects.toThrow(
        'プロジェクトが見つかりません',
      );
    });
  });

  describe('create（作成）', () => {
    it('作成者はそのプロジェクトの OWNER になる', async () => {
      const user = await createTestUser({ email: 'cr-user@example.com' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);

      const project = await caller.project.create({ name: '新プロジェクト' });

      expect(project.name).toBe('新プロジェクト');
      const member = project.members.find((m) => m.userId === user.id);
      expect(member?.role).toBe('OWNER');
    });

    it('プロジェクト名が空なら拒否する', async () => {
      const user = await createTestUser({ email: 'cr-empty@example.com' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.project.create({ name: '' })).rejects.toThrow('プロジェクト名は必須です');
    });

    it('color 未指定でもデフォルト色で作成できる', async () => {
      const user = await createTestUser({ email: 'cr-color@example.com' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      const project = await caller.project.create({ name: 'デフォルト色' });
      expect(project.color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('update（更新）', () => {
    it.each([true, false])('ADMINは更新経由でもisArchived=%sを設定できない', async (isArchived) => {
      const { project, caller } = await setupProjectWithActor('ADMIN');
      await prisma.project.update({ where: { id: project.id }, data: { isArchived: !isArchived } });

      await expect(caller.project.update({ id: project.id, isArchived })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      const stored = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
      expect(stored.isArchived).toBe(!isArchived);
    });

    it.each([true, false])('OWNERは更新経由でisArchived=%sを設定できる', async (isArchived) => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const result = await caller.project.update({ id: project.id, isArchived });
      expect(result.isArchived).toBe(isArchived);
    });

    it('OWNERは更新できる', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const result = await caller.project.update({ id: project.id, name: '更新後' });
      expect(result.name).toBe('更新後');
    });

    it('ADMINは更新できる', async () => {
      const { project, caller } = await setupProjectWithActor('ADMIN');
      const result = await caller.project.update({ id: project.id, name: 'ADMIN更新' });
      expect(result.name).toBe('ADMIN更新');
    });

    it('MEMBERは更新を拒否される(manageMembers権限が必要)', async () => {
      const { project, caller } = await setupProjectWithActor('MEMBER');
      await expect(caller.project.update({ id: project.id, name: 'X' })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('VIEWERは更新を拒否される', async () => {
      const { project, caller } = await setupProjectWithActor('VIEWER');
      await expect(caller.project.update({ id: project.id, name: 'X' })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('存在しないプロジェクトは NOT_FOUND', async () => {
      const user = await createTestUser({ email: 'up-nf@example.com' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(
        caller.project.update({ id: 'clxxxxxxxxxxxxxxxxxxxxxxxx', name: 'X' }),
      ).rejects.toThrow('プロジェクトが見つかりません');
    });
  });

  describe('delete（削除）', () => {
    it('OWNERは削除できる', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const result = await caller.project.delete({ id: project.id });
      expect(result.success).toBe(true);
      expect(await prisma.project.findUnique({ where: { id: project.id } })).toBeNull();
    });

    it('ADMINは削除を拒否される(削除はOWNER限定)', async () => {
      const { project, caller } = await setupProjectWithActor('ADMIN');
      await expect(caller.project.delete({ id: project.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('MEMBERは削除を拒否される', async () => {
      const { project, caller } = await setupProjectWithActor('MEMBER');
      await expect(caller.project.delete({ id: project.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('存在しないプロジェクトは NOT_FOUND', async () => {
      const user = await createTestUser({ email: 'del-nf@example.com' });
      const caller = await createAuthenticatedCaller(user.id, user.email, user.role);
      await expect(caller.project.delete({ id: 'clxxxxxxxxxxxxxxxxxxxxxxxx' })).rejects.toThrow(
        'プロジェクトが見つかりません',
      );
    });
  });

  describe('addMember（メンバー追加）', () => {
    it('OWNERはメンバーを追加できる', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const newUser = await createTestUser({ email: 'am-new@example.com' });
      const result = await caller.project.addMember({
        projectId: project.id,
        userId: newUser.id,
        role: 'MEMBER',
      });
      expect(result.userId).toBe(newUser.id);
      expect(result.role).toBe('MEMBER');
    });

    it('ADMINはメンバーを追加できる', async () => {
      const { project, caller } = await setupProjectWithActor('ADMIN');
      const newUser = await createTestUser({ email: 'am-admin-new@example.com' });
      const result = await caller.project.addMember({
        projectId: project.id,
        userId: newUser.id,
        role: 'VIEWER',
      });
      expect(result.role).toBe('VIEWER');
    });

    it('OWNERは新規メンバーをOWNERとして追加できる(共同オーナー)', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const newUser = await createTestUser({ email: 'am-coowner@example.com' });
      const result = await caller.project.addMember({
        projectId: project.id,
        userId: newUser.id,
        role: 'OWNER',
      });
      expect(result.role).toBe('OWNER');
    });

    it('ADMINはOWNERロールでの追加を拒否される(権限昇格防止)', async () => {
      const { project, caller } = await setupProjectWithActor('ADMIN');
      const newUser = await createTestUser({ email: 'am-admin-owner@example.com' });
      await expect(
        caller.project.addMember({ projectId: project.id, userId: newUser.id, role: 'OWNER' }),
      ).rejects.toThrow('オーナー権限の付与はオーナーのみ可能です');
    });

    it('MEMBERはメンバー追加を拒否される', async () => {
      const { project, caller } = await setupProjectWithActor('MEMBER');
      const newUser = await createTestUser({ email: 'am-member@example.com' });
      await expect(
        caller.project.addMember({ projectId: project.id, userId: newUser.id, role: 'MEMBER' }),
      ).rejects.toThrow('この操作を実行する権限がありません');
    });

    it('既存メンバーの重複追加は拒否される', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const newUser = await createTestUser({ email: 'am-dup@example.com' });
      await addMember(project.id, newUser.id, 'MEMBER');
      await expect(
        caller.project.addMember({ projectId: project.id, userId: newUser.id, role: 'VIEWER' }),
      ).rejects.toThrow('このユーザーは既にプロジェクトのメンバーです');
    });
  });

  describe('removeMember（メンバー削除）', () => {
    it('OWNERは一般メンバーを削除できる', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const target = await createTestUser({ email: 'rm-target@example.com' });
      await addMember(project.id, target.id, 'MEMBER');

      const result = await caller.project.removeMember({
        projectId: project.id,
        userId: target.id,
      });
      expect(result.success).toBe(true);
    });

    it('ADMINはOWNERメンバーを削除できない', async () => {
      const { owner, project, caller } = await setupProjectWithActor('ADMIN');
      await expect(
        caller.project.removeMember({ projectId: project.id, userId: owner.id }),
      ).rejects.toThrow('オーナーの削除はオーナーのみ可能です');
    });

    it('唯一のOWNERは削除できない', async () => {
      // setupProjectWithActor('OWNER') では actor が唯一の OWNER になる
      const { actor, project, caller } = await setupProjectWithActor('OWNER');
      await expect(
        caller.project.removeMember({ projectId: project.id, userId: actor.id }),
      ).rejects.toThrow('プロジェクト唯一のオーナーは削除できません');
    });

    it('存在しないメンバーの削除は NOT_FOUND', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const ghost = await createTestUser({ email: 'rm-ghost@example.com' });
      await expect(
        caller.project.removeMember({ projectId: project.id, userId: ghost.id }),
      ).rejects.toThrow('メンバーが見つかりません');
    });

    it('MEMBERはメンバー削除を拒否される', async () => {
      const { project, caller } = await setupProjectWithActor('MEMBER');
      const target = await createTestUser({ email: 'rm-by-member@example.com' });
      await addMember(project.id, target.id, 'VIEWER');
      await expect(
        caller.project.removeMember({ projectId: project.id, userId: target.id }),
      ).rejects.toThrow('この操作を実行する権限がありません');
    });
  });

  describe('updateMemberRole（権限変更）', () => {
    it('OWNERは一般メンバーの権限を変更できる', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const target = await createTestUser({ email: 'ur-target@example.com' });
      await addMember(project.id, target.id, 'MEMBER');

      const result = await caller.project.updateMemberRole({
        projectId: project.id,
        userId: target.id,
        role: 'VIEWER',
      });
      expect(result.role).toBe('VIEWER');
    });

    it('OWNERはメンバーをOWNERに昇格できる', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const target = await createTestUser({ email: 'ur-promote@example.com' });
      await addMember(project.id, target.id, 'MEMBER');

      const result = await caller.project.updateMemberRole({
        projectId: project.id,
        userId: target.id,
        role: 'OWNER',
      });
      expect(result.role).toBe('OWNER');
    });

    it('ADMINはメンバーをOWNERに昇格できない', async () => {
      const { project, caller } = await setupProjectWithActor('ADMIN');
      const target = await createTestUser({ email: 'ur-admin-promote@example.com' });
      await addMember(project.id, target.id, 'MEMBER');
      await expect(
        caller.project.updateMemberRole({
          projectId: project.id,
          userId: target.id,
          role: 'OWNER',
        }),
      ).rejects.toThrow('オーナー権限の変更はオーナーのみ可能です');
    });

    it('ADMINはOWNERを降格できない', async () => {
      const { owner, project, caller } = await setupProjectWithActor('ADMIN');
      await expect(
        caller.project.updateMemberRole({
          projectId: project.id,
          userId: owner.id,
          role: 'MEMBER',
        }),
      ).rejects.toThrow('オーナー権限の変更はオーナーのみ可能です');
    });

    it('唯一のOWNERは降格できない', async () => {
      // setupProjectWithActor('OWNER') では actor が唯一の OWNER になる
      const { actor, project, caller } = await setupProjectWithActor('OWNER');
      await expect(
        caller.project.updateMemberRole({
          projectId: project.id,
          userId: actor.id,
          role: 'MEMBER',
        }),
      ).rejects.toThrow('プロジェクト唯一のオーナーの権限は変更できません');
    });

    it('存在しないメンバーの権限変更は NOT_FOUND', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const ghost = await createTestUser({ email: 'ur-ghost@example.com' });
      await expect(
        caller.project.updateMemberRole({
          projectId: project.id,
          userId: ghost.id,
          role: 'VIEWER',
        }),
      ).rejects.toThrow('メンバーが見つかりません');
    });
  });

  describe('archive / unarchive（アーカイブ）', () => {
    it('OWNERはアーカイブできる', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const result = await caller.project.archive({ id: project.id });
      expect(result.isArchived).toBe(true);
    });

    it('OWNERはアーカイブ解除できる', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      await caller.project.archive({ id: project.id });
      const result = await caller.project.unarchive({ id: project.id });
      expect(result.isArchived).toBe(false);
    });

    it('ADMINはアーカイブを拒否される(archive権限なし)', async () => {
      const { project, caller } = await setupProjectWithActor('ADMIN');
      await expect(caller.project.archive({ id: project.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });

    it('VIEWERはアーカイブを拒否される', async () => {
      const { project, caller } = await setupProjectWithActor('VIEWER');
      await expect(caller.project.archive({ id: project.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });
  });

  describe('getAvailableUsers（追加可能ユーザー）', () => {
    it('OWNERはプロジェクト未参加のアクティブユーザーを取得できる', async () => {
      const { project, caller } = await setupProjectWithActor('OWNER');
      const candidate = await createTestUser({ email: 'av-candidate@example.com' });

      const result = await caller.project.getAvailableUsers({ projectId: project.id });
      expect(result.map((u) => u.id)).toContain(candidate.id);
    });

    it('MEMBERは取得を拒否される(manageMembers権限が必要)', async () => {
      const { project, caller } = await setupProjectWithActor('MEMBER');
      await expect(caller.project.getAvailableUsers({ projectId: project.id })).rejects.toThrow(
        'この操作を実行する権限がありません',
      );
    });
  });

  describe('OWNER保護の同時実行（直列化）', () => {
    // FOR UPDATE でプロジェクト行を直列化する設計の実測。2人の OWNER が
    // 同時に互いを削除/降格しても、最終的に OWNER が1人残ることを確認する。
    async function setupTwoOwners() {
      const ownerA = await createTestUser({
        email: `ownA-${Date.now()}-${Math.random()}@example.com`,
      });
      const ownerB = await createTestUser({
        email: `ownB-${Date.now()}-${Math.random()}@example.com`,
      });
      const project = await createTestProject(ownerA.id);
      await addMember(project.id, ownerB.id, 'OWNER');
      const callerA = await createAuthenticatedCaller(ownerA.id, ownerA.email, ownerA.role);
      const callerB = await createAuthenticatedCaller(ownerB.id, ownerB.email, ownerB.role);
      return { ownerA, ownerB, project, callerA, callerB };
    }

    const ownerCount = (projectId: string) =>
      prisma.projectMember.count({ where: { projectId, role: 'OWNER' } });

    it('2人のOWNERが同時に互いを削除しても、成功は1本だけで最終OWNERは1人', async () => {
      const { ownerA, ownerB, project, callerA, callerB } = await setupTwoOwners();

      const results = await Promise.allSettled([
        callerA.project.removeMember({ projectId: project.id, userId: ownerB.id }),
        callerB.project.removeMember({ projectId: project.id, userId: ownerA.id }),
      ]);

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      expect(succeeded).toHaveLength(1);
      expect(await ownerCount(project.id)).toBe(1);
    });

    it('2人のOWNERが同時に互いを降格しても、成功は1本だけで最終OWNERは1人', async () => {
      const { ownerA, ownerB, project, callerA, callerB } = await setupTwoOwners();

      const results = await Promise.allSettled([
        callerA.project.updateMemberRole({
          projectId: project.id,
          userId: ownerB.id,
          role: 'MEMBER',
        }),
        callerB.project.updateMemberRole({
          projectId: project.id,
          userId: ownerA.id,
          role: 'MEMBER',
        }),
      ]);

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      expect(succeeded).toHaveLength(1);
      expect(await ownerCount(project.id)).toBe(1);
    });

    it('一方が削除・他方が降格を同時に仕掛けても、成功は1本だけで最終OWNERは1人', async () => {
      const { ownerA, ownerB, project, callerA, callerB } = await setupTwoOwners();

      // 削除と降格は別経路だが、プロジェクト行の FOR UPDATE で同じ
      // 直列化点を通る。混合でも「両方成功して OWNER=0」にはならない。
      const results = await Promise.allSettled([
        callerA.project.removeMember({ projectId: project.id, userId: ownerB.id }),
        callerB.project.updateMemberRole({
          projectId: project.id,
          userId: ownerA.id,
          role: 'MEMBER',
        }),
      ]);

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      expect(succeeded).toHaveLength(1);
      expect(await ownerCount(project.id)).toBe(1);
    });

    it.each([
      ['remove', 'remove'],
      ['demote', 'demote'],
      ['remove', 'demote'],
      ['demote', 'remove'],
    ] as const)('%sと%sの実際のロック待機後もOWNERを残し、失った権限で更新しない', async (first, second) => {
      const { ownerA, ownerB, project, callerA, callerB } = await setupTwoOwners();
      let release = () => {};
      let ready = () => {};
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      const locked = new Promise<void>((resolve) => {
        ready = resolve;
      });
      const holder = prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM projects WHERE id = ${project.id} FOR UPDATE`;
          ready();
          await released;
        },
        { timeout: 10000 },
      );
      // ロックを取得できない場合も待機を終わらせ、失敗を後段へ伝えるためです。
      const observedHolder = holder.then(
        () => undefined,
        (error: unknown) => {
          ready();
          return error;
        },
      );
      await locked;
      const operations = Promise.allSettled([
        first === 'remove'
          ? callerA.project.removeMember({ projectId: project.id, userId: ownerB.id })
          : callerA.project.updateMemberRole({
              projectId: project.id,
              userId: ownerB.id,
              role: 'MEMBER',
            }),
        second === 'remove'
          ? callerB.project.removeMember({ projectId: project.id, userId: ownerA.id })
          : callerB.project.updateMemberRole({
              projectId: project.id,
              userId: ownerA.id,
              role: 'MEMBER',
            }),
      ]);
      try {
        await vi.waitFor(
          async () => {
            const waiting = await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT count(*) FROM pg_stat_activity
            WHERE datname = current_database()
              AND wait_event_type = 'Lock'
              AND query LIKE '%FOR UPDATE%'
              AND cardinality(pg_blocking_pids(pid)) > 0
          `;
            expect(Number(waiting[0]?.count)).toBe(2);
          },
          { timeout: 3000, interval: 25 },
        );
      } finally {
        release();
        await observedHolder;
        await operations;
      }
      const holderError = await observedHolder;
      if (holderError !== undefined) throw holderError;
      const results = await operations;
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(await ownerCount(project.id)).toBe(1);
      const rejection = results.find((result) => result.status === 'rejected');
      expect(rejection?.status === 'rejected' && rejection.reason.message).toBe(
        'この操作を実行する権限がありません',
      );
    });
  });

  describe('認証ガード', () => {
    it('未認証では一覧取得が拒否される', async () => {
      const { createTestCaller } = await import('../../../../test/helpers');
      const caller = await createTestCaller();
      await expect(caller.project.getAll()).rejects.toThrow('ログインが必要です');
    });
  });
});
