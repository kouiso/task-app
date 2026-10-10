# Gate C 目視台帳(tip検証) — appendix_トラブルシューティング.pdf (21頁)

- 検査者: devin-fc85e1e5e2e749e2a7aaa1c0f4dbc94a
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/appendix_トラブルシューティング.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365` (tip再ビルド・mermaid font-measure fix後)
- SHA256照合: `4cf1350761c8`(先頭12桁 = manifest値・実測一致。pdf-manifestの頁数21も一致)
- 方法: poppler(pdftoppm)で全21頁を100dpi PNG化し1頁ずつ目視(21頁×1チャンク)。
- 結果: **must 0件 / suggest 3件 / ok 18件**(全21/21頁検査済)
- 明細JSON: `gate-c/tip-appendix-troubleshooting-pages.json`

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p7, p8, p21
- **ok(note付き)**: p20
- **ok**: 上記以外の全頁

## must(納品不可級)

なし。

## suggest(納品可だが修正推奨)

全て既知の組版パイプライン共通問題(裸URL脚注)。冊固有欠陥なし。

- **p7**: 脚注1が裸URLのみ(VS Code公式ダウンロード `https://code.visualstudio.com/download`)
- **p8**: 脚注2が裸URLのみ(VS Code WSL手順 `https://code.visualstudio.com/docs/remote/wsl`)
- **p21**: 脚注3-4が裸URLのみ(Google Drive共有リンク・`vie`/`w?usp=drivesdk`で語途中改行)。参照元の*3/*4はp20「戻る」節の「目次: カリキュラム目次」「全体の地図: 学びのロードマップ」。

## ok(note付き)

- p20: 「戻る」節の脚注参照*3/*4に対応する注記が次頁(p21奥付)下部に置かれるendnote式配置。注文自体は欠落なし。

## 健全性

- 目次5項目の頁番号と実頁一致(よくあるエラー→p5 / 一般的なエラーと対処法→p18 / デバッグのコツ→p20 / 戻る→p20 / 奥付→p21 を実頁で確認)
- ノンブル2-21連続・全頁ヘッダー帯あり・真っ白頁なし
- 図1-図3の実機スクリーンショット(ログイン画面・正常起動時ダッシュボード・タスク一覧)全て描画
- 全コードブロック(.env設定5行・unset3行・cd/bash2行・Module not found・Hydration Error等)と全インラインコード(`COMPOSE_PROJECT_NAME`/`_TASKAPP_SCAFFOLD_DB_OWNER`/`npm run db:seed`/`utils.task.getAll.invalidate()`/`tsc --noEmit`等)の着色・字欠けなし。コマンド・ポート番号(36532-36537)の誤植・切断なし
- 警告ボックス(p13 `npm run db:seed` 実行前の注意)が枠内に完全収容
- 奥付(タイトル/著者 磯貝光佑/第1版 2026年9月19日/© 2026・再配布禁止文言)完読
