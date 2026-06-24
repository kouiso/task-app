# Day 02: ダッシュボードに自分だけのメッセージを追加しよう

30日で、自分専用のタスク管理アプリを育てていきます。
Day 01 で土台は立ち上がった。
ルートの入口と、そこから入る最小のダッシュボードももうできています。
今日はその土台に「自分の気配」を入れていく日です。

ダッシュボードに自分の名前や今日の集中テーマが出るだけで、
画面は急に「教材の見本」から「自分のプロダクト」に変わり始める。

今日は `src/app/dashboard/page.tsx` だけを触る。
そのぶん、1ファイルの中で
「どういう情報を持たせるか」
「どう見せるか」
「どこまでを Server Component のまま保つか」
を丁寧にやっていこう。

## このDayで君が手に入れるもの

Day 01 の最後に作った最小ダッシュボードをベースにして、
「Hello Task-App」だけだった画面を、
自分の名前・時間帯に合ったあいさつ・今日の集中テーマが見える
自分専用のダッシュボードへ育てられるようになります。

- 画面の主役になるメッセージカードをつくる
- そのメッセージに意味のある情報を添える
- design token を崩さず見た目を整える
- いらない `"use client"` を付けずに仕上げる

ここまでやると、
次の Day で GitHub に保存するときも
「ちゃんと自分で手を入れた一歩目だな」と実感しやすいです。

【スクリーンショット】Day 02 完成時のダッシュボード
![Day 02 完成時のダッシュボード](./screenshots/day02/dashboard-message.png)

![Day 02 作業前のダッシュボード](./screenshots/day02-before.png)

![Day 02 メッセージカードを追加した途中状態](./screenshots/day02-step3-card.png)

## 今日のゴール（G0 Foundation の2日目）

- [ ] Day 01 の完成状態から作業を再開する
- [ ] `src/app/dashboard/page.tsx` の現在地を確認する
- [ ] 自分だけのメッセージカードをダッシュボードに追加する
- [ ] 時間帯に応じたあいさつを関数で組み立てる
- [ ] 小さな情報カードも添えて、ダッシュボードらしい密度にする
- [ ] Server Component のまま書く意味を Before/After で理解する

### 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| use client | ユーズクライアント | ブラウザ側で動くと宣言する | 「窓口で記入してください」という指示 |
| const | コンスト | 変更できない変数を宣言する | 名札。一度つけたら付け替えない |
| Tailwind CSS | テイルウィンド | クラス名でスタイルを指定する CSS フレームワーク | 見た目シール |
| import / export | インポート / エクスポート | 他ファイルから部品を持ってくる / 渡す | 別の部屋から道具を借りる / 貸す |

## 前提（Day 01 完了していること）

今日は Day 01 の続きから進めます。
なので、次の状態になっていることが前提です。

- `~/workspace/task-app` みたいな自分の作業ディレクトリに `task-app` がある
- `npm install` 済みで、`npm run dev` が動く
- `src/app/globals.css` に token ベースの色や radius が入っている
- `src/app/page.tsx` から `/dashboard` に入れる
- ダッシュボードに `Hello Task-App` と出る最初の画面がある

まだこの状態になっていなければ、
先に Day 01 を完了させてから戻ってきてほしい。

### 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| React コンポーネント | — | `export default function` で定義する画面の部品。1ファイル = 1コンポーネントが基本 | レゴの完成ブロック。他のページからも呼び出せる |
| TypeScript | タイプスクリプト | JavaScript に「型」（変数に入る値の種類）を付けた言語 | 「この箱には文字しか入れてはいけない」という注意書き付き JavaScript |
| Tailwind CSS | テイルウィンド | クラス名でスタイルを当てる CSS フレームワーク | `text-red-500` と書くだけで赤い文字になる便利ツール |

> **React のコードを初めて自分で書く日。** `export default function` や `className` は今日から何度も出てくる「定番の形」。今日はこの形に慣れるだけで OK。

## 今日のワクワクポイント

ダッシュボードって、
その日いちばん最初に目に入る場所です。
朝開いたときに
「お、今日はこれ進める日だな」
と気持ちが前に出る画面にできたら、
単なる練習から一段上がります。

## 前日からの状態確認

