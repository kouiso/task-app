# 受講生の環境を実際に作って、教材の記述と突き合わせた記録

実施日: 2026-07-27
対象コミット: 53e12aa（PR #333 `fix/abe-review-followup`）

## なぜやるか

教材の説明が指しているのは、このリポジトリではなく、受講生が
`scripts/scaffold-from-scratch.sh` で作るプロジェクトである。この2つは中身が違う。
リポジトリ側だけを見て教材を直すと、リポジトリでは正しく受講生の手元では偽、という
記述が生まれる。実際に本PRの作業中、同じ取り違えを2回起こした（`npm run build` が
未使用変数で止まるか、`npm run lint` が何を対象にするか）。
そこで、受講生と同じ手順で環境を1つ作り、そこで実測した。

## やったこと

空のディレクトリで `scripts/scaffold-from-scratch.sh` を実行した。終了コード 0。
データベースの起動と初期データ投入まで完走した。
その環境で、教材が受講生に打たせるコマンドを実行し、出力を教材の記述と比べた。

## 実測結果

| 確かめたこと | 実測値 | 教材の記述 |
|---|---|---|
| `package.json` の `name` | `task-app` | 一致（day01 を修正済み） |
| `npm run dev` の出力 | `▲ Next.js 15.5.21` / `- Environments: .env` / `✓ Starting...` / `✓ Ready in 5.5s` | **不一致だったため修正**（行と字下げが違っていた） |
| `npm run build` の中身 | `prisma generate && next build` | 一致 |
| `npm run build` の出力 | `✓ Compiled successfully in 13.2s` / `✓ Generating static pages (5/5)` / `Collecting build traces ...` | **不一致だったため修正** |
| `tsconfig.json` の `noUnusedLocals` | 未設定。未使用変数があっても型検査は通る | 一致（day04 を元に戻して修正済み） |
| `npm run lint` の中身 | `biome check src prisma.config.ts next.config.ts package.json tsconfig.json` | 一致（day26 を元に戻して修正済み） |
| `npm run lint:ci` | 存在しない | 一致（day26 から削除済み） |
| `noConsole` ルール | `error`（`warn` と `error` は許可） | 一致 |
| Biome のエラー表示 | ルール名が1行目に同居し、`×` と `i` の行が続く | **不一致だったため修正** |
| `.gitignore` の環境変数の扱い | `.env*` の1行のみ。打ち消しの行は無い | 一致（day03 を修正済み） |
| `git add .env.example` | `The following paths are ignored` で失敗する | 一致（day03 に `-f` を追記済み） |
| `src/app/providers.tsx` | 配布済み。`<Toaster />` を含む | 一致（day08 を「新規作成」から「確認」へ修正済み） |
| `src/app/layout.tsx` | 配布済み。`next/font` の3書体を定義 | 一致（day08 を修正済み） |
| `src/component/task/task-dialog.tsx` | 配布済み | 一致（day14 を修正済み） |

## 併せて実行した検査

- `check_scaffold_curriculum_alignment.py`: `@/` の import 45件が、配布物または
  同日以前の day で用意される順序になっていることを確認
- `scripts/build-zip.sh`: 販売用 ZIP を生成（8.5MB / 197ファイル）
- `check-sale-package.sh`: 完成アプリ本体の混入なし
- 教材が参照するスクリーンショット65枚がすべて実在
- 教材内の相対リンク（`.md`）に切れなし

## 後始末

検証で起動したデータベースのコンテナは削除した。他のプロジェクトのコンテナには触れていない。
生成した ZIP も削除した。

## この記録で言えないこと

確かめたのは Day 01 の初期セットアップと、教材が示す出力の一致までである。
Day 02 以降を1日ずつ写経して完走できるかは、この記録の対象外である。
