# /security-check - Security Audit Command

## Purpose
コード全体をOWASP Top 10に対応させ、セキュリティリスクを排除する

## Trigger
ユーザーが `security-check: [スコープ]` またはPRレビュー時に実行

## Workflow

### Step 1: Scope Definition
- 検査対象コードの確認
- 前提条件・環境の把握

### Step 2: OWASP Top 10 Check
以下の項目をすべてチェック：

1. **A01: Broken Access Control**
   - ユーザー認証・認可の確認
   - Role-based access control

2. **A02: Cryptographic Failures**
   - 暗号化データの検証
   - シークレット管理

3. **A03: Injection**
   - SQL Injection検査
   - Command Injection検査
   - NoSQL Injection検査

4. **A04: Insecure Design**
   - セキュリティ設計の検証
   - Rate limiting

5. **A05: Security Misconfiguration**
   - 環境変数管理
   - デフォルト設定確認

6. **A06: Vulnerable & Outdated Components**
   - 依存関係の脆弱性検査
   - バージョン管理

7. **A07: Authentication Failures**
   - パスワード強度
   - セッション管理
   - MFA対応

8. **A08: Software & Data Integrity Failures**
   - CI/CDパイプルセキュリティ
   - アップデート検証

9. **A09: Logging & Monitoring Failures**
   - セキュリティログ確認
   - アラート設定

10. **A10: SSRF**
    - URL入力検証
    - ネットワークセグメンテーション

### Step 3: Code Review
- 疑わしいコードの詳細検査
- 脆弱性パターンの検索

### Step 4: Report Generation
セキュリティレポート作成

### Step 5: Remediation
- 優先度付け修正
- 修正実装・テスト

## Output Format

```markdown
# Security Audit Report

## Scope
- Code range: [範囲]
- Audit date: [日時]
- Auditor: security-reviewer agent

## Executive Summary
- **Critical Issues**: [数]
- **High Issues**: [数]
- **Medium Issues**: [数]
- **Low Issues**: [数]
- **Overall Risk**: [評価]

## Findings

### Critical
#### Issue C1: [脆弱性]
- **Type**: [OWASP A01-A10]
- **Location**: [ファイル:行]
- **Description**: [説明]
- **Impact**: [インパクト]
- **Recommendation**: [推奨対策]

### High
#### Issue H1: ...

### Medium & Low
...

## Dependency Audit
\`\`\`
npm audit results:
[結果]
\`\`\`

## Checklist
- [ ] No hardcoded secrets
- [ ] All user inputs validated
- [ ] Proper error handling
- [ ] No known vulnerabilities in dependencies
- [ ] Authentication enforced
- [ ] Authorization implemented
- [ ] Encryption used for sensitive data
- [ ] Logging configured
- [ ] Rate limiting implemented
- [ ] CORS properly configured

## Remediation Plan
1. [優先度1: Critical修正]
2. [優先度2: High修正]
3. [優先度3: Medium修正]

## Next Steps
- [ ] All critical issues fixed
- [ ] Security tests added
- [ ] Code review approved
- [ ] Deployment ready
```

## Agent Used
`security-reviewer` agent with following settings:
- tools: Read, Grep, SemanticSearch, Write
- model: claude-3-5-sonnet
- focus: Security Audit, OWASP Compliance, Vulnerability Detection

## Related Commands
- `/tdd` - Add security tests
- `/multi-review` - Security team review
