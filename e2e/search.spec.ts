import { expect, type Page, test } from '@playwright/test';

const credentials = { email: 'admin@example.com', password: 'password123' };

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#email', credentials.email);
  await page.fill('#password', credentials.password);
  await page.getByRole('button', { name: /ログイン|login/i }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display search page', async ({ page }) => {
    await page.goto('/search');

    await expect(page).toHaveURL('/search');
    await expect(page.getByRole('heading', { name: '検索' })).toBeVisible();
    await expect(page.locator('#keyword')).toBeVisible();
    await expect(page.getByRole('button', { name: '検索' })).toBeVisible();
  });

  test('should search tasks by partial title match', async ({ page }) => {
    const suffix = Date.now().toString(36);
    const taskTitle = `E2E 検索テスト ${suffix}`;

    // create a task first
    await page.goto('/task');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: '新規タスク' })).toBeVisible();
    await page.getByRole('button', { name: '新規タスク' }).click();
    await page.getByLabel('タイトル').fill(taskTitle);
    await page.getByRole('button', { name: '作成' }).click();
    await expect(page.getByRole('button', { name: taskTitle, exact: true })).toBeVisible();

    // search by partial keyword (the suffix part is unique)
    await page.goto(`/search?keyword=${encodeURIComponent(suffix)}`);

    await expect(page.locator('#keyword')).toHaveValue(suffix);
    await expect(page.getByRole('heading', { name: /検索結果: [1-9]/ })).toBeVisible();
    await expect(page.getByRole('button', { name: taskTitle, exact: true })).toBeVisible();

    // cleanup
    await page.goto('/task');
    await page
      .locator('.rounded-lg', { has: page.getByRole('button', { name: taskTitle, exact: true }) })
      .getByRole('button', { name: 'タスクを削除' })
      .click();
    await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();
  });

  test('should show no results for non-existent keyword', async ({ page }) => {
    const impossibleKeyword = `nonexistent-xyz-${Date.now()}`;

    await page.goto(`/search?keyword=${impossibleKeyword}`);

    await expect(page.locator('#keyword')).toHaveValue(impossibleKeyword);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('検索結果が見つかりませんでした')).toBeVisible();
  });

  test('should reset search filters', async ({ page }) => {
    await page.goto('/search?keyword=テスト');

    await expect(page.locator('#keyword')).toHaveValue('テスト');

    const clearButton = page.getByRole('button', { name: /クリア/i });
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#keyword')).toHaveValue('');
  });
});
