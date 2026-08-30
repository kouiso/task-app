# Day 13〜21 修正記録

- 対象: `material/30days-curriculum/day13_*.md` 〜 `day21_*.md`（9本）
- 実施日: 2026-08-30
- 根拠にした実ファイル: `src/command/seed.ts` / `src/server/api/routers/task.ts` /
  `src/server/api/routers/project.ts` / `src/server/api/routers/_helpers/permission.ts` /
  `src/component/ui/delete-confirm-dialog.tsx` / `src/component/task/time-log-dialog.tsx` /
  `src/app/task/page.tsx` / `00_カリキュラム目次.md` / `day11_*.md` / `day18_*.md`

---

## 0. 指示された修正のうち、実測で「成立しない」と判明した2件

### 0-1. `day13:773` は誤っていない（scan-day09-16 の 13-a1 が誤り）

指示は「`admin@example.com` はシード2プロジェクト両方の OWNER なので、絞ると 5件→3件/2件 に変わる」
だった。`src/command/seed.ts` を実測した結果、**これは事実と違う**。

`createProjects()` のメンバー構成（seed.ts:126-165）:

| プロジェクト | メンバー |
|---|---|
| Webサイトリニューアル | `admin`(OWNER) / 田中太郎(MEMBER) / 山田花子(MEMBER) |
| モバイルアプリ開発 | 田中太郎(OWNER) / 山田花子(ADMIN) |

コード内の変数名 `user1` は `developerEmail`（＝admin）、`user2` が `user1@example.com`（田中太郎）で、
**変数名とメールアドレスの数字が1つずれている**。scan はここを取り違えたと考えられる。

admin はモバイルアプリ開発のメンバーではない。したがって:

- `task.getAll` は `getUserProjectIds()`（`_helpers/permission.ts:5-11`）で
  メンバー所属プロジェクトに絞るため、admin に見えるタスクは **project1 の3件だけ**
- `project.getAll` は引数なしのとき `where.members = { some: { userId: ctx.session.userId } }`
  （`project.ts:78-82`）で絞るため、admin のドロップダウンには **1件だけ**並ぶ

よって `day13:773` の「初期データでは参加プロジェクトが1つなので件数は変わりません」は**正しい**。
**変更していない。** 指示どおり直すと、正しい記述を誤りに書き換えることになっていた。

なお `scan-day17-24.md` の冒頭（10-31行）は「**admin はモバイルアプリ開発のメンバーではない**」と
正しく書いており、2つの scan ファイルが互いに矛盾している。正しいのは `scan-day17-24.md` の側。

### 0-2. `day14:1396`「いちばん下に足されます」も成立しない（14-a2）

0-1 と同じ取り違えに由来する。`getNextTaskPosition`（`task.ts:82-99`）は
`where: { projectId }` でプロジェクト単位に最大値+1を採番する。admin が作成ダイアログで選べる
プロジェクトは `projects` prop（`day14:1437` = `project.getAll` の結果）＝1件のみなので、
新規タスクは必ず project1 の position 4 になり、`orderBy: [{position:'asc'},{createdAt:'desc'}]`
（`task.ts:178`）で本当に末尾へ来る。**変更していない。**

---

## 1. 修正した件数

| 重要度 | 件数 |
|---|---|
| BLOCKER（写経が止まる） | 2 |
| 高（事実の誤り・読者が自分を疑う） | 9 |
| 中（説明の欠落・時間見積もり） | 8 |
| 低（表記・体裁） | 4 |
| 合計 | **23** |

加えて、9本すべてに `## 理解チェック`（3問＋答え）を新設した。

---

## 2. BLOCKER（2件）

| Day | 箇所 | 直した内容 |
|---|---|---|
| 15 | Step 4 の `handleSubmit`（旧633行） | Day 14 の `handleSubmit`（`day14:1367`）を消す指示が無く、順に貼ると `Cannot redeclare block-scoped variable 'handleSubmit'` で止まった。同じ日の `handleEdit`(520)/`handleDelete`(800)/`handleCreate`(860) と同じ**置き換え注記**をコードブロックの直前とコメント行に追加 |
| 18 | Step 4 の予告（旧831行） | Step 4 の JSX が Step 5 定義の `createCommentMutation` を2箇所で使うのに、予告が `handleCommentSubmit` だけだった。`day19:515-516` / `day20:1014` の書き方（未定義の名前を漏れなく挙げ、「定義するまでこの画面は表示できません」で締める）を移植し、**2種類の型エラーが出るのが正常**だと明記 |

---

## 3. 高（9件）

