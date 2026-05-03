import type { Prisma } from '@prisma/client';

export type Project = Prisma.ProjectGetPayload<{
  include: {
    members: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
            avatar: true;
          };
        };
      };
    };
    tasks: {
      select: {
        id: true;
        status: true;
      };
    };
  };
}>;

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  include: {
    members: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
            avatar: true;
            role: true;
          };
        };
      };
    };
    tasks: {
      include: {
        assignee: {
          select: {
            id: true;
            name: true;
            email: true;
            avatar: true;
          };
        };
      };
    };
  };
}>;

export type ProjectWithoutRelations = Prisma.ProjectGetPayload<Record<string, never>>;

export type ProjectMember = Prisma.ProjectMemberGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        avatar: true;
      };
    };
  };
}>;

export type ProjectCreateInput = {
  name: string;
  description?: string;
  color?: string;
  startDate?: string;
  endDate?: string;
  ownerId: string;
};

export type ProjectUpdateInput = {
  id: string;
  name?: string;
  description?: string | null;
  color?: string;
  isArchived?: boolean;
  startDate?: string | null;
  endDate?: string | null;
};

export type ProjectFilterInput = {
  userId?: string;
  isArchived?: boolean;
};

export type ProjectMemberInput = {
  projectId: string;
  userId: string;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
};

export type ProjectMemberRoleUpdateInput = {
  projectId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
};

export type ProjectMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export const PROJECT_MEMBER_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
