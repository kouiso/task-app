# Day 30: 完成版を公開

## 前回の振り返り

Day 29 では**ユーザー詳細・編集ページ**を実装しました。管理者がユーザー情報を閲覧・編集できる画面を作り、権限チェックやフォームバリデーションも組み込みました。

今日はいよいよ最終日。完成したアプリをインターネットに公開して、30日間の集大成を形にします。

---

## 今日のゴール

完成したタスク管理アプリを Vercel へデプロイし、
インターネットに公開します。30日間の学習を
振り返り、次のステップを考えます。

## なぜこれをやるのか

自分のパソコンでしか動かないアプリは
まだ「作品」ではありません。公開して初めて
世界中の人に使ってもらえるプロダクトになります。

> **例え話**: デプロイは「料理をお店に並べる」ことです。30日間かけて腕を磨き、レシピを覚え、食材を選びました。
>
> ようやく完成した一皿をテーブルに出す瞬間が一番の醍醐味です。

### 30日間の歩み

```mermaid
flowchart TD
    A[第1週: Day 1-4\n環境構築・初回デプロイ]
    B[第2週: Day 5-10\n認証・プロジェクト管理]
    C[第3週: Day 11-16\nタスク CRUD・タイマー]
    D[第4週: Day 17-20\n検索・マイタスク]
    E[第5週: Day 21-24\n統計・グラフ・管理]
    F[第6週: Day 25-30\n仕上げ・デプロイ]
    A --> B --> C --> D --> E --> F
```

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| 環境変数を Vercel に設定 | 独自サーバー構築 |
| ローカル開発用 DB を Docker で確認 | AWS/GCP のセットアップ |
| Vercel にデプロイ | ドメイン購入 |
| 本番動作確認 | 負荷テスト |

> **ローカル DB と本番 DB の違い**:
> Docker の PostgreSQL はローカル開発専用です。
> 本番では Vercel Postgres や Supabase などの
> マネージド DB を使います。Vercel に設定する
> `DATABASE_URL` は本番 DB の接続文字列です。

### 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| Vercel | ヴァーセル | ホスティングサービス | レンタルキッチン |
| 環境変数 | かんきょうへんすう | 設定情報の外部管理 | 店の裏の金庫 |
| CI/CD | シーアイシーディー | 自動ビルド・デプロイ | 自動配送システム |
| Production | プロダクション | 本番環境 | 実店舗の営業 |

## 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | 本番用の環境変数を準備 | 5分 |
| Step 2 | 本番前のローカル最終確認 | 5分 |
| Step 3 | Git にプッシュ | 3分 |
| Step 4 | Vercel にデプロイ | 7分 |
| Step 5 | 本番環境の動作確認 | 7分 |
| Step 6 | 30日間の学習サマリー | 7分 |
| Step 7 | 技術スタックの振り返り | 5分 |
| Step 8 | 次のステップとリソース | 5分 |

**合計時間**: 約44分。

---

### Step 1: 本番用の環境変数を準備（5分）

**ゴール**: Vercel にデプロイするための
環境変数を準備します。

**必要な環境変数**

| 変数名 | 値の例 | 用途 |
|--------|--------|------|
| DATABASE_URL | `postgresql://user:pass@host:5432/db` | DB 接続（本番用） |
| JWT_SECRET | 32文字以上のランダムな秘密鍵 | JWT の HMAC 署名鍵 |

> `NODE_ENV` は Vercel が自動で
> `production` に設定するため、
> 手動設定は不要です。

> 本番用の `DATABASE_URL` は、クラウド DB
> サービスで用意します。Vercel なら、管理画面で
> 対象プロジェクトを開きます。Storage タブから
> Postgres データベースを作成すると、接続文字列が
> 発行されます。この文字列は環境変数にも自動で
> 追加されます。Supabase など外部サービスで作る
> 場合は、発行された接続文字列をこの `DATABASE_URL`
> に設定します。Day 4 の初回デプロイ時に設定済み
> なら、その接続文字列をそのまま使います。
>
> 環境変数を Vercel に登録するときは、Production
> だけでなく Preview にも同じ値を入れておきます。
> ブランチのプレビュー用ビルドでも同じ変数が要る
> ため、Production だけだとプレビュー側のビルドが
> 失敗します。

