import { Prisma } from '@prisma/client';

export const isUserEmailUniqueConstraintError = (error: unknown): boolean => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.['target'];
  const modelName = error.meta?.['modelName'];
  return (
    Array.isArray(target) &&
    target.length === 1 &&
    target[0] === 'email' &&
    (modelName === undefined || modelName === 'User')
  );
};
