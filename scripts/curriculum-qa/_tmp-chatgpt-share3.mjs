import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  storageState: '/tmp/chatgpt-state.json', viewport: { width: 1400, height: 950 },
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/share/6aa52eb5-9488-83ee-9468-f56032e7b29f', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
let lastLen = 0;
for (let i = 0; i < 25; i++) {
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(1500);
  const len = await page.evaluate(() => document.body.innerText.length);
  if (len === lastLen && i > 5) break;
  lastLen = len;
}
const text = await page.evaluate(() => document.body.innerText);
fs.writeFileSync('/tmp/chatgpt-share-latest.txt', text);
console.log('text len:', text.length);
console.log('=== tail 3000 ===');
console.log(text.slice(-3000));
const html = await page.content();
const sandboxes = [...html.matchAll(/sandbox:\/mnt\/data\/[^"'\s)\\]+/g)].map((m) => m[0]);
console.log('=== sandbox links ===');
for (const s of new Set(sandboxes)) console.log(s);
await browser.close();