| Day | 箇所 | 直した内容 |
|---|---|---|
| 17 | `DeleteConfirmDialog` の出自 | 「Day 15 で作った」→ 「Day 01 の scaffold で配布済み。Day 11 のプロジェクト削除で初めて呼び出し、Day 15 のタスク削除でも使用。中身を書いたことは一度もない」 |
| 19 | 同上（2箇所＋見出し表1行） | 「Day 11 で作った」「Day 11 でタスク削除にも使った」→ 同じ正しい記述に統一。表の「Day 15 の復習」も「配布済み」へ |
| — | 判定根拠 | `day11:83`「削除確認ダイアログ（既存・変更なし）」/ `day11:90`「配布済みで、中身には手を入れません」/ `day20:687`「どちらも中身を自分で書いたことはありません」。**正解は `day20:687`。3箇所を全部これに揃えた** |
| 19 | `day19:779` の動作確認 | 「『データベース設計』タスクを開くと自分の行にだけアイコンが2つ並ぶ」→ **誤り**。`seed.ts:255-296` の実測では、`createComments()` が `orderBy: {createdAt:'asc'}, take: 2` で取った task1=「デザインモックアップ作成」に admin のコメント、task2=「データベース設計」に田中太郎のコメントを付ける。**admin 自身のコメントが付くのは「デザインモックアップ作成」の方**。指し示すタスクを差し替え、「1タスクに自分と他人が並んだ状態は初期データには無い」ことも明記 |
| 21 | `day21:161` の `projectScope` | `project: { isArchived: false }` の前提を明記。`day11` の削除手順は「Webサイトリニューアル」を守るのに、直後のアーカイブ手順（`day11:1076-1080`）は対象を指定していない。削除手順で Day 10 の練習用プロジェクトは既に消えているため、admin に残るのは「Webサイトリニューアル」1件だけ。これをアーカイブしたままにすると **エラーは1つも出ずカードが全部 0** になる。Step 0-3 と Step 8 の動作確認の2箇所に「全部 0 のときはアーカイブを疑う／`/project` でアーカイブ表示を ON にして解除する」を追加 |
| 17 | `day17:903` / `day17:1147` | 「初期データでは期限切れに1枚だけ」の断定を「初期データのままなら」に変え、Day 14 で作ったタスク・Day 15 で消したタスクによって0〜2枚に振れることと、**枚数が違っても実装の誤りではない**ことを明記 |
| 20 | `day20:2741` | 「`exclude: 'all'` が付いているのは Select の3つだけ」→ 実際は `projectId`/`status`/`priority`/`assignedTo` の**4つ**。同じ日の `day20:1287` は正しく「4つ」と書いており、同一ファイル内で数が食い違っていた |
| 13 | 旧1064行 | `useEffect` の依存配列の説明で同じ文が2回続き、後続2文の接続も壊れていた編集ミスを1本の説明へ書き直し |
| 20 | `day20:2008` | 「`src/app/search/page.tsx` の `debouncedKeyword` がその部分です」→ 読者のファイルにその名前は存在しない。「今日書くファイルには入れないので探しても見つからない。違いはこの日のまとめで説明する」へ |

---

## 4. 中（8件）

| Day | 直した内容 |
|---|---|
| 13 | `project.getAll` を引数なしで呼ぶため、Day 09 の `isArchived: showArchived` と違ってアーカイブ済みも選択肢に並ぶ点を追記（13-a5） |
| 14 | `useForm` の「7つ」に対し表が5つしか載っていなかった。`watch` / `setValue` の2行を表へ追加し、この2つは入力欄ではなく Step 3 の `useEffect` で使うと本文に明記（14-a3） |
| 14 | `getSession` の説明が実装と違った。「送信の直前にログインが切れていないか確かめる」→ 実際の `handleSubmit` は `session?.user?.id` を見るだけ。Day 13 で取った値をそのまま読む旨へ修正（14-a6） |
| 14 | `$queryRaw` で生 SQL を書く理由（`FOR UPDATE` に当たる Prisma メソッドが無い／教材で生 SQL はここ1か所）と、`"projects"` が `@@map` 由来の実テーブル名でモデル名 `Project` とは別物であることを追記（14-a4） |
| 15 | Step 6 の state / mutation に貼り先が無かった（`// 削除用のstateとmutation` だけ）。`day11:516` と同じ流儀で「Step 4 で書いた `handleSubmit` の下に追加」を明記（15-a6） |
| 18 | Step 3 の貼り先指示がコメント欄全体を包む `<div>`（完成コード1418行）を取りこぼしていた。開く指示を Step 3 の先頭に、閉じる指示を Step 4 の末尾に追加し、箱が無いと間隔指定が効かない理由も添えた（18-a2） |
| 19 | Day 18 の日時 `<span>` を `<div>` で包む**既存コードの改造指示が地の文にしか無かった**。Before/After のコードブロック2つと、`justify-between` の子要素が2つ→4つに増えると散る理由を追加（19-a4） |
| 17 | Step 12 だけ `PORT=3001` になる理由が無かった。`day15:993` の書き方（Day 09 からの動作確認と同じ入口にそろえるため）を移植し、3000番のままなら止めなくてよいことも追記（17-a4） |

