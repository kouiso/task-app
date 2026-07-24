import { resolve } from 'node:path';
import react from '@vitejs/plugin-react-swc';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// .env / .env.local から環境変数を読み込む
// ポート設定を一元管理する設計: docker-compose の test-db ポートと
// Vitest が接続するポートを同じ変数(_DOCKER_COMPOSE_HOST_PORT_TEST_DB)から導出する
const env = loadEnv('test', process.cwd(), '');

const testDbPort = env['_DOCKER_COMPOSE_HOST_PORT_TEST_DB'] ?? '25533';
const testDatabaseUrl =
  env['TEST_DATABASE_URL'] ??
  `postgresql://user:password@localhost:${testDbPort}/taskapp_test?schema=public`;

export default defineConfig({
  plugins: [react()],
  test: {
    // Use 'node' environment by default for API tests, individual tests can override with @vitest-environment jsdom
    environment: 'node',
    globals: true,
    testTimeout: 15000,
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: env['TEST_JWT_SECRET'] ?? 'test-secret-key-for-testing-only-32-chars-min',
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'coverage/**',
        'doc/**',
        'e2e/**',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.config.{js,ts}',
        'src/test/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './src'),
    },
  },
});
