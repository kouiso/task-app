# Gate C 目視台帳(tip再検証) — day24_ユーザー一覧（管理者用）.pdf (86頁)

- 検査者: devin-c044457da7ac4654b82c1970be1f1002
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/day24_ユーザー一覧（管理者用）.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365` (tip再ビルド・mermaid font-measure fix後)
- SHA256照合: `e926f830b351`(先頭12桁 = manifest値・実測一致。pdf-manifestの頁数86も一致)
- 方法: poppler(pdftoppm)で全86頁を100dpi PNG化(30頁×2+26頁の3チャンク)→3×3コンタクトシートで全頁目視＋疑義頁は単頁再確認。pdftotext機検で裸URL・置換文字を補助洗い出し
- 結果: **must 0件 / suggest 2件 / ok 84件**(全86/86頁検査済)
- 明細JSON: `gate-c/tip-day24-pages.json`

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p85, p86
- **ok**: 上記以外の全頁

## must(納品不可級)

なし

## suggest(納品可だが修正推奨)

| 頁 | 内容 |
|---|---|
| 85 | 「次に読むもの」の脚注1-2が裸のGoogle Drive URL(`https://drive.google.com/file/d/…?usp=drivesdk`)として印字 — day19-21と同型の組版共通問題 |
| 86 | 脚注3-6も裸のGoogle Drive URL。奥付表(タイトル/著者/第1版(2026年9月19日)/© 2026 磯貝光祐)と「全体の地図」箇条書きは正常 |

## ok 判定の内訳(代表的な観点)

- Mermaid 図: 図2「ユーザー管理ページのフロー」(p5: 管理者?→はい/いいえ→api.user.getAll/権限エラー表示→ユーザーあり?→一覧テーブル/空状態→詳細・編集ボタン→/user/ユーザー-ID・/edit)、図3「権限3枚重ね」(p52-53: サイドバー非表示→URL直打ち→画面側if !isAdmin→JS書換え→サーバーadminProcedure→「管理者権限が必要です 他人のメールアドレスは1件も返さない」)とも全ノード・ラベル・辺が完読可能。font-measure fix後のクリップ残存なし。
- コードブロック: user.ts(adminProcedure+zod input+findMany)、root.ts登録、page.tsx(2クエリ並走・hasFetchError/authFailed/forbidden分岐・temporary-checkpoint)、app-layout.tsx(menuItems)まで全て文字化け・右端切れ・不自然折返しなし。
- 図版: 図1 完成イメージ(p3)、図4 部分拡大・赤枠注記(p55)、図5 一般ユーザー画面(p57)すべて鮮明。
- 表組み: 概念表×3、やること表、ステップ一覧、権限判定ロジック表(p30)、バッジ仕様表(p41)、URL構造表(p57)、つまずき表(p82-83)、用語表(p83)、ファイル対応表(p58)すべて罫線・セル正常。
- ヘッダ/頁番号: 全頁「Day 24: ユーザー一覧(管理者用)を作ろう」+ 頁番号正しい。表紙は書名・対象スタック(Next.js 15 / TypeScript / Prisma / tRPC)表示。
- 教材構造: 振り返り→ゴール→前提→フロー→概念→ステップ一覧→Step0-9→Proパターン→完成コード→まとめ/つまずき/用語/Q1-Q3→追加課題→次回予告→次に読むもの→奥付、欠落なし。半白頁・空白頁なし。
- 本文論理: 「画面側の権限チェックは見た目だけ・守るのはサーバーのadminProcedure」「500は一時エラーとして前回一覧+警告表示」等、Q1-Q3の回答とStep内容が整合。

## 代表的な目視内容(実際に読んだ頁の記録)

- p10: `adminProcedure` で「認証処理がDBから最新の `role` と `isActive` を取得し、有効なユーザーか確かめます。その `role` で `ADMIN` 判定まで済ませるため、`getAll` の中で管理者かどうかを調べ直す必要がありません」が完読。
- p24: `refetchRequiredData` 実装と「`void` は Promise(非同期処理の結果)をこの場では待たないと明示する書き方です」説明、`BEGIN/END temporary-checkpoint` マーカーが正しく印字。
- p56: 動作確認チェックリスト14項目(ログイン→サイドバーリンク→/user→ロールバッジ色分け→登録日yyyy/MM/dd→404→一般ユーザーでアクセス権限ありません)すべて判読可能。
- p83: 用語表 `?.` (オプショナルチェーン)「プロパティがnull/undefinedでもエラーになりません」、キャッシュ「前回取得したデータをブラウザ内に一時保存したもの」が正しく組版。
- p84: Q3回答「`protectedProcedure` にするとログインさえしていれば誰でも全員のメールアドレスを受け取れます。他人の情報を守っているのは `adminProcedure` の1語だけ」が完全に表示。
