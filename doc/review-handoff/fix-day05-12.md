# day05〜12 修正記録

担当: `material/30days-curriculum/` の day05〜day12（8本）
根拠: `doc/review-handoff/scan-day01-08.md`（day05-08）/ `scan-day09-16.md`（day09-12）
文体規範: `.claude/skills/material-writing/SKILL.md`（ですます体・関西弁禁止・AI典型構文禁止）

---

## 1. 事実の誤り（実ファイルで裏取りしたもの）

### 実ファイルを開いて現物と突き合わせた項目

| 確認した実ファイル | 確認した内容 | 実測値 |
|---|---|---|
| `scripts/_lib-base/rate-limit.ts:5-6` | ログイン失敗のロック回数 | `EMAIL_IP_LIMIT = 5`（同一 email × 同一 IP）。`EMAIL_LIMIT = 10` は IP を跨いだ合算用の別軸で、読者が自分の1台で試す経路には効かない |
| `src/component/project/project-detail-view.tsx:31-40` | `ProjectDetailViewProps` の必須 props | **8個すべて必須**（`?` は1つも無い）。`projectDetail` / `onBack` / `onAddMemberClick` / `onRemoveMember` / `onUpdateMemberRole` / `onArchive` / `canManageMembers` / `canArchive` |
| `src/component/project/project-detail-view.tsx:86,134,158,194` | `canArchive` / `canManageMembers` の効き方 | `canArchive && (...)` がアーカイブボタンを、`canManageMembers` がメンバー管理ボタンを出し分ける |
| `scripts/_server-base/trpc.ts:85-89` | export している procedure の数 | `publicProcedure` / `protectedProcedure` / `adminProcedure` の**3種類**（`createTRPCRouter` と `createCallerFactory` は入口ではない） |
| `scripts/scaffold-from-scratch.sh:470-500`, `scripts/_server-routers/_helpers/`, `scripts/_app-api-trpc/` | day07 Step 0 時点で既に存在するファイル | `select.ts` と `route.ts` は scaffold 済み＝控えを取れる。`middleware.ts` は scaffold されず、day07 Step 5 で新規作成 |
| `audit/clean-run-2026-07-29-day11-20.md:69-70` | day11 終了時点の型エラー実測 | 5件（`getById` 1件 ＋ `project-detail-view.tsx` の implicit any 4件）。`npm run build` が `Failed to compile.` |
| `day10` 全文 grep | `currentUser` の存在 | つまずき表の1行にしか無く、コード側には1つも無い（初出は `day11:443`） |
| `day10:744`, `day10:870,928` | `createMutation` の `onError` | day10 には無い（本文が「Day 10 から Day 14 は `onError` を書きません」と明記） |

### 直した件数（重要度別）

| 重要度 | 件数 | 内訳 |
|---|---:|---|
| BLOCKER | 1 | day11 の `ProjectDetailView` 必須 props 欠落（2箇所のコードブロック＋props表） |
| 致命 | 3 | day05 rate limit の回数、day07 rate limit の回数、day11 アーカイブ対象の未指定 |
| 重 | 4 | day11 型エラー予告の不足、day07 Step 0 の控え不足、day07 `/` がログイン必須になる無予告、day08 モバイルでナビ・ログアウトが消える無予告 |
| 中 | 5 | day08 冒頭画像7項目 vs 確認ポイント3項目、day07 procedure 3種類 vs 4種類、day05 Step4/Step6 の状態食い違い、day05 「4つのブロック」実際は3つ、day10 存在しない `currentUser` |
| 軽 | 1 | day06 `password123` が当日教えた規則を満たさない件の補足 |
| **合計** | **14** | |

### 個別の内容

