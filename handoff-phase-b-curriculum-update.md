# Handoff: task-app 教材更新 (Phase B) — Ant Design UI リデザインに合わせた教材修正

## コンテキスト

- **リポジトリ**: `git@github.com:kouiso/task-app.git`
- **ブランチ**: `main`
- **直近コミット**: `b871101 feat(ui): Ant Design風デザイントークンとNoto Sans JPフォントを導入`
- **計画ファイル**: `~/.claude/plans/crispy-percolating-eagle.md` (Phase A完了、Phase Bが残タスク)

## 背景

task-app の UI を Ant Design インスパイアのデザインに全面リデザインした（Phase A 完了済み）。以下の変更が commit `b871101` で適用済み:

1. **`src/app/globals.css`**: shadcn/ui デフォルト HSL → Ant Design トークンに全面書き換え
   - Primary: `#1677FF` (HSL `212 100% 54%`)
   - Destructive: `#ff4d4f`, Success: `#52c41a`, Warning: `#faad14`
   - Sidebar: `#001529` 濃紺ダークテーマ
   - Chart色: Ant Design DataViz パレット
   - 新規変数: `--success`, `--warning` 追加
2. **`src/app/layout.tsx`**: `Inter` → `Noto_Sans_JP` (next/font, weight 400/500/700, CSS variable `--font-noto-sans-jp`)
3. **`tailwind.config.js`**: `sidebar`, `success`, `warning` を `theme.extend.colors` に追加
4. **`src/component/layout/app-layout.tsx`**: ハードコード色 11 箇所を CSS 変数参照 (`bg-sidebar`, `text-sidebar-foreground` 等) に置換
5. **`src/component/ui/card.tsx`**: `rounded-xl` → `rounded-lg` (12px → 8px)

**Phase B（教材更新）がまだ未実施。** 教材 (`material/30days-curriculum/`) のコード例・解説・スクリーンショットが旧 UI のまま。

## タスク

### タスク 1: 影響範囲の特定

以下のコマンドで要更新ファイルを洗い出す:

```bash
# 旧トークン・旧コンポーネント参照を含む教材ファイル
grep -rn 'globals\.css\|--primary.*221\|Inter\|slate-900\|bg-blue-600\|bg-slate\|rounded-xl\|hsl(221' material/30days-curriculum/

# AppLayout / サイドバー関連コードを含む教材ファイル
grep -rln 'app-layout\|AppLayout\|サイドバー' material/30days-curriculum/
```

前回の調査で以下が候補として特定済み（要再確認）:
- `day08_サイドバーを完成させよう.md` — **最重要**: サイドバーのコード例が旧 slate/blue ハードコード色のまま
- `day02_ダッシュボードに自分だけのメッセージを追加しよう.md` — layout.tsx の Inter フォント参照
- `day16_ステータス変更・タイマー.md` — globals.css 参照
- `day17_自分のタスクページ.md` — globals.css 参照
- `appendix_用語集.md` — 用語定義の更新

他にも `day09`, `day10`, `day11`, `day12`, `day13`, `day20`, `day21`, `day23`, `day24`, `day25`, `day29` が AppLayout/サイドバー関連コードを含む可能性あり。

### タスク 2: 教材のコード例を更新

各 day ファイルで以下の置換を実施:

| Before (旧) | After (新) | 対象ファイル |
|---|---|---|
| `import { Inter } from 'next/font/google'` | `import { Noto_Sans_JP } from 'next/font/google'` | layout.tsx を解説する day |
| `const inter = Inter({ subsets: ['latin'] })` | `const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-noto-sans-jp', display: 'swap' })` | 同上 |
| `inter.className` | `notoSansJP.variable` | 同上 |
| `bg-slate-900` | `bg-sidebar` | サイドバー解説 day |
| `border-slate-700` | `border-sidebar-border` | 同上 |
| `text-white` (サイドバー内) | `text-sidebar-foreground` | 同上 |
| `bg-blue-600/20 text-blue-400` | `bg-sidebar-accent text-sidebar-accent-foreground` | 同上 |
| `text-slate-400 hover:text-white hover:bg-slate-800` | `text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent` | 同上 |
| `border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white` | `border-sidebar-border text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground` | 同上 |
| `rounded-xl` (Card) | `rounded-lg` | Card コンポーネント解説 day |
| `--primary: 221.2 83.2% 53.3%` | `--primary: 212 100% 54%` | globals.css 解説 day |

