# CodeRabbit の指摘の裏取り結果

## 件数の内訳（2026-08-31 時点の最終状態）

CodeRabbit が PR #388 に立てたレビュースレッドは **41本**。処理の結果は次のとおり。

| 区分 | 本数 |
|---|---:|
| この裏取りより前に対応済み（記録不整合5件・cbf82ca） | 5 |
| 本物と判定して直した | 22 |
| 成立せんと判定して根拠つきで返信した（markdownlint 系の見送り8本を含む） | 14 |
| **合計** | **41** |

## 下の一覧が持つ範囲

以下は並列の裏取りを journal から復元した分で、**37本ぶん**の判定（real 17 / false 20）しか入っていない。
41本との差の4本は、裏取りの並列が上限に当たって判定が残らんかったもの。その4本は最終的に
1本ずつ手で開いて処理し、上の表へ数え入れてある（下の一覧には出てこない）。

`real 17` のうち **5本は反証（adversarial pass）を通したあとも残った**もの。反証で落ちた分は
`false 20` の側へ入っている。つまり `5/17 refuted` ではなく、**17本はすべて反証後に生き残った本物**。

---

## [day02_ダッシュボードに自分だけのメッセージを追加しよう.md] material/30days-curriculum/day02_ダッシュボードに自分だけのメッセージを追加しよう.md:323  (quality)
- 指摘: :321-323 todayGoal の値と後続文がつながらない
- 根拠: 値は :323 「  todayGoal: 'トップページのラフを決める',」。これを差し込む Step 2 の文は :393-395 「                今日やるのは / <span className="font-semibold text-foreground"> {dashboardOwner.todayGoal}</span> / に取りかかります。」。描画結果は「今日やるのは トップページのラフを決める に取りかかります。」となり、「〜のは」に対する述語が無いまま「に取りかかります」が続く壊れた日本語になる。同じ値を使う Step 3 側 :673-675 は「今日は／{dashboardOwner.todayGoal}／まで進めます。」で成立しており、Step 2 だけ噛み合っていない。指摘の行番号 321-323 のうち実体は 323（321 は `role`）。
- 直し方: :393 の「今日やるのは」を「今日は」、:395 の「に取りかかります。」を「まで進めます。」へ変更し、Step 3（:673-675）と同じ言い回しにそろえる。

## [day02_ダッシュボードに自分だけのメッセージを追加しよう.md] material/30days-curriculum/day02_ダッシュボードに自分だけのメッセージを追加しよう.md:424  (quality)
- 指摘: :424 は todayGoal を表示しているのに説明は name と todayFocus を使うと書いてある
- 根拠: コード :421-427 は `Focus` ラベルの下に :424 「                  {dashboardOwner.todayGoal}」（`text-lg font-semibold` の主表示）、:427 「                  {dashboardOwner.todayFocus}」（`text-sm text-muted-foreground` の副表示）。直後の説明 :431 は「カードの下段を `sm:grid-cols-2` で2つに割り、`Owner` と `Focus` の小さな枠を並べます。中身は `{dashboardOwner.name}` と `{dashboardOwner.todayFocus}` で、どちらも見出しと同じ1つのまとまりから読んでいます。」 Owner 枠の主表示 :412 は `name` なので片方は合うが、Focus 枠の主表示は `todayGoal` であって `todayFocus` ではない。4つある値のうち主表示2つを挙げるつもりなら `todayGoal` が正しい。
- 直し方: :431 の「`{dashboardOwner.name}` と `{dashboardOwner.todayFocus}`」を「`{dashboardOwner.name}` と `{dashboardOwner.todayGoal}`」に直す（副表示 `role` / `todayFocus` にも触れるなら4つ列挙する）。

## [day02_ダッシュボードに自分だけのメッセージを追加しよう.md] material/30days-curriculum/day02_ダッシュボードに自分だけのメッセージを追加しよう.md:1293-1295  (quality)
- 指摘: まとめが Step 1 専用の ownerName/focusTheme/todayNote を指す。最終コードは dashboardOwner/buildMainMessage/focusCards
- 根拠: 同じ「今日手に入れたもの」節の :1283-1285 で「名前と集中テーマは `dashboardOwner` が、／あいさつ文は `buildMainMessage` が、／下段のカードは `focusCards` が持つようになりました。」と最終形を述べておきながら、:1293-1295 は「この3つが入っていれば、名前や集中テーマを変えたくなったときに／触るのはファイル先頭の1行だけで、／`{ownerName}`・`{focusTheme}`・`{todayNote}` の3か所が同時に変わります。」。`ownerName` / `focusTheme` / `todayNote` は Step 1 限りの名前で（定義は :178-180、以降の登場は :204/:217/:222/:229/:237/:279/:286/:294 まで）、Day 02 最終コード（:1061 以降の `DashboardOwner` / `dashboardOwner` / `focusCards`）には存在しない。「触るのはファイル先頭の1行だけ」も、最終形では `dashboardOwner` オブジェクトの該当プロパティ行を指すので実態と合わない。
- 直し方: :1293-1295 を最終形に合わせて「名前や集中テーマを変えたくなったときに触るのは `dashboardOwner` の1か所だけで、見出しの `{mainMessage}` と下段の `focusCards` の表示が同時に変わります。」のように書き換える。

