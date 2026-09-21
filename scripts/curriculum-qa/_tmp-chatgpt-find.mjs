import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled', '--lang=ja'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'ja-JP', viewport: { width: 1400, height: 950 },
  storageState: '/tmp/chatgpt-state.json', acceptDownloads: true,
});
const page = await ctx.newPage();
// shared link first — may reveal the original conversation id
await page.goto('https://chatgpt.com/share/6aa52eb5-9488-83ee-9468-f56032e7b29f', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
console.log('share url:', page.url());
// look for links to /c/ conversations
const links = await page.evaluate(() => [...document.querySelectorAll('a[href*="/c/"]')].map(a => a.href).slice(0, 10));
console.log('conv links:', JSON.stringify(links));
// sidebar history items
const history = await page.evaluate(() => [...document.querySelectorAll('nav a[href], aside a[href], a[href*="/c/"]')].map(a => `${a.innerText.slice(0,50)}|${a.href}`).slice(0, 30));
console.log('history:', JSON.stringify(history, null, 0).slice(0, 2000));
await page.screenshot({ path: '/tmp/chatgpt-share-logged.png' });
await browser.close();