**重要**: 教材のコードブロックは `src/` 内の実コードと一致しなければならない。更新後に `grep` で実コードと突き合わせること。

### タスク 3: tailwind.config.js 関連の教材更新

`tailwind.config.js` を解説する day ファイルがあれば、`sidebar`, `success`, `warning` 色の登録コードを追加する。実コードは:

```js
// tailwind.config.js の theme.extend.colors に追加された内容
sidebar: {
  DEFAULT: 'hsl(var(--sidebar))',
  foreground: 'hsl(var(--sidebar-foreground))',
  primary: 'hsl(var(--sidebar-primary))',
  'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  accent: 'hsl(var(--sidebar-accent))',
  'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  border: 'hsl(var(--sidebar-border))',
  ring: 'hsl(var(--sidebar-ring))',
},
success: {
  DEFAULT: 'hsl(var(--success))',
  foreground: 'hsl(var(--success-foreground))',
},
warning: {
  DEFAULT: 'hsl(var(--warning))',
  foreground: 'hsl(var(--warning-foreground))',
},
```

### タスク 4: スクリーンショットの撮り直し

`material/30days-curriculum/screenshots/` に 56 枚の PNG がある。UI が変わったため、以下の手順で撮り直す:

1. `docker compose up -d db` でDB起動
2. `npx prisma db seed` でテストデータ投入
3. `npm run dev` でサーバー起動
4. Playwright MCP で `http://localhost:3000/login` にアクセス → `user1@example.com` / `password123` でログイン
5. 各画面のスクショを `material/30days-curriculum/screenshots/` に同名で上書き保存
6. 特に重要なスクショ: `dashboard.png`, `login.png`, `project-list.png` — サイドバーの色変更が直接見える

### タスク 5: 教材品質ゲート

全更新完了後に以下を実行し、ゼロ違反を確認:

```bash
bash script/check_quality.sh material/30days-curriculum/
python3 script/check_visualization.py material/30days-curriculum/dayXX_*.md
python3 script/check_no_skip.py material/30days-curriculum/dayXX_*.md
python3 script/check_step_length.py material/30days-curriculum/dayXX_*.md
python3 script/check_code_completeness.py material/30days-curriculum/dayXX_*.md
python3 script/check_tech_stack.py material/30days-curriculum/dayXX_*.md
```

`check_tech_stack.py` が新しいトークン (Ant Design 色等) を拒絶する場合、スクリプト自体の許可リストを更新する必要がある。

## 検証

1. `npm run lint` — エラーゼロ
2. `bash script/check_quality.sh material/30days-curriculum/` — ゼロ違反
3. 更新した教材のコードブロック内の import パス・関数名・CSS クラスが `src/` の実コードと一致すること (grep で突き合わせ)
4. スクリーンショットが新 UI (濃紺サイドバー `#001529`、`#1677FF` Primary) を反映していること

## コミット

```bash
git add material/30days-curriculum/
git commit -m "docs(curriculum): Ant Design UIリデザインに合わせて教材を更新

- コード例のハードコード色をCSS変数参照に置換 (bg-slate-900→bg-sidebar等)
- Inter→Noto Sans JPフォント設定を反映
- tailwind.config.jsのsidebar/success/warning色登録を追記
- 新UIのスクリーンショット56枚を撮り直し
- 品質チェックスクリプト全パス確認済み"
```

## 注意事項

- **教材はです・ます調の日本語**で書かれている。コード例以外のテキストを変更する場合はトーンを維持すること
- **コードブロックは25行以下**が品質ゲートの制約（`check_step_length.py`）
- **各コードブロックに `// filepath:` コメントが必須**（`check_code_completeness.py`）
- `check_tech_stack.py` は MUI 禁止・shadcn/ui 必須を検証する。Ant Design のコンポーネント自体は使っていない（shadcn/ui の色だけ Ant Design 風にしている）ので、このチェックは通るはず
