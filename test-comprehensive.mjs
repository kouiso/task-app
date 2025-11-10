import { chromium } from 'playwright';

async function test() {
  console.log('🚀 完全機能テスト開始\n');
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  const results = {
    login: false,
    projectCreate: false,
    taskCreate: false,
    taskEdit: false,
    taskDelete: false,
    search: false,
    dashboard: false,
  };

  try {
    // 1. ログインテスト
    console.log('1️⃣  ログインテスト');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[id="email"]', 'admin@example.com');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    results.login = true;
    console.log('   ✅ ログイン成功\n');

    // 2. プロジェクト作成テスト
    console.log('2️⃣  プロジェクト作成テスト');
    await page.goto('http://localhost:3000/project', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.click('button:has-text("New Project")');
    await page.waitForSelector('div[role="dialog"]', { state: 'visible' });

    const projectNameInput = await page.$('div[role="dialog"] input[type="text"]:visible');
    await projectNameInput.fill('テストプロジェクト2025');

    const projectDescTextarea = await page.$('div[role="dialog"] textarea:visible');
    if (projectDescTextarea) {
      await projectDescTextarea.fill('2025年の完全テストプロジェクト');
    }

    await page.waitForSelector('button:has-text("Create"):not([disabled])', { timeout: 5000 });
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(2000);

    const projectPageContent = await page.textContent('body');
    if (projectPageContent.includes('テストプロジェクト2025')) {
      results.projectCreate = true;
      console.log('   ✅ プロジェクト作成成功\n');
    } else {
      console.log('   ⚠️  プロジェクトが見つかりません\n');
    }

    // 3. タスク作成テスト
    console.log('3️⃣  タスク作成テスト');
    await page.goto('http://localhost:3000/task', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.click('button:has-text("New Task")');
    await page.waitForSelector('div[role="dialog"]', { state: 'visible' });
    await page.waitForTimeout(500);

    const taskTitleInput = await page.$('div[role="dialog"] input[type="text"]:visible');
    await taskTitleInput.fill('完全テストタスク');

    const taskDescTextarea = await page.$('div[role="dialog"] textarea:visible');
    if (taskDescTextarea) {
      await taskDescTextarea.fill('このタスクは全機能テスト用です');
    }

    // プロジェクト選択
    const projectSelectDiv = await page.$(
      'div[role="dialog"] .MuiGrid-item:nth-child(5) .MuiSelect-select',
    );
    if (projectSelectDiv) {
      await projectSelectDiv.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });

      // "テストプロジェクト2025"を探して選択
      const options = await page.$$('[role="option"]');
      let found = false;
      for (const option of options) {
        const text = await option.textContent();
        if (text.includes('テストプロジェクト2025')) {
          await option.click();
          found = true;
          console.log('   ✅ プロジェクト選択: テストプロジェクト2025');
          break;
        }
      }

      if (!found && options.length > 0) {
        await options[options.length - 1].click(); // 最後のプロジェクトを選択
        console.log('   ⚠️  テストプロジェクトが見つからず、他のプロジェクトを選択');
      }

      await page.waitForTimeout(500);
    }

    await page.waitForSelector('button:has-text("Create"):not([disabled])', { timeout: 5000 });
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(2000);

    const taskPageContent = await page.textContent('body');
    if (taskPageContent.includes('完全テストタスク')) {
      results.taskCreate = true;
      console.log('   ✅ タスク作成成功\n');
    } else {
      console.log('   ⚠️  タスクが見つかりません\n');
    }

    // 4. タスク編集テスト
    console.log('4️⃣  タスク編集テスト');
    await page.waitForTimeout(1000);

    // タスクカードの編集ボタンを探す
    const editButtons = await page.$$('button[aria-label*="edit"], button:has-text("edit")');
    if (editButtons.length > 0) {
      await editButtons[0].click();
      await page.waitForSelector('div[role="dialog"]', { state: 'visible' });
      await page.waitForTimeout(500);

      const editTitleInput = await page.$('div[role="dialog"] input[type="text"]:visible');
      const currentTitle = await editTitleInput.inputValue();
      await editTitleInput.fill(currentTitle + ' (編集済み)');

      await page.waitForSelector(
        'button:has-text("Update"):not([disabled]), button:has-text("Save"):not([disabled])',
        { timeout: 5000 },
      );
      const updateButton = await page.$('button:has-text("Update"), button:has-text("Save")');
      if (updateButton) {
        await updateButton.click();
        await page.waitForTimeout(2000);

        const updatedContent = await page.textContent('body');
        if (updatedContent.includes('編集済み')) {
          results.taskEdit = true;
          console.log('   ✅ タスク編集成功\n');
        } else {
          console.log('   ⚠️  編集が反映されていません\n');
        }
      }
    } else {
      console.log('   ⚠️  編集ボタンが見つかりません\n');
    }

    // 5. 検索機能テスト
    console.log('5️⃣  検索機能テスト');
    await page.goto('http://localhost:3000/search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const searchInput = await page.$('input[type="text"], input[type="search"]');
    if (searchInput) {
      await searchInput.fill('デザイン');
      await page.waitForTimeout(1500);

      const searchResults = await page.textContent('body');
      if (searchResults.includes('デザイン')) {
        results.search = true;
        console.log('   ✅ 検索成功: 結果が表示されました\n');
      } else {
        console.log('   ⚠️  検索結果が見つかりません\n');
      }
    } else {
      console.log('   ⚠️  検索入力欄が見つかりません\n');
    }

    // 6. ダッシュボード統計テスト
    console.log('6️⃣  ダッシュボード統計テスト');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const dashboardContent = await page.textContent('body');
    const hasProjectStats =
      dashboardContent.includes('Total Projects') || dashboardContent.includes('プロジェクト');
    const hasTaskStats =
      dashboardContent.includes('Total Tasks') || dashboardContent.includes('タスク');

    if (hasProjectStats && hasTaskStats) {
      results.dashboard = true;
      console.log('   ✅ ダッシュボード統計表示成功\n');
    } else {
      console.log('   ⚠️  統計情報が不完全です\n');
    }

    // スクリーンショット
    await page.screenshot({ path: 'test-comprehensive-result.png', fullPage: true });
    console.log('📸 スクリーンショット: test-comprehensive-result.png\n');
  } catch (error) {
    console.error('❌ エラー:', error.message);
    await page.screenshot({ path: 'test-comprehensive-error.png' });
  } finally {
    // 結果サマリー
    console.log('\n📊 テスト結果サマリー:');
    console.log(`   ログイン: ${results.login ? '✅' : '❌'}`);
    console.log(`   プロジェクト作成: ${results.projectCreate ? '✅' : '❌'}`);
    console.log(`   タスク作成: ${results.taskCreate ? '✅' : '❌'}`);
    console.log(`   タスク編集: ${results.taskEdit ? '✅' : '❌'}`);
    console.log(`   タスク削除: ${results.taskDelete ? '✅' : '⏭️ '}`);
    console.log(`   検索機能: ${results.search ? '✅' : '❌'}`);
    console.log(`   ダッシュボード: ${results.dashboard ? '✅' : '❌'}`);

    const successCount = Object.values(results).filter((r) => r === true).length;
    const totalCount = Object.keys(results).length;
    console.log(
      `\n✅ 成功: ${successCount}/${totalCount} (${Math.round((successCount / totalCount) * 100)}%)\n`,
    );

    await browser.close();
  }
}

test().catch(console.error);
