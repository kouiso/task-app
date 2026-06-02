# 権限別 手動テストチェックリスト（最新実装反映版）

PR #198（メンバー権限編集UI）/ #199（閲覧者・一般メンバーへの権限外UI非表示）反映後の、**権限（ロール）を軸にしたチェックリスト**。
機能別の網羅チェックは `doc/manual-test-checklist.csv` を併用すること。本ドキュメントは「誰が・何を・できる/できないか」を漏れなく潰すことに特化している。

## このチェックリストの考え方

バグの大半は **「UIで隠したつもりが API では通る」「ロールごとの境界がズレる」** の2パターンで起きる。
そのため全項目を **2層** で検証する:

- **API層**: tRPC のミューテーション/クエリを直接叩いた時の結果（UIをバイパスした攻撃・直リクエストを想定）。`FORBIDDEN` / `BAD_REQUEST` / `NOT_FOUND` の別まで確認する。
- **UI層**: ボタン・セレクト・チェックボックスの表示/非表示、無効化、ダイアログの挙動。

> 鉄則: UIの非表示は「親切」であってセキュリティではない。**API層が拒否しなければバグ**。逆に **API層が拒否するのにUIにボタンが見える**のもバグ（誤操作→エラー体験）。両方そろって初めて Pass。

## 2つのロール体系（混同注意）

| 体系 | 値 | 制御対象 | 定義 |
|---|---|---|---|
| **グローバルユーザーロール** (`USER_ROLE`) | `USER` / `ADMIN` | `/user` 系のユーザー管理画面、他人のプロジェクト一覧閲覧 | `ctx.session.role` |
| **プロジェクトメンバーロール** (`PROJECT_MEMBER_ROLE`) | `OWNER` / `ADMIN` / `MEMBER` / `VIEWER` | プロジェクト内のタスク・メンバー・アーカイブ操作 | `projectMember.role` |

**注意**: 「プロジェクトADMIN」と「グローバルADMIN」は別物。本文では明示的に区別する。

## 権限マトリクス（真実の源: `src/lib/constant/roles.ts`）

| プロジェクトロール | canView | canEdit | canDelete | canManageMembers | canArchive |
|---|:---:|:---:|:---:|:---:|:---:|
| OWNER | ✓ | ✓ | ✓ | ✓ | ✓ |
| ADMIN | ✓ | ✓ | ✓ | ✓ | ✗ |
| MEMBER | ✓ | ✓ | ✗ | ✗ | ✗ |
| VIEWER | ✓ | ✗ | ✗ | ✗ | ✗ |

### 操作 → 必要権限 早見表（API実装と一致）

| 操作 | API手続き | 必要権限 | 備考 |
|---|---|---|---|
| タスク閲覧（一覧/詳細） | `task.getAll` / `task.getById` | メンバーであること | 非メンバーは一覧に出ない・詳細は FORBIDDEN |
| タスク作成 | `task.create` | `canEdit` | VIEWER は FORBIDDEN |
| タスク編集 | `task.update` | `canEdit` | プロジェクト移動時は**移動先でも** `canEdit` 必須 |
| タスク削除 | `task.delete` | `canDelete` | MEMBER/VIEWER は FORBIDDEN |
| タイマー操作 | `task.updateTimer` | `canEdit` | |
| 作業時間追加 | `task.addTime` | `canEdit` | |
| 一括完了 | `task.bulkComplete` | 対象全件 `canEdit` | 1件でも権限無→全体 FORBIDDEN |
| 一括ステータス変更 | `task.bulkUpdateStatus` | 対象全件 `canEdit` | 同上 |
| 一括削除 | `task.bulkDelete` | 対象全件 `canDelete` | 同上 |
| プロジェクト閲覧 | `project.getById` | `canView`（=メンバー） | |
| プロジェクト作成 | `project.create` | ログイン済み誰でも | 作成者が自動で OWNER |
| プロジェクト編集（名前/色等） | `project.update` | `canManageMembers` | **canEdit ではない**点に注意（MEMBER は不可） |
| プロジェクト削除 | `project.delete` | **OWNER 限定**（明示チェック） | ADMIN は canDelete=true でも不可 |
| メンバー追加 | `project.addMember` | `canManageMembers` | OWNER として追加できるのは **OWNER のみ** |
| メンバー削除 | `project.removeMember` | `canManageMembers` | OWNER の削除は **OWNER のみ** / 唯一の OWNER は削除不可 |
| メンバー権限変更 | `project.updateMemberRole` | `canManageMembers` | OWNER の付与・剥奪は **OWNER のみ** / 唯一の OWNER の降格は不可 |
| 追加可能ユーザー取得 | `project.getAvailableUsers` | `canManageMembers` | |
| アーカイブ/解除 | `project.archive` / `unarchive` | `canArchive` | **OWNER 限定**（ADMIN は canArchive=false） |
| 他人のプロジェクト一覧 | `project.getAll({userId})` | グローバル `ADMIN` | 自分以外指定は管理者のみ |

