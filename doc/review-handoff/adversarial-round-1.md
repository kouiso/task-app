# 敵対レビュー 第1回

2026年9月21日時点で公開判定は不合格です。
Driveは更新していません。新しい36冊は生成できていません。

比較元はB `edec7b73`、移植候補はA `7814ffb7` です。
作業先は `material/final-20260921` です。
Aの作業領域は変更していません。

## 差分の全件判定

次の表はAとBの全139差分です。改名は1件と数えます。
`edu-creator` の差分はありません。指定版は `c78e2904` です。
サブモジュール初期化はGit管理領域の書込み拒否で失敗しました。
同じローカルGitオブジェクトから指定版を展開しています。

「要協議」は未採用です。改善したという意味ではありません。
未採用の本文修正は、下の教材別判定に理由を残しました。

| ファイル | 判断 | 理由 |
|---|---|---|
| `Makefile` | Bを維持 | Bの配布先マップ既定値と追加検査を保ちます。 |
| `README.md` | Bを維持 | Day26でテストを作る説明はBが正しいため、Aの範囲外という説明へ戻しません。 |
| `doc/ZIP_CONTENTS.md` | Aを部分移植 | DB所有印と回復処理を追加しました。Bの配布先は維持します。ZIP別判定を参照してください。 |
| `doc/review-handoff/day-snapshots-result.md` | Bを維持 | Bの配布ID、出荷時の記録、対応表を保ちます。Aの旧内容や削除へ戻しません。 |
| `doc/review-handoff/evidence-20260918/delivery-note.md` | Bを維持 | Bの配布ID、出荷時の記録、対応表を保ちます。Aの旧内容や削除へ戻しません。 |
| `doc/review-handoff/evidence-20260918/drive-metadata.json` | Bを維持 | Bの配布ID、出荷時の記録、対応表を保ちます。Aの旧内容や削除へ戻しません。 |
| `doc/review-handoff/evidence-20260918/pdf-link-map.json` | Bを維持 | Bの配布ID、出荷時の記録、対応表を保ちます。Aの旧内容や削除へ戻しません。 |
| `doc/review-handoff/evidence-20260918/release-build-receipt.json` | Bを維持 | Bの配布ID、出荷時の記録、対応表を保ちます。Aの旧内容や削除へ戻しません。 |
| `doc/review-handoff/evidence-20260918/release-manifest.json` | Bを維持 | Bの配布ID、出荷時の記録、対応表を保ちます。Aの旧内容や削除へ戻しません。 |
| `docker-compose.yml` | Aを部分移植 | DB所有印と回復処理を追加しました。Bの配布先は維持します。ZIP別判定を参照してください。 |
| `material/30days-curriculum/00-1_学びのロードマップ.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/00_カリキュラム目次.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/appendix_トラブルシューティング.md` | Bを維持し、DB復旧対応だけ移植 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md` | Bを維持し、DB復旧対応だけ移植 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day02_ダッシュボードに自分だけのメッセージを追加しよう.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day03_GitHubに保存する.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day04_ネットに公開.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day05_ログイン画面のUI.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day06_ユーザー登録画面.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day07_認証バックエンドを作ろう.md → material/30days-curriculum/day07_ログイン体験を改善しよう.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day08_サイドバーを完成させよう.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day09_プロジェクト一覧画面.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day10_プロジェクト新規作成.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day11_プロジェクト編集・削除.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day12_メンバー追加.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day13_タスク一覧画面.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day14_タスク新規作成.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day15_タスク編集・削除.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day16_ステータス変更・時間記録.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day17_自分のタスクページ.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day19_コメント編集・削除.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day20_タスク検索機能.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day21_統計カードを表示.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day22_グラフを表示.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day23_週次レポート.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day24_ユーザー一覧（管理者用）.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day25_プロフィール編集.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day26_エラーページを作って、バグを退治しよう.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day27_プロジェクト詳細・アーカイブを実装しよう.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day28_タスク一括操作を実装しよう.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day29_ユーザー詳細・編集ページを作ろう.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/day30_完成版を公開！.md` | Bを維持。表の候補は要協議 | 下の教材別判定を参照してください。DB復旧の2原稿だけ必要箇所を移植しました。 |
| `material/30days-curriculum/screenshots/day01-vscode-open.png` | Bを維持、Aは要協議 | 画像の本文・OSとの対応を再検証していないため、差し替えません。 |
| `material/release-correspondence.json` | Bを維持 | Bの配布ID、出荷時の記録、対応表を保ちます。Aの旧内容や削除へ戻しません。 |
| `material/style/book.css` | Aを移植 | 脚注番号と表の折返しを生成器にそろえます。最終の見た目は未検証です。 |
| `scripts/_app-components/project/project-detail-view.tsx` | Bを維持 | 差分は折返しやコメントの言換えです。挙動の改善がないためBを保ちます。 |
| `scripts/_docker/docker-compose.yml` | Aを部分移植 | DB所有印と回復処理を追加しました。Bの配布先は維持します。ZIP別判定を参照してください。 |
| `scripts/_seed/seed.ts` | Bを維持 | 差分は折返しやコメントの言換えです。挙動の改善がないためBを保ちます。 |
| `scripts/_server-routers/task.ts` | Bを維持 | 差分は折返しやコメントの言換えです。挙動の改善がないためBを保ちます。 |
| `scripts/build-zip.sh` | Aを部分移植 | DB所有印と回復処理を追加しました。Bの配布先は維持します。ZIP別判定を参照してください。 |
| `scripts/curriculum-qa/_tmp-chatgpt-api.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-api2.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-chat.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-convs.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-dl.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-dl2.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-dl3.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-dl4.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-dl5.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-dl6.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-dl7.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-find.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-inspect.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-list.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-list2.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-login.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-login2.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-login3.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-login4.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-reply.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-reply3.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-scroll.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-search.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-share.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-share2.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-share3.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-top.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-chatgpt-wait.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-convs-h.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-dump-selection.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-neon-conn.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-neon-conn2.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-neon-conn3.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-neon-conn4.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-neon-conn5.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-neon-create.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-neon-list.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-neon-probe.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-read-share.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-vercel-auth.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-vercel-token.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-verify-deploy.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/_tmp-verify-error-ui.mjs` | Bを維持 | Aのセッション用スクリプトです。移植も梱包もしません。 |
| `scripts/curriculum-qa/check-sale-package.sh` | Aを部分移植 | DB所有印と回復処理を追加しました。Bの配布先は維持します。ZIP別判定を参照してください。 |
| `scripts/curriculum-qa/check_complete_code.py` | Bを維持 | Bの完成コード照合、JSXマーカー、所要時間、Day30公開手順の検査を保ちます。Aに戻すと検査を失います。 |
| `scripts/curriculum-qa/check_jsx_marker.py` | Bを維持 | Bの完成コード照合、JSXマーカー、所要時間、Day30公開手順の検査を保ちます。Aに戻すと検査を失います。 |
| `scripts/curriculum-qa/check_quality.sh` | Bを維持 | Bの完成コード照合、JSXマーカー、所要時間、Day30公開手順の検査を保ちます。Aに戻すと検査を失います。 |
| `scripts/curriculum-qa/check_step_time.py` | Bを維持 | Bの完成コード照合、JSXマーカー、所要時間、Day30公開手順の検査を保ちます。Aに戻すと検査を失います。 |
| `scripts/curriculum-qa/test_build_zip.py` | Aを部分移植 | DB所有印と回復処理を追加しました。Bの配布先は維持します。ZIP別判定を参照してください。 |
| `scripts/curriculum-qa/test_check_complete_code.py` | Bを維持 | Bの完成コード照合、JSXマーカー、所要時間、Day30公開手順の検査を保ちます。Aに戻すと検査を失います。 |
| `scripts/curriculum-qa/test_check_jsx_marker.py` | Bを維持 | Bの完成コード照合、JSXマーカー、所要時間、Day30公開手順の検査を保ちます。Aに戻すと検査を失います。 |
| `scripts/curriculum-qa/test_check_step_time.py` | Bを維持 | Bの完成コード照合、JSXマーカー、所要時間、Day30公開手順の検査を保ちます。Aに戻すと検査を失います。 |
| `scripts/curriculum-qa/test_day30_release_instructions.py` | Bを維持 | Bの完成コード照合、JSXマーカー、所要時間、Day30公開手順の検査を保ちます。Aに戻すと検査を失います。 |
| `scripts/curriculum-qa/test_scaffold_database.py` | Bを維持 | Bの完成コード照合、JSXマーカー、所要時間、Day30公開手順の検査を保ちます。Aに戻すと検査を失います。 |
| `scripts/curriculum-qa/test_scaffold_failure_recovery.py` | Bを維持 | Bの完成コード照合、JSXマーカー、所要時間、Day30公開手順の検査を保ちます。Aに戻すと検査を失います。 |
| `scripts/pdf-book/build_pdf_book.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/check_page_layout.py` | Bを維持 | Bの欠冊検出と検査範囲の説明を保ちます。 |
| `scripts/pdf-book/check_pdf_book.py` | Bを維持 | Bの欠冊検出と検査範囲の説明を保ちます。 |
| `scripts/pdf-book/code_wrap.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/inline_layout.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/inline_layout_css.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/pdf-link-map.json` | Bを維持 | Bの配布ID、出荷時の記録、対応表を保ちます。Aの旧内容や削除へ戻しません。 |
| `scripts/pdf-book/release_manifest.py` | Bを維持 | BのZIPを含む配布照合と更新順序の検査を保ちます。 |
| `scripts/pdf-book/table-layout.json` | Aの設定は保留 | Day02の原稿ハッシュがBと一致しません。設定を空にし、旧設定を証拠に保存しました。 |
| `scripts/pdf-book/table_layout_override.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/test_book_links.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/test_build_receipt.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/test_code_wrap.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/test_inline_layout.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/test_inline_layout_css.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/test_release_manifest.py` | Bを維持 | BのZIPを含む配布照合と更新順序の検査を保ちます。 |
| `scripts/pdf-book/test_table_layout_override.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/test_verify_pdf_copy.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/upload_drive.py` | Bを維持 | BのZIPを含む配布照合と更新順序の検査を保ちます。 |
| `scripts/pdf-book/verify-inline-layout.mjs` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/verify-inline-layout.test.mjs` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/verify-inline-pdf.mjs` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/verify-inline-pdf.test.mjs` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/pdf-book/verify_pdf_copy.py` | Aを移植 | 下のPDF別判定を参照してください。生成候補であり、組版の承認ではありません。 |
| `scripts/scaffold-from-scratch.sh` | Aを部分移植 | DB所有印と回復処理を追加しました。Bの配布先は維持します。ZIP別判定を参照してください。 |
| `scripts/verify-scaffold-database.cjs` | Bを維持 | 出荷済みBの内容と検証を保ちます。今回の改善に不要な巻き戻しは採りません。 |
| `src/app/dashboard/page.tsx` | Bを維持 | 出荷済みBの内容と検証を保ちます。今回の改善に不要な巻き戻しは採りません。 |
| `src/app/my-task/page.tsx` | Bを維持 | 出荷済みBの内容と検証を保ちます。今回の改善に不要な巻き戻しは採りません。 |
| `src/app/task/page.tsx` | Bを維持 | 出荷済みBの内容と検証を保ちます。今回の改善に不要な巻き戻しは採りません。 |
| `src/command/seed.ts` | Bを維持 | 出荷済みBの内容と検証を保ちます。今回の改善に不要な巻き戻しは採りません。 |
| `src/component/task/task-card.tsx` | Bを維持 | 出荷済みBの内容と検証を保ちます。今回の改善に不要な巻き戻しは採りません。 |
| `src/lib/session.test.ts` | Bを維持 | 出荷済みBの内容と検証を保ちます。今回の改善に不要な巻き戻しは採りません。 |
| `src/server/api/routers/__test/search.test.ts` | Bを維持 | 出荷済みBの内容と検証を保ちます。今回の改善に不要な巻き戻しは採りません。 |
| `src/server/api/routers/task.ts` | Bを維持 | 出荷済みBの内容と検証を保ちます。今回の改善に不要な巻き戻しは採りません。 |

