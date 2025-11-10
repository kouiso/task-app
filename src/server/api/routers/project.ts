import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
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
      const where: Prisma.ProjectWhereInput = {};

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
    .query(async ({ ctx, input }) => {
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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Check if user is a member of the project
      const isMember = project.members.some((member) => member.userId === ctx.session.userId);
      if (!isMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      return project;
    }),

  create: protectedProcedure.input(projectCreateSchema).mutation(async ({ input }) => {
    const { ownerId, ...projectData } = input;

    const createData: Prisma.ProjectCreateInput = {
      name: projectData.name,
      color: projectData.color,
      startDate: projectData.startDate ? new Date(projectData.startDate) : null,
      endDate: projectData.endDate ? new Date(projectData.endDate) : null,
      members: {
        create: {
          userId: ownerId,
          role: 'OWNER',
        },
      },
    };
    if (projectData.description) {
      createData.description = projectData.description;
    }

    return await prisma.project.create({
      data: createData,
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

  update: protectedProcedure.input(projectUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    // Check if project exists and user has admin access
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId: ctx.session.userId },
        },
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    const userMember = project.members[0];
    if (!userMember || (userMember.role !== 'OWNER' && userMember.role !== 'ADMIN')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only project owners and admins can update the project',
      });
    }

    const updateData: Prisma.ProjectUpdateInput = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.color !== undefined) {
      updateData.color = data.color;
    }
    if (data.isArchived !== undefined) {
      updateData.isArchived = data.isArchived;
    }
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
    .mutation(async ({ ctx, input }) => {
      // Check if project exists and user is the owner
      const project = await prisma.project.findUnique({
        where: { id: input.id },
        include: {
          members: {
            where: { userId: ctx.session.userId },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const userMember = project.members[0];
      if (!userMember || userMember.role !== 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only project owners can delete the project',
        });
      }

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
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User is already a member of this project',
      });
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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      if (member.role === 'OWNER') {
        const ownerCount = await prisma.projectMember.count({
          where: {
            projectId: input.projectId,
            role: 'OWNER',
          },
        });

        if (ownerCount === 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot remove the only owner of the project',
          });
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
