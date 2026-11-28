import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

async function loginViaApi(context: import('@playwright/test').BrowserContext, baseURL: string) {
  const res = await context.request.post(`${baseURL}/api/trpc/auth.login`, {
    headers: { 'Content-Type': 'application/json' },
    data: { json: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } },
  });
  if (res.status() !== 200) {
    throw new Error(`login failed: ${res.status()}`);
  }
}

// 1x1 の PNG。外部の画像サーバーに届かない環境でも、Radix の Avatar が <img> を出せるようにする
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('avatar update', () => {
  // Radix の Avatar は画像の読み込みに成功してから <img> を差し込む。外部の画像サーバーへの
  // 到達を前提にしないよう、テストの画像 URL は手元で返す
  test.beforeEach(async ({ context }) => {
    await context.route('https://placehold.jp/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG }),
    );
  });

  test('avatar URL set via /profile/edit is reflected on /profile', async ({
    page,
    context,
    baseURL,
  }) => {
    const url = baseURL ?? 'http://localhost:3002';
    await loginViaApi(context, url);
    await page.goto(`${url}/profile/edit`);
    await page.waitForSelector('input#avatar');

    const newAvatar = 'https://placehold.jp/3d4070/ffffff/200x200.png?text=PROFILE';
    await page.fill('input#avatar', '');
    await page.fill('input#avatar', newAvatar);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/profile$/);
    await expect(page.locator('main img').first()).toHaveAttribute('src', newAvatar);
  });

  test('avatar URL set via /user/[id]/edit (own profile) is reflected on detail page', async ({
    page,
    context,
    baseURL,
  }) => {
    const url = baseURL ?? 'http://localhost:3002';
    await loginViaApi(context, url);

    const meRes = await context.request.get(
      `${url}/api/trpc/auth.getCurrentUser?input=${encodeURIComponent(
        '{"json":null,"meta":{"values":["undefined"]}}',
      )}`,
    );
    const meBody = await meRes.json();
    const userId = meBody.result.data.json.id as string;

    await page.goto(`${url}/user/${userId}/edit`);
    await page.waitForSelector('input#avatar');

    const newAvatar = 'https://placehold.jp/aa0000/ffffff/200x200.png?text=USEREDIT';
    await page.fill('input#avatar', '');
    await page.fill('input#avatar', newAvatar);
    await page.click('button[type="submit"]');
    await page.waitForURL((currentUrl) => currentUrl.pathname === `/user/${userId}`);
    await expect(page.locator('main img').first()).toHaveAttribute('src', newAvatar);
  });
});
