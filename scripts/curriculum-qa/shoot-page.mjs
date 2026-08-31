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
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, errors } from 'playwright';

const MARK_BADGES = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];

// 読み込み中の画面を撮るために、名指しした通信を返さないまま待たせる秒数。
// 教材はローディング表示を「その日の成果物」として何度も見せるのに、返事が速すぎて
// 撮る隙が無い。ここで止めると、読者が回線の遅い環境で見るのと同じ絵になる。
// 撮り終えたら解除するので、次の1枚には効かない。

// ページ全体を撮るときに、窓の高さを中身の高さへ合わせる範囲（CSS px）。
// アプリの外枠は `h-screen` なので、窓の高さがそのまま画像の高さになる。中身が短い日は
// 下半分が白場になり、中身が長い日は `main` の中でスクロールするため下が切れる
// （`fullPage` は文書のスクロールしか追わない）。窓の高さを中身へ合わせると両方直る。
// 下限は、中身がほとんど無い画面で帯のように潰れるのを防ぐため。
// アニメーションの収束を待つ上限。装飾で常時動いとる画面があっても撮影を止めん。
const ANIMATION_SETTLE_MS = 2000;
// 何フレーム続けて同じ形なら「描き終わった」と見なすか。
const DRAWN_FRAME_SAMPLES = 3;
const MIN_CONTENT_HEIGHT = 420;
const MAX_CONTENT_HEIGHT = 4000;

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

/**
 * 名指しした通信を返さないまま待たせる。読み込み中の画面を撮るために要る。
 *
 * 止めるのは URL に指定の文字列を含むものだけ。全部止めると画面そのものが出ない。
 * 返事を捨てずに待たせるのは、失敗の表示（エラー画面）ではなく読み込み中の表示を
 * 撮りたいため。読者が見るのも「まだ返ってきていない」状態である。
 */
async function stallRoutes(page, patterns) {
  // 時間で流すと、撮影がその時間を超えた回だけ読み込み中の表示が消える。
  // 消えても撮影自体は成功するので、完成した画面が「読み込み中の写真」として
  // 黙って残る。だから待たせるのは時計やのうて撮影の完了に紐づける。
  const held = [];
  let released = false;
  await page.route(
    (url) => patterns.some((p) => url.href.includes(p)),
    async (route) => {
      if (released) {
        await route.continue().catch(() => {});
        return;
      }
      held.push(route);
    },
  );
  return async () => {
    released = true;
    const pending = held.splice(0);
    for (const route of pending) {
      await route.continue().catch(() => {});
    }
  };
}

/**
 * 窓の高さを、いま出ている中身の高さへ合わせる。返り値は合わせる前の高さ。
 *
 * 測るのは `main` の中身。アプリの外枠（`div.h-screen` とサイドバー）は窓の高さに
 * 追従するので、窓を縮めればサイドバーの下端（ログアウト）も一緒に上がってくる。
 * `main` が無い画面（ログイン・登録・エラー）は文書の高さを使う。
 */
async function fitToContent(page, current) {
  const wanted = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) {
      // `scrollHeight` は使えない。`main` は `h-screen` の中の `flex-1` なので、中身が
      // 短くても窓の高さより小さくならず、縮める判断ができない。中身そのものの
      // いちばん下を測る。`main` は読み込み直後で先頭にいるので、窓基準の値で足りる。
      const padBottom = Number.parseFloat(getComputedStyle(main).paddingBottom) || 0;
      let bottom = main.getBoundingClientRect().top;
      for (const child of main.children) {
        bottom = Math.max(bottom, child.getBoundingClientRect().bottom);
      }
      return Math.ceil(bottom + padBottom);
    }
    const root = document.documentElement;
    return Math.ceil(Math.max(root.scrollHeight, document.body.scrollHeight));
  });
  const height = Math.min(MAX_CONTENT_HEIGHT, Math.max(MIN_CONTENT_HEIGHT, wanted));
  if (height === current.height) {
    return current.height;
  }
  await page.setViewportSize({ width: current.width, height });
  // 高さが変わると折り返しと遅延読み込みが動く。落ち着いてから測り直す。
  await page.waitForTimeout(300);
  return current.height;
}

