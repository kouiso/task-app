# Comprehensive Audit — 2026-05-18

**Mission**: deep self-audit + research + adversarial Codex review。教材販売 (有償 product) として task-app を出荷可能な状態にするための critical path 明確化。

**Author**: Uchida Yuki (内田祐貴) / claude-opus-4-7
**Scope**: 14 axes × 5 phases × essential-not-surface rule
**Confidence**: High for confirmed-DONE, Medium for pre-mortem, declared Low/Medium where applicable

---

## Phase 1: Past-session inventory

ローカル mac sessions (2 jsonl + 多数 subagents) を codex CLI 2 並列で抽出。WSL 過去ログは `windows-lan` (192.168.11.24) SSH timeout のため**今回スコープ外**。

### Session e5959b05 (4,626 lines) — curriculum walkthrough loop

| Bucket | Count | 抜粋 |
|---|---|---|
| DONE | 84 | curriculum quality gate 30/30 PASS、loop-runner 構築、scaffold _lib-base 復元、Day05/06/10/11/17/23 個別 fix、apply_day.py の skip 検出 3 層、git tag `loop-2-day-NN-end` 30 本 |
| IN-PROGRESS | 10 | 真の "学習者写経" テスト (`apply_day.py` の incremental insert 未対応)、Loop3 fresh run、第三者写経、playwright DOM verifier、sales readiness |
| DROPPED | 8 | naive apply_day, `seq -w` orchestrator, `git reset --hard` 単独運用 |
| NEVER-STARTED | 12 | DB snapshot in `snapshot_day.sh`、`_verification/dayNN.json`、78 image vision baseline、screenshot diff loop、loop-runner 後の ZIP 再生成、学習者リクルート |

詳細: `/tmp/task-app-audit/session-e5959b05.md` (16KB)

### Session f4e2c507 (1,702 lines) — backlog elimination + audit start

| Bucket | Count | 抜粋 |
|---|---|---|
| DONE | 33 | PR #91/92/93/95/96/97/99/100/102 マージ、Issue #38/39/40/41/42/43/50/94/98 close、stale 17 branch 削除、Issue #101 起票 |
| IN-PROGRESS | 12 | PR #103 (sticky)、Issue #45/101、本 audit mission Phase 1-5、PR #103 CI 待ち |
| DROPPED | 5 | 初期 UX audit deliverable、playwright SP/tablet/desktop walkthrough |
| NEVER-STARTED | 9 | 19-rule ui-audit、palette/guideline pass、mobile-app-design 不要、Day 別 real `npm run build` rerun |

詳細: `/tmp/task-app-audit/session-f4e2c507.md` (11KB)

### 過去 session の design decisions が現在も生きているもの

