import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { ProjectMemberRole } from '@prisma/client';

const projectInputSchema = z.object({
  name: z.string().min(1, 'プロジェクト名は必須です').max(100, 'プロジェクト名は100文字以内で入力してください'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, '無効な色コードです').default('#1976d2'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const projectUpdateSchema = projectInputSchema.partial().extend({
  id: z.string().cuid(),
  isArchived: z.boolean().optional(),
});

const addMemberSchema = z.object({
  projectId: z.string().cuid(),
  userId: z.string().cuid(),
  role: z.nativeEnum(ProjectMemberRole).default(ProjectMemberRole.MEMBER),
});

export const projectRouter = createTRPCRouter({
  // プロジェクト一覧取得
  getAll: protectedProcedure
    .input(z.object({
      includeArchived: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const projects = await ctx.prisma.project.findMany({
        where: {
          AND: [
            {
              members: {
                some: { userId: ctx.session.user.id },
              },
            },
            input.includeArchived ? {} : { isArchived: false },
          ],
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          tasks: {
            select: { id: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return projects.map(project => ({
        ...project,
        memberCount: project.members.length,
        taskCount: project.tasks.length,
        completedTaskCount: project.tasks.filter(task => task.status === 'DONE').length,
        userRole: project.members.find(member => member.userId === ctx.session.user.id)?.role,
      }));
    }),

  // 特定プロジェクト取得
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.id,
          members: {
            some: { userId: ctx.session.user.id },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          tasks: {
            include: {
              assignee: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'プロジェクトが見つかりません',
        });
      }

      const userRole = project.members.find(member => member.userId === ctx.session.user.id)?.role;

      return {
        ...project,
        userRole,
      };
    }),

  // プロジェクト作成
  create: protectedProcedure
    .input(projectInputSchema)
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.create({
        data: input,
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      // 作成者をOWNERとして追加
      await ctx.prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: ctx.session.user.id,
          role: ProjectMemberRole.OWNER,
        },
      });

      return project;
    }),

  // プロジェクト更新
  update: protectedProcedure
    .input(projectUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 権限確認（OWNER または ADMIN のみ）
      const membership = await ctx.prisma.projectMember.findFirst({
        where: {
          projectId: id,
          userId: ctx.session.user.id,
          role: { in: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN] },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'プロジェクトを更新する権限がありません',
        });
      }

      const project = await ctx.prisma.project.update({
        where: { id },
        data: updateData,
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      return project;
    }),

  // プロジェクト削除
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // OWNER権限確認
      const membership = await ctx.prisma.projectMember.findFirst({
        where: {
          projectId: input.id,
          userId: ctx.session.user.id,
          role: ProjectMemberRole.OWNER,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'プロジェクトを削除する権限がありません',
        });
      }

      await ctx.prisma.project.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // メンバー追加
  addMember: protectedProcedure
    .input(addMemberSchema)
    .mutation(async ({ ctx, input }) => {
      // 権限確認（OWNER または ADMIN のみ）
      const membership = await ctx.prisma.projectMember.findFirst({
        where: {
          projectId: input.projectId,
          userId: ctx.session.user.id,
          role: { in: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN] },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'メンバーを追加する権限がありません',
        });
      }

      // 既にメンバーかどうか確認
      const existingMember = await ctx.prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: input.userId,
            projectId: input.projectId,
          },
        },
      });

      if (existingMember) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'ユーザーは既にプロジェクトメンバーです',
        });
      }

      const member = await ctx.prisma.projectMember.create({
        data: {
          projectId: input.projectId,
          userId: input.userId,
          role: input.role,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return member;
    }),

  // メンバー削除
  removeMember: protectedProcedure
    .input(z.object({
      projectId: z.string().cuid(),
      userId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 権限確認（OWNER または ADMIN のみ、自分を削除する場合は除く）
      if (input.userId !== ctx.session.user.id) {
        const membership = await ctx.prisma.projectMember.findFirst({
          where: {
            projectId: input.projectId,
            userId: ctx.session.user.id,
            role: { in: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN] },
          },
        });

        if (!membership) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'メンバーを削除する権限がありません',
          });
        }
      }

      // OWNER を削除しようとしていないか確認
      const targetMember = await ctx.prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: input.userId,
            projectId: input.projectId,
          },
        },
      });

      if (targetMember?.role === ProjectMemberRole.OWNER) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'プロジェクトオーナーは削除できません',
        });
      }

      await ctx.prisma.projectMember.delete({
        where: {
          userId_projectId: {
            userId: input.userId,
            projectId: input.projectId,
          },
        },
      });

      return { success: true };
    }),

  // メンバー役割更新
  updateMemberRole: protectedProcedure
    .input(z.object({
      projectId: z.string().cuid(),
      userId: z.string().cuid(),
      role: z.nativeEnum(ProjectMemberRole),
    }))
    .mutation(async ({ ctx, input }) => {
      // OWNER権限確認
      const membership = await ctx.prisma.projectMember.findFirst({
        where: {
          projectId: input.projectId,
          userId: ctx.session.user.id,
          role: ProjectMemberRole.OWNER,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'メンバーの役割を変更する権限がありません',
        });
      }

      const updatedMember = await ctx.prisma.projectMember.update({
        where: {
          userId_projectId: {
            userId: input.userId,
            projectId: input.projectId,
          },
        },
        data: { role: input.role },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return updatedMember;
    }),
});