/** 走っているアニメーションと遷移が終わるまで待つ。上限つき。 */
async function settleAnimations(page) {
  try {
    await page.waitForFunction(
      () =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running')
          // 無限に回るもの（スピナー）は終わりが来ないので、待つ相手から外す。
          .every((a) => a.effect?.getComputedTiming?.().iterations === Infinity),
      undefined,
      { timeout: ANIMATION_SETTLE_MS },
    );
  } catch (err) {
    // 上限まで待っても止まらんかった回はそのまま撮る。ここで落とすと、常時動いとる
    // 装飾がある画面が1枚も撮れんようになる。黙って通さんように warn は残す。
    // ただし待ち時間切れ以外（評価エラー・ページ破棄）は本物の失敗なので握り潰さん。
    if (!(err instanceof errors.TimeoutError)) {
      throw err;
    }
    console.warn(`アニメーションが ${ANIMATION_SETTLE_MS}ms で止まりませんでした`);
  }
  // 待つ相手から外した無限アニメーション（スピナー等）は、止めんと撮るたびに別の角度で
  // 写る。待たへんことと、位相を決めることは別の仕事や。ここを飛ばすと、同じ回を2度撮って
  // 違う画像が出る — 決め打ちの待ちを外した目的そのものが果たせん。
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getComputedTiming?.().iterations === Infinity) {
        animation.currentTime = 0;
        animation.pause();
      }
    }
  });
  await settleDrawnFrames(page);
  // 最後の1フレームが画面へ出るのを待つ。
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => done())));
}

/**
 * JS で1フレームずつ描くアニメーションが描き終わるまで待つ。上限つき。
 *
 * `document.getAnimations()` は Web Animations（CSS の transition / animation）しか返さん。
 * Recharts の Pie / Line / Bar は react-smooth が requestAnimationFrame で属性を書き換えて
 * 動かすので、あの一覧には**1つも出てこん**。せやから見出しが出た時点で待ちが明けて、
 * 描きかけのグラフがそのまま保存される（day22 の3枚と day23 の3枚が該当）。
 * 決め打ちの 400ms を外した目的は「毎回同じ絵になること」やったのに、この経路だけ
 * 逆に不安定になっとった。
 *
 * 合図が無いので、形が変わらんくなったことをもって描き終わりとみなす。SVG の中の
 * 座標・形・不透明度をつないだ文字列を毎フレーム作り、続けて同じ値が出たら止まったと判断する。
 */
async function settleDrawnFrames(page) {
  try {
    await page.waitForFunction(
      (needed) => {
        const shape = [];
        for (const el of document.querySelectorAll('svg *')) {
          shape.push(
            el.getAttribute('d') ?? '',
            el.getAttribute('points') ?? '',
            el.getAttribute('transform') ?? '',
            el.getAttribute('x') ?? '',
            el.getAttribute('y') ?? '',
            el.getAttribute('width') ?? '',
            el.getAttribute('height') ?? '',
            el.getAttribute('r') ?? '',
            el.getAttribute('opacity') ?? '',
          );
        }
        const drawn = shape.join('|');
        // 前フレームとの比較なので、状態を窓に置いて持ち越す。
        if (!window.__shotDrawnFrames) {
          window.__shotDrawnFrames = { drawn: null, same: 0 };
        }
        const state = window.__shotDrawnFrames;
        if (drawn === state.drawn) {
          state.same += 1;
        } else {
          state.drawn = drawn;
          state.same = 0;
        }
        return state.same >= needed;
      },
      DRAWN_FRAME_SAMPLES,
      { timeout: ANIMATION_SETTLE_MS, polling: 'raf' },
    );
  } catch (err) {
    // 待ち時間切れ以外（評価エラー・ページ破棄）は本物の失敗なので握り潰さん。
    if (!(err instanceof errors.TimeoutError)) {
      throw err;
    }
    console.warn(`描画が ${ANIMATION_SETTLE_MS}ms で落ち着きませんでした`);
  } finally {
    // 1ページで何枚も撮るので、持ち越した状態は毎回捨てる。残すと次の1枚が
    // 「もう止まっとる」と誤判定する。
    await page.evaluate(() => {
      delete window.__shotDrawnFrames;
    });
  }
}

