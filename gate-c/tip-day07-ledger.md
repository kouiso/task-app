# Gate C 目視台帳(tip再検証) — day07_ログイン体験を改善しよう.pdf (146頁)

- 検査者: devin-87c010e81da1437aa9ceebcd1cb441df
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day07_ログイン体験を改善しよう.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365` (tip再ビルド)
- SHA256照合: `9b97f379589b`(先頭12桁 = manifest値・実測一致。頁数146も一致)
- 方法: poppler(pdftoppm)で全146頁を100dpi PNG化し1頁ずつ目視(25頁×5+21頁の6チャンク)。脚注所在はpdftotextで全頁洗い出し確認。
- 結果: **must 0件 / suggest 10件 / ok 136件**(全146/146頁検査済)
- 明細JSON: `gate-c/tip-day07-pages.json`

## 旧build(e39a1ce9) must の再検証結果

- **旧 must p52 図3(エラーハンドラとログイン処理の分岐図): 解消**。「メール・パスワード受信」「試行回数は上限内？」「TOO MANY REQUESTS」「ユーザーとパスワードは正しい？」「UNAUTHORIZED エラー」「アカウント有効？」「FORBIDDEN エラー」「成功記録を確定」「JWT 生成 + Cookie 保存」全ラベル完読可能。
- **旧 must p75 図5(middleware/protectedProcedure分岐): 解消**。「ブラウザからのアクセス」「何を取りに来たか」「ページ /dashboard など」「API /api/trpc/...」「middleware Cookie を検証し、駄目ならログイン画面へ送る」「protectedProcedure Cookie を検証し、駄目なら UNAUTHORIZED を」「ページを表示する」「データを返す」全ラベル完読可能。
- **旧 must p80 図6(middleware判定フロー): 解消**。「リクエスト受信」「公開パス？」「tRPC API?」「Cookie あり？」「/login にリダイレクト」「JWT 有効？」「Cookie 削除 + /login」「そのまま通す」「Yes」「No」全ラベル完読可能。
- 参考: 図2(p6 認証フローシーケンス図)も全ラベル(ユーザー/ブラウザ/tRPC API/データベース、メール・パスワード入力、api.auth.login.mutate()、メールでユーザー検索、ユーザー情報、bcrypt でパスワード照合、JWT トークン生成(jose)、Cookie 保存 + レスポンス、トースト表示、ダッシュボードへ遷移)完読可能。

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p30, p34, p41, p79, p100, p113, p120, p141, p145, p146
- **ok(note付き)**: p5, p10, p14, p27, p44, p51, p60, p63, p86, p90, p126
- **ok**: 上記以外の全頁

## must(納品不可級)

なし。

## suggest(納品可だが修正推奨)

- **p30 / p34 / p41 / p79 / p100 / p113 / p120**: 節末直後に約70〜90%空白(改頁不可ブロック由来の大余白、day01 p23/day02 p30同型)。p41は約90%で最も目立つ。
- **p141**: インラインコード内にエスケープ残留。「The table `\` public.users\` does not exist...」と先頭バッククォートが「\`」として残り、初心者には違和記号に見える(つまずきポイント節のエラーメッセージ表示)。markdown側では `` `The table `public.users` ...` `` の入れ子バッククォート処理の限界と推定。
- **p145 / p146**: 脚注1〜6が全て裸Google Drive URLのみ・語途中改行(次に読むもの節+奥付脚注区画、他冊同型)。

## ok(note付き)

- p5/p10/p14/p27/p44/p51/p60/p63/p86/p90/p126: 下部50〜65%余白(改頁不可ブロック由来だが半ページ強以下)

## 健全性

- ノンブル2-146連続・全頁ヘッダー帯あり・真っ白頁なし・コードブロック末尾切れなし
- 図1(p3)・図4(p53)・図7(p83)のUIスクリーンショットはクリップなし
- auth.ts/middleware.ts完成版コードブロック(p108-137)は長行も左端継続折返しで判読可能
- 奥付(p146)紺帯装飾は意図的(他冊と同一)
