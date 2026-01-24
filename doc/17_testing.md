# Day 17: テスト実装・Vitest + Playwright

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **ユニットテスト** | API/関数テスト | ✅ Vitest で テストケース書ける |
| **E2E テスト** | ブラウザテスト | ✅ Playwright でUI自動テスト |
| **カバレッジ測定** | 品質指標 | ✅ どの行がテスト済みか確認できる |

## 💼 なぜこれを学ぶのか?

**手動テストには限界があります**。自動テストで「仕様通り動作する」ことを保証。リグレッション(機能低下)を検出。

- **ユニットテスト**: 関数・APIレベルの小さな単位
- **E2E テスト**: ブラウザで実際の操作をシミュレート
- **CI/CD**: テスト自動実行

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | ユニットテスト基本 | 2ステップ | 25分 |
| **Part 2** | E2E テスト実装 | 2ステップ | 20分 |
| **Part 3** | CI/CD パイプライン | 1ステップ | 15分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: ユニットテスト基本(25分)

#### Step 1.1: Vitest セットアップ(所要時間:12分)

**このステップで学ぶこと**: Vite 環境でのテスト実行。

**なぜ必要?**: Jest ではなく Vitest を使う理由は、Next.js のネイティブサポート。

**コードの仕組み解説**:

```bash
# インストール(既にあるはず)
npm install -D vitest @vitest/ui

# vitest.config.ts を作成
```

```typescript
// filepath: vitest.config.ts
import { getViteConfig } from 'astro/config';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  getViteConfig({
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['./src/__tests__/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
      },
    },
  })
);
```

```typescript
// filepath: src/__tests__/setup.ts
import { expect, afterEach, vi } from 'vitest';

// グローバル変数の設定
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/task_app_test';
```

**package.json スクリプト追加**:

```json
{
  "script": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

#### Step 1.2: API テストケース(所要時間:13分)

**このステップで学ぶこと**: tRPC プロシージャのテスト。

**なぜ必要?**: API が正しく動作するか確認。入出力が仕様通り。

**コードの仕組み解説**:

```typescript
// filepath: src/__tests__/server/routers/task.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { taskRouter } from '@/server/api/routers/task';
import { createTRPCMsw } from '@trpc/msw';

describe('Task Router', () => {
  describe('task.create', () => {
    it('正しい入力でタスク作成できる', async () => {
      const mockCtx = {
        session: { userId: 'user_1' },
        user: {
          id: 'user_1',
          email: 'test@example.com',
          role: 'USER',
          name: 'Test User',
        },
      };

      const caller = taskRouter.createCaller(mockCtx);

      const result = await caller.create({
        title: 'テストタスク',
        description: 'テスト用',
        priority: 'HIGH',
        projectId: null,
      });

      // アサーション
      expect(result).toBeDefined();
      expect(result.title).toBe('テストタスク');
      expect(result.creatorId).toBe('user_1');
      expect(result.status).toBe('TODO');
    });

    it('認証なしは UNAUTHORIZED エラー', async () => {
      const mockCtx = {
        session: null, // ログインなし
        user: null,
      };

      const caller = taskRouter.createCaller(mockCtx);

      expect(async () => {
        await caller.create({
          title: 'テストタスク',
          priority: 'MEDIUM',
        });
      }).rejects.toThrow('UNAUTHORIZED');
    });

    it('タイトルが空の場合、BAD_REQUEST', async () => {
      const mockCtx = {
        session: { userId: 'user_1' },
        user: { id: 'user_1', email: 'test@example.com', role: 'USER', name: 'User' },
      };

      const caller = taskRouter.createCaller(mockCtx);

      expect(async () => {
        await caller.create({
          title: '', // 空
          priority: 'MEDIUM',
        });
      }).rejects.toThrow('BAD_REQUEST');
    });
  });

  describe('task.list', () => {
    it('ユーザーのタスク一覧を取得', async () => {
      const mockCtx = {
        session: { userId: 'user_1' },
        user: { id: 'user_1', email: 'test@example.com', role: 'USER', name: 'User' },
      };

      const caller = taskRouter.createCaller(mockCtx);

      const result = await caller.list();

      expect(Array.isArray(result)).toBe(true);
      // すべてのタスクが、ユーザーが作成者 OR 割り当て先
      result.forEach((task) => {
        const isCreatorOrAssignee =
          task.creatorId === 'user_1' || task.assigneeId === 'user_1';
        expect(isCreatorOrAssignee).toBe(true);
      });
    });
  });
});
```

**テスト実行**:
```bash
npm run test                  # テスト実行
npm run test:ui              # UI でテスト表示
npm run test:coverage        # カバレッジ生成
```

---

### Part 2: E2E テスト実装(20分)

#### Step 2.1: Playwright セットアップ(所要時間:10分)

**このステップで学ぶこと**: ブラウザ自動テスト。

**なぜ必要?**: UI の実際の動作をテスト。ログイン → タスク作成 → 削除 など一連の流れ。

**コードの仕組み解説**:

```bash
# インストール(既にあるはず)
npm install -D @playwright/test
npx playwright install

