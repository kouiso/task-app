import { expect, type Page, test } from '@playwright/test';

const credentials = { email: 'admin@example.com', password: 'password123' };

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#email', credentials.email);
  await page.fill('#password', credentials.password);
  await page.getByRole('button', { name: /ログイン|login/i }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to projects page', async ({ page }) => {
    await page.goto('/project');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/project');
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
  });

  test('should display project list with heading', async ({ page }) => {
    await page.goto('/project');
    await page.waitForLoadState('networkidle');

    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toContain('プロジェクト');
    await expect(page.getByRole('button', { name: '新規プロジェクト' })).toBeVisible();
  });

  test('should create a project', async ({ page }) => {
    const suffix = Date.now().toString(36);
    const projectName = `E2E 作成テスト ${suffix}`;

    await page.goto('/project');
    await page.getByRole('button', { name: '新規プロジェクト' }).click();

    await page.getByLabel('プロジェクト名').fill(projectName);
    await page.getByLabel('説明').fill('E2E 作成テスト用プロジェクト');
    await page.getByRole('button', { name: '作成' }).click();

    await expect(page.getByText(projectName)).toBeVisible();

    // cleanup
    await page.getByRole('button', { name: `${projectName}を削除` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();
  });

  test('should create, edit, and delete a project', async ({ page }) => {
    const suffix = Date.now().toString(36);
    const originalName = `E2E プロジェクト ${suffix}`;
    const updatedName = `E2E プロジェクト更新 ${suffix}`;

    // create
    await page.goto('/project');
    await page.getByRole('button', { name: '新規プロジェクト' }).click();
    await page.getByLabel('プロジェクト名').fill(originalName);
    await page.getByLabel('説明').fill('E2E テスト用プロジェクト');
    await page.getByLabel('開始日').fill('2026-06-01');
    await page.getByLabel('終了日').fill('2026-06-30');
    await page.getByRole('button', { name: '作成' }).click();
    await expect(page.getByText(originalName)).toBeVisible();

    // edit
    await page.getByRole('button', { name: `${originalName}を編集` }).click();
    await page.getByLabel('プロジェクト名').clear();
    await page.getByLabel('プロジェクト名').fill(updatedName);
    await page.getByRole('button', { name: '更新' }).click();
    await expect(page.getByText(updatedName)).toBeVisible();
    await expect(page.getByText(originalName)).toHaveCount(0);

    // delete
    await page.getByRole('button', { name: `${updatedName}を削除` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();
    await expect(page.getByText(updatedName)).toHaveCount(0);
  });

  test('should navigate to dashboard from header', async ({ page }) => {
    await page.goto('/project');

    const dashboardLink = page.getByRole('link', { name: /ダッシュボード|dashboard/i }).first();
    await expect(dashboardLink).toBeVisible();
    await dashboardLink.click();
    await page.waitForURL('/dashboard', { timeout: 5000 });
    await expect(page.getByText('全体の進捗')).toBeVisible();
  });
});
