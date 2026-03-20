# Day 20: Vercel デプロイ・本番環境構築

## 🎯 今日の学習目標

| 学習目標 | 実務での活用場面 | 習得レベル |
|---------|---------------|----------|
| **Vercel デプロイ** | アプリを本番環境へ | ✅ git push で自動デプロイ |
| **環境変数管理** | DB接続、API キー | ✅ .env.local vs .env.production |
| **本番 DB 接続** | PostgreSQL(Vercel Postgres) | ✅ Prisma でマイグレーション実行 |

## 💼 なぜこれを学ぶのか?

**開発環境と本番環境は別物**。localhost では動いても、本番環境でバグが発生することはよくあります。正しい設定が重要。

- **Vercel**: Next.js 開発元による最適化ホスティング
- **環境変数**: 本番 DB、API キーを安全に管理
- **自動デプロイ**: git push で自動的に本番環境へ反映

## 📊 実装ステップ一覧

| パート | 内容 | ステップ数 | 所要時間 |
|--------|------|-----------|----------|
| **Part 1** | Vercel プロジェクト設定 | 2ステップ | 20分 |
| **Part 2** | 環境変数・本番 DB 接続 | 2ステップ | 20分 |
| **Part 3** | 本番環境テスト・デプロイ | 1ステップ | 20分 |
| **合計** | - | **5ステップ** | **約60分** |

---

## 実装内容

### Part 1: Vercel プロジェクト設定(20分)

#### Step 1.1: Vercel へのログインとプロジェクト作成(所要時間:10分)

**このステップで学ぶこと**: Vercel にアカウント作成・プロジェクト連携。

**なぜ必要?**: Vercel で git リポジトリを監視→自動デプロイ。

**コードの仕組み解説**:

```bash
# Vercel CLI インストール
npm install -g vercel

# Vercel にログイン(初回のみ)
vercel login
# → ブラウザで認証→トークン自動保存

# プロジェクトを Vercel に接続(リポジトリのルート)
cd /path/to/task-app
vercel link
# 以下のように質問される:
# ? Set up and deploy "~/task-app"? [Y/n] → Y
# ? Which scope do you want to deploy to? → 自分のアカウント選択
# ? Link to existing project? [y/N] → N(新規作成)
# ? What's your project's name? → task-app
# ? In which directory is your code? [./] → ./
# ? Want to modify these settings? [y/N] → N

# ローカルに .vercel/project.json が生成される
ls -la .vercel/
# project.json の中身例:
# {
#   "projectId": "prj_xxxxxxxxxxxxx",
#   "orgId": "team_xxxxxxxxxxxxx"
# }
```

---

#### Step 1.2: GitHub との連携設定(所要時間:10分)

**このステップで学ぶこと**: git push で自動デプロイ。

**なぜ必要?**: git push → GitHub → Vercel が自動実行。

**コードの仕組み解説**:

```bash
# 方法1: GitHub リポジトリを Vercel にリンク(推奨)
# 1. https://vercel.com/dashboard へアクセス
# 2. 右上 "Add New..." → "Project"
# 3. GitHub リポジトリ選択(task-app)
# 4. "Import" をクリック
# → 自動的に GitHub と Vercel が連携

# 方法2: CLI で連携(既にプロジェクト作成済みの場合)
vercel link
# → GitHub アカウントと連携設定

# git push 時の自動デプロイ確認
git push origin main
# → GitHub → Vercel が自動デプロイ開始
# → Vercel ダッシュボードに "Deployment in Progress" 表示

# デプロイ状況確認
vercel logs
# または
# https://vercel.com/dashboard/task-app → "Deployments" タブ
```

**Vercel の自動デプロイ設定**:

```
【Git → Vercel フロー】
1. git push origin main
   ↓
2. GitHub が push を検出
   ↓
3. Vercel に webhook 通知
   ↓
4. Vercel が自動的に build & deploy
   ↓
5. https://task-app-xxxxx.vercel.app に新バージョン反映
   ↓
6. メール・Slack で通知
```

---

### Part 2: 環境変数・本番 DB 接続(20分)

