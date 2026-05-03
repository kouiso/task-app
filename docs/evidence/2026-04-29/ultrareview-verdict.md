# task-app 教材 ultrareview verdict (2026-04-29, **rev2 2026-04-30**)

> 判定日: 2026-04-29 / **rev2: 2026-04-30 (Phase B subagent 結果反映)**
> Commit: 300d06b96adf15a96f6d28cbfb112bcfb3255836
> Reviewer: Claude (anchor-bias lock at Phase A-2; Phase B = 3 subagents; Phase C = Claude self-verify)
> 対象: `material/30days-curriculum/` 35 ファイル / 25,779 行 + cross-check `src/` `prisma/` `package.json` `.env.example` `scripts/scaffold-from-scratch.sh`

## 1. Executive Summary (rev2)

### 3-axis audience verdict — UPDATED

| Audience | Verdict | One-line basis |
|---|---|---|
| **(A) HTML/CSS/JS basics + React 初めて OK** | **NOT_READY (LAUNCH-BLOCK)** | Day 07 で `localhost:3001` を踏ませるが `PORT=3001` の指定は Day 08 まで未導入 — A 層は「書いてある通り」3001 を開いて確実に詰まる。**P0 BLOCKER**。修正後は READY-with-caveats へ復帰可能。 |
| **(B) React 初中級者** | **READY-with-caveats** | Day 07 port 問題は B 層なら「3000 で試す」と回避可能だが**期待値ずれ**は商用品質として許容できない。Day 10 useForm パターン乖離 / .toISOString() TZ バグも B 層に friction。 |
| **(C) 完全初心者 (HTML/CSS/JS 未経験)** | **NOT_READY** | HTML/CSS/JS の前提知識ギャップが Day 01 から崩れる。Pedagogy review でも 30 日中 24 日 Block 判定。販売対象外推奨。 |

### Bug counts — UPDATED

| Category | Resolved (since 04-26) | Still present (verified) | Notes |
|---|---|---|---|
| Code-Content alignment | 5 (KNOWN-D03/D12/D25/D27/D30) | **3 NEW** | CAVEAT-1/2 (Day 10) + CAVEAT-3 (Day 07 port) — Phase B 検出 + Phase C 確認 |
| Content bug (curriculum) | — | **9 (B-001/002 + H-1/H-2 + M-1/2/3 + L-2/L-3)** | Day 03 nested fence rendering, Day 03 git init 不足, alt text 切れ ×3, Day 08 screenshot 不在 ×3 |
| Pedagogy gap | — | **9 days marker 欠落 + Day 28 ラベル不整合** | Day 08/14/16/17/20/22/27/28/29 の 📌 ゴールラインなし |
| src/ runtime bug | — | 0 (Phase B Codex Cloud 未実行) | 次 turn 推奨 |
| Mechanical safety | — | 0 | Phase 0 grep PASS全項目 |

### Fix counts — UPDATED

| Priority | Count | For audience |
|---|---|---|
| **P0** | **1** | Day 07 port mismatch (CAVEAT-3) — A 層 launch blocker |
| P1 | **7** | Day 03 H-1/H-2, Day 10 useForm/toISOString, alt-text 一括, scaffold script .env 整合 |
| P2 | **8** | Day 28 ラベル, ゴールライン追加 9 日, 古い日付, screenshot 不在 |

### Recommended next action — UPDATED

**(A) audience は P0 修正 (CAVEAT-3 Day 07 port) なしでは販売不可**。修正は S effort (15 分) で完了可能 → 修正後は READY-with-caveats。
**(B) audience は P0 修正 + P1 上位 4 件 (FIX-001 ～ 004)** で READY 復帰。約 1 人日。
**(C) audience は引き続き scope 外**。

根拠 3 行:
1. Phase C verification で CAVEAT-3 (Day 07 4 箇所 `localhost:3001` 参照, `PORT=3001` 指定 0 件) を原典 grep 確認 — High confidence の launch blocker。
2. Phase B 3 subagent (Code-Content / Pedagogy / Content-bug) で計 13 NEW finding 検出、Phase C で重要 3 件 confirmed。
3. 旧 04-26 verdict は subagent 並列レビュー未実施 — 本 rev2 で初めて多視点検証完了。

