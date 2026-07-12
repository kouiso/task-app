import { expect, test } from '@playwright/test';

test.describe('Register and Login flow', () => {
  test('should display register page with required form fields', async ({ page }) => {
    await page.goto('/register');

    await expect(page).toHaveURL('/register');
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.getByRole('button', { name: '登録' })).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.goto('/register');

    await page.getByRole('button', { name: '登録' }).click();

    await expect(page.locator('body')).toContainText(/必須|入力してください|required/i);
  });

  test('should show error for mismatched passwords', async ({ page }) => {
    await page.goto('/register');

    await page.locator('#name').fill('テストユーザー');
    await page.locator('#email').fill(`e2e-${Date.now()}@example.com`);
    await page.locator('#password').fill('Password123!');
    await page.locator('#confirmPassword').fill('DifferentPassword!');
    await page.getByRole('button', { name: '登録' }).click();

    await expect(page.locator('body')).toContainText(/一致|match/i);
  });

  test('should register new user and redirect to login', async ({ page }) => {
    const uniqueEmail = `e2e-register-${Date.now().toString(36)}@example.com`;

    await page.goto('/register');
    await page.locator('#name').fill('E2E テストユーザー');
    await page.locator('#email').fill(uniqueEmail);
    await page.locator('#password').fill('Password123!');
    await page.locator('#confirmPassword').fill('Password123!');
    await page.getByRole('button', { name: '登録' }).click();

    // after successful registration, should redirect to /login
    await page.waitForURL('/login', { timeout: 10000 });
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('ログイン', { exact: true }).first()).toBeVisible();
  });
});
