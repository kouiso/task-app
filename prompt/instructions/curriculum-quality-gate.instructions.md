---
applyTo: "material/**"
---

# Curriculum Quality Gate (教材品質ゲート)

## Absolute Rule
<!-- 絶対ルール -->

**Before writing any curriculum content, invoke `/material-writing` and complete the 6-step thinking process (guide 04: 偏愛語スキャン → 実体判定 → 具体化 → 構文修正 → 語選択修正 → 重言除去).**

**NEVER report curriculum work as "complete" or "done" without running ALL quality check scripts and achieving ZERO failures.**
<!-- 品質チェックスクリプトを全て実行し、失敗ゼロを達成するまで、教材作業を「完了」「完成」と報告することは絶対禁止 -->

## Required Check Commands
<!-- 必須チェックコマンド -->

Before declaring any curriculum task complete, run ALL three gates in order:
<!-- 教材タスク完了報告の前に、以下の3ゲートを順番に実行すること -->

```bash
# Gate 1: 文章衛生チェック（textlint — AI臭・文体ブレ・誇張表現）
npx textlint material/30days-curriculum/dayXX_xxx.md
# 自動修正: npx textlint --fix material/30days-curriculum/dayXX_xxx.md

# Gate 2: 統合品質チェック（単一ファイルまたはディレクトリ両対応）
bash scripts/curriculum-qa/check_quality.sh material/30days-curriculum/dayXX_xxx.md
bash scripts/curriculum-qa/check_quality.sh material/30days-curriculum/   # ディレクトリ指定も可

# 個別チェック（デバッグ用）
python3 scripts/curriculum-qa/check_visualization.py <day_file>     # テーブル≥4、スクショ≥3、Mermaid
python3 scripts/curriculum-qa/check_no_skip.py <day_file>           # 各Stepに確認ポイント(✅)とコードブロック
python3 scripts/curriculum-qa/check_step_length.py <day_file>       # コードブロック≤25行
python3 scripts/curriculum-qa/check_code_completeness.py <day_file> # // filepath: コメント必須
python3 scripts/curriculum-qa/check_tech_stack.py <day_file>        # MUI禁止、shadcn/ui必須
python3 scripts/curriculum-qa/check_tone.py <day_file>              # 敬体一貫・AI構文ゼロ・関西弁混入ゼロ
python3 scripts/curriculum-qa/check_comprehension.py <day_file>     # 注釈なし専門用語・禁止表現・確認ポイント
```

## Pass Criteria
<!-- 合格基準 -->

| Check Script | Required Result |
|---|---|
| check_visualization.py | Tables ≥ 4, Screenshots ≥ 3, Mermaid ≥ 1 (if applicable) |
| check_no_skip.py | Every Step has: code block + ✅ confirmation point + filepath comment |
| check_step_length.py | All code blocks ≤ 25 lines |
| check_code_completeness.py | All TypeScript code blocks have `// filepath:` comment |
| check_tech_stack.py | Zero MUI imports, shadcn/ui patterns present |
| check_tone.py | 敬体一貫・AI構文ゼロ・関西弁混入ゼロ・英語直訳調ゼロ |

## Code-Curriculum Consistency Check (実コード照合)
<!-- コードと教材の一致確認 -->

After running automated checks, manually verify:
<!-- 自動チェック後、以下を手動確認 -->

1. **Import paths**: All `@/component/...`, `@/lib/...` paths in tutorial code exist in `src/`
2. **Function signatures**: All function names, props, and parameters match actual source code
3. **API calls**: All `api.xxx.yyy.useQuery/useMutation` match actual tRPC router definitions
4. **Component props**: All props passed to components are defined in the component's type interface

## Prohibited Behaviors
<!-- 禁止行為 -->

- ❌ Reporting "教材完成" without running `check_quality.sh`
- ❌ Running checks but ignoring failures ("残りは後で直します")
- ❌ Modifying check scripts to make them pass instead of fixing the curriculum
- ❌ Claiming "フォーマットは整った" without verifying code accuracy against `src/`
