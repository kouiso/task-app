import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const AUTH_PAGES = [
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
] as const;

const expectNoCriticalAxeViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const criticalViolations = results.violations.filter(
    (violation) => violation.impact === 'critical',
  );

  expect(criticalViolations).toEqual([]);
};

test.describe('Accessibility smoke checks', () => {
  for (const target of AUTH_PAGES) {
    test(`${target.name} has no critical axe violations`, async ({ page }) => {
      await page.goto(target.path);
      await expect(page.getByRole('heading')).toBeVisible();

      await expectNoCriticalAxeViolations(page);
    });
  }

  test('login form supports keyboard-only tab order and submit focus', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('#email')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#password')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeFocused();
  });
});
