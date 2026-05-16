import type { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { USER_ROLE } from '@/lib/constant/roles';
import { TASK_STATUS } from '@/lib/constant/status';
import { prisma } from '@/lib/prisma';
import { adminProcedure, createTRPCRouter, protectedProcedure } from '../trpc';
import { USER_DETAIL_SELECT } from './_helpers/select';

const userCreateSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  name: z.string().min(1, '名前を入力してください').optional(),
  avatar: z.string().url().optional(),
  role: z.nativeEnum(USER_ROLE).default(USER_ROLE.USER),
});

const userUpdateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, '名前を入力してください').optional(),
  avatar: z.string().url().optional().nullable(),
  role: z.nativeEnum(USER_ROLE).optional(),
  isActive: z.boolean().optional(),
});

const profileUpdateSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  avatar: z.string().url().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: z
    .string()
    .min(8, '新しいパスワードは8文字以上で入力してください')
    .regex(/[A-Z]/, 'パスワードには大文字を含める必要があります')
    .regex(/[a-z]/, 'パスワードには小文字を含める必要があります')
    .regex(/[0-9]/, 'パスワードには数字を含める必要があります')
    .regex(/[^A-Za-z0-9]/, 'パスワードには特殊文字を含める必要があります'),
});

export const userRouter = createTRPCRouter({
  // adminProcedureによりセッションのroleを参照してADMIN判定するためDBクエリ不要
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

  getByEmail: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: USER_DETAIL_SELECT,
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません',
        });
      }

      return user;
    }),

  create: adminProcedure.input(userCreateSchema).mutation(async ({ input }) => {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'このメールアドレスは既に使用されています',
      });
    }

    const createData: Prisma.UserCreateInput = {
      email: input.email,
      role: input.role,
    };
    if (input.name) {
      createData.name = input.name;
    }
    if (input.avatar) {
      createData.avatar = input.avatar;
    }

    return await prisma.user.create({
      data: createData,
      select: {
        ...USER_DETAIL_SELECT,
        createdAt: true,
      },
    });
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
          message: 'roleとisActiveは変更できません',
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
    }

    return await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        ...USER_DETAIL_SELECT,
        updatedAt: true,
      },
    });
  }),

  delete: adminProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ input }) => {
    await prisma.user.update({
      where: { id: input.id },
      data: { isActive: false },
    });
    return { success: true };
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

    return await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        ...USER_DETAIL_SELECT,
        updatedAt: true,
      },
    });
  }),

  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, isActive: true },
      });

      if (!user?.password) {
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

      const isPasswordValid = await bcrypt.compare(input.currentPassword, user.password);

      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: '現在のパスワードが正しくありません',
        });
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return { success: true, message: 'パスワードを変更しました' };
    }),
});
