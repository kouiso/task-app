#!/usr/bin/env bash
# 2つのチェックを1つの run: に置くと、前半が落ちた時点で bash -e が
# 打ち切って後半が一度も走らない。レビューで「片方しか見えていない」
# 状態を毎回作るため、終了コードを個別に受けて最後にまとめて落とす。
terms_status=0
crossref_status=0
selftest_status=0
why_status=0
variants_status=0
steptime_status=0
anchor_status=0
procorder_status=0
stepref_status=0
scan_status=0
tagbal_status=0
unclosedscreen_status=0
falsesuccess_status=0
zipref_status=0
unusedimg_status=0
jsxmarker_status=0
jalinebreak_status=0
salepkg_status=0
setext_status=0
quiz_status=0
scaffoldsync_status=0
versplit_status=0
fencedup_status=0
echo "::group::test_sale_package.py — 配布物一覧そのものの退行テスト"
python3 scripts/curriculum-qa/test_sale_package.py || salepkg_status=$?
echo "::endgroup::"
echo "::group::test_markdown_scan.py — フェンス解釈そのものの退行テスト"
python3 scripts/curriculum-qa/test_markdown_scan.py || scan_status=$?
echo "::endgroup::"
echo "::group::test_check_crossref.py — 参照検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_crossref.py || selftest_status=$?
echo "::endgroup::"
echo "::group::test_check_variants.py — 書き分け検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_variants.py || variants_status=$?
echo "::endgroup::"
echo "::group::check_variants.py — 同じ語が2通りに書かれていないか"
python3 scripts/curriculum-qa/check_variants.py material/30days-curriculum || variants_status=$?
echo "::endgroup::"
echo "::group::test_check_step_time.py — 所要時間検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_step_time.py || steptime_status=$?
echo "::endgroup::"
echo "::group::check_step_time.py — ステップ表の合計と本文の合計時間が合うか"
python3 scripts/curriculum-qa/check_step_time.py material/30days-curriculum || steptime_status=$?
echo "::endgroup::"
echo "::group::test_check_anchor.py — 書き込み先検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_anchor.py || anchor_status=$?
echo "::endgroup::"
echo "::group::check_anchor.py — コードブロックの書き込み先が分かるか"
python3 scripts/curriculum-qa/check_anchor.py material/30days-curriculum || anchor_status=$?
echo "::endgroup::"
echo "::group::test_check_procedure_order.py — 手続きの順番検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_procedure_order.py || procorder_status=$?
echo "::endgroup::"
echo "::group::check_procedure_order.py — まだ書いていない手続きを呼んでいないか"
python3 scripts/curriculum-qa/check_procedure_order.py material/30days-curriculum || procorder_status=$?
echo "::endgroup::"
echo "::group::test_check_step_ref.py — Step 参照検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_step_ref.py || stepref_status=$?
echo "::endgroup::"
echo "::group::check_step_ref.py — 本文が指す Step が実在するか"
python3 scripts/curriculum-qa/check_step_ref.py material/30days-curriculum || stepref_status=$?
echo "::endgroup::"
echo "::group::test_check_tag_balance.py — 閉じタグ検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_tag_balance.py || tagbal_status=$?
echo "::endgroup::"
echo "::group::check_tag_balance.py — 開いた JSX タグが30日のどこかで閉じるか"
python3 scripts/curriculum-qa/check_tag_balance.py material/30days-curriculum || tagbal_status=$?
echo "::endgroup::"
echo "::group::test_check_unclosed_screen.py — 未完成画面検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_unclosed_screen.py || unclosedscreen_status=$?
echo "::endgroup::"
echo "::group::check_unclosed_screen.py — 閉じ切っていないファイルの画面を見せていないか"
python3 scripts/curriculum-qa/check_unclosed_screen.py material/30days-curriculum || unclosedscreen_status=$?
echo "::endgroup::"
echo "::group::test_check_false_success.py — 偽の完了宣言検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_false_success.py || falsesuccess_status=$?
echo "::endgroup::"
echo "::group::check_false_success.py — 閉じていないのに完了を宣言していないか"
python3 scripts/curriculum-qa/check_false_success.py material/30days-curriculum || falsesuccess_status=$?
echo "::endgroup::"
echo "::group::test_check_zip_reference.py — 照合先検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_zip_reference.py || zipref_status=$?
echo "::endgroup::"
echo "::group::check_zip_reference.py — 販売ZIPに無いものと見比べさせていないか"
python3 scripts/curriculum-qa/check_zip_reference.py material/30days-curriculum || zipref_status=$?
echo "::endgroup::"
echo "::group::test_check_unused_image.py — 未参照画像検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_unused_image.py || unusedimg_status=$?
echo "::endgroup::"
echo "::group::check_unused_image.py — どこからも参照されない画像が無いか"
python3 scripts/curriculum-qa/check_unused_image.py material/30days-curriculum || unusedimg_status=$?
echo "::endgroup::"
echo "::group::test_check_jsx_marker.py — JSX 位置の目印検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_jsx_marker.py || jsxmarker_status=$?
echo "::endgroup::"
echo "::group::check_jsx_marker.py — JSX の位置に // の目印が残っていないか"
python3 scripts/curriculum-qa/check_jsx_marker.py material/30days-curriculum || jsxmarker_status=$?
echo "::endgroup::"
echo "::group::test_check_ja_line_break.py — 日本語の折り返し検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_ja_line_break.py || jalinebreak_status=$?
echo "::endgroup::"
echo "::group::check_ja_line_break.py — 日本語の文が JSX の中で途中改行されていないか"
python3 scripts/curriculum-qa/check_ja_line_break.py material/30days-curriculum || jalinebreak_status=$?
echo "::endgroup::"
echo "::group::test_check_setext_heading.py — 区切り線検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_setext_heading.py || setext_status=$?
echo "::endgroup::"
echo "::group::check_setext_heading.py — 区切り線のつもりの --- が見出しになっていないか"
python3 scripts/curriculum-qa/check_setext_heading.py material/30days-curriculum || setext_status=$?
echo "::endgroup::"
echo "::group::test_check_quiz.py — 理解チェックの形の検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_quiz.py || quiz_status=$?
echo "::endgroup::"
echo "::group::check_quiz.py — 理解チェックが全30日に3問ずつ同じ形であるか"
python3 scripts/curriculum-qa/check_quiz.py material/30days-curriculum || quiz_status=$?
echo "::endgroup::"
echo "::group::test_check_scaffold_src_sync.py — 配布物と本体の突き合わせ検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_scaffold_src_sync.py || scaffoldsync_status=$?
echo "::endgroup::"
echo "::group::check_scaffold_src_sync.py — 読者が受け取る配布物がリポジトリ本体とズレていないか"
python3 scripts/curriculum-qa/check_scaffold_src_sync.py || scaffoldsync_status=$?
echo "::endgroup::"
echo "::group::test_check_version_split.py — 完成版分断検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_version_split.py || versplit_status=$?
echo "::endgroup::"
echo "::group::check_version_split.py — 完成版の並びを注記なしブロックが分断していないか"
python3 scripts/curriculum-qa/check_version_split.py material/30days-curriculum || versplit_status=$?
echo "::endgroup::"
echo "::group::test_check_complete_section_fences.py — 完成コード節の二重記述検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_complete_section_fences.py || fencedup_status=$?
echo "::endgroup::"
echo "::group::check_complete_section_fences.py — 完成コード節が1ファイル1権威記述になっているか (#631)"
python3 scripts/curriculum-qa/check_complete_section_fences.py material/30days-curriculum || fencedup_status=$?
echo "::endgroup::"
echo "::group::test_check_why.py — 説明の分量検査そのものの退行テスト"
python3 scripts/curriculum-qa/test_check_why.py || why_status=$?
echo "::endgroup::"
echo "::group::check_why.py — コードの直後に理由が書かれているか"
python3 scripts/curriculum-qa/check_why.py material/30days-curriculum || why_status=$?
echo "::endgroup::"
echo "::group::check_terms.py — 同じ概念が2通りの表記に割れていないか"
python3 scripts/curriculum-qa/check_terms.py material/30days-curriculum || terms_status=$?
echo "::endgroup::"
echo "::group::check_crossref.py — 前の日を指す参照の先が実在するか"
python3 scripts/curriculum-qa/check_crossref.py material/30days-curriculum || crossref_status=$?
echo "::endgroup::"
if [ "$terms_status" -ne 0 ] || [ "$crossref_status" -ne 0 ] || [ "$selftest_status" -ne 0 ] || [ "$why_status" -ne 0 ] || [ "$variants_status" -ne 0 ] || [ "$steptime_status" -ne 0 ] || [ "$anchor_status" -ne 0 ] || [ "$procorder_status" -ne 0 ] || [ "$stepref_status" -ne 0 ] || [ "$scan_status" -ne 0 ] || [ "$tagbal_status" -ne 0 ] || [ "$unclosedscreen_status" -ne 0 ] || [ "$falsesuccess_status" -ne 0 ] || [ "$zipref_status" -ne 0 ] || [ "$unusedimg_status" -ne 0 ] || [ "$salepkg_status" -ne 0 ] || [ "$jsxmarker_status" -ne 0 ] || [ "$jalinebreak_status" -ne 0 ] || [ "$setext_status" -ne 0 ] || [ "$quiz_status" -ne 0 ] || [ "$scaffoldsync_status" -ne 0 ] || [ "$versplit_status" -ne 0 ] || [ "$fencedup_status" -ne 0 ]; then
  echo "::error::Gate 4 失敗 (test_sale_package.py=$salepkg_status / check_terms.py=$terms_status / check_crossref.py=$crossref_status / test_check_crossref.py=$selftest_status / check_why.py=$why_status / check_variants.py=$variants_status / check_step_time.py=$steptime_status / check_anchor.py=$anchor_status / check_procedure_order.py=$procorder_status / check_step_ref.py=$stepref_status / test_markdown_scan.py=$scan_status / check_tag_balance.py=$tagbal_status / check_unclosed_screen.py=$unclosedscreen_status / check_false_success.py=$falsesuccess_status / check_zip_reference.py=$zipref_status / check_unused_image.py=$unusedimg_status / check_jsx_marker.py=$jsxmarker_status / check_ja_line_break.py=$jalinebreak_status / check_setext_heading.py=$setext_status / check_quiz.py=$quiz_status / check_scaffold_src_sync.py=$scaffoldsync_status / check_version_split.py=$versplit_status / check_complete_section_fences.py=$fencedup_status)"
  exit 1
fi
