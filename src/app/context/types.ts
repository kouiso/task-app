export type ThemeMode = 'light' | 'dark';

export interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

// MUIテーマの拡張
declare module '@mui/material/styles' {
  interface CustomTheme {
    headerHeight: {
      pc: string;
      sp: string;
    };
  }

  interface Theme {
    custom: CustomTheme;
  }

  interface ThemeOptions {
    custom?: Partial<CustomTheme>;
  }
}
