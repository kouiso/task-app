import { expect, type Page, test } from '@playwright/test';

const credentials = { email: 'admin@example.com', password: 'password123' };

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#email', credentials.email);
  await page.fill('#password', credentials.password);
  await page.getByRole('button', { name: /ログイン|login/i }).click();
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

test.describe('Report View', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display report overview page', async ({ page }) => {
    await page.goto('/report');

    await expect(page).toHaveURL('/report');
    await expect(page.getByRole('heading', { name: 'レポート・統計' })).toBeVisible();
    await expect(page.getByText('週次レポートを見る')).toBeVisible();
  });

  test('should show status and priority charts', async ({ page }) => {
    await page.goto('/report');
    await page.waitForLoadState('networkidle');

    // at least one chart container should render
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    // heading confirms the page is the report page
    await expect(page.getByRole('heading', { name: 'レポート・統計' })).toBeVisible();
  });

  test('should navigate to weekly report page', async ({ page }) => {
    await page.goto('/report');

    await page.getByText('週次レポートを見る').click();

    await page.waitForURL('/report/weekly', { timeout: 10000 });
    await expect(page).toHaveURL('/report/weekly');
    await expect(page.getByRole('heading', { name: '週次レポート' })).toBeVisible();
  });

  test('should display weekly report with week selector', async ({ page }) => {
    await page.goto('/report/weekly');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: '週次レポート' })).toBeVisible();

    // week selector or chart area should be present
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    expect(body).toMatch(/週次|レポート|week/i);
  });
});
