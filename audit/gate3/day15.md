# Gate3 初心者シミュレーション — Day 15 (2026-07-28)

- 対象: material/30days-curriculum/day15_タスク編集・削除.md
- やり方: 教材の本文だけを読む初心者役が通し、詰まりを行番号つきで挙げた。
  挙がった各件を、別の判定者が「成立しない」を既定の立場として現物の行で反証した。
- 挙がった件数: 5 件 / 反証を生き延びた件数: 1 件

## 生き延びた詰まり

### 1. 行447 「Day 14 で書きました」と示す形が、Day 14 の完成版と違う

**逐語引用**

```text
  reset(buildTaskFormValues(
    initialData,
    projects
  ));
}, [initialData, open, projects, reset]);
```

**何ができないか**

「Day 14 の Step 3 で、TaskDialog に以下の設定を書きました」と言われて自分の `task-dialog.tsx` と
見比べるが、中身が一致しない。自分が間違えたと思い、この形へ書き直してしまう。

**教材のどこが足りないか**

Day 14 の完成版は `projectsRef.current` を渡し、依存配列は `[initialData, open, reset]`。
しかも Day 14 は「依存配列へ `projects` を入れると入力途中のタイトルが消えます」と明示して避けている。
Day 15 はその避けた形を「書きました」として提示している。行399から422の `buildTaskFormValues` からも
`expectedUpdatedAt` が落ちている。

**反証側が確かめた根拠**

- 行394から395、行399から422、行441から447、行450から460を現物で確認した。
- Day 14 の行2282、行2308から2309、行2314、行2346、行2365から2377、行2380を確認し、
  完成版が10項目かつ `projectsRef` を使う形であることを確認した。
- Day 15 全体を検索したが `projectsRef` は1件も出現せず、行399から422を訂正する箇所も無い。
- むしろ行922から926は、`expectedUpdatedAt` を欠いた版を正として参照させている。一方で行631と行643は
  フォーム値に `expectedUpdatedAt` が入っている前提で送信処理を書かせるため、
  行399から422のとおりに直すと同時編集の衝突検出が効かなくなる。
- 対象は Day 14 で読者自身が書いたファイルで、配布物として上書きされる旨の記述は Day 15 に無い。

## 反証で消えた件

4 件。挙がった内容と、反証側が示した根拠を全件残す。

### 消えた件 1. 行606 指示どおり page.tsx へ追加すると、Day 14 の Step 8 で書いた `const handleSubm…

**逐語引用**

```text
// filepath: src/app/task/page.tsx
const handleSubmit =
  (data: TaskFormData) => {
    if (data.id) {
      updateMutation.mutate({
```

**初心者役が挙げた詰まり**

指示どおり page.tsx へ追加すると、Day 14 の Step 8 で書いた `const handleSubmit = (data: TaskFormData) => {...}` と同名の宣言が2つ並び、`Identifier 'handleSubmit' has already been declared` でページ全体が動かなくなる。

**初心者役が挙げた不足**

Step 2 の `handleEdit`(L494)、Step 7 の `handleDelete`(L773)、Step 8 の `handleCreate`(L832) には「置き換えます」「増やさず中身だけ差し替えます」と明記されているのに、Step 4 の `handleSubmit` にだけその指示がない。Step 5(L683) が「handleSubmitの続き」と書いているため、Day 14 版を消すことも読み取れない。

**反証側が示した、成立しない根拠**

【引用の実在確認】day15_タスク編集・削除.md L587-589「### Step 4: update用の送信ハンドラー（5分）」「**ゴール**: 既存タスクの更新処理を実装します。」、L605-609「// filepath: src/app/task/page.tsx」「const handleSubmit =」「  (data: TaskFormData) => {」「    if (data.id) {」「      updateMutation.mutate({」。指摘の引用は実在する。またL494「Day 13 で置いた仮の `handleEdit` は、この中身へ**丸ごと置き換え**ます。2つ並べると同じ名前を2回宣言することになり、ページ全体が止まります。」、L773「Day 13 で置いた仮の `handleDelete` を**置き換え**ます。仮のほうは残しません。」、L832「Day 14 で書いた `handleCreate` を**置き換え**ます。増やさず、中身だけ差し替えます。」も実在し、Step 4 の handleSubmit だけ同種の文言が無いのも事実。

