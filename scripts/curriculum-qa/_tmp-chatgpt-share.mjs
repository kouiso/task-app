import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  storageState: '/tmp/chatgpt-state.json', viewport: { width: 1400, height: 950 },
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/share/6aa52eb5-9488-83ee-9468-f56032e7b29f', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
// all links incl. file attachments
const links = await page.evaluate(() => [...document.querySelectorAll('a')].map(a => `${a.innerText.slice(0,50)}|${a.href}`).filter(s => /file|download|sandbox|\.pdf|\.zip|附件|ダウンロード/i.test(s)));
console.log('file links:', JSON.stringify(links, null, 1));
// page text length and save
const text = await page.evaluate(() => document.body.innerText);
console.log('text len:', text.length);
await page.screenshot({ path: '/tmp/chatgpt-share.png' });
await browser.close();
