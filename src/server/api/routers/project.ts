import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const projectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .default('#1976d2'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ownerId: z.string().cuid(),
});

const projectUpdateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  isArchived: z.boolean().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

const projectMemberSchema = z.object({
  projectId: z.string().cuid(),
  userId: z.string().cuid(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

export const projectRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          userId: z.string().cuid().optional(),
          isArchived: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const where: any = {};

      if (input?.userId) {
        where.members = {
          some: { userId: input.userId },
        };
      }

      if (input?.isArchived !== undefined) {
        where.isArchived = input.isArchived;
      }

      return await prisma.project.findMany({
        where,
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true },
              },
            },
          },
          tasks: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true, role: true },
              },
            },
          },
          tasks: {
            include: {
              assignee: {
                select: { id: true, name: true, email: true, avatar: true },
              },
            },
            orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
          },
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return project;
    }),

  create: protectedProcedure.input(projectCreateSchema).mutation(async ({ input }) => {
    const { ownerId, ...projectData } = input;

    return await prisma.project.create({
      data: {
        ...projectData,
        startDate: projectData.startDate ? new Date(projectData.startDate) : null,
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
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
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });
  }),

  update: protectedProcedure.input(projectUpdateSchema).mutation(async ({ input }) => {
    const { id, ...data } = input;

    const updateData: any = { ...data };
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    }

    return await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input }) => {
      await prisma.project.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),

  addMember: protectedProcedure.input(projectMemberSchema).mutation(async ({ input }) => {
    const existing = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: input.userId,
          projectId: input.projectId,
        },
      },
    });

    if (existing) {
      throw new Error('User is already a member of this project');
    }

    return await prisma.projectMember.create({
      data: input,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }),

  removeMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string().cuid(),
        userId: z.string().cuid(),
      }),
    )
    .mutation(async ({ input }) => {
      const member = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: input.userId,
            projectId: input.projectId,
          },
        },
      });

      if (!member) {
        throw new Error('Member not found');
      }

      if (member.role === 'OWNER') {
        const ownerCount = await prisma.projectMember.count({
          where: {
            projectId: input.projectId,
            role: 'OWNER',
          },
        });

        if (ownerCount === 1) {
          throw new Error('Cannot remove the only owner of the project');
        }
      }

      await prisma.projectMember.delete({
        where: {
          userId_projectId: {
            userId: input.userId,
            projectId: input.projectId,
          },
        },
      });

      return { success: true };
    }),

  updateMemberRole: protectedProcedure
    .input(
      z.object({
        projectId: z.string().cuid(),
        userId: z.string().cuid(),
        role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
      }),
    )
    .mutation(async ({ input }) => {
      return await prisma.projectMember.update({
        where: {
          userId_projectId: {
            userId: input.userId,
            projectId: input.projectId,
          },
        },
        data: {
          role: input.role,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input }) => {
      return await prisma.project.update({
        where: { id: input.id },
        data: { isArchived: true },
      });
    }),

  unarchive: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input }) => {
      return await prisma.project.update({
        where: { id: input.id },
        data: { isArchived: false },
      });
    }),
});
