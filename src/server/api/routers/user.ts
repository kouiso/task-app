import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { USER_ROLE } from '@/lib/constant/roles';
import { TASK_STATUS } from '@/lib/constant/status';
import { writeStructuredLog } from '@/lib/observability';
import { createPasswordSchema } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { createSession, type SessionUser } from '@/lib/session';
import { adminProcedure, createTRPCRouter, protectedProcedure } from '../trpc';
import { USER_DETAIL_SELECT } from './_helpers/select';
import { isUserEmailUniqueConstraintError } from './_helpers/user-email-conflict';

const userUpdateSchema = z
  .object({
    id: z.string().cuid(),
    name: z.string().min(1, '名前を入力してください').optional(),
    avatar: z.string().url().optional().nullable(),
    role: z.nativeEnum(USER_ROLE).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    ({ name, avatar, role, isActive }) =>
      name !== undefined || avatar !== undefined || role !== undefined || isActive !== undefined,
    '更新する項目を1つ以上指定してください',
  );

const profileUpdateSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  avatar: z.string().url().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: createPasswordSchema('新しいパスワードは8文字以上で入力してください'),
});

const POSTGRES_INTEGER_MAX = 2_147_483_647;

async function tryReissueSession(
  requestId: string,
  path: string,
  user: SessionUser,
): Promise<boolean> {
  try {
    await createSession(user);
    return true;
  } catch {
    writeStructuredLog({
      level: 'error',
      event: 'auth.session_reissue_failed',
      requestId,
      path,
      status: 200,
      userId: user.id,
    });
    return false;
  }
}

export const userRouter = createTRPCRouter({
  // 共通処理がDBの最新ロールで管理者判定を済ませるため、ここでは再確認しません
  getAll: adminProcedure
    .input(
      z
        .object({
          isActive: z.boolean().optional(),
          role: z.nativeEnum(USER_ROLE).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const where: Prisma.UserWhereInput = {};

      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      if (input?.role) {
        where.role = input.role;
      }

      return await prisma.user.findMany({
        where,
        select: {
          ...USER_DETAIL_SELECT,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      // 本人またはADMINのみ他ユーザーの詳細情報にアクセス可能
      if (ctx.session.userId !== input.id && ctx.session.role !== USER_ROLE.ADMIN) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'この操作を行う権限がありません',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: input.id },
        select: {
          ...USER_DETAIL_SELECT,
          createdAt: true,
          updatedAt: true,
          projects: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
          assignedTasks: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true,
            },
            where: {
              status: {
                notIn: [TASK_STATUS.DONE, TASK_STATUS.CANCELLED],
              },
              project: {
                members: {
                  some: { userId: ctx.session.userId },
                },
              },
            },
            orderBy: { dueDate: 'asc' },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません',
        });
      }

      return user;
    }),

  update: protectedProcedure.input(userUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    if (id !== ctx.session.userId) {
      // 他ユーザーを更新する場合はセッションのroleでADMIN判定
      if (ctx.session.role !== USER_ROLE.ADMIN) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '管理者権限が必要です',
        });
      }
    } else {
      // 自分のプロフィール更新の場合、roleとisActiveは変更不可
      if (data.role !== undefined || data.isActive !== undefined) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'ロールとアクティブ状態は変更できません',
        });
      }
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar;
    }
    if (data.role !== undefined) {
      updateData.role = data.role;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
      updateData.sessionVersion = { increment: 1 };
    }

    try {
      return await prisma.user.update({
        where: {
          id,
          ...(data.isActive !== undefined ? { sessionVersion: { lt: POSTGRES_INTEGER_MAX } } : {}),
        },
        data: updateData,
        select: {
          ...USER_DETAIL_SELECT,
          updatedAt: true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        if (data.isActive !== undefined) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'セッションを更新できません。管理者にお問い合わせください',
          });
        }
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません',
        });
      }
      throw err;
    }
  }),

  updateProfile: protectedProcedure.input(profileUpdateSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.userId;

    if (input.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: input.email,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'このメールアドレスは既に使用されています',
        });
      }
    }

    const updateData: Prisma.UserUpdateInput = {
      name: input.name,
      email: input.email,
    };
    if (input.avatar !== undefined) {
      updateData.avatar = input.avatar;
    }

    const updatedUser = await prisma.user
      .update({
        where: {
          id: userId,
          sessionVersion: ctx.session.version,
          isActive: true,
        },
        data: updateData,
        select: {
          ...USER_DETAIL_SELECT,
          updatedAt: true,
        },
      })
      .catch((err: unknown) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'セッションが無効になりました。再度ログインしてください',
          });
        }
        if (isUserEmailUniqueConstraintError(err)) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'このメールアドレスは既に使用されています',
          });
        }
        throw err;
      });

    const sessionReissued =
      input.email === ctx.session.email ||
      (await tryReissueSession(ctx.requestId, 'user.updateProfile', {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        version: ctx.session.version,
      }));

    return { ...updatedUser, success: true, sessionReissued };
  }),

  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, isActive: true, sessionVersion: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'セッションが無効になりました。再度ログインしてください',
        });
      }

      if (!user.isActive) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'このアカウントは無効化されています',
        });
      }

      if (user.sessionVersion !== ctx.session.version) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'セッションが無効になりました。再度ログインしてください',
        });
      }

      if (!user.password) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'パスワードが設定されていません',
        });
      }

      const isPasswordValid = await bcrypt.compare(input.currentPassword, user.password);

      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: '現在のパスワードが正しくありません',
        });
      }

      if (ctx.session.version === POSTGRES_INTEGER_MAX) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'セッションを更新できません。管理者にお問い合わせください',
        });
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      const updated = await prisma.user.updateMany({
        where: {
          id: userId,
          sessionVersion: ctx.session.version,
          password: user.password,
          isActive: true,
        },
        data: {
          password: hashedPassword,
          sessionVersion: { increment: 1 },
        },
      });

      if (updated.count !== 1) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'セッションが無効になりました。再度ログインしてください',
        });
      }

      const sessionReissued = await tryReissueSession(ctx.requestId, 'user.changePassword', {
        id: userId,
        email: ctx.session.email,
        role: ctx.session.role,
        version: ctx.session.version + 1,
      });

      return {
        success: true,
        sessionReissued,
        message: 'パスワードを変更しました',
      };
    }),
});
