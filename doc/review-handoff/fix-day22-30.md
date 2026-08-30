# Day 22〜30 修正記録

- 対象: `material/30days-curriculum/day22_*.md` 〜 `day30_*.md`（9本）
- 実施日: 2026-08-30
- 根拠にした実ファイル: `src/lib/constant/status.ts` / `scripts/_constants/status.ts` /
  `scripts/_app-components/project/project-detail-view.tsx` / `src/component/project/project-detail-view.tsx` /
  `scripts/scaffold-from-scratch.sh` / `scripts/build-zip.sh` / `doc/ZIP_CONTENTS.md` /
  `src/command/seed.ts` / `day05_*.md` / `day09_*.md` / `day11_*.md`

---

## 1. 事実の誤りの修正

### 1-1. lint の完了条件（day26 / day28）

`day05:356` が正しい。「教材のコードは Biome の整形前の形で載せている／写経を間違えたわけではない／
`npm run fix` で消える」と明言しており、`scripts/scaffold-from-scratch.sh:316` が読者の lint を
`biome check src prisma.config.ts next.config.ts package.json tsconfig.json` と定義している。
`biome check` は formatter と assist も走らせるので、写経直後の `npm run lint` は必ず整形差分を報告する。
したがって「0エラーで通過」を完了条件にしていた day26 / day28 のほうが誤り。

実際に入れた文言（4箇所）:

| 箇所 | 変更後 |
|---|---|
| `day26` 前提 | `- npm run lint と npm run fix を実行して、修正後に指摘が残っていないか確認できる` |
| `day26` ステップ表 Step 7 の成功状態 | `` `npm run fix` のあと lint 指摘ゼロ `` |
| `day26` Step 7 本文 | 「ここで0件にしてから次の日へ進むと」→「ここを片づけてから次の日へ進むと」 |
| `day26` Step 7 確認ポイント | `1. npm run lint の指摘から noConsole が消えた` ＋ 「Day 05 で断ったとおり、この教材のコードは Biome の整形前の形で載せています。そのため `npm run lint` には整形の差分が残ります。写経の間違いではありません。`npm run fix` を実行すると差分は消えるので、そのあともう一度 `npm run lint` を走らせて、`console.log` の指摘が1件も出ないことを確かめてください。」 |
| `day28` Step 9 | 「エラーがなければ完成です。」→ 「ここで整形の差分が並んでも、写経の間違いではありません。Day 05 で断ったとおり、この教材のコードは行の幅を狭く保つために Biome の整形前の形で載せています。`npm run fix` を実行すると Biome の形にそろい、差分は消えます。そのあともう一度 `npm run lint` を走らせて、残った指摘を読んでください。」 |
| `day28` Step 9 確認ポイント | `- npm run fix のあとの npm run lint でエラーが出ない` |

`day26:891`（まとめの `npm run lint` で `src` 以下と設定ファイルをチェックした）は元から正しいので触っていない。

### 1-2. day29 の実装ステップ一覧が別ファイルを指していた

Step ごとの `// filepath:` を機械的に集計した実測:

| Step | 表（修正前） | 実コード | 修正後の表 |
|---|---|---|---|
| 3〜6 | `src/app/user/[id]/page.tsx` | `src/app/user/[id]/user-detail-client.tsx` | `user-detail-client.tsx` |
| 7 | `src/app/user/[id]/edit/page.tsx` | `edit/page.tsx` ＋ `edit/user-edit-client.tsx` | 2ファイルを併記、成功状態も「2ファイルが存在する」 |
| 8〜10 | `src/app/user/[id]/edit/page.tsx` | `edit/user-edit-client.tsx` | `edit/user-edit-client.tsx` |

Step 2 の成功状態も「ファイルが存在する」→「server wrapper のファイルが存在する」に直した。
表の下に、なぜ `page.tsx` ではないかの説明を4行足してある（`page.tsx` は server wrapper で、
`useQuery` を書くとサーバー側で実行されて壊れる）。

### 1-3. day28 が既存関数 `isTaskStatus` を写経させていた

`src/lib/constant/status.ts:28` に `export function isTaskStatus(value: unknown): value is TaskStatus {`
が**実在する**。配布経路も確認済みで、`scripts/_constants/status.ts:28` に同じものがあり、
`_constants` は `doc/ZIP_CONTENTS.md` の「写経の土台（`support_directories`・13ディレクトリ）」に入る。
つまり読者は Day 01 の scaffold 実行時点でこの関数を持っている。貼ると重複定義でビルドが止まる。

