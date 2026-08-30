# スクリーンショット撮り直しの基盤

`material/30days-curriculum/screenshots/` の画像を、**その日の読者の手元**で撮り直すための道具立てと、
Day 01–08 でそれを実際に通した記録。

- 撮る道具: `scripts/curriculum-qa/shoot_screenshots.py`
- 撮る対象の宣言: `scripts/curriculum-qa/screenshot-shot.json`
- 退行テスト: `scripts/curriculum-qa/test_shoot_screenshots.py`（`check_quality.sh` の Gate 4 に登録済み）

---

## 何が問題だったか

`doc/review-handoff/scan-day01-08.md` の (g) に実測がある。Day 01–08 だけで撮り直しが要る画像が
16ファイル。最も重い2件は次のとおり。

- `screenshots/dashboard.png` — 中身は **Day 20–21 の完成ダッシュボード**（統計カード5枚・
  グローバル検索・7項目サイドバー）。それを Day 07 と Day 08 が「今日の到達点」として貼っていた。
  正しく作れた読者ほど「メニューが4つ足りない」と誤診する。
- `screenshots/sidebar.png` — メニュー7項目。Day 08 の `menuItems` は3項目で、
  同じ日の確認ポイント（`day08:547`）と矛盾していた。本文はその矛盾を
  「今日の時点で3つでも間違いではありません」という言い訳で埋めていた。

手で撮り直すと同じことが起きるので、機械に撮らせる形にした。

---

## その日の画面になるために揃えるもの

3つ揃わないと「その日の画面」にならない。

| # | 揃えるもの | どこから取るか |
|---|---|---|
| 1 | その日のコード | `build_day_snapshots.py` が組む `dist/day-snapshots/dayNN/` |
| 2 | その日のデータ | `scan-day*.md` の **(f)** の実測を写した `DAY_SEEDS` |
| 3 | 撮り方 | ビューポート 1440×900・倍率2・明るいテーマ・`ja-JP`・`Asia/Tokyo`・時計固定 |

### 1. コード

`build_day_snapshots.py` の成果物をそのまま起動する。`next dev` ではなく本番ビルドを
`next start` で出すのは、開発用の目印が画面へ写り込まないようにするため。

**教材を直したらツリーは自動で組み直す。** `ensure_tree_fresh` が教材ファイルの更新時刻と
ツリーの更新時刻を比べる。これが無かった間に実害が出ている（後述の「途中で見つけた欠陥」）。

### 2. データ

`scripts/_seed/seed.ts` は呼ばない。あれは配布物としての1つの状態しか作れず、日で変わらない。
読者の手元は Day 06 で1件増える（Step 10 で自分のアカウントを登録する）。

`DAY_SEEDS` は変わった日だけ書き、書いていない日は直前の記述を引き継ぐ。

| 日 | ユーザー | プロジェクト | タスク | コメント | 根拠 |
|---|---|---|---|---|---|
| Day 01–05 | 4 | 2 | 5 | 2 | `scan-day01-08.md` (f) Day 01 |
| Day 06–08 | 5 | 2 | 5 | 2 | `scan-day01-08.md` (f) Day 06（読者の登録分 +1） |

投入は `day-seed-runner.ts`（Prisma + bcryptjs）が受け持つ。パスワードのハッシュがアプリと
同じでないとログインできないので、SQL を直接書かずにこの層を挟んでいる。
`LoginAttempt` は毎回消す。Day 05 でログイン失敗を試すと記録が積まれ、同一メール5回で
15分ロックされる（`src/lib/rate-limit.ts`）。ロックに当たった状態で撮ると、その日の画面ではなくなる。

**裏を取れていない日は撮らせない。** `MAX_SEEDED_DAY = 8`。Day 09 以降は
`scan-day09-16.md` 以降の (f) を読んで `DAY_SEEDS` へ足すまで、指定しても止まる。
足りないデータで撮った画像は、完成版で撮った画像と同じ種類の嘘になる。

### 3. 撮り方

時計は `2026-04-01T09:00:00+09:00` に固定して動かす（`page.clock.install` + `resume`）。
Day 02 の挨拶は時間帯で「おはよう／こんばんは」が変わるので、固定しないと撮るたびに
文面が入れ替わり、本文の説明と食い違う回が出る。

---

## 宣言表の書き方

`screenshot-shot.json` に1件足せば1枚増える。Python 側は触らない。

