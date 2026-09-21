// sukererion ログイン: email-verification画面の選択肢を調査する。
import { chromium } from 'playwright';

const EMAIL = 'sukererion@gmail.com';
const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled', '--lang=ja'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'ja-JP', viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
console.log('url:', page.url());
const emailIn = page.locator('input[type="email"]:visible, input[name="email"]:visible, input[name="username"]:visible').first();
if (await emailIn.count()) {
  await emailIn.fill(EMAIL);
  await page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("続ける"), button:has-text("次へ")').first().click();
  await page.waitForTimeout(5000);
}
console.log('after email:', page.url());
await page.screenshot({ path: '/tmp/chatgpt3-verify.png', fullPage: true });
// 画面上の全ボタン・リンク・入力を列挙
const inputs = await page.locator('input:visible').all();
for (const inp of inputs) {
  console.log('input:', await inp.getAttribute('type'), await inp.getAttribute('name'), await inp.getAttribute('autocomplete'), await inp.getAttribute('placeholder'));
}
const btns = await page.locator('button:visible, a:visible').allInnerTexts();
console.log('buttons/links:', JSON.stringify(btns.map((b) => b.trim()).filter(Boolean).slice(0, 20)));
await browser.close();
