import type { ComponentProps } from 'react';

import { fireEvent } from '@testing-library/react';
import Image from 'next/image';
import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/utils';

import ToggleTheme from './index';

// モック関数の作成
const toggleThemeMock = vi.fn();

// ThemeContextのモック - hooksファイルをモック
vi.mock('../../context/hooks', () => ({
  __esModule: true,
  default: () => ({
    mode: 'light',
    toggleTheme: toggleThemeMock,
  }),
}));

// CustomThemeProviderをモック
vi.mock('../../context/ThemeContext', () => ({
  __esModule: true,
  CustomThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ThemeContext: { Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));

// Next.jsのImageコンポーネントのモック
vi.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage(props: ComponentProps<typeof Image>) {
    return (
      <Image
        {...props}
        data-testid="mock-image"
        alt={props.alt || ''}
        width={props.width || 0}
        height={props.height || 0}
      />
    );
  },
}));

describe('ToggleThemeコンポーネント', () => {
  it('テーマトグルボタンが表示されること', () => {
    render(<ToggleTheme />);

    const lightButton = screen.getByLabelText('ライトモードに切り替え');
    const darkButton = screen.getByLabelText('ダークモードに切り替え');

    expect(lightButton).toBeInTheDocument();
    expect(darkButton).toBeInTheDocument();
  });

  it('ダークモードボタンをクリックするとトグルが呼ばれること', () => {
    render(<ToggleTheme />);

    const darkButton = screen.getByLabelText('ダークモードに切り替え');
    fireEvent.click(darkButton);

    expect(toggleThemeMock).toHaveBeenCalledTimes(1);
  });
});