| 欄 | 意味 |
|---|---|
| `name` | 出力名。`screenshots/` からの相対。`dayNN/` で始める |
| `day` | どの日のツリーを起動するか |
| `path` | アプリの中の URL パス |
| `login` | 先にログインしてから撮るときのアカウント |
| `actions` | 撮る前の操作（`click` / `fill` / `wait_for`） |
| `wait_for` | 撮る直前に出ているのを待つセレクタ |
| `marks` | 赤枠。`selector` で指す。書いた順に ①②③ のバッジが付く |
| `clip` | 切り抜き。`{selector, padding}` |
| `full_page` | ページ全体を撮るか。`clip` とは同時に書けない |

### 座標は書けない

赤枠も切り抜きも、矩形は `locator.boundingBox()` から起こす。宣言表に `x` `y` `width`
`height` `rect` `left` `top` `box` のいずれかを書くと `load_config` が弾く。

手で座標を置くと、フォントやウィンドウ幅が少し変わった回に枠がずれる。しかも次に
撮り直すまで誰も気づけない。セレクタ基準なら、要素が動いても枠が追いかける。

画面の端に接している要素（サイドバー等）では、枠の外側 4px が画像の外へ出て辺が1本消える。
はみ出す分だけ内側へ寄せている。動かすのは余白の分だけで、座標そのものは触らない。

### 切り抜きは紙面のため

中央寄せのカード画面（ログイン・登録・各ダイアログ）をそのまま撮ると、1440×900 のうち
カードが占めるのは縦横とも4分の1ほどで、残りは白場になる。`book.css:213` の
`figure img { max-height: 200mm }` に収めると、フォーム本体が読めない大きさまで縮む。
`clip` で要素だけを切り出し、余白は `padding` で決める（カードは 40、ダイアログは 48）。

---

## Day 01–08 で撮ったもの（11枚）

すべて `Read` で目視した。「その日までに作っていない UI」が写っていないことを1枚ずつ確かめている。

| 出力 | 日 | 何を直したか | 目視の結果 |
|---|---|---|---|
| `day01/top-page.png` | 1 | 新規。この日の主成果なのに画像が1枚も無かった（01-A4） | サイドバー・メニュー・DB 由来の値なし。赤枠①は `ダッシュボードへ入る` |
| `day01/dashboard-hello.png` | 1 | 実画面で撮り直し | `DASHBOARD` / `Hello Task-App` のみ。未実装の要素なし |
| `day02/dashboard-message.png` | 2 | `G0 FOUNDATION` / `taskapp demo` / 関西弁の旧文面 / 背景装飾（02-A2）が消えた | 見出しが新しい文面。未実装の要素なし |
| `day04/public-url.png` | 4 | Day 02 と同一画面の再掲だった。`path` をダッシュボードへ | 本文 `:562` の「Day 02 で作った自分用メッセージが見える」を満たす |
| `day05/login.png` | 5 | 共有の `login.png`（教材全体で6回使用）から分離。切り抜き済み | カードが画面いっぱい。未実装の要素なし |
| `day05/login-error.png` | 5 | ブラウザ標準の英語ツールチップ（05-A9）を、本文が言う「欄の下の赤字」へ | 「パスワードを入力してください」が赤字。赤枠①がそこを指す |
| `day06/register.png` | 6 | `*` 印・単色ボタン（06-A4）が消えた | 4欄＋グラデーションのボタン。未実装の要素なし |
| `day07/login-failed.png` | 7 | 新規。Day 07 だけが撮れる画面 | 「メールアドレスまたはパスワードが正しくありません」の赤いアラート |
| `day08/sidebar.png` | 8 | 7項目 → **3項目**（08-A1 の矛盾が消えた） | ダッシュボード / プロジェクト / マイタスクの3つ。赤枠①がサイドバー全体 |
| `day08/dashboard.png` | 8 | Day 20–21 の完成画面（07-A1）から、Day 08 の実画面へ | 統計カード・グローバル検索・7項目サイドバーはどれも写っていない |
| `day08/logout-confirm.png` | 8 | 新規。この日の成果物なのに画像が無かった | 「ログアウトしますか？」のダイアログ。切り抜き済み |

### 教材からの参照も張り替えた

撮っただけでは `check_unused_image` が落ちて誰もコミットできない。撮った11枚はすべて
本文から参照している。alt は「〜を確認してください」という指示文をやめ、何が写っているかを書いた。

差し替えの結果、参照が1つも残らなくなった旧画像3枚（`login-error.png` / `register.png` /
`sidebar.png`）は削除した。いずれも `scan-day01-08.md` の付録が撮り直し対象に挙げていたもの。

`login.png` と `dashboard.png` は残す。Day 30 と付録3本が参照しており、そこは**完成版の画面**を
見せる場所なので、写っているものと本文が食い違わない。

---

## 途中で見つけた欠陥

いずれも撮ってみて初めて分かったもの。

