# 30日教材 商品化 進捗

**次にやること**: Wave 1 の走査5体の結果を Gate 1 でワイが1件ずつ裏取りし、図の枚数と撮り直す写真の枚数を確定して局長へ報告する。

計画: `/root/.claude/plans/task-app-30-10-000-deep-iverson.md`
ブランチ: `claude/30days-material-product-ready-hor18z`

---

## 環境（Wave 1・完了）

| 前提 | 状態 | 証拠 |
|---|---|---|
| Docker | ✅ 稼働 | `dockerd --iptables=false` 起動 → `docker info` が `ServerVersion=29.3.1` |
| poppler | ✅ 導入 | `pdftotext` `pdfinfo` `pdffonts` `pdftoppm` `pdfimages` すべて `/usr/bin/` |
| npm | ✅ 導入 | `npm install` exit 0 |
| rsync/zip/unzip | ✅ 導入 | `apt-get install` exit 0 |

---

## 不満#1 配布ZIPの商品外混入 — ✅ 完了

**before**: 買い手に届く ZIP に商品外が **11ファイル / 930.8 KB** 入っとった。

| サイズ | ファイル |
|---:|---|
| 497.8 KB | `material/sample/Python基礎知識ガイド.pdf`（別商品） |
| 371.3 KB | `material/sample/tkinter基礎知識ガイド.pdf`（別商品） |
| 17.9 KB | `material/30days-curriculum/_meta/procedure-day-map.json` |
| 13.1 KB | `material/style/book.css` |
| 8.1 KB | `material/30days-curriculum/_meta/test-channel-proposal.json` |
| 5.9 KB | `material/dev-guide.md`（開発者向け） |
| 5.4 KB | `material/style/tutorial.css` |
| 3.7 KB | `material/pr-reviewer-rule.md`（社内PRレビュー規則） |
| 3.3 KB | `material/30days-curriculum/style/tutorial.css` |
| 2.5 KB | `material/30days-curriculum/_meta/procedure-disposition.json` |
| 1.8 KB | `material/onboarding.md`（開発者向け） |

**after**: 商品外の残存 **0件**。`material/` は教材本体のみ（リポジトリ111ファイル → ZIP 100ファイル）。

**直した所**:
- `scripts/build-zip.sh` — zip の `-x` に7パターンを追加。**rsync 側には足してへん**（`sale_package.py:94` が build-zip.sh 全文から rsync の除外指定を正規表現で拾っとるため、そちらに足すと `excluded_routers()` が汚染されて `check_zip_reference` と `check_tag_balance` が壊れる）。`FILE_COUNT` の `find` も同じ条件に揃えた。
- `scripts/curriculum-qa/check-sale-package.sh` — `non_product_entries` 配列と専用の判定ループを追加。**故意に戻すと落ちる**。

**検証**:
```
bash scripts/build-zip.sh
→ 販売用 ZIP の初期状態を確認しました: 完成アプリ本体の混入なし
→ 販売用 ZIP の初期状態を確認しました: 商品外ファイルの混入なし
→ ZIP サイズ 6.2M / 配布ファイル数 174
unzip -l ... | grep -E 'material/sample/|pr-reviewer-rule|dev-guide|onboarding|material/style/|_meta/|30days-curriculum/style/' | wc -l
→ 0
```

---

## 紙面パイプライン — ✅ 疎通確認ずみ（Wave 4 の最大リスクが消えた）

`make book-pdf-one` で day01 を組んで通した。**Vivliostyle・Chromium・npx がこの環境で全部動く。**

```
day01_開発環境を整えて、初めてのアプリを動かそう  62ページ / 見出し11 / 図0
1本すべて生成した
python3 scripts/pdf-book/check_pdf_book.py → ✅ 1冊すべて商品として出せる状態です (exit 0)
```

**自分の目で見た結果**（`pdftoppm` で画像化して Read）:

| ページ | 見たもの | 判定 |
|---|---|---|
| p1（表紙） | Day番号・タイトル・技術スタック・罫線 | ✅ 崩れなし。書体と余白も整っとる |
| p30（本文） | 柱・ノンブル・コードブロック（構文着色つき） | ⚠️ **コードの長い行が折り返して単語が裂けとる**（`"Hiragino Kaku G othic ProN"` が2行に割れる）。実測した85桁超435行の実害。Wave 2 で原稿側を直す |
| p30 下部 | コードブロック後の余白 | ⚠️ ページ跨ぎの挙動。36冊組んでから量を測る |

**day01 が62ページ** → 36冊で 2,000ページ超の見込み。

---

## Gate 1 — ✅ 通過（36本を読了）

集計は `gate1-summary.md`、日別の詳細は `scan-day01-08.md` / `scan-day09-16.md` / `scan-day17-24.md` / `scan-day25-30-appendix.md`（計3,278行）。

| 項目 | 数 |
|---|---:|
| 事実の誤り・矛盾 | **112件**（うち致命11件） |
| 図が要る節 | 66箇所 |
| 理解チェック（起案ずみ） | 90問 |
| 撮り直しが要るスクショ | **63枚**（＋新規7枚） |

**ワイが自分で裏取りした3件**は `gate1-summary.md` の「ワイが自分で裏取りした分」を見ること。

**局長へ出した判断**: 図66箇所は多すぎるので**30枚程度に絞る**（day01〜03 の環境構築を最優先、各日1枚を上限）。残りは post-release。異論が無ければこの方針。

---

## PR

**https://github.com/kouiso/task-app/pull/388** — draft。CI は 16 success / 0 failure。
`販売用ZIP初期状態チェック` も success。

---

## Wave 2 — 進行中（5体並列）

| 担当 | 中身 | 出力先 |
|---|---|---|
| day01-04 | 規格統一（6節追加・Step を H3 へ・所要時間の新設）＋ 事実の誤り ＋ 理解チェック | `fix-day01-04.md` |
| day05-12 | 事実の誤り（props欠落・アーカイブ手順・rate limit の回数）＋ 用語節(day07/08) ＋ 理解チェック | `fix-day05-12.md` |
| day13-21 | 事実の誤り（handleSubmit の置き換え漏れ・シード実測との食い違い）＋ 理解チェック | `fix-day13-21.md` |
| day22-30 | **lint矛盾**・day29 ステップ表・day28 既存関数・day27 立場割れ ＋ 用語節(day26-29) ＋ 節名統一 ＋ 理解チェック | `fix-day22-30.md` |
| 再構成ビルド | 連結ロジックを置換対応へ（現在 1/30 → 改善中） | `day-snapshots-result.md` |

## 次にやること（Wave 2 の後）

1. Wave 2 の成果をワイが裏取り → textlint / check_quality / build_day_snapshots を通す
2. **写真の作り直し 70枚** — `build_day_snapshots.py` で「その日のコード × その日のデータ」を組んで起動 → Playwright で撮影 → 対象要素の `boundingBox()` に赤枠 → 1枚ずつ目視
3. `check_visualization.py` に同一日の画像重複検査を追加
4. 図を約30枚（day01-03 優先）
5. 36冊組版 → `check_page_layout.py` 新設 → 目視 → CSS修正
6. #386 マージ／添え状／成果物3点を SendUserFile

## 未着手のまま残っとるもの

`doc/post-release-backlog.md`（コードの実務水準レビュー結果・#386以外のPR/Issue・branch protection・npm audit 赤・分量の休止点）はまだ作ってへん。
