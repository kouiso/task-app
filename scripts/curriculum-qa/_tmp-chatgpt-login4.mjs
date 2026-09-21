// sukererion ログイン: 「パスワードで続行」経路を使う。
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
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'ja-JP', viewport: { width: 1280, height: 900 },
});
await ctx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);

for (let step = 0; step < 20; step++) {
  const url = page.url();
  console.log(`st-${step}: ${url.slice(0, 90)}`);
  if (/chatgpt\.com\/(?!.*auth)|chatgpt\.com\/$|chatgpt\.com\/c\//.test(url) && !/auth|login/.test(url)) break;

  const emailIn = page.locator('input[type="email"]:visible, input[name="email"]:visible, input[name="username"]:visible').first();
  if (await emailIn.count()) {
    await emailIn.fill(EMAIL);
    await page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("続ける"), button:has-text("次へ")').first().click();
    await page.waitForTimeout(4000); continue;
  }
  const pwdIn = page.locator('input[type="password"]:visible').first();
  if (await pwdIn.count()) {
    await pwdIn.fill(PASS);
    await page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("続ける"), button:has-text("ログイン"), button:has-text("続行")').first().click();
    await page.waitForTimeout(5000); continue;
  }
  const otpIn = page.locator('input[autocomplete="one-time-code"]:visible').first();
  if (await otpIn.count()) {
    // email-verification 画面: パスワード経由へ切替
    const pwdBtn = page.locator('button:has-text("パスワードで続行"), a:has-text("パスワードで続行"), button:has-text("password"), a:has-text("password")').first();
    if (await pwdBtn.count()) {
      await pwdBtn.click();
      await page.waitForTimeout(4000); continue;
    }
    // パスワード導線がなければTOTPを試す
    await otpIn.fill(totp());
    const cont = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("続行"), button:has-text("続ける")').first();
    if (await cont.count()) await cont.click(); else await page.keyboard.press('Enter');
    await page.waitForTimeout(5000); continue;
  }
  await page.screenshot({ path: `/tmp/chatgpt4-st${step}.png` });
  await page.waitForTimeout(3000);
}
await ctx.storageState({ path: STATE });
await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const loginBtn = await page.locator('button:has-text("Log in"), a:has-text("Log in")').count();
console.log('loggedIn:', loginBtn === 0, 'url:', page.url());
await page.screenshot({ path: '/tmp/chatgpt4-final.png' });
await browser.close();
