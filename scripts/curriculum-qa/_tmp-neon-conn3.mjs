import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: '/tmp/neon-state.json', viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
await page.goto('https://console.neon.tech/app/projects/autumn-silence-61799803', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
const connect = page.locator('button:has-text("Connect"), a:has-text("Connect")').first();
if (await connect.count()) { await connect.click(); await page.waitForTimeout(3000); }
const showBtn = page.locator('button:has-text("Show password"), [aria-label*="Show password" i]').first();
console.log('showBtn:', await showBtn.count());
if (await showBtn.count()) { await showBtn.click(); await page.waitForTimeout(1500); }
const conn = await page.evaluate(() => {
  const all = [...document.querySelectorAll('body *')];
  const hits = all.filter(e => /postgres(?:ql)?:\/\/[^"'`]*neon\.tech/.test(e.textContent || ''));
  const sorted = hits.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
  for (const el of sorted.slice(0, 6)) {
    const m = (el.textContent || '').match(/postgres(?:ql)?:\/\/[^\s"'`]+/);
    if (m && /neon\.tech/.test(m[0])) return m[0];
  }
  return null;
});
if (conn) {
  writeFileSync('/tmp/neon-conn.txt', conn + '\n', { mode: 0o600 });
  console.log('CONN:', conn.replace(/:\/\/[^:]+:[^@]+@/, '://USER:PASS@'));
} else {
  console.log('still masked');
  await page.screenshot({ path: '/tmp/neon-connect4.png' });
}
await browser.close();
