// ChatGPT login as sukererion@gmail.com (元レビュー会話の保有アカウント候補)
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const EMAIL = 'sukererion@gmail.com';
const PASS = '7ohVqkvn6QjCR6MTZ3iE';
const OP_ITEM = 'ar7qyww7nah5ifcdwr3rh62bm4';
const STATE = '/tmp/chatgpt-state2.json';

function totp() {
  return execSync(`op item get ${OP_ITEM} --vault RITMO --otp`).toString().trim();
}

const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled', '--lang=ja', '--disable-dev-shm-usage'] });
const hasState = existsSync(STATE);
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'ja-JP', viewport: { width: 1280, height: 900 },
  ...(hasState ? { storageState: STATE } : {}),
});
await ctx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
const page = await ctx.newPage();

if (hasState) {
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
} else {
  await page.goto('https://chatgpt.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  for (let step = 0; step < 15; step++) {
    const url = page.url();
    console.log(`st-${step}: ${url.slice(0, 90)}`);
    if (/chatgpt\.com\/(?!.*auth)|chatgpt\.com\/$|chatgpt\.com\/c\//.test(url) && !/auth|login/.test(url)) break;
    const emailIn = page.locator('input[type="email"]:visible, input[name="email"]:visible, input[name="username"]:visible').first();
    if (await emailIn.count()) {
      await emailIn.fill(EMAIL);
      await page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("続ける"), button:has-text("次へ")').first().click();
      await page.waitForTimeout(3500); continue;
    }
    const pwdIn = page.locator('input[type="password"]:visible').first();
    if (await pwdIn.count()) {
      await pwdIn.fill(PASS);
      await page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("続ける"), button:has-text("ログイン")').first().click();
      await page.waitForTimeout(4000); continue;
    }
    const otpIn = page.locator('input[autocomplete="one-time-code"]:visible, input[name="code"]:visible, input[inputmode="numeric"]:visible').first();
    if (await otpIn.count()) {
      await otpIn.fill(totp());
      const cont = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("続ける")').first();
      if (await cont.count()) await cont.click(); else await page.keyboard.press('Enter');
      await page.waitForTimeout(5000); continue;
    }
    await page.screenshot({ path: `/tmp/chatgpt2-st${step}.png` });
    await page.waitForTimeout(3000);
  }
}
await ctx.storageState({ path: STATE });

// ログイン確認 + 会話一覧
await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const loginBtn = await page.locator('button:has-text("Log in"), a:has-text("Log in")').count();
console.log('loggedIn:', loginBtn === 0, 'url:', page.url());

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
await ctx.storageState({ path: STATE });
await browser.close();
