import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  storageState: '/tmp/chatgpt-state.json', viewport: { width: 1400, height: 950 },
});
const page = await ctx.newPage();
const reqs = [];
page.on('request', r => { if (/file|download|oaiuser|sandbox/i.test(r.url())) reqs.push(`REQ ${r.url()}`); });
page.on('response', async r => { if (/file|download|oaiuser|sandbox/i.test(r.url())) reqs.push(`RES ${r.status()} ${r.url()} ct=${r.headers()['content-type'] || ''}`); });
page.on('console', m => { if (/file|download/i.test(m.text())) reqs.push(`CON ${m.text().slice(0,200)}`); });
await page.goto('https://chatgpt.com/share/6aa52eb5-9488-83ee-9468-f56032e7b29f', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
const [btn] = await page.$$('button:has-text("PDF")');
await btn.click();
await page.waitForTimeout(15000);
console.log(reqs.join('\n') || 'no matching requests');
await browser.close();
