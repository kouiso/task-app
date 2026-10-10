# Gate C 目視検査台帳 — day20_タスク検索機能.pdf

- 対象PDF: `artifacts/pdf/day20_タスク検索機能.pdf` @ commit `5881e2f71267aebd996abb0ceba8174e03707365` (devin/source40-pdf-artifacts tip、macOS mermaid font-measure fix 後のrebuild版)
- sha256 (head12): `71a67be90fa2` — pdf-manifest.json 照合済み・一致
- 総ページ数: 274 / 目視済み: 274 (全頁)
- 検査者: devin-1056d8bed64646d99f2593ef6316dd72 (Gate C worker)
- 検査日: 2026-10-10
- 方法: `pdftoppm -png -r 100` で20頁チャンクずつレンダリングし、全頁を1頁ずつ目視確認

## 集計

| verdict | 件数 |
|---|---|
| must | 0 |
| suggest | 2 |
| ok | 272 |

## must（表示が壊れている・使えない頁）

なし

## suggest（改善余地のある頁）

| 頁 | 内容 |
|---|---|
| 273 | 「次に読むもの」の脚注1-5が裸のGoogle Drive URL（`https://drive.google.com/file/d/…?usp=drivesdk`）として印字。リンクテキストがURLそのままで可読性が低い（day19と同型の組版共通問題） |
| 274 | 脚注6のDrive URLが奥付頁の下部に回り込んで印字されている（巻末脚注の組版溢れ。day19と同型） |

## ok 判定の内訳（代表的な観点）

- コードブロック: Step 1〜8.5 の分割貼り付け手順と完成形参考コード（search.ts / search/page.tsx / task/page.tsx / loading.tsx / task-filter-query.ts / app-layout.tsx）まで全て文字化け・切れなし。`'`/`"`/バッククォート/`\u0000` エスケープ等も正しく印字されている。
- Mermaid 図: 図5「URL同期と検索API呼び出し」(p82)、図7「AND と OR の組み合わせ」(p151) ともノード・ラベル・辺が完全にレンダリング。macOS font-measure fix 後のrebuild品質を確認。
- 表組み: つまずきポイント表 (p270)、用語表 (p271)、操作確認表 (p139)、ファイル表 (p143-144)、例外表等すべて罫線・セル・文字揃え正常。
- 図版: 図6 検索ページのスクリーンショット (p140) 鮮明・赤枠注記①付き。
- ヘッダ/頁番号: 全頁「Day 20: タスク検索機能を実装しよう」+ 頁番号が正しい（day19/21 等への誤植なし）。
- 教材構造: はじめに → 検索APIの設計 → Step1-8.5 → Step9-10 → Pro パターン解説 → 完成コード全体 → まとめ/つまずき/用語/理解チェック Q1-Q3 → 追加課題 → 次回予告 → 次に読むもの → 奥付、と欠落なく連続。
- 疎ページ（Step見出しのみの短い頁など）は自然なセクション切れ目であり、異常な空白頁ではないと判断。

## 代表的な目視内容（実際に読んだ頁の記録）

- p83: `const shouldSearch = !!formValues.keyword || …` の OR 連結ロジックと「条件が1つもなければAPIを呼びません」の確認ポイントが正しく印字。
- p151: Mermaid 図7 で「権限条件 AND （キーワード OR ステータス OR …）」の組み合わせ図が全ノード描画済み。直後の注意書き「権限条件と検索条件を OR で結ばない」も読み取れる。
- p236-237: `task-filter-query.ts` の `parseTaskFiltersFromSearchParams` / `buildTaskFiltersQueryString` 完成版コードがcuidSchema バリデーション含め全文印字。
- p270: つまずき表「毎回APIが呼ばれる → enabled条件が不適切 → shouldSearchでガード」等7行が罫線整列して表示。
- p271: 理解チェック Q1「`enabled: shouldSearch` は何を止めていますか」に対し回答「検索条件が1つも入っていないあいだ、検索の問い合わせを送らせません」が正しく組版されている。
