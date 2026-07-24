# Phase B 教材「1から作る」化 — day別分解 (SBI backlog)

親PBI: #271 Phase B。Phase A-0 (#273) で依存表 (`material/30days-curriculum/_meta/procedure-day-map.json`) + day09 お手本が完了済み。
本書は day02〜day30 の写経移行 (build-from-scratch) を day 単位の SBI に落とし込んだバックログである。
セッションをまたいで残作業を追えるように外部化してある。

## 分解のやり方 (どう scope を出したか)

各 day の rewrite 範囲は、次の2つの一次情報から機械的に導いた。

1. **procedure→day 依存表** (`material/30days-curriculum/_meta/procedure-day-map.json`): どの tRPC procedure がどの day で初めて使われるか。
2. **各 day の現在の Step 0 の実態**: その day が導入する procedure を「写経で作らせているか」「配布済みルーターを登録するだけか」「Step 0 自体が無いか」を、day*.md を実際に読んで分類した。

この2つを突き合わせると、「その day で新しく登場する procedure を、受講生が自分の手で書くことになっているか」が判定できる。

## 重要な現状認識 (ここが今回の一番の発見)

当初の想定は「day09 以降のルーターが全部配布済みで、day02〜30 を丸ごと写経化する」だった。
だが一次情報を読むと、実態はもっと進んでいた。**すでに写経化が済んでいる範囲が広い。**

| 分類 | 実態 | 対象 |
|------|------|------|
| ルーターを写経で構築済み (完了) | 受講生が procedure を自分で書く | auth (day07), project (day09-12) |
| register-only (登録だけ・配布は残存) | Step 0 が「〜APIを有効化する(2分)」で、配布済みルーターを root.ts に登録するだけ。procedure 本体は配布済みのまま | task(day13,14,18), comment(day18), report(day21), user(day24) |
| Step 0 なし | ルーター procedure を使うのに構築ステップが無い | task(day15,16,28), comment(day19), report(day23), user(day25,29) |
| ルーター無し (UI/基盤) | procedure を導入しない。写経化は「配布コンポーネントを読む」か「自分で組む」かの UI 論点 | day01-06, 08, 17, 22, 26, 27, 30 (day07 は auth ルーター構築 day なので除外) |

つまり **Phase B の残りの中核は「register-only / Step0なし の5つのルーター族 (task / comment / search / report / user) を、project 族 (day09-12) と同じ写経ビルドに変換すること」** に絞られる。「29 day 全部をゼロから書き直す」ではない。

補足: day02 を実際に読んで検証したところ、**day02 はすでに完全な写経ビルド** (dashboard/page.tsx を Step1-3 で受講生が自分で組む) になっており、rewrite 不要だった。基盤/UI 系の day は day02 のように既に写経化済みのものが多いと見られる (要 per-day 確認)。

## ルーター族ごとの残作業 (推奨ウェーブ順)

project 族 (day09→12) が実証済みのテンプレート。各族を「その族の最初の day でルーターを新規作成し、以降の day で procedure を1つずつ足す」形に変換する。

| ウェーブ | ルーター族 | procedure数 | 対象day | 現状 | テンプレート |
|---------|-----------|-----------|---------|------|------------|
| 1 | task | 9 | 13, 14, 15, 16, 28（task.getById は day13 で導入） | register-only / Step0なし | project (day09-12) |
| 2 | comment | 4 | 18, 19 | register-only / Step0なし | project |
| 3 | search | 5 | 14, 20 | day14/day20 とも写経化済み | project |
| 4 | report | 2 | 21, 23 | day21/day23 に Step0 を追加し、`getOverview` / `getWeeklyReport` を逐語写経化済み | project |
| 5 | user | 5 | 24, 25, 29 | day24/day25/day29 に Step0 を追加し、5 procedure を逐語写経化済み | project |

族単位で「まとめて1ウェーブ」で変換するのが正しい。理由: 現在は族の最初の day で配布済みルーターを丸ごと登録するので、族の途中の day だけ写経化すると、その day 以降の day が「配布済みの完成ルーター」を前提にしていて整合しなくなる。project 族が day09→10→11→12 と連続で写経を積み上げたのと同じ形にする。

## day別 SBI 一覧 (router導入day)

acceptance は全 day 共通: `check_quality.sh` (Step1-8, 内 Step7=check_tone.py) 通過 + textlint 通過 + お手本(day09)と同じ写経ペダゴジー(なぜ→ステップ→確認ポイント)。追加行の目安は per-day 150行以内 (G-perday)。

