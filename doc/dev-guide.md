# 開発ガイド

## コマンド

### Taskfile コマンド

このプロジェクトでは [Task](https://taskfile.dev/) を使用してよく使うコマンドを管理しています。

```bash
task                    # 利用可能なコマンド一覧を表示
task -l                 # コマンド一覧（詳細版）
```

#### 環境管理

- `task init` - 環境初期化（何度でも実行可能 - 環境を壊してしまった場合、本コマンドの再実行で修復可能）
- `task clean` - 自動生成されたファイル・フォルダを削除
- `task npmi` - npm ci コマンドをコンテナで実行

#### 開発・起動

- `task up-backend` - バックエンドサーバーを起動

#### データベース

- `task db-apply` - Prismaスキーマからコード生成&状態をDBに反映
- `task seed` - DBリセット・シードデータ投入
- `task gen-db-schema` - SchemaSpy で DB スキーマを生成

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

### データベース操作

開発環境では Task コマンドを使用:

```bash
# Prismaスキーマから状態をDBに反映
task db-apply

# DBリセット・シードデータ投入
task seed
```

### スキーマ更新手順

1. `prisma/schema.prisma` を編集
2. `task db-apply` で DB に反映とクライアント生成を実行

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
   task clean
   task npmi
   ```

### データベースエラー / 環境が壊れた場合

環境を再初期化してください（何度でも実行可能）:

```bash
task init
```

このコマンドは以下を自動的に実行します:
- クリーンアップ
- Docker コンテナの再構築
- 依存関係の再インストール
- データベースのリセットとシード投入

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
