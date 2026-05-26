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
): SessionPayload {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  return {
    userId,
    email,
    role,
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
) {
  const session = createMockSession(userId, email, role);
  return await createTestCaller(session);
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
