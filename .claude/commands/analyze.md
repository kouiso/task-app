# /analyze - Code Quality Quantitative Analysis

## Trigger
User runs `/analyze <directory_path>`

## Procedure

1. Scan source files in the specified directory
2. Score each axis 0-100:

| Axis | Measurement |
|------|-------------|
| Type Safety | Usage rate of `any`, `as`, `unknown`, type assertions |
| Test Coverage | Test file presence, estimated coverage per module |
| Complexity | Function line count distribution, nesting depth (use Section 4 relative positioning: compare against module average) |
| Consistency | Naming conventions, import order, pattern uniformity |

3. For any axis scoring below 80: provide specific improvement suggestions with file paths
4. Report results as a markdown table

## Output Format

```markdown
## Code Quality Analysis: <directory>

| Axis | Score | Details |
|------|-------|---------|
| Type Safety | XX/100 | N `any` usages, M type assertions |
| Test Coverage | XX/100 | N/M modules have test files |
| Complexity | XX/100 | Avg function: X lines (module avg: Y) |
| Consistency | XX/100 | N naming violations found |

### Improvements Needed
- [ ] `path/to/file.ts:42` — Replace `any` with proper type
- [ ] ...
```

## Notes
- Use Glob + Grep for scanning (do NOT read every file)
- Apply Multi-Stage Pipeline (data-driven-execution.md Section 2) for large directories
- Compare metrics against the module's own distribution, not absolute thresholds
