# Mermaid ラベル欠け修正の証跡 (2026-10-10)

## 欠陥（旧 candidate e39a1ce で確定）
- Day01 p13図2: 'Docke'/'npr'/'task-ap'/'DATABASE_UR'/'PostgreS' 末尾欠け
- Day01 p67図5: 'src/app/login/page.tsx' 側の 'Day 05 で作る' 末尾欠け
- Day02 p43図4: 'page.tsx を実行す' + エッジ ''use client' のときだ' 末尾欠け
- pdftotext 抽出でも同一の欠落を観測（低解像度ではなくPDF本体の欠落）

## 根本原因（実測）
mermaid-cli(mmdc@11.16.0)のChromiumがラベル実寸を測る時点で BIZ UDPGothic が
解決されず serif 代替で計測 → 後段 embed_font で本物(33〜46%太い)が差し込まれ右端欠け。
- 'Docker' foreignObject width=47.09px = serif実測と完全一致、本物は62.88px
- 既存対策 XDG_DATA_HOME/fonts はLinux fontconfig専用。macOS ChromiumはCoreText経路のみ
- -C cssFile の @font-face は計測(getBBox)より後の非同期ロードで無効(実測)
- ~/Library/Fonts 配置も同session内では fontd に反映されず(実測)

## 修正（build_pdf_book.py register_macos_fonts）
prepare_work_dir直後に ctypes → CTFontManagerRegisterFontsForURL(scope=session=3)
で WORK_DIR/fonts/*.ttf を session登録。Linuxは従来XDG経路のまま。
二重登録時は unregister→register で冪等化。
session範囲のためログアウトで自動解除・恒久汚染なし。

## 効果の実測（修正前→後）
- Chrome measureText: biz=457.64 (serif代替 223.58 ではなく本物で解決)
- mmdc再描画 Docker foreignObject: 47.09 → 105.61px
- day01再生成PDF p13抽出: 'Docke'→'Docker' 'npr'→'npm' 'task-ap'→'task-app' 'DATABASE_UR'→'DATABASE_URL' 'PostgreS'→'PostgreSQL'
- day02 p43抽出: 'page.tsx を実行す'→'page.tsx を実行する', ''use client' のときだ'→'のときだけ'
- 新旧PNG比較: artifacts/evidence/{old,new}-day01-p13-13.png 他6枚

## 全冊波及確認
- 70図/33冊が同経路 → 統括ルール通り全36冊再生成（バイナリ全差分）
- 新規チェッカー scripts/pdf-book/check_mermaid_labels.py:
  - SVG層: 原稿.mmd全ラベル(ノード/エッジ)の末尾一致照合 → PASS
  - PDF層(--pdf): pdftotext全本文からラベル全文字が≥2文字断片で覆えるか → 36/36 PASS
  - 負例: 旧candidate PDFで同一チェックが FAIL（実clip観測）
  - 既知限界: 文中に同一文字列があるラベル・末尾1文字のみの消失はテキスト層では検出不可
    → 対象3頁のpdftotext行差分とPNG目視で個別に担保（本ファイル上記）
- check_pdf_book: 36冊PASS / check_page_layout: 36冊PASS
- test_check_pdf_book: 145 PASS / hanging_scope normal&-O PASS(skip=0)

## 新hash
36冊全て新SHA256（共通組版変更のため全面差分）。pdf-manifest.json 参照。
ページ計 3740（旧3743、レイアウト移動分-3）。
