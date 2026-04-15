// Client-side Sentry configuration
// SENTRY_DSN 環境変数が設定されている場合のみ有効化されます
import * as Sentry from '@sentry/nextjs';

const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN'];

if (dsn) {
  Sentry.init({
    dsn,
    // 本番環境でのみパフォーマンストレースを有効化
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
    // Replay は本番のみ有効化
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 0,
    integrations: [Sentry.replayIntegration()],
    // 開発環境でのデバッグログ
    debug: process.env['NODE_ENV'] === 'development',
  });
}
