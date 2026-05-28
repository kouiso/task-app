import { expect, test, type Page } from '@playwright/test';

const credentials = { email: 'admin@example.com', password: 'password123' };

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#email', credentials.email);
  await page.fill('#password', credentials.password);
  await page.getByRole('button', { name: /ログイン|login/i }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

async function createTask(page: Page, title: string) {
  await page.goto('/task');
  await page.getByRole('button', { name: '新規タスク' }).click();
  await page.getByLabel('タイトル').fill(title);
  await page.getByRole('button', { name: '作成' }).click();
  await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
}

async function deleteTask(page: Page, title: string) {
  await page.goto('/task');
  const taskCard = page.locator('.rounded-xl', {
    has: page.getByRole('button', { name: title, exact: true }),
  });
  await taskCard.getByRole('button', { name: 'タスクを削除' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();
  await expect(page.getByRole('button', { name: title, exact: true })).toHaveCount(0);
}

test.describe('Task Comment CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should post, edit, and delete a comment on a task', async ({ page }) => {
    const suffix = Date.now().toString(36);
    const taskTitle = `E2E コメントテスト ${suffix}`;
    const commentText = `テストコメント ${suffix}`;
    const updatedComment = `更新済みコメント ${suffix}`;

    await createTask(page, taskTitle);

    // open task detail dialog by clicking task title button
    await page.goto('/task');
    await page.getByRole('button', { name: taskTitle, exact: true }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: taskTitle })).toBeVisible();

    // verify comment section is visible
    await expect(dialog.getByText('コメント')).toBeVisible();

    // post a comment
    await dialog.getByPlaceholder('コメントを追加...').fill(commentText);
    await dialog.getByRole('button', { name: 'コメント投稿' }).click();

    await expect(dialog.getByText(commentText)).toBeVisible();

    // edit the comment: click pencil icon button near comment text
    const commentEntry = dialog.locator('div', { has: dialog.getByText(commentText) }).first();
    await commentEntry.getByRole('button').filter({ has: page.locator('.lucide-pencil') }).click();

    const editTextarea = dialog.locator('textarea').last();
    await editTextarea.clear();
    await editTextarea.fill(updatedComment);
    await dialog.getByRole('button', { name: '更新' }).click();

    await expect(dialog.getByText(updatedComment)).toBeVisible();
    await expect(dialog.getByText(commentText)).toHaveCount(0);

    // delete the comment: click trash icon button near updated comment text
    const updatedCommentEntry = dialog
      .locator('div', { has: dialog.getByText(updatedComment) })
      .first();
    await updatedCommentEntry
      .getByRole('button')
      .filter({ has: page.locator('.lucide-trash-2') })
      .click();
    await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();

    await expect(dialog.getByText(updatedComment)).toHaveCount(0);
    await expect(dialog.getByText('コメントはまだありません。')).toBeVisible();

    // close dialog
    await dialog.getByRole('button', { name: '閉じる' }).click();

    await deleteTask(page, taskTitle);
  });
});
