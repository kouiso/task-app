import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  storageState: '/tmp/chatgpt-state.json',
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
const out = await page.evaluate(async () => {
  const r = await fetch('/backend-api/conversations?offset=0&limit=30', { credentials: 'include' });
  const t = await r.text();
  return { status: r.status, body: t.slice(0, 1500) };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
