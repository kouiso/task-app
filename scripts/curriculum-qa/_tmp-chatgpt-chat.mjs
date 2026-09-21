// ChatGPTへメッセージを投稿し応答を取得する（ログインstate再利用）
// usage: node _tmp-chatgpt-chat.mjs <message-file> [state] [out-file]
// 応答が安定するまで待機し、最後のassistantメッセージを保存する
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const msgFile = process.argv[2];
const state = process.argv[3] ?? '/tmp/chatgpt-state.json';
const outFile = process.argv[4] ?? '/tmp/chatgpt-reply.txt';
const message = readFileSync(msgFile, 'utf8');

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ storageState: state });
const page = await ctx.newPage();
page.setDefaultTimeout(90000);

try {
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/chatgpt-chat-1.png' });

  // ログイン状態確認（ログインボタンが見えたら失敗）
  const loginBtn = await page
    .locator('button:has-text("Log in"), a:has-text("Log in")')
    .count();
  if (loginBtn > 0) {
    console.log('ERROR: ログイン状態ではない');
    await browser.close();
    process.exit(2);
  }

  // composerを探す（ProseMirror contenteditable）
  const composer = page.locator('#prompt-textarea, div[contenteditable="true"]').first();
  await composer.waitFor({ state: 'visible', timeout: 30000 });
  await composer.click();
  await page.waitForTimeout(500);
  // 長文はtypeだと遅いのでclipboard経由
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text);
  }, message);
  await page.keyboard.press('ControlOrMeta+v');
  await page.waitForTimeout(1500);

  // 送信ボタン
  const sendBtn = page.locator('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="送信"]').first();
  await sendBtn.click();
  console.log('sent. waiting for response...');

  // 応答完了待機: stopボタンが消え、最終メッセージが安定するまでポーリング
  let lastText = '';
  let stableCount = 0;
  const deadline = Date.now() + 300000; // 最大5分
  await page.waitForTimeout(8000);
  while (Date.now() < deadline) {
    const texts = await page.locator('div[data-message-author-role="assistant"] .markdown, div[data-message-author-role="assistant"]').allInnerTexts();
    const cur = texts.at(-1) ?? '';
    if (cur === lastText && cur.length > 50) {
      stableCount++;
      if (stableCount >= 4) break; // 約12秒安定で完了とみなす
    } else {
      stableCount = 0;
      lastText = cur;
    }
    await page.waitForTimeout(3000);
  }

  writeFileSync(outFile, lastText);
  console.log(`reply saved: ${outFile} (${lastText.length} chars)`);
  await page.screenshot({ path: '/tmp/chatgpt-chat-done.png', fullPage: false });
  // 会話URLを保存（続きの議論に使う）
  console.log(`url: ${page.url()}`);
} catch (e) {
  console.log('ERROR:', String(e).slice(0, 300));
  await page.screenshot({ path: '/tmp/chatgpt-chat-err.png' }).catch(() => {});
  process.exit(1);
} finally {
  await ctx.storageState({ path: state });
  await browser.close();
}