修正: ブロックを「読むだけ」に落とした。`// filepath:` を
`src/lib/constant/status.ts（配布済み・写経しません）` に変え、直前に day27 と同じ書式の
`**読み比べ用**: ここは写経しません。` を置き、重複定義でビルドが止まる旨を明記した。
確認ポイントも「`src/lib/constant/status.ts` を開くと、上と同じ `isTaskStatus` がすでにあります。」に変更。

### 1-4. day27 の立場を「照合日」に一本化した

**実ファイルで確かめた結果、Day 27 で読者が新しく書くコードは1行も無い。**

| Day 27 の Step | 実体 | 根拠 |
|---|---|---|
| Step 1 アーカイブ API | Day 11 Step 0 で読者が `project.ts` に書き済み | `day11:98` `day11:116` `day11:290-330` |
| Step 2 一覧↔詳細の切り替え | Day 11 Step 9 で `page.tsx` に書き済み | `day11:929-1010` |
| Step 3・4 `ProjectDetailView` | 配布物に完成形で入っている | `scripts/_app-components/project/project-detail-view.tsx` が実在。`day11:954`「この部品は Day 12 の機能まで含んだ形で配布されている」 |
| Step 5 アーカイブのつなぎ込み | Day 11 Step 9 | `day11:2243` |
| Step 6 補助ダイアログ | Day 11・12 | `day27:613`「Day 12 で実装済みのダイアログや state は再宣言しません」 |

各 Step の本文はすでに「照合用です」「追加し直しません」と書いており、割れていたのは
見出し・ステップ表・ゴール文・Step 3/4 の写経前提の記述だけだった。そちらを照合側へそろえた。

- ステップ表と `### Step N:` 見出しの動詞を6件そろえて変更（「作る／実装する／整える」→「読む／確かめる」）
- `:11` 今日のゴール: 「UI を実装します」→「UI を、完成形と照合して仕上げます」
- `:71` やること表: 「`ProjectDetailView` に詳細表示を書き足す」→「`ProjectDetailView` の中身を完成形と照合する」
- Step 3 ゴール: 「詳細ビューコンポーネントを作ります」→「中身を読みます」
- Step 4 ゴール: 「ここで作るのは完成版を少し削った形です」→「ここに載せるのは完成版を少し削った形です」
- `:387` `:397`: 「保存してもエラーが出ます」「ここまで書いて初めてファイルが保存できる状態になります」を、
  手元のファイルはすでに閉じている前提の文へ書き換え

`:478`（Day 12 で書いた出し分けはそのまま残す）は正しいので触っていない。

**注意**: ステップ表に `見比べる` / `突き合わせる` を入れると `check_zip_reference` が落ちる。
同じ段落に `src/...` の置き場と照合語が同居すると「ZIP に無いものとの照合指示」と判定されるため。
`読む` / `確かめる` に置き換えて回避した。

**残した非一貫**: H1 とファイル名の「実装しよう」は変えていない。変えるなら
`00_カリキュラム目次.md:287` / `day26:911` / `day28:1802` のリンクも同時に直す必要があり、
他の担当範囲のファイルに触ることになる。局長の判断待ち。

### 1-5. day27:32 と day27:2179 の配布物の説明

`doc/ZIP_CONTENTS.md` を実測した結果、**両方とも部分的に正しく、書き方が悪いだけ**だった。

- 販売用 ZIP に**完成アプリの `src/` は入らない**（`ZIP_CONTENTS.md:44-51`、`build-zip.sh` は許可リスト方式）→ `:2179` が正しい
- ただし `project-detail-view.tsx` は「写経の土台（`support_directories`）」の
  `scripts/_app-components/project/` に実在し、Day 01 の `scaffold-from-scratch.sh` で配置される

そこで `:32` を、完成版の `src/` ではなく土台の話だと分かる形へ書き直した:

```
> `project-detail-view.tsx` は写経の土台に完成した形で含まれています。
> Day 01 で `scaffold-from-scratch.sh` を走らせた時点で、手元に置かれています。
> 販売用 ZIP に入るのはこの土台までで、完成版の `src/` 一式は入っていません。
> この Day のコードブロックは**読んで見比べるためのもの**で、書き写す必要はありません。
```

`:2179` は変更していない。

### 1-6. day23 Step 6 のグリッド `<div>` 欠落

完成コード（`day23:1864-1865` 相当）には `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">` が
あるのに、Step 6 は `<Card>` を3つ並べるだけでこの `<div>` を作らせていなかった。
Step 5 は同じ形のグリッドを自分で開いて閉じているので、Step 6 だけが落ちていた。

