# Gate3 初心者シミュレーション — Day 13 (2026-07-28)

- 対象: material/30days-curriculum/day13_タスク一覧画面.md
- やり方: 教材の本文だけを読む初心者役が通し、詰まりを行番号つきで挙げた。
  挙がった各件を、別の判定者が「成立しない」を既定の立場として現物の行で反証した。
- 挙がった件数: 4 件 / 反証を生き延びた件数: 1 件

## 生き延びた詰まり

### 1. 行742 Step 4 の確認用に、完成画面の画像を再掲している

**逐語引用**

```
![フィルターUIが2つ並んで表示されている画面](./screenshots/task-list.png)
```

**何ができないか**

Step 4 を終えた時点で自分の画面と見比べる。画像にはタスクカードのグリッドが写っているが、
カードを出すのは Step 6 なので、手元の画面は見出しとドロップダウンだけ。
「自分の実装が足りていない」と思って手戻りする。

**教材のどこが足りないか**

行15の「今日のゴール」に貼った完成画面と同じ `task-list.png` を、Step 4 の確認用としてキャプションだけ
変えて再掲している。本文の確認ポイントは「2つのドロップダウンが並んで表示される」だけなのに、
画像はそれ以上を写している。途中の画像が完成形であるという断りも無い。

**反証側が確かめた根拠**

- 行739から742と行15を現物で確認し、画像パスが完全に一致することを確認した。
- 画像 `screenshots/task-list.png` を実際に開き、カードが4列グリッドで8枚以上並んでいることを確認した。
- 行783から795で、カードの描画は Step 6 で初めて追加されることを確認した。
- Day 13 内を「画像」「完成形」「この時点」「まだ表示されません」で検索したが、断り書きは存在しない。
- Day 09 は途中段階に専用画像を用意している（行350、行589、行900）。読者は「貼られた画像は
  その時点の自分の画面」と学習済みで、Day 13 の再掲は誤解を生む。
- 配布済みの足場は画面の見え方を前倒ししないため、足場でも埋まらない。

## 反証で消えた件

3 件。挙がった内容と、反証側が示した根拠を全件残す。

### 消えた件 1. 行156 Step 0-1 で task.ts の import をこのとおり写す。だが `@/lib/constant/quer

**逐語引用**

```
import { taskPrioritySchema, taskStatusSchema } from '@/lib/constant/query';
```

**初心者役が挙げた詰まり**

Step 0-1 で task.ts の import をこのとおり写す。だが `@/lib/constant/query` というファイルがどこから来たのか本文に一切の言及がなく、手元に無ければ「Module not found」で dev サーバーが起動せず、Step 1 以降へ進めない。

**初心者役が挙げた不足**

「今日の作業ファイル」(L84-95) に挙がっているのは `lib/constant/status.ts` だけで、`query.ts` は出てこない。他の import は `getUserProjectIds` `USER_SELECT` まで1つずつ役割を説明しているのに、`taskStatusSchema` については「この画面でも使うステータス・優先度の検証ルールです」とだけ書き、どの日に作ったファイルかを示していない。

**反証側が示した、成立しない根拠**

【引用の現物確認】day13_タスク一覧画面.md L156 に指摘どおりの行が実在する。逐語: `import { taskPrioritySchema, taskStatusSchema } from '@/lib/constant/query';`。L166 の解説も逐語で「`taskStatusSchema` と `taskPrioritySchema` は、この画面でも使うステータス・優先度の検証ルールです。」であり、どの日に作ったかは書かれていない。L93-94 の「今日の作業ファイル」に挙がる lib/constant は逐語「lib/constant/」「status.ts             ... ステータス定義・型ガード（既存）」だけで、query.ts は無い。ここまでは指摘の記述どおり。

【しかし「Module not found で止まる」は成立しない】
1. day01_開発環境を整えて、初めてのアプリを動かそう.md L23 逐語「- [ ] `scripts/scaffold-from-scratch.sh` を実行して、土台を一発で作る」、L267-268 逐語「chmod +x scripts/scaffold-from-scratch.sh」「bash scripts/scaffold-from-scratch.sh」、L273 逐語「この2行を実行すると、いまいるフォルダの中に `package.json` や `src` などが一気に作られ、データベース用のコンテナも起動します。」— 足場スクリプトの実行は Day 01 の本文に明記されており、読者に渡ることが教材本文に書かれている。
2. そのスクリプト scripts/scaffold-from-scratch.sh L454-458 逐語:
   `  # constants: roles, status, priority 等`
   `  if [ -d "${script_dir}/_constants" ]; then`
   `    mkdir -p src/lib/constant`
   `    cp "${script_dir}/_constants"/*.ts src/lib/constant/`
   `    echo "定数ファイルを src/lib/constant/ に配置しました。"`
   ワイルドカード `*.ts` のコピーである。
