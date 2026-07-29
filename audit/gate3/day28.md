# Gate3 初心者シミュレーション — Day 28 (2026-07-28)

- 対象: material/30days-curriculum/day28_タスク一括操作を実装しよう.md
- やり方: 教材の本文だけを読む初心者役が通し、詰まりを行番号つきで挙げた。
  挙がった各件を、別の判定者が「成立しない」を既定の立場として現物の行で反証した。
- 挙がった件数: 5 件 / 反証を生き延びた件数: 0 件

## 生き延びた詰まり

なし

## 反証で消えた件

5 件。挙がった内容と、反証側が示した根拠を全件残す。

### 消えた件 1. 行401 Step 1 の指示どおり page.tsx に selectableTasks / selectedTaskList …

**逐語引用**

```text
const selectableTasks = useMemo(
  () => tasks?.filter(
    (task) =>
      canEditProject(task.projectId)
      || canDeleteProject(task.projectId),
  ) ?? [],
```

**初心者役が挙げた詰まり**

Step 1 の指示どおり page.tsx に selectableTasks / selectedTaskList を貼り付けて保存すると、画面が `useMemo is not defined` で落ちる。どこに何を足せばよいか本文に書かれていないので手が止まる。

**初心者役が挙げた不足**

直前の行で「`useState` だけを使います（`useCallback` は不要です）」と宣言しておきながら、次のブロックで `useMemo` を使わせている。react からの `useMemo` の import 追加指示がどこにもなく、Day 28 の『今日足した import』一覧（1332〜1341行）にも react の行が無い。

**反証側が示した、成立しない根拠**

1) 引用は実在する。day28_タスク一括操作を実装しよう.md 401-408行:

```text
401: const selectableTasks = useMemo(
402:   () => tasks?.filter(
403:     (task) =>
404:       canEditProject(task.projectId)
405:       || canDeleteProject(task.projectId),
406:   ) ?? [],
407:   [tasks, canEditProject, canDeleteProject],
408: );
```

また 1327-1341行の「**今日足った import**」ブロックに react の行が無いことも確認した(1332行 lucide-react / 1333行 checkbox / 1334-1339行 dropdown-menu / 1340行 label のみ)。

2) しかし「useMemo の import 指示がどこにもない」は成立しない。読者の `src/app/task/page.tsx` には Day 13 の時点で既に useMemo が入っている。
day13_タスク一覧画面.md:

```text
1475: ### `src/app/task/page.tsx`
1481: // 完成版: クライアント宣言とインポートの前半
1485: import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
```

Day 13 本文 827行でも `import { useCallback, useMemo }` を足す指示があり、835行で「`useMemo`（計算した結果を覚えておく仕組み）と `useCallback`…」と説明済み。

3) Day 15 の完成版でも同ファイルの react import に useMemo が残っている。
day15_タスク編集・削除.md:

```text
1741: ### `src/app/task/page.tsx`
1747: // 完成版: React と部品のインポート
1753: import {
1754:   Suspense, useCallback,
1755:   useEffect, useMemo, useState,
1756: } from 'react';
```

4) Day 16〜27 で `src/app/task/page.tsx` を触るのは day16(1767行〜: handleTimeLogSuccess と TaskCard の props 追加)、day18(772行: TaskDetailDialog へ canEditProject を渡すだけ)、day20(1527-1575行: taskIdParam / useEffect / closeTaskDialog の差し替え)のみで、いずれも react の import 行を書き換えていない。`grep -n "from 'react'" day16*.md day20*.md` で出るのは day16:656/1426 の `import { useState } from 'react';`(別ファイル)と day20:653/2453 の `src/app/search/page.tsx`(2440行 filepath 明記)であり、task/page.tsx の import を上書きするブロックは存在しない。

したがって Day 28 で 401 行を貼っても `useMemo is not defined` にはならず、「今日足った import」に react が無いのは正しい(今日は追加不要なため)。読者が止まる箇所ではない。

補足(この指摘とは別の軽微な点): 356行「実際のコードを確認しましょう。`useState` だけを使います（`useCallback` は不要です）。」は Step 1 の state 追加についての記述で、直後に useMemo が出るため言い回しが紛らわしいが、import 不足という詰まりは発生しない。

### 消えた件 2. 行128 `_helpers/permission` から `findTasksWithPermission` を import …

**逐語引用**

```text
3つの手続きは、渡された id の配列をまとめて権限つきで取る共有ヘルパー `findTasksWithPermission`（複数形）を使います。Day 15 までに書いた `_helpers/permission` の import 文に、この1行を足して次の形にします。
```

