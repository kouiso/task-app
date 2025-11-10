import { expect, test } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /ログイン|login/i })).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'password123');

    // Click login button
    await page.getByRole('button', { name: /ログイン|login/i }).click();

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Check if dashboard is visible
    await expect(page.getByRole('heading', { name: /ダッシュボード|dashboard/i })).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Fill login form with invalid credentials
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');

    // Click login button
    await page.getByRole('button', { name: /ログイン|login/i }).click();

    // Check for error message (wait a bit for the error to appear)
    await page.waitForTimeout(2000);

    // Should still be on login page or show error
    const errorVisible = await page
      .locator('text=/エラー|error|ログインに失敗/i')
      .isVisible()
      .catch(() => false);
    expect(errorVisible || page.url().includes('/login')).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'password123');
    await page.getByRole('button', { name: /ログイン|login/i }).click();

    // Wait for dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Click logout button (usually in header/menu)
    await page.getByRole('button', { name: /ログアウト|logout/i }).click();

    // Should redirect to login page
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page.getByRole('heading', { name: /ログイン|login/i })).toBeVisible();
  });
});
