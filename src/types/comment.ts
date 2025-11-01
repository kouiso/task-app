import type { Prisma } from '@prisma/client';

export type Comment = Prisma.CommentGetPayload<{
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

export type CommentWithoutRelations = Prisma.CommentGetPayload<Record<string, never>>;

export type CommentCreateInput = {
  content: string;
  taskId: string;
  userId: string;
};

export type CommentUpdateInput = {
  id: string;
  content: string;
};

export type CommentFilterInput = {
  taskId: string;
};
