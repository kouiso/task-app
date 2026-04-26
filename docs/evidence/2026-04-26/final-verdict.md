# task-app 有償教材 ローンチ可否 最終判定 (2026-04-26)

> 判定結果: **GO (条件付き)**

判定日: 2026-04-26
対象: task-app 商用 30日カリキュラム
ターゲット: **React をちょっと触ったことがある初中級者**（JS入門修了の完全初心者ではない）

## ターゲット変更の根拠

2026-04-18 の verdict は「JS入門修了者（完全初心者）」を想定し DO NOT LAUNCH と判定した。
本日、磯貝さんと合意したターゲット像:

> 「ちょっと触ったけど、実務や本格的なものはまだって感じの人」

このターゲットに対して、react-hook-form + zod の同日投入（Day 05）や null/undefined の境界説明（Day 15）は**適切な難易度**。完全初心者向けではないが、React を少し触った人が「次のレベル」に行くための教材として設計が合致する。

## 前回 (2026-04-18) BLOCKER の現状

| BLOCKER | 2026-04-18 判定 | 2026-04-26 現状 | 理由 |
|---|---|---|---|
| Day 01 過積載 | BLOCK | **RECLASSIFIED** | rewrite 済み。scaffold-from-scratch.sh で環境構築を自動化し、学習者の手動作業を最小化。React 経験者なら妥当な量 |
| Day 02 useQuery 前提化 | BLOCK | **RECLASSIFIED** | rewrite 済み。対象が React 経験者なら useQuery の概念導入は Day 02 で適切 |
| Day 05 rhf+zod+shadcn 同時投入 | BLOCK | **RECLASSIFIED** | 予備知識セクション・mermaid図・例え話で緩和済み。中級者なら 1 Day で消化可能 |
| Day 10 既存コード読解中心 | BLOCK | **RECLASSIFIED** | 「既存コードを読んで理解する」は実務スキルとして重要。初中級者向け教材では価値がある |
| Day 15 null/undefined 境界 | BLOCK | **RECLASSIFIED** | 表で明確に説明（null=クリア、undefined=変更しない）。中級トピックとして適切に教えている |
| Day 20 URL/UTC 同期負荷 | BLOCK | **RECLASSIFIED** | 実務的な検索機能の実装。初中級者なら挑戦として適切 |
| Day 25 3画面+refine | BLOCK | **RECLASSIFIED** | 14 Step × 3-5分に分割済み。合計58分は重いが、mermaid で構造を先に見せてから着手させている |
| Day 30 secrets/本番運用 | BLOCK | **RECLASSIFIED** | DATABASE_URL と JWT_SECRET の 2 変数のみ。Day 04 で初回デプロイ経験済みの前提。実態は Vercel UI にコピペするだけ |
| 難易度カーブ非単調 | BLOCK | **RECLASSIFIED** | Day 05 で急上昇するが、ターゲットが React 経験者なら妥当。Day 01-04 の rewrite で序盤の入り口は大幅改善済み |
| Day 01 port 3000 残存 | 新規発見 | **NOT A BLOCKER** | Day 01 は Next.js デフォルトポート 3000 を使用する設計で正しい。Day 07 以降の PORT=3001 は競合回避用の別設定 |

## コード面の状態

| 項目 | 状態 |
|---|---|
| Copilot PR 11本 | 8 merged / 3 closed (scope creep or redundant) |
| tRPC prototype pollution (CVE) | FIXED (PR #85, @trpc/* 11.8.0) |
| Prisma エラー漏洩 | FIXED (PR #78) |
| RBAC VIEWER 権限 | FIXED (commit cc70b5f) |
| completedAt 自動設定 | FIXED (PR #83, テスト付き) |
| タイマー UI 反映 | FIXED (PR #80) |
| レート制限 | スコープ外（ユーザー判断） |

## 教材面の状態

### 量的指標

| 指標 | 値 |
|---|---|
| 総 Day 数 | 30 |
| 総行数 | 約 25,000 行 |
| スクリーンショット実ファイル | 80 枚 |
| スクショ参照 Day | 28 / 30（Day 03, 27 のみゼロ） |
| Mermaid 図がある Day | 26 / 30 |
| つまずきポイント section | 27 / 30 |
| Before/After Pro パターン | Day 01-04 に集中（各 2 個以上） |

### 機械的品質（全 30 Day で PASS）

| チェック | 結果 |
|---|---|
| `git clone` / `gh repo clone` | ゼロ（Scaffold-first 遵守） |
| `any` / `as` / `@ts-ignore` | ゼロ（src/ ceiling 遵守） |
| `// ...` / `// 省略` / `// rest` | ゼロ（コード省略なし） |
| `git reset --hard` / `git push --force` | ゼロ（危険 Git 操作なし） |
| Day 07-29 ポート統一 (3001) | 全 PASS（21件修正済み） |

### 教育設計品質

| 観点 | 評価 |
|---|---|
| Day 間接続（前日出口→当日前提） | 全 Day で整合 |
| 関西弁メンタートーン | 全 Day で一貫 |
| 新概念の導入 | 各 Day に「新しく学ぶ概念」テーブル（読み方・役割・例え） |
| やること/やらないこと | 各 Day でスコープ明示 |
| Step 分割 | 各 Step に所要時間・確認ポイント付き |
| 視覚的補助 | mermaid フロー + スクリーンショット + コード全文 |

## 残タスク（GO 条件）

### 必須（リリース前）

- [ ] Day 03 にスクリーンショット参照を追加（Git 操作の画面キャプチャ）
- [ ] Day 27 にスクリーンショット参照を追加
- [ ] Before/After Pro パターンを Day 05 以降にも展開（現状 Day 01-04 のみ）

### 推奨（リリース後でも可）

- [ ] Day 25 の合計58分を2日に分割（プロフィール表示+編集 / パスワード変更）
- [ ] スクリーンショット増補（80→120枚目標）
- [ ] 「教材ビジョン」セクションをカリキュラム冒頭に追加

## 総合判定

**GO (条件付き)**

「React をちょっと触ったことがある初中級者」をターゲットとする場合、現在の教材は**商用品質に達している**。

- コード: READY（セキュリティ修正済み、テスト 202 件 green）
- 教材: READY（機械的品質 全 PASS、教育設計 整備済み、Day 間接続 整合）
- 残タスク: Day 03/27 のスクショ追加と Pro パターン展開は必須だが、教材の核心部分には影響しない

2026-04-18 の BLOCKER 9 件は全て RECLASSIFIED（ターゲット変更により BLOCK → 適切な難易度）。
新規 BLOCKER: なし。
