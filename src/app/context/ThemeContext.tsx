'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { ThemeProvider, createTheme } from '@mui/material/styles';

import useLocalStorage from '@/lib/use-local-storage/index';

import { getDesignTokens } from './tokens';

import type { ThemeContextType, ThemeMode } from './types';

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const CustomThemeProvider = ({ children }: ThemeProviderProps) => {
  const [mode, setMode] = useLocalStorage<ThemeMode>('theme', 'light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!mode && typeof window !== 'undefined') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      setMode(systemTheme);
    }
    if (mode) {
      document.documentElement.setAttribute('data-theme-mode', mode);
    }
    setMounted(true);
  }, [mode, setMode]);

  const toggleTheme = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    document.documentElement.setAttribute('data-theme-mode', newMode);
  }, [mode, setMode]);

  const contextValue = useMemo(
    () => ({
      mode,
      toggleTheme,
    }),
    [mode, toggleTheme],
  );

  const theme = useMemo(
    () => createTheme(getDesignTokens(mode === 'dark' ? 'dark' : 'light')),
    [mode],
  );

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};
