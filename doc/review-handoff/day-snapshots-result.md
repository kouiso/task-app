# Day スナップショットの検査結果

`scripts/curriculum-qa/build_day_snapshots.py` の出力。Day N を終えた読者の
手元を組み直して、型検査とビルドが通るかを見た結果である。

- 型検査とビルド: 実行した
- tsc・build とも OK: 16 / 30 日
- ツリーの置き場: `dist/day-snapshots/dayNN/`
- tsc の NG は教材の欠陥とは限らない。教材がその日の `完成版` として
  変更箇所の抜粋だけを出す日があり、道具はそれを丸ごとの書き直しとして扱う。
  1件ずつ現物と突き合わせてから判断すること。下の切り分けの表を見ること。

| Day | ツリー構築 | tsc | build | 最初のエラー3行 |
| --- | --- | --- | --- | --- |
| day01 | OK（76 ファイル） | OK | OK | - |
| day02 | OK（76 ファイル） | OK | OK | - |
| day03 | OK（76 ファイル） | OK | OK | - |
| day04 | OK（76 ファイル） | OK | OK | - |
| day05 | OK（78 ファイル） | OK | OK | - |
| day06 | OK（79 ファイル） | OK | OK | - |
| day07 | OK（86 ファイル） | OK | OK | - |
| day08 | OK（89 ファイル） | OK | OK | - |
| day09 | OK（91 ファイル） | OK | OK | - |
| day10 | OK（92 ファイル） | OK | OK | - |
| day11 | OK（92 ファイル） | NG | NG | src/component/project/project-detail-view.tsx(29,47): error TS2339: Property 'getById' does not exist on type 'GetInferenceHelpers<"output", { ctx: { headers: H<br>src/component/project/project-detail-view.tsx(144,44): error TS7006: Parameter 'member' implicitly has an 'any' type.<br>src/component/project/project-detail-view.tsx(167,31): error TS7053: Element implicitly has an 'any' type because expression of type 'any' can't be used to inde |
| day12 | OK（93 ファイル） | OK | OK | - |
| day13 | OK（95 ファイル） | OK | OK | - |
| day14 | OK（97 ファイル） | OK | OK | - |
| day15 | OK（97 ファイル） | OK | OK | - |
| day16 | OK（99 ファイル） | OK | OK | - |
| day17 | OK（100 ファイル） | OK | OK | - |
| day18 | OK（102 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r |
| day19 | OK（102 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r |
| day20 | OK（104 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r |
| day21 | OK（106 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r |
| day22 | OK（106 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r |
| day23 | OK（107 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r |
| day24 | OK（109 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r |
| day25 | OK（113 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r |
| day26 | OK（115 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r |
| day27 | OK（116 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r |
| day28 | OK（116 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r<br>src/server/api/routers/task.ts(92,15): error TS2552: Cannot find name 'PermissionKey'. Did you mean 'Permissions'?<br>src/server/api/routers/task.ts(93,4): error TS2304: Cannot find name 'ProjectMemberRole'. |
| day29 | OK（120 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r<br>src/server/api/routers/task.ts(92,15): error TS2552: Cannot find name 'PermissionKey'. Did you mean 'Permissions'?<br>src/server/api/routers/task.ts(93,4): error TS2304: Cannot find name 'ProjectMemberRole'. |
| day30 | OK（120 ファイル） | NG | NG | src/app/task/page.tsx(315,10): error TS2741: Property 'canEditProject' is missing in type '{ open: boolean; taskId: string \| null; onClose: () => void; }' but r<br>src/server/api/routers/task.ts(92,15): error TS2552: Cannot find name 'PermissionKey'. Did you mean 'Permissions'?<br>src/server/api/routers/task.ts(93,4): error TS2304: Cannot find name 'ProjectMemberRole'. |

## NG の日の切り分け

「教材の欠陥」は現物を読んで確かめたものだけ。読んでいない日は「判定不能（未調査）」。

| Day | 分類 | 根拠 |
| --- | --- | --- |
| day11 | 教材の欠陥 | day11 の src/app/project/page.tsx が配布物 src/component/project/project-detail-view.tsx を import しており、その配布物は api.project.getById を呼ぶ。しかし教材が project.ts へ getById を書くのは day12（教材の全ブロックを検索した実測）。読者も day11 で同じ型エラーに当たる。教材側の担当が直す範囲なので、ここでは触っていない |
| day18 | ツールの限界 | src/app/task/page.tsx が day15 の版で止まる（day16 以降その日の完成版が抜粋しかない）。day18 で src/component/task/task-detail-dialog.tsx だけが canEditProject を必須にする版へ進み、呼ぶ側と呼ばれる側の版がずれる |
| day19 | ツールの限界 | day18 と同じ。task/page.tsx が day15 止まりで dialog と版がずれる |
| day20 | ツールの限界 | day18 と同じ。task/page.tsx が day15 止まりで dialog と版がずれる |
| day21 | ツールの限界 | day18 と同じ。task/page.tsx が day15 止まりで dialog と版がずれる |
| day22 | ツールの限界 | day18 と同じ。task/page.tsx が day15 止まりで dialog と版がずれる |
| day23 | ツールの限界 | day18 と同じ。task/page.tsx が day15 止まりで dialog と版がずれる |
| day24 | ツールの限界 | day18 と同じ。task/page.tsx が day15 止まりで dialog と版がずれる |
| day25 | ツールの限界 | day18 と同じ。task/page.tsx が day15 止まりで dialog と版がずれる |
| day26 | ツールの限界 | day18 と同じ。task/page.tsx が day15 止まりで dialog と版がずれる |
| day27 | ツールの限界 | day18 と同じ。task/page.tsx が day15 止まりで dialog と版がずれる |
| day28 | ツールの限界 | day18 に加え、src/server/api/routers/task.ts も day15 止まり（94ブロック中22）で PermissionKey が無い |
| day29 | ツールの限界 | day28 と同じ。task/page.tsx と routers/task.ts が day15 止まり |
| day30 | ツールの限界 | day28 と同じ。task/page.tsx と routers/task.ts が day15 止まり |

## day11 は教材の欠陥ではない（2026-08-30 追記）

道具の側は day11 を「教材の欠陥」と切り分けたが、**教材を読み直したところ違った。**

day11 本文（Step 7 付近）が、こう書いている。

> この時点ではエディタに `getById` が無いという型エラーが出ます。写し間違いではありません。
> **ここで出るエラーは1件にとどまりません。** 実際に数えると5件出ます。
> **Day 11 を終えた時点で `npm run build` は通りません。** …今日は失敗して正常です。
> `build` が通る状態に戻るのは Day 12 です。

確認ポイントにも「型エラーが5件出ても、そのまま次へ進む」「`npm run build` が今日は落ちる
ことを知っている」と入っている。読者の手元で起きることと、道具が観測した結果が一致している。
隠された欠陥ではなく、**先に断ってある赤**である。

そのため `build_day_snapshots.py` に `EXPECTED_RED` を置き、day11 の型エラーは想定内として
扱う。あわせて逆向きの検査も入れた。**教材が「落ちる」と断っている日が通ってしまったら失敗
にする。**断りのほうが古くなったということなので、直す先は道具ではなく本文になる。

`test_build_day_snapshots.py` に、`EXPECTED_RED` に挙げた日が本当に本文で断られているかを
見る検査を足した（本文に「写し間違いではありません」があること）。断りの無い日をここへ足して
赤を隠す抜け道を塞ぐためである。
