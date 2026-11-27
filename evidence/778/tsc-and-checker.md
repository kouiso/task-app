# #778 の確かめ（2026-11-27）

Day 08 の完成コード節にある `src/component/layout/app-layout.tsx` の分割ブロックを、目印の行も含めて上から順に1ファイルへつないだ（読者が目印ごと写した状態）。それを本体の tsconfig で `tsc --noEmit` にかけた。

## 直す前（main eb406ac）
```text
src/component/layout/app-layout.tsx(133,80): error TS1005: '...' expected.
src/component/layout/app-layout.tsx(134,34): error TS1005: '...' expected.
rc=2
```

## 直した後（このPR）
```text
rc=0
```

## 新しい検査を直す前の本文に当てた結果
```text
❌ 開始タグの途中に `{/* */}` の目印が 4 行あります
  day08_サイドバーを完成させよう.md:473: {/* filepath: src/component/layout/app-layout.tsx（続き） */}
  day08_サイドバーを完成させよう.md:1041: {/* filepath: src/component/layout/app-layout.tsx（同じファイルの続き） */}
  day08_サイドバーを完成させよう.md:1042: {/* ナビゲーションの続き */}
  day20_タスク検索機能.md:1747: {/* filepath: src/app/search/page.tsx */}
  `//` に変えてください。そのままだと写した読者のファイルが構文エラーになります。
rc=1
```

## 新しい検査を直した後の本文に当てた結果
```text
✅ JSX の位置の目印 OK（コードブロック 1979 個）
rc=0
✅ JSX の位置の目印 自己テスト 40/40 合格
rc=0
```

検査は直前の同じファイルのブロックから続けて読み、開始タグと波括弧を積んで、開始タグが閉じていない所の `{/* */}` だけを数える（CodeRabbit の指摘で、次の行の形だけで決める版から変えた。day14 の `render={() => (<Select>…)}` の中と `<pre>` の中の `NODE_ENV=development` は数えない）。
