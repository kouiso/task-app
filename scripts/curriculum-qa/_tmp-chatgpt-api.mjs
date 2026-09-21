import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled', '--lang=ja'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'ja-JP', storageState: '/tmp/chatgpt-state.json',
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
const convs = await page.evaluate(async () => {
  const r = await fetch('/backend-api/conversations?offset=0&limit=100&order=updated', { credentials: 'include' });
  if (!r.ok) return { error: r.status };
  const d = await r.json();
  return d.items.map(i => ({ id: i.id, title: i.title, t: i.update_time }));
});
if (convs.error) console.log('API error:', convs.error);
else {
  const hits = convs.filter(c => /教材|レビュー|report/i.test(c.title));
  console.log('hits:', JSON.stringify(hits, null, 1));
  console.log('total:', convs.length);
}
await browser.close();
