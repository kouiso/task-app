/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectDialog } from '../project-dialog';

describe('ProjectDialog', () => {
  it('新規作成を開き直すと前回入力した内容を引き継がない', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = render(<ProjectDialog open={true} onClose={onClose} onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/プロジェクト名/), '持ち越してはいけない名前');
    expect(screen.getByLabelText(/プロジェクト名/)).toHaveValue('持ち越してはいけない名前');

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<ProjectDialog open={false} onClose={onClose} onSubmit={vi.fn()} />);
    rerender(<ProjectDialog open={true} onClose={onClose} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/プロジェクト名/)).toHaveValue('');
  });
});