# playwright.config.ts を確認
```

```typescript
// filepath: playwright.config.ts (既存から確認)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

#### Step 2.2: E2E テストケース(所要時間:10分)

**このステップで学ぶこと**: ブラウザでの操作シミュレート。

**なぜ必要?**: UI が実際に動作するか。入力フォーム → ボタンクリック → ページ遷移。

**コードの仕組み解説**:

```typescript
// filepath: e2e/task-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Workflow', () => {
  test('ログイン → タスク作成 → 完了', async ({ page }) => {
    // 1. ログインページへアクセス
    await page.goto('/login');
    expect(await page.title()).toContain('ログイン');

    // 2. ログイン
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("ログイン")');

    // 3. ダッシュボードにリダイレクト
    await page.waitForURL('/dashboard');
    expect(page.url()).toContain('/dashboard');

    // 4. 「タスク」メニューをクリック
    await page.click('a:has-text("タスク")');
    await page.waitForURL('/dashboard/tasks');

    // 5. 「新規作成」ボタンをクリック
    await page.click('button:has-text("新規作成")');
    await page.waitForURL('/dashboard/tasks/new');

    // 6. フォーム入力
    await page.fill('input[placeholder="タイトル"]', 'テストタスク');
    await page.fill('textarea[placeholder="説明"]', 'テスト用タスク');

    // 7. 「作成」ボタンをクリック
    await page.click('button:has-text("作成")');

    // 8. タスク詳細ページにリダイレクト
    await page.waitForURL(/\/dashboard\/tasks\/[a-z0-9]+/);

    // 9. タスク情報を確認
    const title = await page.textContent('h4');
    expect(title).toBe('テストタスク');

    // 10. ステータスを「完了」に変更
    await page.click('select[name="status"]');
    await page.click('option:has-text("完了")');
    await page.click('button:has-text("保存")');

    // 11. 完了を確認
    await page.waitForTimeout(1000);
    const status = await page.textContent('[data-test="task-status"]');
    expect(status).toBe('DONE');
  });

  test('コメント投稿・削除', async ({ page }) => {
    // ログインしてタスク詳細ページへ
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("ログイン")');

    // タスク詳細ページ(固定のタスクID)
    await page.goto('/dashboard/tasks/task_123');

    // コメント投稿
    await page.fill('textarea[placeholder="コメントを入力"]', 'テストコメント');
    await page.click('button:has-text("投稿")');

    // コメントが表示される
    await expect(
      page.locator('text=テストコメント')
    ).toBeVisible();

    // コメント削除
    await page.click('button[data-test="delete-comment"]');
    await page.click('button:has-text("削除")');

    // コメントが消える
    await expect(
      page.locator('text=テストコメント')
    ).not.toBeVisible();
  });
});
```

**テスト実行**:
```bash
npm run test:e2e              # E2E テスト実行
npx playwright show-report    # レポート表示
```

---

### Part 3: CI/CD パイプライン(15分)

#### Step 3.1: GitHub Actions で自動テスト実行(所要時間:15分)

**このステップで学ぶこと**: Git push 時に自動テスト実行。

**なぜ必要?**: PR をマージする前にテストを走す。バグを検出。

**コードの仕組み解説**:

```yaml
# filepath: .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: task_app_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Prisma migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/task_app_test
        run: npx prisma migrate deploy

      - name: Run unit tests
        run: npm run test

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check TypeScript
        run: npm run type-check
```

**package.json スクリプト追加**:

```json
{
  "script": {
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. **ユニットテスト**
   - [ ] Vitest セットアップ
   - [ ] tRPC ルーターのテスト
   - [ ] エラーハンドリングテスト

2. **E2E テスト**
   - [ ] Playwright セットアップ
   - [ ] ログイン → タスク作成フロー
   - [ ] コメント投稿・削除テスト

3. **CI/CD**
   - [ ] GitHub Actions ワークフロー
   - [ ] 自動テスト実行
   - [ ] テストレポート生成

---

## まとめ

- **Vitest**: Node.js 環境でのユニットテスト
- **Playwright**: ブラウザ自動テスト
- **GitHub Actions**: CI/CD パイプライン
- **テストカバレッジ**: 重要な機能をカバー
- **PR チェック**: マージ前にテスト実行

次回(Day 18)は パフォーマンス最適化です。
