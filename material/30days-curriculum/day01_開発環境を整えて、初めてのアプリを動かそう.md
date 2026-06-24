# Day 01: 開発環境を整えて、初めてのアプリを動かそう

30日かけて、自分専用のタスク管理アプリを作っていきます。
その1日目が今日です。

いまはまだ、画面にはほとんど何もありません。
それでも、空のディレクトリから自分の手で土台を立ち上げて、
ブラウザに最初の画面が表示されれば、
「ここから自分のアプリを作っていくんだ」と実感できます。

今日作るのは、ただの Hello World ではありません。
Linear のような雰囲気のある画面を、最初の一枚として立ち上げます。

## この日でできるようになること

空のディレクトリから `task-app` の土台を起動して、
`http://localhost:3000` に最初の画面を出せるようになります。

最後は、真っ白な初期画面のままでは終わりません。
Linear 風の design token を使って、
SNS に貼っても練習用に見えない画面まで仕上げます。

完成イメージの雰囲気は、
【スクリーンショット】Day 01 完成時の最小ページ
![Day 01 完成時の最小ページ](./screenshots/day01/first-render.png)
を眺めてもらうと掴みやすいです。
完全一致でなくてよいです。
「自分のアプリが始まった」と思える見た目を今日つくるのが狙いです。

## 今日のゴール（G0 Foundation の1日目）

- [ ] 配布 ZIP を展開して、`scripts` と `material` が見える場所を `task-app` の作業場所にする
- [ ] `scripts/scaffold-from-scratch.sh` を実行して、土台を一発で作る
- [ ] `npm run dev` で Next.js の初期画面を表示する
- [ ] `src/app/globals.css` に Linear 風 design token を入れる
- [ ] `src/app/page.tsx` を自分専用の最初の画面に置き換える
- [ ] `src/app/dashboard/page.tsx` を作って、明日の入口をつなぐ

### 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| React | リアクト | 画面の部品を組み合わせて UI を作るライブラリ | レゴブロック |
| Next.js | ネクストジェイエス | React アプリをすぐ動かせるフレームワーク | React 用の工具セット |
| JSX | ジェイエスエックス | JavaScript の中に HTML っぽく書ける構文 | レシピに盛り付け写真が直接描いてあるイメージ |
| コンポーネント | — | 画面の部品。関数で定義して再利用する | レゴの1ブロック |
| npm | エヌピーエム | パッケージ管理ツール | 材料を取り寄せる配達サービス |
| TypeScript | タイプスクリプト | JavaScript に型を足した言語 | 宛名付き封筒 |

## 前提（これが揃ってたら進める）

今日は「アプリの中身をいじる前に、まず動かす」がテーマですが、
何もない状態から進める都合上、
いくつか前提は必要になります。

### 必須

- Node.js `22` 以上
- npm `10` 以上
- PostgreSQL を使える状態
- エディタ
- ターミナル
- ブラウザ

### PostgreSQL はどういう状態ならOKか

次のどちらかがあれば進めます。

- Docker Desktop が起動している
- ローカル PostgreSQL と `psql` / `pg_isready` が入っている

### 先に確認しておくコマンド

`Node.js` と `npm` のバージョンはここで見ておこう。
数字が足りなければ、先に更新してから戻ってくるのが早いです。

**ターミナル（どこでもOK）**
```bash
node -v
npm -v
```

### 期待する結果

- `node -v` が `v22.x.x` 以上
- `npm -v` が `10.x.x` 以上

### PostgreSQL 利用手段の確認

Docker 派でもローカル PostgreSQL 派でも大丈夫です。
どっちかが通れば、今日のスクリプトは前に進めます。

**ターミナル（どこでもOK）**
```bash
docker info >/dev/null 2>&1 && echo "docker ok"
psql --version
pg_isready --version
```

### 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| React | リアクト | 画面の部品（コンポーネント）を組み合わせて UI を作るライブラリ | レゴブロック。小さな部品を組み立てて画面全体を作る |
| Next.js | ネクストジェイエス | React アプリをすぐ動かせるフレームワーク | React 用の工具セット。ルーティングやビルドが最初から入っている |
| JSX | ジェイエスエックス | JavaScript の中に HTML っぽく画面を書ける構文 | 料理レシピの中に盛り付け写真が直接書いてあるイメージ |
| コンポーネント | — | 画面の部品を関数で定義したもの。`function Home()` のように書く | レゴの1ブロック。組み合わせてページを作る |
| npm | エヌピーエム | パッケージ（ライブラリ）の管理ツール | アプリの材料を取り寄せる配達サービス |

> **React が初めてでも大丈夫。** 今日はスクリプトが土台を作ってくれるから、まずは「動いた！」を体験するのがゴール。React の仕組みは Day 02 以降で手を動かしながら少しずつわかってきます。

