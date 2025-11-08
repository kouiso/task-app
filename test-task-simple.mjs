import { chromium } from 'playwright';

async function test() {
  console.log('🚀 シンプルなタスク作成テスト\n');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // コンソールメッセージを監視
  const consoleErrors = [];
  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'log') {
      consoleLogs.push(msg.text());
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
    console.log('   ✅ ログイン成功\n');

    // タスクページへ移動
    console.log('2️⃣  タスクページへ移動');
    await page.goto('http://localhost:3000/task', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // New Taskボタンをクリック
    console.log('3️⃣  タスク作成ダイアログを開く');
    await page.click('button:has-text("New Task")');
    await page.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 5000 });
    console.log('   ✅ ダイアログ表示\n');
    await page.waitForTimeout(500);

    // ダイアログ内のフィールドを特定
    const dialog = page.locator('div[role="dialog"]');

    // タイトルを入力
    console.log('4️⃣  タイトル入力');
    const titleField = dialog.locator('input[type="text"]').first();
    await titleField.fill('Simple Test Task');
    console.log('   ✅ タイトル: "Simple Test Task"\n');
    await page.waitForTimeout(300);

    // プロジェクト選択（MUI Select）
    console.log('5️⃣  プロジェクト選択');

    // Method 1: すべてのselectフィールドを探す
    const selects = await page.$$eval('div[role="dialog"] .MuiSelect-select', elements =>
      elements.map((el, idx) => ({
        index: idx,
        text: el.textContent,
        ariaLabel: el.getAttribute('aria-label'),
      }))
    );
    console.log('   利用可能なselectフィールド:', selects);

    // Projectフィールドを探す（Statusの後、Priorityの前）
    // Grid構造: Status, Priority, Project, Assignee の順
    const projectSelectDiv = await page.$('div[role="dialog"] .MuiGrid-item:nth-child(5) .MuiSelect-select');

    if (projectSelectDiv) {
      console.log('   ✅ プロジェクト選択フィールド発見');

      // Select フィールドをクリック
      await projectSelectDiv.click();
      await page.waitForTimeout(500);

      // リストボックスが開いたか確認
      const listbox = await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      if (listbox) {
        console.log('   ✅ プロジェクトリスト表示');

        // 利用可能なオプションを取得
        const options = await page.$$('[role="option"]');
        console.log(`   利用可能なプロジェクト数: ${options.length}`);

        // 各オプションの内容を表示
        for (let i = 0; i < options.length; i++) {
          const text = await options[i].textContent();
          console.log(`   - オプション ${i + 1}: "${text}"`);
        }

        // 最初のプロジェクトを選択
        if (options.length > 0) {
          await options[0].click();
          await page.waitForTimeout(500);
          console.log('   ✅ プロジェクトを選択しました\n');
        }
      }
    } else {
      console.log('   ⚠️  プロジェクト選択フィールドが見つかりません\n');

      // デバッグ: すべてのGrid項目を確認
      const gridItems = await page.$$('div[role="dialog"] .MuiGrid-item');
      console.log(`   Grid項目数: ${gridItems.length}`);
    }

    // Createボタンの状態を確認
    console.log('6️⃣  Createボタン確認');
    const createButton = await page.locator('button:has-text("Create")');
    const isDisabled = await createButton.evaluate(btn => btn.disabled);
    console.log(`   Createボタン: ${isDisabled ? '無効' : '有効'}\n`);

    if (!isDisabled) {
      console.log('7️⃣  タスク作成実行');
      await createButton.click();
      console.log('   ✅ Createボタンクリック');
      await page.waitForTimeout(3000);

      // タスクが作成されたか確認
      const pageContent = await page.textContent('body');
      if (pageContent.includes('Simple Test Task')) {
        console.log('   ✅ タスク作成成功！\n');
      } else {
        console.log('   ⚠️  タスクが見つかりません\n');
      }

      // ログチェック
      if (consoleLogs.length > 0) {
        console.log('\n📋 コンソールログ (task creation関連のみ):');
        consoleLogs.filter(log => log.includes('🔍') || log.includes('📝')).forEach(log => console.log(`   ${log}`));
      }

      // エラーチェック
      if (consoleErrors.length > 0) {
        console.log('\n⚠️  コンソールエラー:');
        consoleErrors.forEach(err => console.log(`   - ${err.substring(0, 300)}`));
      } else {
        console.log('\n✅ コンソールエラーなし');
      }
    } else {
      console.log('   ⚠️  Createボタンが無効のままです');
      console.log('   タイトルまたはプロジェクトが未選択の可能性があります\n');
    }

    await page.screenshot({ path: 'test-simple-task.png', fullPage: true });
    console.log('\n📸 スクリーンショット: test-simple-task.png');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    await page.screenshot({ path: 'test-simple-error.png' });
  } finally {
    await browser.close();
  }
}

test().catch(console.error);
