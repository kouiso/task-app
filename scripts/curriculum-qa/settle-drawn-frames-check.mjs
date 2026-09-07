// 収束待ちを、実物のブラウザで確かめる退行テスト。
//
// なぜ実物で確かめるか: Recharts の描画は requestAnimationFrame で属性を書き換える形で
// 動くため、`document.getAnimations()` には1つも出てこん。ソースの文字列を見るだけの検査は
// 「呼んどるか」しか言えず、「描き終わるまで待てとるか」は言えん。ここだけは実際に
// 動かして、描きかけの形で止まらんことを見る。
//
// ブラウザが無い機械（CI の一部）では SKIP と出して 0 で抜ける。挙動が違うときだけ落ちる。

const FINAL_D = 'M0 100 L100 100';

// react-smooth と同じ形の動き: Web Animations を使わず rAF で属性を書き換える。
const PAGE = `<!doctype html><html><body>
<svg width="200" height="200"><path id="p" d="M0 0 L0 0"></path></svg>
<script>
  const path = document.getElementById('p');
  const started = performance.now();
  const DURATION = 600;
  function frame(now) {
    const ratio = Math.min(1, (now - started) / DURATION);
    path.setAttribute('d', 'M0 ' + Math.round(ratio * 100) + ' L' + Math.round(ratio * 100) + ' 100');
    if (ratio < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
</script></body></html>`;

// Recharts の `<Pie>` は既定で暫く待ってから動き出す。その待ちの間は形が動かんので、
// フレーム数で数える判定は「もう止まっとる」と誤読して**動き出す前の絵**を撮る。
// 実物と同じ形を作って、そこを踏まんことを確かめる。
const DELAYED_START_MS = 400;
const DELAYED_FINAL_D = 'M0 100 L100 100';
const DELAYED = `<!doctype html><html><body>
<svg width="200" height="200"><path id="p" d="M0 0 L0 0"></path></svg>
<script>
  const path = document.getElementById('p');
  const DURATION = 300;
  let started = null;
  function frame(now) {
    if (started === null) started = now;
    // 開始の遅延。ここでは形を一切触らんので、短い窓やと収束したように見える。
    if (now - started < ${DELAYED_START_MS}) { requestAnimationFrame(frame); return; }
    const ratio = Math.min(1, (now - started - ${DELAYED_START_MS}) / DURATION);
    path.setAttribute('d', 'M0 ' + Math.round(ratio * 100) + ' L' + Math.round(ratio * 100) + ' 100');
    if (ratio < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
</script></body></html>`;

// 円は cx/cy だけで動く。収束判定がその2つを見てへんと、動いとる最中でも
// 「形が変わってへん」と読んで途中の絵を撮る。移動だけの動きで確かめる。
const MOVING_FINAL_CX = '150';
const MOVING = `<!doctype html><html><body>
<svg width="200" height="200"><circle id="c" r="10" cx="10" cy="10"></circle></svg>
<script>
  // 収束の窓（DRAWN_FRAME_STABLE_MS）より長く動かす。短いと、cx/cy を見てへん判定でも
  // 窓を満たす頃には動きが終わっとって最終形が撮れてまい、**検査が何も見てへんのに緑**になる。
  const DURATION = 1500;
  let started = null;
  function frame(now) {
    if (started === null) started = now;
    const ratio = Math.min(1, (now - started) / DURATION);
    c.setAttribute('cx', String(10 + Math.round(ratio * 140)));
    c.setAttribute('cy', String(10 + Math.round(ratio * 140)));
    if (ratio < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
</script></body></html>`;

// Recharts の `<Line>` は線の出現を `d` を固定したまま破線の刻みで描く。収束判定が
// `stroke-dasharray` を見てへんと、初期フレームから形が変わらんように見えて、
// 描きかけの折れ線を撮る。窓（DRAWN_FRAME_STABLE_MS）より長く動かすのは、短いと
// 見てへん判定でも最終形が撮れてまい **検査が何も見てへんのに緑**になるため。
const DASH_FINAL = '140';
const DASHED = `<!doctype html><html><body>
<svg width="200" height="200"><path id="p" d="M0 100 L140 100" stroke="black" stroke-dasharray="0"></path></svg>
<script>
  const path = document.getElementById('p');
  const DURATION = 1500;
  let started = null;
  function frame(now) {
    if (started === null) started = now;
    const ratio = Math.min(1, (now - started) / DURATION);
    // d 属性は最初から最終形。動くのは破線の刻みだけ。
    path.setAttribute('stroke-dasharray', String(Math.round(ratio * 140)));
    if (ratio < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
</script></body></html>`;

const SPINNING = `<!doctype html><html><body>
<svg width="200" height="200"><circle id="c" r="10" cx="10" cy="10"></circle></svg>
<script>
  const c = document.getElementById('c');
  let n = 0;
  function frame() { c.setAttribute('r', 10 + (n++ % 7)); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
</script></body></html>`;

const fails = [];

/** 退ける。ブラウザが用意でけへんときだけ通る道。 */
function skip(reason) {
  // 進捗の出力に console は使えん（biome の noConsole は warn / error だけ許す）。
  process.stdout.write(`SKIP: ${reason}\n`);
  process.exit(0);
}

