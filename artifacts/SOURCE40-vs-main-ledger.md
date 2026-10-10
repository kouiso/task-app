# SOURCE40 vs kouiso/task-app main(51b2eb4d) 台帳

## 世代判定と正本
- 正本: **SOURCE40**（taskapp-source40.tar.gz 展開物）。main への無断置換禁止・無差別上書き禁止。
- 比較先: `main` HEAD `51b2eb4d7f10d50948640653b12d3ac700b8277c`（PR #620 マージ済）
- 計測方法: `git show FETCH_HEAD:material/30days-curriculum/<file>` と source40 実体を
  NFC/NFD 両形式で名寄せし unified diff 行数を集計。

## 教材差分（36冊・実測）

| ファイル | main vs source40 | 判定 | 理由 |
|---|---|---|---|
| appendix_参考資料.md | IDENTICAL | 不要 | 内容一致。統合対象なし |
| 00-1_学びのロードマップ.md | +7/-7 | 競合 | 内容差あり。小さいが意味差分の可能性、B照合対象 |
| 00_カリキュラム目次.md | +22/-19 | 競合 | 同上 |
| appendix_トラブルシューティング.md | +22/-21 | 競合 | 同上 |
| appendix_次のステップ.md | +85/-44 | 競合 | source40側が約1.7倍に拡充（15898B vs 9119B） |
| appendix_用語集.md | +41/-38 | 競合 | 同上 |
| day01 | +217/-103 | 競合 | source40側拡充（84768B vs 76548B） |
| day02 | +120/-69 | 競合 | 同上 |
| day03 | +329/-178 | 競合 | 同上 |
| day04 | +216/-145 | 競合 | 同上 |
| day05 | +137/-95 | 競合 | 同上 |
| day06 | +211/-131 | 競合 | 同上 |
| day07 | MISSING-IN-MAIN | 競合（別冊） | main: day07_認証バックエンドを作ろう / source40: day07_ログイン体験を改善しよう。教材の章立て自体が別物。単なる改版ではなく別コンテンツ |
| day08 | +304/-178 | 競合 | source40側拡充 |
| day09 | +249/-114 | 競合 | 同上 |
| day10 | +919/-515 | 競合 | 同上（112355B vs 95708B） |
| day11 | +1697/-1434 | 競合 | 規模ほぼ同等・大差分（要照合） |
| day12 | +1779/-1425 | 競合 | 同上 |
| day13 | +534/-344 | 競合 | source40側拡充 |
| day14 | +1952/-1647 | 競合 | 規模同等・大差分 |
| day15 | +1656/-1277 | 競合 | source40側拡充 |
| day16 | +1280/-699 | 競合 | 同上（106058B vs 87314B） |
| day17 | +2068/-825 | 競合 | 同上（147290B vs 97266B・1.5倍） |
| day18 | +1377/-917 | 競合 | 同上 |
| day19 | +1984/-1204 | 競合 | 同上 |
| day20 | +2395/-615 | 競合 | 同上（266524B vs 183871B・1.45倍） |
| day21 | +153/-182 | 競合 | 規模同等・双方向差分 |
| day22 | +87/-90 | 競合 | 規模同等 |
| day23 | +160/-133 | 競合 | 規模同等 |
| day24 | +210/-108 | 競合 | source40側拡充 |
| day25 | +987/-315 | 競合 | 同上（195093B vs 165213B） |
| day26 | +1462/-245 | 競合 | 同上（175471B vs 126385B） |
| day27 | +1164/-984 | 競合 | 規模同等・大差分 |
| day28 | +2428/-961 | 競合 | source40側拡充（169143B vs 99047B・1.7倍） |
| day29 | +791/-918 | 競合 | **main側が大きい唯一の冊（190272B vs 168691B）** — source40側が削減済みか、別改訂か。B照合必須の注目冊 |
| day30 | +450/-184 | 競合 | source40側拡充（73155B vs 55345B） |

**判定の解釈**: 「競合」= 意味のある内容差があり、source40正本命令の下で
機械的に採択できない。各差分の帰属（main側の意図的編集か、source40側の拡充改訂か）
は B担当/統括の照合作業へ委ねる項目。**source40 側がほぼ全冊で大きい**ため
source40 を「拡充世代」として採用する方針が自然だが、day29 は逆なので個別照合を要する。

