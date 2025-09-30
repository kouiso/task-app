'use client';

import { jaJP } from '@mui/material/locale';
import { createTheme } from '@mui/material/styles';

// カスタムカラーパレット
const taskColors = {
  TODO: '#9e9e9e',
  IN_PROGRESS: '#1976d2',
  IN_REVIEW: '#ff9800',
  DONE: '#2e7d32',
  BLOCKED: '#d32f2f',
};

const priorityColors = {
  LOW: '#4caf50',
  MEDIUM: '#ff9800',
  HIGH: '#f44336',
  URGENT: '#b71c1c',
};

declare module '@mui/material/styles' {
  interface Theme {
    taskColors: typeof taskColors;
    priorityColors: typeof priorityColors;
  }
  interface ThemeOptions {
    taskColors?: typeof taskColors;
    priorityColors?: typeof priorityColors;
  }
}

export const theme = createTheme(
  {
    cssVariables: {
      colorSchemeSelector: 'data-mui-color-scheme',
    },
    colorSchemes: {
      light: {
        palette: {
          primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
          },
          secondary: {
            main: '#9c27b0',
            light: '#ba68c8',
            dark: '#7b1fa2',
          },
          success: {
            main: '#2e7d32',
          },
          warning: {
            main: '#ed6c02',
          },
          error: {
            main: '#d32f2f',
          },
          background: {
            default: '#fafafa',
            paper: '#ffffff',
          },
        },
      },
      dark: {
        palette: {
          primary: {
            main: '#90caf9',
            light: '#e3f2fd',
            dark: '#42a5f5',
          },
          secondary: {
            main: '#ce93d8',
            light: '#f3e5f5',
            dark: '#ab47bc',
          },
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
        },
      },
    },
    typography: {
      fontFamily: [
        'Inter',
        'Noto Sans JP',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'sans-serif',
      ].join(','),
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 600,
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 500,
      },
      h6: {
        fontWeight: 500,
      },
    },
    taskColors,
    priorityColors,
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            fontWeight: 500,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
    },
  },
  jaJP,
);
