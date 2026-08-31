// 収束待ちを、実物のブラウザで確かめる退行テスト。
//
// なぜ実物で確かめるか: Recharts の描画は requestAnimationFrame で属性を書き換える形で
// 動くため、`document.getAnimations()` には1つも出てこん。ソースの文字列を見るだけの検査は
// 「呼んどるか」しか言えず、「描き終わるまで待てとるか」は言えん。ここだけは実際に
// 動かして、描きかけの形で止まらんことを見る。
//
// ブラウザが無い機械（CI の一部）では SKIP と出して 0 で抜ける。挙動が違うときだけ落ちる。
import { chromium } from 'playwright';
// shoot() が実際に呼ぶのは settleAnimations のほうや。そちらを叩くことで、
// 「収束待ちを呼ぶ経路ごと消した」場合もこの検査が赤くなる。
import { settleAnimations } from './shoot-page.mjs';

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
let browser;
try {
  browser = await chromium.launch();
} catch (err) {
  console.log(`SKIP: ブラウザを起動できんかった（${err.message.split('\n')[0]}）`);
  process.exit(0);
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
  for (const f of fails) console.log(f);
  console.log(`❌ settle_drawn_frames 実ブラウザ検査 ${4 - fails.length}/4 合格`);
  process.exit(1);
}
console.log('✅ settle_drawn_frames 実ブラウザ検査 4/4 合格');
