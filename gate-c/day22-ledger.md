# Gate C 目視検査台帳 — day22_グラフを表示.pdf

- 対象PDF: `artifacts/pdf/day22_グラフを表示.pdf` @ commit `5881e2f71267aebd996abb0ceba8174e03707365` (devin/source40-pdf-artifacts tip、macOS mermaid font-measure fix 後のrebuild版)
- sha256 (head12): `ba192afa3b08` — pdf-manifest.json 照合済み・一致
- 総ページ数: 56 / 目視済み: 56 (全頁)
- 検査者: devin-1056d8bed64646d99f2593ef6316dd72 (Gate C worker)
- 検査日: 2026-10-10
- 方法: `pdftoppm -png -r 100` で20頁チャンクずつレンダリングし、全頁を1頁ずつ目視確認

## 集計

| verdict | 件数 |
|---|---|
| must | 0 |
| suggest | 1 |
| ok | 55 |

## must（表示が壊れている・使えない頁）

なし

## suggest（改善余地のある頁）

| 頁 | 内容 |
|---|---|
| 55 | 「次に読むもの」の脚注1-6が裸のGoogle Drive URLとして印字（day19-21と同型の組版共通問題）。同一頁に奥付（タイトル/著者）が開始 |

## ok 判定の内訳（代表的な観点）

- コードブロック: Recharts import 6部品、statusData/priorityData map（`isTaskStatus`/`isTaskPriority` 型ガード + `CHART_FALLBACK_COLOR` 分岐）、PieChart JSX（`dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label`）、Cell map 色付け、プロジェクト統計テーブル、app-layout / root.ts 差分まで全て文字化け・切れなし。
- Mermaid 図: 図2「データフロー」(p6)、図3「3本線図（データ→配列→描画）」(p22) とも全ノード・ラベル完全レンダリング。`dataKey`→`key` 混同の警告図も正しい。
- 図版: 図1 レポート頁スクショ（円グラフ2枚視認可 p4）、図4 完成後スクショ（円グラフ2枚+凡例 p28）、図5 完成後横並び (p31)、すべて鮮明。
- 表組み: サーバー集計データ形表、Recharts 3層表、コンポーネント表、ステータス色表、ネスト構造表、ブレークポイント表、つまずき表5行 (p52)、用語表6行、完成ファイル表すべて罫線・セル正常。
- ヘッダ/頁番号: 全頁「Day 22: グラフを表示しよう」+ 頁番号正しい。
- 教材構造: はじめに→設計→Step1-9→Pro(手集計アンチパターン→サーバー集計の受け取り)→完成コード→まとめ/つまずき/用語/Q1-Q3→追加課題(outerRadius 80→60)→次回予告→次に読むもの→奥付、欠落なし。
- p53 Q3 回答（型ガードは実行時の代替色分岐のためで `as` では代替不可）など本文論理に矛盾なし。

## 代表的な目視内容（実際に読んだ頁の記録）

- p21: `<Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>` の JSX と `statusData.map` の `<Cell>` 色付けが完全に印字。
- p22: 図3 Mermaid で「サーバー集計 → {key,value} 配列 → Pie の data」3本線の流れ図が全ノード描画済み。「dataKey は扇の大きさ、key は色・ラベル引き」の注意図も正しい。
- p28: 図4 の完成後スクショ — 「ステータス別タスク」「優先度別タスク」2枚の円グラフと凡例が視認できる。
- p44: 「h-[300px] を持つ div が ResponsiveContainer の height="100%" の基準…この div を外すと扇が1枚も描かれません」説明が正しく組版。
- p52: つまずき表「グラフが表示されない → 親に高さがない → h-[300px] を親に設定」等5行が罫線整列して表示。