/** 例外の1行目だけ取る。stack まで出すと SKIP の理由が読めん。 */
function firstLine(err) {
  return String(err?.message ?? err).split('\n')[0];
}

// 取り込みを try の中でやるのは、`import` を頭に書くと playwright が入ってへん機械で
// **この行に来る前に**読み込みが落ちて、下の SKIP へ入れんため。
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (err) {
  skip(`playwright が入っとらん（${firstLine(err)}）`);
}

// ここから先の取り込みの失敗は退けん。playwright が在る以上、`shoot-page.mjs` が
// 読み込みで落ちるのは**撮影ワーカーそのものが壊れとる**ということで、ブラウザの
// 有無とは関係がない。ここも SKIP に混ぜると、ワーカーが動かんのに検査だけ緑になる。
// shoot() が実際に呼ぶのは settleAnimations のほうや。そちらを叩くことで、
// 「収束待ちを呼ぶ経路ごと消した」場合もこの検査が赤くなる。
const { settleAnimations } = await import('./shoot-page.mjs');

let browser;
try {
  browser = await chromium.launch();
} catch (err) {
  skip(`ブラウザを起動できんかった（${firstLine(err)}）`);
}

// fixture ごとに新しいページを開く。同じページへ `setContent` を重ねると、2枚目以降の
// 有限アニメーションが走らんことがある（Chromium が描画を要求されるまで rAF を回さん）。
// 使い回すと「動き出す前に撮った」のか「そもそも動いてへん」のか区別が付かんくなり、
// 検査が何も見てへんのに緑になる。
async function withPage(html, body) {
  const page = await browser.newPage();
  try {
    await page.setContent(html);
    return await body(page);
  } finally {
    await page.close();
  }
}

try {
  // 1. rAF で描くアニメーションが終わるまで待てること。
  const drawn = await withPage(PAGE, async (page) => {
    await settleAnimations(page);
    return page.getAttribute('#p', 'd');
  });
  if (drawn !== FINAL_D) {
    fails.push(`❌ rAF で描くアニメーションの途中で撮っている（d=${drawn} / 期待 ${FINAL_D}）`);
  }

  // 2. 待つ前は途中の形やと確かめる。1 が「もともと最終形やった」で通るのを防ぐ。
  const early = await withPage(PAGE, (page) => page.getAttribute('#p', 'd'));
  if (early === FINAL_D) {
    fails.push('❌ 待たんでも最終形が出ている（この検査は何も見ていない）');
  }

  // 3. 終わらん動きでも、上限で戻ってくること（撮影が止まらんこと）。
  const startedAt = Date.now();
  await withPage(SPINNING, (page) => settleAnimations(page));
  const elapsed = Date.now() - startedAt;
  if (elapsed > 6000) {
    fails.push(`❌ 終わらん動きで待ち続けている（${elapsed}ms）`);
  }

  // 4. 遅れて動き出すアニメーションを、動き出す前に「止まった」と誤読せんこと。
  const delayedDrawn = await withPage(DELAYED, async (page) => {
    await settleAnimations(page);
    return page.getAttribute('#p', 'd');
  });
  if (delayedDrawn !== DELAYED_FINAL_D) {
    fails.push(
      `❌ 遅れて動き出す描画を、動き出す前に撮っている（d=${delayedDrawn} / 期待 ${DELAYED_FINAL_D}）`,
    );
  }

  // 5. 座標だけで動く SVG を、動いとる最中に「止まった」と読まんこと。
  const movedCx = await withPage(MOVING, async (page) => {
    await settleAnimations(page);
    return page.getAttribute('#c', 'cx');
  });
  if (movedCx !== MOVING_FINAL_CX) {
    fails.push(
      `❌ 座標だけで動く描画を途中で撮っている（cx=${movedCx} / 期待 ${MOVING_FINAL_CX}）`,
    );
  }

  // 6. `d` を固定したまま破線の刻みだけで描く線を、途中で撮らんこと（Recharts の `<Line>`）。
  const dash = await withPage(DASHED, async (page) => {
    await settleAnimations(page);
    return page.getAttribute('#p', 'stroke-dasharray');
  });
  if (dash !== DASH_FINAL) {
    fails.push(
      `❌ 破線の刻みだけで描く線を途中で撮っている（stroke-dasharray=${dash} / 期待 ${DASH_FINAL}）`,
    );
  }

  // 7. 持ち越した状態が次の1枚へ残らんこと。残ると「もう止まっとる」と誤判定する。
  const leftover = await withPage(PAGE, async (page) => {
    await settleAnimations(page);
    return page.evaluate(() => '__shotDrawnFrames' in window);
  });
  if (leftover) {
    fails.push('❌ 収束判定の状態がページに残っている（次の1枚が誤判定する）');
  }
} finally {
  await browser.close();
}

if (fails.length > 0) {
  for (const f of fails) console.error(f);
  console.error(`❌ settle_drawn_frames 実ブラウザ検査 ${7 - fails.length}/7 合格`);
  process.exit(1);
}
process.stdout.write('✅ settle_drawn_frames 実ブラウザ検査 7/7 合格\n');
