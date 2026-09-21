// Neon console login probe: Google OAuth -> console.neon.tech project list
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const EMAIL = process.env.VEMAIL;
const PASS = process.env.VPASS;
const OP_ITEM = process.env.VOP_ITEM;

function totp() {
  return execSync(`op item get ${OP_ITEM} --vault RITMO --otp`).toString().trim();
}

const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--lang=ja'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'ja-JP', viewport: { width: 1280, height: 900 },
});
await ctx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
const page = await ctx.newPage();
page.on('response', r => { if (r.status() >= 400 && !/sentry/.test(r.url())) console.log('HTTP', r.status(), r.url().slice(0, 110)); });

async function dump(tag) {
  console.log(`=== ${tag}: ${page.url().slice(0, 110)} | ${await page.title()}`);
}

await page.goto('https://console.neon.tech', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
await dump('01-neon');
await page.screenshot({ path: '/tmp/neon-01.png' });

const gbtn = page.locator('button:has-text("Google"), a:has-text("Google"), button:has-text("Continue with Google")').first();
if (await gbtn.count()) {
  await gbtn.click();
  await page.waitForTimeout(4000);
  await dump('02-google');
} else {
  console.log('no google button; body:', (await page.locator('body').innerText()).slice(0, 300));
}

let pwdDone = false;
let emailDone = false;
for (let step = 0; step < 15; step++) {
  const url = page.url();
  if (!url.includes('accounts.google.com')) break;
  await dump(`ch-${step}`);
  const emailInput = page.locator('input[type="email"]:visible, input[name="identifier"]:visible, input[type="text"]:visible').first();
  if (await emailInput.count() && !emailDone) {
    await emailInput.fill(EMAIL);
    await page.locator('button:has-text("Next"), button:has-text("次へ")').first().click();
    emailDone = true; await page.waitForTimeout(3500); continue;
  }
  if (await page.locator('input[type="password"]:visible').count() && !pwdDone) {
    await page.locator('input[type="password"]:visible').first().fill(PASS);
    await page.locator('button:has-text("Next"), button:has-text("次へ")').first().click();
    pwdDone = true; await page.waitForTimeout(4000); continue;
  }
  if (await page.locator('input[type="tel"]:visible, input[autocomplete="one-time-code"]:visible').count()) {
    await page.locator('input[type="tel"]:visible, input[autocomplete="one-time-code"]:visible').first().fill(totp());
    await page.locator('button:has-text("Next"), button:has-text("次へ")').first().click();
    await page.waitForTimeout(4500); continue;
  }
  if (url.includes('/challenge/selection')) {
    const sel = pwdDone
      ? page.locator('div[role="link"][data-challengeid]:has-text("認証システム"), div[role="link"][data-challengeid]:has-text("Authenticator")').first()
      : page.locator('div[role="link"][data-challengeid]:has-text("パスワード")').first();
    if (await sel.count()) { await sel.click(); await page.waitForTimeout(3000); continue; }
  }
  const otherWay = page.locator('button:has-text("別の方法を試す"), button:has-text("Try another way")').first();
  if (await otherWay.count()) { await otherWay.click(); await page.waitForTimeout(2500); continue; }
  const cont = page.locator('button:has-text("Continue"), button:has-text("次へ"), button:has-text("許可"), button:has-text("Allow")').first();
  if (await cont.count()) { await cont.click().catch(() => {}); await page.waitForTimeout(3000); continue; }
  await page.waitForTimeout(2500);
}

await dump('03-after-google');
await page.waitForTimeout(8000);
await dump('04-final');
await page.screenshot({ path: '/tmp/neon-final.png' });
console.log('body:', (await page.locator('body').innerText()).slice(0, 500));
await ctx.storageState({ path: '/tmp/neon-state.json' });
await browser.close();
console.log('DONE');
