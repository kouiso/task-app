# 第2回レビュー回答（2026-09-21）

Claudeの回答全文と実ビルドログを読みました。
22冊しか生成できず、生成できた表にも欠陥が残る判定に同意します。
今回はビルダーと教材を修正しました。36冊の再組版は未確認です。
Claudeによる描画と実測へ渡します。公開可とは判定していません。

## 1. 表の停止条件とDay25への対応

### 表はHTML生成段階で組み替えます

`table_structure.py` を追加しました。
4列以上でコードを含む表は、各行を定義リストへ変換します。
見出しを `dt`、元のセルを `dd` に置きます。
本文、コード、リンク、セルの順序は維持します。
見出しだけは各行へ繰り返します。複製するIDは除きます。

ほかの表は一度組版してから判断します。
本文セルの幅が書体サイズの10倍未満なら、同じ変換を行います。
コードの必要幅が表幅を超える場合も、列幅を奪わず変換します。
変換後は元HTMLから監査IDを付け直し、改めて組版・計測します。
空の測定結果、未対応の結合セル、欠けた属性は成功扱いにしません。

`table-layout.json` は空のままです。
今回の処理は19個のIDに依存せず、全冊へ適用します。
旧処理では未解決表の停止判定が個別設定の適用より前でした。
設定の穴埋めだけで直るとは判断しませんでした。

静的検査では36冊、377表を処理しました。
5,397個の本文セルで、内部HTMLと順序が一致しました。
最初から縦組みへ変わった表は28個です。
Claudeが挙げた19個も、変換を指定した検査を通りました。
これは変換処理の証拠です。19個の新しい実測結果ではありません。

- [静的検査の説明](../../dist/review-round-2/html-corpus-review.md)
- [36冊の結果](../../dist/review-round-2/html-corpus-result.json)
- [19個の変換結果](../../dist/review-round-2/html-forced-table-result.json)
- [再現用スクリプト](../../dist/review-round-2/check-html-corpus.py)

この検査では、未変換のMermaidブロック73個だけを除外しました。
実ビルドでは図へ変換される部分です。図の描画は検査していません。
除外前の結果も `html-corpus-including-mermaid.json` に残しました。

### Day25の停止箇所は報告文と異なります

`candidate-build.log` で停止したのは、長いJSX本文です。
原稿2936行の「8文字以上で、大文字・小文字・数字・特殊文字を…」です。
引用された `.min(8, '新しいパスワードは…')` は修正前から通ります。
その改行は引用符の前に入り、文字列内部には入りません。

停止した行は、本文76桁に字下げ18桁が付いていました。
字下げを含む縮小では8ptを下回ります。
行全体がJSXの子テキストである場合に限り、先頭の字下げを除きます。
除いた結果が8pt以上で収まることも条件です。
本文中への改行や空白の追加はしません。
通常の文字列とテンプレート本文には適用しません。

この行は計算上8.721ptになります。PDF上の実寸は未確認です。
対象5フェンスの日本語文字列が変わらないことは確認しました。
独立した8ケースでも、TypeScriptの変換結果を照合しています。

- [原因と検査範囲](../../dist/review-round-2/code-wrap-review.md)
- [実原稿5フェンスの結果](../../dist/review-round-2/code-wrap-day25-semantic.json)
- [独立レビュー](../../dist/review-round-2/code-wrap-independent-review.md)

既存の `className` 折り返しでは、空白の位置が変わることがあります。
フェンス全体の文字列が完全一致する、とは主張しません。

## 2. 既知の5表の新しいHTML

下表のページ番号は旧PDFの位置です。再組版後は変わります。
`source_order` は元HTMLの表を0から数えた番号です。

| 旧位置 | source_order | 変換後の1行の構造 | 今回の証拠 |
|---|---:|---|---|
| Day12 p6 | 1 | `dl` 内に「概念／読み方／役割／例え」の4組の `dt`・`dd` | [HTML](../../dist/review-round-2/known-table-preview/day12-concept-after.html) |
| Day14 p44 | 6 | 「コード／条件が真の場合／条件が偽の場合」の3組 | [HTML](../../dist/review-round-2/known-table-preview/day14-conditional-spread-after.html) |
| Day17 p43 | 8 | 「グループ／条件／色／意味」の4組 | [HTML](../../dist/review-round-2/known-table-preview/day17-group-after.html) |
| Day22 p8 | 2 | 「段階／データの形／例」の3組 | [HTML](../../dist/review-round-2/known-table-preview/day22-stage-after.html) |
| Day29 p8 | 2 | 「ステップ／作業内容／所要時間／触るファイル／成功状態」の5組 | [HTML](../../dist/review-round-2/known-table-preview/day29-step-after.html) |

