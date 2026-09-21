// サイドバーの会話一覧（タイトル+URL）を全件取得する。
import { chromium } from 'playwright';

const state = '/tmp/chatgpt-state.json';
const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ storageState: state });
const page = await ctx.newPage();
page.setDefaultTimeout(60000);

await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);

const loginBtn = await page.locator('button:has-text("Log in"), a:has-text("Log in")').count();
if (loginBtn > 0) { console.log('ERROR: not logged in'); process.exit(2); }

// スクロールしながら全履歴を収集
const seen = new Map();
for (let i = 0; i < 40; i++) {
  const links = await page.locator('a[href^="/c/"]').all();
  for (const a of links) {
    const href = await a.getAttribute('href');
    const title = (await a.innerText()).trim().replace(/\n/g, ' ');
    if (href && !seen.has(href)) seen.set(href, title);
  }
  const nav = page.locator('nav, [class*="sidebar"], aside').first();
  await nav.evaluate((el) => { el.scrollTop += 1200; }).catch(() => {});
  await page.waitForTimeout(600);
}
let i = 0;
for (const [href, title] of seen) console.log(`${String(++i).padStart(3)} ${href}  ${title}`);
await ctx.storageState({ path: state });
await browser.close();
