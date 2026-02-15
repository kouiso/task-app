# Day 30: 完成版を公開！卒業！

## 🎯 今日のゴール

完成したタスク管理アプリを Vercel にデプロイし
インターネットに公開します。30日間の学習を
振り返り、次のステップを考えます。

【スクリーンショット: Vercel デプロイ成功画面】

## 🤔 なぜこれをやるのか？

自分のパソコンでしか動かないアプリは
まだ「作品」ではありません。公開して初めて
世界中の人に使ってもらえるプロダクトになります。

> 💡 **例え話**: デプロイは「料理を
> お店に並べる」ことです。30日間かけて
> 腕を磨き、レシピを覚え、食材を選び、
> ようやく完成した一皿をテーブルに出します。
> お客さんの反応を見る瞬間が一番の醍醐味です。

### 📐 30日間のジャーニー

```mermaid
graph LR
    subgraph "Week 1: 基礎"
        A[Day 1-4<br/>環境構築<br/>初回デプロイ]
    end

    subgraph "Week 2: 認証・プロジェクト"
        B[Day 5-10<br/>ログイン・登録<br/>プロジェクト管理]
    end

    subgraph "Week 3: タスク管理"
        C[Day 11-16<br/>タスク CRUD<br/>コメント・タイマー]
    end

    subgraph "Week 4: 検索・管理"
        D[Day 17-20<br/>検索・フィルタ<br/>マイタスク]
    end

    subgraph "Week 5: レポート"
        E[Day 21-24<br/>統計・グラフ<br/>ユーザー管理]
    end

    subgraph "Week 6: 仕上げ"
        F[Day 25-30<br/>プロフィール<br/>テスト・デプロイ]
    end

    A --> B --> C --> D --> E --> F
```

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| 環境変数を Vercel に設定 | 独自サーバー構築 |
| Docker で DB を準備 | AWS/GCP のセットアップ |
| Vercel にデプロイ | ドメイン購入 |
| 本番動作確認 | 負荷テスト |

### 🆕 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| Vercel | ヴァーセル | ホスティングサービス | レンタルキッチン |
| 環境変数 | かんきょうへんすう | 設定情報の外部管理 | 店の裏の金庫 |
| CI/CD | シーアイシーディー | 自動ビルド・デプロイ | 自動配送システム |
| Production | プロダクション | 本番環境 | 実店舗の営業 |

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | 本番用の環境変数を準備 | 5分 |
| Step 2 | Docker でデータベース準備 | 5分 |
| Step 3 | Vercel にデプロイ | 10分 |
| Step 4 | 本番環境の動作確認 | 10分 |
| Step 5 | 30日間の学習サマリー | 10分 |
| Step 6 | 技術スタックの振り返り | 5分 |
| Step 7 | 次のステップとリソース | 5分 |

**合計時間**: 約50分

---

### Step 1: 本番用の環境変数を準備（5分）

🎯 **ゴール**: Vercel にデプロイするための
環境変数を準備します。

#### 必要な環境変数

| 変数名 | 値の例 | 用途 |
|--------|--------|------|
| DATABASE_URL | `postgresql://user:pass@host:5432/db` | DB 接続 |
| JWT_SECRET | ランダム32文字以上 | JWT 署名鍵 |
| NEXT_PUBLIC_APP_URL | `https://your-app.vercel.app` | アプリの公開 URL |

💻 **JWT_SECRET の生成**:

```bash
# filepath: ターミナル
# ランダムなシークレットキーを生成
openssl rand -base64 32
# 出力例: K7x3mP9q...（これをコピー）
```

> 💡 `JWT_SECRET` は JWT トークンの署名に
> 使う秘密鍵です。推測されにくい
> ランダムな文字列を生成して使います。

💻 **.env.example の確認**:

```bash
# filepath: .env.example
DATABASE_URL="postgresql://user:password
  @localhost:5432/taskapp?schema=public"
JWT_SECRET="your-jwt-secret-key-32-chars
  -minimum-please-change"
```

> 💡 本番では `.env` ファイルは使いません。
> Vercel のダッシュボードで環境変数を
> 直接設定します。コードに秘密値を
> 含めないのがセキュリティの基本です。

✅ **確認ポイント**:
- 3つの環境変数の値を準備できた

---

### Step 2: Docker でデータベース準備（5分）

🎯 **ゴール**: docker-compose.yml の構成を
理解し、DB を起動します。

💻 **docker-compose.yml の確認**:

```yaml
# filepath: docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    container_name: taskapp-postgres
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: taskapp
    ports:
      - "${_DOCKER_COMPOSE_HOST_PORT_DB
        :-5432}:5432"
    volumes:
      - postgres-data:
        /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL",
        "pg_isready -U user"]
      interval: 5s
      timeout: 5s
      retries: 5
```

#### docker-compose の主要設定

