// 指定会話URLを開き、末尾メッセージと添付ファイルリンクを列挙する。
// usage: node _tmp-chatgpt-inspect.mjs <conv-url> [state]
import { chromium } from 'playwright';

const convUrl = process.argv[2];
const state = process.argv[3] ?? '/tmp/chatgpt-state.json';
const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ storageState: state });
const page = await ctx.newPage();
page.setDefaultTimeout(60000);

await page.goto(convUrl, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);

// 末尾までスクロールして全メッセージをロード
for (let i = 0; i < 30; i++) {
  await page.evaluate(() => window.scrollBy(0, -3000));
  await page.waitForTimeout(300);
}
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1500);

// 添付ファイル: ダウンロードボタンや sandbox: リンクを探す
const html = await page.content();
const sandboxes = [...html.matchAll(/sandbox:\/mnt\/data\/[^"'\s)]+/g)].map((m) => m[0]);
console.log('== sandbox links ==');
for (const s of new Set(sandboxes)) console.log(s);

// メッセージ件数と末尾3件の冒頭
const msgs = await page.locator('[data-message-author-role]').allInnerTexts();
console.log(`== messages: ${msgs.length} ==`);
for (const m of msgs.slice(-4)) {
  console.log('---');
  console.log(m.slice(0, 600));
}
await ctx.storageState({ path: state });
await browser.close();
