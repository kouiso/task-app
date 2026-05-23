# Issue #133 教材棚卸し・完成度監査

日付: 2026-05-23
Issue: https://github.com/kouiso/task-app/issues/133
真の目的への寄与: 95%

## 目的

Issue #133 は、教材を読者目線で一から walkthrough したときに、完了済みと言えるか、不足が残っていないかを確認するタスクです。この evidence では、現時点の教材棚卸し、読者品質チェック、最初に完了した不足修正バケットを記録します。

## 並列性 Self-Check

- 棚卸し・静的監査: 対象独立 = yes、resource 独立 = yes、失敗独立 = yes。可能なものは並列実行。
- 実 walkthrough: 対象独立 = partial、resource 独立 = yes、失敗独立 = no。後半 Day は前半 Day のアプリ状態に依存するため、実 walkthrough は Day 順で進める必要があります。

## 棚卸し

主要 walkthrough:

- `material/30days-curriculum/00_カリキュラム目次.md`
- `material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md`
- `material/30days-curriculum/day02_ダッシュボードに自分だけのメッセージを追加しよう.md`
- `material/30days-curriculum/day03_GitHubに保存する.md`
- `material/30days-curriculum/day04_ネットに公開.md`
- `material/30days-curriculum/day05_ログイン画面のUI.md`
- `material/30days-curriculum/day06_ユーザー登録画面.md`
- `material/30days-curriculum/day07_ログイン体験を改善しよう.md`
- `material/30days-curriculum/day08_サイドバーを完成させよう.md`
- `material/30days-curriculum/day09_プロジェクト一覧画面.md`
- `material/30days-curriculum/day10_プロジェクト新規作成.md`
- `material/30days-curriculum/day11_プロジェクト編集・削除.md`
- `material/30days-curriculum/day12_メンバー追加.md`
- `material/30days-curriculum/day13_タスク一覧画面.md`
- `material/30days-curriculum/day14_タスク新規作成.md`
- `material/30days-curriculum/day15_タスク編集・削除.md`
- `material/30days-curriculum/day16_ステータス変更・タイマー.md`
- `material/30days-curriculum/day17_自分のタスクページ.md`
- `material/30days-curriculum/day18_コメント投稿.md`
- `material/30days-curriculum/day19_コメント編集・削除.md`
- `material/30days-curriculum/day20_タスク検索機能.md`
- `material/30days-curriculum/day21_統計カードを表示.md`
- `material/30days-curriculum/day22_グラフを表示.md`
- `material/30days-curriculum/day23_週次レポート.md`
- `material/30days-curriculum/day24_ユーザー一覧（管理者用）.md`
- `material/30days-curriculum/day25_プロフィール編集.md`
- `material/30days-curriculum/day26_エラーページを作って、バグを退治しよう.md`
- `material/30days-curriculum/day27_プロジェクト詳細・アーカイブを実装しよう.md`
- `material/30days-curriculum/day28_タスク一括操作を実装しよう.md`
- `material/30days-curriculum/day29_ユーザー詳細・編集ページを作ろう.md`
- `material/30days-curriculum/day30_完成版を公開！卒業！.md`

付録:

- `material/30days-curriculum/appendix_トラブルシューティング.md`
- `material/30days-curriculum/appendix_参考資料.md`
- `material/30days-curriculum/appendix_次のステップ.md`
- `material/30days-curriculum/appendix_用語集.md`

関連 artifact:

- `material/pdf/`: 生成済み PDF 教材。
- `material/quality_reports/`: Day 別 quality report。現行タイトルと旧タイトルの report が混在。
- `docs/evidence/2026-04-17/`: Day01-30 の range 別 walkthrough evidence。
- `docs/evidence/2026-04-18/`: 初心者目線監査と multi-review evidence。
- `script/check_scaffold_curriculum_alignment.py` / `scripts/check_scaffold_curriculum_alignment.py`: scaffold と教材 import の整合性チェック。

## 読者目線の監査基準

各 Day について次を確認しました。

- 前提知識・開始条件が明示されているか
- 手順の sequencing があるか
- 例・完成イメージがあるか
- 演習または実装作業があるか
- 評価・完了確認があるか
- Markdown の code fence が閉じているか
- code fence 外の H1 が 1 つだけか
- ローカル screenshot 参照切れがないか

## 静的監査結果

この修正後:

- Day01-Day30 はすべて、前提 / sequencing / 例 / 演習 / 評価の 5 項目を満たしています。
- Day01-Day30 はすべて、code fence 外の H1 が 1 つです。
- Day01-Day30 はすべて、code fence が閉じています。
- Day01-Day30 はすべて、ローカル画像参照切れが 0 件です。