## Step 1: 配布 ZIP を展開した場所から始める

今日は完成済みプロジェクトをそのまま編集するのではなく、
配布 ZIP を展開した作業場所から土台を作り直して始めます。

この原則がとても大事です。
「あとで配られる完成形を前提に読む」のと、
「自分で土台を立ち上げて積み上げる」のでは、
理解の深さが大きく変わります。

### 作業用ディレクトリを用意して ZIP を展開する

ここでは例として、
ホームディレクトリの中の `workspace` に配布 ZIP を展開します。

**ターミナル（`~/workspace`）**
```bash
mkdir -p ~/workspace
cd ~/workspace
unzip ~/Downloads/task-app-curriculum-v1.0.zip
cd task-app
pwd
```

> 上の `cd task-app` は、
> 配布 ZIP を展開して `task-app` フォルダができた後に実行します。
> まだ `task-app` フォルダがなければ、先に ZIP を展開してから戻ってこよう。

### 期待する結果

- `pwd` の結果が `~/workspace/task-app` っぽい場所になっている
- `scripts` と `material` が見える配布物ルートにいる

### ここで置いておく配布物

この Day では、ZIP を展開した直後の
配布物ルートで作業している前提で進めます。

見えていてほしい主なファイルとフォルダはこれ。

- `README.md`
- `material`
- `scripts`
- `scripts/scaffold-from-scratch.sh`
- `.env.example`

今いる場所が配布物ルートになっているか確認しておこう。

**ターミナル（`~/workspace/task-app`）**
```bash
ls
```

### 期待する結果

- `scripts` フォルダが見えている
- `scripts/scaffold-from-scratch.sh` が見えている

## Step 2: scaffold-from-scratch.sh を走らせる

ここが Day 01 の心臓です。

手で `npx create-next-app` を打ち始めるんじゃなくて、
教材用に整理された `scripts/scaffold-from-scratch.sh` を実行します。

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

「何が必要か」を毎回自分で思い出さなくてよくなるから、
初日にかなり効く。

### 実行コマンド

まずは権限を付けてから実行します。
`bash` で直接叩いても構わないが、
最初に実行権限を付けておくと扱いやすいです。

**ターミナル（`~/workspace/task-app`）**
```bash
chmod +x scripts/scaffold-from-scratch.sh
bash scripts/scaffold-from-scratch.sh
```

### 期待される出力

実行環境で多少前後はあるけど、
だいたいこんな流れになります。

下のログは流れが分かるように短くした例です。
`added ... packages` の数字や秒数は環境によって変わります。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```text
Prisma スキーマをDBに反映しています...
シードデータを投入しています...
DB セットアップが完了しました。

初期セットアップは完了だ。
カリキュラムの Day 01 の続きを進めてください。
```

### 成功判定

次のファイルが見えていれば、かなり順調です。

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

### 作られる `.env.example`

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

ここでだけ一個、危ない話をしておきます。

`JWT_SECRET` に本番で使う秘密値をそのまま貼って、
公開場所に出してしまうのはいけません。

今日は `.env.example` を眺めるだけで十分です。
本物の秘密値は、あとで `.env` を作る段階で自分の手元だけに置く。

## Step 3: npm run dev で初期画面を拝む

土台ができたら、
一回ちゃんと起動して、
ブラウザで見よう。

「自分の環境で動く」が確認できるだけで、
次の編集がかなり安心になります。

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

![Next.jsの初期画面がブラウザに表示された状態](./screenshots/day01-success.png)

### ここで一回安心してよい理由

この時点で、
Node.js と npm と Next.js と Tailwind の土台はちゃんと動いてる。

つまり次に画面を壊したとしても、
「最初は動いていた」状態に戻れる。
これは地味ですが、とても大事です。

## Step 4: 自分専用の"最初のページ"を作る

ここからが今日のいちばん面白いところです。

初期画面は「Next.js を始める人向けの案内」でした。
でも君が30日で育てたいのは、
自分専用のタスク管理アプリでしょう。

なのでここで、
見た目の土台を `task-app` 仕様に寄せる。

今日やる編集は2つ。

1. `src/app/globals.css` に Linear 風 design token を入れる
2. `src/app/page.tsx` を、自分専用の最初の画面に置き換える

### 4-1. `globals.css` を token ベースに差し替える

今の `globals.css` でも画面は出ます。
でも semantic token がまだ足りません。

今日つくるページでは、
`bg-primary`
`text-primary-foreground`
`bg-card`
`text-muted-foreground`
みたいな名前で色を呼びたいです。

そのためにまず、
土台の色設計を `globals.css` に入れます。

### 編集アンカー

`src/app/globals.css` を開いて、
**先頭の `@import "tailwindcss";` からファイルの最後まで全部置き換える**。

今のファイルを部分修正するより、
Day 01 は丸ごと入れ替えたほうが理解しやすいです。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

