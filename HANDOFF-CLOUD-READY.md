# HANDOFF-CLOUD-READY — task-app 教材納品（クラウド完遂版）

作成: 2026-10-10 / 統括セッション devin-4adf34610d854d7fa1b97c7f4ac44496
前提: この文書以降の作業はクラウド（GitHub + Devin VM + Google Drive）だけで完遂する。UNCパス・本人ローカルPCへの依存は残さない。

## 1. 正本と固定commit・取得コマンド

| 役割 | repo/branch | 固定commit |
|---|---|---|
| 教材入力（SOURCE40入力パック） | `kouiso/task-app` `devin/source40-input-pack` | `b21c8ec42229605897d518940e3a81fe5211c7c8` |
| 候補PDF（36冊・機検未完了candidate） | `kouiso/task-app` `devin/source40-pdf-artifacts` | `e39a1ce9b7e3ea8dd7d922902f77af4c98741f07`（branch HEAD `94fbc8f7` = 同commit+後続ledger。e39a1ceはHEADの祖先確認済） |
| Gate C証跡 | `devin/gate-c-evidence` | HEAD `6e30ab3b`（ledger.md含む。進行で更新） |
| Gate B証跡 | `devin/gate-b-evidence-20261010` | `4c6b50165c1becdbc8fac01dccac011a05464748` 以降 |
| Gate A証跡 | `devin/gate-a-evidence` | HEAD `ff6233db` |
| 復元済みr9履歴（VM上） | `/Users/devin/handover/taskapp/r9small/r9-history-restored/{GLOBAL,HANDOFF,LOCAL,NEW,OLD,PLAN}` | 46,339 files / hash mismatch 0（find実測済） |

取得コマンド:
```bash
git clone https://github.com/kouiso/task-app.git && cd task-app
git fetch origin devin/source40-input-pack devin/source40-pdf-artifacts devin/gate-c-evidence devin/gate-b-evidence-20261010 devin/gate-a-evidence
git checkout b21c8ec42229605897d518940e3a81fe5211c7c8   # 入力
# PDF候補: git checkout e39a1ce9b7e3ea8dd7d922902f77af4c98741f07
```

## 2. Claude規約/skill参照先・不足有無

- リポ規約: `kouiso/task-app` `AGENTS.md`（kebab-case・`any`/`@ts-ignore`/`eslint-disable`/`git reset`/`--no-verify`禁止・教材は`material-writing` SKILL.md必読）
- 教材文節規約: `.claude/skills/material-writing/SKILL.md`（リポ内。textlint + `scripts/curriculum-qa/check_tone.py` ゲート）
- 復元資料: `HANDOFF/HANDOFF.md`（Drive手順の全文）, `HANDOFF/CLOUD-START.md`, `HANDOFF/READ-FIRST-SOURCE40.md`
- 不足: なし（規約・skill・Drive手順はすべてクラウド上に存在）

## 3. 生成/テスト/全ページ検査の再開コマンド

- PDF生成: `cd task-app && make`（Vivliostyle経由。entry: `tools/build_pdf_book.py` — Mermaid/SVGフォント実寸計測の修正点は §4-未解決①参照）
- 機械検査: `python3 tools/check_pdf_book.py`（`-O` モード両方で実行。b21c8ecのNFC/NFD混在fixture回帰は解消済）
- Gate B（30日再現）: `tools/apply_day.py` + `tools/run_days.sh`（esbuild loaderバグは修正済の新版を使用。クリーンscaffoldスナップショットからの日別適用）
- Gate C（全頁目視）: Poppler `pdftoppm`で各頁を画像化→1枚ずつ実見→範囲別JSON+採否理由を `devin/gate-c-evidence` へ。PDF名/hash/ページ範囲をキーに管理（Snn番号体系は使わない）

## 4. 未解決事項・担当・証拠path

| # | 未解決 | 担当 | 状態 |
|---|---|---|---|
| ① | Mermaid図ノードラベル右端欠け（Day01 p13図2・p67図5で独立確定。共通経路なら全図・全冊波及要確認。`build_pdf_book.py:1823-1832`に同型注記＋xdg/fonts対策。Chromium計測時のBIZ UDPGothic解決を実証） | 3a7a21dd（生成担当） | 修正中 |
| ② | SOURCE40 vs 最新mainの意味差分：採用/不要/競合の実体判断+理由+統合証拠（無差別上書き禁止、正本はSOURCE40改善版） | 3a7a21dd | 進行中 |
| ③ | 全36冊3,743頁 全頁目視（Day03を含め欠落なし、manifestとの集合比較でcover証明） | 3b59b953（統括）+ 6f57ae（S01-S03実行中、完了後S04以降を順次継続） | 90+82+70頁済、残~3,400頁 |
| ④ | 初心者30日+追加課題の実再現（各日到達点でtsc以外もビルド/DB/認証/CRUDの操作成功、未来参照の3分類、esbuild loader修正後Day01から正しい入力で再検証、クリーンscaffoldスナップショット方式） | a31e07d2 | Day01-04 tsc0、Day05分類中 |
| ⑤ | Gate A EVIDENCE残件（Day27説明例/index-roadmap-appendix/Day30 colophon/procedure_order 87根拠/Python3.12 README） | 9159b88a | 進行中 |
| ⑥ | 独立レビュー2回連続新規欠陥なし | 全ゲート完了後 | 未着手 |

## 5. Drive既存37IDと更新/rollback手順

- Drive folder: `1LXf2Ws7MKN0hBjEGCU6W3CmwH5Y4GjxU`（"30日教材PDF_36冊_2026-09-02"）
- 既存37件のID・旧hash・version: `r9-history-restored/OLD/dist/review/drive-backup/manifest.json`（list長37・ID実在確認済）
- 手順（HANDOFF/HANDOFF.md L23,L108）: 既存ID維持で内容更新（削除・再作成・版別フォルダ禁止）。更新直前にmanifest再取得（旧版確認は2026-10-09でstale）→sameID内容更新→全件再download/hash/リンク確認。途中競合時は停止、rollbackは自分の更新版のみ。ACK不明時の盲目的再送禁止。
- rollback: manifest.jsonの旧PDFバイナリ（`drive-backup/<id>.pdf`）で同一IDへ版復元。
- capability実測(2026-10-10): `get_file_metadata` on folder → `canAddChildren: true`（read+write OK。MCP `google-drive-4ce0`）

## 6. 認証・権限の実取得可否

| 系統 | 状態 |
|---|---|
| GitHub kouiso/task-app | clone/push OK（Devin PAT `secret:org:GITHUB_PAT_KOUISO`） |
| Google Drive | read + write（canAddChildren）OK。DL/ULは `download_file_content` / `create_file` / `copy_file` で実行可 |
| Vercel/task-app本番 | 不要（教材のVercelデプロイは範囲外） |
| 未解決認証 | なし — 『後で解決』にしない |

## 7. 同時実行枠の制約と順次実行策

- SWE-2プロモーション同時実行枠=7。automation起動・他チャンネル稼働セッションも枠を占有するため、新規セッション起動がHTTP429になることがある。
- 回避策: 目視・再現系は**稼働中セッションへの順次メッセージ投入**で継続する（例: Gate Cは6f57ae完了後に次レンジを同セッションへ渡す。新規起動枠に依存しない）。担当表はPDF名/hash/ページ範囲をキーに集合管理。