3. `ls scripts/_constants/` の実出力: `index.ts priority.ts project.ts query.ts roles.ts status.ts` — query.ts (259B) が含まれる。中身 head 出力の逐語も `export const taskStatusSchema = z.nativeEnum(TASK_STATUS);` / `export const taskPrioritySchema = z.nativeEnum(TASK_PRIORITY);` で、L156 の import 先と一致する。
4. 実リポジトリにも `./src/lib/constant/query.ts` が存在する（find の出力）。

したがって Day 01 の時点で `src/lib/constant/query.ts` は読者の手元に配置済みであり、L156 を写しても Module not found にはならず、dev サーバーは起動する。指摘の「詰まる」核心（進行不能）は成立しない。残るのは「どの日に作ったファイルか本文が示していない」という説明の薄さのみで、これは読者が止まる事象ではない。

### 消えた件 2. 行692 直前に貼ったブロック(L646-658)には `</div>` が2つある。内側（`w-[200px]` の枠）の直後か

**逐語引用**

```
続いてステータス選択です。プロジェクト選択の `</div>` の直後に2つ目の `<div>` を追加します。`isTaskStatus` 型ガードを使って安全に値を設定します。
```

**初心者役が挙げた詰まり**

直前に貼ったブロック(L646-658)には `</div>` が2つある。内側（`w-[200px]` の枠）の直後か、外側（`flex gap-2` の枠）の直後かが決められず、手が止まる。外側の後ろに置くと2つの絞り込みが横に並ばない。

**初心者役が挙げた不足**

「プロジェクト選択の `</div>`」という指し方が、本文中に2つある閉じタグのどちらかを特定していない。この時点では完成コード全体（L1643-1688）を読んでいないので、正解を照合する手段がない。

**反証側が示した、成立しない根拠**

現物確認（/Users/kouiso/ghq/kouiso/task-app-worktrees/gate3/material/30days-curriculum/day13_タスク一覧画面.md）。

1) 引用は実在する。L692 逐語:
「続いてステータス選択です。プロジェクト選択の `</div>` の直後に2つ目の `<div>` を追加します。`isTaskStatus` 型ガードを使って安全に値を設定します。」

2) 直前ブロックは L643-659。逐語（インデント付き）:
```
645|// h1タグの直下に追加: フィルター外枠
646|<div className="flex gap-2 w-full
647|  sm:w-auto ml-auto">
648|  <div className="w-[200px]">
...
657|  </div>
658|</div>
```
2つある `</div>` のうち、外側（L658）はコード内コメント L645 で「フィルター外枠」と明示的に名付けられている。つまり本文が言う「プロジェクト選択の `</div>`」に該当し得るのは、外枠でない方＝内側の L657 だけ。ラベルが同一ファイル内の直前2行に置かれているので、読者は完成コード（L1201「## 完成コード全体」）を見に行かなくても区別できる。

3) 外枠と中の役割は L663 で逐語説明済み:
「`ml-auto` は、この操作欄を見出しの反対側へ寄せる指定です。`w-full` は外枠を横いっぱいに広げる指定です。`sm:w-auto` は、画面が広いときだけ外枠を中身の幅に戻します。中の `Select` は `w-[200px]` で固定してあるので、画面幅が変わっても操作欄そのものの大きさは変わりません。」
「外枠」＝L646 の div、「中」＝`w-[200px]` の枠、という対応が本文で先に与えられている。

4) L692 の「2つ目の `<div>`」という言い方自体が、1つ目（L648 の `w-[200px]`）と並ぶ兄弟であることを指している。追加ブロック L697 も `<div className="w-[200px]">` で 1つ目と同形。外枠 L646 は `flex gap-2`（子を横並びにする指定）で、子を2つ持つ前提の記述になっている。

