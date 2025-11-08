import { chromium } from 'playwright';

async function test() {
  console.log('🔍 簡易検索テスト - "デザイン"\n');
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

    // 検索ページへ（キーワード付きURLで直接アクセス）
    console.log('2️⃣  検索ページへ移動（キーワード: デザイン）');
    await page.goto('http://localhost:3000/search?keyword=%E3%83%87%E3%82%B6%E3%82%A4%E3%83%B3', {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(3000);

    // 結果確認
    const pageText = await page.textContent('body');
    console.log('3️⃣  検索結果確認');

    if (pageText.includes('検索結果: 0件')) {
      console.log('   ❌ 検索結果が0件です');
    } else if (pageText.includes('デザインモックアップ')) {
      console.log('   ✅ デザインモックアップが見つかりました！');
    } else {
      // 検索結果の件数を抽出
      const resultMatch = pageText.match(/検索結果:\s*(\d+)件/);
      if (resultMatch) {
        console.log(`   検索結果: ${resultMatch[1]}件`);
      }
    }

    await page.screenshot({ path: 'test-search-design.png', fullPage: true });
    console.log('\n📸 スクリーンショット: test-search-design.png');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    await page.screenshot({ path: 'test-search-error.png' });
  } finally {
    await browser.close();
  }
}

test().catch(console.error);
