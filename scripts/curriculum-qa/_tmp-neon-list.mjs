import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: '/tmp/neon-state.json' });
const page = await ctx.newPage();
await page.goto('https://console.neon.tech/app/projects', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
console.log('URL:', page.url());
const rows = await page.evaluate(() =>
  [...document.querySelectorAll('table tbody tr, [data-testid*="project"], a[href*="/projects/"]')]
    .map(e => e.innerText?.replace(/\n/g, ' | ').slice(0, 120) || e.href)
    .filter(Boolean)
);
console.log(JSON.stringify(rows, null, 1));
await page.screenshot({ path: '/tmp/neon-projects.png' });
await browser.close();
