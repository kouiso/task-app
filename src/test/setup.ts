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
    }
  }
});

afterEach(async () => {
  // Skip database cleanup for jsdom environment (component tests)
  // Only cleanup for node environment (API tests)
  if (typeof window === 'undefined') {
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
      // テスト環境専用: $executeRawUnsafeは直接SQL実行のため本番コードでは使用禁止
      // テーブル名は上記の内部定数から取得するためSQLインジェクションリスクはない
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    }
  } else {
    // jsdom環境（コンポーネントテスト）では、各テスト後にReactツリーをアンマウントする。
    // singleForkで複数テストファイルを同一プロセス実行する際、自動クリーンアップが
    // 後続ファイルで発火せずDOMが蓄積する問題を防ぐための恒久対応。
    const { cleanup } = await import('@testing-library/react');
    cleanup();
  }
});

afterAll(async () => {
  if (typeof window === 'undefined') {
    await prisma.$disconnect();
  }
});