5) さらに Step 4 末尾 L740 に確認ポイントが逐語で置かれている:
「- プロジェクトとステータスの2つのドロップダウンが並んで表示される」
外枠の外側に置いた場合ここで不合格になるため、正解を照合する手段は完成コードを読まなくてもその場にある。

以上より「本文中の2つの `</div>` のどちらか特定できない」という前提が成り立たない。

### 消えた件 3. 行1776 Step 7 で詳細ダイアログが空のまま出たとき、つまずきポイント表の指示に従って `enabled` と `!!sel

**逐語引用**

```
| 詳細が取得できない | `enabled` 条件が間違っている | `!!selectedTask` を確認 |
```

**初心者役が挙げた詰まり**

Step 7 で詳細ダイアログが空のまま出たとき、つまずきポイント表の指示に従って `enabled` と `!!selectedTask` を探す。しかし Day 13 本文にはどちらの文字列も一度も出てこないので、何を確認すればよいか分からない。

**初心者役が挙げた不足**

Step 7 で書くのは `<TaskDetailDialog open taskId onClose />` の3つの prop だけで、`enabled` オプションはこの日に一度も書かせていない。表だけが、書いていないコードの修正を指している。

**反証側が示した、成立しない根拠**

【引用の実在確認】day13_タスク一覧画面.md:1776 = 「| 詳細が取得できない | `enabled` 条件が間違っている | `!!selectedTask` を確認 |」。引用は実在する。

【指摘の前提が事実に反する①：`selectedTask` は Day 13 本文に10回出る】
grep -n "selectedTask" day13 の結果は 1024 / 1035 / 1038 / 1075 / 1078 / 1088 / 1521 / 1535 / 1734 / 1776 の10件。読者自身が書く行として、
- 1024行: 「const [selectedTask, setSelectedTask] =」（Step 7 で読者が書く state 宣言）
- 1088行: 「  taskId={selectedTask}」（TaskDetailDialog へ渡す prop）
- 1521行: 「const [selectedTask, setSelectedTask] = useState<string | null>(null);」（完成版）
- 1734行: 「        <TaskDetailDialog open={detailOpen} taskId={selectedTask} onClose={handleDetailClose} />」
がある。「本文に一度も出てこない」は `selectedTask` については誤り。

【指摘の前提が事実に反する②：`enabled` は前日 Day 12 で同型のコードを読者が書いている】
day12_メンバー追加.md:664 「    { enabled: !!selectedProject },」（読者が書くコード）
day12_メンバー追加.md:669 「- `useQuery` に `enabled` オプションを設定した」（確認ポイント）
day12_メンバー追加.md:673 「> `enabled: !!selectedProject` は「`selectedProject` がある場合だけAPIを呼ぶ」という設定です。未選択時に不要なリクエストを防ぎます。」
さらに day12:876 / 2326 / 2330 でも同じ `{ enabled: !!selectedProject },` を反復。`!!<状態変数>` という書き方そのものが前日に説明付きで定着している。読者は day01 から順に読んでいるので、`enabled` が何で `!!X` が何を意味するかは頭に入っている。

【現物の所在も本文に明示されている】
day13:89 「    task-detail-dialog.tsx ... タスク詳細ダイアログ（既存）」として「今日の作業ファイル」ツリーに列挙。
day13:1093 「`TaskDetailDialog` は `taskId` を受け取り、その1件を `api.task.getById` で取りに行きます。」と、詳細取得がこの部品の中で起きることを明記。
実ファイル src/component/task/task-detail-dialog.tsx:64-66
  「  const { data: taskDetail } = api.task.getById.useQuery(」
  「    { id: taskId ?? '' },」
  「    { enabled: !!taskId },」
表が指す `enabled` 条件は、本文がファイル名を挙げている既存部品の中に実在する。

【残る差は文言の粗さのみ】
表は `!!selectedTask` と書くが、実コードはダイアログ内の `!!taskId`（親の `selectedTask` が prop `taskId` として渡る。day13:1088「taskId={selectedTask}」でその対応関係も本文にある）。呼び名のズレはあるが、Day 12 の概念＋Day 13 の prop 受け渡し行＋本文が名指しする既存ファイル、の3点で読者は追える。ここで手が止まるとは言えない。

よって survives: false。
