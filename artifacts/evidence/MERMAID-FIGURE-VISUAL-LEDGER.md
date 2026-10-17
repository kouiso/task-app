# Mermaid figure visual inspection ledger — 再生成36冊・全70図

対象: `devin/source40-pdf-artifacts` の新36PDF(3740頁, 5881e2f)。旧欠陥報告 Day01 p13図2 / Day01 p67図5 / Day02 p43図4 を含む全70図について、**図が存在する実ページを確定し、110dpi PNG へ描き出して1枚ずつ目視**した。

## 方法

1. 図→実ページ対応: ビルドHTMLの `<img src="{stem}.svg">` + `<figcaption>` のキャプション文字列をアンカーに pdftotext でページ確定。ただしキャプションと見出しが同文の場合や目次(TOC)がキャプションを含む場合に誤ページへアンカーするため、各SVGのラベル断片(日本語→無ければASCII)を PDF 本文と照合して「ラベルが最も多く存在するページ」を採用。

2. 判定基準は機械値だけに依らず、**全70枚を画像として開き、ノード/エッジの全ラベルが末尾まで表示されているか人間が目視確認**。ついでにページ右端へのはみ出しも確認(別途 pdftotext -bbox 全語xMax≤532.9pt の幾何検査も全冊実施済)。

3. 旧candidate PDF(e39a1ce)の同3頁は check_mermaid_labels.py --pdf が FAIL となる負例fixtureとして既報。

## 結果: 70/70 図 = 全ラベル末尾まで完整・クリップ/右端はみ出しゼロ [実機目視]

- 旧欠陥3件(Day01 p13図2「Docker/npm/task-app/DATABASE_URL/PostgreSQL」・Day01 p67図5「src/app/...」・Day02 p43図4「page.tsx を実行する」「'use client' のときだけ」)は全て末尾文字まで完整を確認。

- ページマップ訂正2件: day08-d42e7e-2 は p6→**p9**(図3 Step1 providers.tsx シーケンス図)、day16-80b2b4-2 は p13→**p42**(時間計算フロー図)。キャプションが見出し/目次と同文だったため。訂正後の実ページを目視確認済。

## 図→ページ対応表(全70件・PNG=artifacts/evidence/mermaid-figures/)

| stem | 冊 | 実ページ | 目視 |
|---|---|---|---|
| day01-bf910a-1 | day01 | p13 | OK 完整 |
| day01-bf910a-2 | day01 | p67 | OK 完整 |
| day02-af6ad2-1 | day02 | p43 | OK 完整 |
| day03-43d581-1 | day03 | p30 | OK 完整 |
| day04-0cf6a5-1 | day04 | p4 | OK 完整 |
| day04-0cf6a5-2 | day04 | p5 | OK 完整 |
| day04-0cf6a5-3 | day04 | p6 | OK 完整 |
| day04-0cf6a5-4 | day04 | p23 | OK 完整 |
| day05-bd9c42-1 | day05 | p6 | OK 完整 |
| day05-bd9c42-2 | day05 | p11 | OK 完整 |
| day05-bd9c42-3 | day05 | p39 | OK 完整 |
| day06-c425aa-1 | day06 | p6 | OK 完整 |
| day06-c425aa-2 | day06 | p38 | OK 完整 |
| day07-ec8746-1 | day07 | p6 | OK 完整 |
| day07-ec8746-2 | day07 | p52 | OK 完整 |
| day07-ec8746-3 | day07 | p75 | OK 完整 |
| day07-ec8746-4 | day07 | p80 | OK 完整 |
| day08-d42e7e-1 | day08 | p5 | OK 完整 |
| day08-d42e7e-2 | day08 | p9 | OK 完整 |
| day08-d42e7e-3 | day08 | p15 | OK 完整 |
| day08-d42e7e-4 | day08 | p26 | OK 完整 |
| day08-d42e7e-5 | day08 | p37 | OK 完整 |
| day09-d3dbb5-1 | day09 | p4 | OK 完整 |
| day09-d3dbb5-2 | day09 | p29 | OK 完整 |
| day10-5fa125-1 | day10 | p6 | OK 完整 |
| day11-58e2cb-1 | day11 | p6 | OK 完整 |
| day11-58e2cb-2 | day11 | p51 | OK 完整 |
| day12-b65f21-1 | day12 | p5 | OK 完整 |
| day12-b65f21-2 | day12 | p14 | OK 完整 |
| day12-b65f21-3 | day12 | p68 | OK 完整 |
| day13-a869aa-1 | day13 | p5 | OK 完整 |
| day13-a869aa-2 | day13 | p6 | OK 完整 |
| day13-a869aa-3 | day13 | p17 | OK 完整 |
| day14-82e9c8-1 | day14 | p6 | OK 完整 |
| day14-82e9c8-2 | day14 | p15 | OK 完整 |
| day15-1b9352-1 | day15 | p6 | OK 完整 |
| day16-80b2b4-1 | day16 | p5 | OK 完整 |
| day16-80b2b4-2 | day16 | p42 | OK 完整 |
| day17-00a436-1 | day17 | p5 | OK 完整 |
| day17-00a436-2 | day17 | p46 | OK 完整 |
| day18-5a6a02-1 | day18 | p6 | OK 完整 |
| day19-3b9165-1 | day19 | p5 | OK 完整 |
| day20-f25fe5-1 | day20 | p5 | OK 完整 |
| day20-f25fe5-2 | day20 | p6 | OK 完整 |
| day20-f25fe5-3 | day20 | p82 | OK 完整 |
| day20-f25fe5-4 | day20 | p151 | OK 完整 |
| day21-e0a631-1 | day21 | p5 | OK 完整 |
| day21-e0a631-2 | day21 | p10 | OK 完整 |
| day22-a21d31-1 | day22 | p6 | OK 完整 |
| day22-a21d31-2 | day22 | p22 | OK 完整 |
| day23-87cb73-1 | day23 | p5 | OK 完整 |
| day23-87cb73-2 | day23 | p16 | OK 完整 |
| day24-850975-1 | day24 | p5 | OK 完整 |
| day24-850975-2 | day24 | p53 | OK 完整 |
| day25-710608-1 | day25 | p6 | OK 完整 |
| day25-710608-2 | day25 | p83 | OK 完整 |
| day25-710608-3 | day25 | p99 | OK 完整 |
| day26-2e6bde-1 | day26 | p6 | OK 完整 |
| day26-2e6bde-2 | day26 | p14 | OK 完整 |
| day27-6bffba-1 | day27 | p6 | OK 完整 |
| day27-6bffba-2 | day27 | p7 | OK 完整 |
| day27-6bffba-3 | day27 | p15 | OK 完整 |
| day28-6ccdd8-1 | day28 | p6 | OK 完整 |
| day29-a78910-1 | day29 | p7 | OK 完整 |
| day29-a78910-2 | day29 | p91 | OK 完整 |
| day29-a78910-3 | day29 | p170 | OK 完整 |
| day29-a78910-4 | day29 | p171 | OK 完整 |
| day29-a78910-5 | day29 | p172 | OK 完整 |
| day30-5187a4-1 | day30 | p4 | OK 完整 |
| day30-5187a4-2 | day30 | p20 | OK 完整 |
