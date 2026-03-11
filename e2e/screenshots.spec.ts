import { expect, type Page, test } from '@playwright/test';

const SCREENSHOT_DIR = 'material/30days-curriculum/screenshots';

async function login(page: Page) {
  await page.goto('/login');
  await expect(page.locator('body')).toBeVisible();
  await page.fill('#email', 'admin@example.com');
  await page.fill('#password', 'password123');
  await page.getByRole('button', { name: /ログイン|login/i }).click();
  await page.waitForURL('/dashboard', { timeout: 15000 });
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}`,
    fullPage: true,
  });
}

test.describe('Curriculum Screenshots', () => {
  // =====================================================
  // 認証系ページ（ログイン前）
  // =====================================================

  test('login page - initial state', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('ログイン', { exact: false }).first()).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await screenshot(page, 'login.png');
  });

  test('login page - validation error', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('ログイン', { exact: false }).first()).toBeVisible();
    await page.fill('#email', 'invalid-email');
    await page.fill('#password', '');
    await page.getByRole('button', { name: /ログイン/i }).click();
    await page
      .waitForSelector('[role="alert"], .text-red-500, .text-destructive, p.text-sm', {
        timeout: 5000,
      })
      .catch(() => null);
    await page.waitForTimeout(500);
    await screenshot(page, 'login-error.png');
  });

  test('register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText('新規登録', { exact: false }).first()).toBeVisible();
    await screenshot(page, 'register.png');
  });

  // =====================================================
  // ログイン後のページ（認証済み）
  // =====================================================

  test.describe('Authenticated pages', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    // --- エラーページ（認証後にアクセス） ---
    test('error page (not found)', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-for-curriculum');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await screenshot(page, 'error-page.png');
    });

    // --- ダッシュボード ---
    test('dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      await expect(page.locator('body')).toBeVisible();
      await screenshot(page, 'dashboard.png');
    });

    // --- サイドバー ---
    test('sidebar navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      const nav = page.locator('nav, [role="navigation"], aside').first();
      await expect(nav).toBeVisible();
      await screenshot(page, 'sidebar.png');
    });

    // --- プロジェクト ---
    test('project list', async ({ page }) => {
      await page.goto('/project');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      await screenshot(page, 'project-list.png');
    });

    test('project create dialog', async ({ page }) => {
      await page.goto('/project');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      const btn = page.getByRole('button', { name: /新規|作成|プロジェクト/i }).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(500);
      }
      await screenshot(page, 'project-create-dialog.png');
    });

    test('project detail dialog (edit mode)', async ({ page }) => {
      await page.goto('/project');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      // カード内のPencilアイコンボタン（variant="ghost" size="icon"）をクリック
      const pencilBtn = page.locator('main button[class*="ghost"]').first();
      if (await pencilBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pencilBtn.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(500);
      }
      await screenshot(page, 'project-detail-dialog.png');
    });

    test('project add member', async ({ page }) => {
      await page.goto('/project');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      // カード本体をクリックして詳細ダイアログを開く
      const projectCard = page.locator('main').getByText('Webサイトリニューアル').first();
      if (await projectCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await projectCard.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(500);
        // 詳細ダイアログ内の「メンバー追加」ボタンをクリック
        const memberBtn = page
          .locator('[role="dialog"]')
          .getByRole('button', { name: /メンバー追加/ });
        if (await memberBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await memberBtn.click();
          await page.waitForTimeout(500);
        }
      }
      await screenshot(page, 'project-add-member.png');
    });

    // --- タスク ---
    test('task list', async ({ page }) => {
      await page.goto('/task');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      await expect(page.locator('body')).toBeVisible();
      await screenshot(page, 'task-list.png');
    });

    test('task create dialog', async ({ page }) => {
      await page.goto('/task');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      const btn = page.getByRole('button', { name: /新規|タスク|作成/i }).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(500);
      }
      await screenshot(page, 'task-create-dialog.png');
    });

    test('task detail dialog', async ({ page }) => {
      await page.goto('/task');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      // タスクカードのタイトルボタンをクリック
      const taskTitle = page.locator('button[type="button"].w-full.text-left').first();
      if (await taskTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await taskTitle.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(1000);
      }
      await screenshot(page, 'task-detail-dialog.png');
    });

    test('task comment edit UI', async ({ page }) => {
      await page.goto('/task');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      // タスクカードのタイトルボタンをクリック
      const taskTitle = page.locator('button[type="button"].w-full.text-left').first();
      if (await taskTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await taskTitle.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(1000);
        // ダイアログ内の編集ボタンをクリック
        const editBtn = page
          .locator('[role="dialog"]')
          .getByRole('button', { name: /編集/i })
          .first();
        if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await editBtn.click();
          await page.waitForTimeout(500);
        }
      }
      await screenshot(page, 'task-comment-edit.png');
    });

    test('task timer', async ({ page }) => {
      await page.goto('/task');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      // タスクカードのタイトルボタンをクリック
      const taskTitle = page.locator('button[type="button"].w-full.text-left').first();
      if (await taskTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await taskTitle.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(1000);
      }
      await screenshot(page, 'task-timer.png');
    });

    // --- マイタスク ---
    test('my task page', async ({ page }) => {
      await page.goto('/my-task');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      await expect(page.locator('body')).toBeVisible();
      await screenshot(page, 'my-task.png');
    });

    // --- 検索 ---
    test('search page - initial', async ({ page }) => {
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
      await screenshot(page, 'search.png');
    });

    test('search page - with results', async ({ page }) => {
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      // 検索入力欄に入力してEnterで検索実行
      const searchInput = page.locator('#keyword');
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('デザイン');
        await page.getByRole('button', { name: '検索' }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
      }
      await screenshot(page, 'search-results.png');
    });

    // --- レポート ---
    test('report page', async ({ page }) => {
      await page.goto('/report');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      await expect(page.locator('body')).toBeVisible();
      await screenshot(page, 'report.png');
    });

    test('weekly report page', async ({ page }) => {
      const response = await page.goto('/report/weekly');
      if (response && response.status() === 404) {
        await page.goto('/report');
      }
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      const weeklyTab = page
        .getByRole('tab', { name: /週次|weekly/i })
        .or(page.getByRole('link', { name: /週次|weekly/i }))
        .first();
      if (await weeklyTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await weeklyTab.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }
      await screenshot(page, 'report-weekly.png');
    });

    // --- プロフィール ---
    test('profile page', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
      await screenshot(page, 'profile.png');
    });

    test('change password page', async ({ page }) => {
      await page.goto('/profile/change-password');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
      await screenshot(page, 'change-password.png');
    });

    // --- ユーザー管理 ---
    test('user list (admin view)', async ({ page }) => {
      await page.goto('/user');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      await expect(page.locator('body')).toBeVisible();
      await screenshot(page, 'user-list.png');
    });
  });
});
