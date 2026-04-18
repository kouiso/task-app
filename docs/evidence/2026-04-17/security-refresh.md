# Security Refresh

最終更新: 2026-04-17

## 監査対象

- `next.config.mjs`
- `src/middleware.ts`
- `src/lib/session.ts`
- `src/test/setup.ts`
- `src/server/api/routers/**`

## 結論

現時点で、production code における `raw SQL` の危険な使用は見当たらない。認証 cookie と主要ヘッダーもコード上は設定済み。さらに、無効化ユーザーの継続利用と task assignee の project-membership 欠落はコード修正で塞いだ。ただし、HTTP レスポンス実測はまだ取れていないため、runtime 実証は未完了。

## 1. Raw SQL

### 検索結果

- production code: `0`
- test code: `src/test/setup.ts` のみ

### 詳細

`src/test/setup.ts` では下記を使用している。

- `prisma.$executeRawUnsafe(\`TRUNCATE TABLE "${table}" CASCADE\`)`

これは test 専用であり、テーブル名も内部固定配列からのみ供給されるため、現実的な SQL injection 経路はない。

## 2. 認証 cookie

### `src/lib/session.ts`

- `httpOnly: true`
- `sameSite: 'strict'`
- `secure: production かつ Playwright test 以外`
- `path: '/'`

plan の B-2 基準に照らして、cookie 属性のコード上設定は概ね良好。

## 3. JWT 検証

### `src/middleware.ts`

- 非公開ページでは `session` cookie を要求
- JWT は `jose.jwtVerify` で検証
- 無効 token は cookie を削除して `/login` に戻す
- `callbackUrl` は open redirect を避けるため相対パスのみ許可

### `src/server/api/trpc.ts`

- `protectedProcedure` 実行時に `ctx.session.userId` の実ユーザーを DB 再確認
- `isActive=false` の場合は `FORBIDDEN` で遮断
- DB 上の role を再反映するため、無効化や権限変更後の stale session 耐性が一段上がった

## 3.5. タスク担当者の権限制御

### `src/server/api/routers/task.ts`

- `create` / `update` の `assigneeId` に対し、`project_members` 上で対象 project への所属確認を追加
- 非メンバー指定時は `BAD_REQUEST` を返す

UI だけでなく server 側でも強制することで、別プロジェクトのユーザーへの情報露出を防ぐ。

## 4. セキュリティヘッダー

### `next.config.mjs`

設定済みヘッダー:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`
- `X-DNS-Prefetch-Control: off`
- `Content-Security-Policy` (`PLAYWRIGHT_TEST !== 1` のとき)

### 残リスク

現在の CSP は以下を含むため、厳格度としてはまだ弱い。

- `'unsafe-inline'`
- `'unsafe-eval'`

開発容易性とのトレードオフがあるが、B-2 の「コード監査」観点では改善余地あり。

## 5. OWASP 観点の簡易整理

| 項目 | 状態 | メモ |
|---|---|---|
| A01 Broken Access Control | おおむね良好 | middleware + tRPC 側で二重に認証 |
| A02 Cryptographic Failures | おおむね良好 | JWT secret 必須 |
| A03 Injection | 良好 | raw SQL は test 限定 |
| A05 Security Misconfiguration | 一部改善余地 | CSP がやや緩い |
| A07 Identification and Authentication Failures | おおむね良好 | JWT cookie の属性は妥当 |

## 未完了

1. `npm audit --audit-level=high` 実測
2. dev / prod 相当レスポンスでヘッダー実測
3. Sentry DSN 設定時の送信確認
4. rate limiting / lockout 不在への対処
5. `date-only` / timezone 設計の見直し
