import { createElement } from 'react';

import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '../../../test/utils';

import SidebarItem from './index';

// ThemeContextのモック
vi.mock('../../context/ThemeContext', () => ({
  useThemeContext: () => ({
    mode: 'light',
    toggleTheme: vi.fn(),
  }),
}));

describe('SidebarItemコンポーネント', () => {
  const mockProps = {
    head: {
      title: 'テストメニュー',
      menuIcon: createElement('div', { 'data-testid': 'mock-icon' }),
    },
    children: [
      createElement('a', { href: '/test1', key: 'test1' }, 'テストリンク1'),
      createElement('a', { href: '/test2', key: 'test2' }, 'テストリンク2'),
    ],
  };

  it('コンポーネントが正しくレンダリングされること', () => {
    render(<SidebarItem {...mockProps} />);

    // タイトルが表示されていることを確認
    expect(screen.getByText('テストメニュー')).toBeInTheDocument();

    // アイコンが表示されていることを確認
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('アコーディオンを展開・折りたたみできること', () => {
    render(<SidebarItem {...mockProps} />);

    // 初期状態でリンクが非表示であることを確認
    expect(screen.queryByText('テストリンク1')).not.toBeVisible();

    // アコーディオンをクリックして展開
    const accordionButton = screen.getByText('テストメニュー').closest('div');
    fireEvent.click(accordionButton!);

    // 展開後にリンクが表示されることを確認
    expect(screen.getByText('テストリンク1')).toBeVisible();
    expect(screen.getByText('テストリンク2')).toBeVisible();
  });

  it('展開時にスタイルが適切に変更されること', () => {
    render(<SidebarItem {...mockProps} />);

    const accordionButton = screen.getByText('テストメニュー').closest('div');
    const accordionSummary = accordionButton?.parentElement;

    // 初期状態を確認
    expect(accordionSummary).not.toHaveClass('Mui-expanded');

    // アコーディオンを展開
    fireEvent.click(accordionButton!);

    // 展開状態のスタイルを確認
    expect(accordionSummary).toHaveClass('Mui-expanded');
  });

  it('リンクがクリック可能であること', () => {
    render(<SidebarItem {...mockProps} />);

    // アコーディオンを展開
    const accordionButton = screen.getByText('テストメニュー').closest('div');
    fireEvent.click(accordionButton!);

    // リンクが正しいhref属性を持っていることを確認
    const link1 = screen.getByText('テストリンク1');
    const link2 = screen.getByText('テストリンク2');

    expect(link1.getAttribute('href')).toBe('/test1');
    expect(link2.getAttribute('href')).toBe('/test2');
  });
});