## 教材別の採否

# 教材差分の判定

A は `7814ffb7`、B は `edec7b73` です。教材Markdownの差分は32ファイルです。Day 07の改名は1ファイルとして数えました。`material-writing/SKILL.md` を読み、全差分の変更箇所を調べました。組版と実行はこの調査の対象外です。下記の「移植」は候補です。採用済みはDay01と付録のDB復旧対応だけです。

## 共通の判定

- Aの「つまずきポイント」の表を小見出しへ変える案は、組版後に判定します。長いエラー文の列をなくせますが、ページ数と見出しの孤立は未確認です。Bの本文を保って構成だけ変える方法を推奨します。
- 「追加課題：」から「応用課題:」への変更、括弧・感嘆符・空白だけの変更は採りません。内容を改善せず、B内の表記を崩すためです。
- Aが挿入した同じ権限説明の繰り返しは採りません。Day 11・12・27では型の宣言やルーターの説明にも同文が入り、直前のコードを説明していません。
- 完成版との差を伝えるBの注記は残します。差が消えたという根拠なく削ると、読者に同一コードだと誤解させます。

## ファイルごとの判定

対象はすべて `material/30days-curriculum/` 配下です。

| ファイル | 判定 | 理由と対象 |
|---|---|---|
| `00-1_学びのロードマップ.md` | Bを維持 | Aの7区分はBの目次の8区分と合いません。Day 17とDay 24–25の所属も変わります。 |
| `00_カリキュラム目次.md` | Bを維持 | Aはbcryptjsをbcryptへ戻し、Day 26のテストを範囲外と書きます。Day 11のアーカイブ、Day 16の編集ダイアログ、Day 27のインライン詳細も古い説明へ戻ります。Day 07の改名と更新日の巻き戻しも採りません。 |
| `appendix_トラブルシューティング.md` | 部分移植 | DB所有印・別フォルダ衝突・重複印の回復手順は、ZIPの保護処理と一緒に移植します。作業時間0の説明はBを維持します。保存ボタンが無効になる実装を確認しました。 |
| `day01_開発環境を整えて、初めてのアプリを動かそう.md` | 部分移植 | sudo、VS Codeの導入、WSLの `code .`、空白を含むZIPパス、複数行if、scaffoldファイルの確認、DB衝突時の案内は初心者の操作を補います。VS Code画像の移動は対応画像と一緒に採ります。`@plugin "tailwindcss-animate"` の削除は採りません。Bの依存と説明を残します。トラブル表は組版待ちです。 |
| `day02_ダッシュボードに自分だけのメッセージを追加しよう.md` | 表のみ要組版 | 差分はトラブル表の段落化と課題見出しです。本文・見出しはBを維持します。 |
| `day03_GitHubに保存する.md` | 部分移植 | Git導入の確認、UbuntuのCLI案内、確認項目の2→3、`.env.example`の例外、noreply案内、直前の未送信コミットの修正条件は改善です。READMEフェンスの結合は長さゲートを見て決めます。トラブル節の「.envの行がない」はAにも古い説明が残るため、本編に合わせて直す必要があります。 |
| `day04_ネットに公開.md` | Bを維持、表は要組版 | AのG0/G1表記は目次のPhase表記と合いません。トラブル表の段落化だけが候補です。 |
| `day05_ログイン画面のUI.md` | Bを維持、表は要組版 | `router.push`の説明をCookie保存前の競合へ戻す根拠がありません。Bのキャッシュ説明を残します。 |
| `day06_ユーザー登録画面.md` | Bを維持、表は要組版 | HTTPS公開済みの日はDay 04です。AのDay 30まで暗号化されないように読める説明とDay 07リンク改名を採りません。 |
| `day07_認証バックエンドを作ろう.md` → Aの `day07_ログイン体験を改善しよう.md` | 改名拒否、表は要組版 | 内容は認証バックエンド作成でありBの名前が一致します。関連リンクと36冊の入力名もBを保ちます。session/authの完成版との差の説明を削りません。 |
| `day08_サイドバーを完成させよう.md` | 部分移植 | useQueryエラー時のauth登録・Route Handler・サーバー出力の順の確認は改善です。モバイル対応を範囲外へ戻す変更、Day 07改名は採りません。表は要組版です。 |
| `day09_プロジェクト一覧画面.md` | Bを維持、表は要組版 | Aは4か所でキャンセル済みタスクを進捗の分母へ戻します。説明もその古い計算に戻るため拒否します。`string \| null`のHTML表記化はPDFパーサーの実出力で要否を決めます。 |
| `day10_プロジェクト新規作成.md` | Bを維持、表は要組版 | 完成形でキャンセル済みタスクを分母へ戻す変更を拒否します。 |
| `day11_プロジェクト編集・削除.md` | Bを維持、表は要組版 | 権限表・undefined表・props表の列削減は組版候補です。集計の巻き戻し、権限説明の反復、`role="alert"`の理由の削除は拒否します。HTMLのパイプ表記は実出力で判断します。 |
| `day12_メンバー追加.md` | Bを維持、表は要組版 | エクスポート表の2列化とprops表の段落化は候補です。Bの「getByIdの直後」「権限計算の直後」という挿入位置を残します。Aは宣言前参照を誘発し得ます。完成形だけarchive条件を先に変える変更と集計の巻き戻しも拒否します。 |
| `day13_タスク一覧画面.md` | Bを維持、表は要組版 | 感嘆符の半角化は不要です。トラブル表以外に意味の改善はありません。 |
| `day14_タスク新規作成.md` | Bを維持、表は要組版 | Aはフィルター適用中にも「最初のタスクを作成」と出します。Bの条件付き表示を保ちます。 |
| `day15_タスク編集・削除.md` | Bを維持、表は要組版 | Day 14と同じ空結果の表示条件を残します。 |
| `day16_ステータス変更・時間記録.md` | Bを維持、表は要組版 | Aの65分→26分には実測根拠がありません。Day 13で導入済みのuseCallbackを再追加させる説明も戻しません。 |
| `day17_自分のタスクページ.md` | 表のみ要組版 | 差分はトラブル表の段落化だけです。これは型一覧など別の表を直した証拠にはなりません。 |
| `day19_コメント編集・削除.md` | Bを維持 | 本文の `canEditComments` は直前のJSXと一致します。Aの `canEditProject` は関数名であり、この条件式の説明として不正確です。完成版の差の注記も残します。 |
| `day20_タスク検索機能.md` | Bを維持 | 完成版TaskCardの時間記録propsが異なる説明を残します。Aは注記を削るだけです。 |
| `day21_統計カードを表示.md` | Bを維持 | Bの `TASK_STATUS_LABELS.TODO` は「未対応」です。Aの「未着手」は表示と合いません。 |
| `day22_グラフを表示.md` | Bを維持 | Aの色値はBの定数と合いません。現在のTODOとLOWは `#5f6777` です。LOWが代替色 `#9e9e9e` と同じという説明も誤りです。Aに表の列幅修正はありません。 |
| `day23_週次レポート.md` | Bを維持、表は要組版 | `byStatus`を「優先度別」へ変えるのは項目名と集計に反します。完成版のURL・再試行・CSVの差の注記を残します。 |
| `day24_ユーザー一覧（管理者用）.md` | Bを維持 | Prismaのnameは `String?` なのでnull説明を残します。第二サーバーの `PORT=3001` を消しません。「利用者」への置換は改善の根拠がなく、Day 23の導入説明もBを残します。 |
| `day25_プロフィール編集.md` | Bを維持 | パスワード条件の短縮だけでは改善になりません。読み上げ属性、長い名前、空画像の完成版差分を削りません。 |
| `day26_エラーページを作って、バグを退治しよう.md` | Bを維持、表は要組版 | Aのコメント順序・句読点と末尾カンマ変更はこの段階では不要です。トラブル表のみ候補です。 |
| `day27_プロジェクト詳細・アーカイブを実装しよう.md` | Bを維持、表は要組版 | 5列の手順表を3列へ減らす案は候補です。Day 12からarchive条件を書き換える手順を削ると、B読者のコードが変わりません。反復説明と完成版差分の削除は拒否します。 |
| `day28_タスク一括操作を実装しよう.md` | Bを維持、表は要組版 | Aは空一覧の中央寄せと条件付き作成案内を削ります。Bの状態表示を残します。コメントの入れ替えは不要です。 |
| `day29_ユーザー詳細・編集ページを作ろう.md` | 部分移植、完成形はBを維持 | 次節に個別判定を記載します。 |
| `day30_完成版を公開！.md` | 部分移植、主要本文はBを維持 | Neonと他DBの変数名の区別、Production Branchの確認、HSTSの範囲、healthy表示の説明、応答ヘッダーの確認項目は候補です。Previewへ同値を入れる指示、完成確認の項目削除、30コミットで毎日作業の証明とする記述、17ページ固定の主張は拒否します。CRUD開始日もDay 10を保ちます。卒業画面サンプルの分割と課題見出しの変更は不要です。 |

