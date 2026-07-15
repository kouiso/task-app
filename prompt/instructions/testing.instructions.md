---
applyTo: "**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/__tests__/**"
---

# TDD & Testing Rules

## Mandatory Requirements

### 1. TDD-Centric Workflow

**All implementations must proceed with TDD (Test-Driven Development).**

#### RED → GREEN → REFACTOR Cycle

1. **RED Phase**: Clarify requirements → Design test cases (Normal, Edge, Error) → Write failing test → Confirm RED
2. **GREEN Phase**: Minimal implementation to pass test → Confirm GREEN → Confirm all tests pass
3. **REFACTOR Phase**: Improve code quality (DRY, naming, complexity) → Rerun tests → Confirm coverage ≥ 80%

### 2. Test Coverage Requirements

**Minimum 80% test coverage is mandatory.**

```bash
npm test -- --coverage
# Requirements: Statements ≥ 80%, Branches ≥ 80%, Functions ≥ 80%, Lines ≥ 80%
```

**Critical parts (authentication, payment, personal information handling, etc.) require 100% coverage.**

### 3. Test-First Principle

```
❌ Prohibited: Write implementation → Add tests later
✅ Correct: Write test (confirm fail) → Write implementation (confirm pass) → Refactor (confirm pass)
```

## Test Quality Standards

### 1. AAA Pattern Mandatory

```typescript
describe('UserService', () => {
  it('should create user with valid data', async () => {
    // Arrange (Setup)
    const userData = { email: 'test@example.com', name: 'Test User' };

    // Act (Execute)
    const result = await userService.createUser(userData);

    // Assert (Verify)
    expect(result).toEqual(userData);
  });
});
```

### 2. Test Naming Convention

```typescript
// ✅ Good: should + expected behavior
it('should return user when valid ID provided', () => {});
it('should throw error when user not found', () => {});

// ❌ Bad: Ambiguous
it('test user', () => {});
```

### 3. Edge Case Coverage

**Test edge cases for all functions**: Normal cases, boundary values, error cases.

### 4. Appropriate Mocking

**External dependencies should be properly mocked.** No actual DB access in unit tests.

### 5. Test Independence

**Tests should be order-independent and executable independently.**

## Best Practices

- **Small Steps**: One test focuses on one concern
- **Readability**: Test code has same quality as production code
- **Speed**: All tests run in seconds
- **Reliability**: Eliminate non-deterministic tests
- **Maintainability**: If test breaks, suspect implementation problem
