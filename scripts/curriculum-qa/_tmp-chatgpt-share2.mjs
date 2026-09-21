import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  storageState: '/tmp/chatgpt-state.json', viewport: { width: 1400, height: 950 },
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/share/6aa52eb5-9488-83ee-9468-f56032e7b29f', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
// scroll to load all messages
let lastLen = 0;
for (let i = 0; i < 20; i++) {
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(1500);
  const len = await page.evaluate(() => document.body.innerText.length);
  if (len === lastLen && i > 5) break;
  lastLen = len;
}
const text = await page.evaluate(() => document.body.innerText);
fs.writeFileSync('/tmp/chatgpt-share-full.txt', text);
console.log('text len:', text.length);
// file attachment candidates: elements with download-ish markup
const files = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('[data-testid], [class*="file"], [class*="attachment"], a').forEach(el => {
    const t = (el.innerText || el.textContent || '').trim().slice(0, 80);
    if (/\.pdf|\.zip|\.md|report|レポート|報告|修正/i.test(t)) {
      out.push(`${el.tagName}|${el.className?.toString().slice(0,40)}|${el.href || ''}|${t}`);
    }
  });
  return out.slice(0, 40);
});
console.log(files.join('\n'));
await browser.close();
