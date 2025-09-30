import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server';
import superjson from 'superjson';

import { type AppRouter } from '@/server/api/root';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

/**
 * tRPC client configuration
 */
export const trpcClientOptions = {
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === 'development' ||
        (opts.direction === 'down' && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers() {
        return {};
      },
    }),
  ],
};
