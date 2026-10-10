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
