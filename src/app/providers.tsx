'use client';

import type { ReactNode } from 'react';
import { TRPCReactProvider } from '@/trpc/react';

export function Providers({ children }: { children: ReactNode }) {
  return <TRPCReactProvider>{children}</TRPCReactProvider>;
}