## Day 29の個別判定

1. Step 9の「次のuseMutation」という誤った予告は直します。AのようにStep 10へ案内し、早期リターンより前に追加する理由をStep 10へ置けます。
2. JSX内のfilepathコメント2か所を `{/* ... */}` にする変更は移植候補です。コメントを実行コードへ混ぜたときの表示を防ぎます。
3. 読み比べ用サンプルの `avatar?: string | null` と `values.avatar || null` は移植します。Bの実装は `normalizeAvatarValue` を使いますが、サンプルだけ `undefined` では画像を消せません。
4. サンプルの `USER_ROLE_VALUES` は実装側とそろうため移植候補です。管理者の本人編集ではrole/isActiveを送れない説明も追加できます。
5. server pageとclient componentを分けたシーケンス図は移植します。Bの図は同じコンポーネントがawait paramsとフォーム操作をするように描いています。Q1の本文はBを保ちます。Aには「再読み込し」という誤字があります。
6. 完成コード5ファイルを巨大なコピー単位へ結合する案は採りません。Aは日付型、404の再試行、権限境界、form.reset、invalidateなどの理由を大量に削ります。Bの分割と説明を維持し、未収録の完成ルーター部分が必要なら別に検証します。
7. 取得状態の説明の置換は一括移植しません。Aは説明位置とコードがずれる箇所があります。一方、Bの「hasRequiredDataで片方の情報を隠さない」は、実際には両方のデータを要求する条件なら不正確です。この文章はコードと照合して個別修正する余地があります。
8. Day 29の細い列はAの差分から修正済みと判定できません。実組版が必要です。

