import { chromium } from 'playwright';

async function test() {
  console.log('🧪 修正済み機能の個別テスト\n');
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  const results = {
    taskEdit: false,
    search: false,
    comment: false,
  };

  try {
    // ログイン
    console.log('1️⃣  ログイン');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[id="email"]', 'admin@example.com');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('   ✅ ログイン成功\n');

    // タスク編集テスト
    console.log('2️⃣  タスク編集機能テスト');
    await page.goto('http://localhost:3000/task', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // タスクカードを探す
    const taskCards = await page.$$('[class*="MuiCard"]');
    console.log(`   タスクカード数: ${taskCards.length}`);

    if (taskCards.length > 0) {
      // 編集ボタンを探す（aria-label="Edit task"を追加した）
      const editButton = await page.$('button[aria-label="Edit task"]');

      if (editButton) {
        console.log('   ✅ 編集ボタン発見（aria-label使用）');
        await editButton.click();
        await page.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 5000 });

        const titleInput = await page.$('div[role="dialog"] input[type="text"]:visible');
        const currentTitle = await titleInput.inputValue();
        console.log(`   現在のタイトル: "${currentTitle}"`);

        await titleInput.fill(currentTitle + ' [編集テスト]');
        console.log('   ✅ タイトル編集');

        const updateButton = await page.$('button:has-text("Update"), button:has-text("Save")');
        if (updateButton) {
          await updateButton.click();
          await page.waitForTimeout(2000);

          const updatedContent = await page.textContent('body');
          if (updatedContent.includes('[編集テスト]')) {
            results.taskEdit = true;
            console.log('   ✅ タスク編集成功！\n');
          } else {
            console.log('   ⚠️  編集が反映されていません\n');
          }
        }
      } else {
        console.log('   ⚠️  編集ボタンが見つかりません（aria-label="Edit task"で検索）\n');

        // デバッグ: すべてのボタンを確認
        const allButtons = await page.$$('button');
        console.log(`   デバッグ: ページ内の全ボタン数: ${allButtons.length}`);
        for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
          const ariaLabel = await allButtons[i].getAttribute('aria-label');
          const text = await allButtons[i].textContent();
          console.log(
            `   Button ${i}: aria-label="${ariaLabel}", text="${text?.substring(0, 20)}"`,
          );
        }
      }
    } else {
      console.log('   ⚠️  タスクカードが見つかりません\n');
    }

    // 検索機能テスト
    console.log('3️⃣  検索機能テスト');
    await page.goto('http://localhost:3000/search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const searchInput = await page.$('input[type="search"], input[placeholder*="検索"]');
    if (searchInput) {
      await searchInput.fill('デザイン');
      console.log('   ✅ キーワード入力: "デザイン"');

      // 検索ボタンをクリック
      const searchButton = await page.$('button:has-text("検索"), button:has-text("Search")');
      if (searchButton) {
        await searchButton.click();
        console.log('   ✅ 検索ボタンクリック');
        await page.waitForTimeout(2000);
      } else {
        // Enterキーで検索
        await searchInput.press('Enter');
        console.log('   ✅ Enterキーで検索実行');
        await page.waitForTimeout(2000);
      }

      const searchResults = await page.textContent('body');
      if (searchResults.includes('デザイン')) {
        results.search = true;
        console.log('   ✅ 検索成功: "デザイン"を含む結果が表示されました\n');
      } else {
        console.log('   ⚠️  検索結果に"デザイン"が見つかりません');
        // デバッグ情報
        const resultCards = await page.$$('[class*="MuiCard"], [class*="result"]');
        console.log(`   検索結果カード数: ${resultCards.length}\n`);
      }
    } else {
      console.log('   ⚠️  検索入力欄が見つかりません\n');
    }

    // コメント機能テスト
    console.log('4️⃣  コメント機能テスト');
    await page.goto('http://localhost:3000/task', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 最初のタスクカードをクリックして詳細を開く
    const firstTaskCard = await page.$('[class*="MuiCard"]');
    if (firstTaskCard) {
      await firstTaskCard.click();
      console.log('   ✅ タスク詳細ダイアログを開く');
      await page.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(1000);

      // コメント入力欄を探す
      const commentInput = await page.$(
        'div[role="dialog"] textarea[placeholder*="comment"], div[role="dialog"] textarea[placeholder*="コメント"]',
      );

      if (commentInput) {
        console.log('   ✅ コメント入力欄発見');
        await commentInput.fill('これはテストコメントです');
        console.log('   ✅ コメント入力: "これはテストコメントです"');

        const postButton = await page.$('button:has-text("Post Comment"), button:has-text("投稿")');
        if (postButton) {
          await postButton.click();
          console.log('   ✅ コメント投稿ボタンクリック');
          await page.waitForTimeout(2000);

          const dialogContent = await page.textContent('div[role="dialog"]');
          if (dialogContent.includes('これはテストコメントです')) {
            results.comment = true;
            console.log('   ✅ コメント機能成功！\n');
          } else {
            console.log('   ⚠️  コメントが表示されていません\n');
          }
        } else {
          console.log('   ⚠️  投稿ボタンが見つかりません\n');
        }
      } else {
        console.log('   ⚠️  コメント入力欄が見つかりません\n');

        // デバッグ: ダイアログ内のtextareaを確認
        const allTextareas = await page.$$('div[role="dialog"] textarea');
        console.log(`   デバッグ: ダイアログ内のtextarea数: ${allTextareas.length}`);
        for (let i = 0; i < allTextareas.length; i++) {
          const placeholder = await allTextareas[i].getAttribute('placeholder');
          console.log(`   Textarea ${i}: placeholder="${placeholder}"`);
        }
      }
    } else {
      console.log('   ⚠️  タスクカードが見つかりません\n');
    }

    await page.screenshot({ path: 'test-edit-search-comment.png', fullPage: true });
    console.log('📸 スクリーンショット: test-edit-search-comment.png\n');
  } catch (error) {
    console.error('❌ エラー:', error.message);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    // 結果サマリー
    console.log('📊 修正済み機能テスト結果:');
    console.log(`   タスク編集: ${results.taskEdit ? '✅' : '❌'}`);
    console.log(`   検索機能: ${results.search ? '✅' : '❌'}`);
    console.log(`   コメント機能: ${results.comment ? '✅' : '❌'}`);

    const successCount = Object.values(results).filter((r) => r === true).length;
    console.log(`\n✅ 成功: ${successCount}/3 (${Math.round((successCount / 3) * 100)}%)\n`);

    await browser.close();
  }
}

test().catch(console.error);