---

# A. プロジェクトロール別チェック

各ロールで「**できるべき(✓)**」と「**できてはいけない(✗)**」を両方検証する。
準備: 1つのプロジェクトに OWNER / プロジェクトADMIN / MEMBER / VIEWER のテストユーザーを各1名所属させ、ログインを切り替えて確認する。

## A-1. VIEWER（閲覧者）

### できるべき
- [ ] **[UI/API]** 所属プロジェクトのタスク一覧・詳細が**閲覧**できる（`task.getAll`/`getById` が成功）
- [ ] **[UI]** `/task` でタスクカードが表示される（中身は読める）
- [ ] **[UI]** プロジェクト詳細 `/project?projectId=...` を開ける（メンバー一覧が読める）

### できてはいけない（UIに出さない & APIで拒否）
- [ ] **[UI]** `/task` の「新規タスク」ボタンが**表示されない**（編集可能プロジェクトが0件のため）
- [ ] **[API]** `task.create` を直接叩くと `FORBIDDEN`「この操作を実行する権限がありません」
- [ ] **[UI]** 各タスクカードに編集ボタン・削除ボタンが**出ない**（`canEdit`/`canDelete` false）
- [ ] **[API]** `task.update` / `task.delete` が `FORBIDDEN`
- [ ] **[UI]** 一括操作バー（完了・ステータス変更・削除）と選択チェックボックスが**出ない**
- [ ] **[API]** `task.bulkComplete` / `bulkUpdateStatus` / `bulkDelete` が `FORBIDDEN`
- [ ] **[API]** `task.updateTimer` / `task.addTime` が `FORBIDDEN`
- [ ] **[UI]** プロジェクト詳細でメンバー追加・削除ボタンが**出ない**（`canManageMembers` false）
- [ ] **[UI]** メンバーのロール変更セレクト（コンボボックス）が**出ず、読み取り専用バッジ**で表示される
- [ ] **[API]** `project.addMember` / `removeMember` / `updateMemberRole` / `update` が `FORBIDDEN`
- [ ] **[UI]** アーカイブボタンが**出ない**（`canArchive` false）
- [ ] **[API]** `project.archive` / `unarchive` が `FORBIDDEN`
- [ ] **[API]** `project.delete` が `FORBIDDEN`

## A-2. MEMBER（一般メンバー）

### できるべき
- [ ] **[UI/API]** タスクの**作成**ができる（`task.create` 成功 / 「新規タスク」ボタン表示）
- [ ] **[UI/API]** タスクの**編集**ができる（`task.update` 成功 / 編集ボタン表示）
- [ ] **[UI/API]** タイマー操作・作業時間追加ができる
- [ ] **[UI/API]** 一括**完了**・一括**ステータス変更**ができる（`canEdit` 範囲）
- [ ] **[UI]** タスク作成ダイアログのプロジェクト選択肢に、自分が `canEdit` を持つプロジェクトが出る

### できてはいけない
- [ ] **[UI]** タスクカードの**削除ボタンが出ない**（`canDelete` false）
- [ ] **[API]** `task.delete` / `task.bulkDelete` が `FORBIDDEN`
- [ ] **[UI]** 一括操作バーの**削除ボタンが出ない**（一括完了/ステータス変更は出てよい）
- [ ] **[UI]** メンバー追加・削除ボタン、ロール変更セレクトが**出ない**（`canManageMembers` false → 読み取り専用バッジ）
- [ ] **[API]** `project.addMember` / `removeMember` / `updateMemberRole` が `FORBIDDEN`
- [ ] **[UI/API]** プロジェクト編集（名前/色）が不可（`project.update` は `canManageMembers` 必要 → `FORBIDDEN`）。UIに編集導線が出ていないか確認
- [ ] **[UI]** アーカイブボタンが**出ない** / **[API]** `project.archive` が `FORBIDDEN`
- [ ] **[API]** `project.delete` が `FORBIDDEN`

## A-3. ADMIN（プロジェクト管理者）

### できるべき
- [ ] **[UI/API]** タスクの作成・編集・**削除**ができる（`canDelete` true）
- [ ] **[UI/API]** 一括完了・一括ステータス変更・**一括削除**ができる
- [ ] **[UI/API]** メンバーの**追加・削除・ロール変更**ができる（`canManageMembers` true）
- [ ] **[UI]** メンバー行にロール変更セレクトが表示される
- [ ] **[UI/API]** プロジェクト編集（名前/色）ができる（`project.update` 成功）

