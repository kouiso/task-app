import { chromium } from 'playwright';

async function debugPages() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // ログイン
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[id="email"]', 'admin@example.com');
  await page.fill('input[id="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // プロジェクトページを確認
  console.log('📂 プロジェクトページ解析...\n');
  await page.goto('http://localhost:3000/project', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // すべてのボタンとテキストを取得
  const buttons = await page.$$('button');
  console.log(`ボタン数: ${buttons.length}`);
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent();
    const visible = await buttons[i].isVisible();
    console.log(`  Button ${i}: "${text}" (visible: ${visible})`);
  }

  // すべてのリンクを取得
  const links = await page.$$('a');
  console.log(`\nリンク数: ${links.length}`);
  for (let i = 0; i < links.length; i++) {
    const text = await links[i].textContent();
    const href = await links[i].getAttribute('href');
    console.log(`  Link ${i}: "${text}" -> ${href}`);
  }

  // ページのテキストコンテンツ全体
  const bodyText = await page.textContent('body');
  console.log('\nページテキストコンテンツ:');
  console.log(bodyText?.substring(0, 500));

  // タスクページを確認
  console.log('\n\n📋 タスクページ解析...\n');
  await page.goto('http://localhost:3000/task', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const taskButtons = await page.$$('button');
  console.log(`ボタン数: ${taskButtons.length}`);
  for (let i = 0; i < taskButtons.length; i++) {
    const text = await taskButtons[i].textContent();
    const visible = await taskButtons[i].isVisible();
    console.log(`  Button ${i}: "${text}" (visible: ${visible})`);
  }

  await browser.close();
}

debugPages().catch(console.error);
