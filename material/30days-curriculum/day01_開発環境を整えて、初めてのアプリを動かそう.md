# Day 01: 開発環境を整えて、初めてのアプリを動かそう

このカリキュラムでは、30日かけて自分専用のタスク管理アプリを作ります。今日はその1日目です。30日間の全体像（どの日に何ができるようになるか）は [学びのロードマップ](./00-1_学びのロードマップ.md) にまとめてあるので、始める前に一度眺めておくと現在地を見失いません。

今回は、空のディレクトリから自分の手で開発環境を立ち上げ、ブラウザに最初の画面を表示するところまで進めます。ここまで動けば、これからのアプリ開発の土台が整います。

今日のゴールは、タスク管理ツール Linear を参考にした、整った見た目の画面を1枚目として用意することです。

## この日でできるようになること

- 空のディレクトリから `task-app` の土台を起動して、`http://localhost:3000` に最初の画面を表示できるようになる
- 配色やフォントなどの見た目の設定（design token）を整えて、自分のアプリらしい画面まで仕上げられるようになる

完成イメージの雰囲気は、
【スクリーンショット】Day 01 完成時の最小ページ
![Day 01 完成時の最小ページ](./screenshots/day01/first-render.png)
を眺めてもらうと掴みやすいです。
完全一致でなくてよいです。
「自分のアプリ開発が始まった」と思える見た目を今日つくるのが狙いです。

## 今日のゴール

- [ ] 配布 ZIP を展開して、`scripts` と `material` が見える場所を `task-app` の作業場所にする
- [ ] `scripts/scaffold-from-scratch.sh` を実行して、土台を一発で作る
- [ ] `npm run dev` で Next.js（React の画面を動かすための土台一式）の初期画面を表示する
- [ ] `src/app/globals.css` に Linear 風 design token を入れる
- [ ] `src/app/page.tsx` を自分専用の最初の画面に置き換える
- [ ] `src/app/dashboard/page.tsx` を作って、明日の入口をつなぐ

### 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| React | リアクト | 画面の部品（コンポーネント）を組み合わせて UI を作るライブラリ | レゴブロック。小さな部品を組み立てて画面全体を作る |
| Next.js | ネクストジェイエス | React アプリをすぐ動かせるフレームワーク | React 用の工具セット。ルーティング（URL と表示する画面を結び付ける仕組み）やビルドが最初から入っている |
| JSX | ジェイエスエックス | JavaScript の中に HTML のように画面を書ける構文 | 料理のレシピに盛り付け写真が添えてあるイメージ |
| コンポーネント | — | 画面の部品を関数で定義したもの。`function Home()` のように書く | レゴの1ブロック。組み合わせてページを作る |
| npm | エヌピーエム | パッケージ（ライブラリ）を管理するツール | アプリの材料を取り寄せる配達サービス |
| TypeScript | タイプスクリプト | JavaScript に型を足した言語 | 宛名付き封筒 |

## 前提

今日は「アプリの中身をいじる前に、まず動かす」がテーマです。ただし、何もない状態から始めるので、いくつか準備が必要です。

### 必須

- Node.js `22` 以上
- npm `10` 以上
- Docker Desktop（この上で PostgreSQL を動かす環境）
- エディタ（VS Code など）
- ターミナル
- ブラウザ

初めて聞く名前があるかもしれないので、まずはそれぞれの役割を確認しておきましょう。このあと、必要なものを順番にインストールしていきます。

