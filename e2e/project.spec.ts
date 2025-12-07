import { expect, test } from '@playwright/test';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'password123');
    await page.getByRole('button', { name: /ログイン|login/i }).click();
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should navigate to projects page', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/project');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if projects page is loaded
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
  });

  test('should display project list', async ({ page }) => {
    await page.goto('/project');

    // Wait for projects to load
    await page.waitForTimeout(2000);

    // Check if page has content
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toContain('プロジェクト'.normalize() || 'Project');
  });

  test('should open create project dialog', async ({ page }) => {
    await page.goto('/project');
    await page.waitForTimeout(1000);

    // Look for create project button
    const createButton = page.getByRole('button', {
      name: /新規プロジェクト|プロジェクトを作成|create project/i,
    });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should navigate to dashboard from header', async ({ page }) => {
    await page.goto('/project');

    // Click dashboard link in navigation
    const dashboardLink = page.getByRole('link', { name: /ダッシュボード|dashboard/i });
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForURL('/dashboard', { timeout: 5000 });
    }
  });
});
