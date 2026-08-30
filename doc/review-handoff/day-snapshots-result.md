# Day スナップショットの検査結果

`scripts/curriculum-qa/build_day_snapshots.py` の出力。Day N を終えた読者の
手元を組み直して、型検査とビルドが通るかを見た結果である。

- 型検査とビルド: 実行した
- ツリーの置き場: `dist/day-snapshots/dayNN/`
- tsc の NG は教材の欠陥とは限らない。書き換えの断片を連結した結果が
  構文として壊れる場合がある。1件ずつ現物と突き合わせてから判断すること。

| Day | ツリー構築 | tsc | build | 最初のエラー3行 |
| --- | --- | --- | --- | --- |
| day01 | OK（76 ファイル） | OK | OK | - |
| day02 | OK（76 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,25): error TS2323: Cannot redeclare exported variable 'default'.<br>src/app/dashboard/page.tsx(1,25): error TS2393: Duplicate function implementation.<br>src/app/dashboard/page.tsx(21,25): error TS2323: Cannot redeclare exported variable 'default'. |
| day03 | OK（76 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,25): error TS2323: Cannot redeclare exported variable 'default'.<br>src/app/dashboard/page.tsx(1,25): error TS2393: Duplicate function implementation.<br>src/app/dashboard/page.tsx(21,25): error TS2323: Cannot redeclare exported variable 'default'. |
| day04 | OK（76 ファイル） | NG | NG | src/app/dashboard/page.tsx(1,25): error TS2323: Cannot redeclare exported variable 'default'.<br>src/app/dashboard/page.tsx(1,25): error TS2393: Duplicate function implementation.<br>src/app/dashboard/page.tsx(21,25): error TS2323: Cannot redeclare exported variable 'default'. |
| day05 | OK（78 ファイル） | NG | NG | src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element. |
| day06 | OK（79 ファイル） | NG | NG | src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element. |
| day07 | OK（80 ファイル） | NG | NG | src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element. |
| day08 | OK（81 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element. |
| day09 | OK（83 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element. |
| day10 | OK（83 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element. |
| day11 | OK（83 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element. |
| day12 | OK（84 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day13 | OK（86 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day14 | OK（87 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day15 | OK（87 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day16 | OK（87 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day17 | OK（88 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day18 | OK（89 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day19 | OK（89 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day20 | OK（91 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day21 | OK（93 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day22 | OK（93 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day23 | OK（94 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day24 | OK（96 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/project/page.tsx(1221,1): error TS1109: Expression expected. |
| day25 | OK（100 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/profile/page.tsx(108,1): error TS2657: JSX expressions must have one parent element. |
| day26 | OK（102 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/profile/page.tsx(108,1): error TS2657: JSX expressions must have one parent element. |
| day27 | OK（102 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/profile/page.tsx(108,1): error TS2657: JSX expressions must have one parent element. |
| day28 | OK（102 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/profile/page.tsx(108,1): error TS2657: JSX expressions must have one parent element. |
| day29 | OK（106 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/profile/page.tsx(108,1): error TS2657: JSX expressions must have one parent element. |
| day30 | OK（106 ファイル） | NG | NG | src/app/dashboard/page.tsx(450,5): error TS1005: ',' expected.<br>src/app/login/page.tsx(77,1): error TS2657: JSX expressions must have one parent element.<br>src/app/profile/page.tsx(108,1): error TS2657: JSX expressions must have one parent element. |