**初心者役が挙げた詰まり**

`_helpers/permission` から `findTasksWithPermission` を import するよう言われるが、この関数を書いた記憶がない。permission ファイルを開いても単数形しか無ければ、import 行が解決できず Step 0 の3手続き全部が動かない。

**初心者役が挙げた不足**

複数形ヘルパーの中身も、それを作る手順も、この日にも過去の Day への参照にも書かれていない。「Day 15 で使った単数形の複数版と考えてください」とあるだけで、既存か新規かの判定材料が無い。

**反証側が示した、成立しない根拠**

【引用の実在確認】day28_タスク一括操作を実装しよう.md:128 は指摘どおり実在。「3つの手続きは、渡された id の配列をまとめて権限つきで取る共有ヘルパー `findTasksWithPermission`（複数形）を使います。Day 15 までに書いた `_helpers/permission` の import 文に、この1行を足して次の形にします。」

【前の Day で埋まっている】

1) day11_プロジェクト編集・削除.md:129「これは `_helpers/permission.ts` にまとまっている権限チェックの共通関数です。Day 07 で作った `_helpers/select.ts` と同じ場所にあり、こちらは配布済みの既存ファイルです。」— 読者は permission.ts を自分で書かない。配布済みであることが本文に明記されている。
2) day15_タスク編集・削除.md:123「`update` と `delete` は、対象のタスクを取りつつ『自分が触ってよいタスクか』を確認する共有ヘルパー `findTaskWithPermission` を使います。…この1行を足して次の形にします。」／同:135「`findTaskWithPermission` は『id でタスクを1件取り、…』共有ヘルパーです。」— 単数形も読者は実装しておらず、import を1行足すだけ。つまり day28 の複数形も同じ扱いで、「自分で書いた記憶が無い」ことは詰まりの根拠にならない（単数形も書いていない）。

【配布足場に実体がある】
scripts/_server-routers/_helpers/permission.ts:77「export const findTasksWithPermission = async (ids: string[], userId: string) => {」— 配布足場の permission.ts に複数形ヘルパーの実体が既に存在（本体は 77〜93行、findMany + 件数照合 + assertMemberPermission ループ）。src/server/api/routers/_helpers/permission.ts:77 も同一。よって import 行は解決し、Step 0 の3手続きは動く。

【補足（非ブロッカー）】day28:1156「複数形は今日足したもので、単数形は Day 15 で書いた1件用のヘルパーです。」は、実際には両方とも配布済みファイル側にある点で表現が不正確だが、import 解決には影響せず読者は止まらない。

指摘が言う「複数形ヘルパーの中身も、それを作る手順も書かれていない」は、単数形と同じく『書く対象ではない』ため不足ではない。survives: false。

### 消えた件 3. 行976 status.ts に `isTaskStatus` が無かった場合、import 行を足しても解決しない。本文は 10…

**逐語引用**

```text
`TASK_STATUS_LABELS` は過去の Day で import 済みです。
同じ `@/lib/constant/status` の import 文に
`isTaskStatus` と `type TaskStatus` が無い場合だけ
加えてください。別の import 文を重複させません。
```

**初心者役が挙げた詰まり**

status.ts に `isTaskStatus` が無かった場合、import 行を足しても解決しない。本文は 1050 行で関数の中身を見せるが「作れ」とは書いていないため、自分で書き足してよいのか判断できずに止まる。

**初心者役が挙げた不足**

『無い場合だけ加えてください』は import 文の話で、関数本体が存在しない場合の手順が無い。1047〜1056 行のコードブロックも「確認ポイント」として提示されており、写経対象なのか参照用なのか区別できない。

**反証側が示した、成立しない根拠**

【引用の存在確認】day28_タスク一括操作を実装しよう.md 976-979行に指摘の引用は実在する:
976: 「`TASK_STATUS_LABELS` は過去の Day で import 済みです。」
977: 「同じ `@/lib/constant/status` の import 文に」
978: 「`isTaskStatus` と `type TaskStatus` が無い場合だけ」
979: 「加えてください。別の import 文を重複させません。」

【前提が成立しない】指摘は「status.ts に isTaskStatus が無かった場合」を前提にするが、その状況は起きない。isTaskStatus は Day 28 以前から読者の手元の status.ts に存在する既存関数である。

1) 足場の現物: scripts/_constants/status.ts:28
   `export function isTaskStatus(value: unknown): value is TaskStatus {`
   （29行目 `return typeof value === 'string' && value in TASK_STATUS;`）

