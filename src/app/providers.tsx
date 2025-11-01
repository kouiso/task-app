'use client';

import { TRPCReactProvider } from '@/trpc/react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCReactProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
          <Toaster />
        </ThemeProvider>
      </TRPCReactProvider>
    </SessionProvider>
  );
}