**シークレットキーの生成**:

```bash
# filepath: ターミナル
# ランダムなシークレットキーを生成
openssl rand -base64 32
# 出力例: K7x3mP9q...（これをコピー）
```

**確認ポイント**:
- 44文字程度のランダム文字列が表示された
- コピーして安全な場所にメモした

> `JWT_SECRET` は JWT トークンの
> HMAC 署名に使う秘密鍵です。
> `openssl rand -base64 32` は32バイト
> （Base64で44文字）の鍵を生成します。

次に、**.env.example の主要変数**（ローカル参考）を確認します。

```bash
# filepath: .env.example（主要部分の抜粋）
# ホスト側のポート設定
_DOCKER_COMPOSE_HOST_PORT_DB=25532

# DB接続文字列（ローカル開発用）
DATABASE_URL="postgresql://user:password@localhost:25532/taskapp?schema=public"

# JWT署名用の秘密鍵（32文字以上必須。本番では必ず変更）
JWT_SECRET="your-jwt-secret-key-32-chars-minimum-please-change"

# 本番URL（robots.txt / sitemap で使用。ローカル開発では空でOK）
# NEXT_PUBLIC_BASE_URL="https://your-app.vercel.app"
```

**確認ポイント**:
- `.env.example` の主要変数を確認できた
- `DATABASE_URL` の構造を理解した

> `.env.example` にはローカル開発用の設定が
> 書かれています。`25532` は教材用 DB の
> ホスト側ポートです。既に使われている場合は、
> `_DOCKER_COMPOSE_HOST_PORT_DB` と `DATABASE_URL` の
> ポート番号を同じ値に変更します。

> 本番では `.env` ファイルは使いません。
> Vercel のダッシュボードで環境変数を
> 直接設定します。コードに秘密値を
> 含めないのがセキュリティの基本です。

> **ローカルで `npm run build` を実行する前の準備**:
> このプロジェクトは `prisma.config.ts` と
> `package.json` の `build` / `vercel-build` /
> `postinstall` で Prisma Client 生成を行うため、
> ローカルでも `DATABASE_URL` と `JWT_SECRET` が
> 未設定だと build 時に失敗します。
>
> 先に `.env.example` をコピーして
> `.env.local` を作成し、最低でも
> `DATABASE_URL` と `JWT_SECRET` を設定してから
> `npm run build` を実行してください。

```bash
# filepath: ターミナル
cp .env.example .env.local

# .env.local を開き、最低でも DATABASE_URL と JWT_SECRET を設定する
```

**確認ポイント**:
- 2つの環境変数の値を準備できた

---

### Step 2: 本番前のローカル最終確認（5分）

**ゴール**: 本番デプロイ前に、ローカルで
アプリが正常に動くことを最終確認します。
docker-compose.yml の構成も把握しましょう。

次に、**docker-compose.yml の db サービス部分**を抜粋して確認します。

> 実際のファイルにはテスト用 DB も定義されていますが、
> ここではメイン DB サービスだけを確認します。

```yaml
# filepath: docker-compose.yml
services:
  db:
    image: postgres:16-alpine  # 軽量版PostgreSQL
    environment:
      POSTGRES_USER: user       # DBユーザー名
      POSTGRES_PASSWORD: password  # DBパスワード
      POSTGRES_DB: taskapp      # データベース名
    ports:
      - "${_DOCKER_COMPOSE_HOST_PORT_DB:-25532}:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 5s
      retries: 5
```

**確認ポイント**:
- YAML のインデントがスペース2個で統一されている
- `ports` や `volumes` の値が1行で書かれている

#### docker-compose の主要設定

