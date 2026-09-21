import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  storageState: '/tmp/chatgpt-state.json',
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/share/6aa52eb5-9488-83ee-9468-f56032e7b29f', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
const data = await page.evaluate(async () => {
  const r = await fetch('/backend-api/share/6aa52eb5-9488-83ee-9468-f56032e7b29f/file_from_message/dfd38af2-a575-4583-a5e4-cd47b546ca49?file_path=' + encodeURIComponent('/mnt/data/taskapp-review-2026-09-12.pdf'), { credentials: 'include' });
  const j = await r.json();
  const r2 = await fetch(j.download_url);
  const buf = await r2.arrayBuffer();
  return Array.from(new Uint8Array(buf.slice(0, 0))) && btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ''));
});
fs.writeFileSync('/tmp/chatgpt-dl/taskapp-review-2026-09-12.pdf', Buffer.from(data, 'base64'));
console.log('size:', fs.statSync('/tmp/chatgpt-dl/taskapp-review-2026-09-12.pdf').size);
await browser.close();
