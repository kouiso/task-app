// Create a Neon project via console UI and extract the connection string
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const PROJ = 'task-app-day04-verify';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ storageState: '/tmp/neon-state.json', viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('response', r => { if (r.status() >= 400 && !/sentry/.test(r.url())) console.log('HTTP', r.status(), r.url().slice(0, 110)); });

await page.goto('https://console.neon.tech/app/projects', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);

const newBtn = page.locator('button:has-text("New project"), a:has-text("New project")').first();
await newBtn.click();
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/neon-new.png' });

// Project name field
const nameInput = page.locator('input[name="projectName"], input[placeholder*="name" i], input[id*="name" i]').first();
console.log('nameInput count:', await nameInput.count());
if (await nameInput.count()) {
  await nameInput.fill(PROJ);
}
await page.screenshot({ path: '/tmp/neon-form.png' });

// Create button in the form/dialog
const createBtn = page.locator('button:has-text("Create project"), button[type="submit"]:has-text("Create"), button:has-text("Create")').last();
console.log('createBtn count:', await createBtn.count());
await createBtn.click();
await page.waitForTimeout(12000);
console.log('after create:', page.url());
await page.screenshot({ path: '/tmp/neon-created.png' });

// The connect dialog shows a connection string (postgresql://...)
const bodyText = await page.locator('body').innerText();
const m = bodyText.match(/postgres(?:ql)?:\/\/[^\s"'`]+/);
if (m) {
  writeFileSync('/tmp/neon-conn.txt', m[0] + '\n', { mode: 0o600 });
  console.log('CONN_SAVED:', m[0].replace(/:\/\/[^:]+:[^@]+@/, '://USER:PASS@'));
} else {
  // look inside inputs/code blocks too
  const conn = await page.evaluate(() => {
    const inp = [...document.querySelectorAll('input[readonly], input[value*="postgres"], code, pre')]
      .map(e => e.value || e.textContent)
      .find(t => t && /postgres(?:ql)?:\/\//.test(t));
    return inp ? inp.match(/postgres(?:ql)?:\/\/[^\s"'`]+/)[0] : null;
  });
  if (conn) {
    writeFileSync('/tmp/neon-conn.txt', conn + '\n', { mode: 0o600 });
    console.log('CONN_SAVED2:', conn.replace(/:\/\/[^:]+:[^@]+@/, '://USER:PASS@'));
  } else {
    console.log('CONN_NOT_FOUND');
    console.log(bodyText.slice(0, 800));
  }
}
await ctx.storageState({ path: '/tmp/neon-state.json' });
await browser.close();
console.log('DONE');