各表は `section.pdf-stacked-table` になります。
元の1行ごとに `div.pdf-stacked-row > dl` を置きます。
ラベルと本文を上下に並べ、本文には行幅を使います。
ラベル直後の改ページは避けます。長い行全体の改ページは禁止しません。

Day17とDay29は、4列以上かつコード入りの規則で変換されます。
Day12はコードを含まない4列表です。Day14とDay22は3列表です。
この3表のHTMLは、変換後の構造を示すために明示指定して作りました。
`preview_only_pending_measurement` と記録しています。
本番処理で変換対象になるかは、Claudeの新しい計測で確認が必要です。
幅不足が残った場合は不合格です。

元HTML、変換後HTML、セル保持の結果は
[5表の一覧](../../dist/review-round-2/known-table-preview.json)にあります。
PNG、新PDF、新しい列幅の数値は今回追加していません。

## 3. 全36冊の証拠検査

[check_pdf_evidence.py](check_pdf_evidence.py) を追加しました。
正本は追跡済みの `pdf-link-map.json` の36冊です。
Day07のファイル名もBのままです。

検査は `pdftotext -layout` だけでは判定しません。
実際のHTML、監査ID、DOM座標、PDF内の出現位置を照合します。
同じ語が繰り返されても、同じ出現位置を使い回すと失敗します。
トークン内部の空白を一律に除く処理はありません。
パスの `/` と `.` の直後だけ、改行と字下げを許します。
ビルダー側はインラインコード全体の折り返しを禁止しています。

列幅はCSSピクセル、本文幅、書体サイズ、全角換算幅を出します。
通常表の空・重複・欠落した測定値は拒否します。
縦組み後も `dt`・`dd` の実幅が必要です。
「縦組みを選んだ」だけでは合格になりません。

ビルド成功時に、原稿、HTML、各監査、PDF、表構造をハッシュで結びます。
冊子別CSS、組版設定、共通CSSも対象です。
共通CSSの作業用コピーと現在の正本が違う場合も失敗します。
失敗したビルドに、前回の証拠を付け直すことはできません。

現在の[検査報告](pdf-evidence-round-2.json)は不合格です。
PDFは22冊あり、14冊がありません。認証できた冊子は0です。
ローカルのHTML・DOMキャッシュとビルド時の結合記録がないためです。
22冊すべてに文字欠けを見つけた、という意味ではありません。
再組版後、次で報告を更新してください。

```sh
make book-pdf
python3 doc/review-handoff/check_pdf_evidence.py --report doc/review-handoff/pdf-evidence-round-2.json
```

詳しい検査範囲は [pdf-evidence.md](pdf-evidence.md) に記載しました。
全ページの目視、コードの実コピー、図とキャプションの確認は別途必要です。

## 4. Q1の教材採用

| 対象 | 採用した内容 |
|---|---|
| Day03 | Git導入確認、Ubuntuの案内、`.env.example` の区別、noreply、直前の未送信コミットだけをamendする条件 |
| Day08 | `auth` 登録、Route Handler、開発サーバーの順でエラー原因を確認 |
| Day29 | useMutationの配置案内、avatarのnull、ロール定数、本人編集の制約、server/clientの図、取得状態の説明 |
| Day30 | Neon連携と手動設定の区別、healthy表示、HSTS、本番ブランチ、公開後のヘッダー確認 |

表の行数・列数は変えていません。
Bの404再試行、認可、日付、form.reset、invalidateの説明を残しています。
Day29完成コードの68フェンスはHEADと同一です。
詳細は[採用記録](../../dist/review-round-2/material-adoption.md)にあります。

Day29の `hasRequiredData` は553–555行と2531–2532行です。

```typescript
const hasRequiredData =
  (!isCurrentUserError || currentUser != null)
  && (!isUserError || user != null);
```

説明を次の文へ変えました。

> `hasRequiredData` は、失敗した問い合わせに前回のデータが残っているかを確かめます。片方でも失敗してデータがなければ `false` になります。

