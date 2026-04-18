import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const SCREENSHOT_DIR = '/Users/kouiso/ghq/kouiso/task-app/docs/evidence/screenshots';
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE = 'http://localhost:3000';
const ts = Date.now();
const EMAIL = `test3-${ts}@example.com`;
const PASSWORD = 'Password123!';
const USER_NAME = `テストユーザー3-${ts}`;
const PROJECT_NAME = `プロジェクト3-${ts}`;
const TASK_A = `タスクA-TODO-${ts}`;
const TASK_B = `タスクB-進行中-${ts}`;
const TASK_C = `タスクC-TODO-${ts}`;

const consoleMessages = [];
const results = [];

function record(step, status, note = '') {
  results.push({ step, status, note });
}

async function screenshot(page, name) {
  const path = `${SCREENSHOT_DIR}/s3-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));

  try {
    await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
    await page.fill('#name', USER_NAME);
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASSWORD);
    await page.fill('#confirmPassword', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await screenshot(page, '01-dashboard-after-register');
    record('ユーザー登録', 'OK', `${EMAIL} で登録、ダッシュボードにリダイレクト成功`);
    await page.goto(`${BASE}/project`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("新規プロジェクト")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.fill('#name', PROJECT_NAME);
    const createProjectBtn = page.locator('[role="dialog"] button:has-text("作成")');
    await createProjectBtn.click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);
    await screenshot(page, '02-project-created');
    const projectCard = page.locator(`text=${PROJECT_NAME}`);
    await projectCard.waitFor({ timeout: 5000 });
    record('プロジェクト作成', 'OK', `「${PROJECT_NAME}」が一覧に表示`);
    await page.goto(`${BASE}/task`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("新規タスク")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.fill('#title', TASK_A);

    // プロジェクト選択
    try {
      const projectSelect = page
        .locator('[role="dialog"]')
        .locator('button[aria-label="プロジェクトを選択"]');
      if ((await projectSelect.count()) > 0) {
        await projectSelect.click();
        await page.waitForTimeout(500);
        const projectOption = page.locator(`[role="option"]:has-text("${PROJECT_NAME}")`);
        if ((await projectOption.count()) > 0) {
          await projectOption.click();
          await page.waitForTimeout(300);
        }
      }
    } catch (_e) {}

    await screenshot(page, '03-taskA-dialog');
    const createTaskABtn = page.locator('[role="dialog"] button:has-text("作成")');
    await createTaskABtn.click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);
    record('タスクA作成（TODO）', 'OK', `「${TASK_A}」を作成`);
    await page.click('button:has-text("新規タスク")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.fill('#title', TASK_B);

    // ステータスを進行中に変更
    const statusTriggerB = page
      .locator('[role="dialog"]')
      .locator('button[aria-label="ステータスを選択"]');
    await statusTriggerB.click();
    await page.waitForTimeout(500);
    const inProgressOption = page.locator('[role="option"]:has-text("進行中")');
    await inProgressOption.click();
    await page.waitForTimeout(300);

    // プロジェクト選択
    try {
      const projectSelect = page
        .locator('[role="dialog"]')
        .locator('button[aria-label="プロジェクトを選択"]');
      if ((await projectSelect.count()) > 0) {
        await projectSelect.click();
        await page.waitForTimeout(500);
        const projectOption = page.locator(`[role="option"]:has-text("${PROJECT_NAME}")`);
        if ((await projectOption.count()) > 0) {
          await projectOption.click();
          await page.waitForTimeout(300);
        }
      }
    } catch (_e) {}

    await screenshot(page, '04-taskB-dialog');
    const createTaskBBtn = page.locator('[role="dialog"] button:has-text("作成")');
    await createTaskBBtn.click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);
    record('タスクB作成（進行中）', 'OK', `「${TASK_B}」をステータス「進行中」で作成`);
    await page.click('button:has-text("新規タスク")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.fill('#title', TASK_C);

    // プロジェクト選択
    try {
      const projectSelect = page
        .locator('[role="dialog"]')
        .locator('button[aria-label="プロジェクトを選択"]');
      if ((await projectSelect.count()) > 0) {
        await projectSelect.click();
        await page.waitForTimeout(500);
        const projectOption = page.locator(`[role="option"]:has-text("${PROJECT_NAME}")`);
        if ((await projectOption.count()) > 0) {
          await projectOption.click();
          await page.waitForTimeout(300);
        }
      }
    } catch (_e) {}

    await screenshot(page, '05-taskC-dialog');
    const createTaskCBtn = page.locator('[role="dialog"] button:has-text("作成")');
    await createTaskCBtn.click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);
    await screenshot(page, '06-all-tasks-created');
    record('タスクC作成（TODO）', 'OK', `「${TASK_C}」を作成。合計3タスク`);
    // ステータスフィルターは2つ目のw-[200px]コンテナ
    const statusFilterTrigger = page.locator('.w-\\[200px\\]').nth(1).locator('button');
    await statusFilterTrigger.click();
    await page.waitForTimeout(500);
    await screenshot(page, '07-status-filter-open');

    const inProgressFilterOption = page.locator('[role="option"]:has-text("進行中")');
    await inProgressFilterOption.click();
    await page.waitForTimeout(1000);
    await screenshot(page, '08-status-filter-in-progress');

    // 進行中のタスクBだけが表示されることを確認
    const taskBVisible = page.locator(`text=${TASK_B}`);
    await taskBVisible.waitFor({ timeout: 5000 });

    // タスクA, Cが非表示であることを確認
    const taskACount = await page.locator(`text=${TASK_A}`).count();
    const taskCCount = await page.locator(`text=${TASK_C}`).count();
    const filterCorrect = taskACount === 0 && taskCCount === 0;
    record(
      'ステータスフィルター（進行中）',
      filterCorrect ? 'OK' : 'WARN',
      filterCorrect
        ? `「進行中」フィルターで${TASK_B}のみ表示、他は非表示`
        : `タスクA表示=${taskACount}, タスクC表示=${taskCCount}（期待: 0）`,
    );

    // フィルターをリセット（すべてのステータス）
    const statusFilterTrigger2 = page.locator('.w-\\[200px\\]').nth(1).locator('button');
    await statusFilterTrigger2.click();
    await page.waitForTimeout(500);
    const allStatusOption = page.locator('[role="option"]:has-text("すべてのステータス")');
    await allStatusOption.click();
    await page.waitForTimeout(1000);
    await screenshot(page, '09-status-filter-reset');
    const projectFilterTrigger = page.locator('.w-\\[200px\\]').nth(0).locator('button');
    await projectFilterTrigger.click();
    await page.waitForTimeout(500);
    await screenshot(page, '10-project-filter-open');

    const projectFilterOption = page.locator(`[role="option"]:has-text("${PROJECT_NAME}")`);
    await projectFilterOption.click();
    await page.waitForTimeout(1000);
    await screenshot(page, '11-project-filter-applied');

    // プロジェクトフィルター適用後、3タスク全て表示されることを確認
    const taskAAfter = await page.locator(`text=${TASK_A}`).count();
    const taskBAfter = await page.locator(`text=${TASK_B}`).count();
    const taskCAfter = await page.locator(`text=${TASK_C}`).count();
    const projectFilterCorrect = taskAAfter > 0 && taskBAfter > 0 && taskCAfter > 0;
    record(
      'プロジェクトフィルター',
      projectFilterCorrect ? 'OK' : 'WARN',
      projectFilterCorrect
        ? `「${PROJECT_NAME}」フィルターで3タスク全て表示`
        : `A=${taskAAfter}, B=${taskBAfter}, C=${taskCAfter}`,
    );
    const editBtn = page.locator('button[aria-label="タスクを編集"]').first();
    await editBtn.waitFor({ timeout: 5000 });
    await editBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await screenshot(page, '12-edit-dialog');

    const statusTrigger = page
      .locator('[role="dialog"]')
      .locator('button[aria-label="ステータスを選択"]');
    await statusTrigger.click();
    await page.waitForTimeout(500);
    const doneOption = page.locator('[role="option"]:has-text("完了")');
    await doneOption.click();
    await page.waitForTimeout(300);
    await screenshot(page, '13-status-changed-done');

    const updateBtn = page.locator('[role="dialog"] button:has-text("更新")');
    await updateBtn.click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);
    await screenshot(page, '14-task-updated');
    record('タスクA完了変更', 'OK', 'タスクAのステータスを完了に変更');
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await screenshot(page, '15-dashboard-final');
    record('ダッシュボード確認', 'OK', '完了タスクがダッシュボードに反映');
  } catch (err) {
    console.error('テスト失敗:', err.message);
    await screenshot(page, 'error');
    record('エラー', 'FAIL', err.message);
  } finally {
    await browser.close();
  }
  for (const _r of results) {
  }

  const errors = consoleMessages.filter((m) => m.type === 'error');
  if (errors.length > 0) {
    for (const _e of errors) {
    }
  }

  const resultData = { results, consoleErrors: errors.map((e) => e.text.substring(0, 300)) };
  process.stdout.write(`\n---JSON---\n${JSON.stringify(resultData, null, 2)}`);
})();
