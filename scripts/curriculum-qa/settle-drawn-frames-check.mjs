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

try {
  const page = await browser.newPage();

  // 1. rAF で描くアニメーションが終わるまで待てること。
  await page.setContent(PAGE);
  await settleAnimations(page);
  const drawn = await page.getAttribute('#p', 'd');
  if (drawn !== FINAL_D) {
    fails.push(`❌ rAF で描くアニメーションの途中で撮っている（d=${drawn} / 期待 ${FINAL_D}）`);
  }

  // 2. 待つ前は途中の形やと確かめる。1 が「もともと最終形やった」で通るのを防ぐ。
  await page.setContent(PAGE);
  const early = await page.getAttribute('#p', 'd');
  if (early === FINAL_D) {
    fails.push('❌ 待たんでも最終形が出ている（この検査は何も見ていない）');
  }

  // 3. 終わらん動きでも、上限で戻ってくること（撮影が止まらんこと）。
  await page.setContent(SPINNING);
  const startedAt = Date.now();
  await settleAnimations(page);
  const elapsed = Date.now() - startedAt;
  if (elapsed > 6000) {
    fails.push(`❌ 終わらん動きで待ち続けている（${elapsed}ms）`);
  }

  // 4. 持ち越した状態が次の1枚へ残らんこと。残ると「もう止まっとる」と誤判定する。
  const leftover = await page.evaluate(() => '__shotDrawnFrames' in window);
  if (leftover) {
    fails.push('❌ 収束判定の状態がページに残っている（次の1枚が誤判定する）');
  }
} finally {
  await browser.close();
}

if (fails.length > 0) {
  for (const f of fails) console.error(f);
  console.error(`❌ settle_drawn_frames 実ブラウザ検査 ${4 - fails.length}/4 合格`);
  process.exit(1);
}
process.stdout.write('✅ settle_drawn_frames 実ブラウザ検査 4/4 合格\n');
