// Extract the Neon connection string from the project dashboard
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: '/tmp/neon-state.json', viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();

await page.goto('https://console.neon.tech/app/projects/autumn-silence-61799803', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: '/tmp/neon-dash.png' });

// click "Connect" (sidebar or card)
const connect = page.locator('button:has-text("Connect"), a:has-text("Connect")').first();
if (await connect.count()) { await connect.click(); await page.waitForTimeout(3000); }
await page.screenshot({ path: '/tmp/neon-connect.png' });

// reveal password if hidden behind a button
const reveal = page.locator('button[aria-label*="show" i], button:has-text("Reveal"), button:has-text("Show")').first();
if (await reveal.count()) { await reveal.click().catch(() => {}); await page.waitForTimeout(1000); }

// grab any postgresql:// text in DOM (code blocks, inputs, text)
const conn = await page.evaluate(() => {
  const texts = [
    ...[...document.querySelectorAll('input')].map(e => e.value),
    ...[...document.querySelectorAll('code, pre, [class*="mono"], span, div')].map(e => e.textContent),
  ];
  for (const t of texts) {
    const m = t && t.match(/postgres(?:ql)?:\/\/[^\s"'`<]+/);
    if (m) return m[0];
  }
  return null;
});
if (conn) {
  writeFileSync('/tmp/neon-conn.txt', conn + '\n', { mode: 0o600 });
  console.log('CONN:', conn.replace(/:\/\/[^:]+:[^@]+@/, '://USER:PASS@'));
} else {
  console.log('NOT_FOUND — dumping visible text');
  console.log((await page.locator('body').innerText()).slice(0, 1500));
  await page.screenshot({ path: '/tmp/neon-connect2.png' });
}
await browser.close();