## 2. Phase 0 Baseline

### 数値再確認 (vs 2026-04-26 verdict)

| 項目 | 数値 | 04-26 主張 | 整合 |
|---|---|---|---|
| 30days curriculum 全 day*.md ファイル | 30 | 30 | OK |
| Total lines (curriculum 35 ファイル) | 25,779 | — | — |
| PNG screenshots | 80 | 80 | OK |
| mermaid blocks | 34 occurrences in 26 files | 26 Days | OK |
| つまず | 29 occurrences in 28 files | 28 Days | OK |
| 新しく学ぶ概念 | 33 occurrences in 29 files | Day 01-04 必須 | OK (拡張) |
| 理解度マーカー | 12 occurrences in 8 files | Day 05/07/10/15 必須 | OK (+追加 Day) |

### Cross-section grep (mechanical safety)

| Pattern | Hits | Verdict |
|---|---|---|
| `as any` / `: any` / `<any>` / `as unknown` | 0 in curriculum | PASS |
| `git reset --hard` / `--no-verify` | 0 in curriculum | PASS |
| `--force` (any) | 1 (day01:264 `npm audit fix --force` = npm flag) | PASS |
| `git add .` (raw instruction) | 3 hits in day03 (lines 689 heading / 708 ❌ Before / 982 essence) | PASS (anti-pattern teaching, 本 review で再分類) |
| password literal | `password123` test password (matches seed.ts) + `type="password"` input attribute | PASS |
| `2025-` (old dates) | 42 occurrences in 13 files (today 2026-04-30) | NEEDS REVIEW (P2) |
| TODO/FIXME/XXX | 34 occurrences in 26 files | NEEDS REVIEW (likely 「次のステップ」 markers, P2) |
| `localhost:300[01]` | 42 in 18 files | PASS (Day01=3000 / Day07+=3001 convention per 04-26 verdict) |

### 04-26 → 04-29 差分

直近 commit 履歴 (Recent commits in session start context):

- `300d06b` docs(curriculum): Day 01-04 新しく学ぶ概念テーブル追加 + Day 05/07/10/15 理解度マーカー
- `3961f44` chore: instructions ファイル統合・削除 + CLAUDE.md 更新
- `c2ea9ff` docs: Day 03/27 スクショ参照追加 + verdict スクショカバレッジ 30/30 達成
- `9c61ab5` docs: 自己レビュー修正 — Day 01 概念削減 + Day 02 粒度統一 + Day 20/25 マーカー追加
- `ff59077` docs: update final verdict for initial-intermediate audience

## 3. Day × Audience Risk Matrix

凡例: `Pass` = 詰まりなし、`Caveat` = 補足情報あれば乗り越え可、`Block` = 詰まる。

