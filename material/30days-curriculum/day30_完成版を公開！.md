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
    A[第1週: Day 01-04\n環境構築・初回デプロイ]
    B[第2週: Day 05-08\n認証 UI・JWT・サイドバー]
    C[第3週: Day 09-12\nプロジェクト CRUD・メンバー追加]
    D[第4週: Day 13-16\nタスク CRUD・作業時間記録]
    E[第5週: Day 17-22\nマイタスク・検索・統計・グラフ]
    F[第6週: Day 23-30\nレポート・管理・詳細・デプロイ]
    A --> B --> C --> D --> E --> F
```

この図は思い出の一覧ではありません。今日のデプロイが成立する理由は、各週の成果物がそのまま本番の部品になるからです。第1週で GitHub と Vercel をつないだので、今日は `git push` するだけでビルドが始まります。第2週で作った JWT の署名鍵は、本番でも同じ役割を持つ環境変数として登録します。第3週から第5週で書いた画面と API は、接続先の DB を差し替えるだけで本番でも同じコードのまま動きます。今日新しく足すのは公開先の設定だけで、アプリのコードには一行も手を入れません。

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| 環境変数を Vercel に設定 | 独自サーバー構築 |
| ローカル開発用 DB を Docker で確認 | AWS/GCP のセットアップ |
| Vercel にデプロイ | ドメイン購入 |
| 本番動作確認 | 負荷テスト |

> **ローカル DB と本番 DB の違い**:
> Docker の PostgreSQL はローカル開発専用です。
> 本番では Neon や Supabase（PostgreSQL をクラウド上で提供してくれるサービス。読み方: ニオン、スーパベース）などの
> マネージド DB を、Vercel の Marketplace 連携から追加します。連携すると本番 DB の接続文字列が
> `DATABASE_URL` として Vercel に自動で設定されます。

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
| Step 2.5 | セキュリティヘッダーを設定する | 6分 |
| Step 3 | Git の公開準備 | 3分 |
| Step 4 | Vercel を設定してプッシュ | 10分 |
| Step 5 | 本番環境の動作確認 | 7分 |
| Step 6 | 30日間の学習サマリー | 7分 |
| Step 7 | 技術スタックの振り返り | 5分 |
| Step 8 | 次のステップとリソース | 5分 |

**合計時間**: 約53分です。

この時間はコードを読んで理解する目安です。写経して打ち込む時間、詰まって調べる時間は別に見てください。

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
>
> 本番用の `DATABASE_URL` は、クラウド DB
> サービスで用意します。Vercel なら、管理画面で
> 対象プロジェクトを開きます。Storage タブから
> Postgres データベースを作成すると、接続文字列が
> 発行されます。この文字列は環境変数にも自動で
> 追加されます。Supabase など外部サービスで作る
> 場合は、発行された接続文字列をこの `DATABASE_URL`
> に設定します。Day 04 の初回デプロイ時に設定済み
> なら、その接続文字列をそのまま使います。
>
> 環境変数は、まず公開先の Production に登録します。
> ブランチの Preview デプロイも使う場合は、Preview
> にも同じ値を登録してください。DB を共有したくない
> 場合は、Preview 専用の接続先を用意します。

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

# 本番URL（完成版の robots.txt 生成で使います。このカリキュラムでは robots.txt を作らないため、空のままで構いません）
# NEXT_PUBLIC_BASE_URL="https://your-app.vercel.app"
```

**確認ポイント**:
- `.env.example` の主要変数を確認できた
- `DATABASE_URL` の構造を理解した