まずは、Day 01 で作った状態を確認しよう。
今日は新しいプロジェクトを作り直したりしません。
**昨日の続きの `task-app` を、そのまま育てる** のが今日のテーマです。

先に `http://localhost:3000` を開いて、
`ダッシュボードへ入る` ボタンから `/dashboard` に移動できることも見ておこう。

### 起動確認

まだ開発サーバーを立ち上げていなければ、
プロジェクトのルートで起動します。

```bash
npm run dev
```

### Day 01 直後の `src/app/dashboard/page.tsx`

この Day では、
Day 01 の最後に作った次のようなシンプルな状態から始める想定で進めます。

`~/workspace/task-app/src/app/dashboard/page.tsx` を開いて、
まずは「今ここにいるのだな」という基準を揃えよう。

```tsx
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

この時点では、まだ「アプリの箱」が立った状態です。
今日はここに自分の名前と今日の空気を入れていきます。

## Step 1: 自分だけのメッセージを、まず1枚のカードにする

いきなり情報を盛りすぎると見失いやすいです。
なので最初は、**主役のメッセージカード1枚だけ** を作ります。

ここで入れるのは次の3つです。

- 誰のダッシュボードなのか
- 今日は何に集中したいのか
- 開いた瞬間に気分が上がる一言

### 編集アンカー

`~/workspace/task-app/src/app/dashboard/page.tsx` を開いて、
**ファイルの先頭から最後まで全部置き換える**。

Day 01 と同じで、
この段階は部分修正より丸ごと差し替えたほうが流れを掴みやすいです。

```tsx
const ownerName = 'Kouiso';
const focusTheme = 'Day 02 のダッシュボードづくり';
const encouragement = '今日の一歩が、そのまま自分のアプリの顔になる。';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              G0 Foundation
            </p>
            <h1 className="text-lg font-semibold text-card-foreground">
              My Dashboard
            </h1>
          </div>

          <div className="inline-flex w-fit items-center rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            Day 02 Progress
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
          <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-md">
            <div className="border-b border-border px-8 py-6">
              <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                Personal Message
              </span>

              <h2 className="mt-6 text-4xl font-semibold tracking-tight text-card-foreground sm:text-5xl">
                こんにちは、{ownerName}さん。
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                今日の集中テーマは
                <span className="font-semibold text-foreground"> {focusTheme}</span>
                だ。
                この1枚から、自分だけのダッシュボードを育てていこう。
              </p>
            </div>

            <div className="bg-secondary px-8 py-6">
              <p className="text-sm leading-8 text-secondary-foreground">
                {encouragement}
              </p>
            </div>
          </article>
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
          <aside className="space-y-4">
            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                今日の狙い
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                ただの見出しではなく、
                開いた瞬間に「これは自分の画面や」と分かるメッセージを置く。
              </p>
            </article>

            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                今の変化
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                `Hello Task-App` から、
                自分の名前と今日のテーマが見えるダッシュボードへ進んだ。
              </p>
            </article>
          </aside>
        </section>
      </div>
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
    </main>
  );
}
```

### ここで見てほしいポイント

- `ownerName` みたいに、意味のある名前で文字列を置いている
- `bg-card` や `text-muted-foreground` を使って、Day 01 の token 設計に乗っている
- まだ `"use client"` は付けていない

この段階で大事なんは、
**何のための値かが名前から分かる** 状態にすることです。

### ブラウザ確認

- 見出しが `Hello Task-App` から変わっている
- `こんにちは、Kouisoさん。` が主役として見える
- 右側に小さな補助カードが2枚並ぶ

まだこれでも十分よいです。
でも、ここからもう一歩進めます。

## Step 2: 時間帯に合うあいさつを関数で組み立てる

次は、
メッセージをただベタ書きするんじゃなくて、
**時間帯に合わせて少しだけ表情が変わる** ようにします。

朝なら「おはよう」、
昼なら「こんにちは」、
夜なら「こんばんは」。
この分岐は小さいけど、
「その場に文字列を直書きし続ける」状態から抜ける最初の練習になります。

### 編集アンカー

同じく `~/workspace/task-app/src/app/dashboard/page.tsx` を開いて、
**ファイル全体を次の内容に置き換える**。

```tsx
type DashboardOwner = {
  name: string;
  role: string;
  todayFocus: string;
  todayGoal: string;
};