| ツール | 役割 | 入手方法 |
|--------|------|----------|
| Node.js | JavaScript をパソコン上で動かす実行環境。Next.js を動かすために必須 | 公式サイトからインストール（下の手順で説明します） |
| npm | ライブラリ（他の人が作った部品）を管理するツール | Node.js に同梱されるので個別インストール不要 |
| Docker Desktop | PostgreSQL を動かすための「コンテナ」実行環境 | 公式サイトからインストール（下の手順で説明します） |
| PostgreSQL | 入力したデータを保存するデータベース | Docker から起動するので個別インストール不要 |
| エディタ | コードを書くアプリ | [VS Code](https://code.visualstudio.com/) を推奨 |

> このカリキュラムは macOS を基準に説明します。Windows の場合は、Windows の中で Linux を動かす「WSL2」の Ubuntu を使う前提です。まだ WSL2 が無い場合は、先に [Microsoft の公式手順](https://learn.microsoft.com/ja-jp/windows/wsl/install) に従って WSL2 と Ubuntu を入れ、以降のコマンドはすべて Ubuntu のターミナルで実行してください。

### ターミナルを開く

これから何度も「ターミナル」を使います。ターミナルは「文字でパソコンに命令を出す画面」です。開き方は次のとおりです。

- macOS の場合は `command + スペース` で Spotlight を開き、`ターミナル` と入力して Enter
- Windows (WSL2) の場合はスタートメニューで `Ubuntu` を検索して起動

最初は文字が並ぶだけの画面に戸惑うかもしれませんが、これから使うのは決まったコマンドだけなので心配いりません。

### Node.js をインストールする

すでに `node -v` で `v22` 以上が表示される人は、この手順を飛ばして大丈夫です。まだの人は、次のようにインストールします。

**macOS の場合**

1. [Node.js 公式サイト](https://nodejs.org/ja) を開く
2. 「LTS」と書かれたボタン（推奨版）をクリックして、`.pkg` ファイルをダウンロードする
3. ダウンロードした `.pkg` をダブルクリックし、案内どおり「続ける」を押していく
4. インストールが終わったら、開いているターミナルをいったん閉じて、もう一度開き直す

**Windows (WSL2) の場合**

Ubuntu のターミナルで、次を1行ずつ実行します。

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

> 1行目で Node.js 22 の配布元を登録し、2行目で本体をインストールしています。`sudo` の実行時にパソコンのパスワード入力を求められることがあります。

### Docker Desktop をインストールする

PostgreSQL（データベース）は、このあと Docker という仕組みの上で動かします。Docker 本体をまだ入れていなければ、先に入れておきましょう。

1. [Docker Desktop 公式サイト](https://www.docker.com/products/docker-desktop/) を開き、自分の OS 用のインストーラをダウンロードする
2. 案内どおりにインストールし、Docker Desktop を起動する
3. 画面上部（macOS はメニューバー）にクジラのアイコンが表示されれば準備完了

> Docker Desktop は起動していないと PostgreSQL を動かせません。今日の作業中は起動したままにしておきましょう。

### PostgreSQL はどういう状態ならOKか

Docker Desktop が起動していれば進められます。PostgreSQL は Docker の上で自動的に立ち上がるので、パソコンへ個別にインストールする必要はありません。

### 先に確認しておくコマンド

`Node.js` と `npm` のバージョンはここで見ておきましょう。
数字が足りなければ、先に更新してから戻ってくるのが早いです。

**ターミナル（どこでもOK）**
```bash
node -v
npm -v
```

### 期待する結果

- `node -v` が `v22.x.x` 以上
- `npm -v` が `10.x.x` 以上

### Docker が動いているか確認する

PostgreSQL は Docker Desktop の上で起動します。次のコマンドで Docker が動いているかを確認しておきましょう。`docker ok` と表示されれば準備完了です。

**ターミナル（どこでもOK）**
```bash
docker info >/dev/null 2>&1 && echo "docker ok"
```

このコマンドは Docker の状態を確認して、正常なら `docker ok` とだけ表示します。途中の `>/dev/null 2>&1` は細かい表示を隠す指定で、`&&` は「前のコマンドが成功したら次を実行する」という意味です。もし何も表示されなければ、Docker Desktop がまだ起動していないか、起動の途中です。Docker Desktop を開いて、クジラのアイコンが安定するまで待ってから、もう一度このコマンドを実行してください。

## Step 1: 配布 ZIP を展開した場所から始める

今日は完成済みプロジェクトをそのまま編集するのではなく、
配布 ZIP を展開した作業場所から土台を作り直して始めます。

この原則がとても大事です。
「あとで配られる完成形を前提に読む」のと、
「自分で土台を立ち上げて積み上げる」のでは、
理解の深さが大きく変わります。

### 作業用ディレクトリを用意して ZIP を展開する

ここでは例として、ホームディレクトリの中の `workspace` というフォルダに配布 ZIP を展開します。

**ターミナル（`~/workspace`）**
```bash
mkdir -p ~/workspace
cd ~/workspace
unzip ~/Downloads/task-app-curriculum-v1.0.zip
cd task-app
pwd
```

> ここで使っているコマンドの意味も確認しておきましょう。ターミナルの操作に慣れていなくても、1つずつ意味が分かれば怖くありません。
> - `mkdir -p ~/workspace`: `workspace` フォルダを作ります（`mkdir` は make directory の略。すでにあってもエラーになりません）
> - `cd ~/workspace`: 作ったフォルダに移動します（`cd` は change directory の略）
> - `unzip ...`: 配布 ZIP を展開する
> - `cd task-app`: 展開してできた `task-app` フォルダに移動する
> - `pwd`: いま自分がどのフォルダにいるかを表示します（`pwd` は print working directory の略）

> 上の `cd task-app` は、
> 配布 ZIP を展開して `task-app` フォルダができた後に実行します。
> まだ `task-app` フォルダがなければ、先に ZIP を展開してから戻ってきましょう。

### 期待する結果

- `pwd` の結果が `~/workspace/task-app` になっている（パスの先頭部分は、使っているパソコンによって変わる）
- `scripts` と `material` が見える配布物ルートにいる

### ここで置いておく配布物

この Day では、ZIP を展開した直後の
配布物ルートで作業している前提で進めます。

見えていてほしい主なファイルとフォルダは以下の通りです。

- `README.md`
- `material`
- `scripts`
- `scripts/scaffold-from-scratch.sh`
- `.env.example`

今いる場所が配布物ルートになっているか確認しておきましょう。

**ターミナル（`~/workspace/task-app`）**
```bash
ls
```

### 期待する結果

- `scripts` フォルダが見えている
- `scripts/scaffold-from-scratch.sh` が見えている

## Step 2: scaffold-from-scratch.sh を走らせる

ここが Day 01 のいちばん大事なところです。

Next.js アプリの土台は、本来 `npx create-next-app` というコマンドを使って、設定を1つずつ自分で選びながら作ります。ただ、初日からその手順を全部覚えるのは大変です。そこでこのカリキュラムでは、必要な設定をまとめて実行してくれる `scripts/scaffold-from-scratch.sh` というスクリプト（命令をまとめたファイル）を用意しました。これを実行するだけで、土台が一気にできあがります。

このスクリプトは、次の順番で仕事してくれます。

1. Node.js のバージョン確認
2. npm のバージョン確認
3. PostgreSQL を使えるか確認
4. 空ディレクトリなら `create-next-app` を実行
5. このカリキュラムで使う依存パッケージを追加
6. ESLint 設定を外して Biome 設定を作成
7. `.env.example` と `.env` を用意
8. Prisma スキーマと Docker Compose を配置
9. Docker で PostgreSQL を起動して Prisma Client を生成

「何が必要か」を毎回自分で思い出さなくてよくなるので、
初日にかなり効きます。

### 実行コマンド

スクリプト（`.sh` ファイル）は、そのままでは「実行してよいファイル」として扱われないことがあります。そこで最初に `chmod +x` というコマンドで「このファイルは実行してよい」という印（実行権限）を付けます。そのうえで `bash` コマンドにファイルを渡して実行します。`bash` は、スクリプトに書かれた命令を上から順番に処理してくれるプログラムです。

**ターミナル（`~/workspace/task-app`）**
```bash
chmod +x scripts/scaffold-from-scratch.sh
bash scripts/scaffold-from-scratch.sh
```

### 期待される出力

スクリプトを実行すると、ターミナルに進行状況が次々と表示されます。表示される内容や順番はパソコンの環境によって多少前後しますが、だいたい次のような流れになります。

下のログは、流れが分かるように一部を省略した例です。`added ... packages` の数字や秒数は環境によって変わります。なお、ここに表示されるのはスクリプトが自動で出力するログなので、自分で入力（写経）する必要はありません。

**ターミナル出力（`~/workspace/task-app`）**
```text
教材用の初期土台を /Users/you/workspace/task-app に作成します。

Creating a new Next.js app in /Users/you/workspace/task-app.
Using npm.
Initializing project with template: app-tw

Installing dependencies:
- next
- react
- react-dom

Installing devDependencies:
- @tailwindcss/postcss
- tailwindcss
- typescript

Initialized a git repository.

Biome 設定を作成しました。
shadcn/ui コンポーネントを src/component/ui/ にコピーしました。
Prisma スキーマを配置しました。
docker-compose.yml を配置しました。
.env.example を .env にコピーしました。
Docker で PostgreSQL を起動しています...
```

（ログはこの後も続きます。自分で入力するものではないので、表示されるのを待ちましょう。）

```text
Prisma スキーマをDBに反映しています...
シードデータを投入しています...
DB セットアップが完了しました。

初期セットアップは完了だ。
カリキュラムの Day 01 の続きを進めてください。
```

### 成功判定

次のファイルが見えていれば成功です。

- `package.json`
- `tsconfig.json`
- `biome.json`
- `.env.example`
- `.env`
- `docker-compose.yml`
- `prisma/schema.prisma`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/component/ui/button.tsx`

### `.env.example`

このスクリプトは `.env.example` も置いてくれます。
中身はこんな感じです。

```env
# filepath: .env.example
_DOCKER_COMPOSE_HOST_PORT_DB=25532
_DOCKER_COMPOSE_HOST_PORT_TEST_DB=25533

DATABASE_URL="postgresql://user:password@localhost:25532/taskapp?schema=public"
TEST_DATABASE_URL="postgresql://user:password@localhost:25533/taskapp_test?schema=public"

JWT_SECRET="your-jwt-secret-key-32-chars-minimum-please-change"
NODE_ENV="development"
```

### 危ないアンチパターン

ここで1つ、注意してほしい点を説明しておきます。

`JWT_SECRET` は、ログイン状態を証明するための「合言葉」にあたるシークレットキー（秘密の文字列）です。これが他人に知られると、本人になりすましてログインされてしまう恐れがあります。だからこそ、本番で使うシークレットキーを GitHub などの公開される場所に置いてはいけません。

今日は `.env.example`（設定の見本ファイル）を眺めるだけで十分です。本物のシークレットキーは、あとで `.env` を作る段階で、自分のパソコンの中だけに置きます。

## Step 3: npm run dev で初期画面を起動する

土台ができたら、一度開発サーバーを起動して、ブラウザで画面を確認しましょう。

「自分のパソコンで問題なく動く」と確認できていれば、このあとコードを編集するときも安心して進められます。

### 開発サーバーを起動する

**ターミナル（`~/workspace/task-app`）**
```bash
npm run dev
```

### 期待される出力

**ターミナル出力（`~/workspace/task-app`）**
```text
> taskappday01-demo@0.1.0 dev
> next dev

▲ Next.js 15.5.15 (Turbopack)
- Local:         http://localhost:3000
- Network:       http://192.168.55.2:3000
✓ Ready in 158ms
```

### ブラウザで開くURL

- `http://localhost:3000`

### 何が見えたらOKか

Next.js のロゴと
`To get started, edit the page.tsx file.`
が見えればOK。

### スクリーンショットの見本

雰囲気の確認用に、
次の2枚も見ておくとイメージしやすいです。

![VS Codeで配布物ルートを開いた状態](./screenshots/day01-vscode-open.png)

![Next.jsの初期画面がブラウザに表示された状態](./screenshots/day01/nextjs-default.png)

### この状態は「いつでも戻れる安全地帯」になる

この時点で、Node.js・npm・Next.js・Tailwind という土台が正しく動いています。

つまり、このあとコードを編集して画面の表示がおかしくなっても、「最初は動いていた」この状態に戻ってこられます。地味に思えますが、安心して試行錯誤するための大事なポイントです。

## Step 4: 自分専用の最初のページを作る

ここからが今日のいちばん面白いところです。

初期画面は「Next.js を始める人向けの案内」でした。
でも今回作りたいのは、
自分専用のタスク管理アプリのはずです。

そこでここでは、見た目の土台を `task-app` 仕様に寄せていきます。

今日やる編集は2つです。

1. `src/app/globals.css` に Linear 風 design token を入れる
2. `src/app/page.tsx` を、自分専用の最初の画面に置き換える

### 4-1. `globals.css` を token ベースに差し替える

今の `globals.css` でも画面は出ます。ただ、まだ色に「意味の名前」が付いていません。

今日つくるページでは、色の値そのものではなく「役割の名前」で色を呼びます。使う名前は次のようなものです。

| 名前 | 役割 |
|------|------|
| `bg-primary` | 主役の色 |
| `text-primary-foreground` | 主役の色の上に乗せる文字色 |
| `bg-card` | カードの面の色 |
| `text-muted-foreground` | 控えめな説明文の色 |

こうして役割で名前を付けた色を semantic token（意味を持たせた色の変数）と呼びます。

役割で呼べるようにするには、先に「その名前が実際どの色なのか」を1か所にまとめておく必要があります。その対応づけを `globals.css` に入れるのが、この節の作業です。

### 編集アンカー

`src/app/globals.css` を開いて、
**先頭の `@import "tailwindcss";` からファイルの最後まで全部置き換える**。

今のファイルを部分修正するより、
Day 01 は丸ごと入れ替えたほうが理解しやすいです。

#### 貼り付ける前に、このファイルの地図を持っておく

これから貼るコードは長いですが、中身を全部覚える必要はありません。大きく3つのまとまりでできているので、「どこが何の役割か」だけ掴んでおくと、写しながら迷わずに済みます。

| まとまり | 書き出し | 役割 |
|---------|---------|------|
| 対応表 | `@theme inline { ... }` | Tailwind に「`bg-primary` などの名前で、この変数の色を使ってよい」と教える対応表です。名前と色の変数を結び付けます |
| 明るいテーマの値 | `:root { ... }` | `--primary` などの変数が、明るい画面では実際にどの色になるかを決めます |
| 暗いテーマの値 | `.dark { ... }` | 同じ変数が、暗い画面（ダークモード）ではどの色になるかを決めます |

色の指定に出てくる `hsl(var(--primary))` は、「`--primary` という変数に入っている値を、`hsl` という色の形式として使う」という意味です。名前で色を参照しておくと、あとで主役の色を変えたくなったときも、`:root` の `--primary` を1か所直すだけで、その色を使っている画面すべてに反映されます。値を直接書かずに token でそろえておくのは、この付け替えを楽にするためです。

では、上から順に貼っていきましょう。各ブロックのあとに「確認ポイント」を挟むので、そこまで貼れたら次のブロックへ進みます。

```css
/* filepath: src/app/globals.css */
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-sans:
    var(--font-inter), var(--font-noto-sans-jp), "Hiragino Kaku Gothic ProN", "Hiragino Sans",
    "Meiryo", sans-serif;
  --font-mono:
    var(--font-jetbrains-mono), "JetBrains Mono", "Geist Mono", "SFMono-Regular", monospace;

  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));

  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));

  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));

  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));

  --color-secondary: hsl(var(--secondary));
```

冒頭の `@import "tailwindcss";` は Tailwind CSS 本体を読み込む宣言です。次の `@custom-variant dark` は「`.dark` クラスが付いているときだけ効くスタイル」を書けるようにする準備で、このあと作るダークモードの土台になります。`@theme inline { ... }` が地図で見た「対応表」の入口です。`--color-primary: hsl(var(--primary));` のような行は「`bg-primary` と書かれたら変数 `--primary` の色を使ってください」という結び付けの登録です。

**確認ポイント**: `@theme inline {` の中に `--color-` で始まる行が並んでいることを確認できたら、次のブロックを続けて書きます。

```css
  --color-secondary-foreground: hsl(var(--secondary-foreground));

  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));

  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));

  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));

  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));

  --color-chart-1: hsl(var(--chart-1));
  --color-chart-2: hsl(var(--chart-2));
  --color-chart-3: hsl(var(--chart-3));
  --color-chart-4: hsl(var(--chart-4));
  --color-chart-5: hsl(var(--chart-5));

  --color-sidebar: hsl(var(--sidebar));
  --color-sidebar-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-primary: hsl(var(--sidebar-primary));
```

対応表の登録が続きます。`--color-muted-foreground` のように `-foreground` が付く名前は「その面の上に乗せる文字色」を表す約束です。面の色と文字色をペアで用意しておくと、どの背景の上でも文字が読める組み合わせを保てます。`--color-chart-1` から `--color-chart-5` はグラフ用、`--color-sidebar-` 系はサイドバー用の色です。今日はまだ使いませんが、後の Day でグラフや画面の骨組みを作るときにこの名前をそのまま呼び出します。

**確認ポイント**: 前のブロックから続けて、`--color-sidebar-primary` の行まで書けていることを確認できたら、次のブロックを続けて書きます。

```css
  --color-sidebar-primary-foreground: hsl(var(--sidebar-primary-foreground));
  --color-sidebar-accent: hsl(var(--sidebar-accent));
  --color-sidebar-accent-foreground: hsl(var(--sidebar-accent-foreground));
  --color-sidebar-border: hsl(var(--sidebar-border));
  --color-sidebar-ring: hsl(var(--sidebar-ring));

  --radius-sm: calc(var(--radius) - 8px);
  --radius-md: calc(var(--radius) - 4px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-xs: 0 1px 2px 0 rgb(15 23 42 / 0.06);
  --shadow-sm: 0 1px 2px 0 rgb(15 23 42 / 0.06), 0 8px 24px -12px rgb(79 70 229 / 0.18);
  --shadow-md: 0 2px 4px 0 rgb(15 23 42 / 0.08), 0 18px 44px -20px rgb(79 70 229 / 0.22);
  --shadow-lg: 0 8px 24px -12px rgb(15 23 42 / 0.12), 0 28px 64px -28px rgb(79 70 229 / 0.28);

  --ease-linear-out: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 120ms;
  --duration-base: 180ms;
  --duration-slow: 280ms;

  --animate-accordion-down: accordion-down 0.2s ease-out;
  --animate-accordion-up: accordion-up 0.2s ease-out;

```

ここからは色以外の見た目の設定です。`--radius-sm` などの角丸は、基準値 `--radius` から `calc(...)` で計算して作っています。こうしておくと、あとで基準値を1か所変えるだけで、画面中の角丸がまとめて揃って変わります。`--shadow-` 系は影の強さ、`--duration-` 系は動きの速さを名前で決めておく設定で、値を毎回手書きせず名前で呼ぶようにしておくと、画面全体の質感がばらつきにくくなります。

**確認ポイント**: `--radius-sm` から `--animate-accordion-up` までの行が書けていることを確認できたら、次のブロックを続けて書きます。

```css
  @keyframes accordion-down {
    from {
      height: 0;
    }
    to {
      height: var(--radix-accordion-content-height);
    }
  }

  @keyframes accordion-up {
    from {
      height: var(--radix-accordion-content-height);
    }
    to {
      height: 0;
    }
  }
}

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 22% 10%;

```

`@keyframes accordion-down` と `accordion-up` は、折りたたみ部品（アコーディオン）が開閉するときの動きの定義です。今日は出番がありませんが、後の Day で shadcn/ui の部品を入れると、この名前の動きが呼び出されます。その下の `}` で対応表の `@theme inline` を閉じ、`@layer base` と `:root {` からは2つ目のまとまり、つまり「明るいテーマで各変数が実際にどの色になるか」を決めるパートに入ります。まずは画面の背景色 `--background` と文字色 `--foreground` を決めました。

**確認ポイント**: `@theme inline` を閉じる `}` と、その下の `@layer base` が書けていることを確認できたら、次のブロックを続けて書きます。

```css
    --card: 0 0% 100%;
    --card-foreground: 222 22% 10%;

    --popover: 220 33% 99%;
    --popover-foreground: 222 22% 10%;

    --primary: 253 77% 60%;
    --primary-foreground: 0 0% 100%;

    --secondary: 240 24% 96%;
    --secondary-foreground: 223 20% 16%;

    --muted: 225 23% 95%;
    --muted-foreground: 220 11% 42%;

    --accent: 191 82% 95%;
    --accent-foreground: 193 73% 24%;

    --destructive: 354 70% 54%;
    --destructive-foreground: 0 0% 100%;

    --success: 158 64% 41%;
    --success-foreground: 0 0% 100%;

```

`--primary: 253 77% 60%;` のような3つ組の数字は、色相・鮮やかさ・明るさの順で色を表す HSL 形式の値です。対応表では「変数 `--primary` の色を使う」とだけ決めていたので、ここで初めて「`--primary` は青紫」という実際の色が決まります。主役は青紫、危険を知らせる `--destructive` は赤、成功を知らせる `--success` は緑というように、役割ごとに Linear 風の落ち着いた配色を割り当てています。

**確認ポイント**: `--primary` から `--success-foreground` までの行が書けていることを確認できたら、次のブロックを続けて書きます。

```css
    --warning: 35 92% 55%;
    --warning-foreground: 223 20% 12%;

    --border: 225 20% 89%;
    --input: 225 20% 89%;
    --ring: 253 77% 60%;

    --radius: 10px;

    --chart-1: 253 77% 60%;
    --chart-2: 191 72% 42%;
    --chart-3: 333 72% 64%;
    --chart-4: 35 92% 55%;
    --chart-5: 222 18% 48%;

    --sidebar: 224 28% 97%;
    --sidebar-foreground: 222 22% 12%;
    --sidebar-primary: 253 77% 60%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 225 23% 95%;
    --sidebar-accent-foreground: 223 20% 16%;
    --sidebar-border: 225 20% 89%;
    --sidebar-ring: 253 77% 60%;
  }
```

明るいテーマの値はここまでです。`--radius: 10px;` は、先ほど `calc(...)` の基準にしていた角丸の大元で、この1行を変えると画面全体の丸みがまとめて変わります。`--ring` はボタンや入力欄を選んだときに周りへ表示される輪の色で、主役の `--primary` と同じ値にしてあります。操作している場所が主役の色で光るように揃えるための工夫です。

**確認ポイント**: `:root { ... }` が `}` で閉じられていることを確認できたら、次のブロックを続けて書きます。

```css

  .dark {
    --background: 228 21% 10%;
    --foreground: 220 20% 97%;

    --card: 228 20% 12%;
    --card-foreground: 220 20% 97%;

    --popover: 228 20% 13%;
    --popover-foreground: 220 20% 97%;

    --primary: 254 86% 68%;
    --primary-foreground: 233 35% 10%;

    --secondary: 226 16% 18%;
    --secondary-foreground: 220 20% 96%;

    --muted: 226 16% 16%;
    --muted-foreground: 220 12% 69%;

    --accent: 184 33% 18%;
    --accent-foreground: 183 85% 84%;

    --destructive: 355 72% 60%;
```

`.dark {` からは3つ目のまとまり、暗いテーマ（ダークモード）の値です。`--background` や `--primary` など、`:root` とまったく同じ名前の変数に、暗い画面向けの値をもう一度入れ直しています。ページの一番外側に `.dark` クラスが付くと、こちらの値が優先されて画面全体の色が切り替わります。部品側のコードを1行も変えずにテーマを切り替えられるのは、色を名前で参照しているおかげです。

**確認ポイント**: `.dark {` の中に `:root` と同じ名前の変数が並んでいることを確認できたら、次のブロックを続けて書きます。

```css
    --destructive-foreground: 0 0% 100%;

    --success: 158 60% 46%;
    --success-foreground: 0 0% 100%;

    --warning: 38 92% 60%;
    --warning-foreground: 223 20% 12%;

    --border: 224 15% 22%;
    --input: 224 15% 22%;
    --ring: 254 86% 68%;

    --chart-1: 254 86% 68%;
    --chart-2: 184 56% 52%;
    --chart-3: 330 77% 71%;
    --chart-4: 38 92% 60%;
    --chart-5: 220 12% 69%;

    --sidebar: 228 21% 9%;
    --sidebar-foreground: 220 20% 96%;
    --sidebar-primary: 254 86% 68%;
    --sidebar-primary-foreground: 233 35% 10%;
    --sidebar-accent: 226 16% 16%;
    --sidebar-accent-foreground: 220 20% 96%;
```

暗いテーマの値が続きます。よく見ると `--primary` の明るさは、`:root` の `60%` に対してこちらは `68%` と少し明るめです。暗い背景の上では同じ色だと沈んで見えづらくなるので、暗いテーマ側だけ明るさを持ち上げて、ボタンや文字がはっきり見えるようにしています。グラフ用やサイドバー用の色も、同じ考え方で暗い画面向けの値に置き換えています。

**確認ポイント**: `--chart-1` から `--sidebar-accent-foreground` までの行が書けていることを確認できたら、次のブロックを続けて書きます。

```css
    --sidebar-border: 224 15% 22%;
    --sidebar-ring: 254 86% 68%;
  }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-family: var(--font-sans);
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

最後の `body { ... }` が、ここまで定義してきた変数を実際にページへ当てはめる場所です。背景色・文字色・フォントを `hsl(var(--background))` のように変数経由で指定しているので、テーマが切り替われば `body` の見た目も自動で追従します。`-webkit-font-smoothing` などの行は、文字の輪郭をなめらかに表示するためのブラウザ向けの設定です。ここまで書けたら、`globals.css` の置き換えは完了です。

### 4-2. `page.tsx` を最初の画面に置き換える

次に、トップページを Next.js の初期画面から、自分のタスク管理アプリのトップページに置き換えます。

今日のテーマはこれです。

**自分専用のタスク管理アプリのトップページを、人に見せても恥ずかしくない見た目で立ち上げる**

派手にする必要はありません。それでも Next.js の初期画面のままからは卒業して、自分のプロダクトらしい1枚目に仕上げます。

### 編集アンカー

`src/app/page.tsx` を開いて、
**`import Image from "next/image";` からファイルの最後まで全部置き換える**。

`Home` という初期コンポーネントを残すより、
このDayでは丸ごと差し替えた方がスッキリ理解できます。

```tsx
// filepath: src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-4 rounded-xl border border-border/80 bg-card/80 px-4 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Getting Started
            </p>
            <h1 className="text-sm font-semibold text-card-foreground">
              My Task App
            </h1>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Day 01 Ready
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-md">
```

最初のブロックで、ページの骨組みを作り始めました。`export default function HomePage()` は「ここに来たらこの部品を表示する」という宣言で、Next.js は `src/app/page.tsx` という置き場所からトップページ（`/`）だと判断します。`className` に並ぶ `bg-background` や `text-muted-foreground` は、さっき `globals.css` に登録した token の名前そのものです。生の色の値ではなく役割の名前で指定しているので、あとでテーマを変えてもこのファイルは直さずに済みます。

**確認ポイント**: `export default function HomePage()` と、その中の `<header>` が書けていることを確認できたら、次のブロックを続けて書きます。

```tsx
// filepath: 続き
            <div className="border-b border-border px-8 py-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                Hello, my first task app
              </div>

              <h2 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-card-foreground sm:text-5xl">
                自分専用のタスク管理アプリが、今日ここから動き出す。
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                今日つくるのは、30日後の完成版へつながる最初の画面だ。
                まだ機能は少ないけど、見た目の温度感はもうプロダクトに寄せていく。
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                  href="#today-goals"
                >
                  今日のゴールを見る
                </a>
                <Link
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                  href="/dashboard"
```

ここはページの主役になる見出しまわりです。`<h2>` に大きなキャッチコピー、`<p>` に説明文を置き、その下にボタンを並べ始めました。ボタンには2種類あって、`<a href="#today-goals">` は同じページ内の場所へ飛ぶリンク、`<Link href="/dashboard">` は別のページへ移動するリンクです。Next.js の `Link` を使うと、ページ全体を読み込み直さずに画面を切り替えてくれるので、アプリ内のページ移動には `Link` を使うのが基本です。

**確認ポイント**: `<a>` と `<Link>` の2種類のリンクを書き分けていることを確認できたら、次のブロックを続けて書きます。

```tsx
// filepath: 続き
                >
                  ダッシュボードへ入る
                </Link>
                <a
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                  href="#next-step"
                >
                  明日の予告を見る
                </a>
              </div>
            </div>

            <div className="grid gap-4 bg-secondary/60 px-8 py-6 md:grid-cols-3">
              <article className="rounded-2xl border border-border bg-background px-4 py-4 shadow-xs">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  今日の進捗
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">01</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  空のディレクトリから、ちゃんと動く土台を自分で立ち上げた。
                </p>
              </article>

              <article className="rounded-2xl border border-border bg-background px-4 py-4 shadow-xs">
```

ボタンの並びを閉じたあと、大きなカードの下半分に小さなカードを3枚並べ始めました。`md:grid-cols-3` は「画面幅が中くらい以上なら3列に並べる」という指定で、スマホでは縦積み、広い画面では横並びになります。1枚ずつを `<article>` で囲んでいるのは、それぞれが独立したひとかたまりの内容だと構造で示すためです。ここでも色はすべて token 名で指定しています。

**確認ポイント**: 「今日の進捗」のカードが書けて、2枚目の `<article>` を開いたところまで確認できたら、次のブロックを続けて書きます。

```tsx
// filepath: 続き
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  今見えているもの
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">UI</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  初期画面ではなく、自分のアプリの一枚目として見せられる見た目。
                </p>
              </article>

              <article className="rounded-2xl border border-border bg-background px-4 py-4 shadow-xs">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  次につながる土台
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">Next</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  明日からメッセージやカードを足しても、見た目の芯がぶれにくい。
                </p>
              </article>
            </div>
          </div>

          <div className="space-y-4">
            <article
              id="today-goals"
```

小さなカードが3枚出そろい、左側の大きなカードはここで閉じました。続いて右側の列に入ります。`id="today-goals"` は、この場所に付けた目印の名前です。前のブロックで書いたボタンの `href="#today-goals"` はこの目印を指していて、ボタンを押すとページがこの位置までスクロールします。`id` と `href="#..."` の名前が一致して初めてつながる仕組みです。

**確認ポイント**: 3枚目の `<article>` を閉じて、`id="today-goals"` まで書けていることを確認できたら、次のブロックを続けて書きます。

```tsx
// filepath: 続き
              className="rounded-[28px] border border-border bg-card p-6 shadow-sm"
            >
              <p className="text-sm font-semibold text-card-foreground">
                今日のゴール
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                <li className="rounded-2xl bg-secondary px-4 py-3">
                  空のディレクトリから `task-app` を始める
                </li>
                <li className="rounded-2xl bg-secondary px-4 py-3">
                  スキャフォールド用スクリプトで土台を作る
                </li>
                <li className="rounded-2xl bg-secondary px-4 py-3">
                  `npm run dev` でローカル起動を確認する
                </li>
                <li className="rounded-2xl bg-secondary px-4 py-3">
                  design token を使って最初の画面をつくる
                </li>
              </ul>
            </article>

            <article className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                今日のひとこと
```

「今日のゴール」カードの中身です。`<ul>` と `<li>` は箇条書きを表す HTML のタグで、ここでは `<li>` の1つずつに `rounded-2xl bg-secondary` を付けて、角丸の面に乗ったチェック項目のような見た目にしています。JSX では、表示したい日本語のテキストをタグの中へそのまま書けます。最後の `今日のひとこと` は次のカードの見出しで、ブロックの区切りの都合で途中まで書いている状態なので、そのまま次へ進んでください。

**確認ポイント**: `<ul>` の中に4つの `<li>` が書けていることを確認できたら、次のブロックを続けて書きます。

```tsx
// filepath: 続き
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                最初の一枚目は、ただ映えればいいわけではない。
                これから30日育てる画面の、空気感の基準になる。
              </p>

              <div className="mt-5 rounded-2xl bg-primary px-4 py-4 text-primary-foreground shadow-sm">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/80">
                  Today&apos;s theme
                </p>
                <p className="mt-2 text-lg font-semibold">
                  自分のアプリの最初の一枚を、自分の手で立ち上げる
                </p>
              </div>
            </article>

            <article
              id="next-step"
              className="rounded-[28px] border border-border bg-card p-6 shadow-sm"
            >
              <p className="text-sm font-semibold text-card-foreground">
                明日につながる入口
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
```

「今日のひとこと」カードの続きです。途中にある `bg-primary px-4 py-4 text-primary-foreground` の箱は、主役の面色とその上に乗せる文字色をペアで使う実例になっています。この2つをセットで使うと、背景と文字のコントラストが崩れません。最後に `id="next-step"` のカードを開きました。これも、最初のブロックで書いたボタンの `href="#next-step"` から飛んでくるための目印です。

**確認ポイント**: `id="next-step"` の `<article>` を開いたところまで書けていることを確認できたら、最後のブロックを続けて書きます。

```tsx
// filepath: 続き
                Day 02 では、ここから入れる `/dashboard` に自分だけのメッセージや情報を足していく。
                今日のページは入口として、ダッシュボードは明日の土台として整えておく。
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
```

締めのブロックです。Day 02 の予告文を置いたあと、`</section>` から `</main>` まで、開いたタグを外側へ向かって順番に閉じて、`HomePage` の `return` を終えています。JSX では開いたタグを必ず閉じる必要があるので、写経の最後はこの「閉じタグの並び」が乱れやすいポイントです。保存してターミナルにエラーが出ていなければ、トップページの置き換えは完了です。

### 4-3. `dashboard/page.tsx` を作る

Day 02 では、`src/app/dashboard/page.tsx` に機能を追加していきます。

その準備として、Day 01 の最後に **ダッシュボードのページだけ先に用意しておきます**。

まず `src/app` の中に `dashboard` フォルダを作ります。VS Code で作るなら、左側のファイル一覧（エクスプローラー）で `src/app` を右クリックして「新しいフォルダー」を選び、`dashboard` と名前を付けます。ターミナルが好きなら、`task-app` フォルダにいる状態で `mkdir src/app/dashboard` と打っても同じ結果になります。

次に、作った `dashboard` フォルダを右クリックして「新しいファイル」を選び、`page.tsx` という名前を付けます。ここに次の内容をそのまま入力しましょう。

```tsx
// filepath: src/app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10">
        <section className="w-full rounded-3xl border border-border bg-card px-8 py-10 shadow-md">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-card-foreground sm:text-5xl">
            Hello Task-App
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            Day 01 で用意した最初のダッシュボードです。
            ここから少しずつ、自分専用の画面にしていきます。
          </p>
        </section>
      </div>
    </main>
  );
}
```

### ここで押さえたいこと

- ルートの `src/app/page.tsx` は、アプリの入口となるトップページ
- `src/app/dashboard/page.tsx` は、これから機能を追加していくダッシュボード本体
- Day 02 では、この `Hello Task-App` のダッシュボードに自分のメッセージを追加していく

### できあがる見た目のポイント

このページでは、
今日入れた token をそのまま使っています。

たとえば次の対応です。

- `bg-background` で画面全体の背景
- `bg-card` で主役の面
- `bg-primary` と `text-primary-foreground` で CTA
- `text-muted-foreground` で説明文
- `border-border` で面同士の境界線

### もし色が乗らないとき

だいたいこのどちらかです。

- `src/app/globals.css` の貼り付けが途中で切れている
- `npm run dev` を起動し直していない

1回落ち着いて、
`@theme inline` と `:root` がちゃんと入っているか見直しましょう。

### Pro パターンで書こう（arbitrary value 多用より design token を先に切る）

ここまでで動くコードは書けました。本編で書いた `page.tsx` は、すでに After 側（トークンで色を組む書き方）になっています。
この部分は写経しません。もし生の値で色や余白を直接書いていたら（Before）どう困るのか、読み比べてみましょう。なぜトークンで書くのかが見えてきます。

### Before（動くけど、プロは書かない）

```tsx
// filepath: src/app/page.tsx（比較用の一部）
function WelcomeHero() {
  return (
    <section className="rounded-[28px] border border-[#25273f] bg-[#0f1021] px-[32px] py-[28px] shadow-[0_24px_80px_-32px_rgba(99,102,241,0.45)]">
      <span className="inline-flex items-center rounded-full bg-[#16172d] px-[12px] py-[6px] text-[13px] font-medium text-[#9aa2c3]">
        Hello, my first task app
      </span>
      <h2 className="mt-[24px] text-[44px] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
        自分専用のタスク管理アプリが、今日ここから動き出す。
      </h2>
      <p className="mt-[18px] max-w-[620px] text-[16px] leading-[1.9] text-[#b0b7d3]">
        今日つくるのは、30日後の完成版へつながる最初の画面だ。
        まだ機能は少ないけど、見た目の温度感はもうプロダクトに寄せていく。
      </p>
      <div className="mt-[32px] flex gap-[12px]">
        <a
          className="inline-flex items-center justify-center rounded-[12px] bg-[#6d5dfc] px-[20px] py-[12px] text-[14px] font-semibold text-white"
          href="#today-goals"
        >
          今日のゴールを見る
        </a>
        <a
          className="inline-flex items-center justify-center rounded-[12px] border border-[#2d314b] bg-[#151729] px-[20px] py-[12px] text-[14px] font-semibold text-white"
          href="#next-step"
        >
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

```tsx
// filepath: src/app/page.tsx（続き）
          明日の予告を見る
        </a>
      </div>
    </section>
  );
}

export default function HomePage() {
  return <WelcomeHero />;
}
```

**このコードの問題点**:

- 色や角丸や余白が全部その場の値なので、別画面でも同じ空気感を出したくなった瞬間にコピペが始まる
- `#6d5dfc` と `#0f1021` が何の役割の色か名前から分からず、レビュー時に意図を読み取りづらい
- 後で配色を少し変えたいとき、画面全体を検索して直す必要が出やすい

### After（プロが書くコード）

```tsx
// filepath: src/app/page.tsx（比較用の一部）
function WelcomeHero() {
  return (
    <section className="rounded-[28px] border border-border bg-card px-8 py-7 shadow-md">
      <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
        Hello, my first task app
      </span>
      <h2 className="mt-6 text-4xl font-semibold tracking-tight text-card-foreground sm:text-5xl">
        自分専用のタスク管理アプリが、今日ここから動き出す。
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
        今日つくるのは、30日後の完成版へつながる最初の画面だ。
        まだ機能は少ないけど、見た目の温度感はもうプロダクトに寄せていく。
      </p>
      <div className="mt-8 flex gap-3">
        <a
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
          href="#today-goals"
        >
          今日のゴールを見る
        </a>
        <a
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground"
          href="#next-step"
        >
```

**読み比べ用**: ここは写経しません。続けてコードを読み進めましょう。

```tsx
// filepath: 続き
          明日の予告を見る
        </a>
      </div>
    </section>
  );
}

export default function HomePage() {
  return <WelcomeHero />;
}
```

**このコードの強み**:

- `primary` `card` `accent` みたいに役割で名前が付いているので、画面が増えても見た目のルールを共有しやすい
- 色や面の意味がクラス名に表れるから、レビュー時に「何を主役にしたいのか」が読み取りやすい
- テーマ調整や配色変更が `globals.css` に寄りやすくなり、後日の拡張でも崩れにくい

#### 覚えておきたいポイント

最初のページほど、色や余白をその場限りの値で指定するより、**意味のある token 名で見た目を組む**ほうが、あとから効いてきます。

「この色はきれいか」より先に、「この色は主役か、補助か、背景か」を考えて名前を付けておきましょう。そうしておくと、画面が増えても見た目のルールを保ちやすくなります。

## Step 5: 動作確認（仕上げた画面をブラウザで見る）

編集が終わったら、
もう1回ブラウザを見ます。

まだ `npm run dev` を落としていなければ、
保存した瞬間に変わっているはずです。

止めていたら、もう1回起動しましょう。

**ターミナル（`~/workspace/task-app`）**
```bash
npm run dev
```

### ブラウザ確認

- `http://localhost:3000` を開く

### チェックポイント

- 上に `Getting Started` と `My Task App` が見える
- `Day 01 Ready` の小さなバッジが見える
- メインカードに「自分専用のタスク管理アプリが、今日ここから動き出す。」が見える
- ボタンが `bg-primary` の主役色で表示されている
- `ダッシュボードへ入る` ボタンが見える
- 右側に「今日のゴール」「今日のひとこと」「明日につながる入口」のカードが見える
- `ダッシュボードへ入る` を押すと `http://localhost:3000/dashboard` が開く
- `/dashboard` で `Hello Task-App` が見える

### 見た目が近いか確認する用の画像

今日はここまで来られたら十分です。
雰囲気比較として、
[first-render.png](./screenshots/day01/first-render.png)
や
[dashboard-hello.png](./screenshots/day01/dashboard-hello.png)
も眺めてみてください。

「完全一致」より、
「自分の画面として立っているか」を見るのが大事です。

### うまく表示されないときの見直し順

1. ターミナルにエラーが出ていないか見る
2. `src/app/globals.css` の貼り付け漏れがないか見る
3. `src/app/page.tsx` のクラス名を打ち間違えていないか見る
4. 開発サーバーをいったん止めて、もう1回 `npm run dev` する

## 今日手に入れたもの

今日は「環境構築だけの日」では終わりませんでした。空のディレクトリから `task-app` の土台を立ち上げ、そのうえで最初の画面まで自分のアプリらしい見た目に変えました。

これで、明日以降に機能を追加していくための土台ができました。しかもその土台は、ただ動くだけでなく、design token を使って見た目の基準まで整え始めています。

Day 01 のポイントはここです。「動く」と「見た目が整っている」の両方を、初日のうちにそろえられました。

## 明日のプレビュー

Day 02 では、
今日つないだ `src/app/dashboard/page.tsx` に、
自分だけのメッセージや情報を足していきます。

ルートの入口はそのままに、
中のダッシュボードが少しずつ「自分のプロダクト」っぽくなってくる日です。

今日の `bg-card` や `bg-primary` が効いてくるのも、
まさにここから。