async function shoot(page, job, shot) {
  // 幅の指定がある1枚だけ窓を狭める。列数が幅で変わることを見せる回に要る。
  // 撮り終えたら宣言表の既定へ戻す。戻し忘れると、以降の1枚が黙って別の幅で撮れる。
  if (shot.viewport) {
    await page.setViewportSize(shot.viewport);
  }
  const stall = shot.stall ?? [];
  let releaseStalled = null;
  if (stall.length > 0) {
    releaseStalled = await stallRoutes(page, stall);
  }
  // networkidle は使わない。tRPC の getSession が react-query で回り続ける画面（Day 08 以降の
  // AppLayout）では通信が止まらず、待ち切れずに落ちる。出ているべきものは wait_for で名指しする。
  // 止めた通信があると `load` は返ってこない。読み込み中を撮る回だけ、
  // 文書が来た時点で進める。止めていない回の待ち方は変えない。
  await page.goto(`${job.baseUrl}${shot.path}`, {
    waitUntil: stall.length > 0 ? 'commit' : 'load',
  });
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
  // 開発サーバーが出す Next.js の目印を消す。読者が書いた画面ではないうえ、
  // 本番ビルドで撮った他の日の写真と見た目がそろわなくなる。
  // 本番ビルドの回にはこの要素そのものが無いので、指定しても何も起きない。
  await page.addStyleTag({ content: 'nextjs-portal{display:none !important;}' });
  // アニメーションの途中で撮ると、同じ指定でも回ごとに違う絵になる。決め打ちの待ちやと、
  // 400ms より長い遷移や、並列撮影で遅れた回がそのまま途中の絵で保存される。走っとる
  // アニメーションが無くなるまで待つ。上限を置くのは、無限に回るスピナーで止まらんため。
  await settleAnimations(page);
  // ページ全体を撮る回だけ、窓の高さを中身へ合わせる。切り抜く回は要らない
  // （切り抜きの矩形が中身の実寸から起きるので、余白も切れ落ちも起きない）。
  const sizeBefore =
    shot.full_page === true ? await fitToContent(page, shot.viewport ?? job.viewport) : null;
  // ダイアログが開くと中の入力欄へ焦点が移り、数値欄では中身が選択状態になる。
  // 青い反転が写った画像は、読者が何もしていない画面と違って見える。焦点と選択を外す。
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el instanceof HTMLElement) {
      el.blur();
    }
    window.getSelection()?.removeAllRanges();
  });

  const rects = await collectRects(page, shot.marks ?? []);
  if (rects.length > 0) {
    await drawMarks(page, rects);
  }
  const out = join(job.outDir, shot.name);
  await mkdir(dirname(out), { recursive: true });
  // 切り抜きの矩形も boundingBox() から起こす。中央寄せのカード画面をそのまま撮ると
  // 画像の大半が白場になり、紙面へ載せたときにフォーム本体が読めない大きさまで縮む。
  const clip = shot.clip ? await clipRect(page, shot.clip) : undefined;
  // clip があるときは fullPage を立てん。この版の Playwright は両方渡しても clip を
  // 優先して落ちんが、指定として意味が無く、読む人に「どっちが効くのか」を考えさせる。
  const png = await page.screenshot({
    type: 'png',
    ...(clip ? { clip } : { fullPage: shot.full_page === true }),
  });
  await writeFile(out, png);
  if (releaseStalled) {
    await releaseStalled();
  }
  if (rects.length > 0) {
    await clearMarks(page);
  }
  if (stall.length > 0) {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
  if (sizeBefore !== null || shot.viewport) {
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
  // `<input type="date">` の書式は context の locale では決まらない。見ているのは
  // プロセスのロケールで、`LANG` / `LC_ALL` を渡すと `mm/dd/yyyy` が `yyyy/mm/dd` になる
  // （`--lang` だけでは変わらないことも実測で確かめた）。日本語版のブラウザが出す
  // `年/月/日` までは届かない。このコンテナに Chromium の日本語リソースが無いため。
  // 並びは読者の画面と同じになるので、残る差は文字だけ。
  const browser = await chromium.launch({
    args: ['--lang=ja-JP'],
    env: { ...process.env, LANG: 'ja_JP.UTF-8', LC_ALL: 'ja_JP.UTF-8' },
  });
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

// このファイルを直接叩いたときだけ撮影を始める。読み込んだだけで走ると、
// 収束待ちだけを実物のブラウザで確かめる退行テスト（test-settle-drawn-frames.mjs）が
// stdin を待って止まる。
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    process.stdout.write(JSON.stringify({ ok: false, error: `${e}` }));
    process.exitCode = 1;
  });
}

export { settleAnimations, settleDrawnFrames };
