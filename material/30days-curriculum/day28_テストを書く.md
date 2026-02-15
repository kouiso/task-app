# Day 28: テストを書こう

## 🎯 今日のゴール

Vitest を使ってテストを書く方法を学びます。
tRPC ルーターのテストと React コンポーネントの
テストを実装します。

【スクリーンショット: Vitest の実行結果（全テストパス）】

## 🤔 なぜこれを学ぶのか？

テストはコードの品質を保証する仕組みです。
機能追加やリファクタリング時に、既存機能が
壊れていないことを自動で確認できます。

> 💡 **例え話**: テストは「車の安全点検」
> です。走る前に毎回ブレーキやタイヤを
> 点検するのは面倒ですが、点検しなければ
> いつか事故を起こします。テストを書けば
> コードの「安全点検」を自動化できます。

### 📐 テストピラミッド

```mermaid
graph TB
    subgraph "テストピラミッド"
        A[E2E テスト<br/>Playwright<br/>少数・遅い] -->
        B[コンポーネントテスト<br/>@testing-library/react<br/>中程度]
        B -->
        C[ユニットテスト<br/>Vitest<br/>多数・速い]
    end

    subgraph "このアプリの構成"
        D[e2e/ ディレクトリ]
        E["src/component/**/__test/"]
        F["src/server/**/__test/"]
    end

    A -.-> D
    B -.-> E
    C -.-> F

    style A fill:#ffcdd2
    style B fill:#fff3e0
    style C fill:#e8f5e9
```

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| Vitest の設定を確認 | テストフレームワークの変更 |
| tRPC ルーターテストを書く | E2E テストの実装 |
| コンポーネントテストを書く | カバレッジ 100% を目指す |
| テストヘルパーを活用する | CI/CD パイプラインの構築 |

### 🆕 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| describe | ディスクライブ | テストグループ | テストの章 |
| it / test | イット | 個別テスト | テストの項目 |
| expect | エクスペクト | 結果の検証 | 答え合わせ |
| vi.mock | ヴィモック | モジュール差替え | 代役 |
| render | レンダー | コンポーネント描画 | 画面に表示 |

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | テストの全体像 | 3分 |
| Step 2 | Vitest の設定確認 | 5分 |
| Step 3 | テストヘルパーを理解 | 5分 |
| Step 4 | tRPC ルーターテスト | 10分 |
| Step 5 | コンポーネントテストの準備 | 5分 |
| Step 6 | コンポーネントテストの実装 | 10分 |
| Step 7 | テストの実行とカバレッジ | 5分 |
| Step 8 | テストのベストプラクティス | 3分 |
| Step 9 | 振り返り確認 | 3分 |

**合計時間**: 約49分

---

### Step 1: テストの全体像（3分）

🎯 **ゴール**: テストの種類と
それぞれの役割を理解します。

#### テストの種類

| 種類 | テスト対象 | 速度 | 信頼度 |
|------|----------|------|--------|
| ユニットテスト | 関数・ロジック単体 | 速い | 中 |
| コンポーネントテスト | UI パーツの表示と操作 | 中 | 中〜高 |
| 統合テスト | API + DB の連携 | 遅い | 高 |
| E2E テスト | ブラウザ操作全体 | 最も遅い | 最も高い |

> 💡 ピラミッドの下層ほど数を多く、
> 上層ほど数を少なくするのが基本です。
> ユニットテストを多く書き、E2E テストは
> 重要な導線のみに絞ります。

✅ **確認ポイント**:
- テストの種類と使い分けを理解した

---

### Step 2: Vitest の設定確認（5分）

🎯 **ゴール**: `vitest.config.ts` の設定内容を
理解します。

💻 **設定ファイル**:

```typescript
// filepath: vitest.config.ts
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['**/*.{jsx,tsx}', 'jsdom'],
      ['**/api/**/*.test.{ts,tsx}', 'node'],
    ],
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
  },
});
```

#### 設定項目の意味

| 設定 | 値 | 意味 |
|------|-----|------|
| environment | node | API テストは Node 環境 |
| environmentMatchGlobs | jsx→jsdom | コンポーネントはブラウザ環境 |
| globals | true | describe/it をインポート不要 |
| setupFiles | setup.ts | 全テスト前に実行するファイル |

> 💡 `environmentMatchGlobs` により、
> `.tsx` ファイルは自動的に jsdom 環境、
> API テストは node 環境で実行されます。

```typescript
// filepath: vitest.config.ts（テスト用環境変数）
env: {
  DATABASE_URL:
    'postgresql://postgres:postgres'
    + '@localhost:5432/taskapp_test',
  JWT_SECRET:
    'test-secret-key-for-testing-only',
  NODE_ENV: 'test',
},
```

