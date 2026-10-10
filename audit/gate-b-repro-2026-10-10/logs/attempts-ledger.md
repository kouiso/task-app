# Gate-B 再現パイプライン — 試行台帳

| 試行 | 目的 | 失敗/検出 | 原因 | 対策 | 結果 |
|---|---|---|---|---|---|
| scaffold (repro) | Day01 正規手順 | なし | Docker 不在 | 教材の正規スキップ分岐(psql/pg_isready)で隔離PG代替 | scaffold 完走・db:push/seed・dev HTTP200 |
| v1 (repro) | 全断片連結適用 | day02以降 tsc壊滅 | 同日同pathに完全リスティング複数(before/after)・非ファイル名filepath混入 | v2でセグメント化+path検証 | 68 err |
| v2 (repro再) | 最終セグメント採用 | diff型断片で構文破壊 | `（変更なし）`/`...`省略断片を全置換扱い | v3でoracle splice | 28 err |
| v3 (repro再) | baseline anchor照合splice | next.config.ts 等で誤full-listing | 中間差分断片が brace-balanced で complete判定 | esbuild構文オラクル追加+diff断片をsplice経路へ | 走行中 |
| Codex env 起票 | Gate-B外部実行 | 5タスク全ERROR | 指定envがedu-creator束縛 | task-app束縛env 69f338aeへ撃ち直し | 2本完了 |
| Codex Gate-B実行 | 外部再現 | install全滅 | Node20(要22)+npm403+Docker無し | 自環境(macOS+node22+隔離PG)へ切替=本パイプライン | 継続中 |

## 未解決・台帳項目
- day別 gaps=35件: diff断片が完成版に非含有(教材↔完成版のドリフト候補) / anchor不在
- 残り破壊ファイル(想定): next.config.ts, routers/{task,project,search}.ts, app/task/page.tsx
- Codex Day26 再送: task_e_6aca2b7fdd04833193a1411a94c08bbd
- Gate-C PDFアーカイブ入力待ち(36冊・ZIP内0冊)

## v14 (clean-snapshot restore + kansei-run join) — FINAL mechanical run
- fix: esbuild loader removal (4c6b5016), idempotent splice, import-guard, export-guard,
  kansei-piece run-join (non-kansei pieces inside a 完成版 run are joined via seg-run rule)
- result: day01-07 tsc=0 (day07 previously had login gaps — now clean),
  day08=1 (app-layout nonexistent gap) → ramp to day30=24 residual
- residual root causes (classified vs原文):
  1. src/component/layout/app-layout.tsx NEVER created (day08/13/21/25 pieces are
     unbalanced section-diffs: '>', AlertDialogContent fragments) → cascades ~11 import
     errors across pages. Parser join fails → correctly ledgered as
     diff-fragments-for-nonexistent-file = MATERIAL GAP candidate (reader would need
     full-file paste the material doesn't provide in coherent form)
  2. src/server/api/routers/report.ts never created (day21) — same class
  3. day01 globals.css listing itself unclosed: 3 chunks ending mid-@theme block
     (--color-sidebar-primary, no closing brace; no .dark/@layer) = MATERIAL DEFECT:
     PostCSSSyntaxError → dev server 500 on ALL pages [verified dev smoke]
  4. residual implicit-any / export errors in later-day pages (same cascade class)
- runtime ops: dev server up; / 307→/login, /dashboard 307 (middleware OK),
  but /login + /register = 500 due to globals.css defect (root cause = item 3)
- build: fails on missing app-layout module (cascade of item 1)
