import { appRouter } from '@/server/api/root';
import { createTRPCContext } from '@/server/api/trpc';
import { headers } from 'next/headers';
import { cache } from 'react';

/**
 * Create a server-side caller for tRPC procedures
 * This allows us to call tRPC procedures directly in Server Components
 */
export const createCaller = cache(async () => {
  const h = await headers();
  
  return appRouter.createCaller(
    await createTRPCContext({
      req: {
        headers: h,
      } as any,
    })
  );
});