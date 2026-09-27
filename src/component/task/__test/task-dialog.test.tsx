/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDialog } from '../task-dialog';

vi.mock('@/trpc/react', () => ({
  api: {
    search: {
      getMembersByProject: {
        useQuery: () => ({ data: [] }),
      },
    },
  },
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

describe('TaskDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperties(HTMLElement.prototype, {
      hasPointerCapture: { value: vi.fn(() => false), configurable: true },
      releasePointerCapture: { value: vi.fn(), configurable: true },
      scrollIntoView: { value: vi.fn(), configurable: true },
      setPointerCapture: { value: vi.fn(), configurable: true },
    });
  });

  const projects = [
    { id: 'project-1', name: 'プロジェクトA' },
    { id: 'project-2', name: 'プロジェクトB' },
  ];

  it('編集データのあとに新規作成を開くとデフォルトのステータスに戻る', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = render(
      <TaskDialog
        open={true}
        onClose={onClose}
        onSubmit={vi.fn()}
        initialData={{
          id: 'task-1',
          title: '既存タスク',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          projectId: 'project-2',
        }}
        projects={projects}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'ステータスを選択' })).toHaveTextContent('進行中');

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <TaskDialog
        open={false}
        onClose={onClose}
        onSubmit={vi.fn()}
        initialData={undefined}
        projects={projects}
      />,
    );
    rerender(
      <TaskDialog
        open={true}
        onClose={onClose}
        onSubmit={vi.fn()}
        initialData={undefined}
        projects={projects}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'ステータスを選択' })).toHaveTextContent('未対応');
    expect(screen.getByRole('combobox', { name: 'プロジェクトを選択' })).toHaveTextContent(
      'プロジェクトA',
    );
  });

  it('期限フィールドを表示する', () => {
    render(
      <TaskDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialData={undefined}
        projects={projects}
      />,
    );

    expect(screen.getByLabelText('期限')).toBeInTheDocument();
  });

  it('プロジェクト一覧が遅れて届いても入力中の値を維持して最初の候補を選ぶ', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TaskDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialData={undefined}
        projects={[]}
      />,
    );

    await user.type(screen.getByPlaceholderText('タスクのタイトルを入力'), '入力中のタスク');

    rerender(
      <TaskDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialData={undefined}
        projects={projects}
      />,
    );

    expect(screen.getByPlaceholderText('タスクのタイトルを入力')).toHaveValue('入力中のタスク');
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'プロジェクトを選択' })).toHaveTextContent(
        'プロジェクトA',
      );
    });
  });

  describe('送信後の下書きと成功通知', () => {
    const editingTask = {
      id: 'task-1',
      title: '既存タスク',
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      projectId: 'project-1',
    };

    const deferredOnSubmit = () => {
      let resolveSubmit: (value?: unknown) => void = () => {};
      const onSubmit = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveSubmit = resolve;
          }),
      );
      return { onSubmit, resolveSubmit: () => resolveSubmit() };
    };

    it('作成の送信後に書き足すと、成功しても閉じずに警告を出す', async () => {
      const user = userEvent.setup();
      const { onSubmit, resolveSubmit } = deferredOnSubmit();
      const onClose = vi.fn();
      render(<TaskDialog open onClose={onClose} onSubmit={onSubmit} projects={projects} />);

      await user.type(screen.getByPlaceholderText('タスクのタイトルを入力'), '新しいタスク');
      await user.click(screen.getByRole('button', { name: '作成' }));
      expect(onSubmit).toHaveBeenCalledTimes(1);

      // 送信待ちの間に書き足す
      await user.type(screen.getByPlaceholderText('タスクの説明...'), '追記');

      await act(async () => {
        resolveSubmit();
      });

      expect(toast.success).toHaveBeenCalledWith('タスクを作成しました');
      expect(toast).toHaveBeenCalledWith(
        '送信後の変更は保存されていません。このまま作成すると別のタスクになります',
      );
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByPlaceholderText('タスクの説明...')).toHaveValue('追記');
    });

    it('更新の送信後に書き足すと、閉じずに開き直しを促す', async () => {
      const user = userEvent.setup();
      const { onSubmit, resolveSubmit } = deferredOnSubmit();
      const onClose = vi.fn();
      render(
        <TaskDialog
          open
          onClose={onClose}
          onSubmit={onSubmit}
          initialData={editingTask}
          projects={projects}
        />,
      );

      await user.click(screen.getByRole('button', { name: '更新' }));
      expect(onSubmit).toHaveBeenCalledTimes(1);

      await user.type(screen.getByPlaceholderText('タスクのタイトルを入力'), '追記');

      await act(async () => {
        resolveSubmit();
      });

      expect(toast.success).toHaveBeenCalledWith('タスクを更新しました');
      expect(toast).toHaveBeenCalledWith(
        '送信後の変更は保存されていません。閉じて開き直してから保存してください',
      );
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByPlaceholderText('タスクのタイトルを入力')).toHaveValue('既存タスク追記');
    });

    it('送信後に変更がなければ成功トーストを出して閉じる', async () => {
      const user = userEvent.setup();
      const { onSubmit, resolveSubmit } = deferredOnSubmit();
      const onClose = vi.fn();
      render(<TaskDialog open onClose={onClose} onSubmit={onSubmit} projects={projects} />);

      await user.type(screen.getByPlaceholderText('タスクのタイトルを入力'), '新しいタスク');
      await user.click(screen.getByRole('button', { name: '作成' }));

      await act(async () => {
        resolveSubmit();
      });

      expect(toast.success).toHaveBeenCalledWith('タスクを作成しました');
      expect(toast).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('送信失敗時は成功トーストを出さずに下書きを残す', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(() => Promise.reject(new Error('サーバーエラー')));
      const onClose = vi.fn();
      render(<TaskDialog open onClose={onClose} onSubmit={onSubmit} projects={projects} />);

      await user.type(screen.getByPlaceholderText('タスクのタイトルを入力'), '新しいタスク');
      await user.click(screen.getByRole('button', { name: '作成' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByRole('button', { name: '作成' })).not.toBeDisabled());

      expect(toast.success).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByPlaceholderText('タスクのタイトルを入力')).toHaveValue('新しいタスク');
    });

    it('送信中に閉じて開き直すと、古い成功では新しい下書きを閉じず警告も出さない', async () => {
      const user = userEvent.setup();
      const { onSubmit, resolveSubmit } = deferredOnSubmit();
      const onClose = vi.fn();
      const { rerender } = render(
        <TaskDialog open onClose={onClose} onSubmit={onSubmit} projects={projects} />,
      );

      await user.type(screen.getByPlaceholderText('タスクのタイトルを入力'), '最初のタスク');
      await user.click(screen.getByRole('button', { name: '作成' }));
      expect(onSubmit).toHaveBeenCalledTimes(1);

      // 送信待ちの間にキャンセルして別タスクの作成を開き直す
      await user.click(screen.getByRole('button', { name: 'キャンセル' }));
      expect(onClose).toHaveBeenCalledTimes(1);
      rerender(
        <TaskDialog open={false} onClose={onClose} onSubmit={onSubmit} projects={projects} />,
      );
      rerender(<TaskDialog open onClose={onClose} onSubmit={onSubmit} projects={projects} />);
      await user.type(screen.getByPlaceholderText('タスクのタイトルを入力'), '別のタスク');

      await act(async () => {
        resolveSubmit();
      });

      // 成功通知自体は出るが、新しいセッションの下書きには触れない
      expect(toast.success).toHaveBeenCalledWith('タスクを作成しました');
      expect(toast).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.getByPlaceholderText('タスクのタイトルを入力')).toHaveValue('別のタスク');
    });
  });
});
