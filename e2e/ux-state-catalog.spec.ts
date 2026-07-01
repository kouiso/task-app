import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

type ViewportCase = {
  name: string;
  width: number;
  height: number;
};

type RouteCase = {
  path: string;
  label: string;
  requiresAuth: boolean;
};

const OUTPUT_DIR = path.join('doc', 'evidence', 'ux-state-catalog', 'issue-116');

const VIEWPORTS: ViewportCase[] = [
  { name: 'sp-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
];

const ROUTES: RouteCase[] = [
  { path: '/login', label: 'login', requiresAuth: false },
  { path: '/register', label: 'register', requiresAuth: false },
  { path: '/dashboard', label: 'dashboard', requiresAuth: true },
  { path: '/project', label: 'project', requiresAuth: true },
  { path: '/task', label: 'task', requiresAuth: true },
  { path: '/my-task', label: 'my-task', requiresAuth: true },
  { path: '/search', label: 'search', requiresAuth: true },
  { path: '/report', label: 'report', requiresAuth: true },
  { path: '/report/weekly', label: 'report-weekly', requiresAuth: true },
  { path: '/user', label: 'user', requiresAuth: true },
  { path: '/profile', label: 'profile', requiresAuth: true },
  { path: '/profile/edit', label: 'profile-edit', requiresAuth: true },
  { path: '/profile/change-password', label: 'profile-change-password', requiresAuth: true },
  {
    path: '/this-page-does-not-exist-for-ux-catalog',
    label: 'not-found',
    requiresAuth: true,
  },
];

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#email', 'admin@example.com');
  await page.fill('#password', 'password123');
  await page.getByRole('button', { name: /ログイン|login/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

async function capture(page: Page, viewport: ViewportCase, label: string, state: string) {
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${viewport.name}-${label}-${state}.png`),
    fullPage: true,
  });
}

async function expectUsablePage(page: Page) {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toHaveText(/Unhandled Runtime Error|Application error/i);
}

test.describe('UX state catalog', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.name, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('主要ページの通常表示を巡回してスクリーンショットを保存する', async ({ page }) => {
        await login(page);

        for (const route of ROUTES) {
          if (!route.requiresAuth) {
            await page.context().clearCookies();
          } else if (!page.url().includes('/dashboard')) {
            await login(page);
          }

          await page.goto(route.path, { waitUntil: 'domcontentloaded' });
          await page.waitForLoadState('networkidle').catch(() => null);
          await expectUsablePage(page);
          await capture(page, viewport, route.label, 'normal');
        }
      });

      test('empty state と loading state の代表画面を保存する', async ({ page }) => {
        await login(page);

        for (const route of ['/project', '/task', '/my-task', '/search']) {
          await page.route('**/api/trpc/**', async (requestRoute) => {
            await requestRoute.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([{ result: { data: { json: [] } } }]),
            });
          });

          await page.goto(route, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);
          await capture(page, viewport, route.replace('/', ''), 'empty');
          await page.unroute('**/api/trpc/**');
        }

        await page.route('**/api/trpc/**', async () => {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        });
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(250);
        await capture(page, viewport, 'dashboard', 'loading');
      });

      test('network error state と dialog の基本操作を確認する', async ({ page }) => {
        await login(page);
        await page.route('**/api/trpc/**', async (requestRoute) => {
          await requestRoute.abort('failed');
        });
        await page.goto('/task', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
        await expectUsablePage(page);
        await capture(page, viewport, 'task', 'network-error');
        await page.unroute('**/api/trpc/**');

        await page.goto('/task', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => null);
        const trigger = page.getByRole('button', { name: /新規タスク|タスクを作成|新規/i }).first();
        await expect(trigger).toBeVisible();
        await trigger.focus();
        await trigger.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toBeHidden();
        await expect(trigger).toBeFocused();
      });
    });
  }
});
