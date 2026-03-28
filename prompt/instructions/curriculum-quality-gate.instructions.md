---
applyTo: "material/**"
---

# Curriculum Quality Gate (教材品質ゲート)

## Absolute Rule
<!-- 絶対ルール -->

**NEVER report curriculum work as "complete" or "done" without running ALL quality check scripts and achieving ZERO failures.**
<!-- 品質チェックスクリプトを全て実行し、失敗ゼロを達成するまで、教材作業を「完了」「完成」と報告することは絶対禁止 -->

## Required Check Commands
<!-- 必須チェックコマンド -->

Before declaring any curriculum task complete, run:
<!-- 教材タスク完了報告の前に、以下を実行すること -->

```bash
# 統合品質チェック（全スクリプト一括実行）
bash script/check_quality.sh material/30days-curriculum/

# 個別チェック（デバッグ用）
python3 script/check_visualization.py <day_file>    # テーブル≥4、スクショ≥3、Mermaid
python3 script/check_no_skip.py <day_file>          # 各Stepに確認ポイント(✅)とコードブロック
python3 script/check_step_length.py <day_file>      # コードブロック≤25行
python3 script/check_code_completeness.py <day_file> # // filepath: コメント必須
python3 script/check_tech_stack.py <day_file>        # MUI禁止、shadcn/ui必須
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