## 確認した根拠と未確認

全体差分は `/private/tmp/material-ab.diff`、段落化したトラブル節を省いた作業用索引は `/private/tmp/material-ab-compact.diff` にあります。後者は全差分の代わりには使えません。

現行ツリーの `src/lib/constant/status.ts`、`src/lib/constant/priority.ts`、`prisma/schema.prisma`、`src/component/task/time-log-dialog.tsx`、Day 19・29本文、package.jsonを照合しました。外部サービスの現在の画面、各OSの新規セットアップ、PDFの見え方は未確認です。移植候補を検証済みとは扱いません。

## 今回反映した範囲

2026年9月21日に親担当から指定されたDB保護対応だけを反映しました。

- Day 01は3か所です。初期セットアップの順序を新しいDB検査に合わせました。停止時に付録を開く説明を追加しました。DATABASE_URLのポート説明では、衝突回避で変更した番号を後続手順でも使うようにしました。
- 付録は「別フォルダの DB と衝突した場合」と「DB 所有印が複数ありますと表示された場合」の2節です。Aの84行を移植しました。新しい検査スクリプトのエラーが参照する見出しと一致します。
- Day 01のVS Code導入、WSL操作、画像移動、ZIPパス引用は今回保留しました。DB保護の案内に直接必要な変更だけに絞ったためです。
- Day 01のCSSプラグインと付録の時間記録の説明はBのままです。他の日は編集していません。
- 対象2ファイルの品質ゲートは成功しました。証拠は `/private/tmp/material-db-quality.log` です。自己テストの内部には想定された失敗出力とブラウザ起動不可のskipがあります。実ブラウザ検証の成功とは扱いません。
- 対象差分の空白検査は成功しました。コミットはしていません。
- 全 `material/**/*.md` のtextlintも終了コード0で成功しました。標準出力・標準エラーの記録先は `/private/tmp/material-db-textlint.log` です。成功時は出力がないため、ログは空です。Node 22.22.2を明示して実行しました。

