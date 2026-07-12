import { expect, type Page, test } from '@playwright/test';

const SCREENSHOT_DIR = 'material/30days-curriculum/screenshots';

/**
 * ページ遷移やデータ取得後にネットワークが静止するのを待つ。
 * 固定時間待機と違い、実際の通信完了で待機が解けるため速く安定する。
 * リポジトリの他のe2e（task/report/project/search.spec.ts）と同じ作法。
 */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Radix UIのダイアログ・ポップオーバーの開閉や、Rechartsのチャート描画は
 * CSSアニメーションで進行し、ネットワークを伴わない。
 * そのためnetworkidleでは収束を待てず、収束前に撮影すると中途半端なフレームが写る。
 * 待つべきイベントが存在しないこの手のアニメーションに限り、固定時間だけ待機する。
 */
async function waitForAnimation(page: Page, ms = 300) {
  await page.waitForTimeout(ms);
}

async function login(page: Page) {
  await page.goto('/login');
  await page.waitForSelector('#email', { timeout: 30000 });
  await page.fill('#email', 'admin@example.com');
  await page.fill('#password', 'password123');
  await page.getByRole('button', { name: /ログイン|login/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 60000, waitUntil: 'domcontentloaded' });
  // クライアントサイドリダイレクト後にフルリロードしてSSR→ハイドレーションサイクルをリセット
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('nav a[href="/dashboard"]', { timeout: 30000 });
  await settle(page);
}

async function screenshot(page: Page, name: string) {
  // Production SSRでPlaywright内部のフォント待ちでハングするため、
  // CDP (Chrome DevTools Protocol) で直接キャプチャする
  const fs = await import('node:fs');
  const path = await import('node:path');
  const cdp = await page.context().newCDPSession(page);
  const result = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const filePath = `${SCREENSHOT_DIR}/${name}`;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'));
  await cdp.detach();
}

/**
 * フルページナビゲーションでページに遷移する。
 * SSR中のuseQueryはQueryClientのデフォルト設定で無効化されているため、
 * page.goto()による直接ナビゲーションが安全に使用できる。
 */
async function navigateToPage(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('nav a[href="/dashboard"]', { timeout: 30000 });
  await settle(page);
}

/**
 * プロフィールページに遷移する。
 * ページ本体（CardTitle「プロフィール」）が描画されるまで待つ。
 */
async function navigateToProfile(page: Page) {
  await page.goto('/profile', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await page
    .getByText('プロフィール', { exact: true })
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => null);
}

async function firstProjectCard(page: Page) {
  return page
    .locator('[style*="border-left"]')
    .filter({ hasText: 'Webサイトリニューアル' })
    .first();
}

async function openFirstProjectDetail(page: Page) {
  await navigateToPage(page, '/project');
  const card = await firstProjectCard(page);
  if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
    await card.click();
    await page.waitForFunction(() => window.location.search.includes('projectId='), {
      timeout: 10000,
    });
    await page.getByRole('button', { name: /プロジェクト一覧/ }).waitFor({ timeout: 10000 });
    await settle(page);
  }
}

