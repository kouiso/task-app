---
name: scrum-board
description: この repo の作業は GitHub Project で管理する — 次にやる物の決め方・PBI/SBI の起票・Status の動かし方・繰り越し。
---

# scrum-board

この repo の作業は GitHub Project（`.github/scrum-board.yml` の `owner` / `project_number`）で管理する。

次にやる物を決める・課題を起票する・Status を動かす・繰り越す — どれか1つでもするなら最初にこのファイルを最後まで読んでから手を付ける。

## 盤の見方（コマンド）

`<owner>` と `<番号>` は `.github/scrum-board.yml` から取る。指示で別の盤（試しの写し等）が指定されとる時はそっちを優先する。

- カード一覧: `gh project item-list <番号> --owner <owner> --limit 0 --format json`（既定は30件打ち切り。ただしこの出力には Status しか出ない）
- Iteration・Wait・Priority・End date の項目値は `item-list` では取れない。GraphQL で取る（org の盤は `organization`・個人の盤は `user` に変える）:

```
gh api graphql -f query='{organization(login:"<owner>"){projectV2(number:<番号>){items(first:100){nodes{content{__typename ... on Issue{number state}} it:fieldValueByName(name:"Iteration"){...on ProjectV2ItemFieldIterationValue{title}} st:fieldValueByName(name:"Status"){...on ProjectV2ItemFieldSingleSelectValue{name}} wt:fieldValueByName(name:"Wait"){...on ProjectV2ItemFieldSingleSelectValue{name}} pr:fieldValueByName(name:"Priority"){...on ProjectV2ItemFieldSingleSelectValue{name}} ed:fieldValueByName(name:"End date"){...on ProjectV2ItemFieldDateValue{date}}} pageInfo{hasNextPage endCursor}}}}}'
```

- 100件を超える盤は `pageInfo.endCursor` でページ送りして全件取る
- 「今週」= 今日を含む Iteration

## 次にやる物

1. 上の GraphQL で全件取る。今週の Iteration・Status が Backlog・Wait が空・issue が open の物を Priority → End date の順に並べて一番上を取る（進行中の物は誰かがやっとるので次には挙げん）。
2. それが PBI ならその PBI の open の SBI の一番上を取る。
3. 該当が無ければ「今週やる物は無い」と答える。issue 一覧や open PR から勝手に選ばない。
4. 実機が要るのに手元に無い作業がある。その物は置いて次へ進む。

## PBI・SBI の作り方（順番どおり）

1. `gh issue create` で PBI を作る。題の頭は `[PBI]`。
2. `gh issue create` で SBI を作る。題の頭は `[SBI]`。
3. SBI を PBI の sub-issue にする（本文の番号では繋がらん）:
   `gh api graphql -f query='mutation{addSubIssue(input:{issueId:"<PBIのnode_id>" subIssueId:"<SBIのnode_id>"}){clientMutationId}}'`
   （node_id は `gh api repos/<owner>/<repo>/issues/<番号>` の `node_id`）
4. 3 件とも盤に入れる: `gh project item-add <番号> --owner <owner> --url <issue の URL>`
5. 項目を埋める（全件）:
   - `gh project field-list <番号> --owner <owner>` で Iteration・Priority・Estimate・Size の field-id と Iteration の選択肢 id を取る
   - `gh project item-edit --project-id <project_id> --id <item_id> --field-id <field_id> --iteration-id <iteration_id>`（数値項目は `--number`、単選は `--single-select-option-id`）
   - 値: Iteration=今日を含む週・Priority=P0/P1/P2・Estimate=時間・Size
6. 全部できたか `gh project item-list <番号> --owner <owner> --limit 0 --format json` と issue の `subIssues` で確かめる。出来んかったこと（盤登録・項目・sub-issue どれでも）を「済み」と書かない。失敗した所をそのまま報告する。
7. 分け方・親子・PR との繋げ方の詳しいルールは skill `psp`（§2.5・§5）に従う。

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
- **手で動かす時は必ず keeper を使う**（`kouiso/.github` の `scripts/scrum_keeper/`。無ければ `git clone --depth 1 https://github.com/kouiso/.github`）:
  `python3 scripts/scrum_keeper/scrum_keeper.py --board <owner>/<番号> --job carryover --dry-run` で先に確認。本実行は `--ledger-dir <dir> --state-dir <dir>` を付ける（`--job okawari` も同じ形）
- やむを得ず手で動かす場合も動かした物の Carryover 項目を 1 足す。

## ビューの決まり

- 「Backlog」は Iteration ごとに区切ってある。過ぎた Iteration に open の物は残さん。

## やらんこと

- SBI の本文を書き換えん（決まりの追記・訂正は親 PBI のコメント）。
- 新しいラベルを作らん。
- Status「Todo」は作らん（Backlog の次は In progress）。
