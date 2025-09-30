# Task-App教材開発プロジェクト - 引き継ぎ専用プロンプト

## 🚨 重要：このファイルの用途
**このファイルは、別のAIエージェントに作業を引き継ぐ際の専用プロンプトです。**
**プロジェクトを継続する際は、このファイル全体をAIに渡してください。**

---

## 📝 初期指示の要約

### プロジェクト概要
```
私は現在、プログラミング教材を2つ開発しています：

1. **redmine-clone**: Flask/Pythonで作成中のタスク管理ツール教材（既存）
2. **task-app**: TypeScriptで作成する新しいタスク管理ツール教材（新規）

task-appでは、redmine-cloneと同じタスク管理ツールの機能を、最新のTypeScript/Next.jsで再実装したいと考えています。
horsemanager-webという既存リポジトリの構造を流用し、現役エンジニアが実際に使用している技術スタックで、ステップバイステップでアプリが作れる教材を作成することが目標です。
```

### 🎯 **本来の最重要指示（絶対遵守）**
```
1. redmine-cloneの機能を完全に再現すること
   - もしredmine-cloneにバグがあれば、それを修正した上でtask-appに実装する
   - redmine-cloneのテストをすべて確認し、同等以上の品質を担保する

2. 教材としての大幅改善（redmine-cloneの課題解決）
   - redmine-cloneは教材として簡素すぎるため、大幅に改善する
   - より詳細な説明、豊富なコード例、実践的な演習を含める
   - 初心者でも理解できるように、段階的で丁寧な説明を心がける

3. 実装の完全性（プロダクションレベル）
   - 単なるサンプルではなく、実際に使えるレベルのアプリケーションにする
   - エラーハンドリング、バリデーション、セキュリティを適切に実装
   - パフォーマンスとユーザビリティを考慮した実装

4. 現代的な開発手法の採用（2024年最新）
   - 最新の安定版ライブラリを使用（Next.js 15、tRPC v11など）
   - TypeScriptの型安全性を最大限活用
   - モダンな開発ツール（Biome、Turbopack等）の活用

5. 教材配置の絶対ルール
   - すべての教材は必ず ./material/ フォルダに配置すること
   - これは変更不可の重要なルールです
```

### 技術要件（変更禁止）
```
- フレームワーク: Next.js 15 (App Router必須、Pages Router禁止)
- UI: Material-UI (MUI) v6
- API: tRPC v11
- ORM: Prisma v6
- 認証: NextAuth.js v5 (メール/パスワード認証)
- デプロイ: Vercel
- 開発ツール: Biome (ESLint/Prettierの代替)
- パッケージマネージャー: npm（pnpmではない）
- Node.js: 既存バージョンを維持（変更しない）
```

### 教材要件
```
- redmine-cloneの教材構造を参考にするが、大幅に充実させる
- 21日間の段階的学習カリキュラム
- 教材は./materialフォルダに配置（絶対ルール）
- Marp形式のスライド教材を含む
- 実践的なコード例とトラブルシューティングガイド
- 各日の学習内容に明確な目標と成果物を設定
```

---

## 🚀 これまでの作業内容（2025年9月29日時点）

### ✅ 完了した作業

#### 1. プロジェクト基盤構築
- **Next.js 15へのアップグレード完了**
  - App Router完全対応
  - Turbopack有効化
  - Partial Prerendering (PPR) 実験的機能有効
  - package.json全依存関係の最新化

- **tRPC v11設定完了**
  - Fetch adapter対応
  - superjson transformer設定
  - App Router用API route設定
  - 型安全なクライアント設定

- **開発環境整備完了**
  - Biomeリンター/フォーマッター設定
  - lint-staged統合（コミット時自動修正）
  - TypeScript 5.6厳密設定
  - VSCode設定ファイル

#### 2. 認証システム実装
- **NextAuth.js v5設定完了**
  - メール/パスワード認証
  - bcryptによるパスワードハッシュ化
  - セッション管理
  - App Router対応のAPI route

- **認証UI実装完了**
  - Material-UI使用のログイン/登録フォーム
  - バリデーション付きフォーム
  - エラーハンドリング

#### 3. データベース・API設計
- **Prismaスキーマ定義完了**
  - User, Project, Task, Comment モデル
  - 適切なリレーション設定
  - インデックス最適化

