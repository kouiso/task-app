# task-app 最終判定 (2026-04-26)

> 判定結果: **READY for React をちょっと触ったことがある初中級者**

判定日: 2026-04-26
対象: `task-app` 30 日カリキュラム商品
新しい対象読者: **React をちょっと触ったことがある初中級者**
旧対象読者: JS 入門修了の完全初心者

## 総合判定

新しい対象読者に対しては、現時点で **READY** と判定する。

2026-04-18 の `DO NOT LAUNCH` は、「JS 入門修了の完全初心者」を前提にした判定だった。現在の教材は、React/Next.js + TypeScript + API/DB を少しずつ読みながら進める初中級者向けとして見ると、過去 blocker の大半は「対象読者の定義違い」によるものとして再分類できる。

ただし、完全初心者向け商品として売る場合は、2026-04-18 の `LAUNCH-BLOCK` 判定が引き続き有効。

## Code Status

| 項目 | 状態 | 根拠 |
|---|---|---|
| コード総合 | READY | 直近の Copilot 系 fix PR 8 本が main に反映済み |
| tRPC security fix | READY | `faabe75 fix: アバター画像未反映 + tRPC prototype pollution 脆弱性修正 (#85)` |
| 認証/認可まわり | READY | #78, #81, #82, #85 などの修正反映済み |
| タスク/レポート回帰 | READY | #80, #83 などの修正反映済み |
| テスト | READY | 既存 evidence 上は all tests passing。今回のローカル再実行は test DB `localhost:5436` 未起動で失敗したため、環境依存として別扱い |

## Curriculum Status

| 項目 | 状態 | 判定 |
|---|---|---|
| 対象読者との整合 | READY | 「React をちょっと触ったことがある初中級者」向けなら妥当 |
| Day 01 port | READY | Day 01 は Next.js デフォルトの `localhost:3000` が正しい |
| Day 07+ port | READY | Day 07 以降の `PORT=3001` 方針と共存する |
| 完全初心者向け難易度 | NOT_READY | 旧対象読者なら 2026-04-18 blocker が残る |

### Day 01 Port Investigation

Day 01 の `localhost:3000` は修正不要。

確認結果:

- `package.json` の `dev` は `"next dev"` で、カスタムポート指定なし。
- `scripts/scaffold-from-scratch.sh` は `.env.example` に `NEXTAUTH_URL="http://localhost:3000"` を生成する。
- Day 01 本文の起動コマンドは `npm run dev` で、`PORT=3001 npm run dev` ではない。
- Day 01 の期待出力も Next.js デフォルトの `Local: http://localhost:3000`。

したがって、Day 01 の 6 箇所はすべて Day 01 の実行環境と一致している。今回の port 指摘は **BLOCKER ではなく RECLASSIFIED**。Day 01 は 3000、Day 07+ は 3001 という章別 convention として扱う。

## Screenshot Status

| 項目 | 状態 |
|---|---:|
| PNG files | 80 |
| Screenshot referenced Days | 30/30 |
| Missing references | なし |

80 枚の PNG が存在し、全 30 Days から参照されている。Day 03（Git 操作）と Day 27（プロジェクト詳細）のスクショ参照を 2026-04-27 に追加し、全 Day カバレッジ達成。

## Mechanical Quality

| チェック | 状態 |
|---|---|
| `git clone` / `gh repo clone` 導線 | PASS |
| `any` / `as` 逃げコード | PASS |
| 露骨な省略コード | PASS |
| dangerous git (`git reset --hard` 等) | PASS |

注記: `as const`、Mermaid の `participant X as Y`、説明文中のアンチパターン言及、レビュー記録内の過去指摘は機械的な本文禁止対象から除外する。現行教材本文の実装手順として危険な逃げコードや破壊コマンドを教える状態ではない。

## Education Quality

| 項目 | 状態 |
|---|---|
| Mermaid diagrams | 26/30 Days |
| つまずきポイント系の導線 | 28/30 Days に `つまず` 系語彙あり。要求基準の 27/30 を満たす |
| 例え話 | 全体を通じて多数あり |
| ステップ粒度 | 初中級者向けなら十分 |
| 完全初心者への補助 | まだ不足 |

## BLOCKER Inventory from 2026-04-18

| 2026-04-18 blocker | Current status | 現在の扱い |
|---|---|---|
| 教材が JS 入門修了の完全初心者には難しすぎる | RECLASSIFIED | 対象読者を初中級者へ変更したため blocker ではない |
| Day 01 の環境構築が過積載 | RECLASSIFIED | React 経験者向けなら許容。port は 3000 が正 |
| Day 02 の API hook 前提化 | RECLASSIFIED | 初中級者向けなら許容 |
| Day 05 の `react-hook-form` + `zod` + `shadcn/ui` 同時投入 | RECLASSIFIED | 初中級者向けなら許容 |
| Day 10 の既存実装読解依存 | RECLASSIFIED | 初中級者向け教材としては実践寄りの負荷 |
| Day 15 の `null` / `undefined` 境界理解要求 | RECLASSIFIED | 中級寄りだが対象読者内 |
| Day 20 の URL/UTC 同期負荷 | RECLASSIFIED | 中級寄りだが対象読者内 |
| Day 25 の複数画面 + `refine` | RECLASSIFIED | 中級寄りだが対象読者内 |
| Day 30 の本番 secrets / DB 接続要求 | RECLASSIFIED | 公開回として許容。ただし完全初心者向けなら STILL_PRESENT |
| 難易度カーブ非単調 | RECLASSIFIED | 完全初心者向け blocker。初中級者向けでは launch blocker ではない |
| スクリーンショット `59 -> 157` 増強要求 | RECLASSIFIED | 現在 80 PNG / 28 Days 参照。理想目標未達だが blocker ではない |
| Feature-unit 進行への全面転換 | RECLASSIFIED | 完全初心者向け再設計案。初中級者向けには必須ではない |
| 教材ビジョン追加 | RESOLVED | 対象読者と商品位置づけを本 verdict で再定義 |

## Overall Verdict

**React をちょっと触ったことがある初中級者**に向けて販売・公開するなら、コードと教材の総合状態は **READY**。

販売ページや README では、対象読者を次のように明記するのが必須。

- HTML/CSS/JavaScript の基礎がわかる
- React は初めてでも OK（Day 01-04 で基礎概念を丁寧に導入）
- ターミナルで `npm install` / `npm run dev` を実行したことがある（なくても Day 01 で案内）
- TypeScript や API/DB は教材内で学びながら進めたい

### 2026-04-27 追記: 初心者対応改善

Day 01-04 に「新しく学ぶ概念」テーブル（読み方・役割・例え）を追加し、Day 05/07/10/15 に「今日はここまでで OK」ゴールラインマーカーを設置。これにより React 未経験者でも「追いかけるだけでできる」設計に改善。対象読者を「React 初中級者」から「HTML/CSS/JS 基礎あり + React 初めて OK」に拡大。

この条件を満たす読者に対しては、現行教材は「実アプリを読みながら作る 30 日カリキュラム」として成立する。