const dashboardOwner: DashboardOwner = {
  name: 'Kouiso',
  role: 'Builder of Task App',
  todayFocus: 'ダッシュボードに自分だけのメッセージを追加する',
  todayGoal: 'Day 02 のうちに、自分の言葉が乗った画面にする',
};

function getGreetingByHour(hour: number): string {
  if (hour < 12) {
    return 'おはよう';
  }

  if (hour < 18) {
    return 'こんにちは';
  }

  return 'こんばんは';
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
}

function buildMainMessage(owner: DashboardOwner, hour: number): string {
  const greeting = getGreetingByHour(hour);

  return `${greeting}、${owner.name}さん。今日は ${owner.todayFocus} を前に進める日だ。`;
}

export default function DashboardPage() {
  const currentHour = new Date().getHours();
  const mainMessage = buildMainMessage(dashboardOwner, currentHour);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              G0 Foundation
            </p>
            <h1 className="text-lg font-semibold text-card-foreground">
              My Dashboard
            </h1>
          </div>
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
          <div className="inline-flex w-fit items-center rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            Day 02 Progress
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-md">
            <div className="border-b border-border px-8 py-6">
              <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                Personal Message
              </span>

              <h2 className="mt-6 text-4xl font-semibold tracking-tight text-card-foreground sm:text-5xl">
                {mainMessage}
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                今の役目は
                <span className="font-semibold text-foreground"> {dashboardOwner.todayGoal}</span>
                。
                小さくても、自分の言葉が乗った画面は一気にプロダクトらしくなる。
              </p>
            </div>
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
            <div className="grid gap-4 bg-secondary px-8 py-6 sm:grid-cols-2">
              <div className="rounded-2xl bg-background px-4 py-4 shadow-xs">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Owner
                </p>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  {dashboardOwner.name}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {dashboardOwner.role}
                </p>
              </div>

              <div className="rounded-2xl bg-background px-4 py-4 shadow-xs">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Focus
                </p>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  Day 02
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {dashboardOwner.todayFocus}
                </p>
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
              </div>
            </div>
          </article>

          <aside className="space-y-4">
            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                時間帯で変わる理由
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                同じダッシュボードでも、
                開く時間でひと言の空気が変わると、画面に体温が出る。
              </p>
            </article>

            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                今日の学び
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                値を並べるだけでなく、
                関数にして意味を持たせると読みやすさが一段上がる。
              </p>
            </article>
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
          </aside>
        </section>
      </div>
    </main>
  );
}
```

### この段階で入った考え方

- `DashboardOwner` という型で、どんな情報を持たせるか先に決めた
- `getGreetingByHour` が、時間帯ごとのルールを引き受けている
- `buildMainMessage` が、メッセージの組み立て役になっている

こうしておくと、
後で名前や肩書きや集中テーマを変えたくなっても、
どこを触ればよいか見失いにくいです。

## Step 3: メッセージの横に、ダッシュボードらしい情報を添える

主役のメッセージができたら、
その横に小さな情報カードを添えていきます。

ここで狙っているのは、
本格的なレポート機能を先取りすることではありません。
**メッセージが孤立せず、ダッシュボード全体の文脈の中に置かれている**
と感じられる密度を出すことです。

今日は次の3種類を置こう。

- いまの役割
- 今日のフォーカス
- 次にやること

### 編集アンカー

もう一度 `~/workspace/task-app/src/app/dashboard/page.tsx` 全体を置き換える。
この Step が、Day 02 の完成版になります。

```tsx
type DashboardOwner = {
  name: string;
  role: string;
  todayFocus: string;
  todayGoal: string;
  nextAction: string;
};

type FocusCard = {
  label: string;
  value: string;
  description: string;
};

const dashboardOwner: DashboardOwner = {
  name: 'Kouiso',
  role: 'Builder of Task App',
  todayFocus: 'ダッシュボードに自分だけのメッセージを追加する',
  todayGoal: '教材の見本ではなく、自分の画面として立つ一枚にする',
  nextAction: 'Day 03 で GitHub に保存できる状態まで持っていく',
};