## 生成器と配布ZIPの採否

PDFのHTML一覧を設定から渡す処理はBにもあります。
その処理を今回初めて直したとは扱いません。
今回は行内コードの識別・実寸検査・脚注番号を追加しました。
表の列配分は候補を作る処理です。可読性の合格判定ではありません。

AのDay02列幅設定は原稿ハッシュがBと一致しませんでした。
ハッシュだけ更新せず、設定を空にしています。
旧設定は `dist/review-round-1/line-a-table-layout.json` に保存しました。
Day02も次回の実組版で再検査が必要です。

PDF単体テストが実ツールを再導入する欠陥も直しました。
テストのツール準備を模擬化し、実ビルドとの干渉を止めました。
元の入力不変検査、欠冊検出、配布ID照合は残しています。
独立レビューは `dist/review-round-1/pdf-review.md` にあります。

ZIPはDB所有印と起動前の照合、失敗時の復旧を移植しました。
独立レビューでIPv6だけの公開ポートを誤認する欠陥を再現しました。
IPv4の公開先を確認し、localhostも127.0.0.1へ固定しました。
修正前はDB検査33件中7つのサブケースが失敗しました。
修正後は33件すべて成功しています。
実Dockerでの新規構築は今回未実施です。
模擬Dockerの結果を実DBの初期化成功とは扱いません。

