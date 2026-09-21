// Vercel token creation via Google OAuth (headless). Bypasses device flow:
// logs in with Google, then creates a token on /account/settings/tokens.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';

const EMAIL = process.env.VEMAIL;
const PASS = process.env.VPASS;
const OP_ITEM = process.env.VOP_ITEM;
const TOKEN_NAME = process.env.VTOKEN_NAME || 'devin-cli-wsl';

function totp() {
  return execSync(`op item get ${OP_ITEM} --vault RITMO --otp`).toString().trim();
}

const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--lang=ja'] });
const hasState = existsSync('/tmp/vercel-state.json');
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'ja-JP', viewport: { width: 1280, height: 900 },
  ...(hasState ? { storageState: '/tmp/vercel-state.json' } : {}),
});
await ctx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
const page = await ctx.newPage();
page.on('response', r => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url().slice(0, 120)); });

async function dump(tag) {
  console.log(`=== ${tag}: ${page.url().slice(0, 110)} | ${await page.title()}`);
}

if (hasState) {
  await page.goto('https://vercel.com/kouisos-projects', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  await dump('01-restored');
} else {
await page.goto('https://vercel.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2500);
await dump('01-login');

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
for (let step = 0; step < 15; step++) {
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

await dump('03-logged-in');
try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
await ctx.storageState({ path: '/tmp/vercel-state.json' });
}

// Create a token on the account settings page
await page.goto('https://vercel.com/account/settings/tokens', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
await dump('04-tokens');
await page.screenshot({ path: '/tmp/vercel-tokens-page.png' });

// Inline form: TOKEN NAME input, SCOPE select, EXPIRATION select, Create button
const nameInput = page.locator('input[placeholder="New Token"], input[name="name"]').first();
await nameInput.fill(TOKEN_NAME);
await page.waitForTimeout(500);

// SCOPE: click the select trigger by its bounding box (custom component;
// text nodes live in a hidden listbox, so DOM-walk clicks don't open it)
const scopeBox = await page.evaluate(() => {
  const els = [...document.querySelectorAll('div, button, input')];
  const el = els.find(e => {
    const r = e.getBoundingClientRect();
    return r.width > 200 && r.width < 400 && /select scope/i.test(e.textContent || e.placeholder || '') && r.top > 200 && r.top < 600;
  });
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
console.log('scopeBox:', JSON.stringify(scopeBox));
if (scopeBox) await page.mouse.click(scopeBox.x, scopeBox.y);
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/vercel-scope-open.png' });
// pick "Full Account" (fallback: first option) by bounding-box click
const scopePick = await page.evaluate(() => {
  const cands = [...document.querySelectorAll('li, div[role="option"], [role="option"]')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 100 && r.height > 20 && r.height < 80 && r.top > 0; });
  const full = cands.find(e => /full account/i.test(e.textContent)) || cands[0];
  if (!full) return null;
  const r = full.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: (full.textContent || '').slice(0, 50) };
});
console.log('scopePick:', JSON.stringify(scopePick));
if (scopePick) await page.mouse.click(scopePick.x, scopePick.y); else await page.keyboard.press('Enter');
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/vercel-scope-picked.png' });

// EXPIRATION: native <select> — the popup is OS-rendered, set the value directly
const selects = await page.evaluate(() =>
  [...document.querySelectorAll('select')].map(s => ({
    name: s.name, id: s.id, opts: [...s.options].map(o => o.label || o.textContent),
  }))
);
console.log('selects:', JSON.stringify(selects));
const expSel = page.locator('select').last();
if (await expSel.count()) {
  await expSel.selectOption({ label: 'No Expiration' }).catch(async () => {
    await expSel.selectOption({ index: (await expSel.locator('option').count()) - 1 });
  });
  console.log('exp via selectOption:', await expSel.inputValue());
} else {
  // custom listbox fallback
  const expBox = await page.evaluate(() => {
    const els = [...document.querySelectorAll('div, button, input')];
    const el = els.find(e => {
      const r = e.getBoundingClientRect();
      return r.width > 150 && r.width < 400 && /select date/i.test(e.textContent || e.placeholder || '') && r.top > 200 && r.top < 600;
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (expBox) await page.mouse.click(expBox.x, expBox.y);
  await page.waitForTimeout(1200);
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
}
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/vercel-token-filled.png' });

// Submit
const submitBtn = page.locator('button:has-text("Create")').last();
await submitBtn.click();
await page.waitForTimeout(4000);
await dump('05-token-created');
await page.screenshot({ path: '/tmp/vercel-token-shown.png' });

// Extract token: usually shown once in a readonly input or code block
const token = await page.evaluate(() => {
  // the "Token Created" dialog shows the value in a readonly input
  const dlg = document.querySelector('[role="dialog"], dialog');
  if (dlg) {
    const inp = dlg.querySelector('input[readonly], input[value]');
    if (inp && /^vcp_/.test(inp.value || '')) return inp.value;
    const txt = (dlg.innerText || '').match(/vcp_[A-Za-z0-9_-]{20,}/);
    if (txt) return txt[0];
  }
  const m = document.body.innerText.match(/vcp_[A-Za-z0-9_-]{20,}/);
  return m ? m[0] : null;
});
if (token) {
  writeFileSync('/tmp/vercel-token.txt', token + '\n', { mode: 0o600 });
  console.log('TOKEN_SAVED len=' + token.length);
} else {
  console.log('TOKEN_NOT_FOUND');
}
await browser.close();
console.log('DONE');