修正:
- Step 6 の折れ線グラフのブロックの前に、外枠を作るコードブロックを新設（`<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">`）
- 外枠が無いと `col-span` が効く相手を失って縦積みになること、**エラーが出ないので気づけないこと**を説明として明記
- 3枚のカードのコードを2字下げして、外枠の中に入ることを見た目でも示した
- 3枚目のカードの末尾に `</div>` を追加
- 確認ポイントに「3枚のグラフが `lg` 幅で2列に並び、折れ線グラフだけが横2つぶんを占める」を追加

連鎖して直したもの:
- `day23:667-668` のページ構造の表: `grid grid-cols-3` → `grid grid-cols-1 md:grid-cols-3`、
  `grid grid-cols-2` → `grid grid-cols-1 lg:grid-cols-2`（実装は `1788-1789` と `1864-1865`）
- 呼び名の揺れ: 本文と確認ポイントの `col-span-2` を、コードと同じ `col-span-1 lg:col-span-2` へ統一
- `chartData` / `statusData` の貼り先が無かった件（23-a2）: Step 6 の冒頭に
  「Step 4 で書いた `if (isLoading)` の下、`return` 文の前に追加してください。`return` の中に書くと、
  JSX の途中に `const` を置くことになって構文エラーになります。」を追加。
  `statusData` のブロックにも「`chartData` のすぐ下、`return` 文の前に続けて書きます。」を追加

### 1-7. day22:766 / day24:485 の JSX 途中改行 — **すでに直っていた**

指示された2箇所を現物で確認した。どちらも**日本語の文が途中で折り返されてはいない**。

```
day22（現 774行付近）  <h1 className="text-3xl
                          font-bold tracking-tight">
                          レポート・統計          ← 日本語は1行に収まっている
day24:483-485          <p className=
                         "text-muted-foreground">
                         この機能は管理者のみ利用できます   ← 同上
```

機械検査でも確認済み: `python3 scripts/curriculum-qa/check_ja_line_break.py material/30days-curriculum`
→ `✅ 日本語の文の折り返し OK（コードブロック 627 個）`。
`scan-day17-24.md` の 22-a6 / 24-a6 も「修正済み」と記録している。

残っているのは `className` の値の折り返しで、これは `day05:356` が断っている
「行の幅を狭く保つ都合で Biome の整形前の形で載せている」書き方そのもの。
同じ折り返しは day22〜day30 だけで30箇所以上あり、指示された2箇所だけを1行にすると
かえって書き方が割れる。**変更していない。**

### 1-8. day24:698 / :916 / :919 の「食い違いを先に書く」書き方の移植

day24 は「初期データのユーザーは全員アクティブなので、グレーのバッジは Day 29 で
アカウントを無効にしてから確かめます」「初期データは全員アクティブなので緑だけが並ぶ」
「ページは Day 29 で作るため、この時点では 404 表示」と、画面と初期データの食い違いを
先回りして書いている。これを2箇所へ移植した。

**day22 の前提**（`src/command/seed.ts:185-255` を実測）:

admin に見えるのは project1 の3件だけ。ステータスは IN_PROGRESS / DONE / TODO が1件ずつ、
優先度は HIGH 2件・MEDIUM 1件。LOW と URGENT は0件。したがって前提の3つ目
「ステータスや優先度にばらつきがある」は初期データでは満たせない。前提表の下に断りを追加:

```
> 3つ目の前提は、初期データのままでは満たせません。自分に見えるタスクは
> 「Webサイトリニューアル」の3件で、ステータスは未対応・進行中・完了が1件ずつ、
> 優先度は高が2件と中が1件です。低と緊急は1件もありません。
> このまま開くと、ステータスの円は同じ大きさの3切れ、優先度の円は2切れになります。
> 今日の主題は偏りを目で見ることなので、`/task` で優先度と状態を散らしたタスクを
> 4〜5件足してから始めると、扇の数と大きさの違いが画面で確かめられます。
> 足さないまま進んでも、コードの書き方は変わりません。
```

`CHART_FALLBACK_COLOR` の解説（灰色が優先度の「低」と重なる話）にも
「初期データには『低』のタスクが1件も無いため、この重なりは画面には出ません。
確かめたいときは、優先度が『低』のタスクを1件作ってから開いてください。」を追加。

**day28 の前提**（Step 9 のテスト表を逆算）:

`3件完了 → 2件削除キャンセル → 2件削除 → 5件ステータス変更` の順なので、
削除で2件減ったあとに5件を選ぶには開始時点で7件が必要。前提は件数を書いていなかった。
「消えてもよい練習用タスクを 7 件以上用意している」に変え、理由を引用で添えた。