Day01と付録に新しいDB停止条件の説明を追加しました。
別担当の初心者視点レビューで、Windowsエディターの前提不足が見つかりました。
VS CodeのPATH設定とWSL拡張機能の導入・復帰手順を補いました。
公式資料は https://code.visualstudio.com/docs/remote/wsl です。
実Windowsでの操作は未実施です。

詳細は次の記録にあります。

- `dist/review-round-1/zip-reconcile.md`
- `dist/review-round-1/zip-independent-review.md`
- `dist/review-round-1/zip-final-code-review.md`
- `dist/review-round-1/db-prose-independent-review.md`
- `dist/review-round-1/zip-binding-regression-before.log`
- `dist/review-round-1/zip-binding-regression-after.log`

rootは別担当が書いたテスト隔離、IPv4修正、復旧説明を再読しました。
検査を省く変更や、既存DBを削除する案内は入っていません。

## 表の確認と未解決事項

Aの正式PDFから対象ページを画像化し、rootが読みました。
新しいB原稿の組版結果ではありません。
列幅はAの保存済みDOM計測値をmmへ換算しました。
計測元とPDFのハッシュは次の記録にあります。
`dist/review-round-1/line-a-table/measurement.json`

| 対象 | 実画像で確認したこと | 証拠 |
|---|---|---|
| Day12 p6 | 概念表の最小列は33.20mmです。このページだけで既知欠陥の箇所は特定できません。 | `line-a-table/day12-p6.png` |
| Day14 p44 | 右列が14.28mmで「条件が偽の場合」が細かく折り返されます。 | `line-a-table/day14-p44.png` |
| Day17 p43 | グループ列は13.76mmです。見出しと名称が分断されています。 | `line-a-table/day17-p43.png` |
| Day22 p8 | 段階列は7.67mmです。1文字ずつの縦長表示になります。 | `line-a-table/day22-p8.png` |
| Day29 p8 | 作業内容など4列が各15.35mmです。名称と説明が細かく分断されています。 | `line-a-table/day29-p8.png` |