function getGreetingByHour(hour: number): string {
  if (hour < 12) {
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
    return 'おはよう';
  }

  if (hour < 18) {
    return 'こんにちは';
  }

  return 'こんばんは';
}

function buildMainMessage(owner: DashboardOwner, hour: number): string {
  const greeting = getGreetingByHour(hour);

  return `${greeting}、${owner.name}さん。今日は ${owner.todayFocus} を前に進める日だ。`;
}

export default function DashboardPage() {
  const currentHour = new Date().getHours();
  const mainMessage = buildMainMessage(dashboardOwner, currentHour);
  const focusCards: FocusCard[] = [
    {
      label: 'Owner',
      value: dashboardOwner.name,
      description: dashboardOwner.role,
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
    },
    {
      label: 'Today',
      value: 'Day 02',
      description: dashboardOwner.todayGoal,
    },
    {
      label: 'Next',
      value: 'Day 03',
      description: dashboardOwner.nextAction,
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              G0 Foundation
            </p>
            <h1 className="text-lg font-semibold text-card-foreground">
              My Dashboard
            </h1>
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
          </div>

          <div className="inline-flex w-fit items-center rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            Personalized Message Ready
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-md">
            <div className="border-b border-border px-8 py-6">
              <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                Personal Message
              </span>

              <h2 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-card-foreground sm:text-5xl">
                {mainMessage}
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                今日は
                <span className="font-semibold text-foreground"> {dashboardOwner.todayGoal}</span>
                を意識して進める。
                ただ文字を置くのではなくて、
                ダッシュボードに自分の意図が見える状態を作るのが狙いだ。
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
              </p>

              <div className="mt-8 inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm">
                Focus: {dashboardOwner.todayFocus}
              </div>
            </div>

            <div className="grid gap-4 bg-secondary px-8 py-6 md:grid-cols-3">
              {focusCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-2xl border border-border bg-background px-4 py-4 shadow-xs"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {card.description}
                  </p>
                </article>
              ))}
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
            </div>
          </article>

          <aside className="space-y-4">
            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                今日のワンフレーズ
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                自分の名前が入るだけでも、
                ダッシュボードは急に「使う画面」に変わる。
              </p>
            </article>

            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                ここで増えた価値
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                画面の主役が明確になって、
                次にタスク数やプロジェクト情報を足す余地も見えやすくなった。
              </p>
            </article>

```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                次につながる視点
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                Day 03 ではこの変化を失わないように、
                ちゃんと履歴として残していく段階へ進む。
              </p>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
```

### 完成版で見てほしいこと

- 主役は大きいメッセージカードに集約されている
- 補助情報は `focusCards` 配列に寄せている
- 色は token 名で読めるようにしている
- 動きがない画面なので Server Component のまま保っている

ここまで来たら、Day 02 の狙いはちゃんと達成できてる。

## Step 4: 保存して、ブラウザで「自分の画面」に変わったか確認する

仕上げたら、
ブラウザで見直そう。

もし開発サーバーを止めているなら、
もう一度起動します。

```bash
npm run dev
```

### チェックポイント

- メイン見出しが時間帯によって変わる
- `Kouiso` の名前が画面に出る
- `Focus:` のバッジが主役色で見える
- 下段に `Owner` `Today` `Next` の3カードがある
- 右側の補助カードまで含めて、画面全体が「ダッシュボード」として見える

### うまくいかないときの見直し順

1. `src/app/dashboard/page.tsx` を途中だけ貼り換えていないか確認する
2. 文字列のクオートやバッククオートを打ち間違えていないか見る
3. `focusCards.map` の丸かっこや波かっこの閉じ忘れがないか見る
4. 一度保存してからブラウザを再読み込みする

## Pro パターンで書こう — ダッシュボードのメッセージは Server Component を標準にする

ここまでで動くコードは書けた。
でもプロの現場ではもう一段上の書き方をします。
なぜ上の書き方をするのか、**Before/After** で見比べてみよう。

今日の文脈で言うと、
「自分だけのメッセージを表示したい」というだけなら、
ブラウザで状態を持つ必要はありません。
なのに最初から `"use client"` を付けると、
必要ない JavaScript まで配る方向に寄っていきます。

### Before（動くけど、プロは書かない）

```tsx
'use client';

import { useMemo } from 'react';

type DashboardOwner = {
  name: string;
  role: string;
  todayFocus: string;
  todayGoal: string;
  nextAction: string;
};

type FocusCard = {
  label: string;
  value: string;
  description: string;
};

const dashboardOwner: DashboardOwner = {
  name: 'Kouiso',
  role: 'Builder of Task App',
  todayFocus: 'ダッシュボードに自分だけのメッセージを追加する',
  todayGoal: '教材の見本ではなく、自分の画面として立つ一枚にする',
  nextAction: 'Day 03 で GitHub に保存できる状態まで持っていく',
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
};

function getGreetingByHour(hour: number): string {
  if (hour < 12) {
    return 'おはよう';
  }

  if (hour < 18) {
    return 'こんにちは';
  }

  return 'こんばんは';
}

function buildMainMessage(owner: DashboardOwner, hour: number): string {
  const greeting = getGreetingByHour(hour);

  return `${greeting}、${owner.name}さん。今日は ${owner.todayFocus} を前に進める日だ。`;
}

export default function DashboardPage() {
  const currentHour = new Date().getHours();
  const mainMessage = useMemo(() => {
    return buildMainMessage(dashboardOwner, currentHour);
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
  }, [currentHour]);
  const focusCards: FocusCard[] = [
    {
      label: 'Owner',
      value: dashboardOwner.name,
      description: dashboardOwner.role,
    },
    {
      label: 'Today',
      value: 'Day 02',
      description: dashboardOwner.todayGoal,
    },
    {
      label: 'Next',
      value: 'Day 03',
      description: dashboardOwner.nextAction,
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              G0 Foundation
            </p>
            <h1 className="text-lg font-semibold text-card-foreground">
              My Dashboard
            </h1>
          </div>

          <div className="inline-flex w-fit items-center rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            Personalized Message Ready
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-md">
            <div className="border-b border-border px-8 py-6">
              <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                Personal Message
              </span>

              <h2 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-card-foreground sm:text-5xl">
                {mainMessage}
              </h2>

```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                今日は
                <span className="font-semibold text-foreground"> {dashboardOwner.todayGoal}</span>
                を意識して進める。
                ただ文字を置くのではなくて、
                ダッシュボードに自分の意図が見える状態を作るのが狙いだ。
              </p>

              <div className="mt-8 inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm">
                Focus: {dashboardOwner.todayFocus}
              </div>
            </div>

            <div className="grid gap-4 bg-secondary px-8 py-6 md:grid-cols-3">
              {focusCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-2xl border border-border bg-background px-4 py-4 shadow-xs"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {card.value}
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {card.description}
                  </p>
                </article>
              ))}
            </div>
          </article>

          <aside className="space-y-4">
            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                今日のワンフレーズ
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                自分の名前が入るだけでも、
                ダッシュボードは急に「使う画面」に変わる。
              </p>
            </article>

            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                ここで増えた価値
              </p>
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                画面の主役が明確になって、
                次にタスク数やプロジェクト情報を足す余地も見えやすくなった。
              </p>
            </article>

            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                次につながる視点
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                Day 03 ではこの変化を失わないように、
                ちゃんと履歴として残していく段階へ進む。
              </p>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