## [day03/day04 .node-version + untracked-file counts] material/30days-curriculum/day03_GitHubに保存する.md:554  (quality)
- 指摘: 本文が「Vercel は公開用ビルドの Node バージョンを .node-version から読み取る」と書いているが、実際は package.json の engines.node か Project Settings
- 根拠: day03:554「`.node-version` は中身が `22` の1行だけのファイルですが、これを送る理由があります。Day 04 で使う Vercel は、公開用のビルドを走らせるときに Node のバージョンをこのファイルから読み取ります。送っていないと Vercel 側の既定のバージョンで組み立てられるので、手元で通ったビルドが公開先で通らないことがあります。」

一次情報（https://vercel.com/docs/functions/runtimes/node-js/node-js-versions）が挙げる指定手段は2つだけ：「Setting the Node.js version in project settings」と「Version overrides in `package.json` … You can define the major Node.js version in the `engines#node` section of the `package.json` to override the one you have selected in the Project Settings」。Vercel ドキュメントで `.node-version` が出てくるのは Conformance の lint ルール REQUIRE_NODE_VERSION_FILE（ファイルの存在を要求する社内規約ルール）だけで、ビルドの Node 選定元としては記載が無い（Python は `.python-version` を読むと明記されており、Node にはその記載が無い）。

この教材リポジトリ自身も engines で固定済み：package.json:8-10「"engines": {\n    "node": "22.x"\n  },」。つまりバージョンをそろえているのは engines.node であって `.node-version` ではない。読者が打つコマンド（`git add .node-version`）自体は変わらず、`.node-version` は mise/nodenv 等の手元ツール用として送る価値があるので、詰まりはしないが説明が事実と違う。
- 直し方: 554行の2文目以降を差し替える。例：「`.node-version` は中身が `22` の1行だけのファイルで、手元の Node をこのバージョンにそろえるために置いてあります（`mise` などが読みます）。公開先の Vercel が使う Node のバージョンは、このファイルではなく `package.json` の `engines.node`（このプロジェクトでは `"22.x"`）で決まります。`package.json` はこの Step で add するので、手元と公開先のバージョンはそろいます。」

## [day03/day04 .node-version + untracked-file counts] material/30days-curriculum/day04_ネットに公開.md:987  (quality)
- 指摘: つまずきポイントの解決欄が「.node-version を add したか確認」になっており、同じ誤った前提に立っている
- 根拠: day04:987「| 公開先だけビルドの結果が手元と違う | Node のバージョンが手元と公開先でそろっていない | Day 03 の Step 7 で `.node-version` を add したか確認する。送っていなければ add して push し直す |」

Vercel は `.node-version` を読まない（上記 day03:554 の根拠と同じ一次情報）ため、この対処を実行してもビルドの Node バージョンは変わらない。実際に効くのは package.json:8-10 の `"engines": { "node": "22.x" }` を送ること、または Vercel の Project Settings → Build and Deployment → Node.js Version。読者は行き止まりにはならない（engines がすでに効いているので、この症状自体まず起きない）が、起きた場合の対処として無効。
- 直し方: 解決欄を「Day 03 の Step 7 で `package.json` を add・push したか確認する（Node のバージョンは `package.json` の `engines.node` で決まる）。それでも違うなら Vercel の Settings → Build and Deployment → Node.js Version を見る」に差し替える。

## [day03/day04 .node-version + untracked-file counts] material/30days-curriculum/day03_GitHubに保存する.md:622  (quality)
- 指摘: 未追跡ファイルの件数が本文と合っているか（今日3件へ直した）
- 根拠: 直前の621行は3件に直っている：「`git status -sb` に残るのは、add しなかったものの `??` の行だけになります。配布 ZIP をそのまま使っていれば `?? .mise.toml` `?? doc/` `?? scripts/` の3行が並びます。」

ところが622行が旧数のまま：「これらは GitHub へ送らないので、残っていて正常です。上に挙げた4つ以外の行が残っていたら、その行が何のファイルかで対応が分かれます。」

「上に挙げた」のは3つなのに「4つ」と言っており、読者は4つ目（=add 済みの `.node-version`）を探すことになる。なお同じ構造の581-582行は3件で整合しており（「…の3行が並びます。どれも add していないので正しい状態です。`.node-version` はさきほど add したので、ここには出てきません。」）、622行だけ直し漏れ。
- 直し方: 622行の「上に挙げた4つ以外の行が残っていたら」→「上に挙げた3つ以外の行が残っていたら」。

