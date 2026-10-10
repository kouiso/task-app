# Gate B 判定への補遺 (2026-10-10 追補) — FAIL の原因帰属を修正

## 結論 (修正後)

**day28 bulk 手続き・day16 schema 配置は「教材の実質的欠損」ではなく、機械適用ツール (apply_day_v19.py) の splice 限界が原因。** 教材本文は完成版 oracle と行レベルで一致し、人間がフェンス指示どおり写経すればコンパイル可能な完成版へ収束する。

## 証拠

### 1. day28 のフェンス内容 = oracle 一致（実測）

`material/30days-curriculum/day28_*.md` の全 task.ts 向けフェンスを `src/server/api/routers/task.ts` (完成版) と行一致検証:

| フェンス | 教材の内容 | oracle | 判定 |
|---|---|---|---|
| Prisma/ProjectMemberRole import 置換 | `import { Prisma, ProjectMemberRole }` + `hasPermission, PermissionKey` | task.ts:1,6 同一 | 一致 |
| `taskTimeUpdateSchema の直後に追加` | MAX_BULK_TASKS / bulkTaskIdsSchema / getRolesWithPermission / TASK_*_ROLES | task.ts:48-57 同一 (折返しのみ差) | 一致 |
| `（続き）` buildBulkPermissionWhere | 関数全体 | task.ts:59-72 同一 | 一致 |
| `（続き）` assertBulkWriteCount | 関数全体 | task.ts:73-81 同一 | 一致 |
| `addTime の直後に追加` bulkComplete | 手続き全体 | task.ts:537-567 同一 | 一致 |
| `bulkComplete の直後に追加` bulkDelete | 手続き全体 | task.ts:569-591 同一 | 一致 |
| `bulkDelete の直後に追加` bulkUpdateStatus | 手続き全体 (0-5/0-6 分割) | task.ts:593-630 同一 | 一致 |
| `import に findTasksWithPermission を足す` | _helpers/permission import 行 | task.ts:12 同一 | 一致 |

### 2. day16 の位置指定も正しい

- 教材: `（taskRouter の前に追加）` `const taskTimeUpdateSchema = z.object(...)`
- oracle: task.ts:43 `taskTimeUpdateSchema` → task.ts:483 `addTime` 内 `.input(taskTimeUpdateSchema)`。
- 教材どおり taskRouter 前に置けば use-before-declare は発生しない。ツールが router 内へ誤配置したことが day16-27 の 2 エラーの直接原因。

### 3. 完成版アプリ自体はコンパイルクリーン（実測）

- `npm ci` (1357 pkgs) + `npx prisma generate` + `npx tsc --noEmit` → **exit 0・エラー0件** (macOS arm64 / node v24、engines>=22.12<23 に ignore-engines で代替実行)。
- 写経の収束先である完成版は型安全。写経人がフェンスどおりに書けば到達できる。

### 4. day28 全断片拒否は day16 誤配置の連鎖

v15 ledger: day28 `applied: []`、全断片 `fragment-not-in-baseline`。
day28 のアンカー (「taskTimeUpdateSchema の直後」「addTime の直後」) は、day16 でツールが誤配置した schema に依存 → baseline が教材想定とズレたため全拒否。単一の誤 splice が後続 12 日分の task.ts 断片を全滅させた連鎖構造。

## 判定変更

| 項目 | v15 verdict | 修正後 |
|---|---|---|
| A1 day28 bulk 手続き | 教材の実質的欠損 | **ツール限界 (教材は oracle 一致)** |
| A2 day16 schema 配置 | 位置フェンス強化を推奨 | 位置指定は既に正確。**ツールの directive 解釈不足** |
| C 不存在ファイル 4件 | scaffold が生成しない | 3件は oracle に存在 (setup.ts / app-layout.test.tsx / registration-complete.test.tsx)。残1件は下記参照 |

## 残る真の教材側ギャップ (小)

1. **`src/app/profile/page-query-state.test.tsx`** — day26 が「作り」と指示し 7 フェンスで内容を提示するが、完成版 src/ に該当ファイルが存在しない (profile 配下に `edit/page.test.tsx` のみ)。完成版へ追加するか��day26 の記述を調整するかの判断が必要。
2. **B-drift (app-layout.tsx ×8日ほか)** — 機械的断片比較の副産物。要スポット確認だが tsc 影響なし。

## 推奨対応 (優先順)

1. 教材本文の修正は上記「残る真の教材側ギャップ」のみ (page-query-state.test.tsx)。
2. Gate B 機械写経の完走を求める場合、直すべきは **apply_day の splice** (directive 指定位置への挿入・router 外 const の前置) — 教材ではなく QA 基盤側。
3. verdict.md 本体は履歴保持のため改変せず、本補遺を正本とする。
