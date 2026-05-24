import { expect, test } from '@playwright/test';

test.describe('Auth redirect behavior', () => {
  test('redirects unauthenticated dashboard access to login with callback', async ({ page }) => {
    const response = await page.goto('/dashboard');

    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard$/);
    await expect(page.getByText('ログイン', { exact: true }).first()).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });
});
