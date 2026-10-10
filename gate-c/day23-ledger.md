# Gate C 目視検査台帳 — day23_週次レポート.pdf

- 対象PDF: `artifacts/pdf/day23_週次レポート.pdf` @ commit `5881e2f71267aebd996abb0ceba8174e03707365` (devin/source40-pdf-artifacts tip、macOS mermaid font-measure fix 後のrebuild版)
- sha256 (head12): `910c49da9e4f` — pdf-manifest.json 照合済み・一致
- 総ページ数: 121 / 目視済み: 121 (全頁)
- 検査者: devin-1056d8bed64646d99f2593ef6316dd72 (Gate C worker)
- 検査日: 2026-10-10
- 方法: `pdftoppm -png -r 100` で20頁チャンクずつレンダリングし、全頁を1頁ずつ目視確認

## 集計

| verdict | 件数 |
|---|---|
| must | 0 |
| suggest | 1 |
| ok | 120 |

## must（表示が壊れている・使えない頁）

なし

## suggest（改善余地のある頁）

| 頁 | 内容 |
|---|---|
| 120 | 「次に読むもの」の脚注1-6が裸のGoogle Drive URLとして印字（day19-22と同型の組版共通問題）。同一頁に奥付（タイトル/著者/版）が開始 |

## ok 判定の内訳（代表的な観点）

- コードブロック: report.ts 完成版（import群、`projectScope`/`activeTasksFilter as const`、Promise.all 12要素分割受け、findMany/count/aggregate 問い合わせ、groupBy status/priority、Map 組み立て、`return statusData/priorityData/projectStats`、getWeeklyReport の zod + FORBIDDEN + rangeEnd UTC + where + Array.from バケット）と weekly/page.tsx 完成版（'use client' import、Select 4/8/12週間、LineChart/BarChart JSX、stackId 積み上げ4本）まで全て文字化け・切れなし。
- Mermaid 図: 図2「週次レポート全体フロー」(p5)、図5「weeklyData→chartData/priorityData 変換図」(p44) とも全ノード・ラベル完全レンダリング。
- 図版: 図1 レポート頁スクショ（円グラフ2枚+統計テーブル p4）、図3 プロジェクト統計スクショ（赤枠① p25）、図4 ローディングスクショ (p35)、図6 週次レポート3グラフ並び（赤枠 p52）、図7 週次レポート全体スクショ (p54) すべて鮮明。
- 表組み: 統計テーブル項目表5列、APIパラメータ/レスポンス表、weeklyData各要素表5行、ページJSX構造表5層、表示項目表、つまずき表 (p116-117)、用語表6行 (p117-118) すべて罫線・セル正常。
- ヘッダ/頁番号: 全頁「Day 23: 週次レポートを表示しよう」+ 頁番号正しい。
- 教材構造: はじめに→Step0-7(getWeeklyReport→統計テーブル→useQuery→週選択→サマリーカード→グラフ→動作確認)→Pro(N+1: Promise.all tasks.map findUnique→select projectネスト)→完成コード(3ファイル表)→まとめ/つまずき/用語/Q1-Q3→追加課題「2週間」→次回予告(Day24 管理者ユーザー一覧)→次に読むもの→奥付、欠落なし。
- p118 Q1 回答（where が落とす3条件: completedAt null / assigneeId 他人 / startDateより前）など本文論理に矛盾なし。Q3（週境界 開始以上・終了未満）の排他理由説明も正確。

## 代表的な目視内容（実際に読んだ頁の記録）

- p77: `rangeEnd` を「明日の0:00 UTC+1」とする集計期間コードと5行のコメント（直前週の境界で数え漏れが起きる問題の説明）が完全に印字。
- p118: Q2「rangeEnd を『今この瞬間』にすると週平均カードの数字はどう変わりますか」に対し「4週間なら直近28日間を集計します。3週間に縮むことはありません」と回答。
- p52: 図6 の週次レポートスクショ — 折れ線・棒・積み上げ棒の3グラフが赤枠付きで視認できる。
- p116: つまずき「週次データが空 → 初期データの完了タスクが2025年の日付で、担当者も別のユーザーのため」→「自分が担当のタスクを1件『完了』にしてから読み込み直してください」。
- p112: 末尾 `</div>` 閉じ忘れ警告「ここを閉じ忘れると次のプロジェクト統計テーブルがグリッドの2列目に入り、円グラフの隣に半分の幅で置かれます」が正しく組版。
