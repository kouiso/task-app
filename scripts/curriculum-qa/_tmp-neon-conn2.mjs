import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: '/tmp/neon-state.json', viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
await page.goto('https://console.neon.tech/app/projects/autumn-silence-61799803', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
const connect = page.locator('button:has-text("Connect"), a:has-text("Connect")').first();
if (await connect.count()) { await connect.click(); await page.waitForTimeout(3000); }
const conn = await page.evaluate(() => {
  // find the smallest element containing the full postgres URI including .neon.tech
  const all = [...document.querySelectorAll('body *')];
  const hits = all.filter(e => {
    const t = e.textContent || '';
    return /postgres(?:ql)?:\/\//.test(t) && /neon\.tech/.test(t) && e.querySelector('*') === null || /postgres(?:ql)?:\/\/[^"'`]*neon\.tech[^\s"'`]*/.test(t || '');
  });
  // narrowest first
  const sorted = hits.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
  for (const el of sorted.slice(0, 5)) {
    const m = (el.textContent || '').match(/postgres(?:ql)?:\/\/[^\s"'`]+/);
    if (m && /neon\.tech/.test(m[0])) return m[0];
  }
  // inputs fallback
  for (const inp of document.querySelectorAll('input')) {
    if (/neon\.tech/.test(inp.value || '')) return inp.value;
  }
  return null;
});
if (conn) {
  writeFileSync('/tmp/neon-conn.txt', conn + '\n', { mode: 0o600 });
  console.log('CONN:', conn.replace(/:\/\/[^:]+:[^@]+@/, '://USER:PASS@'));
} else {
  console.log('still not found');
  await page.screenshot({ path: '/tmp/neon-connect3.png' });
}
await browser.close();
