import { chromium } from 'playwright';

async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  // ページのHTML全体を取得
  const html = await page.content();
  console.log('=== ページHTML ===');
  console.log(html);

  // input要素を全て取得
  const inputs = await page.$$('input');
  console.log('\n=== Input要素一覧 ===');
  for (const input of inputs) {
    const id = await input.getAttribute('id');
    const name = await input.getAttribute('name');
    const type = await input.getAttribute('type');
    console.log(`ID: ${id}, Name: ${name}, Type: ${type}`);
  }

  await browser.close();
}

inspect().catch(console.error);
