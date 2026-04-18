# Debt / i18n / TZ 初期トリアージ

最終更新: 2026-04-17

## B-10 対応方針

`TODO/FIXME/console.*` を機械検索し、以下に分類した。

- `解消不要`: 正常な定数・教材上の説明・許可された `console.error` / `console.warn`
- `要修正`: 教材と実コードの整合が崩れやすい箇所
- `継続観察`: 実害は薄いが後で揃えたい箇所

## 主要 findings

### 解消不要

| 種別 | 位置 | 理由 |
|---|---|---|
| `console.error` | `src/app/error.tsx` | エラー画面での記録用途 |
| `console.error` | `src/lib/session.ts` | JWT 解読失敗の診断用途 |
| `console.warn` | `src/lib/use-local-storage/index.ts` | 端末依存の localStorage 失敗を握りつぶす用途 |
| `$executeRawUnsafe` | `src/test/setup.ts` | test 専用。固定テーブル名のみ |
| `TODO` 文字列 | `src/lib/constant/status.ts` ほか | ステータス定数そのもの |

### 要修正

| 種別 | 位置 | 問題 |
|---|---|---|
| 教材 `console.log` | `material/30days-curriculum/day05_ログイン画面のUI.md` | 仮実装の意図と後始末を明示したい |
| 教材 `console.log` | `material/30days-curriculum/day06_ユーザー登録画面.md` | 同上 |
| 教材 `console.log` | `material/30days-curriculum/day12_メンバー追加.md` | 同上 |
| 教材 DevTools 確認 | `material/30days-curriculum/day17_自分のタスクページ.md` | `console.log(groupedTasks)` の一時追加後に削除する指示を強めたい |
| 教材デバッグ演習 | `material/30days-curriculum/day26_エラーページを作って、バグを退治しよう.md` | 教材意図は妥当だが、実コードとの差分説明をより明示したい |

### 継続観察

| 種別 | 位置 | メモ |
|---|---|---|
| CI coverage | プロジェクト全体 | `17.05%` と低い。gate 化前に改善が必要 |
| review artifact の古い指摘 | `material/review_*` | 旧 `NEXTAUTH_SECRET` 指摘など、現在の実装とズレた記録が混在 |

## B-11: i18n / タイムゾーン

### 現状

- 実コードの主要な日付表示は `date-fns` + `ja` ロケールへ寄っている
- 代表例:
  - `src/app/report/weekly/page.tsx`
  - `src/app/profile/page.tsx`
  - `src/app/user/page.tsx`
  - `src/app/user/[id]/page.tsx`
  - `src/component/task/task-card.tsx`
  - `src/component/task/task-detail-dialog.tsx`

### 教材とのズレ

- `day17` は `isSameDay` に寄せて改善済みだが、説明表に `toDateString()` 比較の残骸がある
- `day23` / `day18` / `day24` / `day25` / `day29` は `date-fns` ベースの説明が見える

## 次に直す候補

1. `day17` の `toDateString()` 言及削除
2. `day05` / `day06` / `day12` の `console.log` を「一時確認」前提に寄せる
3. review artifact は履歴として残しつつ、現時点の正しい状態を別ファイルにまとめる
