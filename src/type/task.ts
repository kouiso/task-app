import type { Prisma } from '@prisma/client';

export type Task = Prisma.TaskGetPayload<{
  include: {
    project: true;
    createdBy: {
      select: {
        id: true;
        name: true;
        email: true;
        avatar: true;
      };
    };
    assignee: {
      select: {
        id: true;
        name: true;
        email: true;
        avatar: true;
      };
    };
    comments: {
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
  };
}>;

export type TaskWithoutRelations = Prisma.TaskGetPayload<Record<string, never>>;

export type TaskCreateInput = {
  title: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED' | 'BLOCKED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  estimatedHours?: number;
  projectId: string;
  createdById: string;
  assigneeId?: string;
};

export type TaskUpdateInput = {
  id: string;
  title?: string;
  description?: string | null;
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED' | 'BLOCKED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string | null;
  completedAt?: string | null;
  estimatedHours?: number | null;
  actualHours?: number;
  assigneeId?: string | null;
};

export type TaskFilterInput = {
  projectId?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED' | 'BLOCKED';
  assigneeId?: string;
};

export type TaskTimerAction = {
  id: string;
  action: 'start' | 'stop';
};

export type TaskTimeUpdateInput = {
  id: string;
  minutesToAdd: number;
};

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED' | 'BLOCKED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const TASK_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'CANCELLED',
  'BLOCKED',
] as const;

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