> `.env.example` にはローカル開発用の設定が
> 書かれています。`25532` は教材用 DB の
> ホスト側ポートです。すでに使われている場合は、
> `_DOCKER_COMPOSE_HOST_PORT_DB` と `DATABASE_URL` の
> ポート番号を同じ値に変更します。
>
> 本番では `.env` ファイルは使いません。
> Vercel のダッシュボードで環境変数を
> 直接設定します。コードに秘密値を
> 含めないのがセキュリティの基本です。
>
> **ローカルで `npm run build` を実行する前の準備**:
> このプロジェクトは `prisma.config.ts` と
> `package.json` の `build` / `vercel-build` /
> `postinstall` で Prisma Client 生成を行うため、
> ローカルでも `DATABASE_URL` と `JWT_SECRET` が
> 未設定だと build 時に失敗します。
>
> この2つは Day 01 のセットアップで `.env` に
> 用意済みです。中身が残っているかだけ確かめてから
> `npm run build` を実行してください。

```bash
# filepath: ターミナル
cat .env
```

`.env` は `.gitignore` の `.env*` に当てはまるので、ここへ書いた値は `git add` しても追跡対象になりません。中身の検証を担当するのは `src/lib/env.ts` の zod スキーマで、`DATABASE_URL` には URL の形を、`JWT_SECRET` には32文字以上を求めます。どちらかを満たさないと例外が投げられ、`npm run build` はページを1枚も出力せずに止まります。この検証は Vercel のビルドでも同じものが走ります。Vercel 側の環境変数に `DATABASE_URL` と `JWT_SECRET` を入れ忘れると、同じエラーでビルドが止まります。手元で一度通しておけば、公開直前の本番ビルドログで初めてこのエラーを読む展開にはなりません。

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

`ports` の `25532:5432` は、パソコン側の 25532 番をコンテナの中の PostgreSQL の 5432 番につなぐ指定です。`.env` の `DATABASE_URL` に書いたポート番号がこれとずれていると、DB は動いているのに接続だけが拒否されます。`healthcheck` は `pg_isready` を5秒ごとに実行し、問い合わせを受け付けられる状態になって初めて healthy と表示します。起動してすぐ `npm run db:push` が失敗する原因は、healthy と出る前にコマンドを打ったことです。`volumes` はデータの保存先をコンテナの外へ逃がす指定で、これが無いとコンテナを作り直すたびに登録済みのユーザーが消えます。

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
> 一般的です。ただし、この30日教材では migration
> 履歴を作る手順を扱っていないため、Step 4 で
> **新しく作った教材用の本番 DB に限り**
> `prisma db push` を1回実行します。既存データがある
> 実務の DB では、この手順をそのまま使わないでください。

---

### Step 2.5: セキュリティヘッダーを設定する（6分）

**ゴール**: 公開したアプリが、ブラウザに守り方を伝えられるようにします。

ここまでのアプリには、セキュリティヘッダーが1つも入っていません。ヘッダーとは、ページ本体とは別にサーバーがブラウザへ渡す短い指示書のことです。これが無いと、たとえば他人のサイトが自分のアプリを見えない枠として埋め込み、その上に偽のボタンを重ねる、といった手口を止められません。公開する前にここを埋めます。

`next.config.ts` を開き、`const nextConfig` の中へ `headers` を追加します。

```typescript
// filepath: next.config.ts
// nextConfig の中に追加
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
```

`source: '/(.*)'` は「すべてのURL」という意味で、アプリ全体に同じ指示を配ります。`X-Frame-Options: DENY` は、他人のページの中へ自分のアプリを枠として埋め込むことを禁じます。`X-Content-Type-Options: nosniff` は、ブラウザがファイルの中身を見て種類を勝手に決め直すのをやめさせます。`Referrer-Policy` は、外部サイトへ移るときに、どのページから来たかを細かく渡しすぎないようにします。

続けて、通信と権限に関する3つを足します。

```typescript
// filepath: next.config.ts（headers の配列に追加）
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
```