【前の日で埋まっているか → 埋まっている】day14_タスク新規作成.md L1361-1368 で、読者は自分の src/app/task/page.tsx に次を書いている:

```text
```typescript
// filepath: src/app/task/page.tsx
// createMutationの下に追加

// 送信ハンドラー（新規作成のみ）
// Day 15で編集モード（data.id分岐）を追加します
const handleSubmit =
  (data: TaskFormData) => {
```

L1365「// 送信ハンドラー（新規作成のみ）」・L1366「// Day 15で編集モード（data.id分岐）を追加します」は、読者自身が page.tsx に打ち込んだコメントであり、宣言のすぐ真上に残っている。Day 15 Step 4 が書かせるのは、まさにその「data.id 分岐」そのもの（L608-609「if (data.id) {」）。つまり読者は、自分のファイルの当該行に「ここへ Day 15 で data.id 分岐を足す」と書いてあるのを見ながら、同じ関数へ手を入れることになる。新しく2つ目の `const handleSubmit` を隣に並べる読み方は、この予告コメントと矛盾する。

【同ファイル内の別箇所でも補強されている】day15 L683「// handleSubmitの続き: 新規作成分岐」および L674「`handleSubmit` を完成させます。」が、Step 4 と Step 5 が1つの関数を作り上げる流れであることを示す。Step 5 が足す新規作成分岐（L685-701）は Day 14 版 handleSubmit の中身とほぼ同一で、Day 14 版を残したままでは同じ処理が二重に存在することになり、「続き」「完成させます」という記述と整合しない。さらに day15 L1176 以降に「途中でどこへ貼ったか分からなくなった場合は、以下のコードを上から順に貼り付けて」とファイル全文が置かれ、L1137 の全文版 page.tsx では `const handleSubmit = (data: TaskFormData) => {` が1つだけである。

【結論】Step 4 に「置き換え」の明文が無いのは事実だが、Day 14 の宣言直上の予告コメント（L1365-1366）が読者の手元ファイルに残っており、それが同じ関数への追記であることを示している。読者が同名2重宣言に至る経路は塞がれている。

### 消えた件 2. 行535 この行を書いた時点で `react-hot-toast` が入っていなければ Module not found で止まる…

**逐語引用**

```text
import toast from 'react-hot-toast';

`toast` は画面の隅に短い通知を出す道具です。更新は自分の入力ミス以外でも失敗するので、失敗を伝える先を先に用意しておきます。
```

**初心者役が挙げた詰まり**

この行を書いた時点で `react-hot-toast` が入っていなければ Module not found で止まる。教材には `npm install` の手順も、どの日に入れたかの記載もないので、次に何をすればよいか分からない。

**初心者役が挙げた不足**

`react-hot-toast` は Day 13・Day 14 の本文に一度も現れず、Day 14 は「知らせる仕組みは Day 15 で足します」(day14 L1359) と先送りしている。その受け皿であるこの日に、パッケージの導入手順も「Day 01 の scaffold に入っている」といった前提の明示もない。

**反証側が示した、成立しない根拠**

【引用の存在確認】
material/30days-curriculum/day15_タスク編集・削除.md:535 は逐語で `import toast from 'react-hot-toast';`、L538 は「`toast` は画面の隅に短い通知を出す道具です。更新は自分の入力ミス以外でも失敗するので、失敗を伝える先を先に用意しておきます。次のブロックの `onError` からこれを呼びます。…」。引用は実在する。

【前の日で埋まっている（Day 05）】
day05_ログイン画面のUI.md:598-599 逐語:

```text
// トースト通知ライブラリ（画面上部にメッセージを表示）
import toast from 'react-hot-toast';
```

day05 L606 逐語: 「> `react-hot-toast` はログイン成功時に通知メッセージを表示するライブラリです。Day 01の初期セットアップでインストール済みなので、import するだけで使えます。」
→ 指摘が言う「どの日に入れたかの記載がない／前提の明示がない」は成立しない。Day 01 scaffold 同梱であることが Day 05 で明示済み。

day05 L1377（トラブルシュート表）逐語: 「| `toast is not a function` | `react-hot-toast` が見つからない | Day 01の初期セットアップで導入済みのはず。見つからない場合は `npm i react-hot-toast` を実行 |」
→ 万一入っていない場合の `npm i react-hot-toast` という復旧手順まで Day 05 時点で読者に渡っている。

さらに day05 L1046 でも `import toast from 'react-hot-toast';` を再度書いており、読者は Day 15 到達時点で同一 import を2回書いた経験がある。

【Toaster 側も Day 08 で完了】
day08_サイドバーを完成させよう.md:115 逐語 `import { Toaster } from 'react-hot-toast';`、L122 `      <Toaster />`、L132 逐語「| `Toaster` | `toast()` で出す通知の表示場所。これが無いと通知は一切出ない |」、L140「- [ ] `<Toaster />` が入っている」。
→ 通知の表示先も Day 15 より前に設置済み。

【結論】
Day 15 L535 で `react-hot-toast` が未インストールで Module not found になる前提自体が、Day 05 L606 の「Day 01の初期セットアップでインストール済み」と Day 05 L1377 の復旧コマンド、Day 08 L115-122 の Toaster 設置によって否定される。読者はここで止まらない。

### 消えた件 3. 行786 page.tsx の末尾は `</div>` `</AppLayout>` `);` `}` と閉じタグが続く。「閉じタ…

**逐語引用**

```text
続いて、JSXの閉じタグ付近に
`DeleteConfirmDialog` を配置します。
```

**初心者役が挙げた詰まり**

page.tsx の末尾は `</div>` `</AppLayout>` `);` `}` と閉じタグが続く。「閉じタグ付近」のどこへ入れるか決められず、`</AppLayout>` の後ろへ入れると JSX の構文エラーで画面が出なくなる。

**初心者役が挙げた不足**

他のステップ（Day 13 の「グリッドの直下」、Day 14 の「`<h1>` の直後」）は貼り先を要素名で指しているのに、ここだけ「閉じタグ付近」という位置指定になっている。完成版(L2266-2278)では TaskDialog の直後・外側 `</div>` の内側が正解だが、その情報がこの時点にない。

**反証側が示した、成立しない根拠**

【引用の実在確認】day15_タスク編集・削除.md L786-787 に「続いて、JSXの閉じタグ付近に / `DeleteConfirmDialog` を配置します。」が実在。直後 L789-802 のコードブロックは `// filepath: src/app/task/page.tsx` / `// 確認ダイアログの配置` のみで、貼り先を要素名で指していないのも事実（L790-791 逐語）。ここまでは指摘の前提どおり。

