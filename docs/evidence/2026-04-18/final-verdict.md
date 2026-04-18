# task-app ローンチ可否 最終判定 (2026-04-18)

> 判定結果: **DO NOT LAUNCH**

判定日: 2026-04-18  
対象: `task-app` 商用 30 日カリキュラム商品  
判定対象: プロダクトコード + 教材カリキュラム

## 前回からの差分

- 前回判定 (`docs/evidence/2026-04-17/final-verdict.md`, commit `013ace0`) では、プロダクトコードと教材を合わせて商用リリース可として整理されていました。
- 本日、初心者向け観点の教材監査 (`docs/evidence/2026-04-18/curriculum-beginner-audit.md`) により、**教材が商用ローンチ阻害要因**であることが新たに確定しました。
- コード側では、VIEWER 権限の編集不備が本日修正済みです (commit `cc70b5f`)。テストは commit メッセージ上で `190 -> 202 green` と記録されています。
- レート制限は、過去監査では未実装指摘がありました (`docs/evidence/security-review-2026-04-14.md`, `docs/evidence/2026-04-17/security-refresh.md`)。一方で、本日の最終判断では**ユーザー判断によりローンチ対象外**として扱います。なお、この scope 判断自体の文書証跡はリポジトリ内で未確認です。

## 総合判定

**現時点ではローンチしてはいけません。コードは READY ですが、教材が LAUNCH-BLOCK のため、商用販売開始条件を満たしていません。**

根拠:

1. コード側の P1 は、RBAC 修正完了または scope 外扱いに整理できています (commit `cc70b5f`, `docs/evidence/2026-04-17/security-refresh.md`)。
2. 教材監査では、現行 30 日カリキュラムが真の初心者に対して難しすぎると判定され、**LAUNCH-BLOCK** が明示されています (`docs/evidence/2026-04-18/curriculum-beginner-audit.md`)。
3. 改修計画上、教材を商用品質へ引き上げるには **24.0 人日**の全面改稿が必要です (`docs/evidence/2026-04-18/curriculum-ideal-plan.md`)。

## コード面の状態

| 項目 | 状態 | 根拠コミット / ファイル |
|---|---|---|
| VIEWER 権限の編集禁止 | READY | commit `cc70b5f` |
| RBAC 回帰テスト追加 | READY | commit `cc70b5f` |
| テスト件数 `190 -> 202` | READY | commit `cc70b5f` |
| Tier 2 既存マージの記録 | READY | `docs/evidence/2026-04-17/final-verdict.md`, commit `013ace0` |
| レート制限未実装 | スコープ外（ユーザー判断） | `docs/evidence/security-review-2026-04-14.md`, `docs/evidence/2026-04-17/security-refresh.md` |
| レート制限を scope 外にした判断の証跡 | 未確認 | リポジトリ内で明示ファイル未確認 |

### コード面コメント

- 本日時点の最終判定に必要な範囲では、コードは **READY** と整理します。
- ただし、レート制限の未実装自体は過去監査で事実として残っています。今回 READY とする根拠は、実装完了ではなく **ユーザーによる scope 外判断**です。
- したがって、コード側の READY は「残課題ゼロ」ではなく、「本日のローンチ判定条件に照らした blocking issue がない」という意味です。

## 教材面の状態

| 項目 | 状態 | 根拠ファイル |
|---|---|---|
| 初心者向け難易度の総合判定 | BLOCK | `docs/evidence/2026-04-18/curriculum-beginner-audit.md` |
| Day 01 の過積載 | BLOCK | `docs/evidence/2026-04-18/curriculum-beginner-audit.md` |
| Day 02 の API フック前提化 | BLOCK | `docs/evidence/2026-04-18/curriculum-beginner-audit.md` |
| Day 05 の `react-hook-form` + `zod` + `shadcn/ui` 同時投入 | BLOCK | `docs/evidence/2026-04-18/curriculum-beginner-audit.md` |
| Day 15 の `null` / `undefined` 境界理解要求 | BLOCK | `docs/evidence/2026-04-18/curriculum-beginner-audit.md` |
| Day 30 の本番 secrets / DB 接続要求 | BLOCK | `docs/evidence/2026-04-18/curriculum-beginner-audit.md` |
| 難易度カーブ非単調 | BLOCK | `docs/evidence/2026-04-18/curriculum-beginner-audit.md` |
| 理想改修工数 24.0 人日 | BLOCK | `docs/evidence/2026-04-18/curriculum-ideal-plan.md` |
| スクリーンショット増強 `59 -> 157` | 要対応 | `docs/evidence/2026-04-18/curriculum-ideal-plan.md` |
| Feature-unit 進行への全面転換 | 要対応 | `docs/evidence/2026-04-18/curriculum-ideal-plan.md` |
| `教材ビジョン` セクション追加 | 要対応 | `docs/evidence/2026-04-18/curriculum-ideal-plan.md` |

### 教材面コメント

- 教材側は、**「今のままでは真の初心者が完走できない」**ことが本日の新規 blocker です。
- 特に問題なのは、一部の表現修正ではなく、カリキュラム全体の導線が **TECHNIQUE-UNIT 依存**である点です。
- 改修計画は存在しますが、まだ実施されていません。したがって、本日時点の教材状態は **BLOCK のまま**です。

### 教材 blocker の代表箇所