## 生成器差分（scripts/pdf-book）

### main にのみ存在（source40 無）
`check_inline_break.py`, `inline_break.py`, `list_code_shrink.py`,
`table_latin.py`, `table_structure.py`, `test_check_inline_break.py`,
`test_inline_break.py`, `test_relabel_tsx_fences.py`, `test_table_build.py`,
`test_table_latin.py`, `test_table_structure.py`, `pdf-link-map.json`,
`package.json`, `package-lock.json`
→ 判定: **競合（未統合）** — 別パイプラインの機構群。inline_break/table_latin/
table_structure/relabel_tsx_fences は source40 パイプラインに無い概念で、
無差別取込は生成物を変える。要統括判断。`pdf-link-map.json` は main 形式
（{name,url}配列）で、source40 は NFD+NFC 両形キーの dict 形式 — **形式競合**。

### source40 にのみ存在（main 無）
`decorative-margin-*`（outline柱・glyph map）, `hanging_scope.py`+scope JSON+
test（selective40）, `verify-margin-outline-pdf.*`, `margin-outline-fixture.mjs`,
`test_work_slug_normalization.py`, `local-coordinate-boundary.test.mjs`,
`vivliostyle-pixel-ratio-compensation.test.mjs` 他 → source40 世代の拡張機構。

### 共通名だが内容差（29ファイル）
build_pdf_book.py, code_wrap.py, check_pdf_book.py, check_page_layout.py,
breakable_code.py, inline_layout*.py/mjs, keep_next.py, release_manifest.py,
table-layout.json, 各種test, verify_pdf_copy.py, verify-inline-*.mjs
→ 判定: **競合** — 同一概念だが両世代で改訂が進んだ両方に意味差分。
source40 側は本成果物で実走検証済み（下記統合証拠）。main 側差分の取り込みは
意味差分の個別精査が必要（A担当の原稿修正確定後のリベース判断と同時に行うべき）。

## 取り込んだ修正（統合証拠・commit SHA 紐付け）
対象ブランチ: `devin/source40-input-pack`（入力パック）+ `devin/source40-pdf-artifacts`（成果物）

| commit | 内容 | 根拠 |
|---|---|---|
| `e338032` | selective40 統合（hanging_scope/code_wrap/build_pdf_book/scope JSON/test_hanging_scope）+ work_slug NFC固定 + margin outline NFC照合 + 回帰テスト2本 | ビルド実走で再発確認した3障害の根治。正例/負例つき |
| `dd8e25b` | test_work_slug_normalization を NFC/NFD 両形式明示 normalize へ | Linux で NFD 経路未検査になる指摘への恒久対応 |
| `438940f` | check_pdf_book.py（work_slug独自コピー+glyph map title/path+expected_title+provenance title 4箇所NFC化）+ verify-margin-outline-pdf.mjs（title filter/path endsWith/期待seq 3箇所NFC化）+ test_check_pdf_book にNFC回帰追加 | 検査側だけが別正規化形で照合し22冊を誤判定した障害の根治 |

## 生成物・検査証跡
- `artifacts/evidence/pdf-manifest.json` — 36冊 SHA256/ページ数/原稿SHA256
- `artifacts/evidence/VERIFICATION-RECORD.md` — E1〜E7 エラー→原因→最小修正→回帰
- `artifacts/evidence/pdf-link-map-collision-check.json` — link map 衝突なし証明
- `artifacts/evidence/hanging-scope-test-{normal,O}.json` — VFM回帰 skip=0

## 残る統括判断項目
1. main 側 34冊差分の帰属確認（B照合）— 特に day29（唯一 main が大きい冊）
2. day07 別冊の採用方針（販売ラインナップの章立て判断）
3. main 側 pdf-book 機構（inline_break/table_latin/table_structure/relabel_tsx_fences 系）の取り込み可否
4. A担当(9159b88a) 原稿修正確定後の hash 固定（該当冊のみ再生成）