`Strict-Transport-Security` は「次からは必ず暗号化した通信で来てください」という指示です。`max-age` は覚えておく秒数で、63072000 は2年ぶんにあたります。`Permissions-Policy` はカメラ・マイク・位置情報と、閲覧履歴から興味を推定する `browsing-topics` を一切使わないと宣言するものです。このアプリはどれも使わないので、閉じておけば万一の乗っ取りでも悪用されません。`X-DNS-Prefetch-Control` は、リンク先の住所をあらかじめ引いておく動きを止めます。ここでいう住所引きは DNS（ドメイン名から通信先の番号を調べる仕組み）のことです。

**確認ポイント**:
- `next.config.ts` に `async headers()` を追加した
- `npm run build` がエラーなく終わる
- 公開後にブラウザの開発者ツールの Network タブでページを選ぶと、応答ヘッダーに `X-Frame-Options` が見える

> 完成版のリポジトリには、これに加えて `Content-Security-Policy` も入っています。読み込んでよい場所を種類ごとに列挙する指示で、効き目は大きいぶん、書き方を誤ると自分のアプリの画像やスクリプトまで止まります。まずは上の6つを入れて、動く状態を保ったまま公開してください。

---

### Step 3: Git の公開準備（3分）

**ゴール**: 30日間の変更を漏れなく
コミットし、公開直前の状態にします。

```bash
# filepath: ターミナル
# まず変更ファイルを確認
git status
```

公開の前に `git status` を読むのは、載せてはいけないファイルをここで最後に一度だけ止められるからです。とくに `.env.local` が混ざったまま GitHub へ上がると、`JWT_SECRET` を誰でも読める状態になります。この鍵さえ手に入れば、他人でも有効なセッション Cookie を自分で作れます。Day 08 で組んだログイン確認は、正しい署名として素通りさせてしまいます。一度 push した秘密鍵は、あとからファイルを消しても履歴の中に残り続けます。だからこの1手だけは飛ばさないでください。

**確認ポイント**:
- `.env` ファイルが含まれていない
- `.gitignore` で秘密情報が除外されている

```bash
# filepath: ターミナル
# Day 04〜29 で変更したアプリ用の場所を明示する
git add src prisma package.json package-lock.json
git add .env.example docker-compose.yml
git add next.config.ts tsconfig.json components.json biome.json

# コミット対象と未ステージ差分を必ず確認する
git diff --cached --name-only
git status --short
```

一覧に `.env` や `.env.local` が無く、
Day 04〜29 の `src` と `prisma` が含まれることを
確認してからコミットします。

```bash
# filepath: ターミナル
git commit -m "feat: 30日間の完成版"
```

**確認ポイント**:
- `.env` と `.env.local` が含まれていない
- Day 29 の `src/server/api/routers/user.ts` も含まれる
- `git status --short` の未追跡・未ステージを確認した

---

### Step 4: Vercel を設定してプッシュする（10分）

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

この5段のうち、自分の手で動かすのは左端の `git push` だけです。残りは Vercel が自動で進めます。ここで押さえておきたいのは、環境変数を読む時点が `prisma generate` と `next build` だという点です。ビルドが始まったあとに Vercel の画面へ変数を足しても、走っている最中のビルドはその値を知りません。だから順番は「環境変数を登録してから push」になります。逆にしてしまったときは、Deployments タブから同じコミットを Redeploy すれば、新しい値でビルドし直せます。

#### 前提条件

Day 04 で Vercel 連携済みの場合は、
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

Preview デプロイも使う場合は、同じ2変数を Preview
にも追加します。Production だけを公開する場合は、
まず Production の設定と動作確認を完了させます。

