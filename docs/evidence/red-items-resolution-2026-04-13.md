# 🔴 未着手項目 調査・方針決定レポート

**作成日**: 2026-04-13
**対象**: `docs/completion-criteria-2026-04-13.md` §6.3 の 🔴 未着手 4項目
**調査方法**: 実コード Grep / Glob / ファイル読み込みによるエビデンスベース調査

---

## 1. F-09 通知機能

### 現状

| 調査項目 | 結果 |
|---------|------|
| `src/` 内 `notification\|notify\|Notification` Grep | **0件** |
| DB スキーマ（Prisma） | 通知テーブルなし |
| tRPC ルーター | 通知関連エンドポイントなし |
| UI コンポーネント | 通知関連コンポーネントなし |

**結論**: 完全に未実装。コード・スキーマ・APIいずれにも痕跡なし。

### 方針決定: **スコープ外（Out of Scope）**

**理由**:
1. task-app は教材プロジェクトであり、学習目標は「Next.js 15 + tRPC + Prisma によるフルスタック CRUD アプリ構築」
2. 通知機能は WebSocket / Server-Sent Events / Push API 等の追加技術スタックを要求し、教材の焦点がぼやける
3. 30日カリキュラムのスコープにおいて、通知機能は「目に見える成果」が薄く初心者の学習モチベーションに寄与しにくい（`feedback_no_invisible_topics.md` 参照）
4. CRUD + 認証 + ダッシュボードで教材としての価値は十分に達成済み

---

## 2. Sentry エラー監視

### 現状

| 調査項目 | 結果 |
|---------|------|
| `src/` 内 `sentry\|@sentry\|Sentry` Grep | **0件**（ドキュメントファイル4件のみヒット） |
| `package.json` Sentry SDK | 未インストール |
| `next.config.*` Sentry plugin | 未設定 |
| `sentry.*.config.*` | 不存在 |

**結論**: コード実装ゼロ。ドキュメント上の言及のみ。

### 方針決定: **スコープ外（Out of Scope）**

**理由**:
1. Sentry は本番運用向けの SaaS であり、教材プロジェクトでは外部アカウント・DSN 設定が必要となり学習者の環境構築負荷が増す
2. エラー監視の概念教育は教材テキストで十分（実装不要）
3. 完了基準書においても「オプション」扱い
4. Sentry 導入は 1 日分のカリキュラムボリュームに相当し、コア学習目標を圧迫する

---

## 3. npm audit CI 組込

### 現状

| 調査項目 | 結果 |
|---------|------|
| `.github/workflows/ci.yml` | `reusable-ci.yml` + `reusable-license-check.yml` を呼び出し |
| `.github/workflows/reusable-ci.yml` | checkout → mise → npm install → build:ci → lint。**npm audit ステップなし** |
| `.github/workflows/dependency-review.yml` | `actions/dependency-review-action@v4` 使用。PR の依存差分レビュー（`warn-only: true`） |

**重要な区別**: `dependency-review-action` は PR の依存変更をレビューするもので、`npm audit` とは異なる。
- `dependency-review-action`: PR diff ベース。新規追加・更新された依存のみチェック。既存脆弱性は検出しない
- `npm audit`: `node_modules` 全体の既知脆弱性をスキャン。既存・新規問わず検出

### 方針決定: **最小実装（npm audit ステップを CI に追加）**

**理由**:
1. 既存の `dependency-review.yml` は PR 差分のみ対象であり、既存依存の脆弱性を継続的に検出できない
2. `npm audit` は追加コスト（設定・外部サービス）ゼロで導入可能
3. 教材としても「CI でセキュリティチェックを自動化する」実践例として価値がある

### ドラフト YAML

```yaml
# .github/workflows/npm-audit.yml
name: npm audit

on:
  push:
    branches: [main, develop]
    paths:
      - 'package.json'
      - 'package-lock.json'
  pull_request:
    paths:
      - 'package.json'
      - 'package-lock.json'
  schedule:
    - cron: '0 9 * * 1' # 毎週月曜 9:00 UTC

permissions:
  contents: read

jobs:
  audit:
    name: npm audit
    runs-on: blacksmith-4vcpu-ubuntu-2404
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup tools with mise
        uses: jdx/mise-action@v2
        with:
          install: true

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=moderate
```