| # | 箇所 | 直した内容 |
|---|---|---|
| 1 | `day05` 確認ポイント | 「10回続けて失敗すると」→「**5回**続けて失敗すると」。あわせて解除方法（15分待つ／別のメールアドレス）をその場に1行足した。従来は解除方法が `day07:2450` にしか無く2日後だった |
| 2 | `day07` つまずき表 | 「同じメールで10回失敗」→「同じメールで**5回**失敗」 |
| 3 | `day07` Step 0 | 控えを4ファイル→**6ファイル**に。`select.ts` と `route.ts` を追加し、なぜ6つなのか（4つは上から書き直し／2つは中身を置き換え）と、`middleware.ts` は新規作成なので控え不要である理由を明記。確認ポイントも6ファイル名に更新 |
| 4 | `day07` 完成コード表 | `trpc.ts` の役割「4種類の入口」→「**3種類**の入口」（`:580`/`:592` の本文と一致させた） |
| 5 | `day07` Step 5 | matcher の解説末尾に、**`/` がログイン必須になる**予告を追加。従来は完成コード節（`:2419`）にしか無く、Step 6 の動作確認で `/` が開けなくなる読者に説明が届いていなかった |
| 6 | `day08` 冒頭 | 完成イメージ画像が7項目・当日のコードが3項目という矛盾に、本文で決着を付けた。「この写真は最後まで進めたあとの姿。今日作るのは3つ。残り4つは Day 13 以降」と明記し、確認ポイント `:547` の「3つ」と整合させた |
| 7 | `day08` Step 3-3 | `hidden md:flex` の解説に、**768px 未満ではナビもログアウトも消える**ことと代替を作らない旨、動作確認はパソコンで行う旨を追加。確認ポイントにも1項目追加 |
| 8 | `day11` Step 9 + 完成コード | `ProjectDetailView` に渡す props を **5個 → 8個**に修正（2箇所）。`onUpdateMemberRole={() => {}}` / `canManageMembers={false}` / `canArchive={true}` を追加し、それぞれ**なぜその仮の値なのか**を解説。props 一覧表も8行に拡張 |
| 9 | `day11` Step 9 | 型エラーの予告を「`getById` の1件」→**「5件出る。直接原因1件＋連鎖4件」**に修正。あわせて **`npm run build` が今日は通らない**ことを明記（Day 04 で「公開前に必ず build」と習慣づけた読者への手当て） |
| 10 | `day11` Step 9 | 「TypeScript エラーを出さずに Day 11 を完了させるための一時定義です」という誤った説明を修正。確認ポイントの「`npm run dev` で TypeScript エラーが出ていない」も、仮定義4つを書いたかの確認に置き換えた |
| 11 | `day11` アーカイブフロー | **対象を「モバイルアプリ開発」に明示**し、「Webサイトリニューアル」は Day 13 以降で使うため避ける理由を書いた。さらに**解除手順（手順5・6）を新設**し、解除し忘れると Day 21 の統計・Day 22 のグラフ・Day 23 のレポートが3日続けて0になることを警告。確認ポイントにも解除確認を追加 |
| 12 | `day12` Step 2 | day11 側の修正に合わせ、「3つが今日の追加分」→「渡す数は8つのまま、Day 11 の仮の値を本実装に差し替える」に変更。確認ポイントも1項目追加 |
| 13 | `day12` 末尾 | **Day 11 の型エラーの後始末**節を新設。`npm run build` を実行して5件が消えたことを確認させ、残る場合は仮定義の消し忘れを疑う導線を書いた。day11 が開いた「build が落ちる」を day12 で閉じる |
| 14 | `day05` Step 6 | ①Step 4 で消した `<div className="w-full max-w-sm">` を Step 6 が「まだある」前提で書いていた食い違いを解消。②「ここから4つのブロックで書き直します」→ 実際のブロック数**3つ**に修正 |
| 15 | `day06` Step 10 | `admin@example.com` / `password123` が、同じ日に教えた「大文字・小文字・数字・記号」の規則を満たしていない件に説明を追加。登録画面の関門とログイン画面の照合は別物であることと、シードは登録画面を通らないことを書いた |
| 16 | `day10` つまずき表 | 存在しない `currentUser` を原因に挙げていた行を、day10 の実装に即した内容（バリデーションで止まる／`onError` が無いのでサーバーエラーが画面に出ない）に差し替え |

---

## 2. `## 今日学んだ用語` の補完（新設 2節）

day07 と day08 だけが持っていなかった。他日と同じ `| 用語 | 意味 |` の表形式で新設し、
各日の `### 新しく学ぶ概念` と本文で実際に説明した語を土台にした。

| 日 | 追加した用語 |
|---|---|
| day07 | JWT / 署名 / exp / bcrypt / HttpOnly Cookie / maxAge / publicProcedure / protectedProcedure / adminProcedure / middleware / matcher / rate limit（12語） |
| day08 | Provider / useQuery / AppLayout / aside / hasMounted / AlertDialog / asChild / md:（8語） |

---

## 3. `## 理解チェック` の新設（8節）

8本すべての `## 次回予告` の直前に新設。既存の `day01:1307` と同じ書式
（`**Q1. …**` → `A. …` を3問、各問の直下に答え）にそろえた。

問いの型は3種類を1問ずつ。①このコードは何をしているか ②こう変えたらどうなるか ③なぜこの書き方か。
`scan` の (c) の起案を土台にしつつ、material-writing の文体（ですます体・1文120字以下・
偏愛語なし）に書き直した。**すべてその日の本文だけで答えられる**ことを確認済み。

| 日 | Q1（何をしているか） | Q2（変えたらどうなるか） | Q3（なぜこの書き方か） |
|---|---|---|---|
| day05 | `resolver: zodResolver(loginSchema)` | `password` を `.min(1)`→`.min(8)` | `router.push` でなく `window.location.replace` |
| day06 | `.refine(...)` の二段目の検査 | `path: ['confirmPassword']` を書き忘れる | `mutate` に `confirmPassword` を渡さない |
| day07 | `role: currentUser.role` の上書き | `Math.floor(Date.now() / 1000)` の `/ 1000` を消す | 「存在しない」と「パスワード違い」を同じ文言にする |
| day08 | `!hasMounted \|\| isLoading` と `!session?.user` の2つ | `menuItems` に4件目を足す | ダッシュボード側の `<main>` を `<div>` にする |
| day09 | `where.members = { some: { userId } }` | `data: projects` を `data: projects = []` に | 空状態の `<div>` に `col-span-full` |
| day10 | `members: { create: { role: OWNER } }` | その `members.create` を消す | キャンセルボタンの `type="button"` |
| day11 | `updateData` を空から1つずつ足す | `delete` を `assertMemberPermission(..., 'canDelete')` に | `handleDelete` が `mutate` を直接呼ばない |
| day12 | `projects: { none: { projectId } }` | `addMember` の `if (existing)` を消す | ADMIN でも OWNER を追加できない |