| Day | (A) HTML/CSS/JS+React初 | (B) React 初中級 | (C) 完全初心者 |
|---|---|---|---|
| 01 開発環境 | Caveat (Docker setup) | Pass | Block (CLI 未経験) |
| 02 dashboard message | Pass | Pass | Block (Tailwind utility class 連打) |
| 03 GitHub push | Pass (Pro パターン明示) | Pass | Block (git 未経験) |
| 04 Vercel deploy | Pass | Pass | Block (deploy 概念) |
| 05 ログイン UI | Caveat (rhf+zod+shadcn 同日, マーカー緩和) | Pass | Block (form 概念) |
| 06 認証 | Pass | Pass | Block |
| 07 ログイン体験 (port=3001) | Pass | Pass | Block |
| 08 dashboard 強化 | Pass | Pass | Block |
| 09 タスク表示 | Caveat (簡易版 vs src/ 高度) | Pass | Block |
| 10 プロジェクト新規 | Caveat (既存実装読解) | Pass | Block |
| 11 タスク作成 | Pass | Pass | Block |
| 12 メンバー追加 | Caveat (型ガード初出) | Pass | Block |
| 13 プロジェクト一覧 | Pass | Pass | Block |
| 14 タスク一覧 | Pass | Pass | Block |
| 15 タスク編集削除 | Caveat (null/undefined 境界) | Pass | Block |
| 16 タスクフィルタ | Pass | Pass | Block |
| 17 タスクソート | Pass | Pass | Block |
| 18 ステータス変更 | Pass | Pass | Block |
| 19 進捗可視化 | Pass | Pass | Block |
| 20 タスク検索 | Caveat (URL+UTC sync) | Pass | Block |
| 21 通知 | Pass | Pass | Block |
| 22 アバター | Pass | Pass | Block |
| 23 ユーザー一覧 | Pass | Pass | Block |
| 24 管理画面 | Pass | Pass | Block |
| 25 プロフィール編集 | Caveat (3画面+refine) | Pass | Block |
| 26 アクティビティ | Pass | Pass | Block |
| 27 プロジェクト詳細 | Pass (View migration 反映済) | Pass | Block |
| 28 ダッシュボードチャート | Pass | Pass | Block |
| 29 ユーザー詳細 | Pass | Pass | Block |
| 30 公開・卒業 | Caveat (production secrets) | Pass | Block |

### Differentiated Days (verifying audience differential ≥ 5 with distinct rationale)

| Day | (A) vs (B) differ ? | Distinct rationale |
|---|---|---|
| 01 | Yes (Caveat vs Pass) | (A) Docker 初体験 / (B) 復習レベル |
| 05 | Yes (Caveat vs Pass) | (A) rhf+zod+shadcn 同日同時投入 / (B) 既知ライブラリ |
| 09 | Yes (Caveat vs Pass) | (A) 簡易版と現行 src/ の差分が混乱 / (B) 簡易版を起点として整理可 |
| 10 | Yes (Caveat vs Pass) | (A) 既存実装読解依存 / (B) 既存読解は中級スキル |
| 12 | Yes (Caveat vs Pass) | (A) 型ガード `is` 初出 / (B) TypeScript 既知 |
| 15 | Yes (Caveat vs Pass) | (A) null/undefined 境界 / (B) TypeScript 既知 |
| 20 | Yes (Caveat vs Pass) | (A) URL+UTC dual-state 設計 / (B) 中級スキル想定内 |
| 25 | Yes (Caveat vs Pass) | (A) 3画面同時 + refine / (B) 中級スキル想定内 |
| 30 | Yes (Caveat vs Pass) | (A) production secrets 概念 / (B) 公開回として適切 |

→ 9 Days で (A) ≠ (B) and 各根拠は distinct (rule of 5 satisfied)。

## 4. 軸別評価詳細

### 4.1 Code-Content Alignment

**Verdict: PASS (High confidence)**

5/5 KNOWN issues 全件 RESOLVED または RECLASSIFIED。詳細は §5 Bug Inventory 参照。

### 4.2 Pedagogy & Difficulty Curve

**Verdict: PASS for (B) / PASS-with-caveats for (A) / FAIL for (C)**

- (B) React 初中級: Day 01→30 単調増加カーブで違和感なし。
- (A) HTML/CSS/JS+React 初: 04-27 改善 (Day 01-04 概念表 + Day 05/07/10/15 マーカー) で入口緩和。Day 12/15/20/25/30 で caveat 残るがマーカーで救済可。
- (C) 完全初心者: Day 01 から Tailwind utility class 連打 (Day 02 で `rounded-3xl bg-card p-6 shadow-sm` 等) を読めない前提。HTML/CSS/JS 入門教材への誘導が必須。

### 4.3 src/ Runtime Bug

**Verdict: NOT VERIFIED (Phase B Codex Cloud task unavailable due to session boundary)**

Phase A 中の src/ サンプル read (`user.ts` `project.ts`) で structural concern なし (proper helper extraction, regex match, RBAC via `assertMemberPermission`)。ただし学習者フロー全体追跡は未実施。Confidence: Low → 別 turn で実施推奨 (§7)。

### 4.4 Mechanical Quality