### 4-2. `page.tsx` を最初の画面に置き換える

次に、
トップページを君のアプリの顔に変えます。

今日のテーマはこれ。

**自分専用のタスク管理アプリの最初の画面を立ち上げて、SNSに見せたくなる見た目で「Hello」する**

派手すぎなくてよいです。
でも「初期画面のまま」からは卒業したいです。

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
              G0 Foundation
            </p>
            <h1 className="text-sm font-semibold text-card-foreground">
              Kouiso Task App
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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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
                <p className="mt-3 text-3xl font-semibold text-foreground">G0</p>
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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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
                  SNS に貼りたくなる Hello を、自分の手で立ち上げる
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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

### 4-3. 明日につながる `dashboard/page.tsx` を作る

Day 02 は
`src/app/dashboard/page.tsx` を育てる日です。

だから Day 01 の最後に、
**ダッシュボードの入口だけは先に作っておく**。

まず `src/app` の中に `dashboard` フォルダを作ります。
その中に `page.tsx` を新しく作って、
次の内容をそのまま入れよう。

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
            Day 01 で立ち上げた最初のダッシュボードだ。
            ここから少しずつ、自分専用の画面に育てていこう。
          </p>
        </section>
      </div>
    </main>
  );
}
```

### ここで押さえたいこと

- ルートの `src/app/page.tsx` は「入口」の役目
- `src/app/dashboard/page.tsx` は「育てていく本体」の役目
- Day 02 では、この `Hello Task-App` のダッシュボードに自分の言葉を足していく

### できあがる見た目のポイント

このページでは、
今日入れた token をそのまま使ってる。

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

一回落ち着いて、
`@theme inline` と `:root` がちゃんと入っているか見直そう。

### Pro パターンで書こう — arbitrary value 多用より design token を先に切る

ここまでで動くコードは書けた。
でもプロの現場ではもう一段上の書き方をします。
なぜ上の書き方をするのか、
**Before/After** で見比べてみよう。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

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

#### 覚えておきたいエッセンス

最初の一枚目ほど、
値をその場で盛るより、
**意味のある token 名で見た目を組む** ほうが後から効く。

「この色きれい」より先に、
「この色は主役か、補助か、背景か」を名前にしておきます。

## Step 5: 動作確認 — SNS に貼りたくなる画面を見る

編集が終わったら、
もう一回ブラウザを見ます。

まだ `npm run dev` を落としていなければ、
保存した瞬間に変わっているはずです。

止めていたら、もう一回起動しよう。

**ターミナル（`~/workspace/task-app`）**
```bash
npm run dev
```

### ブラウザ確認

- `http://localhost:3000` を開く

### チェックポイント

- 上に `G0 Foundation` と `Kouiso Task App` が見える
- `Day 01 Ready` の小さなバッジが見える
- メインカードに「自分専用のタスク管理アプリが、今日ここから動き出します。」が見える
- ボタンが `bg-primary` らしい主役色で出ている
- `ダッシュボードへ入る` ボタンが見える
- 右側に「今日のゴール」「今日のひとこと」「明日につながる入口」のカードが見える
- `ダッシュボードへ入る` を押すと `http://localhost:3000/dashboard` が開く
- `/dashboard` で `Hello Task-App` が見える

### 見た目が近いか確認する用の画像

今日はここまで来たら十分すごい。
雰囲気比較として、
[day01-success.png](./screenshots/day01-success.png)
や
[day01-dashboard-named.png](./screenshots/day01-dashboard-named.png)
も眺めてみてほしい。

「完全一致」より、
「自分の画面として立っているか」を見るのが大事です。

### うまく表示されないときの見直し順

1. ターミナルにエラーが出ていないか見る
2. `src/app/globals.css` の貼り付け漏れがないか見る
3. `src/app/page.tsx` のクラス名を打ち間違えていないか見る
4. 開発サーバーをいったん止めて、もう一回 `npm run dev` する

## 今日手に入れたもの

今日は「環境構築だけの日」では終わってません。
空のディレクトリから `task-app` の土台を立ち上げて、
そのうえで最初の画面まで自分の色に変えた。

これで、
明日以降に機能を足していく土台ができました。
しかもその土台は、
ただ動くだけじゃなく、
design token を使って見た目の芯まで整え始めています。

Day 01 の勝ち筋はここです。
「動く」と「ちょっと見せたくなる」の両方を、
最初の日に取れた。

## 明日のプレビュー

Day 02 では、
今日つないだ `src/app/dashboard/page.tsx` に、
自分だけのメッセージや情報を足していきます。

ルートの入口はそのままに、
中のダッシュボードが少しずつ「自分のプロダクト」っぽくなってくる日です。

今日の `bg-card` や `bg-primary` が効いてくるのも、
まさにここから。
