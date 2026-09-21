// sukererion アカウントの会話一覧を取得する。
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({ storageState: '/tmp/chatgpt-state2.json' });
const page = await ctx.newPage();
page.setDefaultTimeout(60000);

await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
const loginBtn = await page.locator('button:has-text("Log in"), a:has-text("Log in")').count();
const bodyStart = (await page.locator('body').innerText()).slice(0, 200);
console.log('loginBtn:', loginBtn, '| body:', bodyStart.replace(/\n/g, ' / '));

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
  await page.waitForTimeout(500);
}
let i = 0;
for (const [href, title] of seen) console.log(`${String(++i).padStart(3)} ${href}  ${title}`);
await ctx.storageState({ path: '/tmp/chatgpt-state2.json' });
await browser.close();
