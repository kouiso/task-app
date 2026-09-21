import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled', '--lang=ja'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'ja-JP', viewport: { width: 1400, height: 950 },
  storageState: '/tmp/chatgpt-state.json', acceptDownloads: true,
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
// open chat history search (sidebar search icon)
const searchBtn = page.locator('button[aria-label*="検索" i], button[aria-label*="search" i], [data-testid*="search"]').first();
console.log('searchBtn:', await searchBtn.count());
if (await searchBtn.count()) { await searchBtn.click(); await page.waitForTimeout(1500); }
const searchIn = page.locator('input[type="search"]:visible, input[placeholder*="検索" i]:visible, input[placeholder*="Search" i]:visible').first();
if (await searchIn.count()) {
  await searchIn.fill('教材レビュー');
  await page.waitForTimeout(3000);
}
await page.screenshot({ path: '/tmp/chatgpt-search.png' });
const results = await page.evaluate(() => [...document.querySelectorAll('a[href*="/c/"]')].map(a => `${a.innerText.slice(0,60)}|${a.href}`).slice(0, 20));
console.log('results:', JSON.stringify(results, null, 0).slice(0, 1500));
await browser.close();
