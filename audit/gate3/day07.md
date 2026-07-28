# Gate3 初心者シミュレーション — Day 07 (2026-07-28)

- 対象: material/30days-curriculum/day07_ログイン体験を改善しよう.md
- やり方: 教材の本文だけを読む初心者役が通し、詰まりを行番号つきで挙げた。
  挙がった各件を、別の判定者が「成立しない」を既定の立場として現物の行で反証した。
- 挙がった件数: 4 件 / 反証を生き延びた件数: 2 件

## 生き延びた詰まり

### 1. 行883 存在しない `});` を貼り付けの目印にしている

**逐語引用**

```
ここから先の「（続き）」のブロックは、`auth.ts` の**末尾にある `});` の1行上**へ貼ります。ファイルの一番下に足すとルーターの外に出てしまい、英語のエラーで止まります。
```

**何ができないか**

Step 3-3 の register 以降のコードを貼ろうとして、指示された「末尾の `});`」を自分のファイルから
探すが見つからず、貼る場所を決められない。

**教材のどこが足りないか**

Step 3-2 までに写経した `auth.ts` の末尾は login の `  }),` で終わっており、`createTRPCRouter({` は
まだ閉じていない。ファイル末尾に `});` は存在しない。正しい指示は「ファイルの末尾に続けて足す」。

**反証側が確かめた根拠**

- 行644で `auth.ts` の中身をすべて削除して作り直させているので、読者のファイルは行648以降の写経内容だけ。
- 行733で `createTRPCRouter({` を開き、Step 3-2 最後の写経ブロックの末尾は行849の `  }),`。
- その時点でファイル内にある `});` は行679、行703、行718の3つで、いずれもスキーマや
  `handleUnexpectedError` の内部。指示に従うと行717へ貼ることになり、関数の内側が壊れる。
- ルーター全体を閉じる `});` は行1060で初めて写経される。
- 「最後の `});` がルーター全体の閉じ括弧です」と説明する行2215は、本編後の全文リファレンス節
  （行1890以降）にあり、Step 3-3 に到達した読者は未読。

### 2. 行1350 開いた直後の説明に、エラー発生後の画像が貼られている

**逐語引用**

```
ブラウザで `http://localhost:3000/login` を開きます。

![ログイン失敗時の表示](./screenshots/login-error.png)
```

**何ができないか**

ログイン画面を開いた直後の見本としてエラー表示の画像が出るので、自分の画面にエラーが出ていないと
「まだ何か足りないのでは」と手が止まる。

**教材のどこが足りないか**

本文はまだ何も入力していない状態を説明しているのに、画像は入力済みでエラーが出た状態。
本文の成功手順（行1364から1366）は画像より後ろにあり、画像と本文の状態が一致していない。
なぜこの画像なのかを説明する文が周辺に無い。

**反証側が確かめた根拠**

- 行1348、行1350、行1364から1368を現物で確認した。
- 画像 `screenshots/login-error.png` を実際に開き、メール欄に `invalid-email` が入った状態で
  ブラウザ標準の吹き出しが出ているスクリーンショットだと確認した。alt 文言だけの問題ではない。
- Day 07 の画像参照は3件（行3、行1350、行1368）で、行1348から1368の間に理由の説明は無い。
- 同じ画像は Day 05 の行335でも使われており、そちらは「エラーを出して確認する」文脈なので整合している。
  むしろ Day 05 で見本として見た読者ほど、Day 07 で誤読しやすい。
- 配布済みの足場で補える種類の不足ではない。

## 反証で消えた件

2 件。挙がった内容と、反証側が示した根拠を全件残す。

### 消えた件 1. 行659 auth.ts の中身を全部消してから import を写経した直後、`Cannot find module '@/li

**逐語引用**

```
import {
  checkLoginRateLimit,
  extractClientIp,
  rateLimitToTRPCError,
  recordLoginSuccess,
} from '@/lib/rate-limit';
```

**初心者役が挙げた詰まり**

auth.ts の中身を全部消してから import を写経した直後、`Cannot find module '@/lib/rate-limit'` で止まり、このファイルを自分で作るのか既にあるのか判断できない。

**初心者役が挙げた不足**

`src/lib/rate-limit.ts` は30日教材のどの日にも作る手順が無く、「scaffold に配布済み」という注記も無い。同じ日でも `_helpers/select.ts` は本文にコードが載り、`@/lib/redirect` は「Day 05 で作った」と明示されているのに、rate-limit だけ出どころの説明が無い。今日のゴールのファイル一覧にも入っていない。

**反証側が示した、成立しない根拠**

【引用の実在確認】day07 の 655-659 行に指摘の import は実在する。逐語:
655: `  checkLoginRateLimit,`
656: `  extractClientIp,`
657: `  rateLimitToTRPCError,`
658: `  recordLoginSuccess,`
659: `} from '@/lib/rate-limit';`

【しかし「Cannot find module で止まる」は起きない】
1) 足場が実際に配布している。`scripts/scaffold-from-scratch.sh:448-450` に
   `if [ -d "${script_dir}/_lib-base" ]; then` … `cp "${script_dir}/_lib-base"/*.ts src/lib/`
   があり、`scripts/_lib-base/rate-limit.ts`（実在をfindで確認）が `src/lib/rate-limit.ts` として学習者の手元へコピーされる。現物 `src/lib/rate-limit.ts`（5.2K）も存在する。