| day | 見出し | 導入procedure | 変更前Step0 | rewrite内容 | 依存(先行必須) |
|-----|--------|-------------|----------|------------|-------------|
| 13 | タスク一覧 | task.getAll | register-only | Step0 を「task.ts を新規作成し getAll を写経」に。root.ts 登録込み | project族完了(済) |
| 14 | タスク新規作成 | task.create, search.getProjectMembers, search.getMembersByProject | register-only | Step0 に「task.ts へ create を追記(写経)」+「search.ts を新規作成し担当者取得2手続きを写経」(決定事項2・反映済み) | day13 |
| 15 | タスク編集・削除 | task.update, task.delete | Step0なし | Step0 新設「task.ts へ update/delete を追記(写経)」。update は楽観ロック(expectedUpdatedAt)含む(反映済み) | day14 |
| 16 | ステータス変更・時間記録 | task.addTime | Step0なし | Step0 新設「task.ts へ addTime を追記(写経)」(反映済み) | day15 |
| 28 | タスク一括操作 | task.bulkComplete/bulkDelete/bulkUpdateStatus | Step0なし | Step0 新設「task.ts へ bulk3種を追記(写経)」。既存のStep1(登録のみ)をStep0(逐語写経)へ変換し以降のUIステップを1つずつ繰り上げ(反映済み) | day16 |
| 18 | コメント投稿 | comment.create, comment.getByTaskId | register-only | Step0 を「comment.ts 新規作成 + create/getByTaskId 写経」に変更。task.getById は day13 で導入済み (反映済み) | day16 |
| 19 | コメント編集・削除 | comment.update, comment.delete | Step0なし | Step0 新設「comment.ts へ update/delete 追記(写経)」(反映済み) | day18 |
| 14/20 | タスク検索 | search族5procedure | day14反映済み / day20反映済み | day14 で search.ts を新規作成し担当者取得2手続き(getProjectMembers / getMembersByProject)を写経(反映済み)。day20 で残り3つ(search / quickSearch / getUserProjects)を追記し、完成版 source と同じ並びへ整える形で写経化(反映済み)。5 procedure すべてを写経で網羅する | project族完了(済) |
| 21 | 統計カード | report.getOverview | register-only | Step0 を「report.ts 新規作成 + getOverview 写経」に。集計クエリで難度中〜高。Mermaid必須day | project族完了(済) |
| 23 | 週次レポート | report.getWeeklyReport | Step0なし | Step0 新設「report.ts へ getWeeklyReport 追記(写経)」 | day21 |
| 24 | ユーザー一覧(管理者) | user.getAll | register-only | Step0 を「user.ts 新規作成 + getAll 写経」に | project族完了(済) |
| 25 | プロフィール編集 | user.updateProfile, user.changePassword | Step0なし | Step0 新設「user.ts へ updateProfile/changePassword 追記(写経)」 | day24 |
| 29 | ユーザー詳細・編集 | user.getById, user.update | Step0なし | Step0 新設「user.ts へ getById/update 追記(写経)」 | day25 |

## 非ルーターday (UI/基盤) — 個別評価が必要

これらは procedure を導入しないので上の族変換の対象外。「1から作る」の論点は「配布コンポーネントを読ませているか / 自分で組ませているか」。day02 は検証済みで既に写経ビルド。残りは per-day 確認 (SBI化は各 day を読んでから)。

- day01 開発環境 / day02 ダッシュボード(**写経済み・確認済**) / day03 GitHub / day04 デプロイ
- day05, 06, 08 ログイン/登録/サイドバー (auth の UI 層のみ)。day07 ログイン体験改善は auth ルーター本体を写経で構築する day なので、上の「ルーターを写経で構築済み」に属し、この区分からは除外する
- day17 自分のタスク / day22 グラフ / day26 エラーページ / day27 プロジェクト詳細・アーカイブ / day30 公開

## scope が不明・要判断の点 (正直な申し送り)

1. **共有ヘルパーの写経有無**: task/comment 等の procedure は `scripts/_server-routers/_helpers/permission.ts` の `getUserProjectIds` / `assertMemberPermission` / `findTaskWithPermission` 等に依存する。project 族は `_helpers/select.ts` の `USER_SELECT` を「day07で作成済みの共有部品」として import 参照するだけで済ませている。permission ヘルパーも同じ扱い(配布済み共有部品として import)にするか、どこかの day で写経させるかは族変換前に決める必要がある。今回のサンプル(day13/14)は USER_SELECT と同様「共有部品として import 参照」で書いた。
2. ~~**search 族の day 順序**~~ → **決定事項2 で確定・day14 へ反映済み**: search.ts は初出の day14 で新規作成し担当者取得2手続きを写経、day20 は検索画面用の残り3 procedure の追記のみ。
3. ~~**未処置の UI 未参照 procedure**~~ → **決定事項3 で確定・完了済み**: `user.getByEmail` / `user.create` / `user.delete` は削除で確定し、PR #308 (4e1764b) で main にマージ済み。G-disposition も解消済み。
4. **配布ファイルの除外 (scaffold/build-zip 側の変更)**: day を写経化しても、`scaffold-from-scratch.sh` / build-zip がその router ファイルを配布し続けると、受講生の手元に完成品が最初から置かれてしまう。族変換とセットで、その router を配布対象から外す scaffold 側の変更が必要。comment 族は 2026-07-24 時点で `comment.ts` の除外まで反映済み。これは md rewrite とは別の SBI。
5. ~~**テスト来歴 (G-testchan)**~~ → **全22本の割当を反映済み**: `test-channel-proposal.json` のレビュー済み分類 (写経 / ハーネス) を生成器が読み込み、`procedure-day-map.json` の G-testchan は PASS。新しいテストを追加した場合は、同じ台帳への分類追加が必要。

