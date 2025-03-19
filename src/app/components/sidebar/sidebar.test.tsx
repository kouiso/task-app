import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '../../../test/utils';

import Sidebar from './index';

// ThemeContextのモック
vi.mock('../../context/ThemeContext', () => ({
  useThemeContext: () => ({
    mode: 'light',
    toggleTheme: vi.fn(),
  }),
  CustomThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ThemeContext: { Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));

// モバイル表示用のmatchMediaモック
const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

// サイドバーアイテムのモック
vi.mock('../sidebar-item', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(({ head, children }) => (
    <li data-testid="sidebar-item">
      <span>{head.title}</span>
      <span data-testid="menu-icon">{head.menuIcon ? 'アイコン' : null}</span>
      <div>{children}</div>
    </li>
  )),
}));

// トグルテーマコンポーネントのモック
vi.mock('../toggle-theme', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => <div data-testid="toggle-theme">Toggle Theme</div>),
}));

// メニューデータのモック
vi.mock('./constants', () => ({
  __esModule: true,
  default: [
    {
      id: 'test',
      title: 'テストメニュー',
      icon: 'TestIcon',
      subMenus: [{ id: 'sub1', href: '/test', label: 'サブメニュー' }],
    },
  ],
}));

describe('Sidebarコンポーネント', () => {
  it('デスクトップ表示: サイドバーが固定表示されること', () => {
    mockMatchMedia(false); // デスクトップ表示
    render(<Sidebar />);

    // サイドバーが表示されていることを確認
    expect(screen.getByRole('complementary')).toBeInTheDocument();

    // ハンバーガーメニューボタンが表示されていないことを確認
    expect(screen.queryByLabelText('open drawer')).not.toBeInTheDocument();
  });

  it('モバイル表示: ハンバーガーメニューとドロワーが機能すること', () => {
    mockMatchMedia(true); // モバイル表示
    render(<Sidebar />);

    // ハンバーガーメニューボタンが表示されていることを確認
    const menuButton = screen.getByLabelText('open drawer');
    expect(menuButton).toBeInTheDocument();

    // ボタンクリックでドロワーが開くことを確認
    fireEvent.click(menuButton);
    expect(screen.getByRole('presentation')).toBeInTheDocument();
  });

  it('サイドバー項目とテーマトグルが表示されること', () => {
    mockMatchMedia(false);
    render(<Sidebar />);

    // サイドバー項目が表示されていることを確認
    expect(screen.getByTestId('sidebar-item')).toBeInTheDocument();

    // テーマトグルが表示されていることを確認
    expect(screen.getByTestId('toggle-theme')).toBeInTheDocument();
  });

  it('モバイル表示: ドロワーを開閉できること', () => {
    mockMatchMedia(true);
    render(<Sidebar />);

    const menuButton = screen.getByLabelText('open drawer');

    // ドロワーを開く
    fireEvent.click(menuButton);
    expect(screen.getByRole('presentation')).toBeInTheDocument();

    // ドロワーを閉じる（オーバーレイをクリック）
    const overlay = screen.getByRole('presentation');
    fireEvent.click(overlay);

    // ドロワーが閉じたことを確認（非同期の変更を待つ必要がある場合あり）
    setTimeout(() => {
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    }, 0);
  });
});