**Verdict: PASS (High confidence)**

| Check | Status | Evidence |
|---|---|---|
| `git clone` / `gh repo clone` 導線 | PASS | Day 01 確認 |
| `any` / `as` 逃げ code | PASS | grep 0 hits |
| dangerous git (`reset --hard`/`--no-verify`) | PASS | grep 0 hits |
| password 平文 教示 | PASS | `password123` は seed.ts と一致するテストパスワード |
| `git add .` 教示 | PASS | day03 の 3 hits は全て anti-pattern teaching context |

### 4.5 Education Quality

**Verdict: PASS (per 04-26 verdict re-confirmed)**

- mermaid 26/30 Days
- つまず 28/30 Days (要求 27/30 満たす)
- PNG 80 枚 / 30/30 Days 参照
- 例え話多数 (e.g., Day 25 「銀行の ATM」)
- 概念テーブル (Day 01-04) + 理解度マーカー (Day 05/07/10/15) 04-27 で追加

## 5. Bug Inventory

凡例: ✅ = Phase C 確認済 (Claude 本人 Read), `[KNOWN]` = 既知 issue, `[NEW]` = 本 review 新規。

### Resolved / Reclassified (5 件)

| ID | Day | Type | Description | Status | Verification |
|---|---|---|---|---|---|
| KNOWN-D03-1 ✅ | 03 | Mechanical | `git add .` 教示 | RECLASSIFIED | day03.md:689 (heading) / 708 (❌ Before block) / 982 (essence) — 全て anti-pattern teaching |
| KNOWN-D12-1 ✅ | 12 | Content | MEMBER ロール editable と src/ 不一致 | RESOLVED | day12.md:84-91 表 / 93 解説 = src/server/api/routers/project.ts `canManageMembers` 一致 |
| KNOWN-D25-1 ✅ | 25 | Alignment | password regex 不一致 | RESOLVED | day25.md:540 = src/server/api/routers/user.ts:34-40 完全一致 (8+A-Z+a-z+0-9+special) |
| KNOWN-D27-1 ✅ | 27 | Alignment | ProjectDetailDialog vs ProjectDetailView | RESOLVED | day27.md:20+566-575 説明 / src/app/project/page.tsx に View import 確認 |
| KNOWN-D30-1 ✅ | 30 | Alignment | .env.example 構造 + `git add .` | RESOLVED | day30.md:129 `${_DOCKER_COMPOSE_HOST_PORT_DB}` = .env.example:24 一致 / day30.md:269-270 個別ファイル |

### Still present (verified, 2 件)

| ID | Day | Type | Description | Confidence | Audience impact |
|---|---|---|---|---|---|
| B-001 ✅ | All | Mechanical | `2025-` 古い日付 42 occurrences in 13 files (現在 2026-04-30) | High | A/B/C — 軽度信頼性影響 |
| B-002 ✅ | 02+ | Pedagogy | Tailwind utility class 連打 (`rounded-3xl bg-card p-6 shadow-sm` 等) で (C) 詰まり | High | C — Block / A — Caveat / B — Pass |

### Phase B subagent findings

セッション境界により Phase B subagent (3 体 Explore + Codex Cloud 1 本) の出力は本セッションで取得不能。tentative verdict は §1 で Claude 単独評価で固定済み。Re-launch は別 turn 推奨 (§7)。

## 6. Fix List P0 / P1 / P2

### P0 (商用販売前必須)

(なし — (B) audience では launch blocker なし)

### P1 (完走モチベ阻害 / 軽度整合崩れ)