## このバケットで修正した不足

Root cause: 後半の一部 Day は手順と確認は十分にありましたが、読者がその日に入る前に満たすべき状態が独立した見出しとして明示されていませんでした。そのため、アカウント、練習データ、必要 route、前日までの機能状態が足りないまま読み始めるリスクがありました。

修正内容:

- Day05、Day06、Day14、Day15、Day22、Day23、Day24、Day25、Day26、Day28、Day29 に `## 🧰 始める前の前提` を追加。
- 目次の技術バージョンを `package.json` と同期: TypeScript 5.9、tRPC 11.17、Recharts 3.8、Vitest 3.2。
- 目次の最終更新日を 2026-05-23 に更新。
- `scripts/scaffold-from-scratch.sh` を修正し、読者の作業ディレクトリ名に大文字が含まれていても Day01 setup が失敗しないようにしました。Next.js app は安全な小文字の一時ディレクトリで生成し、中身を作業ディレクトリへ戻し、package name を `task-app` に正規化します。

## 実 Walkthrough Evidence

Day01 setup を配布物コピーから再現しました。

- 配布物コピーには `scripts`、`material`、`README.md` を含めました。
- 実行コマンド: `bash scripts/scaffold-from-scratch.sh`
- 修正前の再現失敗: `create-next-app .` が大文字を含むディレクトリ basename を npm package name 制約で拒否。
- 修正後: 同じく大文字を含む temp path で setup、Prisma DB push、Prisma Client 生成、seed まで完了。

生成 app の確認:

| Check | Expected | Actual | Diff |
|---|---|---|---|
| Day01 scaffold | 配布物コピーから setup が完了する | `/tmp/task-app-issue133-walkthrough-VOQFsB` で完了 | none |
| 生成物 lint | scaffold 出力に Biome error がない | `npm run lint` pass、76 files checked | none |
| 生成物 type-check | scaffold 出力が type-check できる | `npm run type-check` pass | none |
| 生成物 build | scaffold 出力が build できる | `npm run build` pass、5 app routes generated | none |
| 生成物 dev URL | `http://localhost:3013/` が app HTML を返す | HTTP 200、`text/html`、Next static assets present | none |

補足:

- ローカル環境では既に port `25533` が使用中だったため、Docker が `test-db` の bind warning を出しました。ただし app DB の setup と seed は完了しました。clean environment の Day01 読者導線を塞ぐ blocker ではありませんが、後続 bucket で hardening 候補です。
- `/tmp` 配下に別 lockfile があるため、Next.js の workspace-root warning が出ました。生成 app は lint、type-check、build、render まで通っています。

## Verification Commands

```bash
node - <<'NODE'
# Day01-Day30 の静的読者品質監査
NODE

git diff --check
bash -n scripts/scaffold-from-scratch.sh
python3 scripts/check_scaffold_curriculum_alignment.py
npm ci
npm run lint:ci
npm audit --audit-level=high
npm run type-check
TEST_DATABASE_URL='postgresql://user:password@localhost:25533/taskapp_test?schema=public' npm test
```

この bucket の repo verification:

- `bash -n scripts/scaffold-from-scratch.sh`: pass。
- `python3 scripts/check_scaffold_curriculum_alignment.py`: pass、41 件の `@/` import がすべて scaffold または curriculum で提供済み。
- `npm ci`: pass。
- `npm run lint:ci`: pass、240 files checked。
- `npm audit --audit-level=high`: pass。既知の moderate PostCSS advisory は残るが、force fix は Next の downgrade を伴う。
- `npm run type-check`: pass。
- `TEST_DATABASE_URL='postgresql://user:password@localhost:25533/taskapp_test?schema=public' npm test`: pass、15 files / 215 tests。

Issue #133 はこの first bucket だけでは close しません。残作業は Day01-Day30 の full manual/automated walkthrough ですが、この PR は最初に再現した setup blocker を除去し、全件棚卸し baseline を残します。

## 1分 Demo

1. `material/30days-curriculum/day24_ユーザー一覧（管理者用）.md` を開く。
2. `## 🧰 始める前の前提` で、管理者ユーザー、一般ユーザー、アクセス拒否確認が明示されていることを確認する。
3. `material/30days-curriculum/00_カリキュラム目次.md` を開く。
4. TypeScript、tRPC、Recharts、Vitest のバージョンが `package.json` と合っていることを確認する。
5. 大文字を含む path の配布物コピーで `bash scripts/scaffold-from-scratch.sh` を実行する。期待結果は create-next-app の package-name rejection ではなく setup 完了。
