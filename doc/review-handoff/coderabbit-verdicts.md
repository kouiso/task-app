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
- 根拠: day09:949 「スクリーンショット: ブラウザの幅を 430px まで縮めたときの姿です。サイドバーが隠れ、見出しとヘッダーの部品が縦に折り返します。」 day09:951 alt「…見出しの下にアーカイブ表示スイッチと新規プロジェクトボタンが縦に並んでいる」。ところが day09 が書かせるヘッダーは day09:771-772 `<div className="flex items-center` / `justify-between">`、完成版も day09:1268 `<div className="flex items-center justify-between">` で、flex-col も flex-wrap も無い（子は折り返さず1行のまま縮むだけ）。縦積みになるのは後日の改訂版と最終ソース: day27_プロジェクト詳細・アーカイブを実装しよう.md:1454 `<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">`、day27:1472 「`flex-col` から始めて `sm:flex-row` を足しているのは、狭い画面では見出しと操作を縦に積むためです。」、src/app/project/page.tsx:348 `<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">`。つまり 951 のスクリーンショットは完成版アプリの姿で、Day 9 時点の読者の画面とは一致しない。
- 直し方: day09:949 と 951 の記述を Day 9 時点のコードに合わせる（例: 949「サイドバーが隠れ、見出しと操作部品は横1列のまま幅が詰まります。狭い画面で縦に積む形は Day 27 で入れます。」／alt も横1列の描写に差し替え、スクリーンショットも Day 9 状態で撮り直す）。あるいは day09:771-772 と 1268 のクラスを `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between` に前倒しし、day27:1472 と同趣旨の説明を添える（ただし day27 で同じ説明が重複するため前者を推奨）。

## [day09/day11 — Suspense説明・狭幅ヘッダー・削除ダイアログ alt・見出し空行] material/30days-curriculum/day11_プロジェクト編集・削除.md:815  (quality)

- 指摘: 削除確認の画像 alt と、実装の DeleteConfirmDialog に渡している title の文言が食い違う
- 根拠: day11:815 alt「確認ダイアログ。見出しが「本当に削除しますか？」、その下に「この操作は取り消せません。」と、キャンセル・削除の2つのボタンが並んでいる」。しかし直前の Step 5 で読者が書くのは day11:785 `title="プロジェクトを削除しますか？"`、完成版も day11:2246 `title="プロジェクトを削除しますか？"`。src/app/project/page.tsx:474 も `title="プロジェクトを削除しますか？"`。「本当に削除しますか？」は title 省略時の既定値で、src/component/ui/delete-confirm-dialog.tsx の `title = '本当に削除しますか？',` にあたる（day11:808 の props 表でも「省略時は `本当に削除しますか？`」と説明済み）。title を渡している以上、読者の画面の見出しは「プロジェクトを削除しますか？」になり alt と食い違う。
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
- 根拠: day01:110 `3. 画面上部（macOS はメニューバー）にクジラのアイコンが表示されれば準備プロジェクト` — 日本語として成立していない。同一ファイルの同じ用法は day01:159 `…『docker ok』と表示されれば準備完了です。` と day01:519 `…`src`や`package.json`が並んでいれば準備完了です。` で、いずれも「準備完了です」。「準備プロジェクト」は corpus 全体でこの1箇所のみ（`grep -rn '準備プロジェクト' material/30days-curriculum/` → 1件）。commit 4a408a7 `fix(material): rewrite Day 01-03 UI copy to match the finished app` で混入した置換事故と見られる。Docker 導入手順の完了条件を示す行なので、読者は「これで終わりなのか」を文からは確認できない（直前の『クジラのアイコンが表示されれば』で意図は推測できるため blocker ではない）。
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
- 根拠: `ERROR_MARK = re.compile(r"error|failed|not found|Cannot find|✗|⨯", re.I)` を実際に当てて確かめた。`Can't reach database server at localhost:5432` → False、`P1001` → False、`Please make sure your database server is running` → False、`PrismaClientInitializationError:` → True。Prisma は例外名とマーカーを別の行に吐くので、マーカー側の行が `hits` から落ちる。残るのは例外名の行だけで、その行は `DB_LESS_BUILD_MARKERS` のどれも含まんため `all()` が False を返し、DB だけの失敗が「DB 以外の失敗」に化ける。二巡目で足したテストは `Error: P1001: Can't reach database server` と1行に詰めとったので、この形を踏んでいなかった。
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

## [PR #389 七巡目] scripts/curriculum-qa/build_day_snapshots.py:1308  (bug・採用／Codex と逆向きの穴)

- 指摘: DB マーカーだけで SKIP に分類するな（CodeRabbit Major）
- 根拠: `any()` にしたので、DB 接続失敗と `TypeError` や prerender の失敗が同じ build 出力に居ると True を返す。`triage_build_results` が SKIP へ振り替え、`broken` から外れ、**壊れた日を含む走行が exit 0 になる**。「SKIP は通した扱いやない」と書いたが、CI が見るのは終了コードなので、exit 0 は事実上「通した」と同じ。ここは自分の言い分のほうが弱い。
- Codex との関係: 四〜六巡目で Codex が突いたのは逆向き（`all()` やと Next.js のラッパー行が非 DB に数えられて、DB だけの失敗が止まる）。**両方成立する。**片側だけで判定する限りどちらかが壊れる。
- 直し方（適用済み）: 片側判定をやめ、両側で見る。`REAL_BUILD_FAILURE_MARKERS`（prerender / TypeError / Module not found / Type error: 等、**DB の有無に関係なく壊れとると言い切れるものだけ**）を新設し、`has_real_build_failure` が真なら SKIP にせん。ラッパー行（`Failed to collect page data`）は原因やのうて包み紙なので入れん — 入れると Codex の指摘した穴が開き直る。関数名も `build_failure_is_database_only` へ改めた。回帰テストは (a) DB＋ラッパー＋TypeError が SKIP にならんこと (b) prerender が本物の失敗に数えられること (c) ラッパー行が本物の失敗に数えられんこと の3方向を見る。

