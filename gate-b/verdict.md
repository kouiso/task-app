# Gate B 判定 — 30日カリキュラム写経再現 (2026-10-10)

## 判定: FAIL（現状の教材では写経のみで day30 完走できない）

教材 `devin/source40-input-pack` の day01-30 を機械適用ツールで日次に再現し、
各日 `npx tsc --noEmit` + `npm run dev` 起動 + HTTP ルートスモークを実施した。

## 結果サマリ (正本 run: logs/v15/)

| 区間 | tsc エラー | 起動・描画 |
|---|---|---|
| day01-15 | 0 / 30日全日 clean | 全日 DEV_OK（/・/login・/dashboard 等 200/307、HTTP 500 ゼロ) |
| day16-27 | 2（taskTimeUpdateSchema 宣言順) | 起動 OK |
| day28-30 | 5 | 起動 OK・全ルート応答 |

day30 残存 5 エラー:
- `src/app/task/page.tsx:502-504` bulkComplete / bulkDelete / bulkUpdateStatus — task.ts に procedure が未実装
- `src/server/api/routers/task.ts:420` taskTimeUpdateSchema used before its declaration（宣言順）

## 残 gap の分類（v15 ledger 29 件）

### A. 教材側の実質的欠損（day30 を落とす主因）
1. **day28 task.ts bulk 手続き** — 教材の task.ts 追記フェンス内容が完成版 oracle と一致せず
   （fragment-not-in-baseline）。bulkComplete/bulkDelete/bulkUpdateStatus が未実装のまま
   day28 以降 task/page.tsx から参照される。教材執筆者側で task.ts 差分を完成版から
   逆生成して直す必要がある。
2. **day16 task.ts schema 配置** — `（taskRouter の前に追加）` / `（delete の直後に追加）`
   という位置指定フェンスがあり、注意深い読者は正しく置けるが、機械的写経では
   use-before-declare になる。フェンス本文に `filepath:` と構造アンカーの両方を
   書き、写経確実性を上げるべき。

### B. 教材 vs 完成版の drift（コンパイルは通るが差分未適用として残る）
- `src/component/layout/app-layout.tsx` ×8日: 各日の追記断片が完成版と一致せず
- `.env.example` ×2, `dashboard`/`project`/`profile`/`task`/`login`/`task-dialog` 各1日
- いずれも tsc は通る（当該日に完成版 listing が先行適用済み or 任意改修）

### C. 存在しないファイルへの差分提示（4件）
- `src/test/setup.ts`, `app-layout.test.tsx`, `page-query-state.test.tsx`,
  `registration-complete.test.tsx` — scaffold が生成しないファイルへの差分フェンス

### D. 教材演出上の抜粋（無害、記録のみ）
- day16 `src/app/task/page.tsx` 抜粋確認フェンス（読者確認用・適用対象外として正しく記録）

## ツール検証経緯（append-only）
- v14 (前担当): day01-07 clean / day07-30 esbuild loader 構文バグで全滅 → 当方で再生成
- v15: 正本 run。unmarked-continuation join + spread-safe ellipsis + 完成形/kansei-run
  候補 + coverage oracle (r2≥0.30 + divergent-listing 救済)。day1-15=0、day30=5。
- v16-v19: splice 位置精度の改善試行（position-fraction → ctx-scored anchor →
  directive-based placement + units → 位置のみ）。task.ts 手続き内部の断片は
  機械 splice の限界が残り、v15 を超えられず。logs/v19/ に試行ログを併置。

## 検証環境
- macOS arm64 / node v22.22.2 / PostgreSQL 16（隔離クラスタ localhost:25532, db=taskapp）
- Vercel 実デプロイは対象外（指示どおり）
- 証跡: audit/gate-b-repro-2026-10-10/logs/{v15,v19}/ + tools/apply_day_v19.py + tools/run_days.sh

## 結論
- day1-15 は教材どおりに完全再現（写経合格水準）。
- day16-30 の完走には **教材の修正が必須**: 最小で day28 の task.ts bulk 手続き
  フェンスの完成版一致化。推奨で day16 の位置指定フェンスの強化・drift 断片の整理。
- 「写経テストの完走」は品質手段 — A が残る限り現状教材は販売基準未達。