2) 足場が読者へ渡ることが本文に書かれている:
   - day09_プロジェクト一覧画面.md:67 「        └── status.ts         ← 既存（利用する）」
   - day13_タスク一覧画面.md:94 「    status.ts             ... ステータス定義・型ガード（既存）」
   - day13_タスク一覧画面.md:97 「`status.ts` にはステータスの日本語ラベルと型ガード（値が想定の種類かを確かめる関数）が入っていて、Step 3 と Step 4 で使います。」

3) 読者は Day 13 の時点で実際に import して使い切っている:
   - day13:603-607 「import {\n  isTaskStatus,\n  TASK_STATUS_LABELS,\n  type TaskStatus,\n} from '@/lib/constant/status';」
   - day13:610 「`isTaskStatus` は、受け取った文字列がステータスとして正しいかを確かめる関数です。」
   - day13:613 「- `isTaskStatus` 型ガードもインポートしている」
   さらに day14:2852、day15:1800、day20:717、day22:693、day23:2005 でも同じ import が繰り返し登場する。

【1047-1056 の位置づけ】このコードブロックは新規作成の写経対象ではなく、既存関数の中身を「なぜ型ガードが要るか」の説明として再掲したもの。直前の day28:1043「**`isTaskStatus` 型ガードが必要な理由**」、1045「`isTaskStatus(value)` で『この文字列は確かに有効なステータスか』を確認することで、型安全に呼び出せます。」、直後の 1058「**確認ポイント**: `isTaskStatus` は `value in TASK_STATUS` で有効なステータスかを判定しています。」1060「この関数は `value in TASK_STATUS` で…型ガードとして機能します。」が説明文脈であることを示す。写経してもファイル内容は既存と同一（scripts/_constants/status.ts:28-30 と一致）なので、参照用と誤読しても実害はなく、読者は止まらない。

よって「関数本体が存在しない場合の手順が無い」という不足は、そもそも発生しない場面についての指摘であり成立しない。

### 消えた件 4. 行489 page.tsx には Day 13 以降で書いた同じ grid の一覧が既にある。新しいブロックを追記すべきか、既存の…

**逐語引用**

```text
// タスク一覧の grid レイアウト
<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {tasks && tasks.length > 0 ? (
    tasks.map((task) => {
```

**初心者役が挙げた詰まり**

page.tsx には Day 13 以降で書いた同じ grid の一覧が既にある。新しいブロックを追記すべきか、既存の grid を丸ごとこれに置き換えるべきかが書かれておらず、追記すると一覧が二重に出る。

**初心者役が挙げた不足**

直前の 481 行が「実際のコードでは `TaskCard` コンポーネントをグリッドで並べています」と既存の存在に触れているのに、この段のコードが「置き換え」なのか「追加」なのかを明示していない。Step 4 では『Step 3 で書いた Checkbox の checked を差し替える』と明示しているのに、ここだけ指示が無い。

**反証側が示した、成立しない根拠**

現物確認: material/30days-curriculum/day28_タスク一括操作を実装しよう.md

1. 引用は実在。489-492行「// タスク一覧の grid レイアウト」「<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">」「  {tasks && tasks.length > 0 ? (」「    tasks.map((task) => {」。481行も「実際のコードでは `TaskCard` コンポーネントをグリッドで並べています。`TaskCard`・`handleEdit`・`handleDelete`・`handleTaskClick`・`handleCreate` は過去の Day で作成済みです。」で確認。

2. 同ファイルのより前(34-37行「始める前の前提」直後の引用ブロック)に、この日全体を貫く指示が明記されている:
   34: 「> Day 13〜16 で作った import、`TaskCard`、」
   35: 「> `DeleteConfirmDialog`、時間記録機能は残します。」
   36: 「> 同じ import やコンポーネントを追加し直さず、」
   37: 「> 既存コードへ一括操作だけを統合してください。」
   「同じ…コンポーネントを追加し直さず、既存コードへ一括操作だけを統合」は、まさに「既存の一覧をもう1つ足すな、既存へ統合しろ」という指示であり、一覧が二重に出る事態を直接封じている。