| 設定 | 値 | 意味 |
|------|-----|------|
| image | postgres:16-alpine | 軽量版 PostgreSQL 16 |
| POSTGRES_USER | user | DB ユーザー名 |
| POSTGRES_PASSWORD | password | DB パスワード |
| POSTGRES_DB | taskapp | データベース名 |
| ports | 25532:5432 | ホストからの接続ポート |

**DB の起動**:

```bash
# filepath: ターミナル
# データベースを起動
docker compose up -d db

# 起動確認
docker compose ps

# マイグレーション実行
npm run db:push
```

**確認ポイント**:
- `docker compose ps` で db が Running (healthy)
- `npm run db:push` が成功した

確認メモ: `docker compose ps` の `db` 行で
`running (healthy)` と `25532->5432/tcp` が見えればOKです。
> `npm run db:push` はローカル確認用です。
> 本番では `prisma migrate deploy` を使うのが
> 一般的です。Vercel のビルド時に
> `prisma generate` が自動実行されます。

---

### Step 3: Git にプッシュ（3分）

**ゴール**: 最新のコードを GitHub に
プッシュします。

```bash
# filepath: ターミナル
# まず変更ファイルを確認
git status
```

**確認ポイント**:
- `.env` ファイルが含まれていない
- `.gitignore` で秘密情報が除外されている

```bash
# filepath: ターミナル
# 変更したファイルだけを明示してステージングしてプッシュ
# 例: Day 29 で編集したファイルを個別指定する
git add src/app/user/[id]/page.tsx src/app/user/[id]/user-detail-client.tsx
git add src/app/user/[id]/edit/page.tsx src/app/user/[id]/edit/user-edit-client.tsx
git commit -m "feat: 30日間の完成版"
git push origin main
```

**確認ポイント**:
- `git push` が成功した
- GitHub のリポジトリで最新コミットが見える

---

### Step 4: Vercel にデプロイ（7分）

**ゴール**: Vercel にアプリを
デプロイして公開します。

#### デプロイの流れ

```mermaid
flowchart TD
    A[git push] --> B[GitHub リポジトリ]
    B --> C[Vercel が自動検知]
    C --> D[prisma generate]
    D --> E[next build]
    E --> F[デプロイ完了]
    F --> G[公開 URL 発行]
```

#### 前提条件

Day 4 で Vercel 連携済みの場合は、
既存プロジェクトを開いてください。
未連携の場合は以下の手順で準備します。