## [day09/day11 — Suspense説明・狭幅ヘッダー・削除ダイアログ alt・見出し空行] material/30days-curriculum/day09_プロジェクト一覧画面.md:949-951  (quality)
- 指摘: 狭い画面で縦に並ぶと書いてあるが、ヘッダーに flex-wrap / flex-col の指定があるか
- 根拠: day09:949 「スクリーンショット: ブラウザの幅を 430px まで縮めたときの姿です。サイドバーが隠れ、見出しとヘッダーの部品が縦に折り返します。」 day09:951 alt「…見出しの下にアーカイブ表示スイッチと新規プロジェクトボタンが縦に並んでいる」。ところが day09 が書かせるヘッダーは day09:771-772 `      <div className="flex items-center` / `        justify-between">`、完成版も day09:1268 `        <div className="flex items-center justify-between">` で、flex-col も flex-wrap も無い（子は折り返さず1行のまま縮むだけ）。縦積みになるのは後日の改訂版と最終ソース: day27_プロジェクト詳細・アーカイブを実装しよう.md:1454 `        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">`、day27:1472 「`flex-col` から始めて `sm:flex-row` を足しているのは、狭い画面では見出しと操作を縦に積むためです。」、src/app/project/page.tsx:348 `        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">`。つまり 951 のスクリーンショットは完成版アプリの姿で、Day 9 時点の読者の画面とは一致しない。
- 直し方: day09:949 と 951 の記述を Day 9 時点のコードに合わせる（例: 949「サイドバーが隠れ、見出しと操作部品は横1列のまま幅が詰まります。狭い画面で縦に積む形は Day 27 で入れます。」／alt も横1列の描写に差し替え、スクリーンショットも Day 9 状態で撮り直す）。あるいは day09:771-772 と 1268 のクラスを `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between` に前倒しし、day27:1472 と同趣旨の説明を添える（ただし day27 で同じ説明が重複するため前者を推奨）。

## [day09/day11 — Suspense説明・狭幅ヘッダー・削除ダイアログ alt・見出し空行] material/30days-curriculum/day11_プロジェクト編集・削除.md:815  (quality)
- 指摘: 削除確認の画像 alt と、実装の DeleteConfirmDialog に渡している title の文言が食い違う
- 根拠: day11:815 alt「確認ダイアログ。見出しが「本当に削除しますか？」、その下に「この操作は取り消せません。」と、キャンセル・削除の2つのボタンが並んでいる」。しかし直前の Step 5 で読者が書くのは day11:785 `  title="プロジェクトを削除しますか？"`、完成版も day11:2246 `        title="プロジェクトを削除しますか？"`。src/app/project/page.tsx:474 も `        title="プロジェクトを削除しますか？"`。「本当に削除しますか？」は title 省略時の既定値で、src/component/ui/delete-confirm-dialog.tsx の `  title = '本当に削除しますか？',` にあたる（day11:808 の props 表でも「省略時は `本当に削除しますか？`」と説明済み）。title を渡している以上、読者の画面の見出しは「プロジェクトを削除しますか？」になり alt と食い違う。
- 直し方: day11:815 の alt を「確認ダイアログ。見出しが「プロジェクトを削除しますか？」、その下に「この操作は取り消せません。」と、キャンセル・削除の2つのボタンが並んでいる」に直す（スクリーンショット画像自体が既定文言で撮られている場合は撮り直す）。

## [day23 / day25 / day26 review sweep] material/30days-curriculum/day23_週次レポート.md:906  (nit)
- 指摘: 「Recharts は右の形しか読めない」は誤りで、dataKey は関数も取れる
- 根拠: day23:906「左は入れ子、右は入れ子のないひと並びです。Recharts は右の形しか読めないので、同じ材料から2種類のひと並びを作ります。グラフの棒が出ないときは、`dataKey` に書いた名前が右側の列名と合っているかを見てください。」— インストール済み recharts 3.8.1 の型定義 node_modules/recharts/types/util/typedDataKey.d.ts が「- string (must be a key of DataPointType) / - number ... / - function that takes DataPointType and returns DataValueType `(obj: DataPointType) => DataValueType)`」と明記しており、`export type TypedDataKey<...> = ... string | number | ((obj: DataPointType) => DataValueType) ...`。つまり `dataKey={(w) => w.byStatus.DONE}` で入れ子のまま読める。「しか読めない」は言い過ぎ。ただし読者が打つコードは変わらない（平らな配列を作る方針は src の実装とも一致）ので、詰まりも誤入力も生じない。なお同じファイルの day23:1763 は「Recharts は『1週分が1オブジェクト、系列名がそのキー』という形の配列を求めます」と、より穏当な言い方になっている。
- 直し方: 906行の「Recharts は右の形しか読めないので」を「Recharts はこの形をそのまま読めるので」または「Recharts に渡すときはこの形が一番素直なので」に置き換える（1763行の言い回しに寄せる）。

