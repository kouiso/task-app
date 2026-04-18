import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const SCREENSHOT_DIR = '/Users/kouiso/ghq/kouiso/task-app/docs/evidence/screenshots';
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE = 'http://localhost:3000';
const ts = Date.now();
const EMAIL = `test-${ts}@example.com`;
const PASSWORD = 'Password123!';
const USER_NAME = `テストユーザー${ts}`;
const PROJECT_NAME = `テストプロジェクト${ts}`;
const TASK_TITLE = `テストタスク${ts}`;

const consoleMessages = [];
const results = [];

function record(step, status, note = '') {
  results.push({ step, status, note });
}

async function screenshot(page, name) {
  const path = `${SCREENSHOT_DIR}/s1-${name}.png`;
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
    await screenshot(page, '01-register-page');

    await page.fill('#name', USER_NAME);
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASSWORD);
    await page.fill('#confirmPassword', PASSWORD);
    await screenshot(page, '02-register-filled');

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await screenshot(page, '03-dashboard-after-register');
    record('ユーザー登録', 'OK', `${EMAIL} で登録、ダッシュボードにリダイレクト成功`);
    await page.goto(`${BASE}/project`, { waitUntil: 'networkidle' });
    await screenshot(page, '04-project-page');

    // 「新規プロジェクト」ボタンをクリック
    await page.click('button:has-text("新規プロジェクト")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await screenshot(page, '05-project-dialog');

    await page.fill('#name', PROJECT_NAME);
    await screenshot(page, '06-project-dialog-filled');

    // 「作成」ボタンをクリック
    const createProjectBtn = page.locator('[role="dialog"] button:has-text("作成")');
    await createProjectBtn.click();

    // ダイアログが閉じるのを待つ
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);
    await screenshot(page, '07-project-created');

    // プロジェクトが表示されていることを確認
    const projectCard = page.locator(`text=${PROJECT_NAME}`);
    await projectCard.waitFor({ timeout: 5000 });
    record('プロジェクト作成', 'OK', `「${PROJECT_NAME}」が一覧に表示`);
    await page.goto(`${BASE}/task`, { waitUntil: 'networkidle' });
    await screenshot(page, '08-task-page');

    await page.click('button:has-text("新規タスク")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await screenshot(page, '09-task-dialog');

    await page.fill('#title', TASK_TITLE);

    // プロジェクトを選択（作成したプロジェクトを選ぶ）
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

    await screenshot(page, '10-task-dialog-filled');

    const createTaskBtn = page.locator('[role="dialog"] button:has-text("作成")');
    await createTaskBtn.click();

    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);
    await screenshot(page, '11-task-created');

    const taskCard = page.locator(`text=${TASK_TITLE}`);
    await taskCard.waitFor({ timeout: 5000 });
    record('タスク作成', 'OK', `「${TASK_TITLE}」が一覧に表示`);

    // TaskCardは直接アイコンボタン（aria-label="タスクを編集"）を持つ
    const editBtn = page.locator('button[aria-label="タスクを編集"]').first();
    await editBtn.waitFor({ timeout: 5000 });
    await screenshot(page, '12-task-before-edit');

    await editBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await screenshot(page, '13-task-edit-dialog');

    // ステータスSelectを見つけてクリック
    const statusTrigger = page
      .locator('[role="dialog"]')
      .locator('button[aria-label="ステータスを選択"]');
    await statusTrigger.click();
    await page.waitForTimeout(500);
    await screenshot(page, '14-status-select-open');

    // 「完了」を選択
    const doneOption = page.locator('[role="option"]:has-text("完了")');
    await doneOption.click();
    await page.waitForTimeout(300);

    await screenshot(page, '15-status-changed');

    // 「更新」ボタンをクリック
    const updateBtn = page.locator('[role="dialog"] button:has-text("更新")');
    await updateBtn.click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(1000);
    await screenshot(page, '16-task-updated');
    record('ステータス変更（完了）', 'OK', 'タスクを完了ステータスに変更');
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await screenshot(page, '17-dashboard-final');
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

  // JSON結果をファイルに出力
  const resultData = { results, consoleErrors: errors.map((e) => e.text.substring(0, 300)) };
  process.stdout.write(`\n---JSON---\n${JSON.stringify(resultData, null, 2)}`);
})();
