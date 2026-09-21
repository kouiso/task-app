import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  storageState: '/tmp/chatgpt-state.json', viewport: { width: 1400, height: 950 },
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/share/6aa52eb5-9488-83ee-9468-f56032e7b29f', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
const btns = await page.$$('button:has-text("ダウンロード")');
console.log('download buttons:', btns.length);
for (let i = 0; i < btns.length; i++) {
  try {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      btns[i].click(),
    ]);
    const path = `/tmp/chatgpt-dl/${dl.suggestedFilename()}`;
    await dl.saveAs(path);
    console.log('saved:', path);
  } catch (e) {
    console.log(`btn${i}: no download —`, e.message.split('\n')[0]);
  }
}
await browser.close();