## [day27/day29/day30 review findings] material/30days-curriculum/day27_プロジェクト詳細・アーカイブを実装しよう.md:336-342  (quality)
- 指摘: ProjectDetailViewProps の optional 表記が完成実装（src/component/project/project-detail-view.tsx）と食い違う
- 根拠: day27:336-342 「  onUpdateMemberRole?: (\n    userId: string,\n    role: ProjectMemberRole,\n  ) => void;\n  onArchive: (projectId: string, isArchived: boolean) => void;\n  canManageMembers?: boolean;\n  canArchive?: boolean;」に対し src/component/project/project-detail-view.tsx:36-39 は「  onUpdateMemberRole: (userId: string, role: ProjectMemberRole) => void;\n  onArchive: (projectId: string, isArchived: boolean) => void;\n  canManageMembers: boolean;\n  canArchive: boolean;」で `?` が無い。差異そのものは day27:1780 「Step 3 では末尾3つに `?` を付けた形を載せましたが、完成版はすべて必須です。」で自己修正されており、day27:1773-1776 の完成版 interface は src と一致する。ただし `?` を付ける理由として書かれた day27:346 「末尾の3つに `?` が付いているのは、Day 11 の呼び出しがこの3つを渡さないためです。」は事実に反する。day11_プロジェクト編集・削除.md:1019-1022 は「        onUpdateMemberRole={() => {}}\n        onArchive={handleArchive}\n        canManageMembers={false}\n        canArchive={true}」と3つとも渡しており、day11:1029 も「`ProjectDetailView` が求める props は8つで、どれも省略できません。」と明記している。
- 直し方: day27:336, 341, 342 の `?` を外して src と Day 11（および同ファイル 1773-1776 の完成版）に合わせ、根拠が崩れた day27:346-347 の2文を削除する。Step 3 を中間形として残すなら、day27:346 の「Day 11 の呼び出しがこの3つを渡さない」という理由づけは Day 11 の実際の記述と矛盾するので別の理由に差し替える。

## [day27/day29/day30 review findings] material/30days-curriculum/day29_ユーザー詳細・編集ページを作ろう.md:3158-3160  (nit)
- 指摘: page.tsx の事前 prisma.user.findUnique と notFound() により、認可の前に ID の存在が外から分かる
- 根拠: 挙動の記述としては正しく、教材コード（day29:2080-2101）も src/app/user/[id]/page.tsx の「  const user = await prisma.user.findUnique({\n    where: { id },\n    select: { id: true },\n  });\n\n  if (!user) {\n    notFound();\n  }」と完全に一致する（src/app/user/[id]/edit/page.tsx も同型）。ただし教材の欠陥ではない。当の day29:3160 が「副作用として、居ない ID は 404、居る ID は権限エラーと返り方が分かれるので、外から「その ID のユーザーが実在するか」を言い当てられます。」と自ら明示し、さらに冒頭 day29:55 が「これは裏を返すと、返り方の違いから「そのIDのユーザーが実在するか」を外から言い当てられるということでもあります。Day 07 でログインの文言をそろえたのと同じ考え方でいくなら、どちらも同じ404に見せるほうが安全です。今日は動的ルーティングと権限判定を追うことを優先して、この形のまま進みます。」と、より安全な代替と据え置く理由まで書いている。
- 直し方: 修正不要。指摘された列挙可能性は day29:55 と day29:3160 の2箇所で既に開示済みで、推奨される対処（どちらも同じ404に揃える）も明記されている。

## [day01/day02 見出し重複・コードブロック長・文言] material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md:275, :839  (nit)
- 指摘: #### 期待する結果 (:275) と #### 編集アンカー (:839) が見出し重複している
- 根拠: 重複そのものは実在する。day01:243 `#### 期待する結果` / day01:275 `#### 期待する結果`、day01:540 `#### 編集アンカー` / day01:839 `#### 編集アンカー`。ただしこれは事故ではなく house convention。同じ h4 ラベルは corpus 全体で反復使用されており、day04 は `#### 期待する結果` を4回、day02 は `#### 編集アンカー` を3回持つ（`grep -c '^#### 期待する結果' day04_ネットに公開.md` → 4、`grep -c '^#### 編集アンカー' day02_...md` → 3）。いずれも別の親セクション（day01 の :275 は「### Step 2」直前、:839 は「#### 4-2. `page.tsx` を最初の画面に置き換える」直下）に属する定型の道標であり、読者は混乱しない。品質ゲートにも重複見出しを禁じる検査は無い（check_setext_heading.py は setext 記法のみを見る）。
- 直し方: 修正不要。直すなら見出しの一意化ではなく、反復ラベルという設計自体の是非を別途決める話になる。個別に片方だけ改名すると day02/day04 と体裁が割れて悪化する。

