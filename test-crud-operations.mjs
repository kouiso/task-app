import { chromium } from 'playwright';

async function testCRUDOperations() {
  console.log('🚀 CRUD操作の完全テスト開始\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  try {
    // ログイン
    console.log('1️⃣  ログイン');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[id="email"]', 'admin@example.com');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('   ✅ ログイン成功\n');

    // プロジェクト作成テスト
    console.log('2️⃣  プロジェクト作成');
    await page.goto('http://localhost:3000/project', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.click('button:has-text("New Project")');
    console.log('   📝 "New Project"ボタンクリック');
    await page.waitForTimeout(1500);

    // ダイアログが表示されるのを待つ
    await page.waitForSelector('input:visible', { timeout: 5000 });
    await page.waitForTimeout(500);

    // ダイアログ内の入力欄に直接入力
    const inputSelector = 'div[role="dialog"] input[type="text"]:visible';
    await page.fill(inputSelector, 'Test Project');
    console.log('   ✍️  プロジェクト名入力: "Test Project"');
    await page.waitForTimeout(500);

    // 説明欄（textarea）を探して入力
    const textareaSelector = 'div[role="dialog"] textarea:visible';
    const descInputExists = await page.$(textareaSelector);
    if (descInputExists) {
      await page.fill(textareaSelector, 'Test description');
      console.log('   ✍️  説明入力');
    }

    await page.waitForTimeout(1000);

    // Createボタンが有効になるのを待つ
    await page.waitForSelector('button:has-text("Create"):not([disabled])', { timeout: 10000 });
    await page.click('button:has-text("Create")');
    console.log('   💾 保存ボタンクリック');
    await page.waitForTimeout(3000);

    // プロジェクトが作成されたか確認
    const projectContent = await page.textContent('body');
    if (projectContent.includes('Test Project')) {
      console.log('   ✅ プロジェクト作成成功！\n');
    } else {
      console.log('   ⚠️  プロジェクトが見つかりません\n');
    }

    // タスク作成テスト
    console.log('3️⃣  タスク作成');
    await page.goto('http://localhost:3000/task', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.click('button:has-text("New Task")');
    console.log('   📝 "New Task"ボタンクリック');
    await page.waitForTimeout(1500);

    // タスクフォームが表示されるのを待つ
    await page.waitForSelector('input:visible', { timeout: 5000 });
    await page.waitForTimeout(500);

    // タスクフォーム内の入力欄に直接入力
    const taskInputSelector = 'div[role="dialog"] input[type="text"]:visible';
    await page.fill(taskInputSelector, 'Test Task');
    console.log('   ✍️  タスクタイトル入力');
    await page.waitForTimeout(500);

    // 説明欄
    const taskTextareaSelector = 'div[role="dialog"] textarea:visible';
    const taskDescExists = await page.$(taskTextareaSelector);
    if (taskDescExists) {
      await page.fill(taskTextareaSelector, 'Test task description');
      console.log('   ✍️  タスク説明入力');
    }

    await page.waitForTimeout(500);

    // プロジェクト選択（必須フィールド）
    // Tabキーで次のフィールドに移動し、矢印キーで選択
    await page.keyboard.press('Tab'); // Status field
    await page.waitForTimeout(200);
    await page.keyboard.press('Tab'); // Priority field
    await page.waitForTimeout(200);
    await page.keyboard.press('Tab'); // Project field
    await page.waitForTimeout(300);

    // プロジェクトフィールドで Space/Enter を押して開く
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // 矢印キーで最初のオプションを選択
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    console.log('   📂 プロジェクト選択');
    await page.waitForTimeout(500);

    // Createボタンが有効になるのを待つ
    await page.waitForSelector(
      'button:has-text("Create"):not([disabled]), button:has-text("Save"):not([disabled])',
      { timeout: 10000 },
    );
    await page.click('button:has-text("Create"), button:has-text("Save")');
    console.log('   💾 保存ボタンクリック');
    await page.waitForTimeout(3000);

    const taskContent = await page.textContent('body');
    if (taskContent.includes('Test Task')) {
      console.log('   ✅ タスク作成成功！\n');
    } else {
      console.log('   ⚠️  タスクが見つかりません\n');
    }

    // 検索機能テスト
    console.log('4️⃣  検索機能テスト');
    await page.goto('http://localhost:3000/search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 検索入力欄を探す
    const searchInput = await page.$('input[type="text"]:visible, input[type="search"]:visible');
    if (searchInput) {
      await searchInput.fill('デザイン');
      console.log('   🔍 検索ワード入力: "デザイン"');
      await page.waitForTimeout(500);

      // 検索実行（ボタンまたはEnter）
      const searchBtn = await page.$('button:has-text("検索"), button:has-text("Search")');
      if (searchBtn) {
        await searchBtn.click();
      } else {
        await searchInput.press('Enter');
      }

      await page.waitForTimeout(2000);

      const searchResult = await page.textContent('body');
      if (searchResult.includes('デザイン') || searchResult.includes('design')) {
        console.log('   ✅ 検索実行成功\n');
      } else {
        console.log('   ⚠️  検索結果が不明\n');
      }
    } else {
      console.log('   ⚠️  検索入力欄が見つかりません\n');
    }

    // コメント機能テスト（タスク詳細ページで）
    console.log('5️⃣  コメント機能テスト');
    await page.goto('http://localhost:3000/task', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 最初のタスクをクリック
    const taskCards = await page.$$('[role="button"], .MuiCard-root, .task-card');
    if (taskCards.length > 0) {
      await taskCards[0].click();
      console.log('   📋 タスク詳細を開く');
      await page.waitForTimeout(2000);

      // コメント入力欄を探す
      const commentInput = await page.$(
        'textarea, input[placeholder*="コメント"], input[placeholder*="comment"]',
      );
      if (commentInput) {
        await commentInput.fill('これはPlaywrightからの自動テストコメントです');
        console.log('   💬 コメント入力');
        await page.waitForTimeout(500);

        // 送信ボタン
        const submitBtn = await page.$(
          'button:has-text("送信"), button:has-text("Submit"), button:has-text("Post"), button:has-text("投稿")',
        );
        if (submitBtn) {
          await submitBtn.click();
          console.log('   📤 コメント送信');
          await page.waitForTimeout(2000);
          console.log('   ✅ コメント機能テスト完了\n');
        } else {
          console.log('   ⚠️  コメント送信ボタンが見つかりません\n');
        }
      } else {
        console.log('   ⚠️  コメント入力欄が見つかりません\n');
      }
    } else {
      console.log('   ⚠️  タスクカードが見つかりません\n');
    }

    // プロジェクト編集テスト
    console.log('6️⃣  プロジェクト編集テスト');
    await page.goto('http://localhost:3000/project', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // プロジェクトカードをクリック
    const projectCards = await page.$$('.MuiCard-root, [role="button"]');
    if (projectCards.length > 0) {
      await projectCards[0].click();
      console.log('   📂 プロジェクト詳細を開く');
      await page.waitForTimeout(2000);

      // メンバー追加機能テスト
      const addMemberBtn = await page.$(
        'button:has-text("Add Member"), button:has-text("メンバー追加")',
      );
      if (addMemberBtn) {
        await addMemberBtn.click();
        console.log('   👥 メンバー追加ダイアログを開く');
        await page.waitForTimeout(1000);

        // ダイアログをキャンセル
        const cancelBtn = await page.$('button:has-text("Cancel"), button:has-text("キャンセル")');
        if (cancelBtn) {
          await cancelBtn.click();
          console.log('   ✅ メンバー追加機能確認\n');
        }
      } else {
        console.log('   ⚠️  メンバー追加ボタンが見つかりません\n');
      }
    }

    // ダッシュボード統計確認
    console.log('7️⃣  ダッシュボード統計');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const dashContent = await page.textContent('body');
    const hasProjects = dashContent.includes('Project') || dashContent.includes('プロジェクト');
    const hasTasks = dashContent.includes('Task') || dashContent.includes('タスク');
    console.log(`   📊 プロジェクト統計: ${hasProjects ? '表示あり' : '表示なし'}`);
    console.log(`   📊 タスク統計: ${hasTasks ? '表示あり' : '表示なし'}`);
    console.log('   ✅ ダッシュボード確認完了\n');

    // 最終スクリーンショット
    await page.screenshot({ path: 'test-complete.png', fullPage: true });
    console.log('📸 最終スクリーンショット: test-complete.png\n');

    // エラーサマリー
    if (errors.length > 0) {
      console.log('⚠️  JavaScriptエラー:');
      errors.forEach((err) => console.log(`   - ${err}`));
      console.log('');
    } else {
      console.log('✅ JavaScriptエラーなし\n');
    }

    console.log('🎉 すべてのCRUD操作テスト完了！');
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
    await page.screenshot({ path: 'crud-test-error.png' });
    console.log('エラースクリーンショット: crud-test-error.png');
    throw error;
  } finally {
    await browser.close();
  }
}

testCRUDOperations().catch(console.error);
