# Gate3 初心者シミュレーション — Day 29 (2026-07-28)

- 対象: material/30days-curriculum/day29_ユーザー詳細・編集ページを作ろう.md
- やり方: 教材の本文だけを読む初心者役が通し、詰まりを行番号つきで挙げた。
  挙がった各件を、別の判定者が「成立しない」を既定の立場として現物の行で反証した。
- 挙がった件数: 4 件 / 反証を生き延びた件数: 0 件

## 生き延びた詰まり

なし

## 反証で消えた件

4 件。挙がった内容と、反証側が示した根拠を全件残す。

### 消えた件 1. 行1543 Step 10 まで書き進めた順どおりにこのブロックを最後尾へ足すと、`updateUser` は3つの早期リターン（`…

**逐語引用**

```text
const updateUser =
    api.user.update.useMutation({
      onSuccess: async () => {
        await Promise.allSettled([
          utils.user.getById.invalidate(
            { id: userId }),
```

**初心者役が挙げた詰まり**

Step 10 まで書き進めた順どおりにこのブロックを最後尾へ足すと、`updateUser` は3つの早期リターン（`if (isCurrentUserLoading …)` 以降）より後ろに来る。すると Step 7 の return 文より下になり、`updateUser is not defined` と Hooks 呼び出し順のエラーで編集ページが表示されない。

**初心者役が挙げた不足**

このコードブロックに貼り付け位置の指示が一切ない。完成版（2687行）では早期リターンより前に置かれているが、Step 10 の本文はその位置を書いていない。Step 8 の JSX（1339行の `disabled={updateUser.isPending}`）が先にこの変数を参照している点も、順序の逆転を読者が自力で直す前提になっている。

**反証側が示した、成立しない根拠**

