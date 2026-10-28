---
name: scrum-board
description: この repo の作業は GitHub Project で管理する — 次にやる物の決め方・PBI/SBI の起票・Status の動かし方・繰り越し。
---

# scrum-board

この repo の作業は GitHub Project（`.github/scrum-board.yml` の `owner` / `project_number`）で管理する。

## 次にやる物

- ビュー「Sprint Backlog (open)」で Wait が空の一番上。
- 取った物が PBI なら: ビュー「Sprint Board」でその PBI の段にある open の SBI の一番上。
- 実機が要る作業で手元に無ければ、その物は置いて次へ進む。

## PBI・SBI の作り方

- 題の頭: `[PBI]` か `[SBI]`。
- 親子は GitHub の sub-issue（本文の番号では繋がらん）。
- Project へ入れて項目を埋める: Iteration（今日を含む週）・Priority（P0/P1/P2）・Estimate（時間）・Size。
- 分け方・親子・PR との繋げ方の詳しいルールは skill `psp`（§2.5・§5）に従う。

## Status の動かし方

- 作業を始めたら In progress。
- PR を出したら In review。
- マージで Done（SBI は閉じる）。
- PBI は子が全部閉じたら In review（確かめ待ち）。確かめが済んだら閉じて Done。SBI と同時には Done にせん。

## リリース

配った時は項目「リリース」を「ステージング」か「本番」にする。

## 繰り越し・おかわり

- 今週の Iteration で終わらん物は次の Iteration へ（Carryover を 1 足す）。
- 今週が全部終わったら次の Iteration の上から今週へ入れる。
- 手で動かす時（`kouiso/.github` の `scripts/scrum_keeper/` 内）:
  `python3 scripts/scrum_keeper/scrum_keeper.py --board <owner>/<番号> --job carryover`（`--job okawari` も同じ形）。

## ビューの決まり

- 「Backlog」は Iteration ごとに区切ってある。過ぎた Iteration に open の物は残さん。

## やらんこと

- SBI の本文を書き換えん（決まりの追記・訂正は親 PBI のコメント）。
- 新しいラベルを作らん。
- Status「Todo」は作らん（Backlog の次は In progress）。
