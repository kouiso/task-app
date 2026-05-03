/**
 * Node.js 22+のビルトインWeb Storage APIはSSRで正常動作しない
 * getItem/setItem等がundefinedになるため、サーバー起動時に無効化する
 */
export async function register() {
  if (typeof window === 'undefined') {
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  }

  // Sentry: DSNが設定されている場合のみ初期化する (SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN)
  const dsn = process.env['SENTRY_DSN'] ?? process.env['NEXT_PUBLIC_SENTRY_DSN'];
  if (dsn) {
    if (process.env['NEXT_RUNTIME'] === 'nodejs') {
      await import('../sentry.server.config');
    }
    if (process.env['NEXT_RUNTIME'] === 'edge') {
      await import('../sentry.edge.config');
    }
  }
}

export const onRequestError: import('next/dist/server/instrumentation/types').InstrumentationOnRequestError =
  async (err, request, errorContext) => {
    const dsn = process.env['SENTRY_DSN'] ?? process.env['NEXT_PUBLIC_SENTRY_DSN'];
    if (dsn) {
      const { captureRequestError } = await import('@sentry/nextjs');
      captureRequestError(err, request, errorContext);
    }
  };
