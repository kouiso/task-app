// その日の読者の手元と同じデータを DB へ入れる。中身は stdin から JSON で受け取る。
//
// `scripts/_seed/seed.ts` をそのまま呼ばないのは、あれが「配布物としての1つの状態」
// しか作れないからである。読者の手元は日で変わる（Day 06 で読者が自分のアカウントを
// 1件足す）し、Day 09 以降はさらに増える。どの日に何件あるかは
// `doc/review-handoff/scan-day*.md` の (f) に実測がある。その表を Python 側の
// DAY_SEEDS が持ち、ここは受け取ったものを入れるだけにしてある。
//
// パスワードのハッシュだけはアプリと同じ bcrypt でなければログインできないので、
// Python から SQL を直接叩かずにこの薄い層を挟んでいる。

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

type SeedUser = {
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  password: string;
};

type SeedMember = {
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
};

type SeedProject = {
  key: string;
  name: string;
  description: string;
  color: string;
  startDate: string | null;
  endDate: string | null;
  isArchived: boolean;
  members: SeedMember[];
};

// 期限・見積・合計作業時間は Day 13 以降のカードと詳細ダイアログに出る。
// 欠けたまま撮ると、読者の画面には出ている行が画像から消える。
type SeedTask = {
  key: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  completedAt: string | null;
  estimatedHours: number | null;
  actualHours: number;
  timeSpentMinutes: number;
  position: number;
  projectKey: string;
  createdByEmail: string;
  assigneeEmail: string | null;
};

type SeedComment = {
  content: string;
  taskKey: string;
  userEmail: string;
};

type SeedPayload = {
  day: number;
  users: SeedUser[];
  projects: SeedProject[];
  tasks: SeedTask[];
  comments: SeedComment[];
};

const prisma = new PrismaClient();

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * 前の日の残りを消す。
 *
 * LoginAttempt も必ず消す。Day 05 でログイン失敗を試すと記録が積まれ、同一メール
 * 5回で 15 分ロックされる（`src/lib/rate-limit.ts`）。撮影の途中でロックに当たると、
 * 撮れた画像がその日の正しい画面でなくなる。
 */
async function clearAll(): Promise<void> {
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function apply(payload: SeedPayload): Promise<void> {
  const userIds = new Map<string, string>();
  for (const u of payload.users) {
    const created = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: true,
        password: await bcrypt.hash(u.password, 10),
      },
    });
    userIds.set(u.email, created.id);
  }

  const projectIds = new Map<string, string>();
  for (const p of payload.projects) {
    const created = await prisma.project.create({
      data: {
        name: p.name,
        description: p.description,
        color: p.color,
        startDate: toDate(p.startDate),
        endDate: toDate(p.endDate),
        isArchived: p.isArchived,
        members: {
          create: p.members.map((m) => ({
            userId: requireId(userIds, m.email, `project ${p.key} のメンバー`),
            role: m.role,
          })),
        },
      },
    });
    projectIds.set(p.key, created.id);
  }

  const taskIds = new Map<string, string>();
  // 作成順が createdAt の順になる。一覧の並びが回ごとに変わると画像が安定しないので順次実行する。
  for (const t of payload.tasks) {
    const created = await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: toDate(t.dueDate),
        completedAt: toDate(t.completedAt),
        estimatedHours: t.estimatedHours,
        actualHours: t.actualHours,
        timeSpentMinutes: t.timeSpentMinutes,
        position: t.position,
        projectId: requireId(projectIds, t.projectKey, `task ${t.key} の project`),
        createdById: requireId(userIds, t.createdByEmail, `task ${t.key} の作成者`),
        assigneeId:
          t.assigneeEmail === null
            ? null
            : requireId(userIds, t.assigneeEmail, `task ${t.key} の担当者`),
      },
    });
    taskIds.set(t.key, created.id);
  }

  for (const c of payload.comments) {
    await prisma.comment.create({
      data: {
        content: c.content,
        taskId: requireId(taskIds, c.taskKey, 'comment の task'),
        userId: requireId(userIds, c.userEmail, 'comment の投稿者'),
      },
    });
  }
}

/** 日付は JSON を跨げないので文字列で受け取る。 */
function toDate(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}

/** 参照先が無いまま進むと、原因の分からない空の画面が撮れる。ここで止める。 */
function requireId(table: Map<string, string>, key: string, where: string): string {
  const id = table.get(key);
  if (id === undefined) {
    throw new Error(`${where} が見つかりません: ${key}`);
  }
  return id;
}

async function main(): Promise<void> {
  const payload: SeedPayload = JSON.parse(await readStdin());
  await clearAll();
  await apply(payload);
  const counts = {
    day: payload.day,
    users: await prisma.user.count(),
    projects: await prisma.project.count(),
    tasks: await prisma.task.count(),
    comments: await prisma.comment.count(),
  };
  process.stdout.write(JSON.stringify(counts));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    await prisma.$disconnect();
    process.stderr.write(`${e}\n`);
    process.exitCode = 1;
  });
