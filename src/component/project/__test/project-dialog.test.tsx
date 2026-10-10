/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('終了日が開始日より前なら終了日欄へエラーを表示して送信しない', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProjectDialog open={true} onClose={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/プロジェクト名/), '期間テスト');
    fireEvent.change(screen.getByLabelText('開始日'), { target: { value: '2026-02-02' } });
    fireEvent.change(screen.getByLabelText('終了日'), { target: { value: '2026-02-01' } });
    await user.click(screen.getByRole('button', { name: '作成' }));

    expect(await screen.findByText('終了日は開始日以降の日付にしてください')).toBeInTheDocument();
    expect(screen.getByLabelText('終了日')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('開始日と終了日が同じなら送信できる', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProjectDialog open={true} onClose={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/プロジェクト名/), '同日テスト');
    fireEvent.change(screen.getByLabelText('開始日'), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByLabelText('終了日'), { target: { value: '2026-02-01' } });
    await user.click(screen.getByRole('button', { name: '作成' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: '2026-02-01', endDate: '2026-02-01' }),
      ),
    );
  });
});
