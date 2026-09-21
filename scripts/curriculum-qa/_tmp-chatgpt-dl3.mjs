import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  storageState: '/tmp/chatgpt-state.json', viewport: { width: 1400, height: 950 },
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/share/6aa52eb5-9488-83ee-9468-f56032e7b29f', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
const [btn] = await page.$$('button:has-text("PDF")');
if (!btn) { console.log('no PDF button'); process.exit(1); }
const [ev] = await Promise.all([
  Promise.race([
    page.waitForEvent('download', { timeout: 45000 }).then(d => ({ type: 'download', d })),
    ctx.waitForEvent('page', { timeout: 45000 }).then(p => ({ type: 'page', p })),
  ]).catch(e => ({ type: 'err', e })),
  btn.click(),
]);
if (ev.type === 'download') {
  const path = `/tmp/chatgpt-dl/${ev.d.suggestedFilename()}`;
  await ev.d.saveAs(path);
  console.log('saved:', path);
} else if (ev.type === 'page') {
  console.log('new page:', ev.p.url());
  await ev.p.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  console.log('after load:', ev.p.url());
  // may be a file viewer with download button
  const dlBtn = await ev.p.$('button[aria-label*="ownload"], button:has-text("ダウンロード"), a[download]');
  if (dlBtn) {
    const [dl2] = await Promise.all([
      ev.p.waitForEvent('download', { timeout: 45000 }),
      dlBtn.click(),
    ]);
    const path = `/tmp/chatgpt-dl/${dl2.suggestedFilename()}`;
    await dl2.saveAs(path);
    console.log('saved2:', path);
  }
} else {
  console.log('err:', ev.e?.message?.split('\n')[0]);
}
await browser.close();