| 準備 | 手順 |
|------|------|
| Vercel アカウント | [vercel.com](https://vercel.com) で GitHub 登録 |
| プロジェクト Import | 「Add New → Project」→ リポジトリ選択 |

**Vercel で環境変数を設定**:

1. Vercel ダッシュボードにログイン
2. プロジェクトの Settings → Environment Variables
3. 以下を追加する

| 変数名 | 値 | 環境 |
|--------|-----|------|
| DATABASE_URL | 本番DBの接続文字列 | Production |
| JWT_SECRET | Step 1 で生成した値 | Production |

**確認ポイント**:
- 2つの環境変数を Vercel に追加できた
- 各変数の「Environment」が Production になっている

> Vercel は GitHub と連携しているため
> `git push` するだけで自動的にビルドと
> デプロイが実行されます。これが CI/CD です。

**ビルドスクリプトの確認**:

package.json の `scripts` を確認しましょう。

| スクリプト名 | コマンド | 用途 |
|-------------|---------|------|
| `build` | `prisma generate && next build` | 通常ビルド |
| `vercel-build` | `prisma generate && next build` | Vercel 用ビルド |

> Vercel では `vercel-build` が優先的に
> 実行されます。`prisma generate` で
> Prisma Client を生成してから
> `next build` を実行します。

**確認ポイント**:
- ビルドスクリプトの内容を理解できた
- Vercel のビルドログでエラーがない
- デプロイ URL が発行された

確認メモ:
Vercel ダッシュボードの「Deployments」タブで
最新デプロイが `Ready` になっていればOKです。

---

### Step 5: 本番環境の動作確認（7分）

**ゴール**: 公開された URL で
全機能が動作することを確認します。

```bash
# filepath: ターミナル
# デプロイURLをブラウザで開く（macOS）
open https://your-app-name.vercel.app
```

**確認ポイント**:
- ブラウザでデプロイ URL が開けた
- ログインページが表示される

【スクリーンショット】本番環境のログイン画面。

![本番環境のログイン画面](./screenshots/login.png)
#### 本番環境チェックリスト

| 機能 | 確認内容 | 結果 |
|------|---------|------|
| ユーザー登録 | `/register` で登録できる | ☐ |
| ログイン | `/login` で認証が通る | ☐ |
| ダッシュボード | `/dashboard` が表示される | ☐ |
| プロジェクト | `/project` で作成・一覧表示 | ☐ |
| タスク | `/task` で作成・ステータス変更 | ☐ |
| レポート | `/report` で統計確認 | ☐ |
| 検索 | `/search` でキーワード検索 | ☐ |
| プロフィール | `/profile` で情報更新 | ☐ |

**確認手順**:

1. デプロイ URL にアクセス
2. `/register` で新規ユーザー作成
3. `/login` でログイン
4. `/dashboard` でダッシュボード確認
5. `/project` でプロジェクト作成
6. `/task` でタスク作成
7. `/report` で統計確認
8. ログアウト → 再ログイン

> ブラウザの DevTools を開き、
> Console にエラーが出ていないことも
> 確認しましょう。Network タブで
> API レスポンスが 200 であることも
> チェックします。

【スクリーンショット】本番環境のダッシュボード画面。

![本番環境のダッシュボード画面](./screenshots/dashboard.png)
---

### Step 6: 30日間の学習サマリー（7分）

**ゴール**: 30日間で身につけたスキルを
振り返ります。

```bash
# filepath: ターミナル
# これまでのコミット数を確認
git log --oneline | wc -l
# 作成したページ数を確認
find src/app -name "page.tsx" | wc -l
```

**確認ポイント**:
- コミット数が 30 以上あれば毎日コミットできた証拠
- ページ数が 12 以上あれば充実したアプリ

#### 週ごとの学習内容

| 週 | Day | 学んだこと |
|----|-----|----------|
| 第1週 | 1-4 | 環境構築・初回デプロイ |
| 第2週 | 5-8 | 認証 UI・JWT・サイドバー |
| 第3週 | 9-12 | プロジェクト CRUD・メンバー追加 |
| 第4週 | 13-16 | タスク CRUD・ステータス・タイマー |
| 第5週 | 17-22 | マイタスク・検索・統計・グラフ |
| 第6週 | 23-30 | レポート・管理・詳細・デプロイ |

> 30日間で17ページ以上のアプリを
> ゼロから構築しました。
> フロントエンドからバックエンド、
> データベース設計からデプロイまで
> 一貫して経験できました。

---

### Step 7: 技術スタックの振り返り（5分）

**ゴール**: このアプリで使った
技術スタックを総復習します。

```bash
# filepath: ターミナル
# 主要パッケージのバージョンを確認
npm ls next react typescript prisma
```

**確認ポイント**:
- 各パッケージのバージョンが表示された
- 各技術の役割を説明できる

#### フロントエンド技術

| 技術 | バージョン | 役割 |
|------|----------|------|
| Next.js | 15.5.15 | フレームワーク（App Router） |
| React | 18.3.1 | UI ライブラリ |
| TypeScript | 5.8.3 | 型安全な JavaScript |
| shadcn/ui | — | UI コンポーネント |
| Tailwind CSS | v4 | ユーティリティ CSS |
| Recharts | 3.2.1 | グラフ・チャート |

#### バックエンド技術

| 技術 | バージョン | 役割 |
|------|----------|------|
| tRPC | 11.8.0 | End-to-End 型安全 API |
| Prisma | 6.19.3 | ORM（DB 操作） |
| PostgreSQL | 16 | データベース |
| jose | — | JWT トークン生成・検証 |
| bcryptjs | — | パスワードハッシュ化 |

#### 開発ツール

| 技術 | バージョン | 役割 |
|------|----------|------|
| Biome | 2.3.15 | リンター・フォーマッター |
| Vitest | 3.0.9 | テストフレームワーク |
| Docker | — | コンテナ（PostgreSQL） |
| Vercel | — | ホスティング・CI/CD |

> この技術スタックは2024-2026年の
> モダン Web 開発で広く使われています。
> ここで学んだ知識は実務でも活かせます。


---

### Step 8: 次のステップとリソース（5分）

**ゴール**: 今後の学習の方向性と
参考リソースを確認します。

```bash
# filepath: ターミナル
# プロジェクトのコード行数を確認
find src \( -name "*.ts" -o -name "*.tsx" \) \
  | xargs wc -l | tail -1
```

**確認ポイント**:
- 自分が書いたコードの総行数を把握できた
- 次の学習目標を決められた

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

> 公式ドキュメントが最も正確で
> 最新の情報源です。困ったときは
> まず公式ドキュメントを読みましょう。

---


---

### Pro パターンで書こう — 完成版の振り返り画面は Server Component を標準にする

ここまでで動くコードは書けました。でもプロの現場では、もう一段上の書き方をします。
なぜ上の書き方をするのか、**Before/After** で見比べてみましょう。

#### Before（動くけど、プロは書かない）

```typescript
// filepath: src/app/graduation/page.tsx
'use client';

import { useState } from 'react';

const CURRICULUM_SUMMARY = [
  { label: '認証', value: 'JWT ログイン' },
  { label: 'プロジェクト', value: 'CRUD + メンバー管理' },
  { label: 'タスク', value: 'CRUD + 一括操作' },
  { label: '公開', value: 'Vercel デプロイ' },
];

export default function GraduationPage() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    await navigator.clipboard.writeText('Task-App 30日間カリキュラムを完走しました');
    setCopied(true);
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-3xl font-bold">Task-App 30日間ハンズオン修了</h1>
      <div className="grid gap-4 md:grid-cols-2">
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

```typescript
// filepath: 続き
        {CURRICULUM_SUMMARY.map((item) => (
          <section key={item.label} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="text-lg font-semibold">{item.value}</p>
          </section>
        ))}
      </div>
      <button type="button" className="rounded-md border px-4 py-2" onClick={handleShare}>
        {copied ? 'コピー済み' : '卒業メッセージをコピー'}
      </button>
    </main>
  );
}
```

**このコードの問題点**:

- ほとんど静的な振り返り画面まで Client Component になり、不要な JavaScript が増える
- `useState` が必要なのはコピーボタンだけなのに、ページ全体がブラウザ実行前提になる
- 最終日の構成確認で「どこが対話部分か」が見えにくくなる

#### After（プロが書くコード）

```typescript
// filepath: src/app/graduation/page.tsx
import { ShareGraduationButton } from './share-graduation-button';