---

## 4. 検証結果

### textlint

```
npx textlint material/30days-curriculum/day0{5,6,7,8,9}_*.md material/30days-curriculum/day1{0,1,2}_*.md
→ exit 0（0件）
```

途中で出た指摘は、いずれも今回の追記が原因で、すべて潰した。

| 指摘 | 箇所 | 対応 |
|---|---|---|
| `sentence-length`(138 > 120) | day07 Step 0 の新規段落 | 1文を3文に割った |
| `no-doubled-joshi`「から」 | 同上 | 「〜からです」→「〜ためです」、「上から書き直す」→「順に書き直す」 |
| `no-doubled-joshi`「も」 | day08 モバイル予告 | 「リンク**も**ボタン**も**」→「リンク**と**ボタン**が**」 |
| `no-mix-dearu-desumasu`（リスト） | day08 確認ポイント | `preferInList: "である"` に合わせ「（仕様です）」→「（仕様どおりの動き）」 |
| `no-doubled-joshi`「が」 | day11 props 解説 | 1文を3文に割った |
| `no-doubled-joshi`「が」 | day12 理解チェック A2 | 「例外**が**」→「例外**は**」 |

**以降の追記では、箇条書き＝「である」調／地の文＝「ですます」調を最初から守って書いた**
（`.textlintrc.json` の `preferInBody: "ですます"` / `preferInList: "である"`）。

### check_quality.sh

8本それぞれ実行。**Step 1〜Step 8 は 8本すべて PASS**。

| Step | 内容 | day05〜12 の結果 |
|---|---|---|
| Step 1 | 視覚化 | ✅ 8/8 PASS |
| Step 2 | コードブロック25行以下 | ✅ 8/8 PASS |
| Step 3 | ステップ連続性 | ✅ 8/8 PASS |
| Step 4 | 禁止ワード | ✅ 8/8 PASS |
| Step 5 | 技術スタック | ✅ 8/8 PASS |
| Step 6 | コード完全性 | ✅ 8/8 PASS |
| Step 7 | 理解度・文体 | ✅ 8/8 PASS |
| Step 8 | — | ✅ 8/8 PASS |

Step 4 で一度 `禁止ワード発見: '残りも'`（day11 の新規段落）が出たので、
「ほかの props も」に書き換えて PASS させた。

`check_crossref.py` 単体は **exit 0（36ファイル OK）**。
途中 `day11: build — Day 12 に build がありません` が出たが、これは day11 に
「`build` が通る状態に戻るのは Day 12」と書いたのに day12 が `build` に触れていなかったため。
day12 に「Day 11 に残した型エラーの後始末」節（上記 #13）を足して解消した。
**参照切れを消すための辻褄合わせではなく、day11 が開いた伏線を day12 で回収する内容として書いた。**

### 残っている FAIL（自分の担当外・他エージェントの作業中）

`check_quality.sh` の総合判定は8本とも exit 1 のままだが、原因は担当範囲の外にある。

| 失敗 | 原因 | 判断 |
|---|---|---|
| `test_build_day_snapshots FAIL` | `AttributeError: module 'build_day_snapshots' has no attribute 'restarts_file'`。`scripts/curriculum-qa/build_day_snapshots.py` が `git status` で `M`（編集中）。`progress.md` の「`build_day_snapshots.py` 新設 — 実行中」に該当 | **教材の内容とは無関係のツール側のエラー。**触っていない |
| `check_crossref` の一時的 FAIL | 測定中に `day04_ネットに公開.md: (6/6) — Day 01 に (6/6) がありません` が出た時間帯があった。day04 は担当外で、他エージェントが編集中 | 最終確認では解消済み（exit 0）。触っていない |

---

## 5. 直していない既知の指摘（担当範囲だが、別作業が要るもの）

| 指摘 | なぜ今回直していないか |
|---|---|
| スクショの撮り直し（day05:2枚 / day06:4枚 / day07:1枚 / day08:1枚 / day09:6ファイル / day10:2ファイル / day11:5ファイル / day12:4ファイル） | 画像の再撮影が要る。day08 の冒頭画像だけは、撮り直しまでの間も読者が誤解しないよう本文で断りを入れた（#6） |
| `00_カリキュラム目次.md:135` と `day08:61` の齟齬（モバイル対応・ロールベースメニュー） | 目次ファイルが担当範囲外 |
| day09 の同じ `ProjectCard` を3回書かせる構成（9-a1） | 構成そのものの作り直しで、事実の誤りではない |
| day05 の「今日書いた成功経路を今日は確認できない」（05-A3） | 資格情報の提示順（day06/day07）に関わる構成上の問題 |
