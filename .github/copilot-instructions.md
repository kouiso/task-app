# Task-App教材開発プロジェクト - GitHub Copilot Instructions

## 📝 プロジェクト概要

このプロジェクトは、プログラミング教材として設計されたタスク管理アプリケーションです。redmine-cloneプロジェクト（Flask/Python）の機能を、最新のTypeScript/Next.js技術スタックで再実装し、より充実した教材コンテンツを提供することが目標です。

## 🎯 重要な指示

### 最優先事項
1. **redmine-cloneの機能完全再現** - バグがあれば修正した上で実装
2. **教材の大幅改善** - redmine-cloneより詳細で実践的な内容に
3. **実用レベルの品質** - サンプルではなく実際に使えるアプリケーション
4. **教材は`./material/`フォルダに配置** - これは絶対に守ること

### 技術スタック（変更禁止）
- **Next.js 15** (App Router必須、Pages Router禁止)
- **TypeScript 5.6** (型安全性を最大限活用)
- **tRPC v11** (End-to-End型安全API)
- **Material-UI v6** (UIコンポーネント)
- **Prisma v6** (ORM)
- **NextAuth.js v5** (認証)
- **Biome** (リンター/フォーマッター、ESLint/Prettier禁止)
- **npm** (pnpm禁止)

## 🏗️ アーキテクチャ

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── dashboard/         # ダッシュボード
│   ├── projects/          # プロジェクト管理
│   ├── tasks/             # タスク管理
│   └── api/               # APIルート
├── components/            # 再利用可能UIコンポーネント
├── server/                # サーバーサイドロジック
│   ├── api/               # tRPCルーター
│   ├── auth.ts            # NextAuth設定
│   └── db.ts              # Prismaクライアント
└── lib/                   # ユーティリティ関数
```

## 📚 教材構造

```
material/
├── 00_NEW_21_DAY_PLAN.md              # 21日間学習カリキュラム
├── slides/                            # Marpスライド
│   ├── day01_setup.md
│   ├── day02_components.md
│   └── ...
├── docs/                              # 詳細ドキュメント
├── BEGINNER_GUIDE_NEXTJS.md          # 初心者ガイド
├── TECH_STACK_GUIDE.md               # 技術スタック解説
├── FAQ_MODERN_WEB.md                 # よくある質問
└── TROUBLESHOOTING_NEXTJS.md         # トラブルシューティング
```

## 🔧 実装必須機能

### 基本機能（redmine-clone完全互換）
- [ ] ユーザー認証（メール/パスワード）
- [ ] プロジェクト管理（CRUD）
- [ ] タスク管理（CRUD、ステータス管理）
- [ ] ユーザー管理（権限設定）
- [ ] ダッシュボード（統計、最近のアクティビティ）

### 追加機能（教材として）
- [ ] コメント機能（リアルタイム）
- [ ] 通知システム
- [ ] 検索・フィルター（全文検索）
- [ ] ファイル添付
- [ ] レポート・統計（グラフ表示）
- [ ] API レート制限
- [ ] データエクスポート

## 💻 コーディング規約

### TypeScript
```typescript
// ✅ Good: 厳密な型定義
interface TaskCreateInput {
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  dueDate?: Date;
}

// ❌ Bad: any型の使用
const data: any = {};
```

### tRPC ルーター
```typescript
// ✅ Good: 適切なバリデーション
export const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 実装
    }),
});
```

### React Components
```typescript
// ✅ Good: 型安全なコンポーネント
interface TaskCardProps {
  task: Task;
  onUpdate: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate }) => {
  // Material-UIを使用した実装
};
```

## 🧪 テスト戦略

### 必須テスト
- **単体テスト**: Vitest（カバレッジ80%以上）
- **統合テスト**: tRPC APIテスト
- **E2Eテスト**: Playwright（主要フロー）
- **認証テスト**: NextAuth.js全フロー

### テスト例
```typescript
// API テスト例
describe('Task API', () => {
  it('should create task with valid input', async () => {
    const result = await caller.task.create({
      title: 'Test Task',
      projectId: 'uuid',
    });
    expect(result.title).toBe('Test Task');
  });
});
```

## 🎨 UI/UX ガイドライン

### Material-UI使用
```typescript
// ✅ Good: 一貫したテーマ使用
const theme = createTheme({
  palette: {
    mode: 'light', // ダークモード対応
    primary: {
      main: '#1976d2',
    },
  },
});
```

### レスポンシブ対応
```typescript
// ✅ Good: モバイルファースト
<Box sx={{
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  gap: 2,
}}>
```

## 📖 教材作成ガイドライン

### Marpスライド
```markdown
---
marp: true
theme: default
---

# Day 1: Next.js 15 セットアップ

## 今日の目標
- Next.js 15プロジェクトの作成
- 基本的なページ構造の理解
- 開発環境の構築

---

## 実習: プロジェクト作成

\`\`\`bash
npx create-next-app@latest task-app
cd task-app
npm run dev
\`\`\`
```

### ドキュメント
- **段階的説明**: 初心者でも理解できるよう丁寧に
- **実践的コード例**: 実際に動作するコード
- **トラブルシューティング**: よくあるエラーと解決法
- **演習問題**: 理解度チェック

## 🚀 デプロイ要件

### Vercel設定
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;
```

### 環境変数
```bash
# .env.example
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

## 🔍 コードレビューチェックリスト

### 必須チェック項目
- [ ] TypeScript型エラーなし
- [ ] Biomeリンターエラーなし
- [ ] テストが通る
- [ ] セキュリティベストプラクティス遵守
- [ ] パフォーマンス最適化済み
- [ ] アクセシビリティ対応
- [ ] モバイル対応確認

### 教材関連
- [ ] `./material/`フォルダに配置
- [ ] 段階的な説明
- [ ] 実践的なコード例
- [ ] エラーハンドリング説明

## 🎯 成功指標

### 技術的品質
- TypeScript strict mode エラーゼロ
- テストカバレッジ80%以上
- Lighthouse スコア90以上
- セキュリティ脆弱性ゼロ

### 教材品質
- 21日間完走率80%以上
- 学習者フィードバック4.5/5以上
- 実際に動作するアプリケーション完成
- 転職・就職に活用可能なポートフォリオレベル

---

**このプロジェクトは単なるサンプルアプリではなく、実用レベルの品質と充実した教材内容を両立させた、現代的なWeb開発学習の決定版を目指しています。**
