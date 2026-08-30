# Day スナップショットの検査結果

`scripts/curriculum-qa/build_day_snapshots.py` の出力。Day N を終えた読者の
手元を組み直して、型検査とビルドが通るかを見た結果である。

- 型検査とビルド: 実行した
- tsc・build とも OK: 8 / 30 日
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
| day07 | OK（80 ファイル） | OK | OK | - |
| day08 | OK（81 ファイル） | OK | OK | - |
| day09 | OK（83 ファイル） | NG | NG | src/app/project/page.tsx(15,10): error TS6133: 'dialogOpen' is declared but its value is never read.<br>src/app/project/page.tsx(20,11): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: Se<br>src/app/project/page.tsx(68,30): error TS7006: Parameter 'project' implicitly has an 'any' type. |
| day10 | OK（83 ファイル） | NG | NG | src/app/project/page.tsx(36,11): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: Se<br>src/app/project/page.tsx(42,9): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: Ses<br>src/app/project/page.tsx(44,15): error TS2339: Property 'project' does not exist on type 'TRPCContextPropsBase<BuiltRouter<{ ctx: { headers: Headers; session: S |
| day11 | OK（83 ファイル） | NG | NG | src/app/project/page.tsx(68,11): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: Se<br>src/app/project/page.tsx(77,9): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: Ses<br>src/app/project/page.tsx(79,15): error TS2339: Property 'project' does not exist on type 'TRPCContextPropsBase<BuiltRouter<{ ctx: { headers: Headers; session: S |
| day12 | OK（84 ファイル） | NG | NG | src/app/project/page.tsx(66,62): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: Se<br>src/app/project/page.tsx(69,40): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: Se<br>src/app/project/page.tsx(73,39): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: Se |
| day13 | OK（86 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/project/page.tsx(6,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/project/page.tsx(66,62): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: Se |
| day14 | OK（87 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/project/page.tsx(6,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/project/page.tsx(66,62): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: Se |
| day15 | OK（87 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/project/page.tsx(6,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/project/page.tsx(66,62): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: Se |
| day16 | OK（87 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/project/page.tsx(6,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/project/page.tsx(66,62): error TS2339: Property 'project' does not exist on type 'CreateTRPCReactBase<BuiltRouter<{ ctx: { headers: Headers; session: Se |
| day17 | OK（88 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/my-task/page.tsx(4,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/my-task/page.tsx(110,13): error TS2322: Type '{ key: string; id: string; title: string; description: string \| null; status: TaskStatus; priority: TaskPr |
| day18 | OK（89 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/my-task/page.tsx(4,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/my-task/page.tsx(110,13): error TS2322: Type '{ key: string; id: string; title: string; description: string \| null; status: TaskStatus; priority: TaskPr |
| day19 | OK（89 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/my-task/page.tsx(4,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/my-task/page.tsx(110,13): error TS2322: Type '{ key: string; id: string; title: string; description: string \| null; status: TaskStatus; priority: TaskPr |
| day20 | OK（91 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/my-task/page.tsx(4,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/my-task/page.tsx(110,13): error TS2322: Type '{ key: string; id: string; title: string; description: string \| null; status: TaskStatus; priority: TaskPr |
| day21 | OK（93 ファイル） | NG | NG | src/component/layout/app-layout.tsx(12,7): error TS1005: ';' expected.<br>src/component/layout/app-layout.tsx(13,7): error TS1005: ';' expected.<br>src/component/layout/app-layout.tsx(14,1): error TS1109: Expression expected. |
| day22 | OK（93 ファイル） | NG | NG | src/component/layout/app-layout.tsx(12,7): error TS1005: ';' expected.<br>src/component/layout/app-layout.tsx(13,7): error TS1005: ';' expected.<br>src/component/layout/app-layout.tsx(14,1): error TS1109: Expression expected. |
| day23 | OK（94 ファイル） | NG | NG | src/component/layout/app-layout.tsx(12,7): error TS1005: ';' expected.<br>src/component/layout/app-layout.tsx(13,7): error TS1005: ';' expected.<br>src/component/layout/app-layout.tsx(14,1): error TS1109: Expression expected. |
| day24 | OK（96 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/my-task/page.tsx(4,10): error TS2305: Module '"@/component/layout/app-layout"' has no exported member 'AppLayout'.<br>src/app/my-task/page.tsx(110,13): error TS2322: Type '{ key: string; id: string; title: string; description: string \| null; status: TaskStatus; priority: TaskPr |
| day25 | OK（100 ファイル） | NG | NG | src/component/layout/app-layout.tsx(1,1): error TS2657: JSX expressions must have one parent element. |
| day26 | OK（102 ファイル） | NG | NG | src/component/layout/app-layout.tsx(1,1): error TS2657: JSX expressions must have one parent element. |
| day27 | OK（102 ファイル） | NG | NG | src/component/layout/app-layout.tsx(1,1): error TS2657: JSX expressions must have one parent element. |
| day28 | OK（102 ファイル） | NG | NG | src/app/task/page.tsx(116,2): error TS17008: JSX element 'div' has no corresponding closing tag.<br>src/app/task/page.tsx(127,4): error TS17008: JSX element 'div' has no corresponding closing tag.<br>src/app/task/page.tsx(128,38): error TS17014: JSX fragment has no corresponding closing tag. |
| day29 | OK（106 ファイル） | NG | NG | src/app/task/page.tsx(116,2): error TS17008: JSX element 'div' has no corresponding closing tag.<br>src/app/task/page.tsx(127,4): error TS17008: JSX element 'div' has no corresponding closing tag.<br>src/app/task/page.tsx(128,38): error TS17014: JSX fragment has no corresponding closing tag. |
| day30 | OK（106 ファイル） | NG | NG | src/app/task/page.tsx(116,2): error TS17008: JSX element 'div' has no corresponding closing tag.<br>src/app/task/page.tsx(127,4): error TS17008: JSX element 'div' has no corresponding closing tag.<br>src/app/task/page.tsx(128,38): error TS17014: JSX fragment has no corresponding closing tag. |

## NG の日の切り分け

「教材の欠陥」は現物を読んで確かめたものだけ。読んでいない日は「判定不能（未調査）」。

| Day | 分類 | 根拠 |
| --- | --- | --- |
| day09 | ツールの限界 | src/app/project/page.tsx が 30 ブロック中 9（118/353 行）しか残らない。TS6133 の dialogOpen は捨てたブロックの中で使われている |
| day10 | ツールの限界 | src/server/api/root.ts が 7 ブロック中 1 しか残らず authRouter だけの版になる。api.project が無いのはそのため |
| day11 | ツールの限界 | day10 と同じ。root.ts が authRouter だけの版になる（src/app/project/page.tsx も 86 ブロック中 21） |
| day12 | ツールの限界 | day10 と同じ。root.ts が authRouter だけの版になる（src/app/project/page.tsx も 141 ブロック中 31） |
| day13 | ツールの限界 | src/component/layout/app-layout.tsx が 27 ブロック中 2（31/362 行）しか残らず AppLayout の export が落ちる |
| day14 | ツールの限界 | day13 と同じ。app-layout.tsx の AppLayout が落ちる |
| day15 | ツールの限界 | day13 と同じ。app-layout.tsx の AppLayout が落ちる |
| day16 | ツールの限界 | day13 と同じ。app-layout.tsx の AppLayout が落ちる |
| day17 | ツールの限界 | day13 と同じ app-layout.tsx に加え、src/app/my-task/page.tsx も 68 ブロック中 24（412/869 行）しか残らない |
| day18 | ツールの限界 | day17 と同じ。app-layout.tsx と my-task/page.tsx が欠ける |
| day19 | ツールの限界 | day17 と同じ。app-layout.tsx と my-task/page.tsx が欠ける |
| day20 | ツールの限界 | day17 と同じ。app-layout.tsx と my-task/page.tsx が欠ける |
| day21 | ツールの限界 | src/component/layout/app-layout.tsx が 34 ブロック中 2（14/487 行）しか残らず、その断片が構文として閉じていない |
| day22 | ツールの限界 | day21 と同じ。app-layout.tsx が 14/487 行しか残らない |
| day23 | ツールの限界 | day21 と同じ。app-layout.tsx が 14/487 行しか残らない |
| day24 | ツールの限界 | day17 と同じ。app-layout.tsx と my-task/page.tsx が欠ける |
| day25 | ツールの限界 | src/component/layout/app-layout.tsx が 44 ブロック中 3（39/601 行）しか残らない |
| day26 | ツールの限界 | day25 と同じ。app-layout.tsx が 39/601 行しか残らない |
| day27 | ツールの限界 | day25 と同じ。app-layout.tsx が 39/601 行しか残らない |
| day28 | ツールの限界 | src/app/task/page.tsx が 160 ブロック中 19（259/2044 行）しか残らず、div の閉じタグが捨てたブロックの中にある |
| day29 | ツールの限界 | day28 と同じ。task/page.tsx が 259/2044 行しか残らない |
| day30 | ツールの限界 | day28 と同じ。task/page.tsx が 259/2044 行しか残らない |
