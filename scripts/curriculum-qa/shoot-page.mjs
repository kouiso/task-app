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
  // boundingBox() はビューポート基準で返る。ページ全体を撮る指定でも枠が合うよう、
  // ここで文書基準へ直しておく。
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  const rects = [];
  for (const mark of marks) {
    const target = page.locator(mark.selector).first();
    await target.waitFor({ state: 'visible' });
    const box = await target.boundingBox();
    if (box === null) {
      throw new Error(`赤枠の対象が画面に出ていません: ${mark.selector}`);
    }
    rects.push({ ...box, x: box.x + scroll.x, y: box.y + scroll.y, label: mark.label ?? '' });
  }
  return rects;
}

/**
 * 集めた矩形を画面へ重ねる。撮り終わったら消せるように id を付ける。
 *
 * 枠は矩形の外側 4px に置くが、画面の端に接している要素（サイドバー等）では
 * その 4px が画像の外へ出て、辺が1本消える。はみ出すぶんだけ内側へ寄せる。
 * 座標そのものは boundingBox() の値のままで、動かすのは余白の分だけ。
 */
async function drawMarks(page, rects) {
  await page.evaluate(
    ({ rects, badges }) => {
      const pad = 4;
      const badgeSize = 28;
      const pageW = Math.max(document.documentElement.scrollWidth, window.innerWidth);
      const pageH = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      const layer = document.createElement('div');
      layer.id = '__curriculum_marks__';
      layer.style.cssText =
        'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
      rects.forEach((rect, i) => {
        const left = Math.max(0, rect.x - pad);
        const top = Math.max(0, rect.y - pad);
        const width = Math.min(rect.x + rect.width + pad, pageW) - left;
        const height = Math.min(rect.y + rect.height + pad, pageH) - top;
        const box = document.createElement('div');
        box.style.cssText = [
          'position:absolute',
          `left:${left}px`,
          `top:${top}px`,
          `width:${width}px`,
          `height:${height}px`,
          'border:3px solid #e11d48',
          'border-radius:6px',
          'box-sizing:border-box',
        ].join(';');
        const badge = document.createElement('div');
        badge.textContent = badges[i] ?? String(i + 1);
        // 既定は枠の左上角にバッジの中心を重ねる。ただし枠が画面の端に接していると、
        // その位置は画像の外へ出る。単に 0 へ寄せると枠の中の文字に丸ごと乗り、
        // day08/sidebar.png ではロゴが「①ask App」に見えていた。
        // 出られない側は反対の角へ回し、両側とも無理なときだけ画像の中へ寄せる。
        const half = badgeSize / 2;
        const place = (near, far, limit) => {
          if (near - half >= 0) {
            return near - half;
          }
          if (far - half + badgeSize <= limit) {
            return far - half;
          }
          return Math.min(Math.max(0, near - half), limit - badgeSize);
        };
        const badgeLeft = place(left, left + width, pageW);
        const badgeTop = place(top, top + height, pageH);
        badge.style.cssText = [
          'position:absolute',
          `left:${badgeLeft}px`,
          `top:${badgeTop}px`,
          `width:${badgeSize}px`,
          `height:${badgeSize}px`,
          `line-height:${badgeSize}px`,
          'text-align:center',
          `border-radius:${badgeSize / 2}px`,
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

/**
 * 切り抜く矩形を返す。指定した要素の boundingBox() へ padding を足したもの。
 *
 * ページの外へはみ出す分は詰める。はみ出したまま渡すと Playwright が
 * 切り抜きに失敗するか、余った側に何も無い帯が付く。
 */
async function clipRect(page, spec) {
  const target = page.locator(spec.selector).first();
  await target.waitFor({ state: 'visible' });
  const box = await target.boundingBox();
  if (box === null) {
    throw new Error(`切り抜きの対象が画面に出ていません: ${spec.selector}`);
  }
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  const size = await page.evaluate(() => ({
    w: Math.max(document.documentElement.scrollWidth, window.innerWidth),
    h: Math.max(document.documentElement.scrollHeight, window.innerHeight),
  }));
  const pad = spec.padding ?? 0;
  const x = Math.max(0, box.x + scroll.x - pad);
  const y = Math.max(0, box.y + scroll.y - pad);
  return {
    x,
    y,
    width: Math.min(box.x + scroll.x + box.width + pad, size.w) - x,
    height: Math.min(box.y + scroll.y + box.height + pad, size.h) - y,
  };
}

/** ログインを1回だけ通す。以降は同じ context の Cookie を使い回す。 */
async function login(page, baseUrl, account) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'load' });
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(account.password);
  await page.locator("button[type='submit']").first().click();
  await page.waitForURL(`${baseUrl}/dashboard`, { timeout: 20000 });
}

async function shoot(page, job, shot) {
  // 幅の指定がある1枚だけ窓を狭める。列数が幅で変わることを見せる回に要る。
  // 撮り終えたら宣言表の既定へ戻す。戻し忘れると、以降の1枚が黙って別の幅で撮れる。
  if (shot.viewport) {
    await page.setViewportSize(shot.viewport);
  }
  // networkidle は使わない。tRPC の getSession が react-query で回り続ける画面（Day 08 以降の
  // AppLayout）では通信が止まらず、待ち切れずに落ちる。出ているべきものは wait_for で名指しする。
  await page.goto(`${job.baseUrl}${shot.path}`, { waitUntil: 'load' });
  // 前の1枚で押したところにポインタが残ったままだと、次の画面の同じ位置にある部品が
  // hover の見た目で写る（day15 の一覧でゴミ箱アイコンだけ色が付いていた）。
  // 画面の外へ逃がしてから撮る。
  await page.mouse.move(0, 0);
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
  // 切り抜きの矩形も boundingBox() から起こす。中央寄せのカード画面をそのまま撮ると
  // 画像の大半が白場になり、紙面へ載せたときにフォーム本体が読めない大きさまで縮む。
  const clip = shot.clip ? await clipRect(page, shot.clip) : undefined;
  const png = await page.screenshot({
    type: 'png',
    fullPage: shot.full_page === true || clip !== undefined,
    ...(clip ? { clip } : {}),
  });
  await writeFile(out, png);
  if (rects.length > 0) {
    await clearMarks(page);
  }
  if (shot.viewport) {
    await page.setViewportSize(job.viewport);
  }
  return {
    name: shot.name,
    path: out,
    marks: rects.map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
  };
}

async function main() {
  const job = JSON.parse(await readStdin());
  // 既知の差: <input type="date"> の空欄が `mm/dd/yyyy` と出る。日本語環境のブラウザは
  // `年/月/日` と出すので、日付欄のある画像（Day 10・Day 14 のダイアログ）だけ読者の画面と
  // 並びが違う。context の locale でも起動時の --lang でも変わらないことを実測で確かめた。
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
  // 時計を止めずに開始時刻だけ固定する。Day 02 の挨拶は時間帯で「おはよう／こんばんは」が
  // 変わるので、固定しないと撮り直すたびに文面が変わり、教材の本文と食い違う回が出る。
  await page.clock.install({ time: new Date(job.clock) });
  await page.clock.resume();
  const done = [];
  try {
    // 同じ日でも見る人が変わる回がある（Day 09 の空状態はどのプロジェクトにも
    // 属さないアカウントで開いた画面）。前の Cookie が残ったままだと、指定した
    // アカウントではなく前の1枚の続きが撮れるので、変わったら入り直す。
    let signedInAs = null;
    for (const shot of job.shots) {
      if (shot.login && shot.login.email !== signedInAs) {
        await context.clearCookies();
        await login(page, job.baseUrl, shot.login);
        signedInAs = shot.login.email;
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