#### Step 2.1: Vercel での環境変数設定(所要時間:10分)

**このステップで学ぶこと**: 本番環境の機密情報を安全に設定。

**なぜ必要?**: DB のパスワード、API キーをコードに含めると漏洩。

**コードの仕組み解説**:

```bash
# 開発環境の環境変数(.env.local)
cat .env.local
# DATABASE_URL=postgresql://user:password@localhost:5432/taskapp
# JWT_SECRET=your-jwt-secret-key-32-chars-minimum-please-change

# 本番環境には絶対に .env.local を使わない!
# Vercel ダッシュボードで設定:
# 1. https://vercel.com/dashboard/[project-name]
# 2. Settings → Environment Variables
# 3. 各環境変数を入力:
#    DATABASE_URL = "postgresql://user:password@prod-db:5432/taskapp"
#    JWT_SECRET = "secure-random-key-for-production-32chars-min"
#    NODE_ENV = "production"
```

**Vercel での環境変数設定画面**:

```bash
# CLI で直接設定(オプション)
vercel env add DATABASE_URL
# → "prod-db接続文字列" を入力

vercel env add JWT_SECRET
# → "本番用シークレットキー（32文字以上）" を入力

# 設定確認
vercel env list
# DATABASE_URL (Encrypted)
# JWT_SECRET (Encrypted)
```

---

#### Step 2.2: Vercel Postgres でデータベース作成(所要時間:10分)

**このステップで学ぶこと**: Vercel の PostgreSQL を使用。

**なぜ必要?**: Vercel と同じプロバイダで一元管理→低遅延。

**コードの仕組み解説**:

```bash
# Vercel Postgres 作成
# 1. https://vercel.com/dashboard → Storage → "Create Database"
# 2. "Postgres" を選択
# 3. Database name: "task-app-db"
# 4. Region: "ap-northeast-1(Tokyo)" ← 日本選択
# 5. "Create" → 自動的に DATABASE_URL 設定

# CLI で自動連携
vercel link
# → Vercel Postgres を自動設定オプション提示

# 接続確認
psql $(vercel env get DATABASE_URL)
# select version();
# → PostgreSQL バージョン表示 ✅ OK
```

**Database URL 形式**:
```
postgresql://default:password@ep-xxxxx.us-east-1.postgres.vercel-storage.com:5432/verceldb
```

**Prisma migration for Production**:

```bash
# 本番環境へマイグレーション実行
# 方法1: Vercel 側で自動実行(推奨)
# → next build 時に自動的に Prisma migrate が実行

# 方法2: 手動実行(トラブル時)
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# マイグレーション履歴確認
npx prisma migrate status --skip-generate
# Migrations found in prisma/migrations
# Following migrations have been applied to the database:
# 20231201_initial
# 20231205_add_comments
# 20231210_add_activity_log
```

---

### Part 3: 本番環境テスト・デプロイ(20分)

#### Step 3.1: ローカルで本番ビルドテスト(所要時間:10分)

**このステップで学ぶこと**: デプロイ前にローカルで本番環境をシミュレート。

**なぜ必要?**: 本番環境でだけバグが出たら困る。事前テストが重要。

**コードの仕組み解説**:

```bash
# 本番環境用ビルド実行
npm run build
# ▲ Next.js 15.0.0
# ▓ Creating an optimized production build
# ✓ Compiled successfully
# ✓ Collected static assets
# ✓ Server (Edge): 245 modules
# ✓ App Client (Edge): 178 modules
# → .next/ に最適化ビルド生成

# 本番環境をローカルで起動
npm run start
# > next start
# ▲ Next.js 15.0.0
# - Local: http://localhost:3000
#   - environments: production
#
# ✓ Ready in 1.2s

# http://localhost:3000 にアクセス(本番同様)
# - ログイン機能確認
# - タスク作成・編集・削除
# - コメント機能
# - ファイルアップロード
# - 全機能が正常に動作するか確認
```

**パフォーマンス測定**:

