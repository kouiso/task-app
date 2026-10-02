// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeleteConfirmDialog } from './delete-confirm-dialog';

describe('DeleteConfirmDialog', () => {
  it('削除を押してもその場では閉じず、親が成功時に閉じるまで開いたままにする', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <DeleteConfirmDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        isPending={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: '削除' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    // クリック時点で閉じてしまうと、失敗時に「消えたように見えて実は残っている」
    // 状態になる。閉じる判断は成功を確認した呼び出し側が持つ
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('送信中は削除もキャンセルも押せない', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <DeleteConfirmDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} isPending />,
    );

    const action = screen.getByRole('button', { name: '削除中...' });
    expect(action).toBeDisabled();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled();

    await user.click(action);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('キャンセルは従来どおり閉じる', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <DeleteConfirmDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        isPending={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