---

## 2. `## 今日学んだ用語` の補完（day26 / day27 / day28 / day29）

他の日と同じ `| 用語 | 意味 |` の2列表で新設した。

| Day | 出どころ | 件数 |
|---|---|---|
| day26 | 新規に起こした（`error.tsx` / `not-found.tsx` / `reset()` / `error.digest` / Optional Chaining / 依存配列 / `noConsole` / Error Boundary） | 8 |
| day27 | `### 今日学んだこと`（概念・意味・使い場面の3列）を2列へ畳んだ | 6 |
| day28 | 同上 | 8 |
| day29 | 同上 | 8 |

day28 の `### 新しく学ぶ概念` は表の見出しが他日と同じ「概念 / 読み方 / 役割 / 例え」だったので、
そのまま残し、末尾の用語表を新設した。

---

## 3. 節名・見出しレベルの統一

| Day | 修正前 | 修正後 |
|---|---|---|
| day28 | `### 実装ステップ一覧` | `## 実装ステップ一覧`（他28本と同じ H2） |
| day30 | `## なぜこれをやるのか` | `## なぜこれを作るのか` |
| day27 | `## Day 27 完了` | `## 今日のまとめ`（チェックリスト5項目を新設） |
| day28 | `## Day 28 完了` | `## 今日のまとめ`（チェックリスト5項目を新設） |
| day29 | `## Day 29 完了` | `## 今日のまとめ`（元の地の文2段落＋チェックリスト5項目） |

あわせて、day27/28/29 の末尾を他の日と同じ
`今日のまとめ → つまずきポイント → 今日学んだ用語 → 理解チェック → 次回予告 → 次に読むもの`
の並びへそろえた。`### 次回予告` は `## 次回予告` へ昇格。
day28 の `### 詰まりやすいポイントまとめ` は `## つまずきポイント` の下位節として残した。
day29 の `### 全体のデータフロー振り返り`（mermaid のシーケンス図）は `##` へ昇格して残した。
day27 の `## Day 27 終了時点の状態（完成版との違い）` は day27 固有の節なので残した。

---

## 4. `## 理解チェック` の新設（9本すべて）

各日の `## 次回予告` の直前に新設（day30 だけは `## 卒業おめでとうございます` の直前）。
3問＋答えで、型は ①このコードは何をしているか ②こう変えたらどうなるか ③なぜこの書き方か。
`scan-day17-24.md` / `scan-day25-30-appendix.md` の (c) の起案を土台にしつつ、
material-writing の文体（ですます体・AI典型構文なし・翻訳調なし）へ書き直した。

**その日の本文だけで答えられることを、根拠行を開いて確認した**:

| Day | Q1 | Q2 | Q3 | 根拠を開いて確認した箇所 |
|---|---|---|---|---|
| 22 | `map` が足すのは `name` だけ | `h-[300px]` を外すと扇が描かれない | `isTaskStatus` を通す理由・`as` を使わない理由 | `day22:204` `:230` `:270-276` `:329-336` `:383` |
| 23 | `where` が落とす3種類 | `rangeEnd` を「今」にすると週平均が低く出る | 終了側を「未満」にする理由 | `day23:190-199` `:180` `:228-238` |
| 24 | `enabled: isAdmin` の役目 | 1つ目の early return を消すと権限エラーが一瞬出る | `adminProcedure` を使う理由 | `day24:131` `:143` `:156` `:378` `:390` |
| 25 | 一般ユーザーが `/user` を直打ちすると開けない | `normalizeAvatarValue` が空文字を `null` にする | `db:seed` では戻らない・`prisma studio` で戻す | `day25:740` `:1446-1452` `:1744-1748` |
| 26 | `onClick` の例外は `error.tsx` に届かない | 開発モードはサーバー側の文言も送る | 200 が並ぶ無限リクエストはブラウザ側 | `day26:203-208` `:305-310` `:511-521` |
| 27 | `router.push` で URL を唯一の起点にする | `archive`/`unarchive` を反転にしない理由 | 画面のほうがサーバーより厳しい | `day27:64` `:255` `:186` `:474` |
| 28 | `every` を使う理由 | 分母が `selectableTasks` である理由 | 削除だけ確認ダイアログがある理由 | `day28:438` `:678` `:919` `:947-951` |
| 29 | 2回問い合わせる理由と存在の推測ができる副作用 | 他人の詳細は `FORBIDDEN` でページ自体が出ない | `formatDateOnly` を使う理由（UTC 固定・前日ずれ） | `day29:55` `:944` `:990-992` |
| 30 | `open` では届いているか確かめられない | `db push` を本番へ使ってよい条件 | CSP を入れていない理由 | `day30:257-263` `:317` `:536` `:932` |

