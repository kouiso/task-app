# A-3 教材 ↔ src 再照合メモ

**日付**: 2026-04-17
**対象**: `material/30days-curriculum/` ↔ `src/`
**基準**: [curriculum-src-alignment-2026-04-14.md](/Users/kouiso/ghq/kouiso/task-app/docs/evidence/curriculum-src-alignment-2026-04-14.md)

## 要約

2026-04-14 baseline の「主要 filepath と代表実装は一致」という結論は、今も大筋では維持できる。  
一方で、4/17 の実査を踏まえると、不整合の中心は `src` 不在ではなく、教材内の説明・仮実装・品質方針の残骸に移っている。  
つまり「参照先が壊れている」のではなく、「学習者に見せる導線が少し古い」状態である。

## 2026-04-14 からの変化

1. `day01_開発環境を整えて、初めてのアプリを動かそう.md` に bash / WSL2 向け補足が追加され、環境差分の説明は改善した。
2. 4/17 の検証メモ群で、baseline の「不整合 0 件」はやや楽観的だったことが分かった。
3. import パスの実態は引き続き `@/component/...` 系で揃っており、旧レビュー記録にある `@/components/...` 指摘は現 repo では採用しない方が正確。
4. `PageLoadingSpinner` 参照は `day17` `day20` `day21` `day23` と `src/app/**` の実装で整合している。

## 残っている教材 / コード不一致

### 1. デバッグ用 `console.log` の扱いが弱い

- 対象: `day05`, `day06`, `day12`, `day17`, `day26`
- 状態: 教材内に仮実装や DevTools 確認として `console.log` が残る。
- 問題: 実務コードに残してよい記述と誤読されやすい。削除タイミングの明示が不足している。

### 2. `day17` / `day20` / `day29` の date-only 方針は概ね改善した

- 対象: `day17_自分のタスクページ.md`, `day20_タスク検索機能.md`, `day29_ユーザー詳細・編集ページを作ろう.md`
- 状態: `dateOnlyFromValue`, `dateOnlyToUtcStartIso`, `dateOnlyToUtcEndIso`, `formatDateOnly` を使う完成版方針を教材へ反映済み。
- 残課題: Step 単位のコード断片には旧案がまだ一部残るため、最終完成コードブロックも揃えるとより安全。

### 3. `day21` / `day23` のレポート説明がまだ完全には追いついていない

- 対象: `day21_統計カードを表示.md`, `day23_週次レポート.md`
- 状態: 「完成版は `api.report.getOverview` を使う」方針と `projectStats` / `weeklyData` の説明は追記済み。
- 問題: Step ごとのコード断片にはなお `useMemo` / `tasks.filter(...)` ベースの旧説明が残る。

### 4. `||` と `??` の説明方針が日によって揺れる

- 対象: `day12`, `day20`, `day27`
- 状態:
  - `day20` は `??` を推す説明がある一方で、同じ章で `formValues.keyword || undefined` を使っている。
  - `day12` は `user.name || user.email` の説明が残る。
  - `day27` は `description` / member 表示で `||` フォールバックを使う。
- 問題: `src` 側にも同様の `||` は残っているため「完全な src 不一致」ではないが、教材品質ルールとの関係が曖昧で、学習者に判断基準が伝わりにくい。

## 現時点の判断

- filepath の実在性や主要 import 先は依然として良好。
- いま優先すべきズレは、構造不整合よりも「教材本文の運用ルール」と「実装 / 品質方針」の整合である。
- 特に 4/14 baseline の結論は、「ファイルが存在し、主な参照は合っている」という意味では有効だが、「教材導線まで完全一致」とまでは言えない。

## 次に入れる修正

1. `day21` と `day23` の Step 単位コードを `getOverview` ベースへ完全移行する。
2. `day05` `day06` `day12` `day17` `day26` の `console.log` に「一時確認用・確認後に削除」を明記する。
3. `day20` `day27` は `||` を残す箇所と `??` に寄せる箇所を表で整理し、「空文字も未入力扱いにしたいので `||`」のように意図を書く。
4. 上記修正後に、`curriculum-src-alignment-2026-04-14.md` の結論を更新するか、4/17 版を正式な差し替えとして扱う。

## 2026-04-18 追加リフレッシュ (A-3)

- Day 06: OK（`src/server/api/routers/auth.ts#register` を確認。重複メール検知、強いパスワード要件、登録後セッション作成の流れは教材と整合）
- Day 17: Fixed（期限別グループ分けのコード断片に `isSameDay` の旧案が残っていたため、`dateOnlyFromValue()` / `localDateOnly()` ベースへ修正）
- Day 20: OK（現行は `src/server/api/routers/search.ts` + `src/app/search/page.tsx` 基準。教材も `api.search.search` と date-only helper 方針に整合。`task.ts` には現状 search エンドポイントなし）
- Day 21: Fixed（`src/server/api/routers/report.ts#getOverview` に対し、教材 Step 内の client-side 再集計説明が残っていたため、server 集計済み `overview` / `projectStats` を描画する形へ修正）
- Day 23: Fixed（`src/app/report/page.tsx` の projectStats 表示説明が旧 `useMemo` 再集計のままだったため、`getOverview` 由来の server-side aggregation 説明へ更新）
- Day 27: OK（`src/server/api/routers/project.ts` の `setArchiveStatus` / `archive` / `unarchive` を確認。教材の archive 仕様説明は現行実装と一致）
- Day 29: Fixed（`src/app/user/[id]/page.tsx` / `edit/page.tsx` が server wrapper + route-level 404 構成に変わっていたため、教材の代表コードと filepath を `user-detail-client.tsx` / `user-edit-client.tsx` ベースへ更新）

### Known residual drift

- 対象範囲内の追加残差分は今回の確認ではなし
