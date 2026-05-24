import { expect, test } from '@playwright/test';

test.describe('LP MVP', () => {
  test('renders the public sales page without authentication', async ({ page }) => {
    const response = await page.goto('/lp');

    expect(response?.status()).toBeLessThan(400);
    await expect(
      page.getByRole('heading', { name: '30日で動く task 管理アプリを作れる' }),
    ).toBeVisible();
    await expect(page.getByText('¥10,000')).toBeVisible();
    await expect(
      page.getByRole('link', { name: /購入ページへ|Stripe決済へ進む/ }).first(),
    ).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'メールアドレス' })).toBeVisible();
    await expect(page.getByTestId('curriculum-day')).toHaveCount(30);
  });
});