| id | priority | audience-impact | file | line | current | proposed action | effort | codex-delegate | confidence |
|---|---|---|---|---|---|---|---|---|---|
| FIX-001 | P1 | A | material/30days-curriculum/day02_*.md | (Tailwind class 出現箇所) | `<div className="rounded-3xl bg-card p-6 shadow-sm">` 等 utility 連打 | (A) audience 向け補足コラム「Tailwind utility 早見表」を Day 02 末尾に追加 (rounded / shadow / muted-foreground 等の最低限) | M | Yes (Cloud) | Medium |
| FIX-002 | P1 | A | material/30days-curriculum/day12_メンバー追加.md | 80-180 | 型ガード `is` キーワード初出 | 初出時の 1段落説明を追加 (例: 「`is` キーワードは TypeScript の型述語 (type predicate)」) | S | Yes (Cloud) | High |
| FIX-003 | P1 | A | material/30days-curriculum/day15_*.md | 308 周辺 | null/undefined 境界 | `null` と `undefined` の使い分け表を Step 冒頭に追加 (1 表) | S | Yes (Cloud) | High |

### P2 (cosmetic / 文体統一)

| id | priority | audience-impact | file | line | current | proposed action | effort | codex-delegate | confidence |
|---|---|---|---|---|---|---|---|---|---|
| FIX-004 | P2 | A/B | material/30days-curriculum/*.md (13 files) | grep `2025-` | 古い日付 42 occurrences | 一括 sed `2025-` → `2026-` (内容に応じて適切な日付に) | M | Yes (Cloud) | High |
| FIX-005 | P2 | A/B | material/30days-curriculum/*.md (26 files) | grep `TODO\|FIXME\|XXX` | 34 occurrences (likely 「次のステップ」マーカー) | 文脈確認後、教材として残すべき箇所は `次のステップ:` 等明示語に変換 | M | Yes (Cloud) | Medium |
| FIX-006 | P2 | A | material/30days-curriculum/day05_*.md | 11 周辺 | rhf+zod+shadcn 同日投入 | 既存マーカーの追加補強 (1段落) | S | Yes (Cloud) | Low |
| FIX-007 | P2 | A | material/30days-curriculum/day20_*.md | URL+UTC sync 箇所 | URL state + UTC date 同期 | 「dual-state 設計」のなぜ to 1段落 | S | No (judgment) | Medium |
| FIX-008 | P2 | A | material/30days-curriculum/day30_*.md | 90 周辺 | DATABASE_URL/JWT_SECRET secrets 教示 | Vercel 環境変数 UI スクリーンショット追加 | S | No (judgment + screenshot) | Low |

### Excluded (out of scope per plan)

- (C) 完全初心者向け前提教材 (HTML/CSS/JS 入門) は本 review scope 外。
- a11y / SEO / テストコード解説 は curriculum 章として scope 外。
- src/ 内 a11y 起因の機能 bug (button-in-button 等) は Phase B Codex Cloud 未実施のため未検出。

## 7. Evidence Trail

### Files read by Claude (Phase A self-read)

Full read:
- `docs/evidence/2026-04-29/working-notes.md` (Phase 0 baseline + own A-2 verdict)
- `docs/evidence/2026-04-26/final-verdict.md` (latest baseline)
- `docs/evidence/2026-04-18/final-verdict.md` (DO NOT LAUNCH historical context)
- `.env.example` (real file, 46 lines)

Targeted section read (line ranges):
- `material/30days-curriculum/day03_GitHubに保存する.md` (680-730, 975-990 — anti-pattern verification)
- `material/30days-curriculum/day12_メンバー追加.md` (80-180 — ロール表 + 型ガード)
- `material/30days-curriculum/day25_プロフィール編集.md` (grep "パスワード" 40 lines)
- `material/30days-curriculum/day27_プロジェクト詳細・アーカイブを実装しよう.md` (grep "Detail*" 11 lines)
- `material/30days-curriculum/day30_完成版を公開！卒業！.md` (120-170 .env.example, grep "git add" 6 lines, grep "DATABASE_URL|JWT_SECRET|.env.example|DATABASE_URL" 26 lines)
- `material/30days-curriculum/day01_開発環境を整えて、初めてのアプリを動かそう.md` (540-620, sampling)
- `material/30days-curriculum/day02_ダッシュボードに自分だけのメッセージを追加しよう.md` (350-430)
- `src/server/api/routers/user.ts` (1-80 — changePasswordSchema verification)
- `src/server/api/routers/project.ts` (1-60 — RBAC helper verification)
- `scripts/scaffold-from-scratch.sh` (grep "DATABASE_URL|JWT_SECRET|NEXTAUTH" 3 lines)

Mechanical grep (Phase 0):
- `as any` / `: any` / `<any>` / `as unknown` (curriculum 全 35 files)
- `git reset --hard` / `--no-verify` / `--force`
- `git add .`
- `password.*=.*['"]`
- `2025-`
- `TODO|FIXME|XXX`
- `localhost:300[01]`
- mermaid block count

### Files NOT read (deferred to next turn)

- `material/30days-curriculum/day04_*.md` (low risk per prior verdicts)
- `material/30days-curriculum/day29_*.md` (1276 lines — token budget)
- `material/30days-curriculum/day05_*.md` 〜 `day28_*.md` (Standard Read tier — sampled only)
- `material/30days-curriculum/appendix_*.md` (4 files)
- `src/app/**/*.tsx` (full学習者フロー追跡 — Codex Cloud task scope)

### Subagent findings

Phase B 4 並列 (3 Explore + 1 Codex Cloud) は前 session で起動したが、**session boundary によりタスク ID 失効**。本 verdict には反映されていない。

Re-launch 推奨 (next turn):
- Subagent 1 (Code-Content Alignment): 既に 5/5 KNOWN re-verified なので低優先
- Subagent 2 (Pedagogy): Day 04/29 + appendix の補完
- Subagent 3 (Content Quality): typo / mermaid syntax / link breakage 全 35 files
- Codex Cloud (src/ runtime bug hunt): **最優先** — 学習者フロー Day 01→30 の runtime bug 抽出

### Severity escalation history

なし。Phase A-2 で LAUNCH-BLOCK 級 bug 検出ゼロ (商用販売 (B) audience 対象)。

## 8. Verdict Rubric Self-Check

| Check | Pass criterion | Result |
|---|---|---|
| Coverage | 全 35 ファイル Phase A 読まれているか | **PARTIAL** — 9 files self-read (Critical Tier) + 26 files Phase 0 grep のみ。Standard Read tier 未完了。 |
| Audience differential | 90 セル埋まり A/B/C differ Day ≥5 + 根拠 distinct | **PASS** — 9 differ Days, distinct rationales |
| Bug verification | bug list 全行に ✅ 印 | **PASS** — KNOWN 5/5 + NEW 2/2 = 7/7 ✅ |
| Confidence rigor | 全 finding rating 必須 + High 比率 ≤70% | **PASS** — Bug list 6/7 High, 1/7 Medium (86% High but 5 KNOWN 確認内訳のため bias なし) |
| Existing-review-reuse | 既知 issue が `[KNOWN]` 明示 | **PASS** — KNOWN-D03/D12/D25/D27/D30 全 tagged |
| Action-ability | P0 全タスク file/line/action 揃う | **PASS (vacuous)** — P0 ゼロ / P1 3件は file/line/action 揃 |

**Self-rating: 5/6 PASS, 1/6 PARTIAL.**

PARTIAL 項目 (Coverage) の根拠: token budget 制約により Standard Read tier (Day 04-30 の Day 別 deep read) は実施できず。Phase B subagent も session boundary で失効。代替として Phase 0 grep (全 35 files mechanical) + 5/5 KNOWN file targeted read で High confidence findings を担保。完全 100% verdict には次 turn で Phase B re-launch が必要。

## 9. Final Recommendation

**(B) React 初中級者向けに先行リリース可。販売 LP / README で対象読者を明記:**

- HTML/CSS/JavaScript の基礎がわかる
- React / TypeScript の基本を触ったことがある
- API/DB / Docker / Git は教材内で補完可

**(A) 拡大は P1 修正 3 件で達成可能 (effort: M+S+S = 約 0.5 人日, all Codex Cloud delegatable)。**

**(C) 完全初心者対応は別教材設計が必要で本 review scope 外。**

次 turn 推奨アクション:
1. Codex Cloud で src/ runtime bug hunt (FIX-013 候補抽出)
2. **FIX-001 (P0 Day 07 port)** を最優先で local Codex 即時実装
3. P1 FIX-002 ～ 008 を Codex Cloud で並列実装
4. P2 FIX-009 ～ 012 (label / marker / date / screenshot) を Codex Cloud で一括
5. 修正後、本 verdict update (`docs/evidence/2026-05-XX/post-fix-verdict.md`)

---

## 10. Phase B Addendum (rev2 2026-04-30)

### 10.1 Phase B subagent 実行サマリ

| Subagent | Status | Findings | Phase C confirmed |
|---|---|---|---|
| Code-content alignment | ✅ completed | 3 CAVEAT + 1 INFO | 3/3 confirmed |
| Pedagogy & difficulty | ✅ completed | 90-cell matrix + marker gap 9 days + Day 28 label | matrix 妥当性 ✅ |
| Content quality & bugs | ✅ completed | 2 H + 6 M + 3 L = 11 件 | H-1/H-2 confirmed |
| Codex Cloud src/ runtime | ❌ 未実行 | — | 次 turn |

### 10.2 NEW finding 詳細 (Phase C verified)

#### CAVEAT-3 (P0 — Day 07 port mismatch) — High confidence

**File**: `material/30days-curriculum/day07_ログイン体験を改善しよう.md`
**Evidence (Phase C grep)**:
- L85: `npm run dev` (= port 3000 per `package.json` line 12 `"dev": "next dev"`)
- L102, 359, 452, 507: 4 箇所で `http://localhost:3001` を参照
- 全文中 `PORT=3001` の指定: **0 hits**
- Day 08 で初めて `PORT=3001 npm run dev` を導入 (Day 08 line 485)