---

## 5. 低（4件）

| Day | 直した内容 |
|---|---|
| 13 | 「Step 6 の `handleTaskClick` の**仮実装（空の関数）**」→ 実際は `void taskId;` を書いている（13-a3） |
| 15 | 削除確認の見出し「`本当に削除しますか`」→ `delete-confirm-dialog.tsx:27` の既定値は「本当に削除しますか？」（末尾に `？`）（15-a5） |
| 16 | 完成コードの `<TaskCard>` に `key={task.id}` が無く、Day 13/14/15 の同じ JSX とずれていた。追加し、消すと警告が出る旨も添えた（16-a1） |
| 17 | 仮実装が `(_taskId: string) => {}`（アンダースコア接頭辞）で、Day 09・Day 13 の `void taskId;` と3通り目の書き方になっていた。`void taskId;` へ統一（17-a5） |

あわせてスクショのキャプション2件を実際の絵に合わせた（`day16:906`「時間記録後の合計作業時間の表示」→
実画像はどのカードも `0m`／`day21:19` 本文と `day21:21` alt の食い違い／`day21:622`「今日の終わりの姿」→
「完成版の姿」）。`day19:17` と `day19:744` の画像直後の空行欠落も補い、744 には
`day18:669-670` と同じ形の断り書きを追加した。

---

## 6. Day 19 の所要時間 — **本文側を上げた**

`day19:90` の「合計時間: 約29分」が `00_カリキュラム目次.md:322` の宣言する下限
「30分〜1時間20分」を1分下回っていた。**目次の範囲を広げるのではなく、本文の Step 配分を上げた。**

理由: Step 1（旧3分）は 96-248行の153行を使い、`findCommentAndAssertOwnership` の3段チェックに加えて
`update` と `delete` の2手続きを新規に書かせる。同じ「Step 0 で router を写経」の Day 18 は
約60行で11分（`day18:85`）で、3分は実態と合っていない。Step 6（旧5分）も削除処理・確認ダイアログ・
閉じるタイミングの集約の3つを含む。

| Step | 旧 | 新 |
|---|---|---|
| Step 1 | 3分 | **8分** |
| Step 6 | 5分 | **6分** |
| 合計 | 29分 | **35分** |

35分は目次の範囲（30分〜1時間20分）に収まる。目次側は変更していない。

---

## 7. Day 20 のステップ表（監査で「成立」判定・唯一の未解消件）

`day20:88-100` の内訳が実態と合っていなかった。Step 8 は `search/page.tsx` に加えて
`task/page.tsx` へ**5か所**の編集（import 差し替え・`taskIdParam` まわり・`useEffect` 追加・
`closeTaskDialog` 追加と2か所の呼び出し差し替え）を要求するのに5分だった。
実測で Step 8 は 1490-1759行の270行、Step 5 は182行で7分。行あたりの想定速度が2倍以上ずれていた。

| Step | 旧 | 新 | 根拠 |
|---|---|---|---|
| Step 8 | 5分 | **10分** | 270行・2ファイル・`task/page.tsx` へ5か所の編集 |
| Step 9 | 5分 | **7分** | 164行・プロジェクト結果と削除機能の2機能 |
| 合計 | 70分 | **77分** | 目次の上限80分に収まる |

Step 0（22分／424行）は据え置いた。上げると合計が目次の上限を超えるため、
配分の見直しはカリキュラム全体の設計判断になる。**未解消として残す。**

---

## 8. 理解チェック（9本すべてに新設）

`## 次回予告` の直前に `## 理解チェック` を置いた。形式は既存の `day01:1307` に合わせ、
3問＋各問の直下に答え。型は ①このコードは何をしとるか ②こう変えたらどうなるか ③なぜこの書き方か。
すべて**その日の本文だけで答えられる**ことを、本文の該当行を開いて確認した。