## [PR #389 七巡目] scripts/curriculum-qa/build_day_snapshots.py:1362  (bug・採用)

- 指摘: 画面の日別行が切り分け前の状態を出しとる（CodeRabbit Minor）
- 根拠: 六巡目で書き出しの順は直したが、その手前にある日別の `print` は直してへんかった。DB の無い機械では、画面の日別行だけ `build NG`、成果物と最終行は SKIP になり、**同じ走行が3通りの状態を名乗る**。
- 直し方（適用済み）: 切り分けを `snapshot_day` の直後・`print` の前へ移した（`triage_build_results([r])[0]`）。回帰テストは、切り分けが日別 print と `write_result_doc` の両方より前に来ることを見る。

## [PR #389 七巡目] scripts/curriculum-qa/check_visualization.py:187  (bug・採用／症状だけ直しとった)

- 指摘: 想定してへん環境変数値で FAIL を維持せよ（CodeRabbit Major）
- 根拠: 三巡目で `FALSE` を直したとき、大文字小文字の正規化だけを足して**判定の形（拒否リスト）はそのままにした**。`('', '0', 'false')` に無い値はすべて False を返すので、`ture` のような綴り間違いが WARNING へ落ちる。症状を直して原因を残した典型。
- 直し方（適用済み）: 許可リストへ反転。`return raw not in ('1', 'true', 'yes')`。落とす側だけを明示し、それ以外は FAIL。回帰テストに `ture` が FAIL のままである行を追加。

## [PR #389 七巡目] doc/review-handoff/duplicate-image-gate.md:32,35,70  (doc・採用)

- 指摘: 言語なしコードフェンス（MD040）／履歴の節に現在の結果が混ざっとる／`DUPLICATE_CASES` の False ケース数が実装と違う（CodeRabbit Minor ×3）
- 根拠: 32行目のフェンスに言語なし。35行目は「当時の記録」の例の中で「既定で FAIL。いまは重複が0件」と現在を語っとる（六巡目で節を履歴化したときの取りこぼし）。69行目は「フラグ `False` の3ケース」やが、実装の `DUPLICATE_CASES` に `False` は2件（`grep -c '        False,'` → 2）。
- 直し方（適用済み）: フェンスへ `text` を付け、履歴の例は当時の出力（重複17件・WARNING で exit 0）へ書き直し、現在の実測は別の段落へ分けた。件数を2ケースへ訂正。

## [PR #389 八巡目] scripts/curriculum-qa/build_day_snapshots.py:1276  (bug・採用／P1012 と同じ形)

- 指摘: `Error validating datasource` も DB 不在の印やない（Codex P1）
- 根拠: 手元で再現した。`` ['Error: Prisma schema validation - (get-dmmf wasm)', 'Error validating datasource `db`: the provider is invalid'] `` を通すと `build_failure_is_database_only` が True を返す。`npm run build` は `prisma generate` から始まるので、provider の書き間違いがそのまま「DB の不在」に化けて SKIP → exit 0。六巡目で `P1012` を落としたときに、同じ性質の隣の行を残しとった。回帰テストも `Error validating field` しか踏んでへんかったので、この形を通していた。
- 直し方（適用済み）: `Error validating datasource` を落とす。環境変数の欠落は `Environment variable not found: DB_URL` / `DATABASE_URL` が文言で拾うので取りこぼしはない。回帰テストに datasource の変種を追加。戻すと `❌ datasource のスキーマ欠陥を DB の不在として見逃している` で落ちる。

## [PR #389 八巡目] scripts/curriculum-qa/build_day_snapshots.py:1398  (bug・採用)

- 指摘: `EXPECTED_RED` が day11 の build 落ちを丸ごと免除しとる（Codex P1）
- 根拠: `broken` の build 節が `r.day not in EXPECTED_RED` で判定しとる。`EXPECTED_RED[11]` が断っとるのは `getById` の型エラーだけやのに、day11 に prerender や server/client 境界の失敗が紛れても day 番号だけで免除され、exit 0 で出ていく。
- 直し方（適用済み）: `build_failure_is_expected(result)` を新設。EXPECTED_RED の日に限り、**build の失敗行のうち本物の失敗（`REAL_BUILD_FAILURE_MARKERS`）が全部型エラー（`Type error:` / `TS####`）で説明できるときだけ**免除する。型エラーの証拠が1行も無い場合は免除せん。回帰テストは (a) 断り書きどおりの型エラーは免除される (b) prerender が1行紛れたら免除されん (c) 型エラーの証拠が無ければ免除されん (d) EXPECTED_RED に無い日は免除されん (e) 判定が `broken` の側で使われとる、の5方向。
- 実機での確認: `--day 11 --verify` を実際に流して exit 0・「想定どおり」のまま通ることを確かめた（結果ファイルは事前に退避して復元。`--day` は30日ぶんの記録を上書きするため）。

## [PR #389 九巡目] scripts/curriculum-qa/build_day_snapshots.py:1281  (bug・採用／自分が置いた逃げ道)

