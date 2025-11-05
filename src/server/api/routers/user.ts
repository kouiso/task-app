import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc';

const userCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').optional(),
  avatar: z.string().url().optional(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
});

const userRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const userUpdateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).optional(),
  avatar: z.string().url().optional().nullable(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
});

export const userRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          isActive: z.boolean().optional(),
          role: z.enum(['USER', 'ADMIN']).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const where: any = {};

      if (input?.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      if (input?.role) {
        where.role = input.role;
      }

      return await prisma.user.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          isActive: true,
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
                notIn: ['DONE', 'CANCELLED'],
              },
            },
            orderBy: { dueDate: 'asc' },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    }),

  getByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          isActive: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    }),

  create: publicProcedure.input(userCreateSchema).mutation(async ({ input }) => {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new Error('User with this email already exists');
    }

    return await prisma.user.create({
      data: input,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }),

  update: protectedProcedure.input(userUpdateSchema).mutation(async ({ input }) => {
    const { id, ...data } = input;

    return await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input }) => {
      await prisma.user.update({
        where: { id: input.id },
        data: { isActive: false },
      });
      return { success: true };
    }),

  register: publicProcedure.input(userRegisterSchema).mutation(async ({ input }) => {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    return await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
        role: 'USER',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }),
});
