# 2026-09-18 配布証跡

## Drive フォルダ構成（実測）

フォルダ ID: `1LXf2Ws7MKN0hBjEGCU6W3CmwH5Y4GjxU`

| 場所 | 内容 | 件数 |
|---|---|---|
| ルート直下 | 現行版PDF（既存IDのまま上書き） | 36 |
| ルート直下 | `task-app-curriculum-v1.1.zip`（写経ZIP）ID `1JGcp9mhde-MOD97CcIjKacHgcD38OLkr` | 1 |

※ `旧版-20260912/`（上書き前の元版PDF 36件、ID `1-F6Pe3X7dtgcKYf0999y5erpU0y8C2Pp`）は
2026-09-19 に配布フォルダの外（チームドライブ直下）へ移動済み。購入者には現行版のみが見える。

## 検証記録

- `release-manifest.json` — PDF 36冊＋ZIP のインベントリ・Drive記録・リモート照合結果
- `drive-metadata.json` — Drive 上の各ファイル ID・sha256・URL（37件）
- `pdf-link-map.json` — PDF 生成時に章間リンクへ焼き込んだ Drive URL 対応表
- `release-build-receipt.json` — 36冊のビルド実行記録
- `release_manifest.py --remote-check`: PDF36＋ZIP1 を Drive から再取得して sha256 照合（ID一致も検査）

## 旧版保全

- 旧版フォルダの36件は元のDrive原本とバイト一致（sha256・md5で往復照合済み）
- ローカル予備: `~/.devin/taskapp-resume-20260917T055337397756Z/preserved/` ほか2箇所
- Drive側のリビジョン履歴でも上書き前版は復元可能（ファイル右クリック→版を管理）
- 注意: 旧版PDFの章間リンクは生成当時の `localhost:13000` リンクのまま（内部リンクは動かない）。本文・スクリーンショット自体は完全。閲覧専用の保全用途

## 写経ZIP

- `scripts/build-zip.sh` で生成。内容: scaffold-from-scratch.sh + scripts/_*-base 一式 + README + .env.example + doc/SUPPORTED_ENVIRONMENTS.md（`material/`・`src/` は含まない — 教材はPDFで別配布、srcは読者がscaffoldで作る）
- ZIPの共有権限はPDFと同一フォルダの権限モデルに従う