画像の相対パスは `dist/review-round-1/` からです。
Day12・14・17・22・29の修正は完了していません。
新しい組版を見られないため、推測で列幅や原稿を変更していません。

候補生成はブラウザ起動前後の準備で失敗しました。
コピーしたLinux用ツールにmacOSのネイティブ部品がありません。
別に起動したmacOS用ChromiumもOS側で拒否されました。
`bootstrap_check_in` の `Permission denied (1100)` を保存しています。

- `dist/review-round-1/candidate-build.log`
- `dist/review-round-1/candidate-result.json`
- `dist/review-round-1/browser-launch.log`
- `dist/.pdf-book-build/*.inline-measurement.json`

新しい36冊、全ページPNG、最終ビルド証跡は未生成です。
旧PDFを新しい生成物としてコピーしていません。
本文全体の同値性、キャプション配置、実ビューアのコピーも未確認です。

## Day22の入力変更

過去の失敗ハッシュを履歴の入力から完全に再現しました。
変更前は `7901659e`、変更後は `eee732fa` と一致します。
Day07の改名とDay06・08の参照変更が、Day22の入力に含まれていました。
入力不変の検出は正しく動いていました。
今回の対応は、入力を固定した通し検証です。
ハッシュ検査の緩和はしていません。

- `dist/review-round-1/snapshot-historical-hash.json`
- `dist/review-round-1/investigate-snapshot-hash.py`
- `dist/review-round-1/snapshot-investigation.md`

全30日の再構築、Prisma生成、型検査、本番ビルドが成功しました。
各日の検証前後ハッシュも30日すべて一致しました。
実行後の再計算でも、現在の入力と30日すべて一致しました。
証拠は `dist/review-round-1/snapshot-current-hash-comparison.json` です。
DB保護スクリプトはこの検証の入力外です。ZIPの検査で別に確認しています。
今回の実行記録は次のJSONです。
`dist/day-snapshots/result/20260921T143703.479054Z-5fc31341ae63.json`

容量を確保するため、検証済みの日の `.next` だけを整理しました。
次の日の開始を確認してから削除し、元ソースとPrisma生成物は残しました。
各日のBUILD_IDとビルドマニフェストも保存しています。
`dist/review-round-1/snapshot-build-evidence/cleanup.jsonl` に操作を記録しました。
この検証は静的再構成です。初心者の全操作を代わりに検証したものではありません。

