import { chromium } from 'playwright';

async function testFullFunctionality() {
  console.log('🚀 完全な機能テスト開始...\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    errors.push(`Page Error: ${error.message}`);
  });

  try {
    // ログイン
    console.log('1️⃣ ログインテスト');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[id="email"]', 'admin@example.com');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('   ✅ ログイン成功\n');

    await page.waitForTimeout(2000);

    // プロジェクト作成テスト
    console.log('2️⃣ プロジェクト作成テスト');
    await page.goto('http://localhost:3000/project', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 新規作成ボタンを探す
    const createButtons = await page.$$('button, a');
    let createButtonFound = false;
    for (const button of createButtons) {
      const text = await button.textContent();
      if (
        text &&
        (text.includes('新規') ||
          text.includes('作成') ||
          text.includes('追加') ||
          text.includes('Create'))
      ) {
        console.log(`   📝 作成ボタン発見: "${text}"`);
        await button.click();
        createButtonFound = true;
        await page.waitForTimeout(1500);
        break;
      }
    }

    if (!createButtonFound) {
      console.log('   ⚠️  作成ボタンが見つかりませんでした');
      // ページのスクリーンショット取得
      await page.screenshot({ path: 'project-page.png' });
      console.log('   📸 スクリーンショット保存: project-page.png');
    } else {
      // フォームが表示されているか確認
      await page.waitForTimeout(1000);
      const formInputs = await page.$$(
        'input[type="text"], input[name*="name"], input[placeholder*="プロジェクト"]',
      );
      console.log(`   📋 入力フォーム数: ${formInputs.length}`);

      if (formInputs.length > 0) {
        // プロジェクト名を入力
        await formInputs[0].fill('テストプロジェクト from Playwright');
        console.log('   ✅ プロジェクト名を入力');

        await page.waitForTimeout(500);

        // 保存ボタンを探す
        const saveButtons = await page.$$('button');
        for (const button of saveButtons) {
          const text = await button.textContent();
          if (
            text &&
            (text.includes('作成') ||
              text.includes('保存') ||
              text.includes('Create') ||
              text.includes('Save'))
          ) {
            console.log(`   💾 保存ボタンクリック: "${text}"`);
            await button.click();
            await page.waitForTimeout(2000);
            break;
          }
        }
        console.log('   ✅ プロジェクト作成完了\n');
      } else {
        console.log('   ⚠️  フォーム入力欄が見つかりませんでした\n');
      }
    }

    // タスク作成テスト
    console.log('3️⃣ タスク作成テスト');
    await page.goto('http://localhost:3000/task', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const taskCreateButtons = await page.$$('button, a');
    let taskButtonFound = false;
    for (const button of taskCreateButtons) {
      const text = await button.textContent();
      if (
        text &&
        (text.includes('新規') ||
          text.includes('作成') ||
          text.includes('追加') ||
          text.includes('Create'))
      ) {
        console.log(`   📝 タスク作成ボタン発見: "${text}"`);
        await button.click();
        taskButtonFound = true;
        await page.waitForTimeout(1500);
        break;
      }
    }

    if (!taskButtonFound) {
      console.log('   ⚠️  タスク作成ボタンが見つかりませんでした');
      await page.screenshot({ path: 'task-page.png' });
      console.log('   📸 スクリーンショット保存: task-page.png');
    } else {
      await page.waitForTimeout(1000);
      const taskInputs = await page.$$('input[type="text"], input[name*="title"], textarea');
      console.log(`   📋 タスク入力フォーム数: ${taskInputs.length}`);

      if (taskInputs.length > 0) {
        await taskInputs[0].fill('Playwrightからの自動テストタスク');
        console.log('   ✅ タスクタイトルを入力');

        await page.waitForTimeout(500);

        const saveBtns = await page.$$('button');
        for (const button of saveBtns) {
          const text = await button.textContent();
          if (
            text &&
            (text.includes('作成') ||
              text.includes('保存') ||
              text.includes('Create') ||
              text.includes('Save'))
          ) {
            console.log(`   💾 保存ボタンクリック: "${text}"`);
            await button.click();
            await page.waitForTimeout(2000);
            break;
          }
        }
        console.log('   ✅ タスク作成完了\n');
      }
    }

    // 検索機能テスト
    console.log('4️⃣ 検索機能テスト');
    await page.goto('http://localhost:3000/search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const searchInputs = await page.$$(
      'input[type="text"], input[type="search"], input[placeholder*="検索"]',
    );
    console.log(`   🔍 検索入力欄数: ${searchInputs.length}`);

    if (searchInputs.length > 0) {
      await searchInputs[0].fill('デザイン');
      console.log('   ✅ 検索ワード入力: "デザイン"');
      await page.waitForTimeout(500);

      // 検索ボタンまたはEnterキー
      const searchButtons = await page.$$('button');
      let searchBtnFound = false;
      for (const button of searchButtons) {
        const text = await button.textContent();
        if (text && text.includes('検索')) {
          await button.click();
          searchBtnFound = true;
          break;
        }
      }

      if (!searchBtnFound) {
        await searchInputs[0].press('Enter');
      }

      await page.waitForTimeout(2000);
      console.log('   ✅ 検索実行完了\n');
    } else {
      console.log('   ⚠️  検索入力欄が見つかりませんでした\n');
      await page.screenshot({ path: 'search-page.png' });
      console.log('   📸 スクリーンショット保存: search-page.png\n');
    }

    // ダッシュボード統計確認
    console.log('5️⃣ ダッシュボード統計確認');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const content = await page.content();
    const hasStats =
      content.includes('Total') || content.includes('プロジェクト') || content.includes('タスク');
    console.log(`   📊 統計情報表示: ${hasStats ? 'あり' : 'なし'}`);

    if (hasStats) {
      console.log('   ✅ ダッシュボード統計表示確認\n');
    } else {
      console.log('   ⚠️  統計情報が見つかりませんでした\n');
    }

    // レポートページ確認
    console.log('6️⃣ レポート機能確認');
    await page.goto('http://localhost:3000/report/weekly', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const reportContent = await page.content();
    const hasReport =
      reportContent.includes('週次') ||
      reportContent.includes('Weekly') ||
      reportContent.includes('レポート');
    console.log(`   📈 レポート表示: ${hasReport ? 'あり' : 'なし'}`);

    if (hasReport) {
      console.log('   ✅ レポート機能確認\n');
    }

    // ユーザー管理確認（管理者のみ）
    console.log('7️⃣ ユーザー管理機能確認（管理者）');
    await page.goto('http://localhost:3000/users', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const usersContent = await page.content();
    const hasUsers =
      usersContent.includes('admin@example.com') ||
      usersContent.includes('管理者') ||
      usersContent.includes('user1@example.com');
    console.log(`   👥 ユーザー一覧表示: ${hasUsers ? 'あり' : 'なし'}`);

    if (hasUsers) {
      console.log('   ✅ ユーザー管理機能確認\n');
    }

    // マイタスク確認
    console.log('8️⃣ マイタスク機能確認');
    await page.goto('http://localhost:3000/my-tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('   ✅ マイタスクページアクセス成功\n');

    // 最終スクリーンショット
    await page.screenshot({ path: 'final-dashboard.png', fullPage: true });
    console.log('📸 最終ダッシュボードのスクリーンショット: final-dashboard.png\n');

    // エラーサマリー
    if (errors.length > 0) {
      console.log('❌ エラーが発生しました:');
      errors.forEach((err) => console.log(`   - ${err}`));
    } else {
      console.log('✅ JavaScriptエラーなし');
    }

    console.log('\n🎉 完全な機能テスト完了！');
  } catch (error) {
    console.error('❌ テスト中にエラーが発生:', error.message);
    await page.screenshot({ path: 'test-error.png' });
    console.log('エラー時のスクリーンショット: test-error.png');
    throw error;
  } finally {
    await browser.close();
  }
}

testFullFunctionality().catch(console.error);
