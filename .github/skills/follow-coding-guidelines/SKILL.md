---
name: follow-coding-guidelines
description: TaskAppプロジェクトのコーディング規約とスタイルガイドに従ってコードを記述します。日本語での会話、ファイル命名規則、型安全性の確保、Next.js App Routerの使用などのプロジェクト固有のルールを適用します。
---

# TaskApp コーディング規約スキル

このスキルは、TaskAppプロジェクトで使用するコーディング規約とスタイルガイドを定義します。

## 基本方針

### 必須ルール

1. **常に日本語で会話する**
2. **常に `prompt/prompt.md` に従うこと**
3. **常にプロジェクトの `doc` ディレクトリのドキュメントを前提に作業する**

## プロジェクト概要

### プロジェクト名
**Task-App** - モダンタスク管理アプリケーション教材

### 技術スタック（変更禁止）

#### フロントエンド
- **Next.js 15.0.0** - App Router必須（Pages Router禁止）
- **React 18.3.1** - UIライブラリ
- **TypeScript 5.6.3** - 厳格モード完全対応
- **Material-UI v6.4.8** - UIコンポーネントライブラリ
- **@emotion/react + @emotion/styled** - CSS-in-JS

#### バックエンド
- **tRPC v11.6.0** - End-to-End型安全API
- **Prisma 6.16.2** - TypeScript ORM
- **PostgreSQL** - データベース
- **NextAuth v4.24.11** - 認証システム
- **bcryptjs** - パスワードハッシュ化

#### 開発ツール
- **Biome 1.9.4** - リンター・フォーマッター（ESLint/Prettier禁止）
- **Vitest 3.0.9** - テストフレームワーク
- **Husky + lint-staged** - Git hooks
- **Turbopack** - 高速バンドラー（Next.js内蔵）

## コーディング規約

### ファイル命名規則

- **基本ルール**: 英語単数形のケバブケース
  - ✅ `task-service.ts`, `task-list.tsx`, `user-auth.ts`
  - ❌ `taskService.ts`, `TaskList.tsx`, `users-auth.ts`
- **例外**: 慣習的な大文字ファイル名
  - ✅ `README.md`, `CLAUDE.md`, `LICENSE`
- **Reactコンポーネント**: ケバブケースのファイル名、PascalCaseのコンポーネント名
  - ファイル: `task-list.tsx`
  - コンポーネント: `export function TaskList() { ... }`

### TypeScript型安全性

- **any型の使用を最小限に**: 明確な型定義を使用
- **tRPCでエンドツーエンドの型安全性を確保**: クライアントとサーバー間の型を自動推論
- **strictモード有効**: `tsconfig.json`で厳格な型チェックを適用
- **明確な型定義**: interface または type を使用して型を明示

### Next.js App Router準拠

- **Pages Router禁止**: 必ずApp Routerを使用
- **サーバーコンポーネントをデフォルトに**: `'use client'`は必要な場合のみ使用
- **適切なファイル構造**:
  - `app/` - ルーティング、ページ、レイアウト
  - `components/` - 再利用可能なコンポーネント
  - `server/` - サーバーサイドロジック（tRPC、Auth、DB）

### 禁止事項

#### 基本的なアンチパターン
- グローバル変数の乱用
- any型の過度な使用
- ハードコーディングされた設定値
- 不適切なエラーハンドリング
- 重複コードの放置

#### プロジェクト固有の禁止事項
- **Pages Routerの使用**（必ずApp Routerを使用）
- **ESLintやPrettierの追加**（Biomeを使用）
- **過度な抽象化**（シンプルさを優先）
- **複雑な設計パターン**（初心者が理解できる範囲で）

### コードの品質基準

- **シンプル is BEST**: 高度な設計パターンより、理解しやすいコードを優先
- **可読性**: 変数名・関数名が明確
- **保守性**: DRY原則に従っている
- **セキュリティ**: 環境変数を適切に使用、認証・認可を適切に実装
- **テスタビリティ**: テストしやすい構造

### コメントとドキュメント

- **コメントは日本語で記述**:
  ```typescript
  // ✅ 良い例
  /**
   * タスクを作成する関数
   * @param title タスクのタイトル
   * @param description タスクの説明
   * @returns 作成されたタスクオブジェクト
   */
  export async function createTask(title: string, description: string) {
    // データベースに新しいタスクを保存
    return await prisma.task.create({
      data: { title, description }
    });
  }

  // ❌ 悪い例: コメントが英語
  /**
   * Create a new task
   * @param title Task title
   * @param description Task description
   * @returns Created task object
   */
  export async function createTask(title: string, description: string) {
    // Save new task to database
    return await prisma.task.create({
      data: { title, description }
    });
  }
  ```

- **専門用語の丁寧な説明**: 初出時には必ず平易な言葉で説明
- **例え話の活用**: 日常的で誰でも分かる例えを使用

## コード構造のベストプラクティス

### ファイルサイズ
- 1つのファイルは200行以内を目安
- 1つの関数は30行以内を推奨
- 1つのコンポーネントは150行以内を推奨

### ディレクトリ構造
```
src/
├── app/           # Next.js App Router(ページ・レイアウト)
├── components/    # 再利用可能なReactコンポーネント
├── server/        # サーバーサイドロジック(tRPC, Auth, DB)
├── lib/           # ユーティリティ・設定
├── types/         # TypeScript型定義
└── hooks/         # カスタムフック
```

### Import順序
1. React / Next.js
2. 外部ライブラリ
3. プロジェクト内の絶対パス
4. 相対パス
5. 型定義

## スタイルガイド拡張

### 豆知識モード

**ルール**: ユーザーへの回答終了時に、技術に関する役立つ豆知識を披露すること。

**豆知識の条件**:
- プログラミング、開発、技術に関連する内容
- 初心者〜中級者が興味を持ちやすい内容
- 簡潔でわかりやすい説明（1〜3文程度）
- TaskAppで使用している技術スタック関連が望ましい

**出力形式**:
```markdown
---

💡 **豆知識:** [技術に関する役立つ情報]
```

### Pull Requestのポエム化

**ルール**: Pull Requestの要約作成を依頼された場合、情緒的な「ポエム」形式で出力すること。

**ポエムの条件**:
- 技術的な内容を含みつつ、詩的・文学的な表現を使用
- 変更内容の本質を捉えた比喩や表現
- 開発者の努力や成果を称える要素を含む
- 読みやすく、チーム内で共有しやすい長さ（5〜10行程度）

**出力形式**:
```markdown
## 📝 Pull Request ポエム

[詩的な表現でPRの内容を要約]

---

**技術的要約:**
- [具体的な変更内容1]
- [具体的な変更内容2]
- [具体的な変更内容3]
```

## 言語とコミュニケーション

### 完全日本語化

**すべての出力を日本語で行う**:
- 思考プロセス（内部的な推論や判断）
- コード内のコメント
- PRの文章（タイトル、説明、ポエム）
- エラーメッセージの説明
- 技術的な説明や提案
- ドキュメントの記述

**例外**:
- コード自体（変数名、関数名、クラス名等）は英語を使用
- ライブラリやフレームワークの固有名詞
- コマンドやファイルパス

## 参考資料

- プロジェクトドキュメント: `doc/dev-guide.md`, `doc/onboarding.md`
- 元の指示書: `prompt/prompt.md`
- スタイルガイド: `.gemini/styleguide.md`
- Copilot指示: `.github/copilot-instructions.md`
