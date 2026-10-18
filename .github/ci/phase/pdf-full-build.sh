#!/usr/bin/env bash
# 組版ログをファイルにも残す。#501 の正体は組版時間が当時の 60 分
# 上限に届いたタイムアウト。job ログ自体は残るが、どの冊のどの外部
# プロセスが返らんかったかは job ログだけでは分からんので、冊別ログを
# artifact で回収できる形にする（下の upload-artifact がこの dir を拾う）
# ログ dir は tee がファイルを開くより先に作る。無いままだと tee が
# ENOENT で exit 1 して pipefail 経由で組版成功も失敗扱いになる
mkdir -p "$PDF_BOOK_BUILD_LOG_DIR"
make book-pdf 2>&1 | tee "$PDF_BOOK_BUILD_LOG_DIR/.pdf-book-build.log" || \
  { echo "::warning::組版に失敗したので1回だけやり直す"; make book-pdf 2>&1 | tee -a "$PDF_BOOK_BUILD_LOG_DIR/.pdf-book-build.log"; }