- 指摘: 環境変数の欠落を build の失敗のまま残せ（Codex P1）
- 根拠: 自分でファイルを開いて確かめた。`copy_scaffold()` は `.env.example` を**無条件で** `.env` へ複写しとる（`build_day_snapshots.py:357` の `shutil.copyfile(dest / ".env.example", dest / ".env")`）。その `.env.example` は `DATABASE_URL` を定義しとる（`.env.example:24`）。さらに `DB_URL` はこのリポジトリのどこにも無い（`grep -rn "DB_URL" --include=*.ts --include=*.prisma --include=*.example --include=*.yml --include=*.sh .` が0件。別リポジトリの流儀を写し間違えとった）。つまり DB の無い機械でも変数は在る。「変数が無い」と言われたのなら、それは組んだツリーか schema が壊れとる印で、DB の不在やない。八巡目の直しで「環境変数の欠落は文言で拾うので取りこぼしはない」と書いた行が、そのまま逃げ道になっとった。
- 直し方（適用済み）: `Environment variable not found: *` の2行を `DB_LESS_BUILD_MARKERS` から落とし、`Environment variable not found` を `REAL_BUILD_FAILURE_MARKERS` へ入れた。Prisma は変数の欠落も接続の失敗も `PrismaClientInitializationError` で包むので、**例外名だけでは SKIP に倒れんように、本物の失敗の判定が先に効く形**にした（`has_real_build_failure` の短絡）。回帰テストは (a) 両方の変数名で SKIP に落ちん (b) 本物の失敗に数える (c) 例外名と一緒に来ても SKIP に落ちん (d) `triage_build_results` を通しても NG のまま (e) `.env` を書く経路が消えたら気づく（前提そのものの見張り）、の5方向。戻すと `❌ 環境変数の欠落を SKIP へ振り替えて exit 0 にしている` ほか5件で落ちる。

## [PR #389 九巡目] scripts/curriculum-qa/shoot-page.mjs:278  (bug・採用／直しが別の不安定を生んどった)

- 指摘: JS で描くグラフのアニメーションを待てていない（Codex P2）
- 根拠: 自分で確かめた。`screenshot-shot.json` の day22・day23 の6枚は `wait_for` が `h3:text-is('優先度別タスク')` のような見出しだけで、その見出しは Recharts の `Pie` / `Line` / `Bar` と同じ描画で出る。Recharts は react-smooth が `requestAnimationFrame` で属性を書き換えて動かすので `document.getAnimations()` には**1つも出てこん**（`grep -rn "isAnimationActive" src` も0件で、アニメーションは既定のまま有効）。つまり収束待ちが即座に明けて、描きかけのグラフが保存され得る。決め打ちの 400ms を外した目的は「毎回同じ絵になること」やったのに、この6枚だけ逆に不安定にしとった。
- 直し方（適用済み）: `settleDrawnFrames()` を足した。SVG の中の座標・形・不透明度をつないだ文字列を毎フレーム作り、3フレーム続けて同じなら描き終わりとみなす（`polling: 'raf'`・上限は既存の 2000ms・待ち時間切れ以外は再送出・状態は毎回捨てる）。特定のライブラリの内部に依存せんので、Recharts 以外の JS 駆動にも効く。
- 検査: 「ソースの文字列を見るだけでは足りん」という指摘そのものを受けて、**実物のブラウザで動かす退行テスト**を足した（`settle-drawn-frames-check.mjs`）。rAF で 600ms かけて `d` を書き換えるページを本物の Chromium で開き、`settleAnimations()` を通した後の `d` が最終形であることを見る。待つ前は途中の形であることも同時に確かめて、「もともと最終形やった」で通るのを塞いだ。終わらん動きでも上限で戻ること、状態が次の1枚へ残らんことも見る。`shoot()` が呼ぶ `settleAnimations` の側を叩くので、**呼び出しごと消した場合も赤くなる**。実際に外して確かめた: `❌ rAF で描くアニメーションの途中で撮っている（d=M0 9 L9 100 / 期待 M0 100 L100 100）`。ブラウザが無い機械では `SKIP:` を出力に残して退ける（黙って通さん）。
- 残る限界: 実物の `/report` を撮って確かめたわけやない。あれには DB とその日のツリーの起動が要る。**確かめたのは「JS で描く動きを待てるようになったこと」までで、day22・day23 の6枚が実際に撮り直されたわけやない**（撮り直しは #388 で済んでおり、この直しは次に撮るときから効く）。

## [PR #389 十巡目] scripts/curriculum-qa/build_day_snapshots.py:1398  (bug・採用／八巡目の直しがまだ緩かった)

- 指摘: day11 の免除は「断り書きが名指しした型エラー」だけに合わせよ（Codex P1）
- 根拠: 八巡目で `build_failure_is_expected()` を足したが、見とるのは「型エラーかどうか」だけで、`getById` も件数も場所も見てへんかった。加えて `main()` の `broken` は tsc を `r.day not in EXPECTED_RED` で日ごと免除しとる。つまり day11 に無関係な型の欠陥が入ると、tsc も build も両方免除されて `--verify` が exit 0 を返す。八巡目の直しは「build の赤の種類」を絞っただけで、「その日の赤かどうか」は絞れてへんかった。
- 直し方（適用済み）: 断り書きの中身を機械が照合できる形にした（`EXPECTED_RED_SIGNATURE = {11: {"marker": "getById", "count": 5, "path": "project-detail-view.tsx"}}`）。tsc は「型エラーが5件」「全部が配布物の1ファイル」「どれかが `getById` に触れる」の3つが揃ったときだけ免除する。build も「本物の失敗が全部型エラー」に加えて「どれかが `getById` に触れる」を課す。`DayResult` に `tsc_errors`（表示用3行やのうて全部）を足して件数を数えられるようにした。`main()` の異常日の判定は `broken_days()` として切り出し、免除の線を実際に通して確かめられるようにした（八巡目の「`broken = [` を文字列で探す」検査は飾りやったので捨てた）。
- 波及の注意: `TS7006` / `TS7053` は識別子の名を含まん（`getById` が解決でけへんことで型が any へ落ちた結果）。せやから marker は「全行」やのうて「どれか1行」に課し、代わりに件数と場所で範囲を締めた。
- 回帰テスト: (a) 断り書きどおりの5件は免除 (b) 6件目が増えたら免除せん (c) `getById` に1行も触れん5件は免除せん (d) 別ファイルへ広がったら免除せん (e) EXPECTED_RED に無い日は免除せん (f) build 側も無関係な型エラーは免除せん (g) `broken_days()` を実際に通して、健全な日・断り書きどおりの day11・無関係な赤が紛れた day11 の3つが正しく分かれる。戻すと `❌ 断り書きの件数を超える型エラーまで想定内にしている` ほか3件で落ちる。
- 実機での確認: `--day 11 --verify` を実際に流して **exit 0**・`day11 の型エラーは想定どおり` が出ることを確かめた。実物の tsc は `project-detail-view.tsx` の29行目（`TS2339` `getById`）・144行目（`TS7006`）・167行目（`TS7053`）ほかで、**5件・同一ファイル・`getById` あり**。つまり教材本文が書いとる「5件出ます」は実測と一致しとる。結果ファイルは事前に退避して復元した（`--day` は30日ぶんの記録を上書きするため）。

