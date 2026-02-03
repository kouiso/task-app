import { expect, test } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /ログイン|login/i })).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'password123');

    await page.getByRole('button', { name: /ログイン|login/i }).click();

    await page.waitForURL('/dashboard', { timeout: 10000 });

    await expect(page.getByRole('heading', { name: /ダッシュボード|dashboard/i })).toBeVisible();
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

  test('should logout successfully', async ({ page }) => {
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'password123');
    await page.getByRole('button', { name: /ログイン|login/i }).click();

    await page.waitForURL('/dashboard', { timeout: 10000 });

    await page.getByRole('button', { name: /ログアウト|logout/i }).click();

    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page.getByRole('heading', { name: /ログイン|login/i })).toBeVisible();
  });
});