## [day01/day02 見出し重複・コードブロック長・文言] material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md:110  (quality)
- 指摘: 「準備プロジェクト」という言い回しがおかしい
- 根拠: day01:110 `3. 画面上部（macOS はメニューバー）にクジラのアイコンが表示されれば準備プロジェクト` — 日本語として成立していない。同一ファイルの同じ用法は day01:159 `…『docker ok』と表示されれば準備完了です。` と day01:519 `…`src` や `package.json` が並んでいれば準備完了です。` で、いずれも「準備完了です」。「準備プロジェクト」は corpus 全体でこの1箇所のみ（`grep -rn '準備プロジェクト' material/30days-curriculum/` → 1件）。commit 4a408a7 `fix(material): rewrite Day 01-03 UI copy to match the finished app` で混入した置換事故と見られる。Docker 導入手順の完了条件を示す行なので、読者は「これで終わりなのか」を文からは確認できない（直前の『クジラのアイコンが表示されれば』で意図は推測できるため blocker ではない）。
- 直し方: day01:110 を `3. 画面上部（macOS はメニューバー）にクジラのアイコンが表示されれば準備完了です` に直す（:159 / :519 の表記に揃える）。

## [コード側の指摘（scripts/curriculum-qa, scripts/pdf-book, src/lib/constant）] scripts/curriculum-qa/shoot_screenshots.py:843-851  (nit)
- 指摘: 再試行が HTTP 500 以上のとき 0.5 秒待たずに即再試行している
- 根拠: 843: `conn = http.client.HTTPConnection("127.0.0.1", port, timeout=3)` / 845: `conn.request("GET", "/")` / 846: `if conn.getresponse().status < 500:` / 847: `return` / 848: `except OSError:` / 849: `time.sleep(0.5)` / 850: `finally:` / 851: `conn.close()`。sleep は `except OSError` 節の中だけにある。接続は成立するが 500 以上が返る場合、847 の return を通らず例外も出ないので、そのまま `while` の先頭へ戻る。SERVER_TIMEOUT の間、待ちなしでリクエストを撃ち続ける忙しいループになる。実害は CPU と起動直後のサーバーへの連打で、待ち時間そのものは変わらないため nit。
- 直し方: 846 の分岐を `if ...status < 500: return` の後に `time.sleep(0.5)` を続ける形にする（try 節の末尾、もしくは try/except の外へ sleep を1本出して両経路で待つ）。

## [コード側の指摘（scripts/curriculum-qa, scripts/pdf-book, src/lib/constant）] scripts/curriculum-qa/test_build_day_snapshots.py:689-701  (nit)
- 指摘: out が None のとき2つ目の検証へ渡してしまう
- 根拠: 688: `out = target.add_declaration(body, "const b = 2;")` / 689: `if out is None:` / 690: `fails.append("❌ 置き場が決まるはずやのに足せていない")` / 691: `else:` で 692-698 だけを守っている。701: `twice = target.add_declaration(out, "const c = 3;")` は else の外にあり、out が None でもそのまま渡る。渡った先の build_day_snapshots.py:669 `if any(declares(text, name) for name in fragment_declares(fragment)):` → 646 `return re.search(ANCHOR.format(name=…), text, re.M) is not None` で text=None のため re.search が TypeError を投げる。結果、失敗を一覧にして返す設計なのに、その1件目が起きた回だけテストがトレースバックで落ちて残りの検証（705-715）が走らない。
- 直し方: 701-703 を 691 の else ブロックへ入れる（あるいは 690 の直後に `return fails`）。

## [コード側の指摘（scripts/curriculum-qa, scripts/pdf-book, src/lib/constant）] scripts/curriculum-qa/test_shoot_screenshots.py:63  (nit)
- 指摘: 禁止キーの一覧を手で二重管理している
- 根拠: テスト側 63: `for key in ("x", "y", "width", "height", "rect", "left", "top", "box"):`。本体側 shoot_screenshots.py:75: `FORBIDDEN_MARK_KEYS = ("x", "y", "width", "height", "rect", "left", "top", "box")`（使用箇所は 514 と 555 の `k in FORBIDDEN_MARK_KEYS`）。同じ8語が2箇所に手書きで並んでいるのは事実。ただしテストは `target` をすでに import しており（59 行で `target.MARK_RECT_SOURCE` を参照）、あえて定数を引かず綴りを固定していると読める。定数を import すると本体からキーを1つ消したときにテストも同時に緩んで無検知になるため、この重複はテストとして妥当な設計でもある。欠陥というより設計判断。
- 直し方: 重複を消したいなら `assert set(target.FORBIDDEN_MARK_KEYS) == {"x","y","width","height","rect","left","top","box"}` を1本置いた上でループは `target.FORBIDDEN_MARK_KEYS` を回す。取りこぼし検知を残しつつ二重管理を1箇所に畳める。