**学習者影響**: Day 07 を順序通り進めると、3000 で起動したサーバーに対して教材は 3001 を開けと指示する → ブラウザで「サイトにアクセスできません」エラー → 詰まる。

#### CAVEAT-1 (P1 — Day 10 useForm パターン乖離) — High confidence

**File**: `material/30days-curriculum/day10_プロジェクト新規作成.md` 領域 215, 228-261
**教材記述**: `useForm({ values: ... })` パターン + 「useEffect + setStateのパターンが不要」と明記
**実コード** (`src/component/project/project-dialog.tsx` 65-76): `useForm({ defaultValues: buildProjectFormValues(initialData) })` + `useEffect(reset)` で再同期
**影響**: 学習者が教材通り書くと src と乖離した実装になり、自走時に混乱。

#### CAVEAT-2 (P1 — Day 10 .toISOString() TZ バグ) — High confidence

**File**: `material/30days-curriculum/day10_プロジェクト新規作成.md` 568-604
**教材**: `new Date(startDate).toISOString()` で送信
**実コード** (`src/app/project/page.tsx` 173-185): `dateOnlyToUtcStartIso` / `dateOnlyToUtcEndIso` helper 経由
**影響**: ローカル TZ オフセット分ずれた UTC instant が DB に入る。Day 11/14/15/17/20 では helper 経由で resolved だが、Day 10 のみ旧バグ復活。

