import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // tRPC v11 + React QueryのuseQueryフックが深いコンポーネントツリーで
          // スタックオーバーフローするのを防止するため、V8のスタックサイズを増加
          args: ['--js-flags=--stack_size=8192'],
        },
      },
    },
  ],

  webServer: {
    command:
      'PLAYWRIGHT_TEST=1 PORT=3002 node --stack-size=4096 ./node_modules/.bin/next dev --port 3002',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env['CI'],
    timeout: 180000,
  },
});