2つの変数が何を左右するのかを、間違えたときの見え方で押さえておきます。`DATABASE_URL` は、どの PostgreSQL に読み書きするかを決めます。URL の形になっていなければ、Step 1 で見た `src/lib/env.ts` の検証がビルドの途中で例外を投げます。Vercel のビルドはそこで失敗し、その回のデプロイは公開されません。公開 URL には前回のデプロイがそのまま残るので、画面は 500 にならず、気付く場所はビルドログです。形は正しいのに空の DB を指していた場合は、検証を通るのでデプロイまで進みます。画面も出ますが、新規登録を押した瞬間にテーブルが無いというエラーが返ります。`JWT_SECRET` は、ログイン Cookie の署名と検証に使う鍵です。この値は Production と Preview で別々にしてください。環境ごとに玄関が別にあるイメージです。練習用の玄関に合わせて作った鍵で、本物の玄関が開いてはいけません。両方に同じ値を入れると、Preview のデプロイが発行した Cookie を Production がそのまま受け入れます。Preview は動作確認用の環境で、気軽に作り直します。そこから本番の入口を通せる状態は避けます。

Preview を開いたときにログイン画面へ戻されるのは、鍵が違うからではありません。Vercel は Production と Preview に別のホスト名を割り当てます。Day 07 で設定したログイン Cookie には `domain` を指定していないため、Cookie は発行したホスト名にだけ送られます。Production で取った Cookie は Preview のホスト名には届かないので、Preview では改めてログインすれば使えます。鍵をそろえても、この動きは変わりません。

環境変数を先に設定できたら、現在のブランチを
GitHub へプッシュします。Day 03 と同じく、
ブランチ名を固定しません。

```bash
# filepath: ターミナル
git push origin "$(git branch --show-current)"
```

この push で始まった Vercel デプロイが
`Ready` になるまで待ってください。

**確認ポイント**:
- 現在のブランチの push が成功した
- GitHub に Day 04〜29 の変更が反映された
- 環境変数の設定後に始まったデプロイが `Ready` になった

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

#### 本番 DB に Prisma スキーマを反映する

デプロイが `Ready` でも、本番 DB が空のままだと
登録やログインなど、DB を使う操作は失敗します。
Vercel CLI で現在のフォルダを既存プロジェクトへ
紐づけ、本番環境変数を一時的にコマンドへ渡して
スキーマを反映します。

```bash
# filepath: ターミナル
# 初回だけ、画面の案内に従って既存 Vercel プロジェクトを選ぶ
npx vercel link

# Production の接続情報を一時ファイルへ取り出し、教材用の新規 DB へ反映する
npx vercel env pull .env.production.local --environment=production

# 括弧の中だけで読み込んでから実行する
(
  set -a
  . ./.env.production.local
  set +a
  npx prisma db push
)

# 接続情報を手元に残さないよう、終わったら消す
rm .env.production.local
```

**確認ポイント**:
- `npx vercel link` で Day 04 から使っているプロジェクトを選んだ
- `.env.production.local` を最後に削除した
- `prisma db push` に `Your database is now in sync` と表示された
- データ損失の警告が出た場合は続行せず、接続先が新規 DB か確認した

> `vercel env pull` は Vercel の環境変数をファイルへ取り出します。
> `set -a` は「このあと読み込む値をコマンドへ渡す」という指定、
> `. ./.env.production.local` はそのファイルを読み込む書き方です。
> `set +a` で元に戻します。
> ここで `( )` を使うのは、括弧の中が別のシェルとして動くからです。
> `set +a` は自動で渡す指定を解除するだけで、読み込んだ
> `DATABASE_URL` の値そのものは消えません。括弧なしで実行すると、
> そのあと同じターミナルで打った Prisma やシードのコマンドが
> 本番 DB を見に行ってしまいます。括弧で囲めば、読み込んだ値は
> 括弧を抜けた時点で消えます。
> 取り出したファイルには本番の接続情報が入っているので、
> 使い終わったら必ず `rm` で消します。
>
> 実務では migration ファイルを Git で管理し、
> CI/CD から `prisma migrate deploy` を実行します。
> この教材を拡張してスキーマを変更するときは、
> Prisma Migrate の導入を次の学習課題にしてください。

---

### Step 5: 本番環境の動作確認（7分）

**ゴール**: 公開された URL で
全機能が動作することを確認します。