2) その足場が読者へ渡ることは教材本文に書かれている。day01 の
   23行: 「- [ ] `scripts/scaffold-from-scratch.sh` を実行して、土台を一発で作る」
   267-268行: 「chmod +x scripts/scaffold-from-scratch.sh」「bash scripts/scaffold-from-scratch.sh」
   244行: 「必要な設定をまとめて実行してくれる `scripts/scaffold-from-scratch.sh` …これを実行するだけで、土台が一気にできあがります。」
   読者は day01 でこれを実行済みなので、day07 到達時点で `src/lib/rate-limit.ts` は手元にある。

3) day07 で消すファイルに rate-limit.ts は含まれない。Step 0（「書き直す前に控えを取る」）の bash ブロックは
   `cp src/lib/session.ts src/server/api/trpc.ts \` / `   src/server/api/routers/auth.ts src/server/api/root.ts \`
   の4ファイルのみを対象にしており、647行「`src/server/api/routers/auth.ts` を開き、中身をすべて削除してから作り直します。」も auth.ts 限定。rate-limit.ts は一切触らないので、import 解決は壊れない。

4) 「配布済み」の注記も本文にある。day07:8「画面の動作確認に使える認証バックエンドは、配布スターターに入っています。」、day07:602「配布スターターには、Day 05 と Day 06 の画面を先に動かすため、完成済みの認証 API が入っています。ここでは動いているコードを答えとして眺めるだけにせず、`auth.ts` の中身を削除し、手順どおりに自分で作り直します。」— 消すのは auth.ts だけで、それ以外は配布物のまま残ると読める。

5) 役割の説明も直後にある。day07:667「`@/lib/rate-limit` から取り込んだ 4 つは、ログイン失敗の回数を数えて、当てずっぽうの試行を止めるための道具です。」

以上より、読者がその行でコンパイルエラーに遭遇して止まる、という詰まりは発生しない。「出どころの一文がもう少し明示的だと親切」という程度の話であり、指摘が主張する詰まりは成立しない。

### 消えた件 2. 行112 Step 3-0 の `_helpers/select.ts` や Step 4-2 の `route.ts` を貼り間

**逐語引用**

```
cp src/lib/session.ts src/server/api/trpc.ts \
   src/server/api/routers/auth.ts src/server/api/root.ts \
   ~/day07-backup/
```

**初心者役が挙げた詰まり**

Step 3-0 の `_helpers/select.ts` や Step 4-2 の `route.ts` を貼り間違えたとき、控えが無いので元の状態に戻せない。

**初心者役が挙げた不足**

Step 0 は「今日は動いている4つのファイルを、いったん空にしてから書き直します」と言うが、実際に上書きするのは Step 3-0 の `select.ts` と Step 4-2 の `route.ts` を含めて6ファイル。控えの対象が2つ足りず、「戻せるように」という前提が成立しない。

**反証側が示した、成立しない根拠**

現物確認（material/30days-curriculum/day07_ログイン体験を改善しよう.md）:

1) 引用は実在。111-115行:
```
mkdir -p ~/day07-backup
cp src/lib/session.ts src/server/api/trpc.ts \
   src/server/api/routers/auth.ts src/server/api/root.ts \
   ~/day07-backup/
ls ~/day07-backup
```
118-119行「`ls` で4つのファイル名が出れば控えが取れています。書き直しに失敗したときは、たとえば `cp ~/day07-backup/session.ts src/lib/` のように書き戻せば元の状態に戻ります。」
122行「- `ls ~/day07-backup` に `session.ts` `trpc.ts` `auth.ts` `root.ts` の4つが出る」

2) 指摘のとおり、控えに入らない既存ファイルの上書きは確かに2つある。
608-609行「`src/server/api/routers/_helpers/select.ts` を開き、教材のコードと見比べます。／内容が異なる場合は、中身を教材のコードへ置き換えてください。」
1110行「`src/app/api/trpc/[trpc]/route.ts` を開き、中身を教材のコードへ置き換えます。」
つまり「4ファイル」という記述と実際の上書き対象6ファイルはズレている（記述の不整合としては成立）。

3) ただし「控えが無いので元の状態に戻せない」＝読者が止まる、は成立しない。同じファイルの巻末付録に両ファイルの完成版全文が載っている。
1858行「### `src/server/api/routers/_helpers/select.ts`」／1860行「**ファイル全体**:」／1863-1864行「// filepath: src/server/api/routers/_helpers/select.ts」「// 完成版: ファイル全体」
2238行「### `src/app/api/trpc/[trpc]/route.ts`」／2240行「**ファイル全体**:」／2243-2244行「// filepath: src/app/api/trpc/[trpc]/route.ts」「// 完成版: ファイル全体」（以降 `export { handler as GET, handler as POST };` まで全文掲載）

貼り間違えた場合、読者は付録の「完成版: ファイル全体」を貼り直せば正しい状態に到達できる。そもそもこの2ファイルの上書き先は「教材のコードそのもの」であり、控えの旧内容ではなく教材のコードが正解なので、バックアップが無くても復旧経路は本文内に閉じている。

4) 前日までのgitによる退避も一応調べたが、day01-07で教えているのは `git commit` のみ（day03の561/590/607行）で `git restore`/`git checkout`/`git stash` は不在。ただしこれは判定に影響しない（上の3で復旧できるため）。

結論: 「控え対象が2つ足りない」という記述の不整合は事実だが、読者はそこで止まらない。よって survives: false。
