import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  storageState: '/tmp/chatgpt-state.json', viewport: { width: 1400, height: 950 },
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
// scroll sidebar to bottom progressively
const seen = new Map();
for (let i = 0; i < 15; i++) {
  const items = await page.evaluate(() => [...document.querySelectorAll('a[href*="/c/"]')].map(a => `${a.innerText.split('\n')[0].slice(0,60)}|${a.href}`));
  items.forEach(s => { const [t, u] = s.split('|'); seen.set(u, t); });
  await page.evaluate(() => {
    const nav = document.querySelector('nav') || document.querySelector('#sidebar') || document.querySelector('[class*="sidebar"]');
    if (nav) nav.scrollTop = nav.scrollHeight;
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(1200);
}
const arr = [...seen.entries()].map(([u, t]) => `${t}|${u}`);
console.log('count:', arr.length);
console.log(arr.join('\n'));
await browser.close();