```

**このコードの問題点**:

- メッセージ表示だけのために page 全体を Client Component にしてしまっている
- `useMemo` を使っているけど、ここでは計算が軽くて効果が薄く、読み手の負担だけ増えやすい
- 後で本当に client 化が必要な部品を足したとき、境界が曖昧になって設計がぶれやすい

### After（プロが書くコード）

```tsx
// filepath: src/app/dashboard/page.tsx
type DashboardOwner = {
  name: string;
  role: string;
  todayFocus: string;
  todayGoal: string;
  nextAction: string;
};

type FocusCard = {
  label: string;
  value: string;
  description: string;
};

const dashboardOwner: DashboardOwner = {
  name: 'Kouiso',
  role: 'Builder of Task App',
  todayFocus: 'ダッシュボードに自分だけのメッセージを追加する',
  todayGoal: '教材の見本ではなく、自分の画面として立つ一枚にする',
  nextAction: 'Day 03 で GitHub に保存できる状態まで持っていく',
};

function getGreetingByHour(hour: number): string {
  if (hour < 12) {
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
// filepath: 続き
    return 'おはよう';
  }

  if (hour < 18) {
    return 'こんにちは';
  }

  return 'こんばんは';
}

function buildMainMessage(owner: DashboardOwner, hour: number): string {
  const greeting = getGreetingByHour(hour);

  return `${greeting}、${owner.name}さん。今日は ${owner.todayFocus} を前に進める日だ。`;
}