test.describe('Curriculum Screenshots', () => {
  test.setTimeout(120000);
  // =====================================================
  // 認証系ページ（ログイン前）— SSRでも問題ないのでpage.goto使用
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
    // クライアントサイドバリデーションのエラー表示アニメーション収束待ち
    await waitForAnimation(page);
    await screenshot(page, 'login-error.png');
  });

  test('register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText('新規登録', { exact: false }).first()).toBeVisible();
    await screenshot(page, 'register.png');
  });

  test('register page - name and email filled', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText('新規登録', { exact: false }).first()).toBeVisible();
    await page.fill('#name', '山田 太郎');
    await page.fill('#email', 'yamada@example.com');
    await screenshot(page, 'register_step4.png');
  });

  test('register page - all fields filled', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText('新規登録', { exact: false }).first()).toBeVisible();
    await page.fill('#name', '山田 太郎');
    await page.fill('#email', 'yamada@example.com');
    await page.fill('#password', 'password12345');
    await page.fill('#confirmPassword', 'password12345');
    await screenshot(page, 'register_step6.png');
    await screenshot(page, 'register_complete.png');
  });

  // =====================================================
  // ログイン後のページ（認証済み）— SPA遷移でSSR回避
  // =====================================================

  test.describe('Authenticated pages', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    // --- エラーページ（認証後にアクセス） ---
    test('error page (not found)', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-for-curriculum', {
        waitUntil: 'domcontentloaded',
      });
      await settle(page);
      await screenshot(page, 'error-page.png');
    });

    // --- ダッシュボード ---
    test('dashboard', async ({ page }) => {
      // loginでdashboardに遷移済みなので追加遷移不要
      await settle(page);
      await screenshot(page, 'dashboard.png');
    });

    // --- サイドバー ---
    test('sidebar navigation', async ({ page }) => {
      // loginでdashboardに遷移済み
      await settle(page);
      await screenshot(page, 'sidebar.png');
    });

    // --- プロジェクト ---
    test('project list', async ({ page }) => {
      await navigateToPage(page, '/project');
      await screenshot(page, 'project-list.png');
    });

    test('project page - title only (before cards implemented)', async ({ page }) => {
      // Day09 Step1時点（カード実装前）の見た目を再現するため、
      // 現在のカードグリッドをDOM操作で隠して撮影する
      await navigateToPage(page, '/project');
      await page.evaluate(() => {
        const heading = Array.from(document.querySelectorAll('h1')).find((el) =>
          el.textContent?.includes('プロジェクト'),
        );
        const grid = heading?.parentElement?.nextElementSibling;
        if (grid) {
          (grid as HTMLElement).style.display = 'none';
        }
        // Step1時点ではアーカイブ切替・新規作成ボタンもまだ実装されていないため隠す
        for (const label of ['アーカイブ表示', '新規プロジェクト']) {
          const el = Array.from(document.querySelectorAll('button, span')).find(
            (n) => n.textContent?.trim() === label,
          );
          const target = el?.closest('label, button') as HTMLElement | undefined;
          if (target) {
            target.style.display = 'none';
          }
        }
      });
      // DOM書き換え後の再レイアウト反映待ち
      await waitForAnimation(page, 200);
      await screenshot(page, 'day09-step1.png');
    });

    test('project page - loading spinner', async ({ page }) => {
      await page.goto('/project', { waitUntil: 'commit' });
      await screenshot(page, 'day09-loading.png');
    });

    test('project page - cards grid', async ({ page }) => {
      await navigateToPage(page, '/project');
      await screenshot(page, 'day09-cards.png');
      await screenshot(page, 'day09-complete.png');
    });

    test('project page - empty state', async ({ page }) => {
      // シードの `empty@example.com` はどのプロジェクトにも所属しないため、
      // 空状態（プロジェクトが1件もない画面）を撮影できる。
      await page.goto('/login');
      await page.waitForSelector('#email', { timeout: 30000 });
      await page.fill('#email', 'empty@example.com');
      await page.fill('#password', 'password123');
      await page.getByRole('button', { name: /ログイン|login/i }).click();
      await page.waitForURL('**/dashboard', { timeout: 60000, waitUntil: 'domcontentloaded' });

      await navigateToPage(page, '/project');
      await expect(page.getByText('プロジェクトが見つかりません。')).toBeVisible();
      await screenshot(page, 'day09-empty.png');
    });

    test('project page - responsive (mobile)', async ({ page }) => {
      await navigateToPage(page, '/project');
      await page.setViewportSize({ width: 390, height: 844 });
      // ビューポート変更後のレスポンシブ再レイアウト反映待ち
      await waitForAnimation(page);
      await screenshot(page, 'day09-responsive.png');
      await page.setViewportSize({ width: 1440, height: 900 });
    });

    test('project create dialog', async ({ page }) => {
      await navigateToPage(page, '/project');
      const btn = page.getByRole('button', { name: /新規|作成|プロジェクト/i }).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
        await waitForAnimation(page);
      }
      await screenshot(page, 'project-create-dialog.png');
    });

    test('project edit dialog', async ({ page }) => {
      await navigateToPage(page, '/project');
      const editBtn = page.getByRole('button', { name: /Webサイトリニューアルを編集/ }).first();
      if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editBtn.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
        await waitForAnimation(page);
      }
      await screenshot(page, 'project-detail-dialog.png');
    });

    test('project add member', async ({ page }) => {
      await openFirstProjectDetail(page);
      const memberBtn = page.getByRole('button', { name: /メンバー追加/ }).first();
      if (await memberBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await memberBtn.click();
        await page
          .getByText('このプロジェクトに新しいメンバーを追加します')
          .waitFor({ timeout: 5000 });
        await waitForAnimation(page);
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
      }
      await screenshot(page, 'project-add-member.png');
    });

    // --- タスク ---
    test('task list', async ({ page }) => {
      await navigateToPage(page, '/task');
      await expect(page.locator('body')).toBeVisible();
      await screenshot(page, 'task-list.png');
    });

    test('task create dialog', async ({ page }) => {
      await navigateToPage(page, '/task');
      const btn = page.getByRole('button', { name: /新規|タスク|作成/i }).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
        await waitForAnimation(page);
      }
      await screenshot(page, 'task-create-dialog.png');
    });

    test('task detail dialog', async ({ page }) => {
      await navigateToPage(page, '/task');
      const taskTitle = page.locator('button[type="button"].w-full.text-left').first();
      if (await taskTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await taskTitle.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
        await page
          .locator('[role="dialog"]')
          .getByText(/コメント/)
          .first()
          .waitFor({ timeout: 10000 })
          .catch(() => null);
        await waitForAnimation(page);
      }
      await screenshot(page, 'task-detail-dialog.png');
    });

    test('task detail comment form', async ({ page }) => {
      await navigateToPage(page, '/task');
      const taskTitle = page.locator('button[type="button"].w-full.text-left').first();
      if (await taskTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await taskTitle.click();
      }
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
      await page
        .locator('[role="dialog"]')
        .getByText(/コメント/)
        .first()
        .waitFor({ timeout: 10000 })
        .catch(() => null);
      const commentInput = page.locator('[role="dialog"] textarea').first();
      if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await commentInput.scrollIntoViewIfNeeded();
        await commentInput.click();
      }
      await waitForAnimation(page);
      await screenshot(page, 'task-detail-comment-form.png');
    });

    test('task detail comments list', async ({ page }) => {
      await navigateToPage(page, '/task');
      const taskTitle = page.locator('button[type="button"].w-full.text-left').first();
      if (await taskTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await taskTitle.click();
      }
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
      await page
        .locator('[role="dialog"]')
        .getByText(/コメント/)
        .first()
        .waitFor({ timeout: 10000 })
        .catch(() => null);
      // 一覧らしさを見せるため、このテスト用に複数件コメントを積み増す
      const commentInput = page.getByPlaceholder('コメントを追加...');
      const postBtn = page.locator('[role="dialog"]').getByRole('button', { name: /コメント投稿/ });
      for (const content of ['進捗確認です。順調に進んでいます。', '追加の確認事項があります。']) {
        if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await commentInput.fill(content);
          await postBtn.click();
          // 投稿成功時にonSuccessでフォームがreset()され入力欄が空に戻る。それを待つことで
          // 投稿ミューテーションの完了（投稿ボタンの無効化解除）が保証され、次の投稿が可能になる。
          await expect(commentInput).toHaveValue('', { timeout: 15000 });
        }
      }
      await screenshot(page, 'task-detail-comments-list.png');
    });

    test('task detail comment posted', async ({ page }) => {
      await navigateToPage(page, '/task');
      const taskTitle = page.locator('button[type="button"].w-full.text-left').first();
      if (await taskTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await taskTitle.click();
      }
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
      await page
        .locator('[role="dialog"]')
        .getByText(/コメント/)
        .first()
        .waitFor({ timeout: 10000 })
        .catch(() => null);
      const commentInput = page.locator('[role="dialog"] textarea').first();
      if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await commentInput.fill('動作確認用のコメントを投稿します。');
        await page
          .locator('[role="dialog"]')
          .getByRole('button', { name: /コメント投稿/ })
          .click();
        // コメント投稿ミューテーションと再取得の完了待ち
        await settle(page);
      }
      await screenshot(page, 'task-detail-comment-posted.png');
    });

    test('task comment edit UI', async ({ page }) => {
      await navigateToPage(page, '/task');
      const taskTitle = page.locator('button[type="button"].w-full.text-left').first();
      if (await taskTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await taskTitle.click();
      }
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
      await page
        .locator('[role="dialog"]')
        .getByText(/コメント/)
        .first()
        .waitFor({ timeout: 10000 })
        .catch(() => null);
      await settle(page);
      // 編集ボタンはログインユーザー自身のコメントにしか表示されないため、
      // このテスト専用のコメントを投稿してから編集する
      const commentInput = page.locator('[role="dialog"] textarea').first();
      if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await commentInput.fill('スクリーンショット撮影用の一時コメントです。');
        await page
          .locator('[role="dialog"]')
          .getByRole('button', { name: /コメント投稿/ })
          .click();
        // コメント投稿ミューテーションと再取得の完了待ち
        await settle(page);
      }
      const commentEditBtn = page.locator('[role="dialog"] button:has(svg.lucide-pencil)').first();
      if (await commentEditBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await commentEditBtn.click();
        // 編集フォームへの切り替えアニメーション収束待ち
        await waitForAnimation(page);
      }
      await screenshot(page, 'task-comment-edit.png');
    });

    test('task timer', async ({ page }) => {
      await navigateToPage(page, '/task');
      const timerBtn = page.getByRole('button', { name: /時間を記録/ }).first();
      if (await timerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await timerBtn.click();
        // タイマー開始ミューテーションの完了待ち
        await settle(page);
      }
      await screenshot(page, 'task-timer.png');
    });

    // --- マイタスク ---
    test('my task page', async ({ page }) => {
      await navigateToPage(page, '/my-task');
      await expect(page.locator('body')).toBeVisible();
      await screenshot(page, 'my-task.png');
    });

    // --- 検索 ---
    test('search page - initial', async ({ page }) => {
      await navigateToPage(page, '/search');
      await expect(page.locator('body')).toBeVisible();
      await screenshot(page, 'search.png');
    });

    test('search page - with results', async ({ page }) => {
      await navigateToPage(page, '/search');
      const searchInput = page.locator('#keyword');
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('デザイン');
        // ライブ検索: 入力後はデバウンスを経て検索リクエストが飛ぶ。その完了を待つ
        await settle(page);
      }
      await screenshot(page, 'search-results.png');
    });

    // --- レポート ---
    test('report page', async ({ page }) => {
      await navigateToPage(page, '/report');
      // Rechartsのチャート描画アニメーション収束待ち
      await waitForAnimation(page, 3000);
      await expect(page.locator('body')).toBeVisible();
      await screenshot(page, 'report.png');
    });

    test('weekly report page', async ({ page }) => {
      await navigateToPage(page, '/report');
      // Rechartsのチャート描画アニメーション収束待ち
      await waitForAnimation(page, 2000);
      const weeklyTab = page
        .getByRole('tab', { name: /週次|weekly/i })
        .or(page.getByRole('link', { name: /週次|weekly/i }))
        .first();
      if (await weeklyTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await weeklyTab.click();
        // タブ切替後のチャート再描画アニメーション収束待ち
        await waitForAnimation(page, 2000);
      }
      await screenshot(page, 'report-weekly.png');
    });

    // --- プロフィール ---
    test('profile page', async ({ page }) => {
      await navigateToProfile(page);
      await screenshot(page, 'profile.png');
    });

    test('change password page', async ({ page }) => {
      await navigateToProfile(page);
      // プロフィールページの「パスワード変更」ボタンをクリック（router.push使用のためSPA遷移）
      const changePwBtn = page
        .getByRole('button', { name: /パスワード変更|パスワード/i })
        .or(page.getByRole('link', { name: /パスワード変更|パスワード/i }))
        .first();
      if (await changePwBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await changePwBtn.click();
        await settle(page);
      } else {
        // ボタンが見つからない場合はページ内リンクを探す
        const link = page.locator('a[href="/profile/change-password"]').first();
        if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
          await link.click();
          await settle(page);
        }
      }
      await screenshot(page, 'change-password.png');
    });

    // --- ユーザー管理 ---
    test('user list (admin view)', async ({ page }) => {
      await navigateToPage(page, '/user');
      await screenshot(page, 'user-list.png');
    });

    // --- プロジェクト詳細 ---
    test('プロジェクト詳細 - メンバーセクション表示', async ({ page }) => {
      await openFirstProjectDetail(page);
      const memberSection = page.getByText(/メンバー \(/).first();
      if (await memberSection.isVisible({ timeout: 3000 }).catch(() => false)) {
        await memberSection.scrollIntoViewIfNeeded();
        // スムーズスクロールの収束待ち
        await waitForAnimation(page);
      }
      await screenshot(page, 'project-detail-members.png');
    });

    test('プロジェクト詳細 - タスクセクション表示', async ({ page }) => {
      await openFirstProjectDetail(page);
      const tasksSection = page.getByText(/タスク \(/).first();
      if (await tasksSection.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tasksSection.scrollIntoViewIfNeeded();
        // スムーズスクロールの収束待ち
        await waitForAnimation(page);
      }
      await screenshot(page, 'project-detail-tasks.png');
    });

    test('プロジェクト詳細 - アーカイブボタン表示', async ({ page }) => {
      await openFirstProjectDetail(page);
      const archiveBtn = page.getByRole('button', { name: /アーカイブ/i }).first();
      if (await archiveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await archiveBtn.scrollIntoViewIfNeeded();
        // スムーズスクロールの収束待ち
        await waitForAnimation(page);
      }
      await screenshot(page, 'project-detail-archive-action.png');
    });

    // --- タスク一括操作 ---
    test('タスク一括操作 - 複数チェックボックス選択', async ({ page }) => {
      await navigateToPage(page, '/task');
      const checkboxes = page.locator('input[type="checkbox"], button[role="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 1; i < Math.min(4, count); i++) {
        const cb = checkboxes.nth(i);
        if (await cb.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cb.click();
          // チェックボックス選択のトグルアニメーション収束待ち
          await waitForAnimation(page, 200);
        }
      }
      // 選択状態に応じたアクションバー表示アニメーション収束待ち
      await waitForAnimation(page);
      await screenshot(page, 'bulk-task-operations.png');
    });

    test('タスク行のチェックボックス表示', async ({ page }) => {
      await navigateToPage(page, '/task');
      const firstRow = page
        .locator('tr:has(input[type="checkbox"], button[role="checkbox"])')
        .first();
      if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstRow.scrollIntoViewIfNeeded();
        // スムーズスクロールの収束待ち
        await waitForAnimation(page);
      }
      await screenshot(page, 'task-row-with-checkbox.png');
    });

    test('タスク全選択チェックボックス', async ({ page }) => {
      await navigateToPage(page, '/task');
      const selectAll = page
        .locator('thead input[type="checkbox"], thead button[role="checkbox"]')
        .first();
      if (await selectAll.isVisible({ timeout: 3000 }).catch(() => false)) {
        await selectAll.click();
        // 全選択のトグルアニメーション収束待ち
        await waitForAnimation(page);
      } else {
        const firstCheckbox = page
          .locator('input[type="checkbox"], button[role="checkbox"]')
          .first();
        if (await firstCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
          await firstCheckbox.click();
          // チェックボックス選択のトグルアニメーション収束待ち
          await waitForAnimation(page);
        }
      }
      await screenshot(page, 'select-all-checkbox.png');
    });

    test('タスク選択時のアクションバー', async ({ page }) => {
      await navigateToPage(page, '/task');
      const checkboxes = page.locator('input[type="checkbox"], button[role="checkbox"]');
      const count = await checkboxes.count();
      if (count > 1) {
        await checkboxes.nth(1).click();
        // 選択状態に応じたアクションバー表示アニメーション収束待ち
        await waitForAnimation(page);
      } else if (count > 0) {
        await checkboxes.first().click();
        // 選択状態に応じたアクションバー表示アニメーション収束待ち
        await waitForAnimation(page);
      }
      await screenshot(page, 'bulk-operation-header.png');
    });

    test('タスク一括完了実行後', async ({ page }) => {
      await navigateToPage(page, '/task');
      const checkboxes = page.locator('input[type="checkbox"], button[role="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 1; i < Math.min(3, count); i++) {
        const cb = checkboxes.nth(i);
        if (await cb.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cb.click();
          // チェックボックス選択のトグルアニメーション収束待ち
          await waitForAnimation(page, 200);
        }
      }
      // 選択状態に応じたアクションバー表示アニメーション収束待ち
      await waitForAnimation(page);
      const completeBtn = page.getByRole('button', { name: /一括.*完了|完了/i }).first();
      if (await completeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await completeBtn.click();
        // 一括完了ミューテーションと再取得の完了待ち
        await settle(page);
      }
      await screenshot(page, 'bulk-operations-complete.png');
    });

    // --- ユーザー詳細 ---
    test('ユーザー詳細ページ全体', async ({ page }) => {
      await navigateToPage(page, '/user');
      const userLink = page.locator('button[title="詳細"]').first();
      if (await userLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await userLink.click();
        // 初回アクセス時はNext.js dev serverのオンデマンドコンパイルが走るため、
        // 固定waitではなく詳細ページ特有の要素を待つ
        await page
          .getByText('ユーザー一覧に戻る')
          .waitFor({ timeout: 15000 })
          .catch(() => null);
        await settle(page);
      }
      await screenshot(page, 'user-detail-page.png');
    });

    test('ユーザー詳細ローディング状態', async ({ page }) => {
      await navigateToPage(page, '/user');
      const userLink = page.locator('button[title="詳細"]').first();
      if (await userLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await userLink.click();
        // URL遷移（クライアントサイドナビゲーション）だけを待ち、
        // データ取得完了は待たずにスクリーンショットしてローディング状態を捉える
        await page.waitForURL(/\/user\/[^/]+$/, { timeout: 10000 }).catch(() => null);
        await screenshot(page, 'user-detail-skeleton.png');
        return;
      }
      await screenshot(page, 'user-detail-skeleton.png');
    });

    test('ユーザー詳細 - プロジェクト・タスクセクション', async ({ page }) => {
      await navigateToPage(page, '/user');
      const userLink = page.locator('button[title="詳細"]').first();
      if (await userLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await userLink.click();
        // 初回アクセス時はNext.js dev serverのオンデマンドコンパイルが走るため、
        // 固定waitではなく詳細ページ特有の要素を待つ
        await page
          .getByText('ユーザー一覧に戻る')
          .waitFor({ timeout: 15000 })
          .catch(() => null);
        await settle(page);
      }
      const projectSection = page.getByText(/プロジェクト|担当/i).first();
      if (await projectSection.isVisible({ timeout: 3000 }).catch(() => false)) {
        await projectSection.scrollIntoViewIfNeeded();
        // スムーズスクロールの収束待ち
        await waitForAnimation(page);
      }
      await screenshot(page, 'user-detail-projects-tasks.png');
    });

    test('ユーザー編集フォーム', async ({ page }) => {
      await navigateToPage(page, '/user');
      const userLink = page.locator('button[title="詳細"]').first();
      if (await userLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await userLink.click();
        // 初回アクセス時はNext.js dev serverのオンデマンドコンパイルが走るため、
        // 固定waitではなく詳細ページ特有の要素を待つ
        await page
          .getByText('ユーザー一覧に戻る')
          .waitFor({ timeout: 15000 })
          .catch(() => null);
        await settle(page);
      }
      // ユーザー詳細ページの編集ボタンをクリック
      const editBtn = page.getByRole('button', { name: /編集/i }).first();
      if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editBtn.click();
        // 初回アクセス時はNext.js dev serverのオンデマンドコンパイルが走るため、
        // 固定waitではなく編集ページ特有の要素を待つ
        await page
          .getByText('ユーザー編集', { exact: true })
          .waitFor({ timeout: 15000 })
          .catch(() => null);
        await settle(page);
      }
      await screenshot(page, 'user-edit-form.png');
    });

    // --- プロフィール編集 ---
    test('自己プロフィール編集フォーム', async ({ page }) => {
      await navigateToProfile(page);
      // プロフィールページの「編集」ボタンをクリック（router.push使用のためSPA遷移）
      const editBtn = page.getByRole('button', { name: /編集|プロフィールを編集/i }).first();
      const editLink = page.locator('a[href="/profile/edit"]').first();
      if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editBtn.click();
        await settle(page);
      } else if (await editLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editLink.click();
        await settle(page);
      }
      await screenshot(page, 'profile-edit.png');
    });

    // --- プロジェクト削除確認 ---
    test('プロジェクト削除確認ダイアログ', async ({ page }) => {
      await navigateToPage(page, '/project');
      const deleteBtn = page.getByRole('button', { name: /Webサイトリニューアルを削除/ }).first();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click();
        await page
          .waitForSelector('[role="alertdialog"], [role="dialog"]:has-text("削除")', {
            timeout: 3000,
          })
          .catch(() => null);
        // 確認ダイアログの開閉アニメーション収束待ち
        await waitForAnimation(page);
      }
      await screenshot(page, 'project-delete-confirm.png');
    });
  });
});
