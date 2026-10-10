# Gate C 目視台帳(tip検証) — appendix_用語集.pdf (16頁)

- 検査者: devin-fc85e1e5e2e749e2a7aaa1c0f4dbc94a
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/appendix_用語集.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365` (tip再ビルド・mermaid font-measure fix後)
- SHA256照合: `2a0947c60ad4`(先頭12桁 = manifest値・実測一致。pdf-manifestの頁数16も一致)
- 方法: poppler(pdftoppm)で全16頁を100dpi PNG化し1頁ずつ目視(16頁×1チャンク)。
- 結果: **must 0件 / suggest 1件 / ok 15件**(全16/16頁検査済)
- 明細JSON: `gate-c/tip-appendix-glossary-pages.json`

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p16
- **ok**: p1-p15

## must(納品不可級)

なし。

## suggest(納品可だが修正推奨)

- **p16**: 脚注1-2が裸URLのみ(Google Drive共有リンク・`vie`/`w?usp=drivesdk`で語途中改行)。参照元*1/*2は同頁「戻る」節の「カリキュラム目次」「学びのロードマップ」。endnote式組版共通問題。冊固有欠陥なし。

## 健全性

- 目次10項目の頁番号と実頁一致(フロントエンド関連→p3 / フォーム関連→p7 / バックエンド関連→p8 / レポート・可視化関連→p11 / 認証関連→p11 / 開発ツール関連→p12 / データベース関連→p14 / アーキテクチャ関連→p15 / 戻る→p16 / 奥付→p16 を実頁で確認)
- ノンブル2-16連続・全頁ヘッダー帯あり・真っ白頁なし
- 用語サマリー表5本(フロントエンド・フォーム・バックエンド他)の全セル描画・定義文と「例え・代表例」列の対応ずれなし
- 全インラインコード(`useForm({ resolver: zodResolver(loginSchema) })`/`projectRouter`/`taskRouter`/`config.matcher`/`schema.prisma`/`userId`/`email`/`'use client'`/`useState`/`register`/`package.json`/`expect(1 + 1).toBe(2)`/`.env`/`users`/`tasks`/`cm1abc2def3ghi4jkl5mno6pqr`/`fetch`/`fs`等)の着色・字欠けなし
- 図3(tRPC経由タスク一覧の実機スクリーンショット)描画あり・図版番号と本文参照一致
- 各用語の「初出は Day XX です」のDay参照が本文と整合(例: react-hook-form/zod → Day 05)
- 奥付(タイトル/著者 磯貝光佑/第1版 2026年9月19日/© 2026・再配布禁止文言)完読
