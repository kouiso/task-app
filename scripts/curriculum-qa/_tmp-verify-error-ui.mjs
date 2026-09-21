// R34-v2: エラー状態の実機検証
//  A: 初回取得失敗 → 全面エラーパネル
//  B: 401 → 「ログインの有効期限が切れました」+ ログイン導線
//  C: 再取得失敗 + 既存値 → データ保持 + バナー
//  D: mutation 応答喪失 → 「結果を確認」導線（一覧再取得で実態表示）
//  E: my-task 初回取得失敗 → 全面エラーパネル
import { chromium } from 'playwright';

const BASE = 'http://localhost:13000';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const results = [];

// route.continue() は他ハンドラに渡らないため1 route で複数判定する。
// tRPC は複数手続きを1リクエストにバッチする（auth.getSession 等を含む）ため、
// リクエスト全体を潰すとセッション判定も巻き込む。対象手続きの要素だけ
// エラーに置き換え、他は実レスポンスをそのまま返す。
function failTrpc(page, procedures, opts = {}) {
  const targets = Array.isArray(procedures) ? procedures : [procedures];
  const errorItem = (p, httpStatus, code) => ({
    error: {
      json: {
        message: code,
        code: -32001,
        data: { code, httpStatus, path: p },
      },
    },
  });
  return page.route('**/api/trpc/**', async (route) => {
    const url = route.request().url();
    const hit = targets.find((p) => url.includes(p));
    if (!hit) return route.continue();
    if (opts.abort) return route.abort();
    const procs = decodeURIComponent(new URL(url).pathname.replace('/api/trpc/', '')).split(',');
    try {
      const resp = await route.fetch();
      const arr = await resp.json();
      if (!Array.isArray(arr) || arr.length !== procs.length) throw new Error('not a batch array');
      const code = opts.trpcError?.code ?? 'INTERNAL_SERVER_ERROR';
      const httpStatus = opts.trpcError?.httpStatus ?? 500;
      const body = arr.map((item, i) =>
        targets.includes(procs[i]) ? errorItem(procs[i], httpStatus, code) : item,
      );
      return route.fulfill({
        status: httpStatus,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    } catch {
      // バッチ形式で取れない場合は要求全体を落とす（単一手続きの失敗相当）
      if (opts.trpcError) {
        const body = procs.map((p) => errorItem(p, opts.trpcError.httpStatus, opts.trpcError.code));
        return route.fulfill({
          status: opts.trpcError.httpStatus,
          contentType: 'application/json',
          body: JSON.stringify(body),
        });
      }
      return route.fulfill({ status: 500, contentType: 'text/plain', body: 'forced 500' });
    }
  });
}

async function login() {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', 'admin@example.com');
  await page.fill('input[type="password"], input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|my-task/, { timeout: 15000 });
}

async function openEditAndSubmit() {
  // 最初のタスクカードの編集ボタン → ダイアログ → 更新
  await page.locator('button[aria-label="タスクを編集"]').first().click();
  await page.waitForSelector('button[type="submit"]:has-text("更新")', { timeout: 10000 });
  await page.click('button[type="submit"]:has-text("更新")');
}

try {
  await login();
  results.push(['login', true]);

  // ── A: dashboard 初回取得失敗 ─────────────────────────
  await failTrpc(page, ['project.getAll', 'report.getOverview']);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  const a = await page
    .waitForSelector('text=データを取得できませんでした', { timeout: 30000 })
    .then(() => 1).catch(() => 0);
  const aRetry = await page.locator('button:has-text("再読み込み")').count();
  results.push(['A: dashboard 初回失敗パネル', a > 0]);
  results.push(['A: dashboard 再読み込みボタン', aRetry > 0]);
  await page.screenshot({ path: '/tmp/r34-a-initial.png' });

  // ── B: dashboard 401 → 認証切れ表示 ───────────────────
  await page.unrouteAll();
  await failTrpc(page, ['project.getAll', 'report.getOverview'], {
    trpcError: { code: 'UNAUTHORIZED', httpStatus: 401 },
  });
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  const b = await page
    .waitForSelector('text=ログインの有効期限が切れました', { timeout: 30000 })
    .then(() => 1).catch(() => 0);
  const bBtn = await page.locator('button:has-text("ログイン画面へ")').count();
  results.push(['B: 401 認証切れメッセージ', b > 0]);
  results.push(['B: ログイン画面へボタン', bBtn > 0]);
  if (bBtn > 0) {
    await page.click('button:has-text("ログイン画面へ")');
    await page.waitForURL(/login/, { timeout: 10000 }).catch(() => {});
    results.push(['B: /login 遷移', page.url().includes('/login')]);
  }
  await page.screenshot({ path: '/tmp/r34-b-auth.png' });

  // ── C: my-task 再取得失敗 + 既存値 ────────────────────
  // まず正常ロードしてデータを表示させる
  await page.unrouteAll();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  // 401後のセッション状態に依らず再ログインを試みる
  const needLogin = await page.locator('input[type="email"]').count();
  if (needLogin > 0) {
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|my-task/, { timeout: 15000 });
  }
  await page.goto(`${BASE}/my-task`, { waitUntil: 'networkidle' });
  const cardsBefore = await page.locator('button[aria-label="タスクを編集"]').count();
  results.push(['C: my-task 正常ロード', cardsBefore > 0]);
  // task.getAll だけ 500 にして、成功する mutation 経由で再取得を起こす
  await failTrpc(page, 'task.getAll');
  await openEditAndSubmit();
  const cBanner = await page
    .waitForSelector('text=最新の情報を取得できませんでした', { timeout: 30000 })
    .then(() => 1).catch(() => 0);
  const cCards = await page.locator('button[aria-label="タスクを編集"]').count();
  results.push(['C: 再取得失敗バナー', cBanner > 0]);
  results.push(['C: 既存タスクが残っている', cCards > 0]);
  await page.screenshot({ path: '/tmp/r34-c-refetch.png' });

  // ── D: mutation 応答喪失 → 結果確認導線 ───────────────
  await page.unrouteAll();
  await failTrpc(page, 'task.update', { abort: true });
  await openEditAndSubmit();
  const dToast = await page
    .waitForSelector('text=応答を確認できませんでした', { timeout: 30000 })
    .then(() => 1).catch(() => 0);
  results.push(['D: 応答喪失トースト', dToast > 0]);
  // invalidate による再取得で一覧が実態を反映する（abort なので実際は未更新）
  const dCards = await page.locator('button[aria-label="タスクを編集"]').count();
  results.push(['D: 一覧が表示され結果を確認できる', dCards > 0]);
  await page.screenshot({ path: '/tmp/r34-d-lost.png' });

  // ── E: my-task 初回取得失敗 ───────────────────────────
  await page.unrouteAll();
  await failTrpc(page, ['task.getAll', 'auth.getCurrentUser']);
  await page.goto(`${BASE}/my-task`, { waitUntil: 'networkidle' });
  const e = await page
    .waitForSelector('text=タスクを取得できませんでした', { timeout: 30000 })
    .then(() => 1).catch(() => 0);
  results.push(['E: my-task 初回失敗パネル', e > 0]);
  await page.screenshot({ path: '/tmp/r34-e-initial.png' });
} catch (err) {
  results.push([`fatal: ${String(err).slice(0, 120)}`, false]);
  await page.screenshot({ path: '/tmp/r34-fatal.png' }).catch(() => {});
}

for (const [name, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
await browser.close();
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
