// Dump DOM of the Google challenge-selection page reached after 別の方法を試す
import { chromium } from 'playwright';
const EMAIL = process.env.VEMAIL;
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--lang=ja'] });
const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', locale: 'ja-JP' });
const page = await ctx.newPage();
await page.goto('https://accounts.google.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const emailInput = page.locator('input[type="email"]:visible, input[name="identifier"]:visible, input[type="text"]:visible').first();
await emailInput.fill(EMAIL);
await page.locator('button:has-text("Next"), button:has-text("次へ")').first().click();
await page.waitForTimeout(3500);
const otherWay = page.locator('button:has-text("別の方法を試す")').first();
await otherWay.click();
await page.waitForTimeout(3000);
console.log('URL:', page.url());
// dump clickable-looking nodes containing the target strings
const info = await page.evaluate(() => {
  const out = [];
  const all = document.querySelectorAll('*');
  for (const el of all) {
    const t = (el.innerText || '').trim();
    if ((t === 'パスワードを入力' || t === 'パスキーを使用' || t === '別の方法を試す') && el.children.length < 4) {
      const r = el.getBoundingClientRect();
      out.push(`${el.tagName}.${el.className} role=${el.getAttribute('role')} jsname=${el.getAttribute('jsname')} data-challengeid=${el.getAttribute('data-challengeid')} tabindex=${el.tabIndex} vis=${r.width > 0} "${t}" parent=${el.parentElement?.tagName}.${el.parentElement?.className?.slice(0, 40)}`);
    }
  }
  return out.join('\n');
});
console.log(info);
await page.screenshot({ path: '/tmp/sel-dom.png' });
await browser.close();