> 💡 テスト用の `DATABASE_URL` と
> `JWT_SECRET` を設定しています。
> 本番の値とは別のテスト専用値です。

✅ **確認ポイント**:
- vitest.config.ts の内容を理解した

【スクリーンショット: vitest.config.ts の内容】

---

### Step 3: テストヘルパーを理解（5分）

🎯 **ゴール**: テスト用のヘルパー関数を
理解します。

💻 **テストヘルパー**:

```typescript
// filepath: src/test/helpers.ts
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

export async function createTestUser(
  overrides: {
    email?: string;
    name?: string;
    password?: string;
    role?: 'USER' | 'ADMIN';
  } = {},
) {
  const hashedPassword =
    await bcrypt.hash(
      overrides.password || 'password123',
      10
    );
```

`createTestUser` の後半では、ハッシュ化したパスワードを使って Prisma でユーザーを作成します。

```typescript
// filepath: src/test/helpers.ts（続き）
  return await prisma.user.create({
    data: {
      email: overrides.email
        || `test${Date.now()}@example.com`,
      name: overrides.name || 'Test User',
      password: hashedPassword,
      role: overrides.role || 'USER',
      isActive: true,
    },
  });
}
```

> 💡 `createTestUser` はテスト用の
> ユーザーをDBに作成します。
> `Date.now()` でメールアドレスを一意にし、
> テスト間の衝突を防ぎます。

```typescript
// filepath: src/test/helpers.ts
export async function createAuthenticatedCaller(
  userId: string,
  email: string,
  role: string
) {
  const session =
    createMockSession(userId, email, role);
  return await createTestCaller(session);
}
```

#### ヘルパー関数の一覧

| 関数名 | 役割 |
|--------|------|
| createTestUser | テスト用ユーザー作成 |
| createTestProject | テスト用プロジェクト作成 |
| createTestTask | テスト用タスク作成 |
| createMockSession | モックセッション作成 |
| createTestCaller | tRPC テスト用 caller |
| createAuthenticatedCaller | 認証済み caller |

> 💡 `createAuthenticatedCaller` は
> ログイン済みユーザーとして tRPC の
> API を呼び出せる caller を作成します。

✅ **確認ポイント**:
- 各ヘルパー関数の役割を理解した

---

### Step 4: tRPC ルーターテスト（10分）

🎯 **ゴール**: tRPC ルーターの
テストを書きます。

💻 **タスク作成テスト**:

```typescript
// filepath: src/server/api/routers/__test/task.test.ts
import { describe, it, expect } from 'vitest';
import {
  createTestUser,
  createTestProject,
  createAuthenticatedCaller,
} from '../../../../test/helpers';

describe('Task Router', () => {
  it('タスクを作成できる', async () => {
    // Arrange: テストデータを準備
    const user = await createTestUser();
    const project = await createTestProject(
      user.id
    );
```

テストデータの準備ができたら、認証済み caller を使ってタスクを作成し、結果を検証します。

```typescript
// filepath: src/server/api/routers/__test/task.test.ts（続き）
    const caller =
      await createAuthenticatedCaller(
        user.id, user.email, user.role
      );

    // Act: タスクを作成
    const result =
      await caller.task.create({
        projectId: project.id,
        title: 'テストタスク',
        priority: 'HIGH',
      });

    // Assert: 結果を検証
    expect(result.title).toBe('テストタスク');
    expect(result.priority).toBe('HIGH');
  });
```

> 💡 テストディレクトリは `__test/` です
> （`__tests/` ではありません）。
> このプロジェクトの命名規則に従います。

```typescript
// filepath: src/server/api/routers/__test/task.test.ts
  it('未認証ではタスクを作成できない',
    async () => {
      // Arrange: 未認証の caller
      const caller =
        await createTestCaller(null);

      // Act & Assert: エラーを期待
      await expect(
        caller.task.create({
          projectId: 'dummy',
          title: 'テスト',
          priority: 'HIGH',
        })
      ).rejects.toThrow('UNAUTHORIZED');
    }
  );
});
```

> 💡 `rejects.toThrow` は Promise が
> reject されることを検証します。
> 未認証で API を呼ぶと `UNAUTHORIZED`
> エラーが発生することをテストしています。

✅ **確認ポイント**:
- 正常系と異常系のテストを書けた

【スクリーンショット: ルーターテストの実行結果】

---

### Step 5: コンポーネントテストの準備（5分）

🎯 **ゴール**: コンポーネントテストに必要な
セットアップを理解します。

💻 **テスト環境の指定**:

