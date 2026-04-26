# G0 Foundation Verdict — 2026-04-19

**対象**: material/30days-curriculum/day01〜day04
**合計行数**: 3852 行 (Day01: 995, Day02: 995, Day03: 989, Day04: 873)
**総合判定**: NO-GO

## 6 軸評価

### A. 完走性 — FAIL
Day 01 の前提は「`Node.js 20` 以上 / `npm 10` 以上 / PostgreSQL を使える状態 / エディタ / ターミナル / ブラウザ」で始まっている。一方で Day 01 の出口は「Day 02 では、今日つくった最初の画面に、自分だけのメッセージや情報を足していく。」となっている。

Day 02 の前提は「`src/app/globals.css` に token ベースの色や radius が入っている」「ルートからダッシュボードへ入れる」「ダッシュボードに `Hello Task-App` と出る最初の画面がある」。

Day 03 の前提は「`src/app/dashboard/page.tsx` に Day 02 の自分用ダッシュボードがある」「`.env.example` が置かれている」「`.gitignore` が置かれている」で、次回予告は「Day 04 では Vercel につないで、自分の `task-app` を実際の URL で開ける状態まで持っていこう。」。

Day 04 の前提は「Day 03 で GitHub に push した自分のリポジトリがある」「GitHub のブラウザ画面で `task-app` のファイル一覧を見られる」で、出口は「次からは G1 Auth に入る。Day 05 では、ログイン UI の導入から始める。」。

Day 02→03、Day 03→04、Day 04→05 は自然につながっているが、Day 01→02 だけが切れている。Day 01 本文は `src/app/page.tsx` の編集を主導し、`dashboard/page.tsx` への導線が本文内で確認できないのに、Day 02 は `src/app/dashboard/page.tsx` と「ルートからダッシュボードへ入れる」を前提にしている。空ディレクトリから Day 04 まで「詰まらず走り切れる」とはまだ言えない。

### B. Scaffold-first — PASS
検証コマンド:

```bash
rg -n "git clone|gh repo clone|既存のコードを開" material/30days-curriculum/day0{1,2,3,4}_*.md
```

結果: 0 hit。

Day 01 は「空のディレクトリから始める」「`scripts/scaffold-from-scratch.sh` を実行して、土台を一発で作る」で統一されており、G0 の 4 日間に `git clone` / `gh repo clone` / 「既存のコードを開く」は出てこない。

### C. src/ ceiling — PASS
検証コマンド:

```bash
rg -n "as any|: any| as unknown|@ts-ignore|@ts-expect-error" material/30days-curriculum/day0{1,2,3,4}_*.md
```

結果: 0 hit。

教材内コードに `any` / `as` / `@ts-ignore` 系の逃げは見当たらない。

### D. Before/After 教示 — PASS
検証コマンド:

```bash
rg -c "### ❌ Before|### ✅ After" material/30days-curriculum/day0{1,2,3,4}_*.md
```

結果:

- Day01: 2
- Day02: 2
- Day03: 2
- Day04: 2

各 Day のテーマ:

- Day01: `arbitrary value 多用より design token を先に切る`
- Day02: `ダッシュボードのメッセージは Server Component を標準にする`
- Day03: `GitHub に送る日は git add . ではなく、残したいファイルを選ぶ`
- Day04: `build を通してから公開する`

### E. ワクワク感 — PASS
各 Day とも「動いた」「見せたい」が本文の中心に置かれている。

- Day01: 「`http://localhost:3000` に最初の画面を出せるようになる。」「SNS に貼っても『教材の練習感』が薄い一枚目に変える。」「『動く』と『ちょっと見せたくなる』の両方を、最初の日に取れた。」
- Day02: 「朝開いたときに『お、今日はこれ進める日やな』と気持ちが前に出る画面にできたら、単なる練習から一段上がる。」「ダッシュボードは急に『教材の見本』から『自分のプロダクト』に変わり始める。」
- Day03: 「ブラウザで `https://github.com/<自分のユーザー名>/task-app` みたいな URL を開いて、Day 01 から Day 03 までの自分の積み上げが見えるようになる。」
- Day04: 「友だちに『これ、今作ってるやつ』と URL を送る」「スマホで自分のアプリを開く」「SNS に『Day 04 で初公開できた』と貼る」「ちょっと自慢してええ。」

Day 02 の「動いた瞬間」と Day 04 の「公開 URL」が特に強く、G0 の商品体験としては十分ワクワクさせられている。

### F. 商品信頼性 — FAIL
検証コマンド:

```bash
rg -n "User Admin|3002|git reset --hard|// \\.\\.\\.$|// 省略|// rest" material/30days-curriculum/day0{1,2,3,4}_*.md
```

結果: 0 hit。

禁止語、破壊コマンド、露骨な省略記法は出ていない。ポート番号も `http://localhost:3000` で一貫している。

ただし、パスと到達状態の一貫性に破綻がある。Day 01 は `src/app/page.tsx` を「最初の画面」として完成させる流れなのに、Day 02 は「Day 01 で作ったダッシュボードをベースにして」「`src/app/dashboard/page.tsx` の現在地を確認する」ことを前提にしている。教材上の“前日の完成状態”が一致していないため、商品としての信頼性は PASS まで届かない。

