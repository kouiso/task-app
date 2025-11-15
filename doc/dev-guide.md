# 開発ガイド

## コマンド

### 開発

- `npm run dev` - 開発サーバー起動
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバー起動

### コード品質

- `npm run lint` - Biome リント実行
- `npm run lint:fix` - リント問題を自動修正
- `npm run format` - コードフォーマット
- `npm run type-check` - TypeScript 型チェック
- `npm run lint:ci` - CI 用リント実行

### データベース

- `npm run db:generate` - Prisma クライアント生成
- `npm run db:push` - スキーマを DB に反映
- `npm run db:migrate` - マイグレーション実行
- `npm run db:studio` - Prisma Studio 起動 (DB GUI)
- `npm run db:seed` - シードデータ投入

### テスト

- `npm test` - ユニットテスト実行
- `npm run test:ui` - テスト UI で実行
- `npm run test:e2e` - E2E テスト実行
- `npm run test:e2e:ui` - E2E テスト UI で実行
- `npm run test:e2e:headed` - ブラウザ表示で E2E テスト実行

### Vercel デプロイ

- `npm run vercel:setup` - Vercel の自動セットアップ
- `npm run vercel:env` - Vercel 環境変数を取得
- `npm run vercel:seed` - Vercel DB にシード投入

## プロジェクト構成

```
task-app/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/      # 認証グループ
│   │   ├── api/         # API Routes
│   │   ├── dashboard/   # ダッシュボード
│   │   ├── project/     # プロジェクト
│   │   └── task/        # タスク
│   ├── components/      # React コンポーネント
│   ├── server/          # サーバーサイド
│   │   ├── api/        # tRPC ルーター
│   │   ├── auth.ts     # NextAuth 設定
│   │   └── db.ts       # Prisma 設定
│   ├── lib/            # ユーティリティ
│   ├── types/          # 型定義
│   └── hooks/          # カスタムフック
├── prisma/
│   ├── schema.prisma   # データベーススキーマ
│   └── seed.ts         # シードデータ
└── docker/             # Docker 設定
```

## コーディング規約

### ファイル・ディレクトリ

- コンポーネントファイルは PascalCase で命名
- ユーティリティファイルは camelCase で命名
- ディレクトリは kebab-case で命名

### TypeScript

- `as` による型アサーションは必要最小限に留める
- 明示的な型定義を推奨
- strictモードを使用

### React

- 関数コンポーネントを使用
- Server Components と Client Components を適切に使い分け
- カスタムフックを活用してロジックを分離

### tRPC

- API の型安全性を維持
- `input` に Zod スキーマを使用
- エラーハンドリングを適切に行う

## データベース

### Prisma Studio

```bash
npm run db:studio
```

- ブラウザでデータベースの内容を確認・編集可能
- `http://localhost:5555` でアクセス

### マイグレーション

```bash
# 開発環境
npm run db:push

# 本番環境
npm run db:migrate
```

### スキーマ更新手順

1. `prisma/schema.prisma` を編集
2. `npm run db:generate` でクライアント生成
3. `npm run db:push` で DB に反映
4. 必要に応じて `npm run db:seed` でデータ再投入

## デバッグ

### Next.js デバッガー

VS Code で以下の設定を使用:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Next.js: debug server-side",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev"],
  "port": 9229,
  "console": "integratedTerminal"
}
```

### tRPC デバッグ

- React Query Devtools を使用してクエリ状態を確認
- 開発環境では自動で有効化

## パフォーマンス

### ビルド最適化

- 不要な依存関係を削除
- 動的インポートを活用
- 画像は Next.js Image コンポーネントを使用

### バンドルサイズ確認

```bash
npm run build
# .next/analyze/ でバンドルサイズを確認
```

## トラブルシューティング

### ビルドエラー

1. キャッシュをクリア

   ```bash
   rm -rf .next
   npm run build
   ```

2. 依存関係を再インストール
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Prisma エラー

```bash
# Prismaクライアントを再生成
npm run db:generate

# データベースをリセット
docker-compose down -v
docker-compose up -d
npm run db:push
npm run db:seed
```

### テストエラー

- `npm run test:ui` で詳細を確認
- テストデータベースの状態を確認

## Git フック

Husky を使用して以下のフックを実行:

- **pre-commit**: リント・フォーマット自動実行
- **commit-msg**: コミットメッセージ検証

## CI/CD

GitHub Actions でテスト・ビルドを自動実行

- プルリクエスト作成時
- main ブランチへのプッシュ時
