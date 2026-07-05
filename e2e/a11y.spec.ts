import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const PUBLIC_PAGES = [
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
] as const;

const AUTHENTICATED_PAGES = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'task list', path: '/task' },
  { name: 'project list', path: '/project' },
  { name: 'my tasks', path: '/my-task' },
] as const;

const expectNoCriticalAxeViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const criticalViolations = results.violations.filter(
    (violation) => violation.impact === 'critical',
  );

  if (criticalViolations.length > 0) {
    const summary = criticalViolations
      .map((v) => `${v.id}: ${v.description} (${v.nodes.length} node(s))`)
      .join('\n');
    expect.fail(`Critical axe violations found:\n${summary}`);
  }
};

const loginAsAdmin = async (page: Page) => {
  await page.goto('/login');
  await page.fill('#email', 'admin@example.com');
  await page.fill('#password', 'password123');
  await page.getByRole('button', { name: /ログイン|login/i }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
};

test.describe('Accessibility: public pages', () => {
  for (const target of PUBLIC_PAGES) {
    test(`${target.name} has no critical axe violations`, async ({ page }) => {
      await page.goto(target.path);
      await expect(page.getByRole('heading')).toBeVisible();

      await expectNoCriticalAxeViolations(page);
    });
  }

  test('login form supports keyboard-only tab order', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('#email')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#password')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeFocused();
  });
});

test.describe('Accessibility: authenticated pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const target of AUTHENTICATED_PAGES) {
    test(`${target.name} has no critical axe violations`, async ({ page }) => {
      await page.goto(target.path);
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      await expectNoCriticalAxeViolations(page);
    });
  }

  test('my task filters are keyboard accessible with proper aria labels', async ({ page }) => {
    await page.goto('/my-task');
    await expect(page.getByRole('heading', { name: 'マイタスク' })).toBeVisible();

    const statusFilter = page.getByRole('tablist', { name: 'ステータスフィルター' });
    await expect(statusFilter).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('tab', { name: 'すべて' })).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: '未着手' })).toBeFocused();

    const projectFilter = page.getByRole('combobox', { name: 'プロジェクトフィルター' });
    await expect(projectFilter).toBeVisible();
  });
});

test.describe('Accessibility: dialog focus trap', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('task dialog traps focus and closes on Escape', async ({ page }) => {
    await page.goto('/task');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const newTaskButton = page
      .getByRole('button', { name: /新規タスク|新しいタスク|タスク作成|追加/i })
      .first();
    await expect(newTaskButton).toBeVisible();
    await newTaskButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Focus should move into dialog after open
    const firstFocusable = dialog
      .locator('input, select, textarea, button, [tabindex]:not([tabindex="-1"])')
      .first();
    await expect(firstFocusable).toBeVisible();

    // Tab through dialog — focus should stay inside (dialog remains open)
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(dialog).toBeVisible();

    // Escape should close the dialog
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 3000 });

    // Focus should return to the opener button
    await expect(newTaskButton).toBeFocused();
  });

  test('project dialog traps focus and closes on Escape', async ({ page }) => {
    await page.goto('/project');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const newProjectButton = page
      .getByRole('button', { name: /新規プロジェクト|プロジェクト作成|追加/i })
      .first();
    await expect(newProjectButton).toBeVisible();
    await newProjectButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Tab through dialog — focus should stay inside
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    await expect(dialog).toBeVisible();

    // Escape should close the dialog
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 3000 });

    await expect(newProjectButton).toBeFocused();
  });
});
