import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createTRPCRouter, protectedProcedure } from '../trpc';

/**
 * 検索機能のルーター
 * redmine-cloneの検索機能を完全に再現
 * 条件分岐を最小限に抑えたスマートな実装
 */

// 検索入力スキーマ
const searchInputSchema = z.object({
  keyword: z.string().optional(),
  projectId: z.string().cuid().optional(),
  status: z
    .enum(['all', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED', 'BLOCKED'])
    .optional()
    .default('all'),
  priority: z.enum(['all', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('all'),
  assignedTo: z.string().cuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// クイック検索入力スキーマ
const quickSearchInputSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required'),
});

/**
 * 検索フィルターを動的に構築するヘルパー関数
 * 条件分岐を減らすためにオブジェクトマッピングを使用
 */
type FilterConfig = {
  key: string;
  value: unknown;
  transform?: (value: unknown) => unknown;
};

const buildDynamicWhere = (filters: FilterConfig[]): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const f of filters) {
    if (f.value !== undefined && f.value !== null && f.value !== 'all') {
      result[f.key] = f.transform ? f.transform(f.value) : f.value;
    }
  }
  return result;
};

/**
 * 日付範囲フィルターを構築
 */
const buildDateRangeFilter = (dateFrom?: string, dateTo?: string) => {
  const dateFilter: Record<string, Date> = {};
  if (dateFrom) {
    dateFilter['gte'] = new Date(dateFrom);
  }
  if (dateTo) {
    dateFilter['lte'] = new Date(dateTo);
  }
  return Object.keys(dateFilter).length > 0 ? dateFilter : undefined;
};

export const searchRouter = createTRPCRouter({
  /**
   * メイン検索機能
   * - キーワード検索（タイトル・説明）
   * - プロジェクトフィルター
   * - ステータスフィルター
   * - 優先度フィルター
   * - 担当者フィルター
   * - 期限フィルター（日付範囲）
   *
   * 条件分岐を最小限にした宣言的な実装
   */
  search: protectedProcedure.input(searchInputSchema).query(async ({ input, ctx }) => {
    const userId = ctx.session.userId;
    const keyword = input.keyword?.trim();

    // 基本的なフィルター条件を配列で定義（宣言的）
    const baseFilters: FilterConfig[] = [
      { key: 'projectId', value: input.projectId },
      { key: 'status', value: input.status },
      { key: 'priority', value: input.priority },
      { key: 'assigneeId', value: input.assignedTo },
    ];

    // 日付フィルターを構築
    const dueDateFilter = buildDateRangeFilter(input.dateFrom, input.dateTo);

    // タスク検索条件を動的に構築
    const taskWhere: Prisma.TaskWhereInput = {
      // 自分が関わるタスクのみ（作成者または担当者）
      OR: [{ createdById: userId }, { assigneeId: userId }],
      // 動的フィルター適用
      ...buildDynamicWhere(baseFilters),
      // 日付範囲フィルター（存在する場合のみ）
      ...(dueDateFilter && { dueDate: dueDateFilter }),
    };

    // キーワード検索（存在する場合のみ、ANDで追加）
    if (keyword) {
      taskWhere.AND = [
        {
          OR: [
            { title: { contains: keyword, mode: 'insensitive' as const } },
            { description: { contains: keyword, mode: 'insensitive' as const } },
          ],
        },
      ];
    }

    const tasks = await prisma.task.findMany({
      where: taskWhere,
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    // プロジェクト検索（キーワードがある場合のみ早期リターンで処理）
    const projects = !keyword
      ? []
      : await prisma.project.findMany({
          where: {
            members: {
              some: { userId },
            },
            OR: [
              { name: { contains: keyword, mode: 'insensitive' } },
              { description: { contains: keyword, mode: 'insensitive' } },
            ],
          },
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatar: true },
                },
              },
            },
            _count: {
              select: { tasks: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        });

    return {
      tasks,
      projects,
      totalCount: tasks.length + projects.length,
    };
  }),

  /**
   * クイック検索機能（ナビゲーションバーから）
   * - 簡易キーワード検索
   * - 自分が関わるタスク・プロジェクトのみ
   * - 最大20件のタスク、10件のプロジェクトを返す
   *
   * 条件分岐を最小限にした宣言的な実装
   */
  quickSearch: protectedProcedure.input(quickSearchInputSchema).query(async ({ input, ctx }) => {
    const userId = ctx.session.userId;
    const keyword = input.keyword.trim();

    // 共通のキーワード検索条件を定義
    const keywordSearchCondition = (fields: string[]) =>
      fields.map((field) => ({ [field]: { contains: keyword, mode: 'insensitive' as const } }));

    // 共通のinclude設定を定義
    const userSelectFields = { id: true, name: true, email: true, avatar: true };

    // タスク・プロジェクト検索を並行実行（Promise.all）
    const [tasks, projects] = await Promise.all([
      prisma.task.findMany({
        where: {
          OR: [{ createdById: userId }, { assigneeId: userId }],
          AND: {
            OR: keywordSearchCondition(['title', 'description']),
          },
        },
        include: {
          project: true,
          createdBy: { select: userSelectFields },
          assignee: { select: userSelectFields },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      prisma.project.findMany({
        where: {
          members: { some: { userId } },
          OR: keywordSearchCondition(['name', 'description']),
        },
        include: {
          members: {
            include: { user: { select: userSelectFields } },
          },
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      tasks,
      projects,
      totalCount: tasks.length + projects.length,
    };
  }),

  /**
   * ユーザーが関わるプロジェクト一覧を取得
   * （検索フォームのプロジェクトフィルター用）
   */
  getUserProjects: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.userId;

    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return projects;
  }),

  /**
   * プロジェクトメンバー一覧を取得
   * （検索フォームの担当者フィルター用）
   */
  getProjectMembers: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.userId;

    // ユーザーが関わるプロジェクトのメンバーを取得
    // distinct: ['userId'] を使用して、データベースレベルで重複を排除
    const projectMembers = await prisma.projectMember.findMany({
      where: {
        project: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      },
      select: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      distinct: ['userId'],
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    // データベースのdistinctで既に重複除去されているため、そのままユーザー情報を返す
    return projectMembers.map((member) => member.user);
  }),
});
