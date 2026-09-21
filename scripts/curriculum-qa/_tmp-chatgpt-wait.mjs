// 敵対レビュースレッドの最新 assistant メッセージを、生成完了まで待って取得する。
// usage: node _tmp-chatgpt-wait.mjs [state] [out-file]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const state = process.argv[2] ?? '/tmp/chatgpt-state.json';
const outFile = process.argv[3] ?? '/tmp/chatgpt-reply3-final.txt';
const THREAD = 'https://chatgpt.com/c/6aa53c1c-33a4-83ee-af2e-95742b6e2e03';

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ storageState: state });
const page = await ctx.newPage();
page.setDefaultTimeout(90000);

try {
  await page.goto(THREAD, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  // Stop answering ボタンが消える＝生成完了。最大10分待つ
  const deadline = Date.now() + 600000;
  let lastText = '';
  let stable = 0;
  while (Date.now() < deadline) {
    const stopBtn = await page
      .locator('button:has-text("Stop"), button[aria-label*="Stop"]')
      .count();
    const texts = await page
      .locator('div[data-message-author-role="assistant"] .markdown, div[data-message-author-role="assistant"]')
      .allInnerTexts();
    const cur = texts.at(-1) ?? '';
    const generating = stopBtn > 0;
    process.stdout.write(
      `\rstop=${generating} len=${cur.length} stable=${stable}   `,
    );
    if (!generating && cur === lastText && cur.length > 100) {
      stable++;
      if (stable >= 4) {
        console.log('\ngeneration finished');
        break;
      }
    } else {
      stable = 0;
    }
    lastText = cur;
    await page.waitForTimeout(4000);
  }
  writeFileSync(outFile, lastText);
  console.log(`\nsaved: ${outFile} (${lastText.length} chars)`);
  await page.screenshot({ path: '/tmp/chatgpt-reply3-final.png' });
} catch (e) {
  console.log('ERROR:', String(e).slice(0, 300));
  process.exit(1);
} finally {
  await ctx.storageState({ path: state });
  await browser.close();
}
