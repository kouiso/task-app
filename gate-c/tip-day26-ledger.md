# Gate C 目視検査レジャー — day26（tip @5881e2f7）

- 対象PDF: `artifacts/pdf/day26_エラーページを作って、バグを退治しよう.pdf`（179ページ）
- 検査日: 2026-10-10 / 検査者: devin-c044457da7ac4654b82c1970be1f1002
- sha256-12: `8fc0656f84f1`（manifest 一致、artifacts/evidence/pdf-manifest.json @5881e2f7）
- 方法: pdftoppm -r 100 で全ページ PNG 化 → 3×3 コンタクトシートで全ページ目視 + pdftotext/pdffonts によるテキスト層事前スキャン
- 結果: **must 0 / suggest 2 / ok 177**

## day26 の状態報告（既知欠陥冊について）

**存在する。179ページ。内容は正常（sane）。** 旧版で未確定欠陥だった再構築区間は tip 上で完全に描画されている:

- Step 2.5「通信エラーを画面の状態として扱う」（読み目安55分、p21-90）が目次・本文・テストコード一式まで途切れなく存在する
- src/lib/query-error.ts の判定関数群（isAuthError/isForbiddenError/shouldRetryQuery）・5状態テスト（app-layout.test.tsx, page-query-state.test.tsx, dashboard/page.test.tsx, my-task/page.test.tsx, report/page.test.tsx, registration-complete.test.tsx の6ファイル）が全て収録
- Day 15/17/25 への逆参照（writeSubmission・`enabled: !authExpired`・プロフィール判定関数共有）が内容レベルで一貫
- Step 1-7（error.tsx / not-found.tsx / バグA Optional Chaining / バグB useEffect依存配列 / バグC console.log / DevTools / Biome lint）・通信エラー対応後の完成コード（dashboard/page.tsx・my-task/page.tsx・report/page.tsx・query-error.ts 全量一覧 p109-174）・つまずき・用語集・理解チェック・追加課題・次回予告・奥付まで欠落なし

## 検出ページ

| page | verdict | finding |
|---|---|---|
| 178 | suggest | 脚注に Drive 共有リンクの裸 URL（既知タイポ問題と同型） |
| 179 | suggest | 同上（奥付ページ上部の脚注 URL 一覧2〜6） |

## 観点別メモ

- **Mermaid**: 図2（デバッグの流れ, p6）・図3（error/not-found 分岐, p14）ともに再ビルド後の描画でラベル欠落なし。
- **スクリーンショット図版**: 図1（404, p5）・図4（404画面, p15）・図5（エラー画面, p21）すべて正常。
- **ブランクページ/ヘッダ**: 異常なし。全ページで `Day 26: エラーページを作ってバグを退治しよう` ヘッダ＋ページ番号。
- **コードブロック**: 長尺の完成コード一覧（p109-174）を含め折り返し破損・行欠落なし。マルチページ継続コードも `// 続き n/N` マーカーで明示。
- **裸URL**: p178-179 の脚注のみ（前述）。本文中の localhost:3000 等は手順・コード内の正常な参照。
- **置換文字（�）**: 検出なし。**フォント**: 全埋め込み。
