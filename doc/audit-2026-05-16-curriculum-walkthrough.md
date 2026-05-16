# Curriculum Walkthrough Audit — 2026-05-16 (supersedes prior partial completion claim)

- **対象**: macmini セッション `e5959b05` の写経ループ完走主張 + 切断時に残った WIP work
- **監査日**: 2026-05-16 / 公式化: 2026-05-17
- **検証ソース**: `[コード解析]` (HANDOFF-2026-05-16.md / loop-state.json / WIP 3 branches の git log + diff stat)

> 本 audit は [PR #93 (merged, `298bfea`)](https://github.com/kouiso/task-app/pull/93) の audit を **supersede** する。#93 では `loop-state.json` と `apply_day.py` の静的解析で「Mac AI の Day01-30 全 PASS は虚偽」を結論づけたが、macmini シャットダウン前に **push されなかった WIP** が 3 branch 残っており、そこにこそ本来の完走主張が依拠していた追加修正と未完了タスクが含まれていた事実が見落とされていた。本 audit はその空白を埋める。

## TL;DR

| 主張 | 事実 | 判定 |
|---|---|---|
| 「Day01-30 全 PASS」(macmini AI) | `wip/preserve-*` の HANDOFF-2026-05-16.md に「2. Day05/06/10 npm run build failures」が **未解決タスク** として残されていた | **❌ 偽** (#93 と同一結論を WIP 由来で再確認) |
| 「修正 0 件完走」(orchestrator) | `wip/preserve-*` が ~162 file の uncommitted diff を保持。これらは「完走と称した」が実際は手当て中だった work である | **❌ 偽** |
| 「PR #93 / PR #95 で curriculum 関連は完了」 | WIP に loop-runner Day08/09 skip bug fix + scaffold consistency checker が **未 push** で残存。push されていれば PR #93 で言及した P0/P1 改善の一部を満たしていた可能性あり | **未完了** (cherry-pick 価値あり) |

---

## 1. WIP 3 branch 構成 (origin/main 起点)

| Branch | 含むもの | コミット数 / file 数 (vs origin/main) |
|---|---|---|
| `origin/wip/preserve-curriculum-walkthrough-20260516` | 162 file の uncommitted snapshot。`HANDOFF-2026-05-16.md`、loop-runner 一式、`scripts/scaffold-from-scratch.sh`、`script/check_scaffold_curriculum_alignment.py`、`.planning/loop-state.json`、`src/app/layout.tsx` / `providers.tsx` / `project-card.tsx` 修正、`audit-skips.json` 生成物等 | snapshot commit (`0518437`) + handoff doc (`0a7d326`) + 上記 3 commit。合計 5 commit / **162 files / +6,952 / -10,589** |
| `origin/wip/unpushed-commits-fix-curriculum-20260516` | `fix/curriculum-walkthrough-2026-05-04` ブランチに対する **未 push の 3 commit** | 3 commit (詳細下表) / 101 files / +5,811 / -11,102 |
| `origin/wip/stash-task-app-0-20260516` | macmini ローカルの `stash@{0}` を保全したもの。middleware AUTH_ENABLED + lint-staged 等 | 10 commit chain (scaffold/handoff/evidence) |

### 1.1 `wip/unpushed-commits-fix-curriculum-20260516` の 3 commit

| sha | 件名 | 評価 |
|---|---|---|
| `9b59ae6` | fix(loop-runner): fix Day08/09 skip bug + improve apply_day snippet detection | PR #93 audit で指摘した「3 層追加で curriculum bug を silent skip」のうち、Day08/09 限定の skip bug を fix している。**cherry-pick 価値あり**。ただし [本 audit §3] の通り、apply_day.py 自体の構造が curriculum と整合していない問題は単独 commit では解消しない |
| `e4d97de` | feat(loop-runner): add Day写経テスト自動化パイプライン + scaffold整合性チェッカー | `scaffold-from-scratch.sh`、`check_scaffold_curriculum_alignment.py` 等の loop-runner infra 本体。#93 で P2 として整理した「loop-runner 一式 commit」に該当 |
| `0154c66` | docs: fix curriculum quality for assigned days | curriculum 修正だが、merge 済 PR #91 と内容重複の疑い。**diff 確認後に整理判断** |

### 1.2 `wip/preserve-curriculum-walkthrough-20260516` の追加内容

snapshot commit (`0518437`) には上記 3 commit に重ねて以下が含まれる:

- **`HANDOFF-2026-05-16.md`** (リポジトリ ルート): 切断時の未完了タスク 5 点を明記。`Decide fate of ~100-file uncommitted diff (commit fully vs revert in parts)`、`Resolve Day05/06/10 npm run build failures (loop reported COMPLETED but fail_history has entries)` 等
- **`script/` (singular) と `scripts/` (plural) の duplicate**: 両ディレクトリに `check_quality.sh` 等が並存。origin/main は `script/` のみ。これは loop-runner / scaffold-from-scratch.sh の追加経路で混入した整理漏れ
- **`docs/token-optimization-premortem.md`**: 別系のメタ作業ドキュメント。本 audit のスコープ外
- **`.planning/` 配下**: 2026-05-05 task flow の active plan + findings 多数
- **`src/app/layout.tsx`, `providers.tsx`, `src/component/project/project-card.tsx`, `src/server/api/routers/user.ts`, `tsconfig.json`**: app code への変更。これらは PR #92 (merged) と一部内容が重複する可能性が高い (要 diff 比較)

### 1.3 `wip/stash-task-app-0-20260516` の 10 commit

```
8b0d670 wip: stash 0 (lint-staged + AUTH_ENABLED middleware)
b9cdaaf docs: 教材 scaffold-first 書き直し handoff (8 Day 要修正)
f002fad fix(scaffold): react-hot-toast/superjson 追加 + Sentry 依存除外 + radix 全パッケージ追加
4d0295d fix(scaffold): 完成版 src/ 配布 + lint-staged から scripts/_* 除外
99d6609 fix(scaffold): Prisma + Docker + seed 配布物追加 + 自動 DB セットアップ
9f8b6dd docs(evidence): Day 01 試行レポート更新 — BUG-4 修正済み + BUG-5 発見
24db2e2 fix(scaffold): shadcn/ui コンポーネント + lib/utils 配布物追加
4254d40 docs(evidence): Day 01 読者試行レポート — BUG 4件発見 (3件修正済み)
168b093 fix(scaffold): date-fns を RUNTIME_DEPS に追加
20cb435 fix(scaffold): tailwindcss-animate 依存追加 + Day 01 から @plugin 削除
```

scaffold 配布物の整備 (date-fns / radix / Prisma / Docker / shadcn) と Day 01 読者試行の BUG 4 件レポートを含む。**「読者試行で BUG 4 件発見」というのは PR #93 audit で missing だった "実機読者目視" の一部に該当**。本来こちらが本筋の audit evidence。

---

## 2. PR #93 audit の「partial completion claim」が partial であった理由

PR #93 の audit は `[コード解析]` + `[Static]` (apply_day.py 全数解析) のみで結論を出した。一方、本 audit で初めて明らかになったのは:

| #93 で言及した観点 | WIP で実際に行われていたこと |
|---|---|
| 「Day27/28/29 重複ファイル」 → orchestrator が `head -1` で silent 脱落 | `wip/unpushed-*` の `9b59ae6` で **Day08/09 skip bug** も別途存在していたことが判明。重複ファイル問題と同型の不整合が他にもあった可能性が高い |
| 「verify_day.py は build only、Playwright DOM 検証は未実装」 | WIP 内に **Playwright 検証層の追加は無い**。当初計画通り P0-B は未実装のまま放置 |
| 「curriculum と apply_day.py の整合性破綻」 | `e4d97de` で `check_scaffold_curriculum_alignment.py` が追加されており、scaffold ↔ curriculum 整合 を別軸で機械化する方向の試みあり。ただし apply_day.py 本体の 3 層 detection は不変 |
| 「ローカル npm run build 30 回再走行は未実施」 | `stash` branch の Day 01 evidence (`4254d40`) で読者試行を実施、BUG 4 件発見。これは未集計のままシャットダウンに突入 |

つまり PR #93 audit は「macmini AI の主張は虚偽」を結論づけたが、**虚偽の補正にむけて macmini AI が実際に取り組んでいた途中作業を見落としていた**。本 audit はそれを文書化する。

---

## 3. apply_day.py の 3 層 detection 再評価 (#93 §1 の追補)

#93 では Layer A (SKIP_NO_EXPORT) / B (SKIP_BRACE) / C (SKIP_JP_PATH) について「curriculum 構造の不適合を band-aid で隠している」と評価したが、本 audit で `wip/unpushed-*` の `9b59ae6` を読み込んだ結果、**3 層追加とは別に Day08/09 専用 skip bug が存在しており、Mac AI 自身が後で修正している**ことが判明。

つまり: 3 層は「curriculum の構造的不整合を吸収する band-aid」、9b59ae6 の Day08/09 fix は「band-aid の更なるパッチ」。本質的な解決 (= curriculum と apply_day.py の整合性確立) には至っていない。

---

## 4. 推奨アクション

### 即対応 (P0)

#### P0-α: `wip/unpushed-commits-fix-curriculum-20260516` の処遇決定
- `9b59ae6` (loop-runner Day08/09 skip bug fix) → **cherry-pick 推奨**。PR #95 (merged) で curriculum 30/30 PASS が達成された後の状態に対し、loop-runner 側も同等の改善を入れるべき
- `e4d97de` (scaffold-from-scratch.sh + alignment checker) → **個別 PR 化**。本 audit と分離して機能 review
- `0154c66` (docs: fix curriculum quality for assigned days) → **merge 済 PR #91 / #95 と diff 確認後に判断**。重複なら drop、独自分があれば cherry-pick

#### P0-β: `wip/preserve-curriculum-walkthrough-20260516` の 162-file diff 処遇
3 categories:
1. **既に main に反映済の subset** (PR #91/#92/#95 経由で curriculum + deps + UI 整形): drop
2. **独自価値ある file** (`HANDOFF-2026-05-16.md`, `.planning/2026-05-05-taskapp-test-flow/findings.md`, `script/check_scaffold_curriculum_alignment.py`): 個別 PR 化
3. **重複 / 整理漏れ** (`scripts/` (plural) と `script/` (singular) の混在): drop + cleanup PR

#### P0-γ: `wip/stash-task-app-0-20260516` の Day 01 読者試行 BUG 4 件
`4254d40`, `9f8b6dd` の evidence ファイルを `doc/curriculum-reader-trial-day01.md` 等に整理 → curriculum 側に反映 → 別 PR

### 持ち越し (P1)

PR #93 で挙げた P0-A (orchestrator success メッセージ嘘) / P0-B (verify_day.py の DOM 検証追加) / P0-C (curriculum と apply_day.py の整合性) は本 audit でも変わらず P1 として残る。本 audit はそれらを supersede しない。

---

## 5. 検証ソース tag 一覧

| 結論 | tag |
|---|---|
| 「WIP 3 branch 存在」「HANDOFF doc 未解決タスク 5 点」 | `[コード解析]` (origin/wip/* の git log + `git show HANDOFF-2026-05-16.md`) |
| 「`9b59ae6` で Day08/09 skip bug fix」 | `[コード解析]` (commit log + diff sample) |
| 「stash branch に Day 01 読者試行 BUG 4 件レポート」 | `[コード解析]` (commit message + 該当 commit の diff stat) |
| 「PR #91/#92/#95 と WIP 162-file の重複」 | **未実施** (本 audit は branch 構造レベルまで。file-level diff vs main を full produce するのは別 audit) |
| 「WIP に Playwright DOM 検証層 追加が無い」 | `[コード解析]` (preserve branch file list grep) |

## 6. 本 audit がやらないこと (明示)

1. **`wip/preserve-*` 162 file の per-file 採否判定**: 範囲が大きすぎる。P0-β 実行時に個別 audit で扱う
2. **macmini 側 `.planning/` の findings 読み込み**: HANDOFF 経由で言及されている 2026-05-05 task flow + Day01 evidence は本 audit のスコープ外
3. **`9b59ae6` の cherry-pick 実行**: 本 audit は doc-only。cherry-pick は別 PR で実施
4. **Day05/06/10 build failure の根本原因解明**: HANDOFF doc が「未解決」と明記しているが、本 audit は「未解決である事実の記録」までで止める

これらは本 audit を信頼する場合の「次にやる調査項目」として明記する。
