/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
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

describe('TaskDialog', () => {
  beforeAll(() => {
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
});