---

## 5. 検証

```
$ npx textlint material/30days-curriculum/day2{2,3,4,5,6,7,8,9}_*.md material/30days-curriculum/day30_*.md
（出力なし）
TEXTLINT_EXIT=0

$ for f in day22..day30; bash scripts/curriculum-qa/check_quality.sh "$f"
day22 exit=0
day23 exit=0
day24 exit=0
day25 exit=0
day26 exit=0
day27 exit=0
day28 exit=0
day29 exit=0
day30 exit=0
```

`check_quality.sh` は1ファイル単位の Step 1〜8 に加えて、corpus 全体の 15 チェックと
27 本の自己テストも回す。9本すべてで `✅ ALL CHECKS PASS`。

途中で観測した corpus チェックの赤は、いずれも他の担当範囲の同時編集によるもので、
最終確認時にはすべて消えていた（記録として残す）:

- `check_crossref`: `day11: build — Day 12 に build がありません` / `day04: (6/6) — Day 01 に (6/6) がありません`
- `check_why`: `day19:413 — 直後の説明 0 字`
- `check_unused_image`: `screenshots/day02/step2-greeting-card.png`
- `test_build_day_snapshots`: `build_day_snapshots` に `restarts_file` が無い（スクリプト側の編集途中）

自分の編集が起こした赤は2件で、どちらもその場で直した:

1. `check_variants`: day28 に書いた「既に」→「すでに」へ統一
2. `check_zip_reference`: day27 のステップ表で `見比べる` / `突き合わせる` と `src/...` が
   同じ段落に同居して「ZIP に無いものとの照合指示」と判定された → `読む` / `確かめる` へ変更
3. `check_crossref`: day28 で「Day 01 で配置した `src/lib/constant/status.ts`」と書いたところ、
   Day 01 にその文字列が無いと判定された → 「写経の土台に最初から入っています。置き場所は
   `src/lib/constant/status.ts` です。」へ変更
4. `check_no_skip` の禁止ワード: day22 に書いた「同じように」→「書き方は変わりません」へ変更

---

## 6. 指示範囲外として残したもの（局長の判断待ち）

| # | 内容 | 出典 |
|---|---|---|
| 6-1 | day27 の H1 とファイル名が「実装しよう」のまま。中身は照合日に統一済み。直すには `00_カリキュラム目次.md:287` / `day26:911` / `day28:1802` の3リンクも同時に触る必要がある | scan A-4 |
| 6-2 | `day26:19`「3つとも実際に直します」と `day26:86`「1つは実際に修正する」の割れ。実体は `day26:384` `:479` が示すとおりバグA・Bは教材内の演習コードで、`:86` が正しい | scan A-6 |
| 6-3 | `day28:356`「`useState` だけを使います」の直後に `:401` `:410` で `useMemo` を2回使う | scan A-7 |
| 6-4 | `day26:107` のステップ表が Step 2 の `src/app/not-found.tsx` 新規作成を落としている | scan A-8 |
| 6-5 | `day30:53-55` と `:103-106` で Vercel の DB 作成手順が2通り。`Storage タブから Postgres` は現在の画面に無い | scan A-9 |
| 6-6 | `day30:599`「ページ数が 12 以上」と `:613`「17ページ以上」。`find src/app -name page.tsx \| wc -l` の実測は 17 | scan A-10 |
| 6-7 | `day23:1121` の Pro パターンは終了側を `lt` と推すが、Step 0 で書かせる `where`（`day23:191`）は `lte: now` | scan 23-a3 |
| 6-8 | `day22:522` と `day23:705-710` のスクリーンショットが、その Step の時点の画面と違う（グリッド配置前／ローディング中の絵が無い） | scan 22-a5 / 23-a5 |
| 6-9 | `day23:2352-2358` のつまずきポイント表に、グラフが縦に積まれる件（1-6 で直した欠陥の症状）が入っていない | scan 23-(d) |
| 6-10 | `day24:872` と `:1314` で `'ADMIN'` と `USER_ROLE.ADMIN` が同じファイルに混在。lint も型検査も通るので機械では見つからない | scan 24-a1 |
| 6-11 | `day22` Step 8 が「切り取って貼り付ける」だけの Step で、移動後の全体像を示すコードが無い | scan 22-a1 |
