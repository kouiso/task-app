import type { Instrumentation } from 'next';
import { writeStructuredLog } from '@/lib/observability';

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
}

// サーバー側で投げられた例外を request-id 付きの構造化ログに残す。エラー収集の SDK を
// 入れていないので、本番で障害を追う手がかりはこのログだけになる
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const header = request.headers['x-request-id'];
  writeStructuredLog({
    level: 'error',
    event: 'http.error',
    ...(typeof header === 'string' ? { requestId: header } : {}),
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    message: err instanceof Error ? err.message : String(err),
  });
};