## Narrative Unit Checks

1. Day 01 末の 次回予告 → Day 02 冒頭の 前提 が整合 — FAIL
   Day 01: 「今日つくった最初の画面に、自分だけのメッセージや情報を足していく。」
   Day 02 冒頭: 「今日は `src/app/dashboard/page.tsx` だけを触る。」
   Day 02 前提: 「ルートからダッシュボードへ入れる」「ダッシュボードに `Hello Task-App` と出る最初の画面がある」。
   Day 01 本文で `dashboard/page.tsx` への明示的な到達が読めず、接続が飛んでいる。

2. Day 02 末 → Day 03 冒頭 整合 — PASS
   Day 02: 「次は GitHub に保存して、『自分で育てたアプリの進化』を積み上げていける状態にしていこう。」
   Day 03 冒頭: 「Day 02 でダッシュボードに自分の気配を入れた。今日はその変化を、自分のパソコンの中だけで終わらせへん日や。」

3. Day 03 末 → Day 04 冒頭 整合 — PASS
   Day 03: 「Day 04 では Vercel につないで、自分の `task-app` を実際の URL で開ける状態まで持っていこう。」
   Day 04 冒頭: 「Day 03 で GitHub に保存した。」「Day 03 で GitHub に保存した **自分の `task-app`** を、Vercel に接続して公開し、本物の URL で開ける状態まで持っていけるようになる。」

4. Day 04 末 G0 修了 ふりかえり → Day 05 (G1 Auth) への橋渡しを予告 — PASS
   Day 04 ふりかえり: 「ここまで来たら、Day 05 からの G1 Auth も、『教材を消化する』やなくて『この公開済みアプリをもっと育てる』感覚で進めやすくなる。」
   次回予告: 「次からは G1 Auth に入る。Day 05 では、ログイン UI の導入から始める。」

5. ポート番号 / ファイルパス / コンポーネント名の表記ゆれが無い — FAIL
   ポート番号は `localhost:3000` で統一されている。
   ただし、Day 01 の主編集対象は `src/app/page.tsx` の `HomePage`、Day 02 以降の主編集対象は `src/app/dashboard/page.tsx` の `DashboardPage` で、Day 01 から Day 02 へ移る理由と到達手順が教材本文上で回収されていない。表記ゆれというより、到達状態の定義ずれがある。

6. 関西弁メンタートーンが 4 Day で一貫 — PASS
   Day01: 「完全一致でなくてええ。」「初期セットアップは完了やで。」
   Day02: 「先に Day 01 を完了させてから戻ってきてな。」
   Day03: 「せやから保存先は空でええ。」「最後はブラウザで GitHub ページを開いて、ほんまに見えているところまで確認する」
   Day04: 「ちょっと自慢してええ。」「ここは素直に味わってええで。」
   語尾、励まし方、メンター距離感は 4 日通しで崩れていない。

## 発見された問題 (BLOCKER / MAJOR / MINOR)

### BLOCKER (shipping impossible)
- Day 01 の完了状態と Day 02 の前提状態が一致していない。Day 01 は `src/app/page.tsx` を中心に進めるのに、Day 02 は `src/app/dashboard/page.tsx` と「ルートからダッシュボードへ入れる」を既成事実として要求している。G0 の最重要軸である完走性を壊しているため、修正なし出荷は不可。

### MAJOR (ship-ready but should fix)
- なし。

### MINOR (nice to have)
- Day 01 だけワクワク/まとめ見出しの命名が Day 02-04 と少し違う。内容品質は高いが、レビュー運用上は `今日のワクワクポイント` / `まとめ` 系の見出しに寄せると横断確認がさらにしやすい。

## 総合判定 & 次アクション
- NO-GO: BLOCKER 修正必須
- 修正方針はどちらかに寄せる必要がある。
- 案1: Day 01 の終盤で `src/app/dashboard/page.tsx` と「ルートからダッシュボードへ入れる」状態まで明示的に作らせ、Day 02 前提と一致させる。
- 案2: Day 02 の前提と導入文を、Day 01 の実際の着地点である `src/app/page.tsx` ベースに書き換える。
- BLOCKER 解消後に、A と F を再判定して GO へ上げる。

## BLOCKER Resolution (2026-04-19)

Option A を採用した。Day 01 の終盤に `4-3. 明日につながる dashboard/page.tsx を作る` を追加し、`src/app/page.tsx` の完成コードに `Link` を使った `/dashboard` 導線を入れたうえで、`src/app/dashboard/page.tsx` の最小プレースホルダー作成手順を明示した。あわせて Day 01 のチェックリスト・ブラウザ確認・明日のプレビューも、ルートが入口で `/dashboard` が Day 02 の土台になる流れに更新した。

Day 02 は軽微修正に留めた。冒頭の導入文と「このDayで君が手に入れるもの」を Day 01 最終状態に合わせて調整し、前提の「ルートからダッシュボードへ入れる」を `src/app/page.tsx` から `/dashboard` に入れる形へ具体化した。さらに「前日からの状態確認」にルートから `/dashboard` へ移動する確認を足し、「Day 01 直後の `src/app/dashboard/page.tsx`」が Day 01 の最後に作った最小ダッシュボードであることを明記した。