## [PR #389 十一巡目] scripts/curriculum-qa/settle-drawn-frames-check.mjs  (bug・採用／自分の逃げ道が塞がっとった)

- 指摘: ブラウザが無いときの退避が動いてへん（Codex）
- 根拠: 自分で再現した。`import { chromium } from 'playwright'` を頭に書いとったので、playwright が入ってへん機械では**その行に来る前に**読み込みが落ちる。`node_modules/playwright` を一時的に退けて走らせると `ERR_MODULE_NOT_FOUND` で exit 1。`./shoot-page.mjs` も playwright を取り込むので同じ経路で落ちる。「ブラウザが無い機械では SKIP と出して退ける」と書いておきながら、その道が塞がっとった。
- 直し方（適用済み）: 取り込みを `try` の中の動的 `import()` へ移した。`chromium` も `shoot-page.mjs` も同じ扱い。
- 実測（両方向）:
  - playwright を退けた状態 → `SKIP: ブラウザを用意できんかった（Cannot find package 'playwright' ...）` / exit 0。python 側の検査も `⏭️ 実ブラウザ検査を退けた` を出して 9/9 合格
  - 戻した状態 → `✅ settle_drawn_frames 実ブラウザ検査 4/4 合格`
  - 直す前（静的 import）に退けた状態 → `ERR_MODULE_NOT_FOUND` で exit 1。つまり指摘どおり壊れとった

## [PR #389 十二巡目] CodeRabbit 7件（採用5・対応済み2）

- 指摘と判定:
  1. `test_shoot_screenshots.py:399` 時間切れを検査失敗として返せ（Minor）→ **採用**。180秒を超えると `subprocess.TimeoutExpired` が `main()` まで抜けて、件数も理由も出さずに落ちる。「検査が黙って終わる」はこの PR が潰しとる型そのもの。捕まえて途中出力を添えた失敗として返す。`timeout` を 0.001 秒にして実際にこの枝を通し、`❌ 実ブラウザ検査が 0.001 秒で終わらんかった: 出力なし` を確認した
  2. `build_day_snapshots.py:1316-1330` 除外理由のコメントが収録要素の直上に並んどる（Trivial）→ **採用**。中身は変えず、理由をタプルの外へまとめた。`P1001` / `ECONNREFUSED` を除外対象と誤読する余地を消す
  3. `coderabbit-verdicts.md:196` 入れ子バッククォートでコードスパンが壊れとる（Minor）→ **採用**。外側を二重バッククォートにした。markdownlint の MD038 がこの行から消えたことを確認（残る13件は67行ほかの既存分）
  4. `diagrams-added.md:6` mermaid の総数が文書内で食い違う（Minor）→ **採用**。実測値表が 69 のままやった。数え直すと day01〜day29 が 37 → 69、`day30` が 2 で前後とも不変、corpus 全体が 39 → 71。表の before も 39 → 37 へ訂正（day30 の2枚を含めた値を書いてしもとった）。**指摘は「69 を 71 に直せ」やったが、実測すると集計範囲が違うだけで両方正しい。**範囲を明記する側で直した
  5. `progress.md:5` 19件と21件の集計単位が違う（Minor）→ **採用**。19 は対応記録の本数、21 は個別の指摘数（1本に複数の指摘をまとめた回がある）と書き足した
  6. `test_settle_drawn_frames.mjs` の名前が命名規約に合わん（Major）→ **`bad6191` で対応済み**。ただし提案の `test-settle-drawn-frame.mjs` は使えん。`.gitignore:99` が `test-*.mjs` を落とすのでリポジトリに入らんくなる。`settle-drawn-frames-check.mjs` にした
  7. `console.log` が biome の `noConsole` を落とす（Major）→ **`bad6191` で対応済み**。`process.stdout.write` と `console.error` へ置換済み

## [PR #389 十三巡目] Codex 3件（全部採用）

1. `build_day_snapshots.py:1490` **成果物の文書だけが「想定内」と言い張る**（P2・採用）
   - 根拠: `broken_days()` は署名照合で異常と判定するのに、`triage_section()`（`write_result_doc` が呼ぶ）は `r.day in EXPECTED_RED` のままやった。day11 に断り書きと合わん赤が入ると、**走行は exit 1 やのに `day-snapshots-result.md` は「想定内（教材が本文で断っている）」と書く**。次に読む人は文書のほうを信じる。
   - 直し: `expected_red_holds()` を切り出して、走行の判定と文書の判定を同じ線に乗せた。回帰テストは (a) 断り書きどおりなら文書も「想定内」 (b) 6件目が混ざったら文書が「想定内」と書かん (c) 同じ入力を `broken_days()` が異常に数える、の3点。戻すと `❌ 断り書きと合わん赤まで成果物が想定内と書いている` で落ちる。