## [コード側の指摘（scripts/curriculum-qa, scripts/pdf-book, src/lib/constant）] src/app/dashboard/page.tsx:259-268  (quality)
- 指摘: src/lib/constant/priority.ts と status.ts、scripts/_constants/ のグラフ用の色を10pxのラベルへ使っていてコントラストが足りない
- 根拠: 指摘された定数ファイル自体は色の定義だけで、priority.ts のコメントは逆に `// グラフ以外で優先度に色を割り当てないのは、1枚のカードに色が積み上がるのを避けるため` と書いている。実際に文字色へ流しているのは dashboard で、259: `className="text-[10px] font-medium"` / 260: `style={{ color: TASK_STATUS_COLORS[task.status] }}`、266-268 が同じ形で `TASK_PRIORITY_COLORS[task.priority]`。カード地は globals.css:124 `--card: 0 0% 100%;`（dark は 177 `--card: 228 20% 12%;`）。10px・font-medium は WCAG の大きい文字に当たらず 4.5:1 が要る。実測コントラスト（白地 / 暗地 #181b25）: HIGH・IN_REVIEW #f69e23 = 2.14 / 8.04、DONE #26ab7a = 2.92 / 5.88、MEDIUM・IN_PROGRESS #1e9cb8 = 3.23 / 5.32、URGENT・CANCELLED #dc3848 = 4.47 / 3.85、LOW・TODO #5f6777 = 5.69 / 3.02。明色モードで4色が 4.5 未満、暗色モードでも2色が 4.5 未満。なお教材側は grep 上この色を `Cell fill` / `Bar fill` にしか使っておらず（day22:376,514 / day23:581,584）、`style={{ color: TASK_` は material に0件。読者が写経する範囲には出てこないので blocker ではない。
- 直し方: 文字は `text-muted-foreground` 等のテキスト用トークンで描き、色は 245-254 の 10px ドット（`backgroundColor`）に任せる。ラベルにも色を残すなら chart トークンとは別に、両モードで 4.5:1 を満たすテキスト用の濃淡を status.ts / priority.ts に別表として持たせ、scripts/_constants/ 側も同時に更新する。

## [PR #389 二巡目] scripts/curriculum-qa/check_visualization.py:177  (bug・採用)
- 指摘: `CURRICULUM_QA_WARN_ON_DUPLICATE_IMAGE=FALSE` を渡すと WARNING へ落ちる
- 根拠: 177 の判定は `os.environ.get(...) in ('', '0', 'false', 'False')`。`FALSE` はこの4つに無いので False が返り、`fail_on_duplicate_image=False` で本体が走る。`FALSE` は「落とさん」の意思表示なので、意図と逆の結果になる。重複画像だけが違反の回は exit 0 になり、ゲートが素通りする。
- 直し方（適用済み・9043c13）: `raw = os.environ.get(...).strip().lower()` にしてから `('', '0', 'false')` と突き合わせる。`default_is_fatal()` に `FALSE` が FAIL のままであること、`' 1 '` が WARNING へ落ちることの2件を追加。正規化を戻すと落ちることを確認済み。

## [PR #389 二巡目] scripts/curriculum-qa/shoot-page.mjs:282  (bug・採用)
- 指摘: `page.waitForFunction` の無条件 `catch` が、評価エラーもページ破棄も警告に変えて撮影を続ける
- 根拠: 282 の `} catch {` は例外の種類を見ていない。待ち時間切れ以外（predicate の評価失敗・ページ破棄）でも `console.warn` を出して先へ進み、画像は保存される。撮れてしまうので誰も失敗に気づけない。このリポジトリの「空 catch / エラー握り潰し禁止」にも当たる。
- 直し方（適用済み・9043c13）: `import { chromium, errors } from 'playwright'` を取り込み、`catch (err)` で `err instanceof errors.TimeoutError` でなければ再送出する。`check_animation_settle` に「ヘルパー本体に `catch {` が戻っていない」「`errors.TimeoutError` を見ている」「`errors` を import している」の3点を追加。広い catch へ戻すと3件とも落ちることを確認済み。

## [PR #389 二巡目] scripts/curriculum-qa/shoot_screenshots.py:858-873  (bug・採用)
- 指摘: 撮影が成功した回に、ワーカーの `stderr` を捨てている
- 根拠: `run_worker` は失敗時だけ `proc.stderr[-2000:]` を例外文へ載せ、成功時は `result["shots"]` を返すだけで `proc.stderr` に触れない。`shoot-page.mjs` の収束タイムアウト警告は Node の `console.warn`（stderr）にしか出ないため、途中の絵が保存された回でも「撮れた」の一言しか残らない。
- 直し方（適用済み・9043c13）: `forward_worker_warnings(stderr, label)` を新設し、`run_worker` の成功パスで `[day07] …` の形へ前置きして自分の stderr へ流す。`shoot_day` は `run_worker(job, f"day{day:02d}")` で呼ぶ。`check_worker_warning_forwarding` で、関数の出力（日付ラベル付き・空行を流さない）と、`run_worker` 本体に呼び出しが残っていることの両方を見る。転送を消すと落ちることを確認済み。