### できてはいけない（ADMIN の境界）
- [ ] **[UI]** アーカイブボタンが**出ない**（ADMIN は `canArchive=false`）
- [ ] **[API]** `project.archive` / `unarchive` が `FORBIDDEN`（← ロール表で見落としやすい重要境界）
- [ ] **[API]** `project.delete` が `FORBIDDEN`（OWNER 限定の明示チェック。ADMIN は canDelete=true でもプロジェクト削除は不可）

## A-4. OWNER（オーナー）

### できるべき（全権）
- [ ] **[UI/API]** タスクの作成・編集・削除・一括操作すべて成功
- [ ] **[UI/API]** メンバー追加・削除・ロール変更すべて成功
- [ ] **[UI/API]** プロジェクト編集が成功
- [ ] **[UI/API]** アーカイブ/解除が成功（OWNER のみ `canArchive=true`）
- [ ] **[UI/API]** プロジェクト削除が成功
- [ ] **[UI]** 自分（OWNER）のメンバー行はロール変更セレクトではなく**固定バッジ**でロックされている

---

# B. グローバルユーザーロール別チェック（/user 系）

## B-1. USER（一般ユーザー）
- [ ] **[UI/API]** `/user`（ユーザー一覧）へアクセスすると権限エラー or リダイレクト
- [ ] **[UI/API]** `/user/[id]/edit` へ直接URLアクセスしても拒否される
- [ ] **[API]** `project.getAll({ userId: 他人のID })` が `FORBIDDEN`「管理者権限が必要です」

## B-2. ADMIN（グローバル管理者）
- [ ] **[UI/API]** `/user` 一覧・`/user/[id]`・`/user/[id]/edit` にアクセスできる
- [ ] **[UI]** 他ユーザーのロール/有効状態を変更→保存で反映される
- [ ] **[UI]** **自分自身**の編集画面ではロール/有効状態チェック欄が無効化されている（自己降格防止）（回帰: T804）
- [ ] **[UI]** 管理者の自分自身編集でアバター更新が反映される（回帰: T805）
- [ ] **[API]** `project.getAll({ userId: 他人のID })` が成功する（管理者は他人のプロジェクトを参照可）

---

# C. 可視範囲（見えてはいけないものが見えないか）

- [ ] **[API]** `task.getAll` は**自分が所属するプロジェクトのタスクのみ**返す（非所属プロジェクトのタスクが混ざらない）
- [ ] **[API]** `task.getAll({ projectId: 非所属プロジェクト })` が `FORBIDDEN`「このプロジェクトへのアクセス権限がありません」
- [ ] **[API]** `task.getById(非所属タスク)` が `FORBIDDEN`（メンバーチェック）
- [ ] **[API]** `project.getAll`（引数なし）は**自分が所属するプロジェクトのみ**返す
- [ ] **[API]** `project.getById(非所属プロジェクト)` が `FORBIDDEN`（`canView` チェック）
- [ ] **[UI]** `/my-task` に他人のタスクが表示されない（回帰: T301）
- [ ] **[UI]** プロジェクト一覧に自分が所属しないプロジェクトが出ない

---

# D. 権限昇格・境界の悪用（重点的に潰すべきセキュリティ項目）

> **仕様確定済み（PR: 権限昇格防止）**: OWNER ロールの**付与・剥奪・OWNERメンバーの変更/削除は OWNER のみ**。
> `canManageMembers` を持つプロジェクトADMIN は MEMBER/VIEWER/ADMIN の範囲のみ管理でき、OWNER には一切手を出せない。
> UI（メンバー追加ダイアログ・ロール変更セレクト）は OWNER を選択肢から除外済みのため、この昇格は **API 直叩き専用の経路**。API層で必ず拒否されることを確認する。

- [ ] **[API]** プロジェクトADMIN が `project.addMember({ role: 'OWNER' })` → `FORBIDDEN`「オーナー権限の付与はオーナーのみ可能です」（TB03）
- [ ] **[API]** プロジェクトADMIN が `project.updateMemberRole` で**他人を OWNER に昇格** → `FORBIDDEN`「オーナー権限の変更はオーナーのみ可能です」（TB04）
- [ ] **[API]** プロジェクトADMIN が `project.updateMemberRole` で**自分自身を OWNER に昇格** → `FORBIDDEN`「オーナー権限の変更はオーナーのみ可能です」（TB05）
- [ ] **[API]** プロジェクトADMIN が `project.updateMemberRole` で**既存 OWNER を降格** → `FORBIDDEN`「オーナー権限の変更はオーナーのみ可能です」（TB06）
- [ ] **[API]** プロジェクトADMIN が `project.removeMember` で**OWNER を削除** → `FORBIDDEN`「オーナーの削除はオーナーのみ可能です」（TB07）
- [ ] **[API]** OWNER は `project.updateMemberRole` で他メンバーを OWNER に昇格できる（正常系・オーナー委譲。TB08）
- [ ] **[UI]** メンバー追加ダイアログ・ロール変更セレクトの選択肢に **OWNER が出ない**（誰がログインしても）。OWNER 行は固定バッジでロック（T411 / T412）
- [ ] **[API]** `project.removeMember` で**唯一の OWNER**を削除 → `BAD_REQUEST`「プロジェクト唯一のオーナーは削除できません」（TB09）
- [ ] **[API]** `project.updateMemberRole` で**唯一の OWNER**を OWNER 以外へ変更 → `BAD_REQUEST`「プロジェクト唯一のオーナーの権限は変更できません」（TB09）
- [ ] **[API]** OWNER が2名以上いる場合は、片方の OWNER を OWNER 自身が降格・削除できる（最後の1人保護のみが効く）
- [ ] **[API]** VIEWER/MEMBER が `project.delete` を叩いても OWNER 限定チェックで `FORBIDDEN`

