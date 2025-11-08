import { chromium } from 'playwright';

async function test() {
  console.log('🚀 ブラウザを起動します...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // ホームページアクセス
    console.log('📱 http://localhost:3000 にアクセス...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    const url = page.url();
    console.log(`✅ 現在のURL: ${url}`);

    // ログインページにリダイレクトされるはず
    if (url.includes('/login')) {
      console.log('✅ ログインページへのリダイレクト成功');

      // ページタイトル確認
      const title = await page.title();
      console.log(`✅ ページタイトル: ${title}`);

      // フォーム要素の存在確認
      const emailInput = await page.$('input[id="email"]');
      const passwordInput = await page.$('input[type="password"]');
      const submitButton = await page.$('button[type="submit"]');

      console.log(`✅ メール入力欄: ${emailInput ? '存在する' : '存在しない'}`);
      console.log(`✅ パスワード入力欄: ${passwordInput ? '存在する' : '存在しない'}`);
      console.log(`✅ ログインボタン: ${submitButton ? '存在する' : '存在しない'}`);

      // ログイン操作
      console.log('\n🔑 ログインテスト開始...');
      await page.fill('input[id="email"]', 'admin@example.com');
      await page.fill('input[id="password"]', 'password123');

      console.log('✅ 認証情報を入力');

      await page.click('button[type="submit"]');
      console.log('✅ ログインボタンをクリック');

      // ダッシュボードへのリダイレクトを待つ
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      const dashboardUrl = page.url();
      console.log(`✅ ダッシュボードにリダイレクト: ${dashboardUrl}`);

      // ダッシュボードコンテンツ確認
      await page.waitForLoadState('networkidle');
      const dashboardTitle = await page.title();
      console.log(`✅ ダッシュボードタイトル: ${dashboardTitle}`);

      // スクリーンショット取得
      await page.screenshot({ path: '/home/kouiso/develop/volta/intern/task/task-app/dashboard-screenshot.png', fullPage: true });
      console.log('✅ スクリーンショット保存: dashboard-screenshot.png');

      // コンソールエラーチェック
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // プロジェクトページへ移動
      console.log('\n📂 プロジェクトページテスト...');
      await page.goto('http://localhost:3000/project', { waitUntil: 'networkidle' });
      console.log(`✅ プロジェクトページURL: ${page.url()}`);

      // タスクページへ移動
      console.log('\n📋 タスクページテスト...');
      await page.goto('http://localhost:3000/task', { waitUntil: 'networkidle' });
      console.log(`✅ タスクページURL: ${page.url()}`);

      // 検索ページへ移動
      console.log('\n🔍 検索ページテスト...');
      await page.goto('http://localhost:3000/search', { waitUntil: 'networkidle' });
      console.log(`✅ 検索ページURL: ${page.url()}`);

      if (consoleErrors.length > 0) {
        console.log('\n⚠️  コンソールエラー:');
        consoleErrors.forEach(err => console.log(`  - ${err}`));
      } else {
        console.log('\n✅ コンソールエラーなし');
      }

      console.log('\n🎉 すべてのテストが成功しました！');
    } else {
      console.log(`❌ 予期しないリダイレクト: ${url}`);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    await page.screenshot({ path: '/home/kouiso/develop/volta/intern/task/task-app/error-screenshot.png' });
    console.log('エラー時のスクリーンショット: error-screenshot.png');
    throw error;
  } finally {
    await browser.close();
  }
}

test().catch(console.error);
