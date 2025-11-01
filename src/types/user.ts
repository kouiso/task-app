import type { Prisma } from '@prisma/client';

export type User = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    name: true;
    avatar: true;
    role: true;
    isActive: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

export type UserWithProjects = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    name: true;
    avatar: true;
    role: true;
    isActive: true;
    createdAt: true;
    updatedAt: true;
    projects: {
      include: {
        project: {
          select: {
            id: true;
            name: true;
            color: true;
          };
        };
      };
    };
    assignedTasks: {
      select: {
        id: true;
        title: true;
        status: true;
        priority: true;
        dueDate: true;
      };
    };
  };
}>;

export type UserWithoutRelations = Prisma.UserGetPayload<Record<string, never>>;

export type UserSelectInfo = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
};

export type UserCreateInput = {
  email: string;
  name?: string;
  avatar?: string;
  role?: 'USER' | 'ADMIN';
};

export type UserUpdateInput = {
  id: string;
  name?: string;
  avatar?: string | null;
  role?: 'USER' | 'ADMIN';
  isActive?: boolean;
};

export type UserFilterInput = {
  isActive?: boolean;
  role?: 'USER' | 'ADMIN';
};

export type UserRole = 'USER' | 'ADMIN';

export const USER_ROLES = ['USER', 'ADMIN'] as const;