## [PR #389 三巡目] scripts/curriculum-qa/build_day_snapshots.py:1080  (bug・採用)
- 指摘: 単独行の DB マーカーが判定用のプールから落ちる（Codex P1）
- 根拠: `ERROR_MARK = re.compile(r"error|failed|not found|Cannot find|✗|⨯", re.I)` を実際に当てて確かめた。`Can't reach database server at \`localhost\`:\`5432\`` → False、`P1001` → False、`Please make sure your database server is running` → False、`PrismaClientInitializationError:` → True。Prisma は例外名とマーカーを別の行に吐くので、マーカー側の行が `hits` から落ちる。残るのは例外名の行だけで、その行は `DB_LESS_BUILD_MARKERS` のどれも含まんため `all()` が False を返し、DB だけの失敗が「DB 以外の失敗」に化ける。二巡目で足したテストは `Error: P1001: Can't reach database server` と1行に詰めとったので、この形を踏んでいなかった。
- 壊れる向き: 黙って通す側やのうて、DB の無い機械で `--verify` が止まる側。うるさいが安全な向きではある。ただしこの変更は「DB の無い機械を通す」ために入れたものなので、目的を果たせていない。
- 直し方（適用済み・次のコミット）: (1) `error_line_pool` の抽出条件を `ERROR_MARK.search(ln) or any(m in ln for m in DB_LESS_BUILD_MARKERS)` にして、マーカーを持つ行を必ず残す。(2) `DB_LESS_BUILD_MARKERS` に `PrismaClientInitializationError` を足す（接続失敗の例外名そのものであって、汎用のラッパーではない）。回帰テストは複数行の Prisma 失敗を DB 専用と判定できること、その後ろに prerender の失敗を1行足したら通さんことの両方を見る。2つの直しを別々に戻して、それぞれ別のメッセージで落ちることを確認済み。

## [PR #389 四巡目] scripts/curriculum-qa/build_day_snapshots.py:1294  (bug・採用／設計変更)
- 指摘: Next.js のラッパー行が混じると、DB だけの失敗を通せない（Codex P1）
- 根拠: 手元で再現した。`['Error: Failed to collect page data for /dashboard', 'PrismaClientInitializationError:', "Can't reach database server"]` を `error_line_pool` へ通すと3行とも残り、`build_failure_is_db_less` は `False` を返す。1行目は `ERROR_MARK` に当たるがマーカーを持たんため `all()` が落ちる。結果、DB の無い機械で `--verify` が exit 1 になる。
- なぜパッチを重ねんかったか: これは同じ述語への4回目の指摘（丸ごと無視 → 3行の標本で分類 → 単独行のマーカー落ち → ラッパー行）。`next build` は根本原因をラッパー行で包んで出すので、行の文言から「DB か、それ以外か」を当てにいく限り、ラッパーの語彙が1つ増えるたびに壊れる。文言の追加でイタチごっこを続けるより、当てにいくのをやめるほうが正しい。
- 直し方（適用済み）: 判定を「DB だけで説明できるか」から「DB が絡むか（＝この機械では判定できんか）」へ変え、`build_failure_needs_database` に改名。DB のマーカーが1つでもあれば `build` を `SKIP` へ振り替える。**通した扱いにはせん** — `broken` からは外れるが、成功の行に「build を判定できんかった日が N 件」「この走行は build を検証していません」と出るので、緑と読めん。DB のある機械ではマーカーが出んので、本物の失敗はこれまでどおり止まる。
- テスト: 振り替えを `triage_build_results` として切り出し、実際に `DayResult` を通して SKIP / NG / OK の3通りが正しく分かれることを見る。**最初に書いたのは文字列一致の飾りやった**（`skipped = [` を探すだけなので、中身を `[]` に潰しても緑のまま通った）。挙動で見る形へ直してから、骨抜きにすると落ちることを確認した。

