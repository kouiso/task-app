# Day スナップショットの検査結果

`scripts/curriculum-qa/build_day_snapshots.py` の出力。Day N を終えた読者の
手元を組み直して、型検査とビルドが通るかを見た結果である。

- 型検査とビルド: 実行した
- ツリーの置き場: `dist/day-snapshots/dayNN/`
- tsc の NG は教材の欠陥とは限らない。書き換えの断片を連結した結果が
  構文として壊れる場合がある。1件ずつ現物と突き合わせてから判断すること。

| Day | ツリー構築 | tsc | build | 最初のエラー3行 |
| --- | --- | --- | --- | --- |
| day13 | OK（86 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/project/page.tsx(6,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/project/page.tsx(66,62): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: SessionPayload \| null; }; meta: object; errorShape: { data: { zodError: typeToFlattenedError<any, string> \| null; code: "TOO_MANY_REQUESTS" \| ... 19 more ... \| "CLIENT_CLOSED_REQUEST"; httpStatus: number; path?: string; stack?: string; }; message: s...'. |

## NG の日の切り分け

「教材の欠陥」は現物を読んで確かめたものだけ。読んでいない日は「判定不能（未調査）」。

| Day | 分類 | 根拠 |
| --- | --- | --- |
| day13 | 判定不能（未調査） | 現物と突き合わせていない |