| Day | Q1（何をしとるか） | Q2（こう変えたら） | Q3（なぜこの書き方か） |
|---|---|---|---|
| 13 | `where.projectId = { in: projectIds }` の役目 | `isTaskStatus` を外して `as TaskStatus` | `canEdit`/`canDelete` を毎回渡す理由 |
| 14 | `assertTaskAssigneeBelongsToProject` | `Select` を `register('status')` で登録 | 未選択を `'unassigned'` で持つ理由 |
| 15 | `where` の `updatedAt`（楽観ロック） | `|| null` を `?? null` へ | 更新は `null`、作成は `undefined` |
| 16 | `increment: input.minutesToAdd` | `refine`（合計>0分）を外す | 成功後に `invalidate()` を呼ぶ理由 |
| 17 | `{ enabled: !!currentUser }` | `useMemo` の依存を `[]` へ | 日付を `YYYY-MM-DD` にそろえる理由 |
| 18 | 入力スキーマに `userId` が無い理由 | `.min(1).trim()` の順に入れ替え | `reset()` を `onSuccess` に置く理由 |
| 19 | `findCommentAndAssertOwnership` が取る3つ | 作者チェックを消す | `editingCommentId` を id で持つ理由 |
| 20 | `enabled: shouldSearch` | URL 由来の項目だけ書き戻す | `exclude: 'all'` の付く項目/付かない項目 |
| 21 | `activeTasksFilter` と `projectScope` の差 | 完了率の分母を入れ替える | 0件時に13項目を `0`/`[]` で埋める理由 |

`scan` の (c) の起案を土台にしたが、丸写しはせず material-writing の文体（ですます・
AI典型構文なし・英語直訳調なし）へ書き直した。

---

## 9. 検証

```
npx textlint material/30days-curriculum/day1{3,4,5,6,7,8,9}_*.md material/30days-curriculum/day2{0,1}_*.md
→ exit 0（0 problems）

bash scripts/curriculum-qa/check_quality.sh <9本それぞれ>
→ 内容チェックは9本すべて全 Step PASS
```

途中で踏んだもの（すべて解消済み）:

- `check_crossref`: 「Day 09 の `{ isArchived: showArchived }`」と書いたが、day09 の実体は
  波括弧なしの `isArchived: showArchived`（`day09:391`）だった。day09 を開いて実物を確認し、
  **day13 側の表記を実態へ合わせた**（day09 は担当外なので触っていない）
- `check_why`: day19 に足した Before ブロックの直後に説明が無かった（0字）。説明を追加
- `check_step_length`: day14 の完成コードに `void taskId;` を足した結果 27行になり上限25行を超過。
  ハンドラー群と早期 return の2ブロックへ分割し、それぞれに「なぜ」を付けた
- `check_no_skip`: day17 に足した文で禁止ワード「同じように」を使っていた。言い換え
- textlint `no-doubled-joshi` ほか計12件（理解チェックの新規文が中心）。すべて書き直して解消

---

## 10. 残件（このタスクの範囲では直していない）

1. **`day20` Step 0 の時間配分**（22分／424行）。上げると合計が目次上限80分を超える。
   カリキュラム全体の設計判断が要る
2. **`day15:229` の `as string`**。`day13:712` が `as` を「中身を確かめずに正しいと言い張る書き方」と
   明確に否定しているのに、教材のコードが `as` を使っている。ただし
   **`src/server/api/routers/task.ts:333` の実装がそうなっている**ため、教材だけ直すと
   実装とコードが食い違う。今回は「なぜここに `as` があるか」「判定と使用を1つの条件式に
   まとめれば消せる」という断りを本文に足すに留めた。**根治するには app 側の修正が要る**
   （担当外のため未着手）
3. **スクリーンショットの撮り直し**。文章側の断り書きは足したが、被写体そのものが違う画像は
   直せない。scan の集計では day13:3枚 / day14:2枚 / day15:3枚 / day16 / day17:2枚 /
   day19:2枚 / day21:4枚
4. **`day11` のアーカイブ手順に対象プロジェクトの指定が無い**（21-a3 の根本原因）。
   day21 側に断りを入れて回避したが、**根治は `day11:1076-1080` に
   「Day 10 で作った練習用を使う」等の指定を足すこと**。day11 は担当外
5. **`scan-day09-16.md` の 13-a1 / 14-a2 が誤り**（§0 参照）。同じ scan を使う他の担当者が
   同じ誤りを踏む可能性がある
6. `scripts/curriculum-qa/build_day_snapshots.py` が作業中で `restarts_file` を失っており、
   `test_build_day_snapshots` の自己テストが全ファイルで落ちる。HEAD には
   `def restarts_file` があり、作業ツリーには無い。**教材の内容とは無関係**
