import 'server-only';
import { type AppRouter, createCaller } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';
import { createHydrationHelpers } from '@trpc/react-query/rsc';
import { headers } from 'next/headers';
import { cache } from 'react';
import { createQueryClient } from './query-client';

const createContext = cache(async () => {
  const headersList = await headers();
  const heads = new Headers(headersList);
  heads.set('x-trpc-source', 'rsc');

  return createTRPCContext({
    headers: heads,
  });
});

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

export const { trpc, HydrateClient } = createHydrationHelpers<AppRouter>(caller, getQueryClient);