- **tRPC API実装**
  - タスクCRUD operations
  - プロジェクト管理API
  - ユーザー管理API
  - 認証保護されたエンドポイント

#### 4. UI/UX基盤
- **Material-UI v6統合完了**
  - カスタムテーマ設定
  - レスポンシブ対応
  - ダークモード準備

- **レイアウト・ナビゲーション**
  - App Router対応レイアウト
  - サイドバーナビゲーション
  - ヘッダー・フッター

#### 5. 教材作成（重要成果）
- **21日間カリキュラム作成完了**
  - `material/00_NEW_21_DAY_PLAN.md`
  - 段階的学習設計
  - 明確な学習目標設定

- **基礎教材完成**
  - `material/BEGINNER_GUIDE_NEXTJS.md`
  - `material/TECH_STACK_GUIDE.md`
  - `material/FAQ_MODERN_WEB.md`
  - `material/TROUBLESHOOTING_NEXTJS.md`

- **Day 1-4スライド作成完了**
  - Marp形式のプレゼンテーション
  - 実践的なコード例
  - 演習問題付き

#### 6. 開発効率化
- **シードデータ作成**
  - デモユーザー、プロジェクト、タスク
  - 開発用テストデータ

- **開発スクリプト整備**
  - npm run dev, build, test
  - データベース操作コマンド
  - リント・フォーマット自動化

### 📂 現在のプロジェクト構造

```
task-app/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── layout.tsx          # ルートレイアウト
│   │   ├── page.tsx            # ホームページ
│   │   ├── (auth)/             # 認証ページグループ
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/          # ダッシュボード
│   │   ├── projects/           # プロジェクト管理
│   │   ├── tasks/              # タスク管理
│   │   └── api/                # APIルート
│   │       ├── auth/           # NextAuth.js
│   │       └── trpc/           # tRPC エンドポイント
│   ├── components/             # 再利用可能UIコンポーネント
│   │   ├── ui/                 # 基本UIコンポーネント
│   │   ├── forms/              # フォームコンポーネント
│   │   └── layout/             # レイアウトコンポーネント
│   ├── server/                 # サーバーサイドロジック
│   │   ├── api/                # tRPCルーター
│   │   │   ├── routers/        # 機能別ルーター
│   │   │   └── root.ts         # ルートルーター
│   │   ├── auth.ts             # NextAuth設定
│   │   └── db.ts               # Prismaクライアント
│   ├── lib/                    # ユーティリティ関数
│   │   ├── utils.ts            # 汎用ユーティリティ
│   │   ├── validations.ts      # Zodスキーマ
│   │   └── constants.ts        # 定数定義
│   └── styles/                 # スタイル設定
├── prisma/
│   ├── schema.prisma           # データベーススキーマ
│   ├── seed.ts                 # シードデータ
│   └── migrations/             # マイグレーション
├── material/                   # 教材フォルダ（重要）
│   ├── 00_NEW_21_DAY_PLAN.md              # メインカリキュラム
│   ├── slides/                            # Marpスライド
│   │   ├── day01_setup.md                 # Day1スライド
│   │   ├── day02_components.md            # Day2スライド
│   │   ├── day03_auth.md                  # Day3スライド
│   │   └── day04_api.md                   # Day4スライド
│   ├── BEGINNER_GUIDE_NEXTJS.md          # 初心者ガイド
│   ├── TECH_STACK_GUIDE.md               # 技術詳細
│   ├── FAQ_MODERN_WEB.md                 # FAQ
│   └── TROUBLESHOOTING_NEXTJS.md         # トラブルシューティング
├── public/                     # 静的ファイル
├── .github/
│   └── copilot-instructions.md # GitHub Copilot設定
├── package.json                # 依存関係定義
├── next.config.mjs             # Next.js設定
├── tsconfig.json               # TypeScript設定
├── biome.json                  # Biome設定
└── README.md                   # プロジェクト説明
```

---

## 🎯 次に必要な作業（優先度順）

### 🔥 最高優先度

#### 1. redmine-clone機能パリティの完全実現
**指示：redmine-cloneのすべての機能を調査し、task-appで完全再現する**

```bash
# 必要な調査作業
1. redmine-clone/app/ 配下のすべての機能を洗い出す
2. redmine-clone/tests/ のテストケースを分析
3. 未実装機能をリストアップ
4. バグがあれば修正版をtask-appに実装
```