---

# E. 一括操作のエッジケース（過去バグ多発ゾーン）

- [ ] **[UI]** フィルタ（プロジェクト/ステータス/優先度/担当者）を切り替えても、**画面に表示されている選択タスクのみ**が一括操作対象になる（回帰: PR #199 / `selectedTaskList`）
  - 手順: 複数選択 → フィルタ切替で一部を画面外へ → 一括完了/削除 → **画面外タスクが操作されていない**ことをDBで確認
- [ ] **[UI]** 「全選択」チェックは `canEdit` または `canDelete` を持つタスク（`selectableTasks`）のみを選択する
- [ ] **[UI]** 選択中に1件でも `canEdit` の無いタスクが混ざると一括完了/ステータス変更ボタンが**出ない**（`canCompleteSelected`）
- [ ] **[UI]** 選択中に1件でも `canDelete` の無いタスクが混ざると一括削除ボタンが**出ない**（`canDeleteSelected`）
- [ ] **[API]** `bulkComplete`/`bulkUpdateStatus`/`bulkDelete` に権限の無いタスクIDを1件でも混ぜると**全体が `FORBIDDEN`**（部分適用されない＝原子性）
- [ ] **[API]** 存在しないタスクIDを混ぜると `NOT_FOUND`（`findTasksWithPermission` の件数不一致チェック）

---

# F. クロスプロジェクト操作

- [ ] **[API]** `task.update` でタスクを**別プロジェクトへ移動**する際、移動元 `canEdit` に加えて**移動先プロジェクトでも `canEdit`** が必要（移動先で権限が無いと `FORBIDDEN`）
- [ ] **[UI]** タスク作成/編集ダイアログのプロジェクト選択肢に、`canEdit` を持たないプロジェクトが出ない（`editableProjects`）

---

# G. UI/UX・アクセシビリティの権限関連回帰

- [ ] **[UI]** プロジェクト詳細のメンバー削除ボタン（アイコンのみ）に `aria-label`「{名前}をプロジェクトから削除」が付与されている（PR #199 a11y）
- [ ] **[UI]** OWNER 行はロール変更セレクトではなく固定バッジ（PR #198）
- [ ] **[UI]** `canManageMembers` を持つユーザーのみメンバーのロール変更セレクトが表示される（PR #198）
- [ ] **[UI]** ロール変更後、`getById` が再取得され一覧に即時反映される
- [ ] **[UI]** ログアウト確認ダイアログ（回帰: T014）/ サイドバーのロールバッジ表示（回帰: TA04）

---

# H. 実施フロー

1. **準備**: 1プロジェクトに OWNER/ADMIN/MEMBER/VIEWER のテストユーザーを所属させる（OWNER 2名構成も別途用意し、最後の1人保護を確認）。
2. **ロールごとに縦に実施**: A-1 → A-2 → A-3 → A-4 の順で、ログインユーザーを切り替えながら API層・UI層を両方チェック。
3. **API層の叩き方**: ブラウザ DevTools の Network で実リクエストを再送、または認証付きで tRPC エンドポイントへ直接リクエストし、`FORBIDDEN`/`BAD_REQUEST`/`NOT_FOUND` のコードとメッセージまで確認する。
4. **C/D/E/F は全ロール共通の横断チェック**として最後にまとめて実施。
5. `Fail` は GitHub Issue 番号 or スクショパスを各項目に追記。

## メンテナンス指針

- `src/lib/constant/roles.ts` の権限マトリクスを変更したら、本ドキュメントの「権限マトリクス」「操作→必要権限早見表」「A章の各ロール項目」を必ず同時更新する。
- API手続きを追加/変更したら「操作→必要権限早見表」に1行追加し、対応するロール章にチェック項目を追加する。
- 過去バグ由来の回帰項目（PR番号/回帰ID付き）は削除しない。
