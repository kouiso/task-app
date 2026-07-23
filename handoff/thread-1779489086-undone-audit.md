# thread 1779489086 未対応監査 引き継ぎ資料

このファイルは、Slack thread `1779489086.538189`（DM、2026-05-23開始）で指摘された未対応項目を、
親子関係つきのIssue一覧として追跡するための資料。元の監査ファイルはgit履歴に存在せず消失していたため、
Slackスレッド本文と、各Issueに残っていた「監査元」記載（`handoff/thread-1779489086-undone-audit.md item N`）から
今回作り直した。

- 監査日: 2026-07-24
- 元スレッドの1行要約: 局長がhorsemanager・adult-ai-appのバグ修正依頼やUX指摘を1本のDMスレッドに集約し、
  そこから成人向けアプリ7〜8件、馬管理アプリ2件の個別Issueへ切り出して修正が進められた。
- 番号（item 10 / 12 / 17-24）は各SBI本文の「監査元」行から復元した値であり、捏造していない。
  欠番（1-9, 11, 13-16, 25-31）はスレッド内の他プロジェクト（task-app教材、horsemanagerLP、
  musashipaint等）向けの指摘や、個別Issue化されていない要望に対応すると見られるが、元ファイルが
  消失しているため対応関係は確認できていない。この資料は「11項目（横断追跡含む）」の範囲に限定する。

## 親子関係図

```
kouiso/task-app#185 [PBI] thread 1779489086 添付画像と未対応指摘を漏れなくIssueへ反映する (OPEN, 横断親)
└── kouiso/task-app#186 [SBI] thread 1779489086 の11項目を親子Issueとして追跡できるようにする (OPEN)

ritmo-inc/adult-ai-app#329 [PBI] thread 1779489086 成人向けアプリ未対応指摘を一括で解消する (CLOSED)
├── #330 [SBI] ディスカバリー画面でキャラクター画像が黒く表示されないようにする (CLOSED) — item 17
├── #331 [SBI] 共有ボタンで誤った通知が出ないようにする (CLOSED) — item 18
├── #332 [SBI] 三点メニューから想定外の画面へ移動しないようにする (CLOSED) — item 19
├── #333 [SBI] 画像生成で内部エラーが出ても利用者が復旧できるようにする (CLOSED) — item 20
├── #335 [SBI] キャラクター設定と矛盾する応答を減らす (CLOSED) — item 21
├── #334 [SBI] キャラクター取得失敗時に選択と再試行ができるようにする (CLOSED) — item 22
├── #336 [SBI] 双葉そらの応答が同じ内容で繰り返されないようにする (CLOSED) — item 23
└── #337 [SBI] キャラクターのシーンがない表示でも会話を始められるようにする (CLOSED) — item 24

ritmo-inc/horsemanager-native#752 [PBI] thread 1779489086 馬管理アプリのOCR未対応指摘を完了する (OPEN)
├── #754 [SBI] OCRカメラ撮影後に黒い写真にならないようにする (CLOSED) — item 10
└── #753 [SBI] OCRで読み取れた項目がない時に次の操作を示す (CLOSED) — item 12
```

補足: `#752`（親PBI）は子SBI2件が両方CLOSEDになった後もOPENのまま残っている。
完了条件に「実機または再現手順で、撮影画像が正常に保存・表示されることを確認する」とあり、
このPBI単位の実機確認評価が終わっていない可能性が高い（下記「残作業」参照）。

## 11項目一覧

