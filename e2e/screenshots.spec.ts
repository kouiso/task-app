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

async function screenshot(page: Page, name: string, fullPage = true) {
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}`,
    fullPage,
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
      await screenshot(page, 'project-create-dialog.png', false);
    });

    test('project detail dialog (edit mode)', async ({ page }) => {
      await page.goto('/project');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      // border-leftスタイル付きカード内の最初のbutton = Pencil(編集)ボタン
      const card = page.locator('[style*="border-left"]').first();
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        const editBtn = card.locator('button').first();
        await editBtn.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(500);
      }
      await screenshot(page, 'project-detail-dialog.png', false);
    });

    test('project add member', async ({ page }) => {
      await page.goto('/project');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      // プロジェクトカードをクリックして詳細ダイアログを開く
      const card = page.locator('[style*="border-left"]').first();
      await card.click();
      // tRPCデータ取得完了を待つ（メンバー追加ボタンが表示されるまで）
      const memberBtn = page
        .locator('[role="dialog"]')
        .getByRole('button', { name: /メンバー追加/ });
      await memberBtn.waitFor({ timeout: 15000 });
      await page.waitForTimeout(500);
      // メンバー追加ボタンクリック → 別ダイアログが開く
      await memberBtn.click();
      // メンバー追加ダイアログが開くのを待つ（説明テキストで判定）
      await page
        .getByText('このプロジェクトに新しいメンバーを追加します')
        .waitFor({ timeout: 5000 });
      await page.waitForTimeout(500);
      // 2重オーバーレイで画面が暗くなるため、最初のダイアログを非表示にする
      await page.evaluate(() => {
        const overlays = document.querySelectorAll('[data-state="open"][class*="bg-black"]');
        if (overlays.length >= 2) {
          (overlays[0] as HTMLElement).style.display = 'none';
        }
        const dialogs = document.querySelectorAll('[role="dialog"]');
        if (dialogs.length >= 2) {
          (dialogs[0] as HTMLElement).style.display = 'none';
        }
      });
      await page.waitForTimeout(300);
      await screenshot(page, 'project-add-member.png', false);
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
      await screenshot(page, 'task-create-dialog.png', false);
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
        // tRPCデータ取得完了を待つ（コメントセクションが表示されるまで）
        await page
          .locator('[role="dialog"]')
          .getByText(/コメント/)
          .first()
          .waitFor({ timeout: 10000 })
          .catch(() => null);
        await page.waitForTimeout(500);
      }
      await screenshot(page, 'task-detail-dialog.png', false);
    });

    test('task comment edit UI', async ({ page }) => {
      await page.goto('/task');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      // 「デザインモックアップ作成」タスクを開く（adminのコメントがある）
      const targetTask = page.getByRole('button', { name: /デザインモックアップ/ }).first();
      if (await targetTask.isVisible({ timeout: 3000 }).catch(() => false)) {
        await targetTask.click();
      } else {
        // フォールバック：最初のタスクを開く
        const taskTitle = page.locator('button[type="button"].w-full.text-left').first();
        if (await taskTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
          await taskTitle.click();
        }
      }
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
      // tRPCデータ取得完了を待つ
      await page
        .locator('[role="dialog"]')
        .getByText(/コメント/)
        .first()
        .waitFor({ timeout: 10000 })
        .catch(() => null);
      await page.waitForTimeout(1000);
      // コメント横のPencilアイコンボタンをクリック（SVGクラス lucide-pencil）
      const commentEditBtn = page.locator('[role="dialog"] button:has(svg.lucide-pencil)').first();
      if (await commentEditBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await commentEditBtn.click();
        await page.waitForTimeout(500);
      }
      await screenshot(page, 'task-comment-edit.png', false);
    });

    test('task timer', async ({ page }) => {
      await page.goto('/task');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      // タイマーはタスクカード上にあり、詳細ダイアログにはない
      // カード上の「時間記録」ボタンをクリックしてタイマーUIを表示
      const timerBtn = page.getByRole('button', { name: /時間を記録/ }).first();
      if (await timerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await timerBtn.click();
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
