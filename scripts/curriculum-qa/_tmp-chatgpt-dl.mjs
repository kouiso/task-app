import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: process.env.HEADED !== '1', args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  storageState: '/tmp/chatgpt-state.json', viewport: { width: 1400, height: 950 },
});
const page = await ctx.newPage();
await page.goto('https://chatgpt.com/share/6aa52eb5-9488-83ee-9468-f56032e7b29f', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
// find elements containing ダウンロード text, dump their ancestry + any URL attrs
const els = await page.evaluate(() => {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (/ダウンロード/.test(n.textContent)) {
      let el = n.parentElement;
      const chain = [];
      for (let i = 0; i < 5 && el; i++) {
        chain.push({ tag: el.tagName, cls: String(el.className).slice(0, 80), href: el.href || el.getAttribute('download') || '', role: el.getAttribute('role') || '' });
        el = el.parentElement;
      }
      out.push({ text: n.textContent.trim().slice(0, 80), chain });
    }
  }
  return out;
});
console.log(JSON.stringify(els, null, 1));
await browser.close();
