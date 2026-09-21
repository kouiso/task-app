// backend-api で会話一覧を直接取得（スクロール不要の網羅取得）。
import { chromium } from 'playwright';

const state = process.argv[2] ?? '/tmp/chatgpt-state.json';
const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ storageState: state });
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

const res = await page.evaluate(async () => {
  const r = await fetch('/backend-api/conversations?offset=0&limit=100&order=updated', { credentials: 'include' });
  if (!r.ok) return { status: r.status, body: (await r.text()).slice(0, 300) };
  const j = await r.json();
  return {
    total: j.total,
    items: (j.items || []).map((c) => `${c.id}  ${c.update_time ?? c.create_time}  ${c.title}`),
  };
});
console.log(JSON.stringify(res, null, 1).slice(0, 6000));
await browser.close();
