# SOURCE40 vs kouiso/task-app main(51b2eb4d) 台帳

## 世代判定
- 正本: **SOURCE40**（taskapp-source40.tar.gz 展開物）
- 比較先: `main` HEAD `51b2eb4d7f10d50948640653b12d3ac700b8277c`（PR #620 マージ済）

## 教材（material/30days-curriculum）実測
- 36冊中 **1冊のみ内容一致**・34冊に内容差分・day07 は丸ごと別冊
  （main: `day07_認証バックエンドを作ろう.md` / SOURCE40: `day07_ログイン体験を改善しよう.md`）
- ファイル名集合は同じ36冊だが内容世代が異なる → **main版は今回の納品ではない**

## 生成器（scripts/pdf-book）
- SOURCE40側: margin-outline装飾柱・selective40吊り下げ字下げ・link-map等の現行パイプライン
- main側: 別パイプライン（margin-outline/hanging_scope 非搭載。inline_break/table_latin/test_relabel_tsx_fences 等の別機構）

## 採用根拠
- 局長指示: 「SOURCE40が正本。r9/material-main-integration系の並行履歴で上書き禁止」
- 原依頼「最新mainから」との整合は本台台帳で閉じる（世代差を記録し追跡可能化）

## 取り込んだ修正（本成果物世代に含む）
- selective40 統合（hanging_scope/code_wrap/build_pdf_book + スコープJSON + 回帰テスト）
- `test_hanging_scope.py`: `_markdown_fences` 不在参照→`_fences`修正・負例の2行前提バグ修正
- NFC/NFD正規化: `work_slug` document_id固定・margin outline title/path照合・link-map両形キー
- `check_pdf_book.py` 検査側も同規則へ正規化（修正は検査側のみ・PDFバイナリ不変）
- `test_work_slug_normalization.py`（NFC/NFD明示両形式・36全stem回帰）

## 未統合（main側にあって本成果物に無いもの）
- main世代の教材内容差分（34冊+day07別冊）
- main側pdf-bookの機構差分（inline_break系・table_latin/table_structure系・
  relabel_tsx_fences・reconciliation_contract 等）
- ※統合判断は統括/局長へ委ねる項目。本成果物は SOURCE40 世代で固定。