| 設定 | 値 | 意味 |
|------|-----|------|
| image | postgres:16-alpine | 軽量版 PostgreSQL 16 |
| POSTGRES_USER | user | DB ユーザー名 |
| POSTGRES_PASSWORD | password | DB パスワード |
| POSTGRES_DB | taskapp | データベース名 |
| ports | 5432:5432 | ホストからの接続ポート |

💻 **DB の起動**:

```bash
# filepath: ターミナル
# データベースを起動
docker compose up -d db

# 起動確認
docker compose ps

# マイグレーション実行
npm run db:push
```

> 💡 本番環境では Vercel Postgres や
> Supabase などのマネージド DB を
> 使うのが一般的です。ローカル開発では
> Docker の PostgreSQL を使います。

✅ **確認ポイント**:
- `docker compose ps` で db が Running

【スクリーンショット: Docker Desktop の DB 起動確認】

---

### Step 3: Vercel にデプロイ（10分）

🎯 **ゴール**: Vercel にアプリを
デプロイして公開します。

💻 **Git にプッシュ**:

```bash
# filepath: ターミナル
git add .
git commit -m "feat: 30日間の完成版"
git push origin main
```

💻 **Vercel で環境変数を設定**:

1. Vercel ダッシュボードにログイン
2. プロジェクトの Settings を開く
3. Environment Variables をクリック
4. 以下を追加する

| 変数名 | 環境 |
|--------|------|
| DATABASE_URL | Production |
| JWT_SECRET | Production |
| NEXT_PUBLIC_APP_URL | Production |

> 💡 Vercel は GitHub と連携しているため
> `git push` するだけで自動的にビルドと
> デプロイが実行されます。

💻 **ビルドスクリプトの確認**:

```json
// filepath: package.json（該当部分）
{
  "scripts": {
    "build": "prisma generate
      && prisma db push --accept-data-loss
      && next build",
    "vercel-build": "prisma generate
      && next build"
  }
}
```

> 💡 Vercel では `vercel-build` が優先的に
> 実行されます。`prisma generate` で
> Prisma Client を生成してから
> `next build` を実行します。

✅ **確認ポイント**:
- Vercel のビルドログでエラーがない
- デプロイ URL が発行された

【スクリーンショット: Vercel デプロイ進捗画面】

---

### Step 4: 本番環境の動作確認（10分）

🎯 **ゴール**: 公開された URL で
全機能が動作することを確認します。

#### 本番環境チェックリスト

| 機能 | 確認内容 | 結果 |
|------|---------|------|
| ユーザー登録 | 新規登録できる | |
| ログイン | 認証が通る | |
| プロジェクト | 作成・一覧表示 | |
| タスク | 作成・ステータス変更 | |
| レポート | 統計カード・グラフ | |
| 検索 | キーワード検索 | |
| プロフィール | 情報更新 | |
| レスポンシブ | モバイルで表示 | |

💻 **確認手順**:

1. デプロイ URL にアクセス
2. `/register` で新規ユーザー作成
3. `/login` でログイン
4. `/project` でプロジェクト作成
5. `/task` でタスク作成
6. `/report` で統計確認
7. スマートフォンでもアクセス
8. ログアウト → 再ログイン

> 💡 ブラウザの DevTools を開き、
> Console にエラーが出ていないことも
> 確認しましょう。Network タブで
> API レスポンスが 200 であることも
> チェックします。

✅ **確認ポイント**:
- 全機能が本番環境で正常動作する

【スクリーンショット: 本番環境のダッシュボード画面】

---

### Step 5: 30日間の学習サマリー（10分）

🎯 **ゴール**: 30日間で身につけたスキルを
振り返ります。

#### 週ごとの学習内容

| 週 | 期間 | 学習テーマ | 主な成果 |
|---|------|----------|---------|
| 1 | Day 1-4 | 環境構築と基礎 | Docker, Git, 初回デプロイ |
| 2 | Day 5-10 | 認証とプロジェクト | JWT ログイン, CRUD |
| 3 | Day 11-16 | タスク管理 | タスク CRUD, コメント, タイマー |
| 4 | Day 17-20 | 検索と管理 | 検索, フィルタ, マイタスク |
| 5 | Day 21-24 | レポートと管理 | 統計, グラフ, ユーザー管理 |
| 6 | Day 25-30 | 仕上げ | プロフィール, テスト, デプロイ |

#### 作成したページ一覧

| ルート | 機能 |
|--------|------|
| /login | ログイン画面 |
| /register | ユーザー登録画面 |
| /dashboard | ダッシュボード |
| /project | プロジェクト管理 |
| /task | タスク管理 |
| /my-task | マイタスク |
| /report | レポート・統計 |
| /report/weekly | 週次レポート |
| /search | 検索 |
| /user | ユーザー管理（管理者） |
| /profile | プロフィール編集 |

> 💡 30日間で12ページ以上のアプリを
> ゼロから構築しました。
> フロントエンドからバックエンド、
> データベース設計からデプロイまで
> 一貫して経験できました。

✅ **確認ポイント**:
- 自分の成長を実感できた

---

### Step 6: 技術スタックの振り返り（5分）

