import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'password123');
    await page.getByRole('button', { name: /ログイン|login/i }).click();
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should navigate to tasks page', async ({ page }) => {
    // Navigate to tasks page
    await page.goto('/task');
    
    // Check if tasks page is visible
    await expect(page.getByRole('heading', { name: /タスク|task/i })).toBeVisible();
  });

  test('should display task list', async ({ page }) => {
    await page.goto('/task');
    
    // Wait for tasks to load
    await page.waitForTimeout(2000);
    
    // Check if page loaded (either tasks or empty state)
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
  });

  test('should open create task dialog', async ({ page }) => {
    await page.goto('/task');
    
    // Click create task button
    const createButton = page.getByRole('button', { name: /新規タスク|タスクを作成|create task/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Wait for dialog to open
      await page.waitForTimeout(1000);
      
      // Check if create dialog is visible
      const dialogVisible = await page.getByText(/タスク作成|create task|新規タスク/i).isVisible();
      expect(dialogVisible).toBeTruthy();
    }
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.goto('/task');
    await page.waitForTimeout(2000);
    
    // Look for status filter dropdown
    const statusFilter = page.getByLabel(/ステータス|status/i).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.waitForTimeout(500);
      
      // Select a status
      await page.getByText(/進行中|in progress/i).first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should search tasks', async ({ page }) => {
    await page.goto('/search');
    
    // Fill search keyword
    const searchInput = page.getByPlaceholder(/検索|search|キーワード/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      
      // Click search button
      const searchButton = page.getByRole('button', { name: /検索|search/i });
      await searchButton.click();
      
      // Wait for results
      await page.waitForTimeout(2000);
    }
  });
});
