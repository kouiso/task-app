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
| Day 06–09 | 5 | 2 | 5 | 2 | `scan-day01-08.md` (f) Day 06（読者の登録分 +1） |
| Day 10 | 5 | **3** | 5 | 2 | `day10:838-848` の動作確認でプロジェクトを1件作る |
| Day 11–13 | 5 | 2 | 5 | 2 | `day11:1101` で Day 10 の1件を消す。`day11:1140-1145` でアーカイブも解除する |
| Day 14 | 5 | 2 | **6** | 2 | `day14:1408-1420` の動作確認でタスクを1件作る |
| Day 15–17 | 5 | 2 | 5 | 2 | `day15:997-999` で1件消し、1件の優先度を上げる。Day 16 でステータス1件と作業時間75分 |

投入は `day-seed-runner.ts`（Prisma + bcryptjs）が受け持つ。パスワードのハッシュがアプリと
同じでないとログインできないので、SQL を直接書かずにこの層を挟んでいる。
`LoginAttempt` は毎回消す。Day 05 でログイン失敗を試すと記録が積まれ、同一メール5回で
15分ロックされる（`src/lib/rate-limit.ts`）。ロックに当たった状態で撮ると、その日の画面ではなくなる。

**裏を取れていない日は撮らせない。** `MAX_SEEDED_DAY = 17`。Day 18 以降は
`scan-day17-24.md` 以降の (f) と教材本文を読んで `DAY_SEEDS` へ足すまで、指定しても止まる。
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
| `viewport` | この1枚だけ窓の大きさを変える。省略で先頭の `viewport` |

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
`clip` で要素だけを切り出し、余白は `padding` で決める。**ダイアログは 0 にする。**
余白を取ると、暗くした背景の日本語がその中へ字の高さの途中で入り、壊れた画像に見える。
背景が空いている中央寄せのカード（ログイン・登録）だけ 40 を残している。

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

## 道具そのものを直した点（Day 09–17 の作業中）

1. **起動したサーバーが残り続けてポートが枯れた。** `npx next start` は下に `next-server` を
   産む。親だけ `terminate()` すると子が親無しで生き残り、ポートを掴んだまま残る。1日撮るごとに
   1つ増え、50個で `free_port` が枯れて「3401 から 50 個のポートが全部埋まっています」で止まる。
   実際にそこまで溜まった（`/proc/<pid>/cwd` が `dist/day-snapshots/` を指すものが50個）。
   別のプロセスグループで起こし、終わるときは `killpg` でグループごと落とすようにした。
2. **赤枠の番号バッジが枠の中の文字に乗った。** 枠の左上角にバッジの中心を置き、画像の外へ
   出るときは 0 へ寄せていたので、画面の端に接した枠（サイドバー等）ではロゴが「①ask App」に
   見えた。出られない側は反対の角へ回し、両側とも無理なときだけ画像の中へ寄せる形にした。
3. **ダイアログの切り抜きが背景の日本語を字の高さの途中で断ち切った。** 余白 48px の中へ
   暗くした背景の文が半分だけ入り、壊れた画像に見えた。ダイアログの切り抜きは余白 0 にした
   （角の丸みの外に背景がわずかに残るが、文字は切れない）。
4. **同じ日に別のアカウントで撮れなかった。** ログインは最初の1回だけだった。Day 09 の空状態は
   どのプロジェクトにも属さないアカウントで開く画面なので、指定が変わったら Cookie を捨てて
   入り直すようにした。
5. **1枚だけ窓の大きさを変えられなかった。** 幅で列数が変わることを見せる回のために、宣言表へ
   `viewport` を足した（省略で先頭の既定）。
6. **前の1枚で押したところにポインタが残り、次の画面の同じ位置の部品が hover の見た目で写った。**
   撮る前に画面の外へ逃がすようにした。
7. **ダイアログが開くと中の入力欄へ焦点が移り、数値欄では中身が選択状態（青い反転）で写った。**
   読者が何もしていない画面とは違う絵になるので、撮る直前に焦点と選択を外すようにした。
8. **番号バッジが赤枠の中の文字に乗る場合がまだある。** 枠が入力欄のラベルまで含んでいると、
   角に置いたバッジがラベルの1文字目に乗る。宣言表の側で、枠を入力欄そのものへ寄せて避けた
   （Day 14 の2枚）。枠の取り方で避けられる範囲なので、描画側は触っていない。