```bash
# filepath: ターミナル
# デプロイURLをブラウザで開く（macOS）
open https://your-app-name.vercel.app
```

この `open` は自分のパソコンのブラウザを開くだけなので、「インターネット越しに届いている」ことまでは確かめてくれません。手元では開発サーバーもまだ動いていて、見た目は `localhost` のときとほとんど変わらないので見分けが付きにくいところです。外から届いているかを確かめる一番早い方法は、Wi-Fi を切ってモバイル回線にしたスマートフォンで同じ URL を開くことです。自分の家の回線を1つも通らない端末で画面が出たなら、そのアプリはもう自分のパソコンに依存していません。ここで初めて、人に URL を渡せる状態になります。

**確認ポイント**:
- ブラウザでデプロイ URL が開けた
- ログインページが表示される

【スクリーンショット】本番環境のログイン画面の表示を確認してください。

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

【スクリーンショット】完成版のダッシュボード画面の表示を確認してください。

![完成版のダッシュボード画面](./screenshots/dashboard.png)

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

`git log --oneline` は1コミットを1行で出すので、`wc -l` に渡すとそのまま件数になります。数そのものより、Day 03 で最初のコミットを打ってから今日まで履歴が途切れていないことのほうが大事です。下の `find` が数えているのは `page.tsx` というファイル名だけです。App Router では `page.tsx` を置いたフォルダの位置がそのまま URL になるので、この件数は公開したアプリの画面数とほぼ一致します。数字が思ったより少なければ、フォルダを作っただけで `page.tsx` を置いていない場所が残っています。

**確認ポイント**:
- コミット数が 30 以上あれば毎日コミットできた証拠
- ページ数が 12 以上あれば充実したアプリ

#### 週ごとの学習内容

| 週 | Day | 学んだこと |
|----|-----|----------|
| 第1週 | 1-4 | 環境構築・初回デプロイ |
| 第2週 | 5-8 | 認証 UI・JWT・サイドバー |
| 第3週 | 9-12 | プロジェクト CRUD・メンバー追加 |
| 第4週 | 13-16 | タスク CRUD・ステータス・作業時間記録 |
| 第5週 | 17-22 | マイタスク・検索・統計・グラフ |
| 第6週 | 23-30 | レポート・管理・詳細・デプロイ |

> 30日間で、教材スターターから機能を段階的に足して、
> 17ページ以上のアプリを構築しました。
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

`npm ls` が表示するのは、`package.json` に書いた希望のバージョンではなく、`node_modules` へ実際に入った番号です。この番号を覚えておく価値は、公式ドキュメントを読むときに出てきます。Next.js は 14 系と 15 系で書き方の変わった箇所があります。手元が 15 系だと知らないまま古い記事のコードを写すと、そのままでは動きません。`UNMET DEPENDENCY` と表示された場合は、必要なパッケージが入っていない状態です。`npm install` をやり直してから、もう一度本番のビルドを確認してください。

**確認ポイント**:
- 各パッケージのバージョンが表示された
- 各技術の役割を説明できる

#### フロントエンド技術

> Next.js 以外はインストールした時点の最新版が入るため、末尾の数字は手元と少し違うことがあります。

| 技術 | バージョン | 役割 |
|------|----------|------|
| Next.js | 15.5.21 | フレームワーク（App Router） |
| React | 18.3.1 | UI ライブラリ |
| TypeScript | 5.x | 型安全な JavaScript |
| shadcn/ui | — | UI コンポーネント |
| Tailwind CSS | v4 | ユーティリティ CSS |
| Recharts | 3.x | グラフ・チャート |

#### バックエンド技術

| 技術 | バージョン | 役割 |
|------|----------|------|
| tRPC | 11.x | End-to-End 型安全 API |
| Prisma | 6.x | ORM（DB 操作） |
| PostgreSQL | 16 | データベース |
| jose | — | JWT トークン生成・検証 |
| bcryptjs | — | パスワードハッシュ化 |