🎯 **ゴール**: このアプリで使った
技術スタックを総復習します。

#### フロントエンド技術

| 技術 | バージョン | 役割 |
|------|----------|------|
| Next.js | 15.3.6 | フレームワーク（App Router） |
| React | 18.3.1 | UI ライブラリ |
| TypeScript | 5.6.3 | 型安全な JavaScript |
| shadcn/ui | — | UI コンポーネント |
| Tailwind CSS | v4 | ユーティリティ CSS |
| Recharts | 3.2.1 | グラフ・チャート |

#### バックエンド技術

| 技術 | バージョン | 役割 |
|------|----------|------|
| tRPC | 11.6.0 | End-to-End 型安全 API |
| Prisma | 6.16.2 | ORM（DB 操作） |
| PostgreSQL | 16 | データベース |
| jose | — | JWT トークン生成・検証 |
| bcryptjs | — | パスワードハッシュ化 |

#### 開発ツール

| 技術 | バージョン | 役割 |
|------|----------|------|
| Biome | 1.9.4 | リンター・フォーマッター |
| Vitest | 3.0.9 | テストフレームワーク |
| Docker | — | コンテナ（PostgreSQL） |
| Vercel | — | ホスティング・CI/CD |

> 💡 この技術スタックは2024-2025年の
> モダン Web 開発で広く使われています。
> ここで学んだ知識は実務でも活かせます。

✅ **確認ポイント**:
- 各技術の役割を説明できる

---

### Step 7: 次のステップとリソース（5分）

🎯 **ゴール**: 今後の学習の方向性と
参考リソースを確認します。

#### 次に挑戦できること

| カテゴリ | 内容 | 難易度 |
|---------|------|--------|
| 機能追加 | 通知システム | 中 |
| 機能追加 | ファイル添付 | 中 |
| 機能追加 | カレンダービュー | 中〜高 |
| 性能改善 | キャッシュ戦略 | 中 |
| 性能改善 | コード分割の深掘り | 中 |
| 品質向上 | E2E テスト充実 | 中 |
| インフラ | CI/CD パイプライン | 中 |
| 新技術 | WebSocket リアルタイム通信 | 高 |

#### 公式ドキュメント

| 技術 | URL |
|------|-----|
| Next.js | https://nextjs.org/docs |
| tRPC | https://trpc.io/docs |
| Prisma | https://www.prisma.io/docs |
| shadcn/ui | https://ui.shadcn.com |
| Tailwind CSS | https://tailwindcss.com/docs |
| Vitest | https://vitest.dev |
| Biome | https://biomejs.dev |

#### 学習リソース

| リソース | URL |
|---------|-----|
| React 公式 | https://react.dev |
| TypeScript Handbook | https://www.typescriptlang.org/docs |
| MDN Web Docs | https://developer.mozilla.org |

> 💡 公式ドキュメントが最も正確で
> 最新の情報源です。困ったときは
> まず公式ドキュメントを読みましょう。

✅ **確認ポイント**:
- 次の学習目標を決められた

【スクリーンショット: 完成したアプリの全画面】

---

## 📋 今日のまとめ

- [ ] 環境変数を Vercel に設定した
- [ ] Docker で DB を起動できた
- [ ] Vercel にデプロイできた
- [ ] 本番環境で全機能が動作した
- [ ] 30日間の学習を振り返った
- [ ] 技術スタックを総復習した
- [ ] 次のステップを決めた

## ⚠️ つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| ビルドが失敗する | 環境変数が未設定 | Vercel で全変数を追加 |
| DB 接続エラー | DATABASE_URL が不正 | 接続文字列を再確認 |
| JWT エラー | JWT_SECRET が未設定 | openssl で生成して設定 |
| ページが真っ白 | JS エラー | DevTools Console を確認 |

## 📝 今日学んだ用語

| 用語 | 意味 |
|------|------|
| Vercel | Next.js に最適化されたホスティング |
| デプロイ | アプリを本番サーバーに配置する |
| CI/CD | 自動ビルド・自動デプロイの仕組み |
| 環境変数 | アプリの設定を外部から注入する仕組み |
| Production | ユーザーが使う本番環境 |
| マネージド DB | クラウド事業者が運用する DB |

---

## 🎓 卒業おめでとうございます！

**Task-App 30日間ハンズオンカリキュラム修了**

30日間で身につけたスキル:

- Next.js 15 によるモダン Web 開発
- TypeScript による型安全な開発
- tRPC による End-to-End 型安全 API
- Prisma によるデータベース設計・操作
- shadcn/ui + Tailwind CSS による UI 開発
- カスタム JWT 認証（jose + bcrypt）
- Biome による品質管理
- Vitest によるテスト自動化
- Vercel による本番デプロイ

30日間、一歩ずつ積み重ねてきた知識と経験は
あなたのエンジニアキャリアの土台になります。
学び続けること、作り続けることが大切です。
次のプロジェクトでも、ここで学んだスキルを
活かして、さらに成長していってください。

**Happy Coding!**
