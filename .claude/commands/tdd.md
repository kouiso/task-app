# TDD (Test-Driven Development)

## Pre-requisite

Before executing this command, read the full contents of `prompt/instructions/testing.md`.

**Trigger**: `/tdd` command

Execute Test-Driven Development flow. Implement with RED → GREEN → REFACTOR cycle and ensure 80%+ test coverage.
<!-- テスト駆動開発フローを実行します。RED → GREEN → REFACTORサイクルで実装し、80%以上のテストカバレッジを確保します。 -->

## Usage

```
/tdd [feature description]
```

Example:
```
/tdd Implement user registration feature
<!-- ユーザー登録機能の実装 -->
```

## Workflow
<!-- ワークフロー -->

### Agent
Use `prompt/agents/tdd-guide.md`
<!-- 使用 -->

### Process
<!-- プロセス -->

#### 1. RED Phase (Create Failing Test)
<!-- REDフェーズ（失敗するテスト作成） -->
- Clarify requirements
<!-- 要件を明確化 -->
- Design test cases
<!-- テストケース設計 -->
  - Normal cases
  - Edge cases
  - Error cases
- Create failing test
<!-- 失敗するテストを作成 -->
- Run test → Confirm RED
<!-- テスト実行 → RED確認 -->

#### 2. GREEN Phase (Minimal Implementation)
<!-- GREENフェーズ（最小実装） -->
- Minimal implementation to pass test
<!-- テストが通る最小限の実装 -->
- Run test → Confirm GREEN
<!-- テスト実行 → GREEN確認 -->
- Confirm all tests pass
<!-- 全テスト合格確認 -->

#### 3. REFACTOR Phase (Improvement)
<!-- REFACTORフェーズ（改善） -->
- Improve code quality
<!-- コード品質向上 -->
  - Remove duplicates
  <!-- 重複削除 -->
  - Improve naming
  <!-- 命名改善 -->
  - Reduce complexity
  <!-- 複雑度削減 -->
- Rerun tests → Confirm GREEN maintained
<!-- テスト再実行 → GREEN維持確認 -->
- Confirm coverage ≥ 80%
<!-- カバレッジ80%以上確認 -->

### Completion Criteria
<!-- 完了基準 -->

✅ All tests GREEN  
✅ Coverage ≥ 80%  
✅ Code quality: No warnings  
<!-- 警告なし -->
✅ Build successful
<!-- ビルド成功 -->

## Example Flow
<!-- 実行例 -->

```markdown
User: /tdd Implement calculateTotal function
<!-- calculateTotal関数の実装 -->

[RED Phase]
Creating tests for calculateTotal...
✅ Test created: should sum all item prices
✅ Test created: should return 0 for empty array
✅ Test created: should throw error for invalid input
❌ Tests failing (expected) - RED confirmed

[GREEN Phase]
Implementing minimal solution...
✅ Implementation complete
✅ All tests passing - GREEN confirmed

[REFACTOR Phase]
Improving code quality...
✅ Added type safety
<!-- 型安全性追加 -->
✅ Added error handling
<!-- エラーハンドリング追加 -->
✅ Added input validation
<!-- 入力検証追加 -->
✅ All tests still passing
📊 Coverage: 85% (target: 80%+)

✅ TDD cycle complete
```

## Related
<!-- 関連 -->

- `prompt/agents/tdd-guide.md` - TDD specialized agent
<!-- TDD専門エージェント -->
- `prompt/skills/testing.md` - Testing strategy (if exists)
<!-- テスト戦略（もし存在すれば） -->
