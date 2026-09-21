// Vercel device-flow auth via Google OAuth (headless). v3
// Same state machine, then poll the Allow Access button state and click when live.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const USER_CODE = process.env.VUSER_CODE;
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
  Object.defineProperty(navigator, 'languages', { get: () => ['ja-JP', 'ja', 'en-US', 'en'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3].map(() => ({})) });
});
const page = await ctx.newPage();
page.on('response', r => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url().slice(0, 120)); });

async function dump(tag) {
  console.log(`=== ${tag}: ${page.url().slice(0, 110)} | ${await page.title()}`);
}

await page.goto(`https://vercel.com/oauth/device?user_code=${USER_CODE}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
await dump('01-device');

await page.locator('button:has-text("Continue with Google")').click();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(3000);
await dump('02-google');

const emailInput = page.locator('input[type="email"]:visible, input[name="identifier"]:visible, input[type="text"]:visible').first();
if (await emailInput.count()) {
  await emailInput.fill(EMAIL);
  await page.locator('button:has-text("Next"), button:has-text("次へ")').first().click();
  await page.waitForTimeout(3500);
}

let pwdDone = false;
for (let step = 0; step < 12; step++) {
  const url = page.url();
  if (!url.includes('accounts.google.com')) break;
  await dump(`ch-${step}`);
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

await dump('05-left-google');

// settle through the login/callback navigation, then land on the device page again
try { await page.waitForURL(/vercel\.com/, { timeout: 45000 }); } catch {}
try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
await page.goto(`https://vercel.com/oauth/device?user_code=${USER_CODE}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForTimeout(3000);
await dump('06-device-again');

// poll the Allow Access button state for up to 60s, then click when enabled
for (let i = 0; i < 30; i++) {
  const state = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const allow = btns.find(b => /allow access/i.test(b.innerText || ''));
    if (!allow) return 'no-button';
    return `disabled=${allow.disabled} class=${allow.className.slice(0, 60)}`;
  }).catch(() => 'nav');
  console.log(`allow-state[${i}]:`, state);
  if (state !== 'no-button' && state !== 'nav' && !state.includes('disabled=true')) break;
  await page.waitForTimeout(2000);
}
const allowBtn = page.locator('button:has-text("Allow Access")').first();
await allowBtn.click({ force: true }).catch(e => console.log('click err:', e.message.slice(0, 100)));
await page.waitForTimeout(4000);
await dump('07-after-allow');
await page.screenshot({ path: '/tmp/vercel-after-allow.png' });
await browser.close();
console.log('DONE');
