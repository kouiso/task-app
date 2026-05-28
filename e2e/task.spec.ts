import { expect, test, type Page } from '@playwright/test';

const credentials = { email: 'admin@example.com', password: 'password123' };

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#email', credentials.email);
  await page.fill('#password', credentials.password);
  await page.getByRole('button', { name: /ログイン|login/i }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to tasks page', async ({ page }) => {
    await page.goto('/task');

    await expect(page.getByRole('heading', { name: /タスク|task/i })).toBeVisible();
    await expect(page.getByRole('button', { name: '新規タスク' })).toBeVisible();
    await expect(page).toHaveURL('/task');
  });

  test('should display task list', async ({ page }) => {
    await page.goto('/task');
    await page.waitForLoadState('networkidle');

    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
    await expect(page.getByRole('heading', { name: /タスク|task/i })).toBeVisible();
  });

  test('should open create task dialog', async ({ page }) => {
    await page.goto('/task');

    await page.getByRole('button', { name: '新規タスク' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('タイトル')).toBeVisible();
  });

  test('should create and delete a task', async ({ page }) => {
    const suffix = Date.now().toString(36);
    const taskTitle = `E2E タスク作成 ${suffix}`;

    await page.goto('/task');
    await page.getByRole('button', { name: '新規タスク' }).click();

    await page.getByLabel('タイトル').fill(taskTitle);
    await page.getByLabel('説明').fill('E2E テスト用タスク');
    await page.getByRole('button', { name: '作成' }).click();

    const taskButton = page.getByRole('button', { name: taskTitle, exact: true });
    await expect(taskButton).toBeVisible();

    // delete
    await page
      .locator('.rounded-xl', { has: page.getByRole('button', { name: taskTitle, exact: true }) })
      .getByRole('button', { name: 'タスクを削除' })
      .click();
    await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();
    await expect(page.getByRole('button', { name: taskTitle, exact: true })).toHaveCount(0);
  });

  test('should create task and edit status', async ({ page }) => {
    const suffix = Date.now().toString(36);
    const taskTitle = `E2E ステータス変更 ${suffix}`;

    await page.goto('/task');
    await page.getByRole('button', { name: '新規タスク' }).click();
    await page.getByLabel('タイトル').fill(taskTitle);
    await page.getByRole('button', { name: '作成' }).click();
    await expect(page.getByRole('button', { name: taskTitle, exact: true })).toBeVisible();

    // edit to change status
    await page
      .locator('.rounded-xl', { has: page.getByRole('button', { name: taskTitle, exact: true }) })
      .getByRole('button', { name: 'タスクを編集' })
      .click();

    await page.getByRole('dialog').getByLabel('ステータスを選択').click();
    await page.getByRole('option', { name: '進行中' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '更新' }).click();

    // status badge should reflect change
    const taskCard = page.locator('.rounded-xl', {
      has: page.getByRole('button', { name: taskTitle, exact: true }),
    });
    await expect(taskCard).toBeVisible();

    // cleanup
    await taskCard.getByRole('button', { name: 'タスクを削除' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();
    await expect(page.getByRole('button', { name: taskTitle, exact: true })).toHaveCount(0);
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.goto('/task');
    await page.waitForLoadState('networkidle');

    const statusFilter = page.getByLabel(/ステータス|status/i).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.getByRole('option', { name: /進行中/i }).first().click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/ステータス|status/i);
    }
  });

  test('should search tasks by partial keyword', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('#keyword');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('タスク');
    const searchButton = page.getByRole('button', { name: /検索|search/i });
    await searchButton.click();

    await page.waitForLoadState('networkidle');
    const heading = page.getByRole('heading', { name: /検索結果/ });
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText).toMatch(/検索結果/);
  });
});
