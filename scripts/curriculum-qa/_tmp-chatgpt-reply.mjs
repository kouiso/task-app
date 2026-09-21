// 既存のレビュー会話スレッドへ返信し、応答を取得する。
// 先に最新の会話（敵対レビューのスレッド）をサイドバーから開く。
// usage: node _tmp-chatgpt-reply.mjs <message-file> [state] [out-file]
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const msgFile = process.argv[2];
const state = process.argv[3] ?? '/tmp/chatgpt-state.json';
const outFile = process.argv[4] ?? '/tmp/chatgpt-reply2.txt';
const message = readFileSync(msgFile, 'utf8');

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ storageState: state });
const page = await ctx.newPage();
page.setDefaultTimeout(90000);

try {
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const loginBtn = await page
    .locator('button:has-text("Log in"), a:has-text("Log in")')
    .count();
  if (loginBtn > 0) {
    console.log('ERROR: ログイン状態ではない');
    await browser.close();
    process.exit(2);
  }

  // サイドバーの最新会話（敵対レビューのスレッド）を開く
  const firstChat = page.locator('nav a[href^="/c/"], aside a[href^="/c/"]').first();
  if (await firstChat.count() === 0) {
    console.log('WARN: 履歴が見つからない→新規チャットで送る');
  } else {
    await firstChat.click();
    await page.waitForTimeout(3000);
    const body = await page.locator('body').innerText();
    if (!body.includes('敵対レビュー') && !body.includes('R30')) {
      console.log('WARN: 最上位の会話がレビュースレッドと違う可能性');
    }
    console.log('opened:', page.url());
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
  const deadline = Date.now() + 420000; // 最大7分
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
  await page.screenshot({ path: '/tmp/chatgpt-reply2.png' });
  console.log(`url: ${page.url()}`);
} catch (e) {
  console.log('ERROR:', String(e).slice(0, 300));
  await page.screenshot({ path: '/tmp/chatgpt-reply2-err.png' }).catch(() => {});
  process.exit(1);
} finally {
  await ctx.storageState({ path: state });
  await browser.close();
}