【しかし埋まっている箇所1: 同じファイル内（判定基準3）】同 day15 の完成版 L2263-2282 に、貼り先を含む閉じタグごとの逐語がある:
L2264「// filepath: src/app/task/page.tsx（同じファイルの続き）」
L2266「        <DeleteConfirmDialog」〜 L2277「        />」
L2278「      </div>」 L2279「    </AppLayout>」 L2280「  );」 L2281「}」
すなわち「外側 `</div>` の内側・`</AppLayout>` より内」が同一ファイル内に完全な形で示されている。指摘は「完成版(L2266-2278)では…その情報がこの時点にない」と自ら完成版の存在を認めており、不足しているのは「同ファイル内に無い」ことではなく「順序が後」に過ぎない。読者が構文エラーで画面が出なければ、同じ Day の完成版コードを見に行けば貼り先は確定する。

【埋まっている箇所2: 前日（判定基準2）】
day13_タスク一覧画面.md L1081「JSX のグリッド `</div>` の直下に詳細ダイアログを追加します。」→ L1086-1090 で `<TaskDetailDialog ... />` を配置。さらに L1093 逐語「ダイアログをグリッドの外へ置くのは、カードの並びに影響されず画面の最前面へ重ねるためです。」— ダイアログ類は「グリッドの外・ページJSXの内側」に置くという位置規範が明示済み。
day14_タスク新規作成.md L1420「// return の中、ページ見出し <h1> の直後に追加」→ L1426-1432 で `<TaskDialog ... />` を配置。「return の中」と明記されている。
よって day15 の時点で読者の page.tsx には、return 内に兄弟として並ぶダイアログが2つ既に存在し、3つ目を `</AppLayout>` の外へ出す動機が本文上どこにも無い。指摘が想定する破綻経路（`</AppLayout>` の後ろへ貼る）は、前日までに与えられた「return の中／グリッドの外」の規範に反する読み方を読者が能動的に選んだ場合にのみ起きる。

