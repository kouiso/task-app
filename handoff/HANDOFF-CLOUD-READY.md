# HANDOFF-CLOUD-READY — task-app SOURCE40 教材パイプライン

**目的**: Devinはユーザーのローカルを参照できない。残作業は全てクラウド側ブランチ/証跡から再開できる状態にする（局長恒久指示）。
**最終更新**: 2026-10-10 devin-7c7509cb（統括）

## 1. 真のソース（固定commit・fetchコマンド）

| 役割 | ブランチ | 固定commit | 取得 |
|---|---|---|---|
| 入力ZIP+マニフェスト | `devin/source40-input-pack` | `b21c8ec42229605897d518940e3a81fe5211c7c8` | `git fetch origin devin/source40-input-pack && git checkout b21c8ec` |
| 36PDF candidate（機検未完了） | `devin/source40-pdf-artifacts` | `e39a1ce9b7e3ea8dd7d922902f77af4c98741f07` | 同上（artifacts/pdf/*.pdf・artifacts/evidence/pdf-manifest.json） |
| Gate C 台帳・証跡 | `devin/gate-c-evidence` | HEAD（7da85af以降） | `gate-c/ledger.md` が単一正本・PDF名×sha256×頁範囲キーで管理 |
| Gate B 再現証跡+tools | `devin/gate-b-evidence-20261010` | `4c6b5016`以降 | `audit/gate-b-repro-2026-10-10/`（logs・tools/apply_day.py修正済） |

## 2. 再開コマンド

- PDF確認: `python3.12 scripts/pdf-book/check_pdf_book.py dist/pdf`（python3は3.12必須。macOS標準3.9不可）
- Gate C目視分担: `devin/source40-pdf-artifacts`をcheckout→`pdftoppm -r 100〜150`で全頁画像化→1頁ずつ実見→`gate-c/dayNN-ledger.md`+`dayNN-pages.json`を`devin/gate-c-evidence`へpush（他担当上書き禁止）
- Gate B再開: `audit/gate-b-repro-2026-10-10/`のtools+ledger.jsonlをcheckout→scaffoldスナップショット流用可→v3 splice続行→日別jsonl追記

## 3. Drive 37-ID 同一更新（実証済・2026-10-10 devin-7c7509cb）

**結論: Drive MCPには`update`系APIが存在しない**（create/copyは新ID発行＝納品不可）。**正規経路は Drive API v3 `files.update`（PATCH upload/media）をOAuthトークンで直叩き** — ID指定でリネーム耐性あり（day07_認証バックエンド→day07_ログイン体験の改名ケースを実際に検出）。

### 実証ログ（テストfileID `1zS7LycuVlBAn-3fwXHjsM39lekphckyy`）
- `PATCH /upload/drive/v3/files/{id}?uploadType=media` → ID不変・version 4→5・size 49→34・md5Checksum更新 = 中身だけ差し替え成功
- v2→v1への逆PATCHで同一IDロールバックも同一手順で成立（＝復旧検証込み）

### 認証経路（OAuth・SA発行は永久禁止）
1. `brew install rclone` → `rclone config create <remote> drive scope drive` → ブラウザで `kouiso@ritmo.co.jp` OAuth同意（rclone localhost:53682 コールバック）
2. `~/.config/rclone/rclone.conf` の `token.access_token` を抽出（有効期限1h・rclone側のrefresh_tokenで自動延命）

### 更新手順（36 PDF + ZIP=37資産）
```bash
ID=<drive file id>         # doc/review-handoff/evidence-20260918/drive-metadata.json に36件+親folder
F=<local.pdf>              # devin/source40-pdf-artifacts 取得済みのPDF
AT=<access_token>
# 旧バイナリ退避（ロールバック用）
curl -sS "https://www.googleapis.com/drive/v3/files/$ID?alt=media" -H "Authorization: Bearer $AT" -o "backup-$ID.bin"
# 同一ID中身更新
curl -sS -X PATCH "https://www.googleapis.com/upload/drive/v3/files/$ID?uploadType=media&fields=id,md5Checksum,version" \
  -H "Authorization: Bearer $AT" -H "Content-Type: application/pdf" --data-binary "@$F"
# 検証: 返却md5Checksum == ローカル `md5 -q $F`（macOS）/ `md5sum $F | cut -d' ' -f1`（Linux）
# リネームも必要な場合（day07等）: PATCH https://www.googleapis.com/drive/v3/files/$ID  -H 'Content-Type: application/json' -d '{"name":"day07_ログイン体験を改善しよう.pdf"}'
# ロールバック: backup-$ID.bin を同PATCHで書き戻す（ID不変・versionのみ増分）
```
- 37リンクreadback: 全件 `GET /drive/v3/files/{id}?fields=id,name,size,md5Checksum,version` の200応答を記録
- 親フォルダ: `1LXf2Ws7MKN0hBjEGCU6W3CmwH5Y4GjxU`
- ZIP 37件目: drive-metadata.json に未掲載（36 PDF のみ記録）。ZIPのfileIDは配布フォルダ内を `rclone lsf devin-drive:<フォルダID>` で実測確認してから使うこと

## 4. MSG83 修正5点の状態

| # | 指摘 | 状態 |
|---|---|---|
| 1 | 37ファイルの canEdit+version/md5 + 同一ID更新API証明 | ✅ files.update実証済（本書§3）。37件のversion/md5一括収集は配布直前に `GET fields` スイープで実施予定 |
| 2 | tools/パス→`scripts/pdf-book/`系+Makefile targetの検証 | 🚧 `scripts/pdf-book/check_pdf_book.py`・`release_manifest.py` は input-pack ツリーに存在確認済。Makefile target の走査検証は実施予定 |
| 3 | 進行中を完了と書かない | ✅ 本書は全項に実測/未実施を明記 |
| 4 | Day04/30のVercelデプロイを無理由で除外不可 | ✅ Gate B再現の配布系手順は「再現範囲: ローカル起動+DB+画面生成まで。Vercel実デプロイは課金・公開影響のため本Gateでは未実施（局長の公開配信解禁を待つ）」と明記した |
| 5 | ロールバック二元対応 + 同一ID復元 + 37リンクreadback | ✅ §3手順に退避→逆PATCH→readbackスイープを組込み済 |

## 5. 未解決・引継ぎ

- Gate C: day02(6f57ae目視中のままsuspend→台帳未集約)、day03→day13を統括子3体で実施中、day14〜30未割当（残2303p・枠解放次第投入）
- Gate B: v3 splice走行中だった状態で担当suspend。`gate-b-evidence-20261010` のtools/ledgerから再開。gaps=35件・残破壊ファイル next.config.ts, routers/{task,project,search}.ts, app/task/page.tsx
- Gate A content review・A修正の3a7a Mermaidラベル欠け対応は稼働中（修正確定→新版PDF→差分頁のGate C再検査）
- F60: calendar-alarm 端末実証（#39/#40 merge済・配布+実機証跡が残）
- 重量級CI4本（native-ai-nightly/real-api/chaos/backend-ai-provider-nightly）は金曜9:00週次レポートまで停止維持
