import { prisma } from '@/lib/prisma';
import { type SessionUser, createSession, deleteSession } from '@/lib/session';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

const registerSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

export const authRouter = createTRPCRouter({
  login: publicProcedure.input(loginSchema).mutation(async ({ input }) => {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.password) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'メールアドレスまたはパスワードが正しくありません',
      });
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'メールアドレスまたはパスワードが正しくありません',
      });
    }

    if (!user.isActive) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'このアカウントは無効化されています',
      });
    }

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
  }),

  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
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
        role: 'USER',
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
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
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
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
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

    return user;
  }),
});
