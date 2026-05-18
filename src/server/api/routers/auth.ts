import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { USER_ROLE } from '@/lib/constant/roles';
import { prisma } from '@/lib/prisma';
import {
  checkLoginRateLimit,
  extractClientIp,
  rateLimitToTRPCError,
  recordLoginAttempt,
} from '@/lib/rate-limit';
import { createSession, deleteSession, type SessionUser } from '@/lib/session';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc';
import { USER_DETAIL_SELECT } from './_helpers/select';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

const registerSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(/[A-Z]/, 'パスワードには大文字を含める必要があります')
    .regex(/[a-z]/, 'パスワードには小文字を含める必要があります')
    .regex(/[0-9]/, 'パスワードには数字を含める必要があります')
    .regex(/[^A-Za-z0-9]/, 'パスワードには特殊文字を含める必要があります'),
});

function handleUnexpectedError(context: string, error: unknown): never {
  console.error('[auth] unexpected error', { context, error });
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `${context}中にエラーが発生しました。しばらくしてから再度お試しください。`,
    cause: error,
  });
}

export const authRouter = createTRPCRouter({
  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    const ip = extractClientIp(ctx.headers);

    // brute force 対策: 直近 15 分の失敗回数で email×IP / IP 単独の両軸を rate-limit
    const limitResult = await checkLoginRateLimit(input.email, ip);
    if (!limitResult.allowed) {
      throw rateLimitToTRPCError(limitResult);
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user?.password) {
        await recordLoginAttempt(input.email, ip, false);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'メールアドレスまたはパスワードが正しくありません',
        });
      }

      if (!user.isActive) {
        // 無効アカウントは rate-limit カウントに含めない（誤入力ではない）
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'このアカウントは無効化されています',
        });
      }

      const isPasswordValid = await bcrypt.compare(input.password, user.password);

      if (!isPasswordValid) {
        await recordLoginAttempt(input.email, ip, false);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'メールアドレスまたはパスワードが正しくありません',
        });
      }

      const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      await createSession(sessionUser);
      await recordLoginAttempt(input.email, ip, true);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      handleUnexpectedError('ログイン処理', error);
    }
  }),

  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
    try {
      const existing = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'このメールアドレスは既に登録されています',
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const user = await prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: hashedPassword,
          role: USER_ROLE.USER,
          isActive: true,
        },
      });

      const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      await createSession(sessionUser);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      handleUnexpectedError('ユーザー登録処理', error);
    }
  }),

  logout: publicProcedure.mutation(async () => {
    await deleteSession();
    return { success: true };
  }),

  getSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.session.userId },
      select: USER_DETAIL_SELECT,
    });

    if (!user?.isActive) {
      return null;
    }

    return {
      user,
    };
  }),

  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.userId },
      select: {
        ...USER_DETAIL_SELECT,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'ユーザーが見つかりません',
      });
    }

    if (!user.isActive) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'このアカウントは無効化されています',
      });
    }

    return user;
  }),
});