```typescript
// filepath: src/component/task/__test/task-card.test.tsx
/**
 * @vitest-environment jsdom
 */
import {
  render, screen,
} from '@testing-library/react';
import userEvent
  from '@testing-library/user-event';
import {
  describe, expect, it, vi,
} from 'vitest';
```

> 💡 ファイル先頭の `@vitest-environment jsdom`
> コメントで、このテストファイルだけ
> ブラウザ環境（jsdom）で実行されます。

💻 **tRPC プロバイダーのラッパー**:

```typescript
// filepath: src/component/task/__test/task-card.test.tsx
import { QueryClientProvider }
  from '@tanstack/react-query';
import { createTRPCTestUtils }
  from '../../../test/helpers';

function createWrapper() {
  const { trpcReact, queryClient, trpcClient }
    = createTRPCTestUtils();
```

`createWrapper` の内部では、tRPC と React Query のプロバイダーでラップする Wrapper コンポーネントを返します。

```typescript
// filepath: src/component/task/__test/task-card.test.tsx（続き）
  function Wrapper(
    { children }: { children: ReactNode }
  ) {
    return (
      <QueryClientProvider client={queryClient}>
        <trpcReact.Provider
          client={trpcClient}
          queryClient={queryClient}>
          {children}
        </trpcReact.Provider>
      </QueryClientProvider>
    );
  }
  return Wrapper;
}
```

> 💡 tRPC を使うコンポーネントのテストでは
> `QueryClientProvider` と tRPC Provider で
> ラップする必要があります。
> `createTRPCTestUtils` がこれを簡単にします。

✅ **確認ポイント**:
- jsdom 環境の指定方法を理解した
- ラッパーの作り方を理解した

---

### Step 6: コンポーネントテストの実装（10分）

🎯 **ゴール**: TaskCard コンポーネントの
テストを実装します。

💻 **モックの定義**:

```typescript
// filepath: src/component/task/__test/task-card.test.tsx
// 子コンポーネントをモックで差し替え
vi.mock('../task-timer', () => ({
  TaskTimer: ({
    isTimerActive,
    onTimerUpdate,
  }: {
    taskId: string;
    isTimerActive: boolean;
    onTimerUpdate?: () => void;
  }) => (
```

モック内では、タイマーボタンの表示と操作を簡易的に再現します。

```typescript
// filepath: src/component/task/__test/task-card.test.tsx（続き）
    <div data-testid="task-timer">
      <button
        type="button"
        onClick={() => onTimerUpdate?.()}
        aria-label={
          isTimerActive
            ? 'Stop timer'
            : 'Start timer'
        }>
        {isTimerActive
          ? 'Stop Timer'
          : 'Start Timer'}
      </button>
    </div>
  ),
}));
```

> 💡 `vi.mock` で子コンポーネントを
> 軽量なモックに差し替えます。
> テスト対象の TaskCard だけに集中できます。

💻 **テストケースの実装**:

```typescript
// filepath: src/component/task/__test/task-card.test.tsx
describe('TaskCard', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnClick = vi.fn();

  const defaultProps = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO' as const,
    priority: 'HIGH' as const,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onClick: mockOnClick,
  };
```

テストデータを定義したら、個別のテストケースを書いていきます。まずはタイトルの表示確認です。

```typescript
// filepath: src/component/task/__test/task-card.test.tsx（続き）
  it('タスクタイトルが表示される', () => {
    const Wrapper = createWrapper();
    render(
      <TaskCard {...defaultProps} />,
      { wrapper: Wrapper }
    );
    expect(
      screen.getByText('Test Task')
    ).toBeInTheDocument();
  });
```

```typescript
// filepath: src/component/task/__test/task-card.test.tsx
  it('クリックで onClick が呼ばれる',
    async () => {
      const Wrapper = createWrapper();
      const user = userEvent.setup();
      render(
        <TaskCard {...defaultProps} />,
        { wrapper: Wrapper }
      );

      const card = screen.getByText('Test Task')
        .closest('[role="button"]');
      if (card) {
        await user.click(card);
        expect(mockOnClick)
          .toHaveBeenCalledWith('task-1');
      }
    }
  );
```

次に、担当者名が正しく表示されるかを検証するテストです。

```typescript
// filepath: src/component/task/__test/task-card.test.tsx（続き）
  it('担当者名が表示される', () => {
    const Wrapper = createWrapper();
    render(
      <TaskCard
        {...defaultProps}
        assignee={{
          name: 'John Doe',
          email: 'john@example.com',
          avatar: null,
        }}
      />,
      { wrapper: Wrapper }
    );
    expect(
      screen.getByText('John Doe')
    ).toBeInTheDocument();
  });
});
```