【引用の実在確認】material/30days-curriculum/day29_ユーザー詳細・編集ページを作ろう.md の 1541-1564 行に指摘の通りのブロックが実在する（1543-1544「  const updateUser =」「    api.user.update.useMutation({」、1545「      onSuccess: async () => {」、1546「        await Promise.allSettled([」、1547-1548「          utils.user.getById.invalidate(」「            { id: userId }),」）。直前の 1529-1535 行は import 追加ブロックで、この mutation ブロック自体には「早期リターンより前へ置く」という貼り付け位置の一文が確かに無い。ここまでは指摘の観察どおり。

【しかし、必要な知識は前の日で埋まっている】day17_自分のタスクページ.md 224-226 行に、写経するコード内のコメントとして「// tRPCキャッシュ操作用ユーティリティ」「// ⚠️ hooks はすべて early return より前に置く」「const utils = api.useUtils();」があり、直後の 228 行に引用ブロックで次の説明がある: 「> **Reactの hooks ルール**: `useQuery` や `useUtils` などの hooks はコンポーネントのトップレベルに配置し、`if` 文や `return` の後に置いてはいけません。hooks の呼び出し順序が変わるとエラーになるため、early return（`if (isLoading) return ...`）は必ず全 hooks 定義の後に書きます。」。さらに 230 行「ローディングの条件も更新します。Step 2 で追加した `if (isCurrentUserLoading)` を以下に**置き換えて**ください。」、234 行「// 全 hooks 定義後にローディング判定（hooks の後に early return）」と、hook と早期リターンの前後関係を実際に並べ替えさせる作業まで day17 でやらせている。`useMutation` も hook なので、この規則がそのまま当てはまる。day29 は day17 より後で、読者はこの規則を持って読んでいる。

【同じファイル内でも埋まっている】同ファイル 1829 行「## 完成コード全体」、1831 行に「今日は5つのファイルを触りました。断片を貼り重ねる作業が11個の Step にまたがったので、途中でどこへ貼ったか分からなくなった場合は、以下のコードと手元のファイルを見比べてください。」とあり、「どこへ貼ったか分からない」場合の参照先が明示されている。その完成版では 2685-2687 行「**保存する mutation**:」「// 完成版: 保存する mutation」「  const updateUser =」が、2756-2758 行「**現在ユーザーを待つ早期リターン**:」「// 完成版: 現在ユーザーを待つ早期リターン」「  if (isCurrentUserLoading || !currentUser) {」より前に置かれており、正しい位置が読者に提示されている（2657「権限フラグと編集対象の取得」→2686「保存する mutation」→2716「フォームへ値を流し込む useEffect」→2757「現在ユーザーを待つ早期リターン」の順）。

【Step 8 の JSX が先に updateUser を参照する点も本文で断ってある】1298-1300 行に「> `onSubmit` と `updateUser` は」「> Step 10 で定義します。ここではJSX構造を」「> 先に書き、Step 10 の完了後に動作確認します。」とあり、1586 行の確認ポイントでも「`onSubmit` と `updateUser` が定義できた。…これで Step 8 で書いた `<form onSubmit={form.handleSubmit(onSubmit)}>` が指している2つがそろいました。実際に動くかどうかは、`</form>` を書き終えた Step 10 の最後で確かめます。」と、Step 8 時点では未定義であること・動作確認は Step 10 末尾で行うことが明記されている。順序の逆転を読者が黙って直す前提にはなっていない。

【補足】同種の hook である Step 8 の `useEffect`（1267-1280 行）についても、1125 行に「中身は次に置く `useEffect` で本物のデータに差し替えるので」とあり、useForm 直後の hook 領域に置くことが本文で示されている。

以上より、day17 の明示ルール、day29 自身の完成コード全体（1831 行の照合指示 + 2686/2757 行の並び）で埋まっているため、指摘は成立しない。

### 消えた件 2. 行1270 Step 7 で早期リターンまで書き終えた状態から Step 8 に来るので、この useEffect を素直に続きへ書…

**逐語引用**

```text
// サーバーデータでフォームを初期化
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? '',
        avatar: user.avatar ?? '',
```

**初心者役が挙げた詰まり**

Step 7 で早期リターンまで書き終えた状態から Step 8 に来るので、この useEffect を素直に続きへ書くと `return` より後ろになる。書く場所を戻すべきなのか分からず止まる。

**初心者役が挙げた不足**

「`useEffect` + `form.reset` でサーバーデータが届いたらフォームに反映します」とあるだけで、3つの早期リターンより前に置くという指示が無い。完成版（2717行）では mutation の直後・早期リターンの前に置かれている。

**反証側が示した、成立しない根拠**

【現物確認】

- day29 L1265-1279 に指摘の引用は実在する。L1265「`useEffect` + `form.reset` でサーバーデータが届いたらフォームに反映します。」→ L1268-1279 のコードブロック（L1269「  // サーバーデータでフォームを初期化」、L1270「  useEffect(() => {」、L1271「    if (user) {」、L1272「      form.reset({」）。確かに「早期リターンより前に置く」という明示指示はこの箇所に無い。
- Step 7 の末尾（L1218-1242 のコードブロック）は `    </AppLayout>\n  );\n}` で関数を閉じており、素直に続きへ書けば `return` の後ろになる、という指摘の前提自体は正しい。

【前の日で埋まっている】

- day08_サイドバーを完成させよう.md L336 逐語:「状態と問い合わせを、関数の先頭でまとめて宣言しています。`useState` や `useQuery` のようなフックは、毎回同じ順番で呼ばれることを前提に作られています。`if` の中や `return` より後ろに置くと順番が変わり、React が値を取り違えてエラーになります。並べる場所には理由があります。」
- day17_自分のタスクページ.md L226 逐語:「// ⚠️ hooks はすべて early return より前に置く」
- 同 L936「// 編集ダイアログの状態管理（early return より前のhook定義ブロックに追加）」、L1002「// 削除ダイアログの状態管理（early return より前に追加）」
  → 「フックは早期リターンより前」というルールと、「後から足すフックは early return より前のブロックへ戻して書く」という具体的な手つきの両方を、day08 と day17 で既に読者は受け取っている。day29 の読者は day01 から順に読んでいる前提なので、`useEffect` を `return` の後ろに書けないことは既知。

【同ファイル内の補強】

- day29 L1125 逐語（Step 7 の `defaultValues` の解説）:「…中身は次に置く `useEffect` で本物のデータに差し替えるので、この初期値は最初の一瞬だけ使われます。」→ Step 7 の `useForm` 宣言（L1108-1117、早期リターンより前）のすぐ隣に `useEffect` が来ることを、Step 7 の時点で予告している。

以上より、置き場所の判断に必要な知識は day08 / day17 で供給済みであり、day29 L1125 でも位置が示唆されている。読者がそこで止まるとは言えない。

### 消えた件 3. 行964 Step 4 の最後（745〜748行）で左カラムは `</div></CardContent></Card></div…

**逐語引用**

```text
アイコンはすべて `lucide-react` から取り込むので、行を増やさず Step 4 で書いた行へ `Pencil` を足します。まとめて1行にしておくと、このファイルが使うアイコンを1か所で見渡せます。ボタンを置く場所は左カラムの下端です。
```

**初心者役が挙げた詰まり**

Step 4 の最後（745〜748行）で左カラムは `</div></CardContent></Card></div>` まで閉じ終えている。「左カラムの下端」がその閉じタグの前なのか後なのか特定できず、編集ボタンの貼り付け先が決まらない。

**初心者役が挙げた不足**

完成版（2355〜2370行）では `</CardContent>` の直前に入るが、Step 6 本文には「メールから最終更新日を囲む div を閉じた直後、`</CardContent>` の前」という位置指定が無い。コードブロックのインデントだけが手がかりになっている。

**反証側が示した、成立しない根拠**

【引用の実在確認】day29 の 964行に指摘どおりの逐語がある: 「アイコンはすべて `lucide-react` から取り込むので、行を増やさず Step 4 で書いた行へ `Pencil` を足します。まとめて1行にしておくと、このファイルが使うアイコンを1か所で見渡せます。ボタンを置く場所は左カラムの下端です。プロフィールを読んでから操作へ進む順番になります。」

【前提の確認】Step 4 の左カラム終端は 745〜748行: 745「                </div>」/746「              </CardContent>」/747「            </Card>」/748「          </div>」。Step 6 の貼り付けコードは 966〜981行で、先頭が 968「                {(isAdmin || isOwnProfile) && (」（先頭16スペース）。

【指摘が成立しない根拠1: 同一ファイル内の既出コードで位置が特定できる】Step 4 の 678行「                <Separator className="my-4" />」が同じ16スペースで、これは `<CardContent className="pt-6">`（649行）の直下の子要素として読者が自分で写経済み。Step 6 のブロックは中身に 970「                    <Separator className="my-4" />」を含みつつ外側が16スペースなので、678行と同じ階層＝CardContent の直下の子であることが、読者がすでに書いた行との比較で決まる。745行の「                </div>」は 679行「                <div className="space-y-4 text-sm">」の閉じであり、その後・746行 `</CardContent>` の前という位置が一意に定まる。

【根拠2: その日の冒頭に完成画面のスクリーンショットがある】15〜17行「スクリーンショット: ユーザー詳細ページの完成イメージの表示を確認してください。」「![...](./screenshots/user-detail-page.png)」。実画像 material/30days-curriculum/screenshots/user-detail-page.png を開いて確認したところ、左カラムの白いカードの内側・最終更新日の下に区切り線と紫の「編集」ボタンが描かれている。つまり「左カラムの下端」がカード（CardContent）の内側であって `</Card>` の外や右カラム側でないことは、Step 6 に入る前に読者が見る画像で確定している。

【根拠3: 同ファイル末尾の完成版でも同じ形が再掲される】2352〜2370行「// 完成版: 左カラムの編集ボタン」…2367「                )}」2368「              </CardContent>」2369「            </Card>」2370「          </div>」、および 2373行「ボタンを左カラムの下端へ置いたのは、プロフィールを読んでから操作へ進む順番にするためです。」

【残る弱さ（ただし停止には至らない）】同じ day29 の他ステップは 885行「`TableHeader` の直後に `TableBody` を追加します。」のように文章でアンカーを示しており、Step 6 だけ「`</CardContent>` の直前」という文言が無いのは事実。ただし上記の16スペース一致・完成スクリーンショット・完成版再掲で位置は判定でき、誤って `</CardContent>` の外に置いてもビルドは通り 992〜995行の確認ポイント（ボタンの表示可否）には到達できるため、読者がそこで手が止まるとは言えない。よって survives: false。

### 消えた件 4. 行1411 roles.ts に `isUserRole` が無い場合、import が解決せずロール選択の Select が書けな…

**逐語引用**

```text
import { isUserRole, USER_ROLE_LABELS }
  from '@/lib/constant/roles';
```

**初心者役が挙げた詰まり**

roles.ts に `isUserRole` が無い場合、import が解決せずロール選択の Select が書けない。作ってよいのかどうかの手がかりが無い。

**初心者役が挙げた不足**

`isUserRole` はこの日に初めて出てくる名前だが、既存として import させるだけで、定義がどこにあるか（何日目で作ったか）にも、無い場合の対処にも触れていない。Day 28 の `isTaskStatus` と違い、関数の中身も載っていない。

**反証側が示した、成立しない根拠**

【引用の実在確認】day29 L1411-1412 に確かに存在:

```text
import { isUserRole, USER_ROLE_LABELS }
  from '@/lib/constant/roles';
```

【指摘の前提「roles.ts に isUserRole が無い場合」は成立しない】

1. 実ファイル src/lib/constant/roles.ts L8-15 逐語:
   L8 `export const USER_ROLE_LABELS: Record<UserRole, string> = {`
   L9 `  USER: 'ユーザー',`
   L10 `  ADMIN: '管理者',`
   L13 `export function isUserRole(value: unknown): value is UserRole {`
   L14 `  return typeof value === 'string' && value in USER_ROLE;`
   両方とも実在する。同内容が配布元 scripts/_constants/roles.ts にも同じ行番号で存在（L8 / L13）。

2. その roles.ts が読者へ渡ることは本文に明記されている。
   day01 L23 逐語: `- [ ] \`scripts/scaffold-from-scratch.sh\` を実行して、土台を一発で作る`
   day01 L267-268 逐語: `chmod +x scripts/scaffold-from-scratch.sh` / `bash scripts/scaffold-from-scratch.sh`
   そのスクリプト L454-457 逐語:
   `if [ -d "${script_dir}/_constants" ]; then`
   `  mkdir -p src/lib/constant`
   `  cp "${script_dir}/_constants"/*.ts src/lib/constant/`
   つまり Day 01 の時点で src/lib/constant/roles.ts（isUserRole 入り）は読者の手元にある。

3. 「roles.ts は既存の配布物で、型ガードが入っている」ことは前の日の本文で明示済み。
   day12 L75 逐語: `│   └── roles.ts              ← ロール定義・権限・型ガード`
   day12 L80 逐語: `この4つのうち、今日ゼロから書き足すのは \`project.ts\` の手続きです。\`roles.ts\` にはロールの一覧と権限の対応表がすでに入っています。`
   day12 L84 逐語: `\`roles.ts\` にはロール定数・ラベル・権限・型ガードがまとまっています。`
   day12 L728 逐語: `\`isProjectMemberRole\` は文字列が正しいロールかを確かめる型ガードです。どちらもサーバーと同じ \`@/lib/constant/roles\` から取り込むので、フロントとサーバーで判定基準がずれません。`
   同型の型ガードを既に Day 12 / Day 20（L2517 逐語: `\`isTaskStatus\` と \`isTaskPriority\` は、文字列がステータスや優先度として正しい値かを判定する関数です。`）で取り込み済み。

4. Day 29 自身でも用途と理由を説明している。
   day29 L1475 逐語: `広いほうの型を狭いほうへそのまま入れることはできないので、\`isUserRole\` 型ガードで中身を確かめてから渡します（\`as UserRole\` は使いません）。`
   day29 L2606 逐語: `\`isUserRole\` は Step 9 の型ガード、\`USER_ROLE\` は初期値、\`USER_ROLE_LABELS\` は選択肢の文言に使います。`

【結論】import は解決する。読者は「作ってよいか」を判断する必要がなく、Day 12 で「roles.ts は配布済み・型ガード入り」と読んでいるため、そこで止まらない。指摘は不成立。
