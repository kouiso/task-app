import '@testing-library/jest-dom/vitest';
import { execSync } from 'node:child_process';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { prisma } from '../lib/prisma';

// Mock Next.js cookies API
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/taskapp_test?schema=public';
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
  }

  // Initialize test database with Prisma schema
  try {
    execSync('npx prisma db push --skip-generate', {
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/taskapp_test?schema=public',
      },
      cwd: process.cwd(),
    });
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    if (error instanceof Error && 'stderr' in error) {
      console.error('stderr:', (error as any).stderr?.toString());
    }
  }
});

afterEach(async () => {
  // Use the actual database table names (from @@map), not model names
  // Delete in reverse dependency order to respect foreign keys
  // PostgreSQL handles cascade deletes automatically with onDelete: Cascade
  const tables = [
    'comments',
    'tasks',
    'project_members',
    'projects',
    'accounts',
    'sessions',
    'users',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