1. **`day07/dashboard.png` は `day02/dashboard-message.png` とバイト単位で同一だった。**
   ログイン後に撮ってもそうなる。Day 07 の `/dashboard` は Day 02 のコードのままで、
   画面に出る DB 由来の値が1つも無いため。別カットを持つ意味が無いので、Day 07 の本文からは
   Day 02 の1枚を指し、「今日変わったのはログインを通らないと来られなくなったこと」と書いた。
2. **middleware のリダイレクト先も撮ってみたが、出てくる絵は `day05/login.png` と同じだった。**
   違いは URL の `callbackUrl` だけで、ヘッドレスの撮影では URL 欄が写らない。
   別名で持つと「同じ画像を別名で貼る」に戻るので持たない。
   Day 07 の到達点は `day07/login-failed.png`（バックエンドが返した文言）で示す。
3. **教材を直してもツリーは追いつかない。** Day 02 の挨拶文を直した回に、Day 04 のツリーだけ
   古いままで、旧文面のダッシュボードが撮れた。撮る側が気づける事実なので、
   `ensure_tree_fresh` を入れて人の記憶に頼らない形にした。
4. **`.env` の `NODE_ENV="development"` をプロセスの環境変数へ渡すと `next build` が落ちる。**
   `<Html> should not be imported outside of pages/_document.` で `/404` の書き出しに失敗する。
   Next.js は build と start で自分の `NODE_ENV` を決めるので、こちらからは与えない。
5. **途中で落ちたビルドも `.next/BUILD_ID` を残す。** それを「ビルド済み」と見ると
   `next start` が `prerender-manifest.json` を開けずに即死し、原因が1つ前の回にあるので追いにくい。
   `BUILD_ID` と `prerender-manifest.json` の両方が揃っているときだけビルド済みと見る。
6. **`networkidle` は使えない。** Day 08 以降の `AppLayout` は `api.auth.getSession` を
   react-query で回し続けるので通信が止まらない。出ているべきものは `wait_for` で名指しする。

---

## Day 09 以降を保留にした理由

宣言表に Day 09 以降を書いていない。理由は2つで、どちらも撮れば分かるものではない。

1. **データの裏が無い。** `MAX_SEEDED_DAY = 8`。Day 09 以降の (f) は
   `scan-day09-16.md` / `scan-day17-24.md` / `scan-day25-30-appendix.md` にあるが、
   まだ `DAY_SEEDS` へ写していない。写さずに撮ると、件数の合わない一覧や統計が写る。
   これは今まさに直している欠陥と同じ種類の嘘になる。
2. **ツリーが通っていない日がある。** `day-snapshots-result.md` の時点で day13 が
   tsc / build とも NG。組めない日は起動できないので撮れない。

**Day 09 以降を進める手順**

1. その日の scan の (f) を読み、`DAY_SEEDS` へ足す。変わった日だけ書けばよい。
2. `MAX_SEEDED_DAY` を上げる。
3. `build_day_snapshots.py --day N --verify` が通ることを確かめる。
4. `screenshot-shot.json` へ足して `shoot_screenshots.py --day N`。
5. **撮れた画像を1枚ずつ開いて見る。** その日までに作っていないものが写っていないかを目で確かめる。
6. その日の教材から参照する。alt は写っているものを書く。

---

## 撮れない画像について

この道具が撮れるのはアプリの画面だけ。次は対象外で、`scan-day01-08.md` の (g) が
赤枠の欠けている箇所として挙げているものも大半がここに入る。

- VS Code の画面（`day01-vscode-open.png`）
- Git / GitHub の画面（`day03-git-status.png` / `day03-commit-success.png` / `day03-github-history.png`）
- Vercel / Neon のコンソール（Day 04 に画面写真が1枚も無い）
- ブラウザの DevTools（Day 05 Step 7 / Day 07 Step 7 は目視が目的の Step なのに画像が無い）
- `day04-prep-panel.png` / `day04-sample-url.png` — アプリの画面ではなく自作のパネル。
  本文と正反対の断言（「今日はやらない: 本番公開」）と Day 08 のサイドバーの写り込みがある。
  差し替えではなく、何を写すかを決め直すところから要る。

---

## 使い方

```bash
docker compose up -d db                                   # 撮影には DB が要る
python3 scripts/curriculum-qa/shoot_screenshots.py --list  # 宣言表の中身を見る
python3 scripts/curriculum-qa/shoot_screenshots.py --day 5 # 1日だけ撮る
python3 scripts/curriculum-qa/shoot_screenshots.py --all    # 宣言表の全部を撮る
python3 scripts/curriculum-qa/test_shoot_screenshots.py     # 退行テスト
```

`--out DIR` で出力先を変えられる。教材へ入れる前に別の場所へ出して見るときに使う。
