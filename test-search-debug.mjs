import { chromium } from 'playwright';

async function test() {
  console.log('🔍 検索機能デバッグテスト\n');
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
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

    // 検索ページに移動
    console.log('2️⃣  検索ページへ移動');
    await page.goto('http://localhost:3000/search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('   ✅ 検索ページ表示\n');

    // 検索入力欄を確認
    console.log('3️⃣  検索フォームの確認');
    const searchInput = await page.$('input[type="search"], input[placeholder*="検索"], input[label*="キーワード"]');

    if (searchInput) {
      const placeholder = await searchInput.getAttribute('placeholder');
      console.log(`   ✅ 検索入力欄発見: placeholder="${placeholder}"`);

      // キーワード入力
      await searchInput.fill('デザイン');
      console.log('   ✅ キーワード入力: "デザイン"\n');
      await page.waitForTimeout(500);

      // 検索ボタンを探してクリック
      console.log('4️⃣  検索実行');
      const searchButton = await page.$('button:has-text("検索"), button:has-text("Search")');

      if (searchButton) {
        await searchButton.click();
        console.log('   ✅ 検索ボタンクリック');
      } else {
        await searchInput.press('Enter');
        console.log('   ✅ Enterキーで検索実行');
      }

      await page.waitForTimeout(3000);

      // 検索結果の詳細を確認
      console.log('\n5️⃣  検索結果の詳細確認');

      // すべてのカードを探す
      const cards = await page.$$('[class*="MuiCard"], [class*="Card"], article, [role="article"]');
      console.log(`   検索結果カード数: ${cards.length}`);

      // 各カードの内容を確認
      for (let i = 0; i < Math.min(cards.length, 5); i++) {
        const cardText = await cards[i].textContent();
        console.log(`\n   --- カード ${i + 1} ---`);
        console.log(`   ${cardText.substring(0, 200).replace(/\n/g, ' ')}`);
      }

      // ページ全体のテキストを確認
      console.log('\n6️⃣  ページ全体のテキスト確認');
      const bodyText = await page.textContent('body');
      const hasDesign = bodyText.includes('デザイン');
      console.log(`   "デザイン"を含む: ${hasDesign ? '✅ YES' : '❌ NO'}`);

      if (hasDesign) {
        console.log('   ✅ 検索成功！');
      } else {
        console.log('   ⚠️  "デザイン"が見つかりません');

        // デバッグ: "No results" や "結果なし" のようなメッセージがあるか確認
        const hasNoResults = bodyText.includes('No results') || bodyText.includes('結果') || bodyText.includes('見つかりません');
        if (hasNoResults) {
          console.log('   ⚠️  "結果なし"メッセージが表示されている可能性');
        }

        // 別のキーワードでも試す
        console.log('\n7️⃣  別のキーワードでテスト: "プロトタイプ"');
        const searchInput2 = await page.$('input[type="search"]');
        if (searchInput2) {
          await searchInput2.fill('プロトタイプ');
          await searchInput2.press('Enter');
          await page.waitForTimeout(2000);

          const bodyText2 = await page.textContent('body');
          const hasPrototype = bodyText2.includes('プロトタイプ');
          console.log(`   "プロトタイプ"を含む: ${hasPrototype ? '✅ YES' : '❌ NO'}`);
        }
      }

      await page.screenshot({ path: 'test-search-debug.png', fullPage: true });
      console.log('\n📸 スクリーンショット: test-search-debug.png');

    } else {
      console.log('   ❌ 検索入力欄が見つかりません');

      // デバッグ: すべての入力欄を確認
      const allInputs = await page.$$('input');
      console.log(`\n   デバッグ: ページ内の全input数: ${allInputs.length}`);
      for (let i = 0; i < Math.min(allInputs.length, 10); i++) {
        const type = await allInputs[i].getAttribute('type');
        const placeholder = await allInputs[i].getAttribute('placeholder');
        console.log(`   Input ${i}: type="${type}", placeholder="${placeholder}"`);
      }
    }

  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    await page.screenshot({ path: 'test-search-error.png' });
  } finally {
    await browser.close();
  }
}

test().catch(console.error);