```bash
# Lighthouse スコア確認(Chrome DevTools)
# 1. http://localhost:3000 を開く
# 2. F12 → Lighthouse タブ
# 3. "Analyze page load" クリック
#
# 目標:
# - Performance: 90 以上
# - Accessibility: 90 以上
# - Best Practices: 90 以上
# - SEO: 90 以上
```

---

#### Step 3.2: 本番環境へデプロイ実行(所要時間:10分)

**このステップで学ぶこと**: git push で本番反映。

**なぜ必要?**: 実際のユーザーが使える環境へ。

**コードの仕組み解説**:

```bash
# デプロイ準備
git status
# On branch main
# nothing to commit, working tree clean

# 本番へ deploy
git push origin main
# → GitHub に push

# Vercel が自動検出・デプロイ開始
# Vercel ダッシュボード確認:
# https://vercel.com/dashboard/task-app → Deployments

# デプロイ状態確認
vercel --prod
# ✓ Vercel CLI 15.0.0
# ✓ Connected to ~/task-app
# ✓ Uploaded [11 files]
# ✓ Vercel URL: https://task-app-xxxxx.vercel.app [in clipboard]
# ✓ Production URL: https://task-app.vercel.app [in clipboard]

# 本番環境へアクセス
# https://task-app.vercel.app
# → ログイン・タスク操作・全機能確認 ✅
```

**デプロイ後のトラブルシューティング**:

```bash
# ❌ 503 Service Unavailable
# → 環境変数が不足している可能性
# → Vercel: Settings → Environment Variables を再確認

# ❌ DATABASE_URL connection refused
# → Vercel Postgres が起動していない可能性
# → Vercel: Storage → Postgres の状態確認

# ❌ JWT_SECRET not found
# → JWT_SECRET 環境変数が設定されていない（32文字以上必須）
# → Vercel: Settings → Environment Variables で確認・追加

# デプロイログ確認
vercel logs https://task-app.vercel.app
# Server Error: ECONNREFUSED
# → 環境変数・DB接続を確認
```

**本番環境デプロイ完了チェックリスト**:

```
✅ デプロイ要件チェック
  - [ ] ローカルビルドが成功(npm run build)
  - [ ] 本番ビルド実行確認(npm run start)
  - [ ] 環境変数が Vercel に設定済み
  - [ ] Database URL が有効
  - [ ] Prisma migration が本番 DB に適用済み

✅ 本番環境テストチェック
  - [ ] https://task-app.vercel.app に接続
  - [ ] ログイン・ログアウト正常
  - [ ] タスク作成・編集・削除正常
  - [ ] コメント機能正常
  - [ ] ファイルアップロード正常
  - [ ] リアルタイム通知正常

✅ パフォーマンスチェック
  - [ ] Lighthouse 総合スコア 90 以上
  - [ ] 初回読み込み時間 < 3秒
  - [ ] API レスポンス時間 < 500ms
```

---

## ✅ 今日の成果

以下の内容を実装できたことを確認:

1. **Vercel デプロイ**
   - [ ] Vercel CLI で task-app を登録
   - [ ] GitHub リポジトリと連携
   - [ ] git push で自動デプロイ設定完了

2. **環境変数・本番 DB**
   - [ ] Vercel 環境変数設定(DATABASE_URL など)
   - [ ] Vercel Postgres 作成・接続
   - [ ] Prisma migrate を本番 DB へ実行

3. **本番環境テスト**
   - [ ] npm run build で最適化ビルド生成
   - [ ] npm run start で本番環境シミュレート
   - [ ] https://task-app.vercel.app へアクセス可能

---

## まとめ

- **Vercel**: Next.js 開発元のホスティング(最適化)
- **自動デプロイ**: git push → GitHub → Vercel(ワンステップ)
- **環境変数**: .env.local(開発)と Vercel(本番)を分離
- **Vercel Postgres**: Vercel と統合した PostgreSQL
- **Prisma migrate**: 本番 DB へ自動スキーマ更新
- **Lighthouse**: 本番環境のパフォーマンス測定

次回(Day 21)は 全21日の最終復習・まとめです。