const CURRICULUM_SUMMARY = [
  { label: '認証', value: 'JWT ログイン' },
  { label: 'プロジェクト', value: 'CRUD + メンバー管理' },
  { label: 'タスク', value: 'CRUD + 一括操作' },
  { label: '公開', value: 'Vercel デプロイ' },
];

export default function GraduationPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-3xl font-bold">Task-App 30日間ハンズオン修了</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {CURRICULUM_SUMMARY.map((item) => (
          <section key={item.label} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="text-lg font-semibold">{item.value}</p>
          </section>
        ))}
      </div>
      <ShareGraduationButton text="Task-App 30日間カリキュラムを完走しました" />
    </main>
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

```typescript
// filepath: 続き
  );
}

// filepath: src/app/graduation/share-graduation-button.tsx
'use client';

import { useState } from 'react';

type ShareGraduationButtonProps = {
  text: string;
};

export function ShareGraduationButton({ text }: ShareGraduationButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };

  return (
    <button type="button" className="rounded-md border px-4 py-2" onClick={handleShare}>
      {copied ? 'コピー済み' : '卒業メッセージをコピー'}
    </button>
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

```typescript
// filepath: 続き
  );
}
```

**このコードの強み**:

- 静的な振り返り本文は Server Component のまま配信できる
- ブラウザで状態を持つのはコピーボタンだけになり、責務の境界が見える
- 本番公開前の設計レビューで「client 化が必要な場所」を説明しやすい

#### 覚えておきたいエッセンス

App Router では Server Component を標準にして、
クリック・入力・ブラウザ API が必要な小さな部品だけを Client Component に切り出します。

## 今日のまとめ

- [ ] 環境変数を Vercel に設定した
- [ ] Docker で DB を起動できた
- [ ] Git にプッシュした
- [ ] Vercel にデプロイできた
- [ ] 本番環境で全機能が動作した
- [ ] 30日間の学習を振り返った
- [ ] 技術スタックを総復習した
- [ ] 次のステップを決めた

## つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| ビルドが失敗する | 環境変数が未設定 | Vercel で全変数を追加 |
| DB 接続エラー | DATABASE_URL が不正 | 接続文字列を再確認 |
| JWT エラー | JWT_SECRET が未設定 | openssl で生成して設定 |
| ページが真っ白 | JS エラー | DevTools Console を確認 |

## 今日学んだ用語

| 用語 | 意味 |
|------|------|
| Vercel | Next.js に最適化されたホスティング |
| デプロイ | アプリを本番サーバーに配置する |
| CI/CD | 自動ビルド・自動デプロイの仕組み |
| 環境変数 | アプリの設定を外部から注入する仕組み |
| Production | ユーザーが使う本番環境 |
| マネージド DB | クラウド事業者が運用する DB |

---

## 卒業おめでとうございます

**Task-App 30日間ハンズオンカリキュラム修了**

### 卒業チェックリスト

以下の項目を確認して、30 日間の学びを振り返りましょう。

| # | カテゴリ | できるようになったこと | 学んだ Day |
|---|---------|---------------------|-----------|
| 1 | 環境構築 | `npm run dev` でアプリを起動できる | Day 1 |
| 2 | UI基礎 | ダッシュボードにメッセージを追加できる | Day 2 |
| 3 | Git | コミット・プッシュができる | Day 3 |
| 4 | デプロイ基礎 | ネットに公開できる | Day 4 |
| 5 | 認証UI | ログイン・登録画面を作れる | Day 5-6 |
| 6 | 認証機能 | JWT + Cookie の仕組みを説明できる | Day 7-8 |
| 7 | API | tRPC でサーバー・クライアント通信ができる | Day 9-10 |
| 8 | CRUD | プロジェクト・タスクの作成・編集・削除ができる | Day 11-16 |
| 9 | 機能拡張 | マイタスク・コメント・検索を実装できる | Day 17-20 |
| 10 | レポート | 統計・グラフ・週次レポートを表示できる | Day 21-23 |
| 11 | 管理機能 | ユーザー一覧・プロフィール編集ができる | Day 24-25 |
| 12 | 品質管理 | エラーページ・デバッグができる | Day 26 |
| 13 | 詳細・一括 | プロジェクト詳細・タスク一括操作ができる | Day 27-28 |
| 14 | 仕上げ | ユーザー詳細・編集・本番デプロイができる | Day 29-30 |

### あなたの成長

30日前のあなたは `npm` が何かも分からない状態でした。今のあなたは、フルスタック Web アプリをゼロから構築し、世界に公開できるエンジニアです。

この 30 日間で身につけた知識と経験は、あなたのエンジニアキャリアの確かな土台になります。

### 次のステップ

技術スタックの詳細は Step 7、次に挑戦できることの
一覧は Step 8 を参照してください。
学び続けること、作り続けることが大切です。

次のプロジェクトでも、ここで学んだスキルを
活かして、さらに成長していってください。

**Happy Coding**
