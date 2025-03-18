import type { PaletteMode } from '@mui/material';

// デザイントークンを別のオブジェクトとして定義
export const designTokens = {
  spacing: {
    small: 1,
    medium: 2,
    large: 3,
  },
  opacity: {
    active: 1,
    inactive: 0.5,
  },
  headerHeight: {
    pc: '92px',
    sp: '66px',
  },
} as const;

// カラーパレットの定義
export const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          primary: {
            main: '#38a576',
          },
          secondary: {
            main: '#dc004e',
          },
          divider: '#2f3e46',
          background: {
            default: '#ffffff',
            paper: '#eeeeee',
          },
          text: {
            primary: '#000000',
            secondary: '#2f3e46',
            disabled: '#cccccc',
          },
        }
      : {
          primary: {
            main: '#38a576',
          },
          secondary: {
            main: '#dc004e',
          },
          divider: '#f2f2f2',
          background: {
            default: '#141c23',
            paper: '#222d35',
          },
          text: {
            primary: '#ffffff',
            secondary: '#f2f2f2',
            disabled: '#f2f2f2',
          },
        }),
  },
  custom: {
    headerHeight: designTokens.headerHeight,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--white': '#ffffff',
          '--black': '#000000',
          '--header-height-pc': designTokens.headerHeight.pc,
          '--header-height-sp': designTokens.headerHeight.sp,
          '--border': mode === 'light' ? '#2f3e46' : '#f2f2f2',
          '--bg': mode === 'light' ? '#eeeeee' : '#222d35',
          '--bg-body': mode === 'light' ? '#ffffff' : '#141c23',
          '--placeholder': mode === 'light' ? '#cccccc' : '#f2f2f2',
          '--text': mode === 'light' ? '#000000' : '#ffffff',
          '--primary': '#38a576',
        },
        body: {
          margin: 0,
          padding: 0,
          backgroundColor: mode === 'light' ? '#ffffff' : '#141c23',
          color: mode === 'light' ? '#000000' : '#ffffff',
        },
      },
    },
  },
});