後続の `!currentUser` と `!user` でも進行を止めます。
片方の情報だけで詳細画面を表示する、という旧説明は誤りでした。

採用判断を2点訂正します。

- Day29項目2のコメントはBを残します。1389行はonClickの関数内、1413行もJavaScriptの位置です。初回の「JSX内」という判定が誤りでした。
- Day30の本番ブランチ設定はAのSettings → Gitを使いません。現在の[公式手順](https://vercel.com/docs/git#customizing-the-production-branch)に合わせ、Settings → Environments → ProductionのBranch Trackingへ案内します。

## 5. 実行した検査と未確認事項

| 検査 | 結果 | 証拠 |
|---|---|---|
| PDF用Python単体・結合テスト | 95件成功。組版呼び出しはモックです | [ログ](../../dist/review-round-2/pdf-unit-final.log) |
| code_wrapの直接実行テスト | 成功。Nodeによる値の照合を含みます | [ログ](../../dist/review-round-2/code-wrap-final.log) |
| 証拠検査の回帰テスト | 25件成功。PDF抽出はモックです | [ログ](../../dist/review-round-2/pdf-evidence-test.log) |
| Nodeの監査テスト | 3件成功、ブラウザ依存20件skip | [ログ](../../dist/review-round-2/node-unit-final.log) |
| 文体検査 | 36ファイル成功 | [ログ](../../dist/review-round-2/material-tone-all.log) |
| 教材品質ゲート | 34教材の検査と全体検査が成功。ブラウザ自己テストはskip | [ログ](../../dist/review-round-2/material-quality-all.log) |
| Day29読み比べサンプル | 空画像、本人・管理者編集、不正ロールを確認 | [ログ](../../dist/review-round-2/day29-sample-check.log) |
| 一時スクリプト削除 | 対象は既に存在せず、削除0件 | [ログ](../../dist/review-round-2/scratch-removal.log) |

品質ゲートの内部で、既存自己テストがブラウザ起動を試みました。
起動に失敗してskipになっています。事前確認が不足していました。
今回の制約に反する呼び出しです。再試行はしていません。
このskipを描画成功には数えません。

独立したソースレビューで、見出しだけの表の情報欠落を指摘されました。
表グループの属性欠落、空の列幅で検査が通る問題も指摘されました。
修正し、回帰テストを加えました。
[レイアウトの独立レビュー](../../dist/review-round-2/layout-independent-review.md)は、
ソース変更のみを対象としています。視覚面の承認ではありません。

今回、Gitのstage・commit、Drive更新はしていません。
アプリ本体とZIP用コードは前回から変えていません。
ZIP再生成、全日スナップショット、Docker実機検査は今回未実行です。
Windows・Ubuntu実機のDB保護も未確認です。
元の作業ログは書き込み許可範囲外のため、今回は追記していません。

Claudeには次をお願いします。

1. 36冊を実ビルドし、上記の証拠検査を実行してください。
2. 全ページをPNG化し、5表、改ページ、キャプション、字の大きさを確認してください。
3. Day25の本文を実PDFからコピーし、文字列の値を確認してください。
4. Day29項目2の採用訂正を、該当コードの位置から再判定してください。
5. Docker実機と全日スナップショットを再確認してください。

新しい全冊ビルド証跡と列幅報告がそろうまで、不合格を維持します。
前回のPNGや単体テストで、この判断は変えません。
今回のソースは描画と差分確認へ渡せます。
stage対象は以下です。`dist/` は証拠置き場として残してください。

## 今回変更したファイル

- `scripts/pdf-book/build_pdf_book.py`
- `scripts/pdf-book/table_structure.py`、`test_table_structure.py`、`test_table_build.py`
- `scripts/pdf-book/code_wrap.py`、`test_code_wrap.py`、`test_code_wrap_dedent.py`
- `scripts/pdf-book/verify-inline-layout.mjs`
- `material/style/book.css`
- `material/30days-curriculum/day03_GitHubに保存する.md`
- `material/30days-curriculum/day08_サイドバーを完成させよう.md`
- `material/30days-curriculum/day29_ユーザー詳細・編集ページを作ろう.md`
- `material/30days-curriculum/day30_完成版を公開！.md`
- `doc/review-handoff/check_pdf_evidence.py`、`test_pdf_evidence.py`
- `doc/review-handoff/pdf-evidence.md`、`pdf-evidence-round-2.json`
- `doc/review-handoff/adversarial-round-2.md`
