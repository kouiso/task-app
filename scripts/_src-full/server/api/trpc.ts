import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { USER_ROLE } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await getSession();

  return {
    session,
    ...opts,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'ログインが必要です',
    });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: ctx.session.userId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!currentUser) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'ユーザーが見つかりません',
    });
  }

  if (!currentUser.isActive) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'このアカウントは無効化されています',
    });
  }

  return next({
    ctx: {
      session: {
        ...ctx.session,
        role: currentUser.role,
      },
    },
  });
});

// 単独使用するとctx.sessionがnullのまま通過してしまうため、isAuthenticated経由で使用する
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (ctx.session?.role !== USER_ROLE.ADMIN) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '管理者権限が必要です',
    });
  }

  return next({ ctx });
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
export const adminProcedure = t.procedure.use(isAuthenticated).use(isAdmin);
export const createCallerFactory = t.createCallerFactory;