**重要な実装項目：**
- [ ] タスクステータス管理（新規→進行中→完了）
- [ ] ユーザー権限システム（管理者、メンバー、閲覧者）
- [ ] プロジェクト別アクセス制御
- [ ] タスクの優先度設定
- [ ] 期限管理とアラート
- [ ] 進捗率表示
- [ ] アクティビティログ
- [ ] メール通知システム

#### 2. 教材Day 5-21の完成
**指示：残り17日分の教材を段階的に作成する**

```markdown
# 作成必須項目（各日）
- Marpスライド（material/slides/dayXX_topic.md）
- 実装コード例
- 演習問題と解答
- トラブルシューティング項目
- 学習目標と成果物の明確化
```

**Day 5-21のトピック例：**
- Day 5: コメント機能実装
- Day 6: 検索・フィルター機能
- Day 7: ファイル添付機能
- Day 8: 通知システム
- Day 9: レポート・統計機能
- Day 10: UI/UX改善
- Day 11-15: 応用機能（カスタムフィールド、ワークフロー等）
- Day 16-18: テスト実装（単体、統合、E2E）
- Day 19-20: パフォーマンス最適化
- Day 21: デプロイ・運用

### 🚀 高優先度

#### 3. 機能実装の完成
```typescript
// 実装必須機能リスト
interface RequiredFeatures {
  // redmine-clone互換機能
  taskManagement: {
    crud: boolean;           // ✅ 完了
    statusWorkflow: boolean; // ❌ 未実装
    priority: boolean;       // ❌ 未実装
    assignee: boolean;       // 🔄 部分実装
    dueDate: boolean;        // 🔄 部分実装
    progress: boolean;       // ❌ 未実装
  };

  projectManagement: {
    crud: boolean;           // ✅ 完了
    memberManagement: boolean; // ❌ 未実装
    roleBasedAccess: boolean;  // ❌ 未実装
    settings: boolean;         // ❌ 未実装
  };

  userManagement: {
    authentication: boolean;   // ✅ 完了
    profile: boolean;          // 🔄 部分実装
    permissions: boolean;      // ❌ 未実装
    preferences: boolean;      // ❌ 未実装
  };

  // 教材用追加機能
  advancedFeatures: {
    comments: boolean;         // ❌ 未実装
    search: boolean;           // ❌ 未実装
    notifications: boolean;    // ❌ 未実装
    fileUpload: boolean;       // ❌ 未実装
    reports: boolean;          // ❌ 未実装
    audit: boolean;            // ❌ 未実装
  };
}
```

#### 4. UI/UX改善
```typescript
// UI/UX改善項目
interface UIImprovements {
  responsiveDesign: {
    mobile: boolean;           // 🔄 部分対応
    tablet: boolean;           // ❌ 未対応
    desktop: boolean;          // ✅ 完了
  };

  accessibility: {
    wcagCompliance: boolean;   // ❌ 未対応
    keyboardNavigation: boolean; // ❌ 未対応
    screenReader: boolean;     // ❌ 未対応
  };

  userExperience: {
    loadingStates: boolean;    // 🔄 部分実装
    errorHandling: boolean;    // 🔄 部分実装
    successFeedback: boolean;  // 🔄 部分実装
    darkMode: boolean;         // 🔄 準備済み
  };
}
```

### 📊 中優先度

#### 5. テスト実装
```bash
# テスト実装計画
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
npm install --save-dev playwright @playwright/test

# 目標カバレッジ
- 単体テスト: 80%以上
- 統合テスト: 主要APIエンドポイント
- E2Eテスト: クリティカルパス
```

#### 6. パフォーマンス最適化
```typescript
// パフォーマンス最適化項目
interface PerformanceOptimizations {
  bundleOptimization: boolean;    // 🔄 Turbopack有効
  imageOptimization: boolean;     // ❌ 未実装
  codesplitting: boolean;        // 🔄 部分実装
  caching: boolean;              // ❌ 未実装
  databaseOptimization: boolean; // ❌ 未実装
}
```

#### 7. デプロイ準備
```bash
# Vercelデプロイ設定
- 環境変数設定
- PostgreSQL接続設定
- ビルド最適化
- セキュリティ設定
```

---

## 💭 評価してほしいポイント