**設計判断**:
- `--audit-level=moderate`: low は誤検知が多いため moderate 以上で失敗
- `schedule` 付き: 依存変更がなくても週次で既知脆弱性を検出
- `paths` フィルタ: 依存ファイル変更時のみ PR でトリガー（不要な実行を回避）
- `npm ci`: `npm install` より再現性が高く CI 向き
- `blacksmith-4vcpu-ubuntu-2404`: 既存ワークフローと同一ランナー

---

## 4. a11y 最低限（キーボード操作・ラベル属性）

### 調査対象フォーム

| フォーム | ファイルパス |
|---------|------------|
| ログイン | `src/app/login/page.tsx` |
| ユーザー登録 | `src/app/register/page.tsx` |
| タスク作成/編集 | `src/component/task/task-dialog.tsx` |
| プロジェクト作成/編集 | `src/component/project/project-dialog.tsx` |
| 共通フォーム基盤 | `src/component/ui/form.tsx` |

### 測定結果

| フォーム | `htmlFor` | `aria-label` | `aria-describedby` | 評価 |
|---------|-----------|-------------|-------------------|------|
| ログイン (`login/page.tsx`) | 2 (email, password) | 0 | 0 | ✅ 十分 |
| 登録 (`register/page.tsx`) | 4 (name, email, password, confirmPassword) | 0 | 0 | ✅ 十分 |
| タスクダイアログ (`task-dialog.tsx`) | 8 | 4 (Select トリガー用) | 0 | ✅ 良好 |
| プロジェクトダイアログ (`project-dialog.tsx`) | 5 (name, description, color, startDate, endDate) | 0 | 0 | ✅ 十分 |
| 共通フォーム (`ui/form.tsx`) | 自動付与 (`formItemId`) | 0 | 自動付与 (エラー連携) | ✅ 優秀 |

**合計**: `htmlFor` 19件 + `aria-label` 4件 + 自動 `aria-describedby` (form.tsx 経由)

### 詳細所見

1. **共通フォーム基盤 (`form.tsx`)** が `formItemId` パターンで `htmlFor` と `aria-describedby` を自動付与しており、このコンポーネントを使用する全フォームで基本的な a11y が担保される
2. **Select コンポーネント** (shadcn/ui) の `SelectTrigger` には明示的な `aria-label` が付与済み（例: `aria-label="ステータスを選択"`）
3. **キーボード操作**: shadcn/ui (Radix UI ベース) は全コンポーネントでキーボードナビゲーションをネイティブサポート。Tab / Enter / Escape / Arrow keys が標準動作
4. **フォーカスインジケータ**: Tailwind CSS の `focus-visible:ring-*` クラスによりフォーカス状態が視覚的に明示される

### 方針決定: **既に最低限を達成済み — 追加実装不要**

**根拠**:
- 全主要フォームの全入力フィールドに `htmlFor` によるラベル紐付けが存在
- Select 系 UI には `aria-label` が明示的に付与済み
- 共通フォーム基盤がエラーメッセージの `aria-describedby` 連携を自動処理
- Radix UI ベースの shadcn/ui がキーボード操作を標準サポート
- 教材プロジェクトとして「最低限の a11y」基準は十分に満たしている

---

## サマリー

| 項目 | 決定 | 理由 |
|------|------|------|
| F-09 通知機能 | 🚫 スコープ外 | 教材の学習目標に不要。追加技術スタック負荷大 |
| Sentry エラー監視 | 🚫 スコープ外 | 外部 SaaS 依存。教材では概念説明で十分 |
| npm audit CI 組込 | 🔧 最小実装 | ドラフト YAML 作成済み。dependency-review とは別に必要 |
| a11y 最低限 | ✅ 達成済み | htmlFor 19件 + aria-label 4件 + 自動 aria-describedby |