## [PR #389 四巡目] scripts/curriculum-qa/shoot-page.mjs:278  (bug・採用)
- 指摘: 無限アニメーションを待つ相手から外しただけで、止めてへん（Codex P2）
- 根拠: `screenshot-shot.json` に `day09/project-loading.png` `day21/report-loading.png` `day23/report-weekly-loading.png` `day29/user-detail-loading.png` の4枚があり、写すのは `src/component/ui/loading-spinner.tsx:4` と `page-skeleton.tsx:5` の `animate-spin`（無限回転）。`settleAnimations` は無限アニメーションを待つ相手から外すので即座に返り、撮影はその瞬間の回転角を写す。同じ回を2度撮ると別の画像になる。決め打ちの待ちを外した目的（決定性）が果たせていない。
- 直し方（適用済み）: 待ち終えたあとに `document.getAnimations()` を回して、`iterations === Infinity` のものだけ `currentTime = 0` にして `pause()` する。待たへんことと位相を決めることは別の仕事、という切り分け。退行テストは助け関数の本体に `animation.pause()` と `animation.currentTime = 0` があることを見る。

## [PR #389 四巡目] doc/review-handoff/duplicate-image-gate.md:26-29, 68-69  (doc・採用)
- 指摘: WARNING 時代の記述が残っていて、同じページが自分と矛盾しとる（Codex P2）
- 根拠: 1行目の見出しが「今は WARNING、撮り直し後に FAIL へ上げる」、26行目に「## 今は WARNING（既定）」がある一方、36行目には「## 既定は FAIL（2026-08-31 に切り替え済み）」がある。68行目は存在せん `default_is_warning()` を指しとる（`default_is_fatal()` へ改名済み）。70行目の「## 現在の重複一覧」は切り替え前の17ファイルの表で、いまは0件。読んだ人が現在の状態を判断できん。
- 直し方（適用済み）: 見出しを現状（既定 FAIL）に直し、WARNING 時代の節を「当初は WARNING だった（履歴・2026-08-30 時点）」として履歴と明示。`default_is_warning()` を `default_is_fatal()` に訂正し、一時的に落とす手段はフラグと環境変数であることを先に書いた。重複一覧は「当時の重複一覧（履歴）」に改め、現在は0件である旨を表の直前に置いた。

## [PR #389 六巡目] scripts/curriculum-qa/build_day_snapshots.py:1278  (bug・採用／自分が作った見逃し)
- 指摘: `P1012` を DB 不在の印として扱っとる（Codex P1）
- 根拠: P1012 は Prisma のスキーマ検証エラー全般の番号であって、DB へ届かんことの印やない。生成されたスナップショットにリレーションの書き間違いがあれば `prisma generate` が P1012 を出す。SKIP 設計に変えたことで、この番号が1つ混じるだけで**本物のビルド欠陥が SKIP へ落ちて exit 0 になる**。前の `all()` 設計では他の行が非 DB なら止まっとったので、SKIP へ変えた副作用として新しく開いた穴。**いちばんやったらアカン向き（黙って通す側）の見逃し。**
- 直し方（適用済み）: `DB_LESS_BUILD_MARKERS` から `P1012` を落とす。DB 由来の P1012（環境変数の欠落）は `Environment variable not found: DB_URL` / `DATABASE_URL` と `Error validating datasource` が文言で拾うので、取りこぼしはない。回帰テストは、リレーションの書き間違いを含む P1012 の3行が DB 扱いされんこと、環境変数の欠落は DB 扱いされることの両方を見る。`P1012` を戻すと落ちることを確認済み。

## [PR #389 六巡目] scripts/curriculum-qa/build_day_snapshots.py:1359  (bug・採用)
- 指摘: 結果ドキュメントを切り分けより先に書き出しとる（Codex P2）
- 根拠: `main` の 1354 で `write_result_doc(results, ...)` を呼び、1359 で `triage_build_results` を当てとった。DB の無い機械では、画面は「SKIP・検証していません」と言うのに、証拠として出すファイルは `build NG` のまま残り、さらに `triage_section` が「判定不能（未調査）」の行を生やす。読んだ人はファイルのほうを信じるので、教材の欠陥を疑わせる嘘の行が残る。
- 直し方（適用済み）: 切り分けを書き出しの前へ移した。回帰テストは `RESULT_DOC` を一時ディレクトリへ差し替えて実際に書き出し、本文に `SKIP` が残ること・「判定不能（未調査）」の行が無いことを見る。あわせて `main` の中での呼び出し順そのものも固定した。順序を戻すと `❌ 結果ドキュメントを切り分けより先に書き出している` で落ちることを確認済み。

## [PR #389 六巡目] doc/review-handoff/progress.md:317  (doc・採用)
- 指摘: 引き継ぎの件数が古い（Codex P2）
- 根拠: 317行目が「7件とも直して返信・resolve 済み」のまま。実際は五巡目3件・六巡目3件を足して13件。このファイルはマージ可否を判断する土台やと自分で書いとるので、件数が古いと次の担当者が最終状態を確認でけへん。
- 直し方（適用済み）: 五巡目・六巡目の中身を追記し、件数を13件・6ラウンドへ更新。あわせて「次の担当者へ」の節に、`git checkout <file>` で自分の未コミットの直しが消える件（このセッションで3回踏んだ）と、文字列一致のテストは飾りになりうる件を足した。