なお、`<input type="date">` の空欄が `mm/dd/yyyy` と出る差は残っている。日本語環境のブラウザは
`年/月/日` と出す。context の `locale` でも起動時の `--lang` でも変わらないことを実測で確かめた
（Day 10 と Day 14 のダイアログに出る）。

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

## Day 09–17 で撮ったもの（26枚）

保留の理由だった2つのうち、データの裏（`DAY_SEEDS`）を Day 17 まで伸ばした。ツリーは
`day-snapshots-result.md` の時点で day09–10・day12–17 が tsc / build とも OK になっている。
day11 だけは今も落ちるので撮れていない（後述）。

### `DAY_SEEDS` に足した4日

読者がその日までに何を作っているかは教材の本文が決めている。`scripts/_seed/seed.ts` は
30日を終えた後の状態しか作れないので使わない。書いたのは変わった日だけで、書いていない日は
直前の記述を引き継ぐ。

| 日 | 変わったもの | 根拠 |
|---|---|---|
| Day 10 | プロジェクト +1（`ポートフォリオサイト`。作成者が OWNER の1人だけ） | Step 8 の動作確認表（`day10:838-848` 手順1〜6）。名前は `day10:817` の alt が呼んでいるものに合わせた |
| Day 11 | Day 10 で作った1件を削除して2件へ戻る。アーカイブは残らない | `day11:1101` 「消すのは、Day 10 で自分が作った練習用のプロジェクトに」／`day11:1140-1145` 手順5「もう一度カードを開き、アーカイブボタンをクリックして解除する」 |
| Day 14 | タスク +1（`トップページの文言を見直す`、position 4） | Step 9 の動作確認（`day14:1408-1420`）。`day14:1414` の「いちばん下に足されます」と並びが一致する position を選んだ |
| Day 15 | Day 14 の1件を削除して5件へ戻る。1件の優先度を MEDIUM → HIGH | Step 11 の動作確認（`day15:997-999`）「タイトルや優先度を変更」「削除」 |
| Day 16 | 1件のステータスを TODO → IN_PROGRESS、`timeSpentMinutes` を 0 → 75 | Step 4（`day16:900-905`）。`day16:933` が「合計が `1h 15m` になるか」と書くので、0 から始まる `API仕様書作成` に 30分+45分 を足すと本文の数字とそのまま一致する |

Day 09・12・13・17 は読者がデータを作らない日なので、直前の日をそのまま引き継ぐ。
`day17:919` が「初期データのままなら期限切れグループにカードが1枚だけ」と書いており、
実際に撮ると本文どおり1枚になる。

**タスクの期限・見積・合計作業時間もシードへ入れた。** Day 13 のカードは期限を、Day 16 の
カードは合計作業時間を出す。ここが欠けていると、読者の画面には出ている行が画像から消える。
値は `scripts/_seed/seed.ts:178-252` の実測をそのまま写している。

### 撮った26枚

