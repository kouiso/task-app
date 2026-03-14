# /refactor-clean - Code Refactoring & Cleanup Command

## Purpose
不要なコード・デッドコード・重複コードを排除し、コード品質を向上させる

## Trigger
ユーザーが `refactor-clean: [スコープ]` またはコマンドボタンから実行

## Workflow

### Step 1: Dead Code Detection
- 未使用な関数・変数を検索
- 到達不可能なコードを特定
- 条件分岐で常にfalseの分岐を検出

### Step 2: Duplication Analysis
- 重複した関数・ロジックを検出
- Extract method候補を特定
- 共通化可能なパターンを洗い出し

### Step 3: Code Quality Review
- 複雑度（Cyclomatic Complexity）が高い関数
- メソッドが長すぎる関数
- 引数が多すぎる関数

### Step 4: Refactoring Suggestions
複数の改善提案を提示

### Step 5: Implementation & Testing
- リファクタリング実装
- テスト実行確認
- パフォーマンス検証

## Output Format

```markdown
# Code Refactoring Report

## Scope
- Target files: [ファイル一覧]
- Lines of code: [LOC]
- Analysis date: [日時]

## Dead Code Detection

### Unused Variables
- File: [ファイル]
  - Variable: \`unused_var\`
  - Lines: 123-125
  - Recommendation: Remove

### Unused Functions
- \`oldFunction()\` in src/utils/helpers.ts
  - No callers found
  - Safe to delete

### Unreachable Code
- src/processor.ts:456
  - Code after \`return\` statement
  - Recommendation: Remove

## Duplication Analysis

### Duplicate Logic
#### Pattern 1: API Error Handling
- Location 1: src/services/userService.ts:45
- Location 2: src/services/productService.ts:78
- Location 3: src/services/orderService.ts:120
- Recommendation: Extract to common utility

### Code Duplication Metrics
- Duplication Percentage: [%]
- Duplicate Blocks: [数]

## Complexity Analysis

| File | Function | Cyclomatic Complexity | Recommendation |
|------|----------|----------------------|-----------------|
| src/processor.ts | processOrder() | 15 | Reduce complexity |
| src/validator.ts | validate() | 12 | Extract methods |

## Refactoring Suggestions

### Suggestion 1: Extract Common Error Handler
\`\`\`typescript
// Before: 重複したコード
// After: 共通化

function handleApiError(error: Error) {
  logger.error('API Error:', error);
  throw new AppError('API failed', 500);
}
\`\`\`

### Suggestion 2: Simplify Complex Function
\`\`\`typescript
// Before: 複雑な条件分岐
// After: ポリモーフィズム活用
\`\`\`

## Implementation Plan
1. [リファクタリングステップ1]
2. [リファクタリングステップ2]
3. [リファクタリングステップ3]

## Testing Verification
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] No behavior changes
- [ ] Performance maintained or improved

## Code Metrics Before/After

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total LOC | 5000 | 4200 | -15.2% |
| Avg Complexity | 8.5 | 6.2 | -27% |
| Test Coverage | 82% | 85% | +3% |

## Deployment Checklist
- [ ] Refactoring complete
- [ ] Tests passing
- [ ] Code review approved
- [ ] Ready to deploy
```

## Agent Used
`refactor-cleaner` agent with following settings:
- tools: Read, Grep, SemanticSearch, Write, Replace
- model: claude-3-5-sonnet
- focus: Code Quality, Refactoring, Dead Code Removal

## Related Commands
- `/tdd` - Ensure tests cover refactored code
- `/code-review` - Quality review after refactor
