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
    process.env.DATABASE_URL = 'file:./test.db';
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
        DATABASE_URL: process.env.DATABASE_URL || 'file:./test.db',
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
  // Disable foreign key constraints temporarily for cleanup
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');

  // Use the actual database table names (from @@map), not model names
  // Delete in reverse dependency order to respect foreign keys
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
    await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
  }

  // Re-enable foreign key constraints
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
});

afterAll(async () => {
  await prisma.$disconnect();
});
