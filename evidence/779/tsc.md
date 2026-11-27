# #779 の確かめ（2026-11-27）

`python3 scripts/curriculum-qa/build_day_snapshots.py --day 11` で組んだ Day 11 の読者の手元（94 ファイル）で `npx tsc --noEmit` を流した。

## 本文どおり4か所を消した手元（snapshot のまま）
```text
rc=0
```

## Day 10 の4か所を残した手元（直す前の本文どおりに写した状態）

`const projectAccessDenied` と2つの `if` の分岐を `if (requiredLoading` の前に、一覧の帯を `{staleDataWarning}` の後ろに戻した。中身は `day10_プロジェクト新規作成.md` の1875〜1961行目から写した。
```text
src/app/project/page.tsx(278,20): error TS2339: Property 'data' does not exist on type 'boolean'.
src/app/project/page.tsx(279,20): error TS2339: Property 'data' does not exist on type 'boolean'.
rc=2
```
