'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';

import Header from './components/header';
import Sidebar from './components/sidebar';
import { CustomThemeProvider } from './context/ThemeContext';

type LayoutProps = {
  children: React.ReactNode;
};

const RootLayout = ({ children }: LayoutProps) => {
  const [mounted, setMounted] = useState(false);

  // クライアントサイドでのみ実行されるように
  useEffect(() => {
    setMounted(true);
  }, []);

  // SSRでのハイドレーションミスマッチを防ぐ
  if (!mounted) {
    return (
      <html lang="ja">
        <body />
      </html>
    );
  }

  return (
    <html lang="ja">
      <head />
      <body>
        <CustomThemeProvider>
          <CssBaseline />
          <Header />
          <Box
            sx={{
              display: 'flex',
              height: {
                xs: 'calc(100vh - var(--header-height-sp))',
                sm: 'calc(100vh - var(--header-height-pc))',
              },
            }}
          >
            <Sidebar />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 3,
                overflow: 'auto',
              }}
            >
              {children}
            </Box>
          </Box>
        </CustomThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
