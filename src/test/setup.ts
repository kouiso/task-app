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
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] =
      'postgresql://postgres:postgres@localhost:5432/taskapp_test?schema=public';
  }
  if (!process.env['JWT_SECRET']) {
    process.env['JWT_SECRET'] = 'test-secret-key-for-testing-only-32-chars-min';
  }
  if (!process.env['NEXTAUTH_SECRET']) {
    process.env['NEXTAUTH_SECRET'] = 'test-nextauth-secret-key-for-testing-only';
  }
  if (!process.env['NEXTAUTH_URL']) {
    process.env['NEXTAUTH_URL'] = 'http://localhost:3000';
  }

  // Skip database initialization for jsdom environment (component tests)
  // Only initialize for node environment (API tests)
  if (typeof window === 'undefined') {
    // Initialize test database with Prisma schema
    try {
      execSync('npx prisma db push --skip-generate', {
        stdio: 'pipe',
        env: {
          ...process.env,
          DATABASE_URL:
            process.env['DATABASE_URL'] ||
            'postgresql://postgres:postgres@localhost:5432/taskapp_test?schema=public',
        },
        cwd: process.cwd(),
      });
    } catch (error) {
      console.error('Failed to initialize test database:', error);
      if (error instanceof Error && 'stderr' in error) {
        console.error(
          'stderr:',
          (error as Error & { stderr?: { toString: () => string } }).stderr?.toString(),
        );
      }
    }
  }
});

afterEach(async () => {
  // Skip database cleanup for jsdom environment (component tests)
  // Only cleanup for node environment (API tests)
  if (typeof window === 'undefined') {
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
  }
});

afterAll(async () => {
  // Only disconnect for node environment (API tests)
  if (typeof window === 'undefined') {
    await prisma.$disconnect();
  }
});
