import { expect, test } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.getByText('ログイン', { exact: true }).first()).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'password123');

    await page.getByRole('button', { name: /ログイン|login/i }).click();

    await page.waitForURL('/dashboard', { timeout: 10000 });

    await expect(page.getByText('全体の進捗')).toBeVisible();
    await expect(page.getByRole('link', { name: 'ダッシュボード' }).first()).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');

    await page.getByRole('button', { name: /ログイン|login/i }).click();

    await page.waitForTimeout(2000);

    const errorVisible = await page
      .locator('text=/エラー|error|ログインに失敗/i')
      .isVisible()
      .catch(() => false);
    expect(errorVisible || page.url().includes('/login')).toBeTruthy();
  });

  test('should redirect unauthenticated dashboard access to login', async ({ page }) => {
    await page.context().clearCookies();

    const response = await page.goto('/dashboard');

    expect(response?.status()).toBe(200);
    await page.waitForURL(/\/login\?callbackUrl=%2Fdashboard$/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard$/);
    await expect(page.getByText('ログイン', { exact: true }).first()).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'password123');
    await page.getByRole('button', { name: /ログイン|login/i }).click();

    await page.waitForURL('/dashboard', { timeout: 10000 });

    await page.getByRole('button', { name: /ログアウト|logout/i }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /ログアウト|logout/i })
      .click();

    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page.getByText('ログイン', { exact: true }).first()).toBeVisible();
  });
});