| # | item | 項目（1行） | 反映先Issue URL | state | 親PBI |
|---|------|------------|-----------------|-------|-------|
| 1 | 10 | OCRカメラ撮影後に黒い写真になる | https://github.com/ritmo-inc/horsemanager-native/issues/754 | CLOSED | #752 |
| 2 | 12 | OCRで「読み取れた項目がありません」と表示され、次の操作がわからない | https://github.com/ritmo-inc/horsemanager-native/issues/753 | CLOSED | #752 |
| 3 | 17 | ディスカバリー画面のキャラクター画像が黒く表示される | https://github.com/ritmo-inc/adult-ai-app/issues/330 | CLOSED | #329 |
| 4 | 18 | 共有ボタンを押すと誤った通知文（会話を始めてくれ、という内容）が出る | https://github.com/ritmo-inc/adult-ai-app/issues/331 | CLOSED | #329 |
| 5 | 19 | 三点メニューから想定外の画面（キャラ作成フォーム等）へ飛ばされる | https://github.com/ritmo-inc/adult-ai-app/issues/332 | CLOSED | #329 |
| 6 | 20 | 画像生成で内部エラーが出て、利用者が復旧できない | https://github.com/ritmo-inc/adult-ai-app/issues/333 | CLOSED | #329 |
| 7 | 21 | キャラクター設定と矛盾する応答が返る | https://github.com/ritmo-inc/adult-ai-app/issues/335 | CLOSED | #329 |
| 8 | 22 | キャラクター取得に失敗し、選び直し・再試行ができない | https://github.com/ritmo-inc/adult-ai-app/issues/334 | CLOSED | #329 |
| 9 | 23 | 双葉そらの応答が同じ内容で繰り返される | https://github.com/ritmo-inc/adult-ai-app/issues/336 | CLOSED | #329 |
| 10 | 24 | キャラクターにシーンがないと表示され、会話を始められない | https://github.com/ritmo-inc/adult-ai-app/issues/337 | CLOSED | #329 |
| 11 | 横断 | 上記10項目の親子関係と対応状況を、Slack thread を探し直さず追跡できる状態にする | https://github.com/kouiso/task-app/issues/185 / https://github.com/kouiso/task-app/issues/186 | OPEN | — |

## 残っているもの

- **kouiso/task-app#185・#186（横断PBI/SBI）**: OPEN。この資料の作成そのものが完了条件であり、
  本PR作成をもって「Issue URL・親子関係・残作業をhandoffに残す」を満たす。マージ後クローズ可否は
  局長判断とする。
- **ritmo-inc/horsemanager-native#752（親PBI）**: 子SBI2件はCLOSEDだが親自体はOPEN。完了条件の
  「実機または再現手順での撮影画像の正常保存・表示確認」がPBI単位で記録されているか未確認。
  実機確認の証跡（スクリーンショット等）がIssueコメントに見当たらないため、クローズ前に再確認が要る。
- adult-ai-app側（#329配下8件）はPBI・SBIとも全てCLOSED。2026-05-29のデプロイ報告（PR #341〜347,
  #304, #305, #311のマージ + PR #349マージ + wave4本番反映）まで確認できたため、対応完了として扱う。

## ユーザーが今できるようになること

thread 1779489086.538189 の未対応11項目（成人向けアプリ8件、馬管理アプリ2件、横断追跡1件）を、
Slackスレッドを再検索することなく、PBI/SBIの親子関係とIssue URL・stateから一覧で確認できる。

## 調査メモ（正直な残課題）

- Slackスレッドは読めた（`slack_search_public_and_private` でDMチャンネル `D060R6NAWKS` を特定し、
  `slack_read_thread` で全文取得・ページング完了）。ただしスレッド本文には task-app教材・horsemanagerLP・
  musashipaint・designdiff等、この横断監査の対象外の指摘も大量に混在しており、「item 1-9, 11, 13-16,
  25-31」に相当する具体的な文言をスレッド内テキストと確実に1対1対応づけることはできなかった
  （元の採番済み監査ファイルが失われているため）。今回は各SBI Issue本文に残っていた
  「監査元: handoff/thread-1779489086-undone-audit.md item N」という自己申告的な参照行を根拠に
  番号を復元した。この行はSBI起票時に当時のセッションが書いたものであり、確度は高いが第三者証跡
  （元ファイルそのもの）ではない。
- 31件添付画像の個別Issue化状況（#185本文にある「添付画像31件分のIssue化状況を再確認する」）は、
  今回の調査範囲では11項目の元Issueのみ確認し、画像1枚単位での網羅チェックは行っていない。