2. `test_shoot_screenshots.py:421` **実ブラウザ検査が CI で一度も走らん**（P2・採用）
   - 根拠: この検査を呼ぶ CI は `material-gate.yml`（`check_quality.sh` 経由）だけで、あの job は Chromium を入れてへん。つまり毎回 SKIP で緑になり、rAF の収束待ちが**実測されんままマージできる**。PDF 系の workflow は Chromium を入れとるが `test_shoot_screenshots.py` を呼んでへん。
   - 直し: `CURRICULUM_QA_REQUIRE_BROWSER` を足して、立っとる走行では SKIP 自体を失敗にした（許可値だけを見る。綴り間違いは既定＝立てん側へ倒す）。そのうえで、Chromium を用意しとる `pdf-book-gate.yml`（pull_request で起動）にこの検査を1ステップ足した。
     **配線を足した直後に自分で穴を見つけて塞いだ。** あの job の各ステップは「PDF を組む対象が0冊か」で切られとるので、`scripts/curriculum-qa/` だけを触った PR では Chromium も検査も走らん。`select` に `browser_qa` を足して、撮影まわり4ファイルか この workflow を触った PR では、対象0冊でもブラウザを用意して走らせるようにした（パターンは NUL 区切りの `changed.z` に対して3通りの入力で実測）。実測: ブラウザを退けて `REQUIRE=1` → 9/10 で赤、`REQUIRE` 無し → 10/10 で緑、ブラウザ有り＋`REQUIRE=1` → 10/10 で緑。
3. `settle-drawn-frames-check.mjs:47` **ワーカーの読み込み失敗まで SKIP に混ざる**（P2・採用）
   - 根拠: playwright とワーカー(`shoot-page.mjs`)の取り込みを1つの `try` で囲っとったので、ワーカーが読み込みで落ちても「ブラウザが無い」と同じ扱いで exit 0。撮影が壊れとるのに検査だけ緑になる。
   - 直し: playwright の取り込みと `chromium.launch()` だけを SKIP の対象にし、ワーカーの取り込みはその外へ出した（playwright が在る以上、そこで落ちるのは本物の失敗）。実測: playwright を退けると `SKIP … exit 0`、ワーカーに `throw` を仕込むと **exit 1**。

## [PR #389 十四巡目] Codex 3件（全部採用）

1. `build_day_snapshots.py:1332` **例外名だけで DB の不在に倒しとった**（P1・採用）
   - 根拠: `PrismaClientInitializationError` は接続でけへんときだけやのうて、接続文字列が不正なときや query engine が欠けとるときにも出る。名前だけを DB マーカーに入れとったので、その2つが `SKIP` へ落ちて exit 0 になる。六巡目に「この行には DB の語が無いので名前で拾う」と入れた行やが、あれは判定が `all()`（全行が DB 由来か）やった頃の話で、いまは「DB の語がある行が1つでもあり、本物の失敗の語が無い」に変わっとる。**前提が変わったのにマーカーだけ残っとった。**
   - 直し: マーカーから落とした。本物の接続失敗は `Can't reach database server` か `P1001` を必ず一緒に吐くので取りこぼさん（判定用のプールは `ERROR_MARK` に当たらん行も、マーカーの語を含む行なら残す作りにしてある）。回帰テストは (a) 接続文字列の不正 (b) query engine の欠落 の2つが SKIP に落ちんこと、(c) 本物の接続失敗はこれまでどおり拾えること。戻すと (a)(b) で落ちる。
2. `build_day_snapshots.py:1144` **両方赤い日に build の行が消える**（P2・採用）
   - 根拠: `tsc_shown or build_shown` やったので、tsc が赤い時点で build の行が丸ごと落ちる。day11 のように tsc の赤が想定内の日で build 側に別の欠陥が入ると、`broken_days()` は exit 1 にするのに、画面と `day-snapshots-result.md` には「知っとる型エラー」しか出ん。**落ちた本当の理由が読めん。**
   - 直し: `tsc_shown + build_shown` にして両方出す。回帰テストは `run_step` と `link_node_modules` を差し替えて `verify_tree()` を実際に通し、tsc と build の両方の行が表示用に残ること・判定用のプールが表示用に差し替わってへんことを見る。戻すと `❌ 表示用のエラーから build の行が落ちている` で落ちる。
3. `progress.md:356` **引き継ぎの要約がまた古い**（P2・採用）
   - 根拠: 八巡目・21件で止まったまま、九〜十三巡目が入ってへんかった。**同じ指摘は十二巡目でも受けとる**（あのときは件数の単位を書き足しただけで、増え続ける構造を直してへんかった）。
   - 直し: 要約の側で数えるのをやめた。巡ごとの見出しだけ残して、**件数は `coderabbit-verdicts.md` を grep して取る**形へ変えた（コマンドを併記）。「残っとること」からも件数を落とした。要約に数を書く限り必ず古くなるので、数える場所を1つにする。

**十四巡目の追認（2026-08-31T14:06Z）**: Codex が `53bb6e1` を読み直して3件とも解消と判定し、追加のコミット・PR は作らんかった。向こうの手元でも `test_build_day_snapshots.py` 23/23。ワイの側でも同じ head で 23/23・`biome check` エラー0・命名規約違反0・実ブラウザ検査 4/4 を実測済み。CI では `pdf-book-gate.yml` の「撮影の収束待ちを実ブラウザで検査」が `53bb6e1` で success（14:05:24→14:05:30、`CURRICULUM_QA_REQUIRE_BROWSER=1` なので SKIP なら赤になる＝実際に走っとる）。

## [PR #389 十五巡目] CodeRabbit 8件（全部採用）

1. `build_day_snapshots.py:1089` **DB の赤に紛れた境界エラーがプールから落ちる**（Major・採用）
   - 根拠: `error_line_pool()` は `ERROR_MARK`（`error|failed|not found|Cannot find|✗|⨯`）か DB マーカーに当たる行しか残さん。`REAL_BUILD_FAILURE_MARKERS` 9個のうち **`You're importing a component that needs` だけがどの語も含まん**。DB の赤と同じ出力に混ざると、この行だけ消えて `build_failure_is_database_only()` が真になり、本物の build 欠陥が SKIP で素通りする。この PR が潰しとる型そのもの。
   - 直し: プールの条件へ `REAL_BUILD_FAILURE_MARKERS` を足した。回帰テストは Prisma の2行＋境界エラーの出力を実際に `error_line_pool()` へ通し、境界行が残ることと DB だけと判定せんことを見る。戻すと `❌ 境界エラーが判定用プールから落ちている: ('PrismaClientInitializationError:', "Can't reach database server at localhost:5432")` で落ちる。
