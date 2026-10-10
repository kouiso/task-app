# Gate C 目視検査台帳 — day21_統計カードを表示.pdf

- 対象PDF: `artifacts/pdf/day21_統計カードを表示.pdf` @ commit `5881e2f71267aebd996abb0ceba8174e03707365` (devin/source40-pdf-artifacts tip、macOS mermaid font-measure fix 後のrebuild版)
- sha256 (head12): `d2cf29f07b92` — pdf-manifest.json 照合済み・一致
- 総ページ数: 86 / 目視済み: 86 (全頁)
- 検査者: devin-1056d8bed64646d99f2593ef6316dd72 (Gate C worker)
- 検査日: 2026-10-10
- 方法: `pdftoppm -png -r 100` で20頁チャンクずつレンダリングし、全頁を1頁ずつ目視確認

## 集計

| verdict | 件数 |
|---|---|
| must | 0 |
| suggest | 1 |
| ok | 85 |

## must（表示が壊れている・使えない頁）

なし

## suggest（改善余地のある頁）

| 頁 | 内容 |
|---|---|
| 85 | 「次に読むもの」の脚注1-6が裸のGoogle Drive URL（`https://drive.google.com/file/d/…?usp=drivesdk`）として印字（day19/20と同型の組版共通問題）。脚注はこの頁内に収まり、奥付への回り込みはなし |

## ok 判定の内訳（代表的な観点）

- コードブロック: Step 0-9 の getOverview（Promise.all 12クエリ分割代入）、report/page.tsx 完成版、app-layout.tsx menuItems（レポート項目追加）、root.ts 登録まで全て文字化け・切れなし。
- Mermaid 図: 図2「データフロー」(p5)、図3「集計の土台 projectScope/activeTasksFilter」(p10) とも全ノード・ラベル・辺が完全レンダリング。
- 図版: 図1 レポート頁スクショ (p3)、図4 完成後 (p29)、図5 ローディング (p36)、図6 カード4枚 (p41)、図7 レスポンシブ2列 (p49) すべて鮮明・赤枠注記入り。
- 表組み: スコープ表、やること表、概念表、ステップ一覧、計算ロジック表、ブレークポイント表、つまずき表 (p82)、用語表 (p83)、完成ファイル表 (p52-53) すべて罫線・セル正常。
- ヘッダ/頁番号: 全頁「Day 21: 統計カードを表示しよう」+ 頁番号正しい。
- 教材構造: はじめに→設計→Step0-9→Pro分離パターン→完成コード4ファイル→まとめ/つまずき/用語/Q1-Q3→追加課題→次回予告→次に読むもの→奥付、欠落なし。
- 0件API戻り値「13項目すべて0/[]で埋めて返す」設計 (Q3 p84) など本文論理に矛盾なし。

## 代表的な目視内容（実際に読んだ頁の記録）

- p11: `Promise.all` に12個のクエリを分割代入する配列（`totalTasksQuery` 等）と「順番の対応を間違えると値が入れ替わる」注意書きが正しく印字。
- p29: 図4の完成後スクショ — 4枚の統計カード（タスク数/完了率/合計作業時間/平均作業時間）とプロジェクト統計テーブル＋赤枠①が視認できる。
- p65: `projectStats` 完成版 — `progress`（小数1桁丸め）と `totalTimeHours`（分→時間変換）がコードと説明文の両方で整合。
- p76: `key={stat.id}` 説明「React が行を見分けるための目印…並び順が変わっても行の中身が入れ替わりません」が正しく組版。
- p84: Q3 回答 — `null`/`{}` ではなく13項目を `0`/`[]` で埋めて返す理由（`projectStats` が `undefined` になると `.map()` で落ちる）が完全に表示。