## 決定事項 (2026-07-24 局長確認済み)

上の「要判断の点」1〜3 は以下で確定した。族変換はこの決定に従う。

1. **共有 permission ヘルパー → 配布済み共有部品として import 参照** (USER_SELECT と同じ扱い)。
   理由: 横断インフラを day 内で写経させると day のスコープが膨れ、主役のルーター構築がぼやける。
   ただし初出 day (day13) では「このヘルパーが何をしているか」の なぜ解説を必ず添える (サンプル済)。
2. **search.ts は初出の day14 で新規作成** し、day20 は残り procedure の追記のみ。
   理由: お手本 (project 族 day09) と同じ「初めて使う日に作る」原則で全体整合を取る。
3. **`user.getByEmail` / `user.create` / `user.delete` は削除 → 完了済み**。
   根拠: UI 参照ゼロの未使用コード (grep 確認済み。user.create のヒットは全て user.createdAt の誤マッチ)。
   売り物に死にコードを残さない。**PR #308 (commit 4e1764b) で main にマージ済み**。
   src (`src/server/api/routers/user.ts`) と該当テストを削除し、procedure マップを再生成した。
   この削除で user 族の procedure は 8 → 5 (getAll / getById / update / updateProfile / changePassword) となり、
   G-disposition (UI 未参照 procedure の処置台帳エントリ欠落) も解消済み。
4. 配布除外 (scaffold/build-zip) は族変換ごとのセット SBI として実施 (決定不要・実行事項)。
   2026-07-24: `report.ts` / `user.ts` も `project.ts` / `task.ts` / `search.ts` と同じく、`scaffold-from-scratch.sh` / `build-zip.sh` / `check-sale-package.sh` から除外する変更をこの branch で追加。
5. テスト来歴 (G-testchan) はレビュー済みの全22本を生成物へ反映済み。今後の新規テストは追加時に写経 / ハーネスへ分類する。

## レビューで新規発見 (2026-07-24)

day13/day14 サンプルを src 逐語一致へ整合させる作業中に、族変換前に潰しておくべき点が3つ見つかった。いずれも wave-1 (task/search 族) の scope に取り込む。

1. **担当者取得 procedure の curriculum と src のズレ → 解消済み**: TaskDialog は実装と同じ `search.getMembersByProject` を呼び、選択中のプロジェクトに候補を絞る形へ修正した。day14 で `getProjectMembers` と `getMembersByProject` の両方を写経するため、その日の完成物だけで画面が動く。
2. **root.ts のフィールド順が学習の積み上げ順と不一致** → **解消済み**: `src/server/api/root.ts` は auth, project, task, search, comment, report, user の時系列順へ並び替え済み。各 day の incremental な root.ts 断片はこの順序を前提に書ける。
3. **scaffold が task.ts / search.ts を完成品として配布したまま** → **解消済み**: `scripts/scaffold-from-scratch.sh` は project.ts / task.ts / search.ts を配布対象から除外済み。受講生の初期状態に完成品の `search.ts` が置かれない前提で day14/day20 を進められる。

## acceptance (全 SBI 共通の完了条件)

- `bash scripts/curriculum-qa/check_quality.sh <day.md>` が ALL CHECKS PASS (視覚化/コード長25行/ステップ連続/禁止ワード/技術スタック/コード完全性/文体/理解度)
- textlint 通過
- 写経コードの各断片は src 該当ファイル (`src/server/api/routers/<router>.ts` 等) の行と逐語一致する (行単位・空白を含めて一致)。族の全 day を完了した時点で、組み上がった学習者ファイルが src と一致する
- お手本 (day09) と同じペダゴジー: なぜ作るか → 3部品(入力/処理/戻り値)の型 → ステップ分割 → 各ステップに確認ポイント
