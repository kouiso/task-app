import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  storageState: '/tmp/chatgpt-state.json',
});
const page = await ctx.newPage();
let signed = null;
page.on('response', async r => {
  if (r.url().includes('oaiusercontent.com') && r.headers()['content-type'] === 'application/pdf') {
    signed = r.url();
  }
});
await page.goto('https://chatgpt.com/share/6aa52eb5-9488-83ee-9468-f56032e7b29f', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
const [btn] = await page.$$('button:has-text("PDF")');
await btn.click();
await page.waitForTimeout(12000);
if (!signed) { console.log('no signed url captured'); process.exit(1); }
const res = await ctx.request.get(signed);
const buf = await res.body();
fs.writeFileSync('/tmp/chatgpt-dl/taskapp-review-2026-09-12.pdf', buf);
console.log('status:', res.status(), 'size:', buf.length);
await browser.close();
