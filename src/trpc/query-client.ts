import { QueryClient } from '@tanstack/react-query';
import { STALE_TIME_MS } from './query-constants';

// SSRでの無限レンダリングループ防止用カウンター
let hashCallCount = 0;

export function safeQueryKeyHashFn(queryKey: readonly unknown[]): string {
  hashCallCount++;
  // SSR中の無限ループを検出して早期終了
  if (hashCallCount > 50) {
    return `["overflow-guard-${hashCallCount}"]`;
  }

  const first = queryKey[0];
  const pathStr = Array.isArray(first) ? (first as string[]).join('.') : String(first ?? '');

  if (queryKey.length < 2) return `["${pathStr}"]`;

  const second = queryKey[1];
  if (second == null) return `["${pathStr}"]`;
  if (typeof second !== 'object') return `["${pathStr}",${JSON.stringify(second)}]`;

  const obj = second as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs: string[] = [];
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined) continue;
    if (v === null || typeof v !== 'object') {
      pairs.push(`"${k}":${JSON.stringify(v)}`);
    } else {
      try {
        pairs.push(`"${k}":${JSON.stringify(v)}`);
      } catch {
        pairs.push(`"${k}":"[complex]"`);
      }
    }
  }
  return `["${pathStr}",{${pairs.join(',')}}]`;
}

// リクエストごとにカウンターリセット（SSR完了後のクリーンアップ）
export function resetHashCounter() {
  hashCallCount = 0;
}

export function createQueryClient() {
  resetHashCounter();
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        queryKeyHashFn: safeQueryKeyHashFn,
      },
    },
  });
}
