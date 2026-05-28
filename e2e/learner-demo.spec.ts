import { expect, test, type Page } from '@playwright/test';

const credentials = {
  email: 'admin@example.com',
  password: 'password123',
};

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(credentials.email);
  await page.getByLabel('パスワード').fill(credentials.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

test.describe('教材デモ導線', () => {
  test('未認証リダイレクトからプロジェクト・タスク作成、検索、レポート確認まで通る', async ({
    page,
  }) => {
    const suffix = Date.now().toString(36);
    const projectName = `教材デモ ${suffix}`;
    const taskTitle = `Day01 タスク作成 ${suffix}`;

    await page.goto('/task');
    await page.waitForURL(/\/login/);
    await expect(page.getByText('ログイン', { exact: true }).first()).toBeVisible();

    await login(page);
    await expect(page.getByText('全体の進捗')).toBeVisible();

    await page.goto('/project');
    await page.getByRole('button', { name: '新規プロジェクト' }).click();
    await page.getByLabel('プロジェクト名').fill(projectName);
    await page.getByLabel('説明').fill('教材の初回読者が作成する確認用プロジェクト');
    await page.getByLabel('開始日').fill('2026-05-26');
    await page.getByLabel('終了日').fill('2026-05-31');
    await page.getByRole('button', { name: '作成' }).click();
    await expect(page.getByText(projectName)).toBeVisible();

    await page.goto('/task');
    await page.getByRole('button', { name: '新規タスク' }).click();
    await page.getByLabel('タイトル').fill(taskTitle);
    await page.getByLabel('説明').fill('教材のDay01で作成するタスク');
    await page.getByLabel('期限').fill('2026-05-27');
    await page.getByLabel('見積時間').fill('1.5');
    await page.getByLabel('プロジェクトを選択').click();
    await page.getByRole('option', { name: projectName }).click();
    await page.getByRole('button', { name: '作成' }).click();
    const taskTitleButton = page.getByRole('button', { name: taskTitle, exact: true });
    await expect(taskTitleButton).toBeVisible();

    await page.goto(`/search?keyword=${encodeURIComponent(taskTitle)}`);
    await expect(page.locator('#keyword')).toHaveValue(taskTitle);
    await expect(page.getByRole('heading', { name: /検索結果: [1-9]/ })).toBeVisible();
    await expect(page.getByRole('button', { name: taskTitle, exact: true })).toBeVisible();

    await page.goto('/report');
    await expect(page.getByRole('heading', { name: 'レポート・統計' })).toBeVisible();
    await expect(page.getByText('タスク数')).toBeVisible();
    await expect(page.getByRole('cell', { name: projectName })).toBeVisible();

    await page.goto('/task');
    await page
      .locator('.rounded-xl', { has: page.getByRole('button', { name: taskTitle, exact: true }) })
      .getByRole('button', { name: 'タスクを削除' })
      .click();
    await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();
    await expect(page.getByRole('button', { name: taskTitle, exact: true })).toHaveCount(0);

    await page.goto('/project');
    await page.getByRole('button', { name: `${projectName}を削除` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();
    await expect(page.getByText(projectName)).toHaveCount(0);
  });
});
