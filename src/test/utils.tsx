import type { ReactElement } from 'react';

import { fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CustomThemeProvider } from '@/app/context/ThemeContext';

/**
 * カスタマイズされたレンダー関数
 * テスト時にThemeProviderでラップする
 */
const render = (ui: ReactElement) =>
  rtlRender(ui, {
    wrapper: ({ children }) => <CustomThemeProvider>{children}</CustomThemeProvider>,
  });

// テストユーティリティをre-export
export { fireEvent, render, screen, userEvent, waitFor, within };