| 出力 | 日 | 差し替えた相手と、何が直ったか |
|---|---|---|
| `day09/project-list.png` | 9 | 共有の `project-list.png`（Day 09 に2回・Day 11 に1回）。幻の「社内データ分析基盤」・サイドバー7項目・上部検索バーが消えた |
| `day09/project-list-header.png` | 9 | 同じ画像の2回目。Step 9 の確認ポイント2つ（新規プロジェクトボタン／アーカイブ表示スイッチ）を赤枠で指す |
| `day09/empty.png` | 9 | `day09-empty.png`。空状態はどのプロジェクトにも属さない `empty@example.com` で入れば読者も見られる |
| `day10/project-create-dialog.png` | 10 | 共有の `project-create-dialog.png`（同じ日に3回）。必須マーク `*` が消え、カラー・開始日・終了日が教材の `grid-cols-3` どおり3列になった |
| `day10/create-form-filled.png` | 10 | 同じ画像の2回目。キャプションが「フォーム入力中」なのに空のフォームだった箇所を、入力済みの実物へ |
| `day10/create-validation-error.png` | 10 | 同じ画像の3回目。Step 8 の確認表 手順2「名前を空のまま作成→エラー」を撮った |
| `day10/project-list-after-create.png` | 10 | `project-list-after-create.png`。読者が作った1枚を赤枠で指す |
| `day12/project-detail-members.png` | 12 | `project-detail-members.png`。メンバーカードだけを切り出し、今日つける「メンバー追加」ボタンを指す |
| `day12/project-detail.png` | 12 | `project-detail-tasks.png`。左にメンバー3人・右にタスク3件 |
| `day12/add-member-dialog.png` | 12 | `project-add-member.png`。未選択で追加ボタンが押せない状態 |
| `day12/member-remove-confirm.png` | 12 | **`project-delete-confirm.png` の流用**。見出しが「このメンバーを削除しますか？」の実物になった |
| `day12/member-count.png` | 12 | `project-detail-tasks.png` の2回目。見出しの人数を指す |
| `day13/task-list.png` | 13 | 共有の `task-list.png`（Day 13 と Day 16）。合計作業時間・時間記録ボタン・新規タスクボタン・幻のタスク8枚が消えた |
| `day13/task-list-filtered.png` | 13 | `task-list-filtered.png`。完了で絞ると1枚だけ残ることを実物で示す |
| `day13/task-detail-dialog.png` | 13 | 共有の `task-detail-dialog.png`（Day 13 と Day 16） |
| `day14/task-create-dialog.png` | 14 | 共有の `task-create-dialog.png`（Day 14 に3回・Day 15 に1回）。必須マークと背景の Day 16/20 の UI が消えた |
| `day14/task-dialog-title-description.png` | 14 | 同じ画像の2回目。Step 4 が指すタイトル欄と説明欄を赤枠で指す |
| `day14/task-dialog-project-assignee.png` | 14 | 同じ画像の3回目。Step 6 が指すプロジェクト欄と担当者欄を赤枠で指す |
| `day14/task-list-after-create.png` | 14 | `task-list-after-create.png`。読者が作った1件が最後に並ぶ |
| `day15/task-edit-dialog.png` | 15 | 共有の `task-create-dialog.png`。**Day 15 の主題である編集モードの画像が1枚も無かった**（見出し「タスク編集」・ボタン「更新」） |
| `day15/task-delete-confirm.png` | 15 | **`project-delete-confirm.png` の流用**。見出しが既定値の「本当に削除しますか？」になった |
| `day15/task-list-after-edit.png` | 15 | `task-list-after-edit.png`。優先度を変えたカードを赤枠で指す |
| `day16/task-detail-dialog.png` | 16 | Day 13 と共有していた画像を Day 16 のツリーで撮り直し |
| `day16/task-timer.png` | 16 | `task-timer.png`。今日の主役 |
| `day17/my-task.png` | 17 | 共有の `my-task.png`（同じ日に4回） |
| `day17/status-tabs.png` | 17 | 同じ画像の2回目。Step 4 が言う Tabs だけを切り出す |
| `day17/task-groups.png` | 17 | 同じ画像の3回目。期限で分かれた見出しを指す |
| `day17/my-task-in-progress.png` | 17 | 同じ画像の4回目。Step 12 手順4「ステータスタブで絞り込みできる」 |

差し替えの結果、参照が1つも残らなくなった旧画像11枚（`day09-empty` / `my-task` /
`project-add-member` / `project-create-dialog` / `project-detail-members` /
`project-list-after-create` / `task-create-dialog` / `task-list-after-create` /
`task-list-after-edit` / `task-list-filtered` / `task-timer`）は削除した。
`project-list.png` `project-delete-confirm.png` `project-detail-tasks.png`
`task-list.png` `task-detail-dialog.png` は Day 11・Day 16 がまだ指しているので残す。

---

## 撮ってみて分かった欠陥（教材側の担当へ）

いずれも撮る過程で現物と突き合わせて確かめたもの。ここでは直していない。

1. **読者のアカウント（`admin@example.com`）はプロジェクトを1件しか見られない。**
   `scripts/_seed/seed.ts:107-165` で、`モバイルアプリ開発` のメンバーは `user1@example.com` と
   `user2@example.com` の2人だけで、`admin@example.com` は入っていない。`project.getAll` は
   自分がメンバーのものだけを返すので、Day 09 の一覧に出るカードは1枚になる。
   `day13:790` の「初期データでは参加プロジェクトが1つなので件数は変わりません」はこれと合うが、
   `day11:1125` の「アーカイブするのは『モバイルアプリ開発』にしてください」と
   `day11:1145` の「一覧にプロジェクトが2件そろっている」は**読者の画面では成り立たない**。
