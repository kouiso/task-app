'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

import { theme } from '~/styles/theme';
import { api } from '~/utils/api';

interface Props {
  children: ReactNode;
  session: Session | null;
}

function ProvidersInner({ children, session }: Props) {
  return (
    <SessionProvider session={session}>
      <AppRouterCacheProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </AppRouterCacheProvider>
    </SessionProvider>
  );
}

export const Providers = api.withTRPC(ProvidersInner) as React.ComponentType<Props>;