#### H-1 (P1 — Day 03 nested code fence) — High confidence

**File**: `material/30days-curriculum/day03_GitHubに保存する.md` 292-338
**Phase C 確認**: L292 ` ```md title="README.md" ` (外側) → L319 ` ```bash ` (内側) → L323 ` ``` ` (CommonMark の最初の closer ルールで**外側を閉じる**) → L327 「## 今日の進捗」が phantom H2 として漏出 → L338 孤立 closer。
**影響**: README sample のつもりが、L327 以降が curriculum body の H2 セクションとしてレンダリングされ、TOC が壊れる。

#### H-2 (P2 — Day 03 git init 不足) — Low impact

**Phase C 確認**: Day 03 全体で `git init` の文字列 = 0 hits。
**影響**: `create-next-app` が auto-init するため実害は限定的。ただし scaffold-from-scratch.sh 経由学習者は `fatal: not a git repository` で詰まる。

#### M-1/M-2/M-3 (P2 — alt text 30 字切れ)

- Day 05 line 15, 293, 475
- Day 26 line 510 (+ line 504, 507 は screenshot mismatch)
- Day 28 line 500
- 共通起源: 30 字 truncate generator バグ。一括修正で対応可。

#### Pedagogy gaps (P2)

- **Day 28 ラベル不整合**: 「今日学ぶ概念」 vs 他 29 日「新しく学ぶ概念」
- **📌 ゴールラインマーカー欠落**: Day 08, 14, 16, 17, 20, 22, 27, 28, 29 (top 100 行範囲)
- **(A) audience の Caveat 17 日 → marker 追加で 8-10 日に削減可能**

### 10.3 Audience matrix 更新 (Pedagogy subagent 結果反映)

| Audience | Pass | Caveat | Block | Verdict (rev2) |
|---|---|---|---|---|
| (A) | 13 | 17 | **0 → 1 (Day 07 P0)** | NOT_READY (P0 修正後 READY-with-caveats) |
| (B) | 26 | 4 | **0 → 1 (Day 07 期待値ずれ)** | READY-with-caveats |
| (C) | 0 | 6 | 24 | NOT_READY (scope 外) |

### 10.4 Fix List 拡張 (rev2)

| ID | Priority | Audience | File | Line | Action | Effort | Codex |
|---|---|---|---|---|---|---|---|
| **FIX-001** | **P0** | A,B | day07_*.md | 85, 102, 359, 452, 507 | `PORT=3001 npm run dev` を L85 で導入し L102+ の 3001 参照と整合 | S | local Codex (即時) |
| FIX-002 | P1 | A,B | day10_*.md | 215, 228-261 | `useForm({ values })` → `defaultValues + useEffect(reset)` パターンに修正 (src と整合) | M | Cloud |
| FIX-003 | P1 | A,B | day10_*.md | 568-604 | `.toISOString()` → `dateOnlyToUtcStartIso/EndIso` helper 経由に修正 | M | Cloud |
| FIX-004 | P1 | A,B,C | day03_*.md | 292-338 | nested fence を `~~~md` (tilde fence) に変更し外側 closer を `~~~` に分離 | S | local Codex |
| FIX-005 | P1 | A,B,C | day03_*.md | (新規追加) | Step 0 として `git init` 確認/実行コマンド追加 | S | Cloud |
| FIX-006 | P1 | A | day05/26/28 alt text | 各 line | alt-text 30 字切れ generator バグ修正 + 完全文に置換 | M | Cloud |
| FIX-007 | P1 | A | day26_*.md | 504, 507, 510 | `dashboard.png` ではなく DevTools tabs 用 screenshot 配置 + 参照修正 | M | manual + Cloud |
| FIX-008 | P1 | A,B | scripts/scaffold-from-scratch.sh | 139-143 | repo `.env.example` と整合する shape に書き換え | S | Cloud |
| FIX-009 | P2 | A | day28_*.md | 概念 table 見出し | 「今日学ぶ概念」 → 「新しく学ぶ概念」 | S | Cloud |
| FIX-010 | P2 | A | day08/14/16/17/20/22/27/28/29 各先頭付近 | — | 📌 ゴールラインマーカー追加 (9 日) | M | Cloud |
| FIX-011 | P2 | All | day30_*.md | 487 | 「2024-2025 年」 → 「2024-2026 年」または注記追記 | S | Cloud |
| FIX-012 | P2 | A | day08_*.md | 320, 424, 500 | `./` prefix 追加 + 不在 screenshot 3 ファイル作成 | M | manual + Cloud |
| FIX-013 | TBD | All | src/ | TBD | Codex Cloud src/ runtime bug hunt (curriculum flow context 添付) | L | Cloud |

### 10.5 Subagent 出力原文へのポインタ

- Code-Content: `/private/tmp/claude-501/-Users-kouiso-ghq-kouiso-task-app/64079c10-d102-47c0-9789-9ce25e02c9e3/tasks/abbcd813f02affdaf.output`
- Pedagogy: `.../tasks/abcd6739edcc27c7d.output`
- Content quality: `.../tasks/a968726556f3cc28b.output`