2. **Day 02 Step 2 の確認ポイントとコードが合わない。** `day02:490` は「カードの下段に `Owner` と
   `Focus` の2枚が並んでいる」と書くが、`focusCards` は `Owner` / `Today` / `Next` の3枚で、
   `Focus` という札のカードは無い。
3. **Day 12 の弁解5行が残る。** `day12:1295-1299` は「画像はプロジェクトを消すときのもので」と
   断っているが、画像はメンバー削除の実物へ差し替えた。同じく `day15:869-870`、
   `day16:918`（「どのカードも `0m` のまま」）も、差し替え後は前提が変わっている。
4. **Day 12 は同じメンバーカードを2箇所（`:17` と `:1395`）で求めている。** どちらも読者に
   見せたい所が違うので、赤枠の指す先を分けて2枚にした。本文を1箇所にまとめられるなら、
   画像も1枚で足りる。
5. **Day 09 Step 10 の「ブラウザ幅を変える → カードの列数が変わる」は読者の手元では確かめられない。**
   カードが1枚しか無いため（1 の帰結）。幅 430px で撮ってみると、ヘッダーの
   「アーカイブ表示」のラベルが縦書きに折れる崩れも出る。
6. **Day 05 と Day 11 は同じ画像を同じ日に貼り回している。** `check_visualization.py
   --fail-on-duplicate-image` で FAIL する（`day05/login.png` 3回、`project-delete-confirm.png` 2回、
   `project-detail-dialog.png` 2回）。Day 09–17 の範囲は0件にした。

---

## Day 09–17 で撮れなかったもの

| 参照箇所 | なぜ撮れないか |
|---|---|
| `day09:350` `day09-step1.png` / `day09:600` `day09-cards.png` | Step 1・Step 6 の途中経過。`build_day_snapshots.py` はその日の**終わり**のツリーしか組めない |
| `day09:443` `day09-loading.png` | 読み込み中のスピナー。通信を止める仕掛けが宣言表に無い |
| `day09:947` `day09-responsive.png` | 上の 5 のとおり |
| `day11` の5箇所 | `npm run build` が通らないので `next start` で出せない。教材自身が「Day 11 を終えた時点で `npm run build` は通りません」と断っており、`build_day_snapshots.py` の `EXPECTED_RED` もそう扱っている。`next dev` なら起動するが、開発用の目印が写り込むので撮らない |
| `day16:916` `task-list.png` | `dist/day-snapshots/day16/src/app/task/page.tsx` が Day 15 の版で止まっており、`<TaskCard>` へ `timeSpentMinutes` が渡らない。撮ると全カードが `0m` になり、読者の DB（720 / 1200 / 75分）と食い違う。Day 16 の完成コードに `src/app/task/page.tsx` の全文が無く、Step 3 の断片をツリー組み立てが当てられないのが原因 |
| `day04:30` `day04-prep-panel.png` / `day04:33` `day04-sample-url.png` | 後述 |

### Day 04 の2枚について

本文（`day04:26`「実際の URL で公開します」）と画像（「今日はやらない: 本番公開」「まだ本物の
公開 URL はない」）が正面から食い違っている。差し替えを試したが、置き換えられる絵が無かった。

- **PR プレビューの URL** — `https://task-app-git-claude-30days-material-pro-68bfc5-kouisos-projects.vercel.app/`
  は Vercel の SSO ログインへ飛ぶ（`302` の連鎖の末に `vercel.com/login` が `200`）。アプリの画面は出ない。
- **本番の URL** — `https://task-app-pink-psi.vercel.app/` は生きているが、`/login?callbackUrl=/` へ
  飛ぶ。これは Day 30 まで作り終えたアプリで、認証を足すのは Day 05 から。Day 04 の画面ではない。
- **手元の本番ビルド** — `/dashboard` を撮ると `day02/dashboard-message.png` と**バイト単位で同一**
  （md5 `aee05e8950332dc449b02d3dfbbd3908`）。`/` は Day 01 のトップページそのもの。
  Day 04 はアプリのコードを1行も変えない日なので、新しい絵が出ない。

つまり Day 04 の新しい絵は Vercel のコンソールにしか無く、それはこの道具の外にある。
2枚を消すと `check_visualization.py` の「スクショ位置3箇所以上」に当たるので、消していない。
矛盾を残すか検査を落とすかの二択になるため、判断を上げる。

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
