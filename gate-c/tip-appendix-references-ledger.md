# Gate C 目視台帳(tip検証) — appendix_参考資料.pdf (10頁)

- 検査者: devin-fc85e1e5e2e749e2a7aaa1c0f4dbc94a
- 検査日: 2026-10-10
- 対象PDF: `artifacts/pdf/appendix_参考資料.pdf` @ `devin/source40-pdf-artifacts` `5881e2f71267aebd996abb0ceba8174e03707365` (tip再ビルド・mermaid font-measure fix後)
- SHA256照合: `2cda346ce990`(先頭12桁 = manifest値・実測一致。pdf-manifestの頁数10も一致)
- 方法: poppler(pdftoppm)で全10頁を100dpi PNG化し1頁ずつ目視(10頁×1チャンク)。
- 結果: **must 0件 / suggest 7件 / ok 3件**(全10/10頁検査済)
- 明細JSON: `gate-c/tip-appendix-references-pages.json`

## verdict 別ページ一覧

- **must**: なし
- **suggest**: p4, p5, p6, p7, p8, p9, p10
- **ok**: p1, p2, p3

## must(納品不可級)

なし。

## suggest(納品可だが修正推奨)

全て既知の組版パイプライン共通問題(裸URL脚注)。本冊は参考リンク集のため脚注が構造的に多く、全38件が説明文なしのURL単体脚注(endnote式)。

- **p4**: 脚注1-2(React公式・Next.js docs)
- **p5**: 脚注3-9(TypeScript・Tailwind・shadcn/ui・Radix UI・Lucide・Recharts・TanStack Query)
- **p6**: 脚注10-15(react-hook-form・tRPC・Prisma・PostgreSQL・Zod・v3.zod.dev)
- **p7**: 脚注16-21(jose・bcryptjs・Git・Biome・Vitest・Vercel)
- **p8**: 脚注22-29(Docker・MDN・JS Primer・サバイバルTypeScript・React/Next.jsチュートリアル・Prisma・SQLBolt)
- **p9**: 脚注30-35(Git・Learn Git Branching・Vitest・Testing Library・VS Code・pgAdmin)
- **p10**: 脚注36-38(React DevTools・Google Drive×2 — `vie`/`w?usp=drivesdk`語途中改行)

## 健全性

- 目次5項目の頁番号と実頁一致(公式ドキュメント→p4 / 学習リソース→p8 / 便利なツール→p9 / 戻る→p10 / 奥付→p10 を実頁で確認)
- ノンブル2-10連続・全頁ヘッダー帯あり・真っ白頁なし
- 図1-図3の実機スクリーンショット(ダッシュボード・プロジェクト一覧・レポート画面)全て描画
- 表5本(フロントエンド・バックエンド・認証・開発ツール・便利なツール)の全セル描画・表頭行が跨頁で正しく再掲・URL列の折返し(`lang.org/docs/`・`prisma.`/`io/docs`等)は単語途中でも可読で欠落なし
- 脚注番号*1-*38が本文参照と連続対応(跳号・欠番なし)・本文側の参照箇所と注記側URLの対応が全件一致
- 奥付(タイトル/著者 磯貝光佑/第1版 2026年9月19日/© 2026・再配布禁止文言)完読
