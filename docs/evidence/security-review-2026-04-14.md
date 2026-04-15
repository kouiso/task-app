# Security Review Report — task-app

**日付**: 2026-04-14
**スコープ**: task-app (Next.js 15 + tRPC v11 + Prisma + jose JWT)
**手法**: 静的解析 (read-only)
**npm audit**: 0 vulnerabilities

---

## サマリー

| 重大度 | 件数 | 概要 |
|---|---|---|
| CRITICAL | 1 | 認証エンドポイントにレート制限なし |
| HIGH | 3 | JWT無効化なし、セキュリティヘッダー欠如、オープンリダイレクト |
| MEDIUM | 6 | PLAYWRIGHT_TEST cookie bypass、Zodエラー詳細露出、ログ内トークン情報、ENV検証バイパス、管理者作成ユーザーのパスワード未設定、アバターURL制限なし |
| LOW | 2 | Manager→Owner権限昇格、Node.js 25.x非LTS |

## CRITICAL

### C-1: 認証エンドポイントにレート制限なし
- **ファイル**: `src/server/api/routers/auth.ts:28,75`
- login/registerにレート制限なし。ブルートフォース攻撃、スパムアカウント作成が可能
- **推奨**: Upstash Rate Limit等をtRPCミドルウェアとして追加

## HIGH

### H-1: ログアウト時にJWTが無効化されない
- **ファイル**: `src/lib/session.ts:109-112`
- Cookie削除のみでサーバー側のトークン無効化なし。抽出されたトークンは7日間有効のまま
- **推奨**: トークンdenylistまたは短命アクセストークン+リフレッシュトークン方式

### H-2: セキュリティヘッダー欠如
- CSP、X-Frame-Options、X-Content-Type-Options等が未設定
- **推奨**: `next.config.ts`のheaders()でセキュリティヘッダー追加

### H-3: callbackUrlによるオープンリダイレクト
- **ファイル**: `src/middleware.ts:44`
- callbackUrlの外部URL検証なし
- **推奨**: callbackUrlが`/`始まりで`//`を含まないことを検証

## MEDIUM (6件)

- M-1: PLAYWRIGHT_TEST=1でsecure cookieフラグ無効化 (`session.ts:89`)
- M-2: Zod検証エラー詳細がAPIレスポンスに露出 (`trpc.ts:20-28`)
- M-3: console.errorでJWTペイロード/エラーオブジェクトをログ出力 (`session.ts:64,70`)
- M-4: SKIP_ENV_VALIDATIONで全環境変数検証バイパス (`env.ts:33`)
- M-5: 管理者作成ユーザーにパスワードなし→ログイン不可 (`user.ts:150-179`)
- M-6: アバター/画像URLにドメイン制限なし (`user.ts`, `project.ts`)

## LOW (2件)

- L-1: ManagerがOwnerロールに昇格可能 (`project.ts`)
- L-2: Node.js 25.xは非LTSリリース (`package.json`)

## 良好な点

- Prismaによるパラメタライズドクエリ（SQL injection対策済）
- bcryptjsによるパスワードハッシュ化
- jose HS256 JWTによるセッション管理
- HTTP-only + SameSite cookie設定
- tRPC protectedProcedureによる認証ガード
- プロジェクトメンバーシップベースの認可チェック
