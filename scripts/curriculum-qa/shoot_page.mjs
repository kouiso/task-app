// 1日ぶんの撮影を担うワーカー。仕事の一覧は stdin から JSON で受け取る。
//
// Python 側（shoot_screenshots.py）が「どの日をどう起動して何を撮るか」を決め、
// ここは決まったものを撮るだけにしてある。ブラウザを触れるのが Node だけなので
// 分かれているのであって、判断はこちらへ持ち込まない。
//
// 赤枠は必ず locator.boundingBox() から起こす。手で座標を書くと、フォントや
// ウィンドウ幅が少し変わっただけで枠がずれ、しかも撮り直すまで気づけない。
// セレクタ基準なら要素が動いても枠が追いかける。

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const MARK_BADGES = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];

/** stdin を最後まで読む。 */
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** 撮る前の操作を1つ実行する。 */
async function runAction(page, action) {
  const target = page.locator(action.selector).first();
  if (action.kind === 'click') {
    await target.click();
    return;
  }
  if (action.kind === 'fill') {
    await target.fill(action.value);
    return;
  }
  if (action.kind === 'wait_for') {
    await target.waitFor({ state: 'visible' });
    return;
  }
  throw new Error(`知らない操作: ${action.kind}`);
}

/**
 * 赤枠の矩形を集める。座標の出どころは boundingBox() だけ。
 *
 * 要素が見つからない・画面に出ていない場合は例外にする。枠なしで撮って
 * 「撮れた」と言うと、操作指示の付いていない画像が黙って教材へ入る。
 */
async function collectRects(page, marks) {
  const rects = [];
  for (const mark of marks) {
    const target = page.locator(mark.selector).first();
    await target.waitFor({ state: 'visible' });
    const box = await target.boundingBox();
    if (box === null) {
      throw new Error(`赤枠の対象が画面に出ていません: ${mark.selector}`);
    }
    rects.push({ ...box, label: mark.label ?? '' });
  }
  return rects;
}

/** 集めた矩形を画面へ重ねる。撮り終わったら消せるように id を付ける。 */
async function drawMarks(page, rects) {
  await page.evaluate(
    ({ rects, badges }) => {
      const layer = document.createElement('div');
      layer.id = '__curriculum_marks__';
      layer.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
      rects.forEach((rect, i) => {
        const box = document.createElement('div');
        box.style.cssText = [
          'position:fixed',
          `left:${rect.x - 4}px`,
          `top:${rect.y - 4}px`,
          `width:${rect.width + 8}px`,
          `height:${rect.height + 8}px`,
          'border:3px solid #e11d48',
          'border-radius:6px',
          'box-sizing:border-box',
        ].join(';');
        const badge = document.createElement('div');
        badge.textContent = badges[i] ?? String(i + 1);
        badge.style.cssText = [
          'position:fixed',
          `left:${rect.x - 18}px`,
          `top:${rect.y - 18}px`,
          'width:28px',
          'height:28px',
          'line-height:28px',
          'text-align:center',
          'border-radius:14px',
          'background:#e11d48',
          'color:#fff',
          'font-size:16px',
          'font-weight:700',
          "font-family:'Noto Sans JP',sans-serif",
        ].join(';');
        layer.appendChild(box);
        layer.appendChild(badge);
      });
      document.body.appendChild(layer);
    },
    { rects, badges: MARK_BADGES },
  );
}

/** 重ねた赤枠を消す。 */
async function clearMarks(page) {
  await page.evaluate(() => {
    document.getElementById('__curriculum_marks__')?.remove();
  });
}

/** ログインを1回だけ通す。以降は同じ context の Cookie を使い回す。 */
async function login(page, baseUrl, account) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(account.password);
  await page.locator("button[type='submit']").first().click();
  await page.waitForURL(`${baseUrl}/dashboard`, { timeout: 20000 });
}

async function shoot(page, job, shot) {
  await page.goto(`${job.baseUrl}${shot.path}`, { waitUntil: 'networkidle' });
  for (const action of shot.actions ?? []) {
    await runAction(page, action);
  }
  if (shot.wait_for) {
    await page.locator(shot.wait_for).first().waitFor({ state: 'visible' });
  }
  // アニメーションの途中で撮ると、同じ指定でも回ごとに違う絵になる。
  await page.waitForTimeout(400);

  const rects = await collectRects(page, shot.marks ?? []);
  if (rects.length > 0) {
    await drawMarks(page, rects);
  }
  const out = join(job.outDir, shot.name);
  await mkdir(dirname(out), { recursive: true });
  const png = await page.screenshot({ type: 'png' });
  await writeFile(out, png);
  if (rects.length > 0) {
    await clearMarks(page);
  }
  return { name: shot.name, path: out, marks: rects.map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })) };
}

async function main() {
  const job = JSON.parse(await readStdin());
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: job.viewport,
    deviceScaleFactor: 2,
    colorScheme: 'light',
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const done = [];
  try {
    let loggedIn = false;
    for (const shot of job.shots) {
      if (shot.login && !loggedIn) {
        await login(page, job.baseUrl, shot.login);
        loggedIn = true;
      }
      done.push(await shoot(page, job, shot));
    }
  } finally {
    await context.close();
    await browser.close();
  }
  process.stdout.write(JSON.stringify({ ok: true, shots: done }));
}

main().catch((e) => {
  process.stdout.write(JSON.stringify({ ok: false, error: `${e}` }));
  process.exitCode = 1;
});
