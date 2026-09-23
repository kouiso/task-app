import '@testing-library/jest-dom/vitest';
import { execSync } from 'node:child_process';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { prisma } from '../lib/prisma';
import { createDatabaseCleanupGuard } from './database-cleanup-guard';

const DATABASE_STATEMENT_TIMEOUT_MS = 60_000;
const DATABASE_TRANSACTION_TIMEOUT_MS = 70_000;
const DATABASE_HOOK_TIMEOUT_MS = 90_000;
const databaseCleanupGuard = createDatabaseCleanupGuard();

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
      'postgresql://user:password@localhost:25533/taskapp_test?schema=public';
  }
  if (!process.env['JWT_SECRET']) {
    process.env['JWT_SECRET'] = 'test-secret-key-for-testing-only-32-chars-min';
  }

  // Skip database initialization for jsdom environment (component tests)
  // Only initialize for node environment (API tests)
  if (typeof window === 'undefined') {
    try {
      execSync('npx prisma db push --skip-generate', {
        stdio: 'pipe',
        timeout: DATABASE_TRANSACTION_TIMEOUT_MS,
        env: {
          ...process.env,
          DATABASE_URL:
            process.env['DATABASE_URL'] ||
            'postgresql://user:password@localhost:25533/taskapp_test?schema=public',
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
      throw error;
    }
  }
}, DATABASE_HOOK_TIMEOUT_MS);

beforeEach(() => {
  if (typeof window === 'undefined') {
    databaseCleanupGuard.assertReady();
  }
});

afterEach(async () => {
  // Skip database cleanup for jsdom environment (component tests)
  // Only cleanup for node environment (API tests)
  if (typeof window === 'undefined') {
    databaseCleanupGuard.begin();
    try {
      await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT set_config(
            'statement_timeout',
            ${`${DATABASE_STATEMENT_TIMEOUT_MS}ms`},
            true
          )`;
          // テスト環境専用: 固定したテーブルだけを1文で消し、次のfixture開始前に完了させるためです。
          await tx.$executeRawUnsafe(
            'TRUNCATE TABLE "comments", "tasks", "project_members", "projects", "accounts", "sessions", "users" CASCADE',
          );
        },
        {
          maxWait: 10_000,
          timeout: DATABASE_TRANSACTION_TIMEOUT_MS,
        },
      );
    } catch (error) {
      databaseCleanupGuard.fail(error);
      throw error;
    }
    databaseCleanupGuard.succeed();
  } else {
    // jsdom環境（コンポーネントテスト）では、各テスト後にReactツリーをアンマウントする。
    // singleForkで複数テストファイルを同一プロセス実行する際、自動クリーンアップが
    // 後続ファイルで発火せずDOMが蓄積する問題を防ぐための恒久対応。
    const { cleanup } = await import('@testing-library/react');
    cleanup();
  }
}, DATABASE_HOOK_TIMEOUT_MS);

afterAll(async () => {
  if (typeof window === 'undefined') {
    await prisma.$disconnect();
  }
});