3. 当該Step内でも「追加ではなく既存への統合」であることが本文で示されている:
   514行「上のコードブロックの `</div>` 閉じタグは次のブロックに続きます。各タスクカードは `flex-1 min-w-0 h-full` のラッパーで囲み、`TaskCard` に props を渡します。」（既存カードを「囲む」=ラップする作業）
   538行「ここで `TaskCard` に渡している props は、Day 13〜16 で1つずつ増やしてきたものをそのまま並べただけです。今日の一括操作のために新しく足した props は1つもありません。チェックボックスをカードの外側へ置く形にしたので、カード本体は一行も書き換えずに済んでいます。」（新規の別一覧ではなく、既存カード列の外側へチェックボックスを差し込む形だと明言）

4. 「完成コード全体」でも一覧の grid は1つだけ。1648-1649行「// 完成版: タスク一覧のチェックボックス部分」「<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">」で、最終形の page.tsx に grid 一覧が1つしか存在しないことを読者が突き合わせで確認できる（1132行「途中でどこへ貼ったか分からなくなった場合は、以下のコードと手元のファイルを見比べてください。」）。

以上より、「追記して一覧が二重に出る」は34-37行の明示指示・481/514/538行の文脈・1648行の完成版突合で埋まっている。Step 4 (684行「// Step 3 で書いた Checkbox の checked を差し替える」)のような一行注記が無いのは事実だが、読者が実際にそこで止まるとは言えない。

### 消えた件 5. 行610 「フィルター行」が page.tsx のどのブロックを指すのか分からず、全選択チェックボックスの貼り付け先を決められない…

**逐語引用**

```text
import { Label } from '@/component/ui/label';

// フィルター行の先頭に配置
<div className="flex items-center space-x-2">
  <Checkbox
    id="select-all"
```

**初心者役が挙げた詰まり**

「フィルター行」が page.tsx のどのブロックを指すのか分からず、全選択チェックボックスの貼り付け先を決められない。

**初心者役が挙げた不足**

「フィルター行」という呼び名がこの教材に一度も出てきておらず、Step 5 のようにコード（`<div className="flex items-center justify-between">` など）で貼り付け先を示していない。

**反証側が示した、成立しない根拠**

【引用の実在確認】day28_タスク一括操作を実装しよう.md 610-621行に指摘の引用が実在する:
610: import { Label } from '@/component/ui/label';
612: // フィルター行の先頭に配置
613: <div className="flex items-center space-x-2">
614:   <Checkbox
615:     id="select-all"
616:     checked={isAllSelected}
621:   <Label htmlFor="select-all">すべて選択</Label>
grep の結果、「フィルター行」は day28 全体で 612行の1件のみ、30days-curriculum 全ファイルでも同1件のみ。

【同じファイルの別箇所で埋まっている】
583行: 「### Step 3: まず「全選択 / 全解除」チェックボックスを作る（4 分）」
584行: 「**ゴール**: ヘッダーにチェックボックスを追加し、シンプルな全選択・全解除を実装します。」
586行: 「スクリーンショット: ヘッダーに全選択・全解除のチェックボックスが表示された画面を確認してください。」
630行: 「- ヘッダーのチェックボックスをクリックすると全タスクが選択される」
= 貼り付け先が「ヘッダー領域」であることが Step 3 内で見出し・ゴール・確認ポイントの3か所で明示されている。

【前の日で埋まっている】day13_タスク一覧画面.md
635行: 「### Step 4: フィルターUIを作る（7分）」
641行: 「`<h1>` タグの直下に追加します。プロジェクト選択のドロップダウンです。」
645-647行:
  // h1タグの直下に追加: フィルター外枠
  <div className="flex gap-2 w-full
  sm:w-auto ml-auto">
667行の解説: 「`ml-auto` は、この操作欄を見出しの反対側へ寄せる指定です。」
= src/app/task/page.tsx 内で唯一のフィルター用コンテナであり、h1 と同じ行（ヘッダー行）に並ぶ。day13 1643行、day14 3077-3078行、day15 2110-2111行の完成版でも同一の `<div className="flex gap-2 w-full sm:w-auto ml-auto">` が再掲されており、day28 到達時点で読者のファイルに存在することが確定している。day20 の検索フィルターは別ページ（検索ページ）であり task/page.tsx には増えない。

【結論】「フィルター行」は day13 の「フィルター外枠」と呼称が揺れているだけで、page.tsx 内でフィルターUIは1ブロックしか存在せず、指す先は一意。さらに Step 3 本文が「ヘッダー」と3回明示しているため、読者が貼り付け先を決められず止まるとは言えない。呼称の統一は改善余地だが、詰まりとしては成立しない。