2. `build_day_snapshots.py:1442` **ツリー失敗を「想定内」と書く**（Minor・採用）
   - 根拠: `expected_red_holds()` が `tree_ok` を見てへん。`tsc` も `build` も `NOT_RUN` なら下の2枝を素通りして真を返すのに、`broken_days()` は同じ結果を異常として exit 1 にする。**十三巡目で潰した「文書だけが言い張る」型の取り残し。**
   - 直し: `tree_ok` を先に見て偽なら落とす。回帰テストは `expected_red_holds()` / `broken_days()` / `triage_section()` の3つを同じ入力で通す。戻すと `❌ ツリーを組めてへん日を想定内として扱っている` で落ちる。
3. `test_shoot_screenshots.py:405` **`node` 不在で検査が黙って終わる**（Minor・採用）
   - 根拠: `subprocess.run(["node", ...])` は PATH に無いと `FileNotFoundError` を送出し、`main()` まで抜けて件数も理由も出ん。ブラウザの不在（SKIP）とは別物で、走らせる道具が無いのは検査の失敗。
   - 直し: 捕まえて数える形で返す。`subprocess.run` を差し替えてこの枝を実際に踏ませ、`❌ 実ブラウザ検査を起動できんかった: [Errno 2] No such file or directory: 'node'` を確認した。
4. `pdf-book-gate.yml:173` **Playwright / Node の更新でブラウザ検査が走らん**（Minor・採用）
   - 根拠: `browser_qa` の対象が撮影スクリプト4本とこの workflow だけ。`package.json` の Playwright を上げても `browser_qa=0` かつ `scope=none` で、収束待ちが壊れても気づけん。**十三巡目の「CI で一度も走らん」と同じ穴の別の入口。**
   - 直し: `package(-lock)?\.json` と `\.node-version` を足した。6通りの `changed.z` で実測（`package.json`・`package-lock.json`・`.node-version`・`shoot-page.mjs` は 1、`doc/foo.md`・`src/package.json` は 0）。ルート直下だけを拾うことも確かめとる。
5. `coderabbit-verdicts.md` 見出し直後の空行が無い（Minor・採用）→ 指摘は225/234/244/256行やったが、実測すると **同じ違反がファイル全体で40件**あった。指摘された4箇所だけ直すと残りが残る。コードフェンス内を避けて全部に空行を入れ、`markdownlint-cli2` の MD022 が **40 → 0**。
6. `diagrams-added.md:9` 集計コマンドが再現でけへん（Minor・採用）→ 単引用符内のバックスラッシュでフェンスに当たらず、`eval` すら `unexpected EOF` で落ちとった。`grep -c` を複数ファイルへ当てると合計にならんことも併記。差し替え後のコマンドを実行して corpus 71・day01〜29 が 69 を再現した。**数字自体は正しかったので本文の値は動かしてへん。**
7. `progress.md:5` 採用と不採用の区別が無い（Minor・採用）→「全部採用して直しとる」が306行の「取らんと決めたもの（返信済み）」と食い違う。「成立した指摘は全部採用」に直し、不採用分の置き場も書いた。
8. `diagrams-added.md:142` 解消済みの問題が残存問題に残っとる（Minor・採用）→ 136行が「未参照の画像なし・ALL CHECKS PASS」と書いた直後の §5 に、同じ8枚が残課題として並んどった。落とした。

## [PR #389 十六巡目] Codex 2件（全部採用）

1. `build_day_snapshots.py:1404` **説明の付かん赤が DB の赤に紛れて SKIP へ落ちる**（P1・採用／ただし直し方は指摘と逆向き）

   - 根拠: 本物の失敗の印は `REAL_BUILD_FAILURE_MARKERS` という allowlist なので、**載せてへん文言は必ず出る**。Codex の挙げた `Error: Unauthorized while prerendering /admin` が `P1001` と同じ出力に混ざると、`error_line_pool()` は両方残すのに `has_real_build_failure()` が拾えず、DB マーカーが在るだけで `build_failure_is_database_only()` が真になる。`--verify` は壊れた日を持ったまま exit 0。十四巡目・十五巡目と同じ「allowlist の穴」の、いちばん深いところ。
   - **指摘の直し方はそのまま採れん。** Codex は「未分類の行は失敗として扱え」と言うが、`next build` は根本原因を包み紙（`Failed to collect page data` 等）で包んで出すので、それをやると包み紙自体が失敗扱いになり、**DB の無い機械では毎回赤くなって SKIP が死ぬ**。docstring がその経緯（3回直して3回破れた）を残しとる。
   - 直し: 包み紙の一覧 `BUILD_NOISE_MARKERS` を新設し、判定を「**SKIP を名乗るには、出とる全部のエラー行が DB マーカーか包み紙で説明できること**」へ倒した。allowlist で「本物か」を当てにいくのをやめて、無罪の側に立証責任を置く形。既存25本はそのまま通る（＝DB だけの回を止めてへん）。
   - 回帰テスト `check_unclassified_error_blocks_skip` は2方向を見る。(a) 包み紙＋DB＋説明の付かん行 → SKIP にせん (b) 包み紙＋DB だけ → これまでどおり SKIP。戻すと `❌ 説明の付かんエラーを DB だけの失敗として SKIP に落としている` で落ちる（26 → 25/26）。