### 1. **技術選定の妥当性**
- Next.js 15 + tRPC v11の組み合わせは2024年のベストプラクティスか？
- Material-UI v6は教材として適切な選択か？
- Biomeの採用は開発効率を向上させているか？

### 2. **教材の質（最重要）**
- 21日間のカリキュラムは段階的で理解しやすいか？
- redmine-cloneと比較して大幅に改善されているか？
- 初心者にも理解できる内容になっているか？
- 実践的なスキルが身につく内容か？
- 各日の学習目標は明確で達成可能か？

### 3. **コード品質**
- TypeScriptの型定義は適切で厳密か？
- App Routerの実装は最新のベストプラクティスに従っているか？
- エラーハンドリングは適切か？
- コードの可読性と保守性は高いか？
- セキュリティ考慮は十分か？

### 4. **実装の完成度**
- 認証システムは安全で実用的か？
- tRPCルーターの設計は適切か？
- redmine-cloneの全機能が実装されているか？
- パフォーマンスは十分か？
- UI/UXは直感的で使いやすいか？

### 5. **改善提案**
- 追加すべき機能はあるか？
- 教材として不足している内容はあるか？
- パフォーマンス最適化の余地はあるか？
- より良いUXのための提案はあるか？
- アーキテクチャの改善点はあるか？

---

## 🔗 関連リソース

### プロジェクトファイル
- **メインリポジトリ**: `/Users/kosuke.isogai/develop/asdf/intern/task/task-app/`
- **参考教材**: `/Users/kosuke.isogai/develop/asdf/intern/task/redmine-clone/`
- **教材フォルダ**: `/Users/kosuke.isogai/develop/asdf/intern/task/task-app/material/`

### 重要設定ファイル
- **package.json**: 依存関係とスクリプト
- **next.config.mjs**: Next.js 15設定
- **biome.json**: リンター/フォーマッター設定
- **prisma/schema.prisma**: データベーススキーマ
- **.github/copilot-instructions.md**: GitHub Copilot設定

### 教材ファイル
- **メインカリキュラム**: `material/00_NEW_21_DAY_PLAN.md`
- **技術ガイド**: `material/TECH_STACK_GUIDE.md`
- **初心者ガイド**: `material/BEGINNER_GUIDE_NEXTJS.md`
- **スライド**: `material/slides/` 配下

---

## 📌 絶対に守るべきルール

### ❌ **変更禁止項目**
1. **Node.jsバージョン**: 既存バージョンを維持
2. **パッケージマネージャー**: npm使用（pnpm禁止）
3. **Next.js実装方式**: App Router使用（Pages Router禁止）
4. **教材配置場所**: `./material/`フォルダ（他の場所禁止）
5. **開発ツール**: Biome使用（ESLint/Prettier禁止）

### ✅ **必須遵守項目**
1. **機能完全性**: redmine-cloneの機能100%カバー
2. **教材品質**: redmine-cloneより大幅に充実
3. **型安全性**: TypeScript strict mode完全対応
4. **テスト品質**: カバレッジ80%以上
5. **実用性**: プロダクションレベルの品質

### 🎯 **成功の定義**
1. **技術的成功**: 実際に使えるタスク管理アプリケーション
2. **教育的成功**: 21日間で現代的Web開発スキル習得
3. **品質の成功**: エンタープライズレベルのコード品質
4. **実践的成功**: 就職・転職に活用可能なポートフォリオ

---

## 🚀 **継続作業の指示**

このプロンプトを受け取ったAIエージェントは、以下の順序で作業を進めてください：

1. **現状把握** (30分)
   - プロジェクト構造の確認
   - 実装済み機能の動作確認
   - 未実装機能のリストアップ

2. **redmine-clone分析** (60分)
   - redmine-cloneの全機能調査
   - 未実装機能の特定
   - バグ・改善点の洗い出し

3. **優先度付け** (15分)
   - 機能実装の優先順位決定
   - 教材作成の段階的計画
   - リソース配分の最適化

4. **実装開始** (継続)
   - 最高優先度から順次実装
   - 各機能完成後のテスト実行
   - 教材への反映

**重要：** 疑問や不明点があれば、遠慮なく質問してください。このプロジェクトの成功が最優先です。

---

**📋 このプロンプトの最終更新日: 2025年9月29日**
**👨‍💻 元の作業者: kosuke.isogai**
**🎯 プロジェクト目標: 現代的Web開発学習の決定版教材作成**
