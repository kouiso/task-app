import type { Prisma } from '@prisma/client';
import { QueryClient } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import bcrypt from 'bcryptjs';
import superjson from 'superjson';
import { DEFAULT_PROJECT_COLOR } from '../lib/constant/project';
import { prisma } from '../lib/prisma';
import type { SessionPayload } from '../lib/session';
import type { AppRouter } from '../server/api/root';
import { appRouter } from '../server/api/root';
import { createCallerFactory, createTRPCContext } from '../server/api/trpc';

export async function createTestUser(
  overrides: {
    email?: string;
    name?: string;
    password?: string;
    role?: 'USER' | 'ADMIN';
    isActive?: boolean;
  } = {},
) {
  const hashedPassword = await bcrypt.hash(overrides.password || 'password123', 10);

  return await prisma.user.create({
    data: {
      email: overrides.email || `test${Date.now()}@example.com`,
      name: overrides.name || 'Test User',
      password: hashedPassword,
      role: overrides.role || 'USER',
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    },
  });
}

export async function createTestProject(
  ownerId: string,
  overrides: {
    name?: string;
    description?: string;
    color?: string;
    isArchived?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {},
) {
  return await prisma.project.create({
    data: {
      name: overrides.name || `Test Project ${Date.now()}`,
      description: overrides.description || 'Test project description',
      color: overrides.color || DEFAULT_PROJECT_COLOR,
      isArchived: overrides.isArchived || false,
      startDate: overrides.startDate || null,
      endDate: overrides.endDate || null,
      members: {
        create: {
          userId: ownerId,
          role: 'OWNER',
        },
      },
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });
}

export async function createTestTask(
  projectId: string,
  createdById: string,
  overrides: {
    title?: string;
    description?: string;
    status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    dueDate?: Date;
    estimatedHours?: number;
    assigneeId?: string;
    position?: number;
  } = {},
) {
  return await prisma.task.create({
    data: {
      title: overrides.title || `Test Task ${Date.now()}`,
      description: overrides.description || 'Test task description',
      status: overrides.status || 'TODO',
      priority: overrides.priority || 'MEDIUM',
      dueDate: overrides.dueDate || null,
      estimatedHours: overrides.estimatedHours || null,
      assigneeId: overrides.assigneeId || null,
      position: overrides.position !== undefined ? overrides.position : 0,
      projectId,
      createdById,
    },
    include: {
      project: true,
      createdBy: true,
      assignee: true,
    },
  });
}

export async function createTestComment(
  taskId: string,
  userId: string,
  overrides: {
    content?: string;
  } = {},
) {
  return await prisma.comment.create({
    data: {
      content: overrides.content || `Test comment ${Date.now()}`,
      taskId,
      userId,
    },
    include: {
      user: true,
    },
  });
}

export function createMockSession(
  userId: string,
  email: string,
  role: SessionPayload['role'],
  sv = 0,
): SessionPayload {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  return {
    userId,
    email,
    role,
    sv,
    exp: expiresAt,
  };
}

export async function createTestCaller(session?: SessionPayload | null, headers?: Headers) {
  const createCaller = createCallerFactory(appRouter);
  const context = await createTRPCContext({
    headers: headers ?? new Headers(),
  });

  return createCaller({
    ...context,
    session: session || null,
  });
}

export async function createAuthenticatedCaller(
  userId: string,
  email: string,
  role: SessionPayload['role'],
  sv = 0,
) {
  const session = createMockSession(userId, email, role, sv);
  return await createTestCaller(session);
}

// 別のトランザクションのロックを待っている接続が現れるまで待つ。現れなければテストを失敗させる。
// 固定時間の待ちでは遅い環境で順序が崩れるので、実際にロック待ちに入ったことを確かめる。
export async function waitUntilSomeoneWaitsForLock(): Promise<void> {
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
// action（メンバー削除など）を実行してロックを離す。呼び出しが「確認 → ロック → 保存」の
// どこで割り込まれても、毎回同じ順序（呼び出しがロックを待つ間に action が確定する）になる。
export async function callWhileProjectLocked<T>(
  projectId: string,
  action: (tx: Prisma.TransactionClient) => Promise<void>,
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

  let actorPid = 0;
  const actor = prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id" = ${projectId} FOR UPDATE`;
      const pid = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      actorPid = pid[0]?.pid ?? 0;
      markLocked();
      await released;
      await action(tx);
    },
    // ポーリングの上限（約 3 秒）より長く保持できるよう、既定の 5 秒に頼らず明示する。
    { timeout: 15_000 },
  );

  await locked;
  const pending = call().then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );

  // 呼び出しが「このロックを持つ actor」に待たされるまで待つ。待たずに離すと、順序が毎回変わってしまう。
  // 他のテストや別接続のロック待ちを数えないよう、actor の PID にブロックされた接続だけを見る。
  let blocked = false;
  for (let i = 0; i < 60; i++) {
    const waiting = await prisma.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM pg_stat_activity
      WHERE wait_event_type = 'Lock' AND ${actorPid}::int = ANY(pg_blocking_pids(pid))`;
    if ((waiting[0]?.n ?? 0) > 0) {
      blocked = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  // 待ちに入らないまま離すと、修正前のコードでも通ってしまう。actor を必ず解放して終わらせてから失敗にする。
  release();
  await actor;
  const result = await pending;
  if (!blocked) {
    throw new Error(
      '呼び出しがプロジェクト行のロック待ちに入らなかったため、競合を再現できませんでした',
    );
  }
  return result;
}

// 呼び出しがプロジェクト行のロックを待つ間に、指定メンバーを削除する。
// 認可確認と書き込みの間にメンバーが外れる競合（TOCTOU）を再現する。
export async function callWhileMemberIsRemoved<T>(
  projectId: string,
  memberId: string,
  call: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  return callWhileProjectLocked(
    projectId,
    async (tx) => {
      await tx.projectMember.delete({
        where: { userId_projectId: { userId: memberId, projectId } },
      });
    },
    call,
  );
}

export function createTRPCTestUtils() {
  const trpcReact = createTRPCReact<AppRouter>();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const trpcClient = trpcReact.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:3000/api/trpc',
        transformer: superjson,
      }),
    ],
  });

  return { trpcReact, queryClient, trpcClient };
}
