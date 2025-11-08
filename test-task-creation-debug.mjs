import { chromium } from 'playwright';

async function test() {
  console.log('🔍 タスク作成デバッグテスト\n');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

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
    await page.waitForTimeout(1500);

    // New Taskボタンをクリック
    console.log('3️⃣  タスク作成ダイアログを開く');
    await page.click('button:has-text("New Task")');
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
    console.log('   ✅ ダイアログ表示\n');

    // タイトルを入力
    console.log('4️⃣  タイトル入力');
    const titleInput = await page.$('div[role="dialog"] input[type="text"]');
    await titleInput.fill('Debug Test Task');
    console.log('   ✅ タイトル: "Debug Test Task"\n');

    // プロジェクト選択フィールドを見つける
    console.log('5️⃣  プロジェクト選択フィールド確認');
    const projectLabels = await page.$$('label:has-text("Project")');
    console.log(`   プロジェクトラベル数: ${projectLabels.length}`);

    // プロジェクト選択（直接クリック）
    console.log('\n6️⃣  プロジェクト選択');
    await page.click('label:has-text("Project")');
    await page.waitForTimeout(500);

    // MUIのselectをクリック
    await page.click('div[role="dialog"] #\\:r7\\:'); // MUI generated ID
    await page.waitForTimeout(500);

    // または別の方法: labelの後の input/select を探す
    const projectSelect = await page.$('label:has-text("Project") ~ div input');
    if (projectSelect) {
      await projectSelect.click();
      await page.waitForTimeout(500);
      console.log('   ✅ プロジェクト選択フィールドをクリック');
    }

    // メニューが開いたかチェック
    const menuOpen = await page.$('[role="listbox"]');
    if (menuOpen) {
      console.log('   ✅ プロジェクトメニューが開いた');

      // 利用可能なプロジェクトオプションを確認
      const options = await page.$$('[role="option"]');
      console.log(`   利用可能なオプション数: ${options.length}`);

      for (let i = 0; i < options.length; i++) {
        const text = await options[i].textContent();
        console.log(`   オプション ${i + 1}: "${text}"`);
      }

      // 最初のプロジェクトを選択
      if (options.length > 0) {
        await options[0].click();
        await page.waitForTimeout(500);
        console.log('   ✅ プロジェクトを選択\n');
      }
    } else {
      console.log('   ⚠️  プロジェクトメニューが開かなかった\n');
    }

    // フォームの状態を確認
    console.log('7️⃣  フォームの状態確認');
    const formState = await page.evaluate(() => {
      // Reactの内部状態は直接取得できないので、DOM要素の値を確認
      const titleInput = document.querySelector('div[role="dialog"] input[type="text"]');
      const projectInput = document.querySelector('div[role="dialog"] label:has-text("Project") ~ div input');

      return {
        title: titleInput?.value || 'not found',
        projectValue: projectInput?.value || 'not found',
      };
    });
    console.log('   フォーム状態:', formState);

    // Createボタンの状態を確認
    const createButton = await page.$('button:has-text("Create")');
    const isDisabled = await createButton.evaluate(btn => btn.disabled);
    console.log(`   Createボタン: ${isDisabled ? '無効' : '有効'}\n`);

    if (!isDisabled) {
      console.log('8️⃣  タスク作成実行');
      await createButton.click();
      await page.waitForTimeout(3000);

      // エラーチェック
      const pageContent = await page.textContent('body');
      if (pageContent.includes('Debug Test Task')) {
        console.log('   ✅ タスク作成成功！');
      } else {
        console.log('   ⚠️  タスクが見つかりません');
      }
    } else {
      console.log('   ⚠️  Createボタンが無効のままです');
    }

    await page.screenshot({ path: 'debug-task-creation.png', fullPage: true });
    console.log('\n📸 スクリーンショット: debug-task-creation.png');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    await page.screenshot({ path: 'debug-error.png' });
  } finally {
    await browser.close();
  }
}

test().catch(console.error);
