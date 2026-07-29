# Gate3 初心者シミュレーション — Day 24 (2026-07-28)

- 対象: material/30days-curriculum/day24_ユーザー一覧（管理者用）.md
- やり方: 教材の本文だけを読む初心者役が通し、詰まりを行番号つきで挙げた。
  挙がった各件を、別の判定者が「成立しない」を既定の立場として現物の行で反証した。
- 挙がった件数: 2 件 / 反証を生き延びた件数: 1 件

## 生き延びた詰まり

### 1. 行670 画面を開けない地点で、画面の確認を求めている

**逐語引用**

```text
アバターとバッジの表示を確認してください。

![アバターとロールのバッジが並んだ一覧。右端のアクション列は次の Step で追加する](./screenshots/user-list.png)
```

**何ができないか**

ここで画面を見て確認しようとしても、Step 7 の時点では `<TableBody>`、`<TableRow>`、`<Table>`、`<Card>`、
`<div>`、`<AppLayout>` と `return (` がどれも閉じられていないため、保存した時点で構文エラーになり
`/user` が開けない。何を直せばよいのか分からず止まる。

**教材のどこが足りないか**

Step 7 は開始タグだけを書き足す途中の段階なのに、そこで画面確認を求めている。Day 23 の Step 6（行990）では
「途中で保存するとエラー表示が出ますが、続きを書けば消えるので手を止めないでください」と断っているが、
Day 24 の Step 7 には同じ断りが無い。

**反証側が確かめた根拠**

- 行668と行670を現物で確認した。
- 行609から始まる Step 7 のコードが開始タグから書き始めることと、対応する閉じタグが行795から800、
  `</AppLayout>` が行875にあることを確認した。行670の時点では未クローズで描画されない。
- 同種の断りは Day 05 の行453、Day 18 の行645、Day 23 の行990、Day 29 の行856と行1586に存在する。
  ただしいずれも「その場で画面を見て確認せよ」とは言っていない。Day 24 の行668は逆に、
  描画できない地点で画面確認を明示的に指示している。
- Day 24 内で構文エラーに触れるのは行494と行805だけで、行668より前に該当する記述は無い。
- 読者が段階的に書き足す構成のため、配布物では未クローズ状態が解消されない。

## 反証で消えた件

1 件。挙がった内容と、反証側が示した根拠を全件残す。

### 消えた件 1. 行132 `src/server/api/routers/user.ts` を新規作成してこの import を写経したところで、…

**逐語引用**

```text
import { adminProcedure, createTRPCRouter } from '../trpc';
import { USER_DETAIL_SELECT } from './_helpers/select';
```

**初心者役が挙げた詰まり**

`src/server/api/routers/user.ts` を新規作成してこの import を写経したところで、`adminProcedure` と `USER_DETAIL_SELECT` が見つからないというエラーが出た場合、どこで作ったものなのか教材から辿れず、自分で作るのか既にあるのかも判断できない。

**初心者役が挙げた不足**

Day 23 までの本文にこの2つを作る手順は出てこない。119行目は「`USER_DETAIL_SELECT` を再利用しつつ」と既存前提で書いているが、どのファイルの何日目で用意したものかを示していない。「始める前の前提」（28〜33行目）にも、この2つが既にある前提だとは書かれていない。

**反証側が示した、成立しない根拠**

引用は現物どおり存在する（day24 131-132行: `import { adminProcedure, createTRPCRouter } from '../trpc';` / `import { USER_DETAIL_SELECT } from './_helpers/select';`）。ただし2つとも Day 07 で読者自身が作っている。

(1) `adminProcedure`: day07_ログイン体験を改善しよう.md 570-577行に `// filepath: src/server/api/trpc.ts（続き）` 付きコードブロックがあり、575-576行が逐語で `export const adminProcedure =` / `  t.procedure.use(isAuthenticated).use(isAdmin);`。直後586行の表に「| `adminProcedure` | 管理者のみ | 管理機能 | ユーザー管理 |」、592行に確認チェック「- [ ] `publicProcedure` / `protectedProcedure` / `adminProcedure` の 3 つが export されている」。さらに1851行（当日の完成コード再掲）にも同じ定義。

(2) `USER_DETAIL_SELECT`: day07 608行「`src/server/api/routers/_helpers/select.ts` を開き、教材のコードと見比べます。」に続く612行の filepath コメント `src/server/api/routers/_helpers/select.ts` 付きブロックの623-630行に逐語で `export const USER_DETAIL_SELECT = {` … `role: true,` `isActive: true,` `} as const;`。1074行に確認チェック「- [ ] `src/server/api/routers/_helpers/select.ts` を教材のコードと照合した」、1501行の当日成果物一覧にも同ファイルが載る。day07 662行では `import { USER_DETAIL_SELECT } from './_helpers/select';` と、day24 132行と同一の相対パス import を既に一度写経している。

よって「Day 23 までの本文にこの2つを作る手順は出てこない」は事実に反する。import 元パス（`../trpc` / `./_helpers/select`）も Day 07 の filepath と一致しており、読者は自分が作ったファイルを辿れる。エラーが出るとすれば Day 07 の写経漏れであって、教材の欠落ではない。
