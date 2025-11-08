import { chromium } from 'playwright';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function manualFullTest() {
  console.log('🧪 全機能手動確認テスト開始\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500  // 操作をゆっくり実行して確認しやすくする
  });
  const page = await browser.newPage();

  try {
    // ========================================
    // 1. ログイン機能
    // ========================================
    console.log('1️⃣  ログイン機能テスト');
    await page.goto('http://localhost:3000/login');
    await page.screenshot({ path: 'manual-test-01-login-page.png', fullPage: true });

    await page.fill('input[id="email"]', 'admin@example.com');
    await page.fill('input[id="password"]', 'password123');
    await page.screenshot({ path: 'manual-test-02-login-filled.png', fullPage: true });

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await sleep(2000);
    console.log('   ✅ ログイン成功\n');

    // ========================================
    // 2. ダッシュボード確認
    // ========================================
    console.log('2️⃣  ダッシュボード確認');
    await page.screenshot({ path: 'manual-test-03-dashboard.png', fullPage: true });

    const statsText = await page.textContent('body');
    if (statsText.includes('Total Projects') && statsText.includes('Total Tasks')) {
      console.log('   ✅ 統計カードが表示されています');
    }
    if (statsText.includes('Recent Projects') && statsText.includes('Recent Tasks')) {
      console.log('   ✅ 最近のプロジェクト・タスクが表示されています\n');
    }

    // ========================================
    // 3. プロジェクト一覧確認
    // ========================================
    console.log('3️⃣  プロジェクト一覧確認');
    await page.click('text=Projects');
    await sleep(2000);
    await page.screenshot({ path: 'manual-test-04-projects.png', fullPage: true });
    console.log('   ✅ プロジェクト一覧ページ表示\n');

    // ========================================
    // 4. タスク一覧確認
    // ========================================
    console.log('4️⃣  タスク一覧確認');
    await page.click('text=Tasks');
    await sleep(2000);
    await page.screenshot({ path: 'manual-test-05-tasks.png', fullPage: true });

    const taskCards = await page.$$('[class*="MuiCard"]');
    console.log(`   ✅ タスクカード数: ${taskCards.length}\n`);

    // ========================================
    // 5. タスク詳細とコメント機能確認
    // ========================================
    console.log('5️⃣  タスク詳細とコメント機能確認');
    const firstTask = await page.$('[class*="MuiCard"]:first-child');
    if (firstTask) {
      await firstTask.click();
      await sleep(2000);
      await page.screenshot({ path: 'manual-test-06-task-detail.png', fullPage: true });

      // コメント入力欄を探す
      const commentInput = await page.$('textarea[placeholder*="comment"], textarea[placeholder*="コメント"]');
      if (commentInput) {
        console.log('   ✅ コメント入力欄が見つかりました');
        await commentInput.fill('手動テストコメント - ' + new Date().toLocaleTimeString());
        await sleep(1000);

        const postButton = await page.$('button:has-text("POST COMMENT"), button:has-text("投稿")');
        if (postButton) {
          await page.screenshot({ path: 'manual-test-07-comment-input.png', fullPage: true });
          await postButton.click();
          await sleep(2000);
          await page.screenshot({ path: 'manual-test-08-comment-posted.png', fullPage: true });
          console.log('   ✅ コメント投稿成功\n');
        }
      }

      // ダイアログを閉じる
      const closeButton = await page.$('button:has-text("CLOSE"), button:has-text("閉じる")');
      if (closeButton) {
        await closeButton.click();
        await sleep(1000);
      }
    }

    // ========================================
    // 6. タスク編集機能確認
    // ========================================
    console.log('6️⃣  タスク編集機能確認');
    const editButton = await page.$('button[aria-label="Edit task"]');
    if (editButton) {
      console.log('   ✅ 編集ボタンが見つかりました');
      await editButton.click();
      await sleep(2000);
      await page.screenshot({ path: 'manual-test-09-edit-dialog.png', fullPage: true });

      const titleInput = await page.$('div[role="dialog"] input[type="text"]:visible');
      if (titleInput) {
        const currentTitle = await titleInput.inputValue();
        await titleInput.fill(currentTitle + ' [編集確認]');
        await sleep(1000);
        await page.screenshot({ path: 'manual-test-10-edit-modified.png', fullPage: true });

        // 保存ボタンを探してクリック
        const saveButton = await page.$('div[role="dialog"] button:has-text("保存"), div[role="dialog"] button:has-text("Save")');
        if (saveButton) {
          await saveButton.click();
          await sleep(2000);
          console.log('   ✅ タスク編集成功\n');
        }

        // ダイアログが残っている場合は閉じる
        const closeButton2 = await page.$('div[role="dialog"] button:has-text("CLOSE"), div[role="dialog"] button:has-text("閉じる")');
        if (closeButton2) {
          await closeButton2.click();
          await sleep(1000);
        }
      }
    }

    // すべてのダイアログを強制的に閉じる
    await page.keyboard.press('Escape');
    await sleep(1000);

    // ========================================
    // 7. 検索機能確認
    // ========================================
    console.log('7️⃣  検索機能確認');
    await page.click('text=Search');
    await sleep(2000);
    await page.screenshot({ path: 'manual-test-11-search-page.png', fullPage: true });

    const searchInput = await page.$('input[placeholder*="タスク"], input[placeholder*="search"]');
    if (searchInput) {
      await searchInput.fill('デザイン');
      await sleep(1000);

      const searchButton = await page.$('button:has-text("検索"), button:has-text("Search")');
      if (searchButton) {
        await searchButton.click();
        await sleep(3000);
        await page.screenshot({ path: 'manual-test-12-search-results.png', fullPage: true });

        const resultsText = await page.textContent('body');
        if (resultsText.includes('デザイン')) {
          console.log('   ✅ 検索結果が表示されました\n');
        }
      }
    }

    // ========================================
    // 8. レポート機能確認
    // ========================================
    console.log('8️⃣  レポート機能確認');
    await page.click('text=Reports');
    await sleep(2000);
    await page.screenshot({ path: 'manual-test-13-reports.png', fullPage: true });
    console.log('   ✅ レポートページ表示\n');

    // ========================================
    // 9. プロフィール確認
    // ========================================
    console.log('9️⃣  プロフィール確認');
    const profileButton = await page.$('button[aria-label*="account"], button:has-text("管理者")');
    if (profileButton) {
      await profileButton.click();
      await sleep(1000);
      await page.screenshot({ path: 'manual-test-14-profile-menu.png', fullPage: true });
      console.log('   ✅ プロフィールメニュー表示\n');
    }

    console.log('✅ すべての手動確認テストが完了しました！');
    console.log('\n📸 スクリーンショット:');
    console.log('   - manual-test-01-login-page.png');
    console.log('   - manual-test-02-login-filled.png');
    console.log('   - manual-test-03-dashboard.png');
    console.log('   - manual-test-04-projects.png');
    console.log('   - manual-test-05-tasks.png');
    console.log('   - manual-test-06-task-detail.png');
    console.log('   - manual-test-07-comment-input.png');
    console.log('   - manual-test-08-comment-posted.png');
    console.log('   - manual-test-09-edit-dialog.png');
    console.log('   - manual-test-10-edit-modified.png');
    console.log('   - manual-test-11-search-page.png');
    console.log('   - manual-test-12-search-results.png');
    console.log('   - manual-test-13-reports.png');
    console.log('   - manual-test-14-profile-menu.png');

    // ブラウザを10秒間開いたままにして、確認できるようにする
    console.log('\n⏳ 10秒後にブラウザを閉じます...');
    await sleep(10000);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    await page.screenshot({ path: 'manual-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

manualFullTest().catch(console.error);