## コミットの制約

指定の `/usr/bin/git` でステージを試みました。
共有Git管理領域の `index.lock` 作成が権限で拒否されました。
証拠は `dist/review-round-1/git-stage.log` です。
コミットとpushはしていません。変更は作業ツリーにあります。
承認要求が禁止された環境なので、権限の追加は求めていません。

## 検査結果

証拠の基点は `dist/review-round-1/` です。
失敗した試行も残し、最後の成功と区別しています。
現行入力148件のハッシュは `review-input-manifest.json` にあります。
これは出荷用ビルド証跡ではなく、第1回のレビュー対象を特定する記録です。

| 検査 | 結果 | 証拠 |
|---|---|---|
| アプリ | 365件成功、失敗・スキップなし | `npm-test.log` |
| PDF生成器のPython単体検査 | 74件成功 | `pdf-unit.log` |
| PDF生成器のNode検査 | 3件成功、20件スキップ | `pdf-node-unit.log` |
| DB保護 | 33件成功 | `zip-database-final.log` |
| 初期構築の失敗回復 | 6件成功 | `zip-recovery-test.log` |
| ZIP生成の失敗回復 | 5件成功 | `zip-build-test.log` |
| 全30日のコード | Prisma生成・型検査・ビルドが30日成功 | `day-snapshot.log` と上記JSON |
| 全30日の文体 | 30ファイル成功 | `tone.log` |
| 全教材のtextlint | 終了コード0 | `textlint-final-2.log`、`check-result.json` |
| 品質ゲート | 34ファイルで成功。ブラウザ自己検査はスキップ | `quality-final-2.log` |
| ZIP現物 | 76ファイル。DB保護コードが原稿と一致。破損なし | `zip-final-audit.json` |

指定の `script/check_quality.sh` はありませんでした。
実在する `scripts/curriculum-qa/check_quality.sh` を使用しました。
PDF単体検査のログにある36冊の生成は模擬出力です。
正式PDFを生成した証拠には使いません。

最終ZIPは `dist/task-app-curriculum-v1.1.zip` です。
SHA-256は `09c2ca5b52f7c384a551ce52e82a5c4a47a8fab7516c9d40c570ab221a2049b5` です。
Vercel・Neonの一時スクリプトはBの追跡対象にありませんでした。
Aからは移植せず、ZIP内にないことも再検査しました。

## 7軸の判定

| 軸 | 今回の根拠 | 残る条件 |
|---|---|---|
| 技術 | アプリ365件とDB保護の回帰検査 | 実Dockerでの初期構築と全操作 |
| 初心者の再現 | DB復旧の別担当レビュー | 隔離環境で全30日と追加課題の実行 |
| 学習効果 | Bの説明と段階的な完成コードを保持 | 未採用の改善候補と全体の再読 |
| 日本語 | 全教材textlint、文体、品質検査 | 機械検査外の語り口の全件再読 |
| 章間・配布物 | Bの対応表、配布ID、完成コード検査を保持 | 新PDF・ZIP・説明の最終照合 |
| PDF | Aの5ページを再画像化し、4冊の細い列を確認 | 表修正、36冊再生成、全ページ目視 |
| 納品の再現性 | ZIP現物とハッシュを保存 | 新PDFの証跡とDrive37件照合 |

この表は点数ではありません。全条件の合格を示していません。

## Claudeへの確認事項

1. 139差分の採否を確認してください。Bの内容を戻す必要がある箇所は、原文と実装を示してください。
2. Aの表配分は、日本語の列に十分な幅を残しません。局所的な原稿再構成か配分修正か、実ページで判断してください。
3. 次の実行環境には、Chromium起動とGit管理領域への書込みが必要です。macOS用の組版依存も必要です。
4. DB保護は実DockerとWindows・Ubuntuで再検証が必要です。今回の模擬検査だけで出荷条件を満たしたとしないでください。
5. Day29などの有効な本文改善候補は未採用です。候補一覧の採否も次のラウンドで確定してください。
6. 本文全体の同値性とキャプション配置は、行内コードの検査では保証できません。独立した全ページ確認を残してください。

回答先は `doc/review-handoff/adversarial-round-1-claude.md` です。
今回は指摘ゼロのラウンドに数えません。
同じ凍結成果物で2回連続の指摘ゼロを確認するまで、Driveは更新しません。
