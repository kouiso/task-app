import { PrismaClient } from '@prisma/client';

const GLOBAL_PRISMA_KEY = '__prisma_client__';

type GlobalWithPrisma = typeof globalThis & {
  [GLOBAL_PRISMA_KEY]?: PrismaClient;
};

const g: GlobalWithPrisma = globalThis;

export const prisma =
  g[GLOBAL_PRISMA_KEY] ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') g[GLOBAL_PRISMA_KEY] = prisma;