- Day 01: `dotenv` の変数展開説明が初学者には重すぎます (`material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md:556`)
- Day 02: `api.task.getAll.useQuery()` が文脈なしで前提化されています (`material/30days-curriculum/day02_ダッシュボードに自分だけのメッセージを追加しよう.md:370`)
- Day 05: `react-hook-form` と `zod` と `shadcn/ui` が同日に投入されています (`material/30days-curriculum/day05_ログイン画面のUI.md:11`)
- Day 15: `null` と `undefined` の境界理解を要求しています (`material/30days-curriculum/day15_タスク編集・削除.md:308`)
- Day 30: `DATABASE_URL` / `JWT_SECRET` を含む本番 secrets 管理を要求しています (`material/30days-curriculum/day30_完成版を公開！卒業！.md:90`)
- 上記の詰まりポイント抽出元は `docs/evidence/2026-04-18/curriculum-beginner-audit.md` です

## リリースまでに必要な残作業

### P0

- 教材全面改稿を実施する: **24.0 人日**
  - 根拠: `docs/evidence/2026-04-18/curriculum-ideal-plan.md`
  - 内容: 難易度カーブ再設計、Feature-unit 進行への転換、`教材ビジョン` 追加、スクリーンショット 157 枚体制への再設計

- Day 01 / 05 / 10 / 15 / 20 / 25 / 30 の難所を解消する: **24.0 人日の内数**
  - 根拠: `docs/evidence/2026-04-18/curriculum-beginner-audit.md`
  - 内容: Day 01 過積載、Day 05 同時投入、Day 10 既存実装読解依存、Day 15 更新設計負荷、Day 20 URL/UTC 同期負荷、Day 25 複数画面 + refine、Day 30 secrets/本番運用負荷の解消

### P1

- タイトルと導線を feature-unit 基準へ統一する: **24.0 人日の内数**
  - 根拠: `docs/evidence/2026-04-18/curriculum-ideal-plan.md`
  - 内容: 各日に `今日作ったもの` を必須化し、新タイトルから禁止技術語 (`tRPC`, `Prisma`, `zod`, `Suspense`, `useQuery`, `useMutation`, `環境`, `セットアップ`) を排除する

- スクリーンショットを `59 -> 157` へ増補する: **24.0 人日の内数**
  - 根拠: `docs/evidence/2026-04-18/curriculum-ideal-plan.md`
  - 内容: 追加 98 枚。各日で開始状態、途中状態、完成状態を視覚的に保証する

### P2

- 改稿後に初心者向け再監査を実施する: **工数未確認**
  - 根拠: 必要性は `docs/evidence/2026-04-18/curriculum-beginner-audit.md` と `docs/evidence/2026-04-18/curriculum-ideal-plan.md` から明白
  - 注記: 再監査そのものの独立工数は、現時点の証跡では未確認です

- 改稿反映後にローンチ可否 verdict を更新する: **工数未確認**
  - 根拠: 本文書
  - 注記: 判定更新用の標準工数は現時点の証跡では未確認です

## 次のマイルストーン提案

### Week1

- `教材ビジョン` を冒頭追加し、全体方針を確定する
- Day 01-05 を初心者導線へ再構成する
- 難易度カーブの固定点を Day01=`1.0`, Day05=`1.5` に合わせる
- 主要難所のうち Day01, Day02, Day05 を先に潰す
- 目安工数: **約 5 人日**
- 根拠: `docs/evidence/2026-04-18/curriculum-ideal-plan.md`

### Week2-3

- Day 06-20 を feature-unit 進行へ書き換える
- Day 10, Day 15, Day 20 の高難度箇所を分解する
- `今日作ったもの` を全日に入れる
- 中間時点でスクリーンショット増補を進め、総数を 100 枚台へ乗せる
- 難易度カーブの固定点を Day10=`2.0`, Day15=`2.5`, Day20=`3.0` に合わせる
- 目安工数: **約 10 人日**
- 根拠: `docs/evidence/2026-04-18/curriculum-ideal-plan.md`

### Week4-5

- Day 21-30 を安全な公開導線まで含めて再構成する
- Day 25, Day 30 の blocker を解消する
- スクリーンショット総数を 157 枚目標まで到達させる
- 難易度カーブの固定点を Day25=`3.2`, Day30=`3.5` に合わせる
- 改稿後の再監査と最終 verdict 更新を実施する
- 目安工数: **約 9 人日**
- 根拠: `docs/evidence/2026-04-18/curriculum-ideal-plan.md`

## 参照ドキュメント一覧

- 前回最終判定: `docs/evidence/2026-04-17/final-verdict.md`
- 前回統合進捗: `docs/evidence/2026-04-17/_progress.md`
- 前回セキュリティ整理: `docs/evidence/2026-04-17/security-refresh.md`
- 初回レート制限指摘: `docs/evidence/security-review-2026-04-14.md`
- 本日教材監査: `docs/evidence/2026-04-18/curriculum-beginner-audit.md`
- 本日理想改修計画: `docs/evidence/2026-04-18/curriculum-ideal-plan.md`
- 本日 RBAC 修正: commit `cc70b5f`
- Tier 2 マージ記録更新: commit `013ace0`
- 本日教材レビュー / 改修計画追加: commit `739448a`

## 最終結論

コード側だけを見るなら、本日時点でローンチ判定は **READY** と整理できます。  
しかし、商用 30 日カリキュラム商品として判断する場合、教材が **LAUNCH-BLOCK** のため、**全体判定は DO NOT LAUNCH** です。

クリティカルパスはコードではなく教材改修です。  
`docs/evidence/2026-04-18/curriculum-ideal-plan.md` にある **24.0 人日**の全面改稿を完了し、再監査で blocker 解消を確認するまでは、販売開始判断を行うべきではありません。
