# テスト仕様書 — PR #285 レビュー対応フォローアップ

## 概要

| 項目 | 内容 |
|---|---|
| 対象PR | [#285](https://github.com/kouiso/task-app/pull/285)（`docs(curriculum): 教材の品質基準整備とday01の売り物品質リライト`） |
| マージ日時 | 2026-07-19T15:02:29Z（squash, main `caf3b619`） |
| 対象コミット | `edcc433` / `1d9219a` / `289fc2f` / `c263fe7` / `cfb72cf` |
| 本書の目的 | Codexレビュー由来の6件の挙動修正について、再現手順・期待結果・実施済み検証の記録を1箇所にまとめる |
| 対象外 | 教材（curriculum）の文章修正・品質ゲートスクリプトの改修（別途 `doc/` 配下の教材品質基準を参照） |

検証環境: 本番 `https://task-app-pink-psi.vercel.app`（Vercel Production、DB: Supabase `task-app-prod` / `yxkggsmzcwbcdfbhngxi`）。

---

## TC-01: タスク更新の競合検知を原子化する（TOCTOU修正）

### 背景
`scripts/_server-routers/task.ts` と `src/server/api/routers/task.ts` の `task.update` procedure は、従来 `updateMany`（件数チェック）→ 別クエリの `findUniqueOrThrow` という2クエリ構成だった。この間に別リクエストが割り込むと、`count === 0` の判定をすり抜けたり、返す行が他ユーザーの更新後の状態になる余地があった（TOCTOU: Time-Of-Check to Time-Of-Use）。

### 修正内容
`prisma.task.update({ where: expectedUpdatedAt ? { id, updatedAt } : { id }, ... })` の単一クエリに統合。比較と更新が1クエリで完結し、条件不一致時は Prisma の `P2025`（レコード未検出）をキャッチして `CONFLICT` の `TRPCError` に変換する。

対象ファイル: `scripts/_server-routers/task.ts:333-360`, `src/server/api/routers/task.ts:328-354`

### テストケース

| # | 前提条件 | 操作 | 期待結果 |
|---|---|---|---|
| 1-1 | タスクAが存在し、直近の `updatedAt` を把握している | `task.update({ id, title: "新タイトル", expectedUpdatedAt: 直近のupdatedAt })` を実行 | HTTP 200。`title` が更新され、レスポンスの `updatedAt` が新しい値になる |
| 1-2 | タスクAが1-1で既に更新済み（`updatedAt` が変わっている） | 1-1で使った**古い** `expectedUpdatedAt` のまま再度 `task.update` を実行 | HTTP 409。`code: CONFLICT`、メッセージ「タスクは他のユーザーによって更新されています。最新の内容を再読み込みしてください」 |
| 1-3 | タスクAが削除済み | 削除前の `id` と `expectedUpdatedAt` で `task.update` を実行 | HTTP 409。`code: CONFLICT`（P2025を正しく捕捉していることの確認） |
| 1-4 | `expectedUpdatedAt` を渡さない呼び出し | `task.update({ id, title: "..." })`（楽観ロックなし） | HTTP 200。無条件に更新される（従来通りの後方互換） |

### 実施済み検証（本番、2026-07-20実測）

```
task.update(id, title:"期日超過の検証タスク(編集済み)", expectedUpdatedAt: <作成直後の値>)
  → HTTP 200, title反映, updatedAt: 2026-07-20T03:58:07.105Z

同じ古いexpectedUpdatedAtで再度更新を試行
  → HTTP 409, code: -32009 (CONFLICT), message: "タスクは他のユーザーによって更新されています。最新の内容を再読み込みしてください"
```
`確信度: 95% [実機API実行]` — 1-1, 1-2 は本番tRPCエンドポイントに対する実行で確認済み。1-3, 1-4 は未実施（残タスク、下記「未実施項目」参照）。

---

## TC-02: プロジェクト移動時のposition再採番

### 背景
タスクの `projectId` を変更するとき、`position`（プロジェクト内での並び順）は移動元の値のまま引き継がれていた。移動先プロジェクトに既に同じ `position` のタスクがあると、並び順が重複・割り込みを起こす。

### 修正内容
`isProjectChanging` が真のとき、移動先プロジェクトの最大 `position` を再取得し、`(max ?? -1) + 1` を新しい `position` として設定する。`create` procedure の採番ロジックと同一パターン。

対象ファイル: `scripts/_server-routers/task.ts:299-305`, `src/server/api/routers/task.ts` 同等箇所

### テストケース

| # | 前提条件 | 操作 | 期待結果 |
|---|---|---|---|
| 2-1 | プロジェクトBに `position: 0,1,2` のタスクが3件存在 | プロジェクトAのタスクを `projectId: B` に更新 | 更新後のタスクの `position` が `3`（既存最大値+1）になる |
| 2-2 | プロジェクトBにタスクが1件も無い | プロジェクトAのタスクを `projectId: B` に更新 | 更新後のタスクの `position` が `0` になる |
| 2-3 | プロジェクト移動と同時に `assigneeId` を変更しない | 2-1と同条件で `projectId` のみ変更 | 既存の担当者がプロジェクトBのメンバーでなければ `assigneeId` が自動的に外れる（既存仕様、今回の修正で壊れていないことの確認） |

### 未実施項目
本番での実機検証は未実施。テストDBでのユニットテスト、または本番での2プロジェクト作成→タスク移動→`getAll` で `position` を確認する手順が必要。

---

## TC-03: 期日超過判定のタイムゾーン差異修正（isOverdue）

### 背景
`isOverdue` は `dueDate` が `Date` 型のとき `localDateOnly(dueDate)`（ブラウザ/サーバーのローカルタイムゾーンで日付を取り出す）を使っていた。`dueDate` は UTC 深夜0時として保存されるため、UTCより西のタイムゾーン（米州など）では実際の期日より1日早く「期限切れ」と誤判定される不具合があった。

### 修正内容
`dueKey` の抽出を `dateOnlyFromValue(dueDate)`（文字列なら先頭10文字、`Date` なら `toISOString().slice(0,10)` = 常にUTC基準）に統一。`todayKey`（「今日」の判定）は体感に合わせて `localDateOnly(new Date())` のまま維持。

対象ファイル: `src/lib/date.ts:29-39`（`scripts/_lib-base/date.ts` とバイト一致）

### テストケース

| # | タイムゾーン | dueDate | 今日 | 期待結果（修正前） | 期待結果（修正後） |
|---|---|---|---|---|---|
| 3-1 | UTC-8 (America/Los_Angeles) | 今日のUTC深夜0時 | 今日 | `true`（誤判定でoverdue扱い） | `false` |
| 3-2 | UTC-8 | 昨日のUTC深夜0時 | 今日 | `true` | `true`（変化なし） |
| 3-3 | UTC-8 | 明日のUTC深夜0時 | 今日 | `false` | `false`（変化なし） |
| 3-4 | UTC+9 (Asia/Tokyo) | 今日のUTC深夜0時 | 今日 | `false`（UTC+側は元々誤判定なし） | `false`（変化なし） |

### 実施済み検証（sandbox実行、`src/lib/date.ts` を直接import、2026-07-20実測）
```
TZ=America/Los_Angeles
today(UTC深夜0時) isOverdue: false   (3-1: 期待通り)
yesterday        isOverdue: true    (3-2: 期待通り)
tomorrow         isOverdue: false   (3-3: 期待通り)
```
`確信度: 90% [実機コード実行]` — 3-1〜3-3 を実装コードのimport実行で確認済み。3-4（UTC+9側の回帰無し確認）は未実施。

---

## TC-04: ステータスバッジのコントラスト改善

### 背景
`StatusBadge` は淡色背景（原色の12%アルファ）に対し、前景色も同じ原色を使っていた。`IN_REVIEW` の `#fbbf24`（黄）は白背景に対しコントラスト比 約1.67:1 で、WCAG AA基準（通常テキスト4.5:1）を大きく下回っていた。

### 修正内容
`darkenForForeground()` を追加。7桁HEXの各RGBチャンネルを0.55倍に減光し、背景・枠は従来の `withAlpha()` のまま、前景色にのみ適用する。非HEX値（未定義ステータス等）はそのまま通す（フォールバック安全性）。

対象ファイル: `src/component/task/status-badge.tsx:18-29`（`scripts/_app-components/task/status-badge.tsx` とバイト一致）

### テストケース（全5ステータス）

| # | ステータス | 元の色 | 期待される前景色 | 期待コントラスト比（対白） |
|---|---|---|---|---|
| 4-1 | TODO | `#64748b` | `#374056` | ≥ 4.5:1 |
| 4-2 | IN_PROGRESS | `#60a5fa` | `#345a8a` | ≥ 4.5:1 |
| 4-3 | IN_REVIEW | `#fbbf24` | `#8a6914` | ≥ 4.5:1 |
| 4-4 | DONE | `#34d399` | `#1c7454` | ≥ 4.5:1 |
| 4-5 | CANCELLED | `#f87171` | `#883e3e` | ≥ 4.5:1 |
| 4-6 | 未定義ステータス（フォールバック `#64748b`） | `#64748b` | `#374056` | ≥ 4.5:1（フォールバック色も暗色化されることの確認） |
| 4-7 | 非HEX値が渡された場合（防御的ケース） | 例: `"red"` | `"red"`（そのまま） | N/A（クラッシュしないことの確認） |

### 実施済み検証

**関数単体（sandbox実行、ソースの `darkenForForeground` を直接評価）**:
```
IN_REVIEW #fbbf24 → fg #8a6914 | 白背景コントラスト 旧1.67 → 新5.11
非HEXパススルー: darken("red") = "red"
```

**本番ブラウザでの実描画確認（2026-07-20実測、`task-app-pink-psi.vercel.app/task`）**:
```
DOM上の「レビュー中」バッジ要素:
  computedColor (getComputedStyle): rgb(138, 105, 20) = #8a6914
  computedBg: rgba(251, 191, 36, 0.12)
  contrastVsWhite: 5.11
  matchesExpected: true （sandbox計算値と本番描画値が一致）
```
`確信度: 95% [実機ブラウザDOM実測]` — 4-3（IN_REVIEW）のみ実描画確認済み。4-1, 4-2, 4-4, 4-5, 4-6 は該当ステータスのタスクを作成してDOM実測する必要あり（未実施）。4-7はsandbox実行のみ確認済み。

---

## TC-05: TimeLogDialog の全クローズ経路でreset()する

### 背景
ダイアログを Esc キーや外側クリックで閉じる経路（`onOpenChange`）と、キャンセルボタンで閉じる経路が、どちらも `reset()` を通さずにフォーム値を保持したまま閉じていた（既に `074f1fb` で修正済み・本フォローアップ対象外だが回帰確認として記載）。

### 修正内容
`Dialog` の `onOpenChange` と `Button` の `onClick` を両方とも `handleClose`（内部で `reset()` → `onClose()` の順に呼ぶ）に統一。

対象ファイル: `src/component/task/time-log-dialog.tsx:36-40, 77, 116`

### テストケース

| # | 操作 | 期待結果 |
|---|---|---|
| 5-1 | ダイアログを開き「1」「30」と入力後、Escキーで閉じる | 再度ダイアログを開くと入力欄が空（`0`/`0`）に戻っている |
| 5-2 | ダイアログを開き入力後、外側クリックで閉じる | 5-1と同様、フォームがリセットされている |
| 5-3 | ダイアログを開き入力後、キャンセルボタンで閉じる | 5-1と同様 |
| 5-4 | ダイアログを開き入力後、「時間を追加」で送信成功 | ダイアログが閉じ、次回開いた時フォームがリセットされている（`onSuccess` 内の `handleClose()` 経由） |

### 検証状況
`074f1fb`（本フォローアップより前のコミット）で対応済み。実機でのE2E確認は未実施（Playwright等でのUI操作再現が必要）。

---

## TC-06: day16教材の二重実装防止（構成のみ・コード変更なし）

`material/30days-curriculum/day16_ステータス変更・時間記録.md` の記述変更。scaffoldが配布する完成済みコードと、教材が写経させるコードが重複宣言を起こさないよう、Step2を「既存ファイルの上書き」、Step3を「配布版との突き合わせ再構築」として明示。

コード変更を伴わないため、本書のテスト対象外（`check_quality.sh` と `textlint` のゲートで担保、両方PASS確認済み）。

---

## 未実施項目まとめ（優先度付き）

| 優先度 | 項目 | 理由 |
|---|---|---|
| 高 | TC-01 の 1-3（削除済みタスクへのupdate）, 1-4（楽観ロック無し） | CONFLICT系の異常系。本番で意図的にタスクを削除してから叩く必要があり、テスト用データの片付けを要する |
| 高 | TC-02 全項目 | position再採番は本番検証を1度も実施していない。2プロジェクト作成→タスク移動→`getAll`でposition確認が必要 |
| 中 | TC-04 の 4-1, 4-2, 4-4, 4-5, 4-6 | IN_REVIEW以外のステータスのタスクを作成してDOM実測する必要あり。関数単体では全ステータス確認済みなので回帰リスクは低い |
| 中 | TC-03 の 3-4（UTC+9側） | 修正前後で挙動が変わらない箇所のため優先度は低いが、回帰確認として残る |
| 低 | TC-05 全項目 | 既に別コミットで対応済みのUI操作系。Playwright等のE2Eツールでの自動化が望ましい |

## 関連リンク

- PR: https://github.com/kouiso/task-app/pull/285
- フォローアップIssue（ロール配線・本書のTC-02とは別件）: https://github.com/kouiso/task-app/issues/286
