// Server-side Sentry configuration
// SENTRY_DSN 環境変数が設定されている場合のみ有効化されます
import * as Sentry from '@sentry/nextjs';

const dsn = process.env['SENTRY_DSN'] ?? process.env['NEXT_PUBLIC_SENTRY_DSN'];

if (dsn) {
  Sentry.init({
    dsn,
    // 本番環境でのみパフォーマンストレースを有効化
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
    // 開発環境でのデバッグログ
    debug: process.env['NODE_ENV'] === 'development',
  });
}
