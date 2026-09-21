import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('https://chatgpt.com/share/6aa52eb5-9488-83ee-9468-f56032e7b29f', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
console.log('title:', await page.title());
const text = await page.locator('body').innerText();
console.log('len:', text.length);

const fs = await import('node:fs');
fs.writeFileSync('/tmp/chatgpt-share.txt', text);
await page.screenshot({ path: '/tmp/chatgpt-share.png', fullPage: false });
await browser.close();
