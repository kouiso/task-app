// 敵対レビューのスレッドへ返信する（第2往復の正しい宛先）。
// サイドバーでタイトルに「敵対レビュー」を含む会話を探して開く。
// usage: node _tmp-chatgpt-reply3.mjs <message-file> [state] [out-file]
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const msgFile = process.argv[2];
const state = process.argv[3] ?? '/tmp/chatgpt-state.json';
const outFile = process.argv[4] ?? '/tmp/chatgpt-reply3.txt';
const message = readFileSync(msgFile, 'utf8');

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ storageState: state });
const page = await ctx.newPage();
page.setDefaultTimeout(90000);

try {
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  const loginBtn = await page
    .locator('button:has-text("Log in"), a:has-text("Log in")')
    .count();
  if (loginBtn > 0) {
    console.log('ERROR: ログイン状態ではない');
    await browser.close();
    process.exit(2);
  }

  // サイドバーの会話一覧からタイトルで「敵対レビュー」を含むものを探す
  const links = page.locator('nav a[href^="/c/"], aside a[href^="/c/"]');
  const count = await links.count();
  let target = null;
  for (let i = 0; i < count; i++) {
    const text = (await links.nth(i).innerText()).trim();
    if (text.includes('敵対レビュー')) {
      target = links.nth(i);
      console.log(`found: "${text}"`);
      break;
    }
  }
  if (!target) {
    // タイトルで見つからなければ候補を全部出して終了
    console.log('ERROR: 敵対レビュースレッドがサイドバーに無い。候補一覧:');
    for (let i = 0; i < Math.min(count, 20); i++) {
      console.log(` - ${(await links.nth(i).innerText()).trim().slice(0, 50)}`);
    }
    await browser.close();
    process.exit(3);
  }
  await target.click();
  await page.waitForTimeout(4000);
  console.log('opened:', page.url());
  const body = await page.locator('body').innerText();
  if (!body.includes('敵対レビュー') && !body.includes('R30') && !body.includes('R08')) {
    console.log('WARN: 開いた会話がレビュースレッドと違う可能性');
  }

  const composer = page.locator('#prompt-textarea, div[contenteditable="true"]').first();
  await composer.waitFor({ state: 'visible', timeout: 30000 });
  await composer.click();
  await page.waitForTimeout(500);
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text);
  }, message);
  await page.keyboard.press('ControlOrMeta+v');
  await page.waitForTimeout(1500);

  const sendBtn = page.locator('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="送信"]').first();
  await sendBtn.click();
  console.log('sent. waiting for response...');

  let lastText = '';
  let stableCount = 0;
  const deadline = Date.now() + 420000;
  await page.waitForTimeout(8000);
  while (Date.now() < deadline) {
    const texts = await page.locator('div[data-message-author-role="assistant"] .markdown, div[data-message-author-role="assistant"]').allInnerTexts();
    const cur = texts.at(-1) ?? '';
    if (cur === lastText && cur.length > 50) {
      stableCount++;
      if (stableCount >= 4) break;
    } else {
      stableCount = 0;
      lastText = cur;
    }
    await page.waitForTimeout(3000);
  }

  writeFileSync(outFile, lastText);
  console.log(`reply saved: ${outFile} (${lastText.length} chars)`);
  await page.screenshot({ path: '/tmp/chatgpt-reply3.png' });
  console.log(`url: ${page.url()}`);
} catch (e) {
  console.log('ERROR:', String(e).slice(0, 300));
  await page.screenshot({ path: '/tmp/chatgpt-reply3-err.png' }).catch(() => {});
  process.exit(1);
} finally {
  await ctx.storageState({ path: state });
  await browser.close();
}