2. `shoot-page.mjs:408` **窓を付け替えたあとの収束を待ってへん**（P2・採用）

   - 根拠: `settleAnimations()` は 408行、`fitToContent()` が窓を付け替えるのは 412行。付け替えは `ResponsiveContainer` と Recharts に描き直しをさせるので、**408行で待った収束はその時点で無効**。`fitToContent()` が持っとるのは `waitForTimeout(300)` の決め打ちだけで、これはこの PR が他所で潰した型がそのまま残っとった箇所。全ページ撮影（day21 の統計カード等）で描き直しの途中が写る。
   - 直し: `fitToContent()` の中、窓を付け替えた直後の 300ms のあとに `settleAnimations()` を呼ぶ。呼び出し側やのうて付け替えた場所で待つので、`fitToContent()` を使う経路は全部直る。
   - 検証: `shoot-page.mjs` の読み込みが通ること（`settleAnimations` / `settleDrawnFrames` の export を確認）と、実ブラウザ検査 4/4 合格。

## [PR #389 十七巡目] Codex 2件（全部採用）

1. `test_shoot_screenshots.py:438` **exit 0 だけで実ブラウザ検査を合格にしとった**（P2・採用）

   - 根拠: `check_drawn_frame_settle()` は `returncode == 0` かつ SKIP でなければ `[]` を返しとった。出力の中身を一切見てへんので、`settle-drawn-frames-check.mjs` が**空回りする実装へ縮んで exit 0 で終わっても黙って緑になる**。この PR が潰しとる「検査が緑やけど何も見てへん」型が、実ブラウザ検査そのものに残っとった。
   - 直し: 合格の合図 `settle_drawn_frames 実ブラウザ検査 N/N 合格` を正規表現で要求し、合格数と総数が一致することを見る。**件数は決め打ちにせん**（主張を足したときにここが嘘になるため）。総数0も落とす。
   - 検証: `subprocess.run` を「exit 0・無出力」に差し替えて経路を通し、`['❌ 実ブラウザ検査の合格の合図が出ていない: 出力なし']` が返ることを確認。実物の走行では 11/11 合格のまま。

2. `pdf-book-gate.yml:220` **撮影だけ触った PR で apt のロック上限が設定されん**（P2・採用／**十三巡目でワイが作った穴**）

   - 根拠: `DPkg::Lock::Timeout` を書いとるのは poppler の step だけで、あれは `scope != 'none'` 限定。十三巡目に足した `browser_qa` で Chromium の step は `scope=none` でも走るようになったのに、**その経路ではロック上限が未設定のまま `playwright install --with-deps` が apt を叩く**。同じ workflow のコメントが「--with-deps が15分ハングした」実績を記録しとるので、step の持ち時間15分を丸ごと食う。配線を広げたときに前提を一緒に運ばんかった。
   - 直し: ロック設定を独立した step へ出し、`scope != 'none' || browser_qa == '1'` で起動するようにした。apt を叩く step（poppler / Chromium）の**両方より前**に置いてある。poppler 側からは重複を消した。
   - 検証: `yaml.safe_load` で構文 OK。step の並びが `依存をインストール → apt のロック待ち上限を設定(198) → poppler を用意(208) → Chromium をキャッシュから復元(217)` になっとることを確認。

## [PR #389 十八巡目] Codex 3件（全部採用）

1. `build_day_snapshots.py:1448` **免除の判定でも未分類の行を捨てとった**（P1・採用）

   - 根拠: `build_failure_is_expected()` は `REAL_BUILD_FAILURE_MARKERS` に載っとる行だけを残してから判定しとった。day11 が断り書きどおりの `getById` 型エラーと一緒に `Error: Unauthorized while prerendering /admin` を吐くと、後者が絞り込みで**黙って消えて**型エラーだけが残り、免除されて `broken_days()` を素通りする。**十六巡目に SKIP 側で潰した「絞ってから判定する」型が、免除の側に残っとった。**
   - 直し: 絞り込みを反転して、包み紙（`BUILD_NOISE_MARKERS`）以外の行を**全部**残し、その全部が型エラーであることを要求する。この変更で既存 fixture が落ちたので原因を追うと、`Failed to compile.`（型エラーの直前に必ず出る Next.js の見出し行）が包み紙の一覧から漏れとった。実測に基づいて追加した。
   - 回帰テスト `check_expected_red_rejects_unknown_error`。戻すと `❌ 説明の付かん失敗が混ざった day11 を免除している`（28 → 27/28）。

2. `build_day_snapshots.py:1347` **`ECONNREFUSED` 単独を DB の不在と見なしとった**（P1・採用）

   - 根拠: OS が返す汎用の接続拒否なので Redis 等でも出る。`Error: connect ECONNREFUSED 127.0.0.1:6379` の1行だけの出力が、DB マーカーの条件も全行説明の条件も満たして SKIP へ落ち、`--verify` が exit 0 になる。
   - 直し: マーカーを2段に分けた。単独で言い切れる `DB_LESS_PRIMARY_MARKERS`（`Can't reach database server` / `P1001` / `the database server at`）と、裏付けとしてしか数えん `DB_LESS_CORROBORATING_MARKERS`（`ECONNREFUSED`）。`db_less_markers()` が、primary が同じ出力に居るときだけ後者を有効にする。判定用のプールは取りこぼさんことが目的なので両方を見る。
   - 回帰テスト `check_econnrefused_alone_is_not_database` が2方向（Redis 単独は止める／Prisma の印つきは SKIP のまま）。戻すと `❌ DB と関係のない ECONNREFUSED を DB だけの失敗にしている`（28 → 27/28）。