#### 開発ツール

| 技術 | バージョン | 役割 |
|------|----------|------|
| Biome | 2.x | リンター・フォーマッター |
| Vitest | 3.x | テストフレームワーク |
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

`find` で集めた `.ts` と `.tsx` を `xargs` が `wc -l` へまとめて渡し、最後の `tail -1` がファイルごとの内訳を捨てて合計行だけを残します。この数字は成績ではありません。30日前は1行も書けなかったものが、いま本番の URL で動いている、という事実の目印として見てください。次に何を作るか迷ったときは、この合計のうち自分の言葉で説明できる範囲がどこまでかを見直すほうが役に立ちます。説明できない場所が残っているなら、そこが次に読み返す場所です。

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

### Pro パターンで書こう（振り返り画面を例に、Server Component を標準にする）

この画面は説明のための例で、完成版には含まれません。

静的な表示部分を Server Component にまとめると、JS バンドルサイズを小さくでき、初期表示も速くなります。
なぜ直前の1文の書き方をするのか、**Before/After** で見比べてみましょう。

#### Before（改善前のコード）

```typescript
// filepath: 読み比べ用サンプル（実ファイルには対応しません）
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

ここまでで目を留めてほしいのは、1行目の `'use client'` がファイル全体にかかっている点です。この宣言は行や関数ではなく、ファイル単位で効きます。だから下に続く振り返りカードも、動きを持たない見出しも、まとめてブラウザ側へ送られます。

```typescript
// filepath: 読み比べ用サンプル（続き・実ファイルには対応しません）
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
// filepath: 読み比べ用サンプル（続き・実ファイルには対応しません）
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

ここまでがサーバー側に残る部分です。`'use client'` が消え、`useState` の取り込みも無くなりました。カードを並べる `.map()` は Before とまったく同じままです。動かしたのはボタン1個だけで、置き換えた `<ShareGraduationButton />` の中身は次のブロックで別ファイルとして作ります。

```typescript
// filepath: 読み比べ用サンプル（続き・実ファイルには対応しません）
  );
}

// filepath: 読み比べ用サンプル（続き・実ファイルには対応しません）
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

`'use client'` は、この小さなボタンのファイルだけに付きました。コピー済みかどうかを覚える `useState` も、ここに閉じ込められています。親のページは静的なまま配信されるので、ブラウザが受け取る JavaScript はこのボタン1個分で済みます。表示だけの部分にまで JavaScript を送らなくなるぶん、公開したページは最初の表示が速くなります。

```typescript
// filepath: 読み比べ用サンプル（続き・実ファイルには対応しません）
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

## 完成コード全体

今日コードを書き足したファイルは1つだけです。Step 1 と Step 3 から Step 8 で打ったのはターミナルのコマンドで、環境変数の登録は Vercel の画面での作業でした。`.env.example` と `docker-compose.yml` は中身を読んで確かめただけなので、書き換えていません。だから完成状態を並べる対象は Step 2.5 の `next.config.ts` に絞られます。ヘッダーの入れ子が深く、どの階層へ貼るか迷いやすい場所なので、以下のコードで手元と見比べてください。

| ファイル | 役割 | 対応する Step |
|---------|------|--------------|
| `next.config.ts` | ブラウザへ渡すセキュリティヘッダーの設定 | Step 2.5 |

### `next.config.ts`

このファイルは丸ごと置き換えません。もとから書かれている設定はそのまま残し、`const nextConfig` の中へ以下の `headers` を足した状態が完成形です。

**ヘッダー設定の開始部分**:

```typescript
// filepath: next.config.ts
// 完成版: ヘッダー設定の開始部分
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options',
            value: 'nosniff' },
          { key: 'Referrer-Policy',
            value: 'origin-when-cross-origin' },
```