【残る差分】「閉じタグ付近」が day13「グリッドの直下」・day14「`<h1>` の直後」に比べて曖昧なのは事実で、表現の改善余地はある。ただし判定基準2（前日で規範が埋まっている）と基準3（同ファイル L2263-2282 に貼り先が逐語で存在）の両方で埋まっているため、指摘は成立しない。

### 消えた件 4. 行914 Step 10 のコードは Day 14 の Step 8 で貼った `<TaskDialog ... />` と完全に…

**逐語引用**

```text
// ダイアログにeditingTaskを渡す
<TaskDialog
  open={dialogOpen}
  onClose={() => setDialogOpen(false)}
  onSubmit={handleSubmit}
```

**初心者役が挙げた詰まり**

Step 10 のコードは Day 14 の Step 8 で貼った `<TaskDialog ... />` と完全に同じ。追加なのか確認なのかが書かれていないため、素直に追加すると TaskDialog が2つ並ぶ。

**初心者役が挙げた不足**

Step 2・7・8 では「置き換えます」と明記しているのに、Step 9(TaskCard) と Step 10(TaskDialog) は「接続する」「渡す」とだけ書かれ、既存の記述をそのまま残すのか差し替えるのかの指示がない。両ブロックとも中身は前日と一字一句同じ。

**反証側が示した、成立しない根拠**

【現物確認】material/30days-curriculum/day15_タスク編集・削除.md

引用の存在: L910-918 に確かにある。
L904「### Step 10: TaskDialogにeditingTaskを渡す（3分）」
L913「// ダイアログにeditingTaskを渡す」
L914「<TaskDialog」/ L915-918「open={dialogOpen} / onClose={() => setDialogOpen(false)} / onSubmit={handleSubmit} / initialData={editingTask} / projects={projects ?? []}」

「Day14と一字一句同じ」の部分は事実: day14_タスク新規作成.md L1426-1432 が同じ5props（initialData={editingTask} 含む）、L3217-3223 の完成版も同一。

しかし「追加なのか確認なのか書かれていない」は成立しない。

(1) Step 10 のゴール L906-907「**ゴール**: ダイアログに `editingTask` を渡して / 編集モードを有効にします。」— 新規に置くのではなく「（既にある）ダイアログに渡す」と書いてある。コメント L913 も同じく prop を渡す指示。

(2) 直前の Step 9 ゴール L857-858「**ゴール**: Day 13 で配置した TaskCard に / ハンドラーを接続します。」— 「Day 13 で配置した」と既存要素を明示しており、Step 9/10 が既存JSXへの手入れであることは読者に提示済み。

(3) 同ファイル L1176（「## 完成コード全体」直下）「途中でどこへ貼ったか分からなくなった場合は、以下のコードを上から順に貼り付けて、各ファイルを置き換えてください。」+ L1181 表「`src/app/task/page.tsx` | 一覧ページへの編集・削除の組み込み | Step 2 から Step 10」。その完成版 L2242-2256「// 完成版: 3つのダイアログ」には TaskDialog が**1個だけ**（grep 結果: day15内の `<TaskDialog` は L914 と L2250 の2箇所のみ）。仮に二重に貼っても、同一ファイル内の完成コード全体で解消される。

以上より、読者がそこで止まる経路は塞がれている。
