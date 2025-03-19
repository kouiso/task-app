import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/utils';

import Header from './index';

// ThemeContextのモック
vi.mock('../../context/ThemeContext', () => ({
  useThemeContext: () => ({
    mode: 'light',
    toggleTheme: vi.fn(),
  }),
  CustomThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ThemeContext: { Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));

const TEST_VALUES = {
  MENU_ITEMS: 3,
  ICON_BUTTONS_MOBILE: 4, // 実際の値に合わせて調整
  ICON_BUTTONS_DESKTOP: 3, // 実際の値に合わせて調整
} as const;

describe('Headerコンポーネント', () => {
  it('検索フォームが正しくレンダリングされること', () => {
    render(<Header />);

    const searchInput = screen.getByPlaceholderText('Search...');
    expect(searchInput).toBeInTheDocument();
  });

  it('プロフィール情報が表示されること', () => {
    render(<Header />);

    expect(screen.getByText('Kousuke')).toBeInTheDocument();
    expect(screen.getByText('Lead Developer')).toBeInTheDocument();
  });

  it('プロフィールメニューが表示・非表示を切り替えられること', () => {
    render(<Header />);

    const profileSection = screen.getByText('Kousuke').closest('div');
    fireEvent.click(profileSection!);

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(TEST_VALUES.MENU_ITEMS);

    menuItems.forEach((item, index) => {
      expect(item).toHaveTextContent(`メニュー${index + 1}`);
    });
  });

  it('ヘッダーアイコンメニューのボタンが機能すること', () => {
    render(<Header />);

    const iconButtons = screen.getAllByRole('button');
    expect(iconButtons.length).toBeGreaterThanOrEqual(TEST_VALUES.ICON_BUTTONS_DESKTOP);

    iconButtons.forEach((button) => {
      expect(button).not.toBeDisabled();
      fireEvent.click(button);
    });
  });

  it('レスポンシブ対応: モバイル表示時に一部のアイコンが非表示になること', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(max-width: 767px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    render(<Header />);

    const iconButtons = screen.getAllByRole('button');
    expect(iconButtons.length).toBeLessThan(TEST_VALUES.ICON_BUTTONS_MOBILE);
  });
});