> 💡 `userEvent.setup()` は `fireEvent` より
> 実際のユーザー操作に近い動きをします。
> キーボード入力やクリックの順序を
> 正確にシミュレートします。

✅ **確認ポイント**:
- モックの使い方を理解した
- 表示とイベントのテストを書けた

【スクリーンショット: コンポーネントテストの実行結果】

---

### Step 7: テストの実行とカバレッジ（5分）

🎯 **ゴール**: テストを実行して
結果を確認します。

💻 **テスト実行コマンド**:

```bash
# filepath: ターミナル
# 全テストを実行
npm test

# 特定ファイルのみ実行
npm test -- task-card.test.tsx

# カバレッジ付きで実行
npm test -- --coverage
```

#### テスト結果の見方

| 表示 | 意味 |
|------|------|
| PASS | テスト成功 |
| FAIL | テスト失敗 |
| % Stmts | 実行された文の割合 |
| % Branch | 通過した分岐の割合 |
| % Funcs | 呼ばれた関数の割合 |
| % Lines | 実行された行の割合 |

```bash
# filepath: ターミナル（カバレッジ出力例）
# ----------|---------|---------|---------|
# File      | % Stmts | % Branch| % Lines
# ----------|---------|---------|---------|
# task-card | 92.30   | 85.71   | 92.30
# auth.ts   | 88.46   | 75.00   | 88.46
# ----------|---------|---------|---------|
```

> 💡 カバレッジは v8 プロバイダーで計測します。
> HTML レポートは `coverage/` ディレクトリに
> 出力され、ブラウザで詳細を確認できます。

✅ **確認ポイント**:
- 全テストがパスする
- カバレッジレポートを確認できた

【スクリーンショット: カバレッジレポートの HTML 画面】

---

### Step 8: テストのベストプラクティス（3分）

🎯 **ゴール**: 良いテストを書くための
原則を学びます。

#### AAA パターン

| ステップ | 英語 | 日本語 | やること |
|---------|------|--------|---------|
| 1 | Arrange | 準備 | テストデータを作成 |
| 2 | Act | 実行 | テスト対象を呼び出す |
| 3 | Assert | 検証 | 結果が期待通りか確認 |

#### テストの原則

| 原則 | 説明 |
|------|------|
| 1テスト1機能 | 1つの it で1つの動作を検証 |
| テストは独立 | 他テストの結果に依存しない |
| 具体的な名前 | 何を確認するか明確に記述 |
| 正常系と異常系 | 成功と失敗の両方をテスト |

> 💡 テスト名は「〜できる」「〜が表示される」
> のように、期待する動作を書きます。
> テストが失敗した時に何が壊れたか
> すぐ分かるようにします。

✅ **確認ポイント**:
- AAA パターンを理解した
- テストの原則を理解した

---

### Step 9: 振り返り確認（3分）

🎯 **ゴール**: 今日学んだテストの知識を
振り返ります。

1. Vitest の設定と環境切り替えを理解した
2. テストヘルパーの使い方を理解した
3. tRPC ルーターテストを書けた
4. コンポーネントテストを書けた
5. vi.mock でモジュールを差し替えられた
6. AAA パターンでテストを構造化できた

✅ **確認ポイント**:
- 6項目すべてを説明できる

---

## 📋 今日のまとめ

- [ ] Vitest の設定を理解した
- [ ] テストヘルパーの役割を理解した
- [ ] tRPC ルーターのテストを書けた
- [ ] React コンポーネントのテストを書けた
- [ ] テストを実行してパスを確認した
- [ ] AAA パターンを理解した

## ⚠️ つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| ReferenceError: document is not defined | node 環境で DOM を使用 | `@vitest-environment jsdom` を追加 |
| テスト間でデータが残る | DB がクリアされていない | setup.ts の afterEach で TRUNCATE |
| vi.mock が効かない | ファイルパスが間違い | 相対パスを正確に指定 |
| tRPC Provider エラー | ラッパー未設定 | createWrapper で Provider を追加 |

## 📝 今日学んだ用語

| 用語 | 意味 |
|------|------|
| describe | テストケースをグループ化する関数 |
| it / test | 個別のテストケースを定義する関数 |
| expect | テスト結果の検証関数 |
| vi.mock | モジュールをモックに差し替える |
| vi.fn | モック関数を作成する |
| render | コンポーネントを仮想 DOM に描画 |
| screen | 描画結果からの要素検索ユーティリティ |
| userEvent | ユーザー操作のシミュレーション |
| AAA パターン | Arrange → Act → Assert の構造 |

## 🔗 次回予告

Day 29 では、アプリの最終調整と動作確認を
行います。型チェック、リンター、ビルドを通して
本番リリースの準備を整えます。