1. The true product gate is curriculum followability Day01→Day30, not just app-level E2E
2. `apply_day.py` skip layer (SKIP_NO_EXPORT / SKIP_BRACE / SKIP_JP_PATH) はバグでなく仕様
3. scaffold に教材より先の implementation stub を含めることを許容 (Day05/06 が tRPC を既に使うため)
4. `prisma migrate deploy` を本番運用とする (実装は本 PR #104 で baseline 導入)
5. PR コメントは sticky 化が前提 (PR #103 で実装)
6. CI の runs-on は `vars.RUNNER_LINUX` で変数化 (PR #102 でマージ済み)
7. 既知 quality-gate failure を follow-up issue 付きで先行マージする運用 (PR #91 / issue #94)

### 過去 session の中で「DONE と主張されたが verification 不足」の発見

| 主張 | 実態 |
|---|---|
| 「修正 0 件で Day01→30 完走」(macmini AI、2026-05-15) | PR #93 audit で **false**: loop-state.json に 13 失敗、書き込みは 14/590 ブロックのみ。e5959b05 末尾でも user に "ほんとに？" と challenge され訂正 |
| 「`apply_day.py` で学習者写経を完全シミュレート」 | 機能的に未達成。「`incremental insert` (e.g., `handleCreate の直下に追加`) は未実装」と e5959b05 末尾で明記 |
| 「全 PR 自己レビュー 100/100」 (前 session) | 本 audit で `prisma/migrations` 不在を発見 (curriculum と不整合) → PR #104 で fix |

---

## Phase 2: 14-axis self-audit (essential, not surface)

採点根拠は **実行可能な検証コマンドの出力 or 観測された PR/issue リンク**。"コード読んで OK" は失格。

### 結果サマリ

| Axis | Score | Evidence path | Gap (essential, not symptomatic) |
|---|---|---|---|
| feature-completeness | 95 | git log + 17 page.tsx + 14 test file | curriculum incremental snippet apply 未実装 (issue #105 候補) |
| test-coverage | 75 | `npm test`: 203 tests / 14 files PASS (test-db@25533) | 128 src files に対し 14 test file (~11%)。E2E spec は capture-screenshots しかない |
| security | 92 | `npm audit`: HIGH 0 / moderate 2 (postcss)、Sentry 設定有り、JWT in jose、SKIP_ENV gated | login mutation に rate-limit 無し (issue #106 候補) |
| docs | 92 | `doc/DATABASE_MIGRATIONS.md` (PR #104 追加)、curriculum 30 days、existing `doc/01-19.md` | ROLLBACK / DEPLOYMENT 概観 doc 不在 (DATABASE_MIGRATIONS.md でカバー)、INCIDENT_RESPONSE 不在 (issue #107 候補) |
| dep-health | 88 | `npm outdated`: 9 outdated minor、HIGH CVE 0 | react 18→19 / @prisma/client 6→7 / hookform 3→5 major bump 残 |
| performance | 90 | Next.js 15.5.18 (Server Components default)、`next build` middleware 92.7KB | Bundle 解析未実施、CDN cache header 未確認 |
| a11y | 70 | `grep aria-`: 15/43 component | dialog/dropdown 系の focus trap / esc handling 未確認、screen reader 動作テストなし |
| edge-cases | 85 | 203 unit test、type-guard test、zod env validation | concurrent edit / network partition / 大量 task の paging 限界 未テスト |
| regression-risk | 88 | CI matrix: biome / type-check / test / build / semgrep / trufflehog / license / vercel deploy / playwright (capture only) | E2E spec が screenshot 取得のみで behavioral assertion 無し (issue #108 候補) |
| deploy-readiness | 88 | Vercel preview deploy、CI green、prisma migrate baseline | DEPLOYMENT.md (環境変数、シークレット rotate 手順、初回 setup) 不在 (issue #107 にまとめる) |
| observability | 85 | Sentry instrumentation (DSN gated)、`onRequestError` フック、`console.log` ゼロ | structured log (request-id) 未実装、metrics (request count / latency) 未収集 |
| UX-friction | 88 | toast / dialog / loading state あり、PR #99 で login race 解消 | mobile responsive 未検証 (e2e/screenshots は PC sized)、empty-state / error-state バリエーション網羅未検証 |
| i18n | N/A | 0 i18n lib、JP-only string 多数 | **意図的 (教材 JP-only product)**。i18n は scope 外 → 100/100 として除外 |
| data-integrity | 95 | PR #104 で migrations baseline + drift check 0、bcrypt password、prisma enum 制約 | prisma seed の冪等性未テスト、orphan record cleanup 戦略未明文化 |

**Phase 2 で実装した essential fixes**:
- PR #104: prisma migrations baseline + husky pre-push 修復 + `doc/DATABASE_MIGRATIONS.md` (data-integrity gap closure)

**Phase 2 で issue として切り出した fix**:
- 後述 follow-up セクション

### Score 計算根拠の透明性

100/100 を僭称しないルール:
- security: 92 (NOT 100) なぜなら login rate-limit 不在 → brute force 攻撃で 1 password / 0.1 sec attack 可能。bcrypt cost = default 10 でも数日で 8 char ASCII pwd 解読余地あり
- test-coverage: 75 なぜなら 14/128 = ~11% file coverage、E2E behavioral assertion 0
- a11y: 70 なぜなら 35% component に aria 属性のみ、focus trap / sr 動作未検証
- データ駆動評価: anti-laziness 8 にあるとおり「100/100 without evidence」を拒否

---

## Phase 3: Pre-mortem (3 ヶ月後 prod 失敗を想定、各シナリオ 確率×影響×現状緩和強度)

| # | Category | Scenario | P (確率) | I (影響) | M (現状緩和) | Gap |
|---|---|---|---|---|---|---|
| 1 | security | bot による login brute force で admin account compromise → seed user 削除 / DB 全消し | **High** | **High** | None: rate-limit 不在、admin lockout なし | issue #106 で rate-limit 実装 |
| 2 | data-integrity | 教材買った受講者が `db push` を本番で叩いて schema drift → 旧データ消失 | **High** | **High** | DATABASE_MIGRATIONS.md doc 追加済 (PR #104) | doc 周知不足 → README に migration policy 明記 (本 PR で追加) |
| 3 | UX regression | login race condition 再発 (router.refresh / RSC fetch タイミング) | Medium | High | PR #99 で `window.location.replace` 化、loginのみ E2E は無し | login E2E test 追加 (issue #108 にまとめる) |
| 4 | business misalignment | 教材販売開始前に LP/メルマガ準備不在 → 在庫 (curriculum 完成度) と販路の mismatch | **High** | **High** | None: curriculum 完成度のみで止まっている | issue #109 で LP/メルマガ要件定義 |
| 5 | scalability | Sentry 無料枠 / Vercel hobby tier で本番トラフィック超過 → 学習者離脱 | Medium | High | Sentry DSN gated、Vercel free → pro upgrade パス不明 | DEPLOYMENT.md に upgrade トリガ条件記載 (issue #107) |
| 6 | operational toil | 教材 PR/issue triage が kouiso 一人依存 → bus factor = 1 | **High** | Medium | None: 内田祐貴 (AI) が代行するが、master account = kouiso 個人 | issue #110 で副管理者 (副長 / 局長 構造) 委譲設計 |
| 7 | vendor lock-in | Vercel-specific feature (Edge Runtime middleware) が他 PaaS 移行不可 | Low | Medium | jose で edge JWT、prisma で portable ORM | edge runtime 依存箇所のリスト化 (issue #111) |
| 8 | regulatory | Pwned password 未 check で users が破られた pwd 設定可能 → 第三者被害 | Medium | Medium | zod regex で complexity 強制、bcrypt 保管 | HIBP API check 追加 (issue #106 と束ねる) |
| 9 | bus-factor | task-app の内部設計知が `material/30days-curriculum/` の 30 md にしか無く、新規 contributor onboarding 不能 | Medium | High | doc/01-19.md 存在、README にプロジェクト概観あり | ARCHITECTURE.md 追加 (issue #112) |
| 10 | dependency rot | react 18→19、prisma 6→7 など major bump 放置 → 6 ヶ月後 fix 不能になる | Medium | High | npm audit 監視、Dependabot 設定済 | major bump 計画的実施の運用 doc (issue #113) |
| 11 | hidden tech debt | `wip/preserve-curriculum-walkthrough-20260516` の 161 ファイル WIP が残置 | Medium | Medium | issue #101 で triage 起票済 | 期限明記 (本 audit で 2026-06-01 締切提案) |
| 12 | observability gap | 404/500/auth-failure の頻度測定不能 → 教材ハマりポイント特定不可 | **High** | Medium | Sentry error 捕捉のみ、custom event なし | metric 設計 (issue #114) |
| 13 | rollback path absent | Vercel deploy 後 prod regression 発生時、point-in-time recovery 手順未明文化 | Medium | High | Prisma migrate に rollback コマンドない (forward fix 戦略) | DATABASE_MIGRATIONS.md に Vercel Postgres PITR 手順追記 (本 PR で追加 → done) |
| 14 | bus-factor #2 | 内田祐貴 AI 不在時に kouiso のみで 30 days material が読めるか未検証 | Low | High | curriculum 自己完結、PR #95 で quality gate 30/30 | 学習者代表による fresh transcription (NEVER-STARTED in e5959b05) |

**HIGH × HIGH 失敗**: #1 (rate-limit)、#2 (migration doc 周知)、#4 (business 販路設計)

これら 3 件には follow-up issue を起票して 2026-06-01 までの owner / 期限を明確化する。

---

## Phase 4: Adversarial Codex review

**Status**: 提出予定 (本 doc commit 後、codex cloud exec に Phase 1+2+3 全文を投げて反論を取得)

Cloud submission prompt 概要:
> "Adversarial review. Challenge every claim in this audit. Find what is missed. Find what is wrong. Find what is hand-wavy. Push back hard on weak reasoning. Be ruthless. Specifically question: (a) the 14-axis scores, (b) the 14 pre-mortem scenarios, (c) the 'DONE with evidence' claims in Phase 1."

`codex cloud status <task_id>` でポーリング、結果は本 doc 末尾 (`## Phase 4 results`) に追記する。

---

## Phase 5: Final verdict

### (a) Confirmed-DONE (本 audit mission session 内、verification evidence 付き)

| # | Item | Evidence |
|---|---|---|
| 1 | PR #99 merged (Issue #98 login race) | `gh pr view 99 --json state` = MERGED, commit 6a80217 |
| 2 | PR #100 merged (loop-runner pipeline) | commit 1c8d476、bot review threads resolved (6 thread) |
| 3 | PR #102 merged (runs-on 変数化、Issue #50) | commit 6314082、17 workflow file 変更 |
| 4 | PR #103 open (sticky-pull-request-comment、Issue #45) | PR #103 OPEN、CI green、bot review 待ち |
| 5 | PR #104 open (prisma migrations baseline + husky 修復) | PR #104 OPEN、`prisma migrate deploy` E2E PASS、drift check 0 |
| 6 | Issue #38/39/40/41/42/43/98/50 closed | `gh issue view` 各 state=CLOSED |
| 7 | 18 stale branches deleted | `gh api -X DELETE` 17 件 + push delete 1 件 |
| 8 | Issue #101 opened (161-file triage) | `gh issue view 101` state=OPEN |
| 9 | Phase 1 inventory generated | `/tmp/task-app-audit/session-{e5959b05,f4e2c507}.md` |
| 10 | Phase 2 14-axis scored with evidence | 本 doc 該当節 |
| 11 | Phase 3 pre-mortem 14 scenarios | 本 doc 該当節 |

### (b) 新発見の missed work + remediation

| Finding | Phase 2 detection | Remediation |
|---|---|---|
| `prisma/migrations` 不在 ↔ day30 教材で `prisma migrate deploy` 教えてる不整合 | Phase 2 data-integrity audit | PR #104 で baseline + doc |
| husky pre-push が削除済み `develop` 参照 | Phase 2 git infra audit (副作用) | PR #104 内 commit |
| login mutation に rate-limit 不在 | Phase 2 security audit | Issue #106 起票予定 |
| login E2E behavior test 不在 | Phase 2 regression-risk audit | Issue #108 起票予定 |
| DEPLOYMENT / INCIDENT_RESPONSE doc 不在 | Phase 2 docs / deploy-readiness audit | Issue #107 起票予定 |
| WIP branch 期限なし | Phase 3 hidden tech debt | Issue #101 を update (2026-06-01 期限) |
| business misalignment (LP/メルマガ) | Phase 3 #4 HIGH×HIGH | Issue #109 起票予定 (販路設計、product 別軸) |
| bus factor = 1 | Phase 3 #6 HIGH×Medium | Issue #110 起票予定 (副管理者構造) |
| ARCHITECTURE.md 不在 | Phase 3 #9 | Issue #112 起票予定 |

### (c) Codex adversarial findings + response

(Phase 4 完了後に追記)

### (d) Residual risks

| # | Risk | Mitigation strategy | Owner / Due |
|---|---|---|---|
| R1 | Login brute force | Issue #106 で rate-limit (DB-backed counter) 設計 → 実装 | kouiso / 2026-06-01 |
| R2 | 教材販路ゼロ | Issue #109 で LP / メルマガ MVP 仕様 | kouiso / 2026-05-31 |
| R3 | bus factor=1 | Issue #110 で副管理者 invite + 設計 doc | kouiso / 2026-06-15 |
| R4 | 161-file WIP triage 未完 | Issue #101 を 2026-06-01 期限化 | kouiso / 2026-06-01 |
| R5 | E2E behavioral test 0 | Issue #108 で playwright spec set 設計 | claude / 2026-06-30 |
| R6 | dependency major bump 計画なし | Issue #113 で四半期ペース策定 | claude / 2026-07-01 |
| R7 | observability metric 設計なし | Issue #114 で metric カタログ作成 | claude / 2026-06-30 |

### (e) 100/100 score per axis with evidence — final

(i18n は intentional out-of-scope のため除外)

| Axis | Current | Target | Path to 100 |
|---|---|---|---|
| feature-completeness | 95 | 100 | incremental snippet apply 実装 (issue #105) |
| test-coverage | 75 | 100 | E2E behavioral + unit coverage 80%+ (issue #108) |
| security | 92 | 100 | rate-limit + HIBP check (issue #106) |
| docs | 92 | 100 | ARCHITECTURE / DEPLOYMENT / INCIDENT (issue #107/#112) |
| dep-health | 88 | 100 | major bump quarterly plan (issue #113) |
| performance | 90 | 100 | bundle analyzer + cache headers (issue #115) |
| a11y | 70 | 100 | wcag 2.1 AA pass via axe-core (issue #116) |
| edge-cases | 85 | 100 | property-based tests + chaos (issue #117) |
| regression-risk | 88 | 100 | E2E behavioral (issue #108) |
| deploy-readiness | 88 | 100 | DEPLOYMENT.md + secret rotate procedure (issue #107) |
| observability | 85 | 100 | metric / structured log (issue #114) |
| UX-friction | 88 | 100 | mobile responsive 検証 + empty state catalog (issue #118) |
| data-integrity | 95 | 100 | seed 冪等性テスト + orphan cleanup (issue #119) |

---

## 評価サマリ

**Honest 採点 (anti-laziness rule 適用後)**: 平均 87.0 / 100 (i18n 除外、13 軸)

**「essential, not surface」観点での評価**:
- ✅ 本 mission 内で **essential remediation** を即実装: PR #104 (data-integrity + tooling)
- ✅ 全 axis 評価に **observable evidence** を紐付け
- ✅ 全 pre-mortem シナリオに **確率×影響×現状緩和** を明示
- ⚠️ rate-limit (issue #106) は本 session 内で実装するか follow-up にするか judgment call: **kouiso (磯貝さん) の architectural sign-off (cache backend = DB / Redis / Upstash KV) が essential であるため follow-up とする**。本 session 内での実装は premature
- ⚠️ Codex adversarial review (Phase 4) は本 doc commit 後に提出予定。結果反映前に Phase 5 closing は incomplete

**Follow-up PRs/issues**:

| # | Type | Title (planned) |
|---|---|---|
| #105 | issue | feat(loop-runner): incremental snippet apply (curriculum 写経精度向上) |
| #106 | issue | feat(security): login rate-limit (DB-backed) + HIBP password check |
| #107 | issue | docs: DEPLOYMENT.md + INCIDENT_RESPONSE.md + secret rotate 手順 |
| #108 | issue | test(e2e): login / dashboard / task-CRUD の behavioral assertion |
| #109 | issue | biz: LP / メルマガ MVP 要件定義 (販路 setup) |
| #110 | issue | ops: 副管理者構造 (副長 / 局長 / 組長) の権限委譲設計 |
| #111 | issue | infra: edge runtime 依存箇所のリスト化 |
| #112 | issue | docs: ARCHITECTURE.md 追加 |
| #113 | issue | ops: dependency major bump quarterly plan |
| #114 | issue | obs: metric カタログ + structured log |
| #115 | issue | perf: bundle analyzer + cache headers tuning |
| #116 | issue | a11y: wcag 2.1 AA pass (axe-core CI integration) |
| #117 | issue | test: property-based + chaos coverage |
| #118 | issue | UX: mobile responsive 検証 + empty/error state catalog |
| #119 | issue | data: seed 冪等性テスト + orphan cleanup 戦略 |
| #101 | (update) | 2026-06-01 期限化 |

これらの follow-up は本 PR マージ後、別 PR / 別 session で順次。
