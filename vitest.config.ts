import { resolve } from 'node:path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use 'node' environment by default for API tests, individual tests can override with @vitest-environment jsdom
    environment: 'node',
    environmentMatchGlobs: [
      // Use jsdom for component tests
      ['**/*.{jsx,tsx}', 'jsdom'],
      // Use node for API tests
      ['**/api/**/*.test.{ts,tsx}', 'node'],
    ],
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-secret-key-for-testing-only',
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', '.next/**', '**/*.d.ts', '**/*.config.{js,ts}', 'src/test/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './src'),
    },
  },
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
});
