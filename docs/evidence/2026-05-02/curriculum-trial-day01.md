# Day 01 読者試行レポート (2026-05-02)

実行環境: `/tmp/task-app-trial` (空ディレクトリから scaffold)

## 発見されたバグ

### BUG-1: scaffold スクリプトが自身で create-next-app をブロック (FIXED)
- **症状**: `create-next-app` が「ファイルが既にある」と拒否
- **原因**: `scaffold-from-scratch.sh` 自体がディレクトリに存在
- **修正**: スクリプト実行前に自身を一時退避、完了後に復元
- **コミット**: `2a2ced4`

### BUG-2: tailwindcss-animate が @plugin 解決で失敗 (FIXED)
- **症状**: `CssSyntaxError: Can't resolve 'tailwindcss-animate'`
- **原因**: globals.css に `@plugin "tailwindcss-animate"` があるが、scaffold 直後の環境では Tailwind v4 の @plugin 解決が失敗
- **修正**: Day 01 教材の globals.css サンプルから @plugin 行を削除。scaffold の RUNTIME_DEPS には追加済み
- **コミット**: `20cb435`

### BUG-3: date-fns が scaffold に含まれていない (FIXED)
- **症状**: Day 25 で `from 'date-fns'` を import するがパッケージ未インストール
- **修正**: scaffold の RUNTIME_DEPS に `date-fns` を追加
- **コミット**: `168b093`

### BUG-4: shadcn/ui コンポーネントが scaffold 後に存在しない (OPEN)
- **症状**: Day 05 で `import { Card } from '@/component/ui/card'` するがファイルがない
- **原因**: scaffold スクリプトが `npx shadcn init` や個別コンポーネント追加をしていない
- **影響**: Day 05-30 の全 Day で shadcn/ui コンポーネントが見つからずコンパイルエラー
- **修正案**:
  - A) scaffold に `npx shadcn init` + 必要コンポーネント追加を入れる
  - B) Day 05 冒頭に shadcn セットアップの案内を追加
  - C) src/component/ui/ を scaffold スクリプトで直接コピーする
- **推奨**: C が最も確実（shadcn の CLI バージョン依存を避けられる）

## Day 01 ステップ別結果

| Step | 結果 | 備考 |
|---|---|---|
| Step 1: ディレクトリ作成 | ✅ | |
| Step 2: scaffold 実行 | ✅ (修正後) | BUG-1 修正で通過 |
| Step 3: npm run dev | ✅ | 200 返る |
| Step 4-1: globals.css 差し替え | ✅ (修正後) | BUG-2 修正で通過 |
| Step 4-2: page.tsx 差し替え | ✅ | |
| Step 4-3: dashboard/page.tsx 作成 | ✅ | |
| ブラウザ確認 (/ と /dashboard) | ✅ | 両方 200 |

## 次セッションでの続行項目

- BUG-4 の修正（shadcn/ui コンポーネント配置）
- Day 02-04 の実行確認
- Day 05 の shadcn 依存確認
- Day 07+ の DB 依存確認（Docker/PostgreSQL）
