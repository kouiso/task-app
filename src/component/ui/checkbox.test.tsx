// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './checkbox';

const expectIndicator = (state: 'checked' | 'indeterminate') => {
  const root = screen.getByRole('checkbox');
  expect(root).toHaveAttribute('data-state', state);
  const check = root.querySelector('.lucide-check')?.parentElement;
  const minus = root.querySelector('.lucide-minus')?.parentElement;
  expect(check).toHaveAttribute('data-state', state);
  expect(minus).toHaveAttribute('data-state', state);
  expect(check).toHaveClass('data-[state=indeterminate]:hidden');
  expect(minus).toHaveClass('data-[state=checked]:hidden');
};

describe('Checkbox', () => {
  it('制御された中間状態・選択・未選択にRadixの表示状態を合わせる', () => {
    const { rerender } = render(<Checkbox checked="indeterminate" />);
    expectIndicator('indeterminate');
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed');
    rerender(<Checkbox checked />);
    expectIndicator('checked');
    rerender(<Checkbox checked={false} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('checkbox').querySelector('svg')).toBeNull();
  });

  it('非制御の中間状態からクリックとSpaceで選択・未選択を切り替える', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox defaultChecked="indeterminate" onCheckedChange={onCheckedChange} />);
    expectIndicator('indeterminate');
    await user.click(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    expectIndicator('checked');
    await user.keyboard(' ');
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('checkbox').querySelector('svg')).toBeNull();
  });
});
