import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/utils';

import HamburgerIcon from './index.icon';

const PATH_ATTRIBUTES = {
  CLOSED:
    'M0.25 13.5H19.75V11.3333H0.25V13.5ZM0.25 8.08333H19.75V5.91667H0.25V8.08333ZM0.25 0.5V2.66667H19.75V0.5H0.25Z',
} as const;

describe('HamburgerIconコンポーネント', () => {
  it('アイコンが正しくレンダリングされること', () => {
    render(<HamburgerIcon />);

    expect(screen.getByRole('button', { name: 'メニュー' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'メニュー' }).querySelector(`path[d="${PATH_ATTRIBUTES.CLOSED}"]`),
    ).toBeInTheDocument();
  });

  it('ボタンをクリックするとコールバック関数が呼び出されること', () => {
    const handleClick = vi.fn();
    render(<HamburgerIcon onHamburgerClick={() => handleClick()} />);

    const button = screen.getByRole('button', { name: 'メニュー' });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
