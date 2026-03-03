import { expect, type Page, test } from '@playwright/test';

const SCREENSHOT_DIR = 'material/30days-curriculum/screenshots';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#email', 'admin@example.com');
  await page.fill('#password', 'password123');
  await page.getByRole('button', { name: /ログイン|login/i }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}`,
    fullPage: true,
  });
}

test.describe('Curriculum Screenshots', () => {
  // === 認証系ページ（ログイン前）===

  test('login page - initial', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /ログイン/i })).toBeVisible();
    await screenshot(page, 'login.png');
  });

  test('login page - validation error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'invalid');
    await page.fill('#password', '');
    await page.getByRole('button', { name: /ログイン/i }).click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'login-error.png');
  });

  test('register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /登録|ユーザー/i })).toBeVisible();
    await screenshot(page, 'register.png');
  });

  // === ログイン後のページ ===

  test.describe('Authenticated pages', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    // --- ダッシュボード ---
    test('dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      await screenshot(page, 'dashboard.png');
    });

    // --- サイドバー ---
    test('sidebar navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);
      // デスクトップサイドバーはデフォルトで表示
      await screenshot(page, 'sidebar.png');
    });

    // --- プロジェクト ---
    test('project list', async ({ page }) => {
      await page.goto('/project');
      await page.waitForTimeout(2000);
      await screenshot(page, 'project-list.png');
    });

    test('project create dialog', async ({ page }) => {
      await page.goto('/project');
      await page.waitForTimeout(1000);
      const btn = page.getByRole('button', {
        name: /新規プロジェクト|プロジェクトを作成/i,
      });
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(1000);
      }
      await screenshot(page, 'project-create-dialog.png');
    });

    test('project detail dialog', async ({ page }) => {
      await page.goto('/project');
      await page.waitForTimeout(2000);
      // 最初のプロジェクトカードをクリック
      const card = page.locator('[data-testid="project-card"]').first();
      if (await card.isVisible()) {
        await card.click();
        await page.waitForTimeout(1000);
      } else {
        // カードのtestidがない場合はリンクを探す
        const link = page.locator('a[href*="/project"]').first();
        if (await link.isVisible()) {
          await link.click();
          await page.waitForTimeout(1000);
        }
      }
      await screenshot(page, 'project-detail-dialog.png');
    });

    test('project add member dialog', async ({ page }) => {
      await page.goto('/project');
      await page.waitForTimeout(2000);
      // プロジェクト詳細を開いてからメンバー追加
      const card = page.locator('[data-testid="project-card"]').first();
      if (await card.isVisible()) {
        await card.click();
        await page.waitForTimeout(1000);
      }
      const addMemberBtn = page.getByRole('button', {
        name: /メンバー追加|メンバーを追加/i,
      });
      if (await addMemberBtn.isVisible()) {
        await addMemberBtn.click();
        await page.waitForTimeout(1000);
      }
      await screenshot(page, 'project-add-member.png');
    });

    // --- タスク ---
    test('task list', async ({ page }) => {
      await page.goto('/task');
      await page.waitForTimeout(2000);
      await screenshot(page, 'task-list.png');
    });

    test('task create dialog', async ({ page }) => {
      await page.goto('/task');
      await page.waitForTimeout(1000);
      const btn = page.getByRole('button', {
        name: /新規タスク|タスクを作成/i,
      });
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(1000);
      }
      await screenshot(page, 'task-create-dialog.png');
    });

    test('task detail dialog with comments', async ({ page }) => {
      await page.goto('/task');
      await page.waitForTimeout(2000);
      // 最初のタスクをクリックして詳細を開く
      const taskRow = page.locator('[data-testid="task-row"]').first();
      if (await taskRow.isVisible()) {
        await taskRow.click();
      } else {
        const taskLink = page.locator('tr').nth(1);
        if (await taskLink.isVisible()) {
          await taskLink.click();
        }
      }
      await page.waitForTimeout(1500);
      await screenshot(page, 'task-detail-dialog.png');
    });

    test('task comment edit UI', async ({ page }) => {
      await page.goto('/task');
      await page.waitForTimeout(2000);
      const taskRow = page.locator('[data-testid="task-row"]').first();
      if (await taskRow.isVisible()) {
        await taskRow.click();
      } else {
        const taskLink = page.locator('tr').nth(1);
        if (await taskLink.isVisible()) {
          await taskLink.click();
        }
      }
      await page.waitForTimeout(1500);
      // 編集ボタンを探してクリック
      const editBtn = page.getByRole('button', { name: /編集|edit/i }).first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(500);
      }
      await screenshot(page, 'task-comment-edit.png');
    });

    test('task status change', async ({ page }) => {
      await page.goto('/task');
      await page.waitForTimeout(2000);
      await screenshot(page, 'task-status-change.png');
    });

    test('task timer', async ({ page }) => {
      await page.goto('/task');
      await page.waitForTimeout(2000);
      // タスク詳細を開いてタイマーを撮影
      const taskRow = page.locator('[data-testid="task-row"]').first();
      if (await taskRow.isVisible()) {
        await taskRow.click();
        await page.waitForTimeout(1500);
      }
      await screenshot(page, 'task-timer.png');
    });

    // --- マイタスク ---
    test('my task page', async ({ page }) => {
      await page.goto('/my-task');
      await page.waitForTimeout(2000);
      await screenshot(page, 'my-task.png');
    });

    // --- 検索 ---
    test('search page - initial', async ({ page }) => {
      await page.goto('/search');
      await page.waitForTimeout(1000);
      await screenshot(page, 'search.png');
    });

    test('search page - results', async ({ page }) => {
      await page.goto('/search');
      await page.waitForTimeout(1000);
      const searchInput = page.getByPlaceholder(/検索|search|キーワード/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('タスク');
        const searchBtn = page.getByRole('button', { name: /検索|search/i });
        if (await searchBtn.isVisible()) {
          await searchBtn.click();
        }
        await page.waitForTimeout(2000);
      }
      await screenshot(page, 'search-results.png');
    });

    // --- レポート ---
    test('report page with stats and graphs', async ({ page }) => {
      await page.goto('/report');
      await page.waitForTimeout(3000);
      await screenshot(page, 'report.png');
    });

    test('weekly report', async ({ page }) => {
      await page.goto('/report/weekly');
      await page.waitForTimeout(3000);
      await screenshot(page, 'report-weekly.png');
    });

    // --- プロフィール ---
    test('profile page', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForTimeout(1000);
      await screenshot(page, 'profile.png');
    });

    test('profile edit page', async ({ page }) => {
      await page.goto('/profile/edit');
      await page.waitForTimeout(1000);
      await screenshot(page, 'profile-edit.png');
    });

    test('change password page', async ({ page }) => {
      await page.goto('/profile/change-password');
      await page.waitForTimeout(1000);
      await screenshot(page, 'change-password.png');
    });

    // --- ユーザー管理 ---
    test('user list', async ({ page }) => {
      await page.goto('/user');
      await page.waitForTimeout(2000);
      await screenshot(page, 'user-list.png');
    });

    test('user detail', async ({ page }) => {
      await page.goto('/user');
      await page.waitForTimeout(2000);
      // 最初のユーザーリンクを取得してナビゲート
      const userLink = page.locator('a[href*="/user/"]').first();
      if (await userLink.isVisible()) {
        await userLink.click();
        await page.waitForTimeout(1000);
      }
      await screenshot(page, 'user-detail.png');
    });

    test('user edit', async ({ page }) => {
      await page.goto('/user');
      await page.waitForTimeout(2000);
      const userLink = page.locator('a[href*="/user/"]').first();
      if (await userLink.isVisible()) {
        await userLink.click();
        await page.waitForTimeout(1000);
        const editLink = page.locator('a[href*="/edit"]').first();
        if (await editLink.isVisible()) {
          await editLink.click();
          await page.waitForTimeout(1000);
        }
      }
      await screenshot(page, 'user-edit.png');
    });

    // --- 静的ページ ---
    test('about page', async ({ page }) => {
      await page.goto('/about');
      await page.waitForTimeout(1000);
      await screenshot(page, 'about.png');
    });

    test('help page', async ({ page }) => {
      await page.goto('/help');
      await page.waitForTimeout(1000);
      await screenshot(page, 'help.png');
    });

    // --- エラーページ ---
    test('error page', async ({ page }) => {
      // 存在しないAPIエンドポイントへアクセスしてエラーを発生させる
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);
      // error.tsxの見た目を確認するために、存在しないページへ
      await page.goto('/this-page-does-not-exist');
      await page.waitForTimeout(1000);
      await screenshot(page, 'error-page.png');
    });
  });
});