入れ子が3段になっている理由は、この形が「どのURLに、どのヘッダーを配るか」の組を何通りでも書けるようにしてあるからです。いちばん外の配列が組の一覧、その中の `source` が対象のURL、内側の `headers` が配る中身です。今回は組が1つしかないので冗長に見えますが、あとから管理画面だけ別の指示を配りたくなったときに、2つ目の組を並べるだけで済みます。`async` が付いているのは、Next.js がこの関数の結果を待つ前提で呼び出すためです。外すとビルド時に読み取ってもらえません。

**通信と権限のヘッダーと閉じかっこ**:

```typescript
// filepath: next.config.ts（同じファイルの続き）
// 完成版: 通信と権限のヘッダーと閉じかっこ
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ];
  },
```

前半の3つと違って、こちらは1つずつ改行して書いています。`value` が長いので1行に収めると読みにくく、`npm run fix` を実行しても Biome がこの形に整えます。閉じかっこが `]`、`}`、`]`、`}` の順に4段ぶん並ぶので、貼り付けたあとは `const nextConfig` の閉じかっこが1つ余っていないかを確かめてください。ここが合っていないと、`npm run build` は設定を読む前に構文エラーで止まります。最後の `,` は、この `headers` のうしろに別の設定が並んでも壊れないようにするためのものです。

`Content-Security-Policy` はここに入っていません。Step 2.5 で触れたとおり、書き方を誤ると自分のアプリの画像やスクリプトまで止まるので、公開を先に成立させるほうを取っています。上の6つで動く状態を確かめてから、次の課題として足してください。

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
| 1 | 環境構築 | `npm run dev` でアプリを起動できる | Day 01 |
| 2 | UI基礎 | ダッシュボードにメッセージを追加できる | Day 02 |
| 3 | Git | コミット・プッシュができる | Day 03 |
| 4 | デプロイ基礎 | ネットに公開できる | Day 04 |
| 5 | 認証UI | ログイン・登録画面を作れる | Day 05-06 |
| 6 | 認証機能 | JWT + Cookie の仕組みを説明できる | Day 07-08 |
| 7 | API | tRPC でサーバー・クライアント通信ができる | Day 09-10 |
| 8 | CRUD | プロジェクト・タスクの作成・編集・削除ができる | Day 11-16 |
| 9 | 機能拡張 | マイタスク・コメント・検索を実装できる | Day 17-20 |
| 10 | レポート | 統計・グラフ・週次レポートを表示できる | Day 21-23 |
| 11 | 管理機能 | ユーザー一覧・プロフィール編集ができる | Day 24-25 |
| 12 | 品質管理 | エラーページ・デバッグができる | Day 26 |
| 13 | 詳細・一括 | プロジェクト詳細・タスク一括操作ができる | Day 27-28 |
| 14 | 仕上げ | ユーザー詳細・編集・本番デプロイができる | Day 29-30 |

### あなたの成長

30日前のあなたは `npm` が何かも分からない状態でした。今のあなたは、フルスタック Web アプリの仕組みを読み解き、機能を実装して世界に公開できます。

この 30 日間で身につけた知識と経験は、あなたのエンジニアキャリアの確かな土台になります。

### 次のステップ

技術スタックの詳細は Step 7、次に挑戦できることの
一覧は Step 8 を参照してください。
学び続けること、作り続けることが大切です。

次のプロジェクトでも、ここで学んだスキルを
活かして、さらに成長していってください。

**Happy Coding**

---

## 次に読むもの

- 前の日: [Day 29](./day29_ユーザー詳細・編集ページを作ろう.md)
- 全体の地図: [学びのロードマップ](./00-1_学びのロードマップ.md)
- 目次: [カリキュラム目次](./00_カリキュラム目次.md)
- 詰まったとき: [トラブルシューティング](./appendix_トラブルシューティング.md)
- 言葉の意味: [用語集](./appendix_用語集.md)
