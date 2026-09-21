// ChatGPT login as account@ritmo.co.jp, then open the shared review chat
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const EMAIL = 'account@ritmo.co.jp';
const PASS = process.env.CPASS;
const OP_ITEM = 'fnvrudoaxgxls74va55ryhiicq';

function totp() {
  return execSync(`op item get ${OP_ITEM} --vault RITMO --otp`).toString().trim();
}

const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled', '--lang=ja', '--disable-dev-shm-usage'] });
const hasState = existsSync('/tmp/chatgpt-state.json');
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'ja-JP', viewport: { width: 1280, height: 900 },
  ...(hasState ? { storageState: '/tmp/chatgpt-state.json' } : {}),
});
await ctx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
const page = await ctx.newPage();
page.on('response', r => { if (r.status() >= 400 && !/sentry|cdn\.openai/.test(r.url())) console.log('HTTP', r.status(), r.url().slice(0, 100)); });

async function dump(tag) {
  console.log(`=== ${tag}: ${page.url().slice(0, 100)} | ${await page.title()}`);
}

if (hasState) {
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await dump('01-restored');
} else {
  await page.goto('https://chatgpt.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await dump('02-auth');
  await page.screenshot({ path: '/tmp/chatgpt-auth.png' });

  for (let step = 0; step < 15; step++) {
    const url = page.url();
    await dump(`st-${step}`);
    if (/chatgpt\.com\/(?!.*auth)|chatgpt\.com\/$|chatgpt\.com\/c\//.test(url) && !/auth|login/.test(url)) break;
    const emailIn = page.locator('input[type="email"]:visible, input[name="email"]:visible, input[name="username"]:visible').first();
    if (await emailIn.count()) {
      await emailIn.fill(EMAIL);
      const cont = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("続ける"), button:has-text("次へ")').first();
      await cont.click(); await page.waitForTimeout(3500); continue;
    }
    const pwdIn = page.locator('input[type="password"]:visible').first();
    if (await pwdIn.count()) {
      await pwdIn.fill(PASS);
      const cont = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("続ける"), button:has-text("ログイン")').first();
      await cont.click(); await page.waitForTimeout(4000); continue;
    }
    const otpIn = page.locator('input[autocomplete="one-time-code"]:visible, input[name="code"]:visible, input[inputmode="numeric"]:visible').first();
    if (await otpIn.count()) {
      await otpIn.fill(totp());
      const cont = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("続ける")').first();
      if (await cont.count()) await cont.click(); else await page.keyboard.press('Enter');
      await page.waitForTimeout(5000); continue;
    }
    await page.screenshot({ path: `/tmp/chatgpt-st${step}.png` });
    await page.waitForTimeout(3000);
  }
  await ctx.storageState({ path: '/tmp/chatgpt-state.json' });
}

await dump('03-final');
await page.screenshot({ path: '/tmp/chatgpt-final.png' });
console.log('body:', (await page.locator('body').innerText()).slice(0, 300));
await browser.close();
console.log('DONE');