3. `shoot-page.mjs:357` **アニメが動き出す前に「止まった」と判定しとった**（P2・採用）

   - 根拠: 収束の基準が「3フレーム連続で同じ形」やった。Recharts の `<Pie>` は既定で暫く待ってから動き出す（`src/app/report/` に animation の指定は無いので既定が効く）。その待ちの間は形が動かんので、**3フレーム＝60fps で約50ms の窓は待ちの中で満たされ、動き出す前の絵を撮る**。フレーム数という基準自体も機械の速さでブレる（20fps なら150ms）。
   - 直し: 時間の窓へ変えた（`DRAWN_FRAME_STABLE_MS = 600`、開始の遅延より長い）。上限も 2000 → 5000ms へ上げた（遅延＋描画が終わってから窓を満たすまで入るように）。
   - **検査の作りの欠陥も一緒に見つかった。** 新しい fixture が通らんので追うと、`settleAnimations` とは無関係に **Playwright/Chromium は同じページへ `setContent` を重ねると2枚目以降の有限 rAF アニメーションを走らせん**（新しいページなら走る、を実測で確認）。つまり既存の検査は「2つ目の有限アニメ」を一度も踏んでへんかった。fixture ごとに新しいページを開く `withPage()` を入れて、各主張を独立させた。
   - 実ブラウザ検査は 4本 → **5本**。3フレーム基準へ戻すと `❌ 遅れて動き出す描画を、動き出す前に撮っている` で落ちる（5/5 → 4/5）。

## [PR #389 十九巡目] CodeRabbit 4件（採用3・対応済み1）

1. `build_day_snapshots.py:1317` **件数と場所が合えば、断り書きに無い型エラーまで免除しとった**（Major・採用）

   - 根拠: `tsc_failure_is_expected()` は件数（5）・識別子（`any` で1行）・場所（`all`）しか見てへん。識別子は波及行に載らんので `any` でしか見られんが、そこを突くと **`getById` 1件＋同じファイルの無関係な `TS2322` 4件**でも条件が揃う。`broken_days()` が本物の欠陥を免除する。
   - 直し: 断り書きの範囲を**エラーコードまで**名指しした。`day-snapshots-result.md` の実測で day11 に出たのは `TS2339` / `TS7006` / `TS7053` の3種だけなので、それを `EXPECTED_RED_SIGNATURE[11]["codes"]` に置き、全行がそのどれかであることを要求する。
   - 回帰テスト `check_expected_red_rejects_unknown_code` が2方向（断り書きどおりの5行は免除／`TS2322` 4件が混ざったら免除せん）。戻すと `❌ 断り書きに無いコードが混ざった day11 を免除している`（29 → 28/29）。
   - なお同じ指摘の後半（`build_failure_is_expected()` が未分類を除外する）は**十八巡目で対応済み**。

2. `shoot-page.mjs:332` **収束判定が `cx` / `cy` を見てへんかった**（Minor・採用）

   - 根拠: 円は座標だけで動く。`d` / `points` / `transform` / `r` しか見てへんので、移動しとる最中でも「形が変わってへん」と読んで途中の絵を撮る。
   - 直し: `cx` / `cy` に加えて、線の端点 `x1` `y1` `x2` `y2` も見るようにした（同じ理由で座標だけが動く）。
   - **足した検査が最初は飾りやった。** 移動の fixture を書いて `cx`/`cy` を外しても緑のままやったので調べると、動きが 300ms で収束の窓（600ms）より短く、**見てへん判定でも動きが終わってから返る**ためやった。動きを 1500ms へ延ばして、外すと `❌ 座標だけで動く描画を途中で撮っている（cx=72 / 期待 150）` で落ちることを確認。実ブラウザ検査は 5本 → **6本**。

3. `coderabbit-verdicts.md:74` **コードスパン内の空白（MD038）**（Minor・採用）

   - 直し: 引用の先頭にインデント空白が入っとった3行を、空白を落とす形へ直した。残った3件は別原因で、**単一バッククォートのスパンの中でバッククォートを `\` でエスケープしとった**のが元やった（Markdown では効かんので対が崩れ、後続の対がズレて誤検知になる）。Prisma の引用符を落として素直な形にした。実測 **13 → 0**。

4. `test_build_day_snapshots.py:1325` **PR 説明に検証の根拠を書く**（Minor・採用）→ PR 本文の「検証」節を、コマンド・終了コード・実行時刻・CI の run 参照つきへ書き換えた。

## [PR #389 二十巡目] Codex 1件（採用・ただし害の中身は指摘と違う）

`pdf-book-gate.yml:176` **撮影まわりの改名・新規追加で実ブラウザ検査が走らんくなる**（P2・採用）

- 指摘は「削除されたパスが `--diff-filter=d`（小文字＝削除を除外）で一覧から落ちるので、material-gate が browserless な SKIP を通す」やった。**前半は正しいが、後半は成立せん。**
  検査ファイルを消した場合は `test_shoot_screenshots.py:407` が `❌ 実ブラウザ検査（settle-drawn-frames-check.mjs）が見当たらない` を返し、`check_quality.sh:255` が material-gate でそれを呼ぶので、**削除は SKIP やのうて失敗として止まる**。ワーカーを消した場合も、検査の取り込みが落ちて exit 1 になる（十三巡目で SKIP の対象から外してある）。
- **本当の穴は改名と新規追加。** `browser_qa` の判定が**完全一致の allowlist** やったので、ワーカーと検査を両方新しい名前へ改名すると、検査自体は動くのに `browser_qa=0` になり、**Chromium 付きの走行が一度も無いまま material-gate の SKIP で緑**になる。別名の検査を新しく足した場合も同じ。十三巡目に足した配線が、名前に依存しとった。
- 直し: 2点。(a) `browser_qa` の判定専用に**削除を落とさん一覧** `changed-with-deletes.z` を作る（`--diff-filter=d` 無し）。(b) 判定を完全一致から `scripts/curriculum-qa/` のディレクトリ前置へ広げる。名前に依存せんくなるので、改名も新規追加も拾う。
- 検証: パターンを9通りの入力で実測（既存の検査／改名後の名前／同ディレクトリの別ファイル／`package.json`／`.node-version`／この workflow → 1、ディレクトリ名だけ／無関係／別ディレクトリ → 0）。削除を含むかは擬似的な削除を stage して実演し、**旧一覧 0件・新一覧 1件**を確認した。`yaml.safe_load` で構文 OK。