export default function DashboardPage() {
  const currentHour = new Date().getHours();
  const mainMessage = buildMainMessage(dashboardOwner, currentHour);
  const focusCards: FocusCard[] = [
    {
      label: 'Owner',
      value: dashboardOwner.name,
      description: dashboardOwner.role,
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
// filepath: 続き
    },
    {
      label: 'Today',
      value: 'Day 02',
      description: dashboardOwner.todayGoal,
    },
    {
      label: 'Next',
      value: 'Day 03',
      description: dashboardOwner.nextAction,
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              G0 Foundation
            </p>
            <h1 className="text-lg font-semibold text-card-foreground">
              My Dashboard
            </h1>
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
// filepath: 続き
          </div>

          <div className="inline-flex w-fit items-center rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            Personalized Message Ready
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-md">
            <div className="border-b border-border px-8 py-6">
              <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                Personal Message
              </span>

              <h2 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-card-foreground sm:text-5xl">
                {mainMessage}
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                今日は
                <span className="font-semibold text-foreground"> {dashboardOwner.todayGoal}</span>
                を意識して進める。
                ただ文字を置くのではなくて、
                ダッシュボードに自分の意図が見える状態を作るのが狙いだ。
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
// filepath: 続き
              </p>

              <div className="mt-8 inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm">
                Focus: {dashboardOwner.todayFocus}
              </div>
            </div>

            <div className="grid gap-4 bg-secondary px-8 py-6 md:grid-cols-3">
              {focusCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-2xl border border-border bg-background px-4 py-4 shadow-xs"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {card.description}
                  </p>
                </article>
              ))}
```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
// filepath: 続き
            </div>
          </article>

          <aside className="space-y-4">
            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                今日のワンフレーズ
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                自分の名前が入るだけでも、
                ダッシュボードは急に「使う画面」に変わる。
              </p>
            </article>

            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                ここで増えた価値
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                画面の主役が明確になって、
                次にタスク数やプロジェクト情報を足す余地も見えやすくなった。
              </p>
            </article>

```

**確認ポイント**: ここまで写経できました。次のブロックを続けて書きます。

```tsx
// filepath: 続き
            <article className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold text-card-foreground">
                次につながる視点
              </p>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                Day 03 ではこの変化を失わないように、
                ちゃんと履歴として残していく段階へ進む。
              </p>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
```

**このコードの強み**:

- 表示だけなら Server Component のままで十分だと判断できている
- page の責務が「データを組み立てて UI を返す」に収まっていて読みやすい
- 本当に操作が必要になったときだけ、小さい部品を Client Component に切り出しやすい

#### 覚えておきたいエッセンス

ダッシュボードにメッセージを出すだけなら、
**まず Server Component** が基本です。

最初から page 全体を client 化するのではなくて、
本当にブラウザ側の操作が必要な瞬間だけ client を足す。
この順番が、あとで効いてきます。

## 覚えておきたいエッセンス

今日の本質は、
**ダッシュボードの主役を決めて、その主役に意味のある情報を添えた**
ことです。

覚えておいてほしいのはこの3つ。

- 自分だけの画面は、まず名前と意図が見えるところから始まる
- 値はその場で散らすより、型や関数で意味を持たせたほうが育てやすい
- 動かない UI まで client にしません。Server Component を標準に考える

この3つが入るだけで、
Day 02 のコードはかなり「プロダクトを育てる書き方」に近づく。

## 次回予告

Day 03 では、
今日つくったこの変化をちゃんと履歴として残していきます。

せっかく自分の画面が立ち始めたのに、
ローカルだけで消えてしまったらもったいません。

次は GitHub に保存して、
「自分で育てたアプリの進化」を積み上げていける状態にしていこう。
