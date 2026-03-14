import { QueryClient } from '@tanstack/react-query';
import { STALE_TIME_MS } from './query-constants';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
      },
    },
  });
}
