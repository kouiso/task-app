/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
});
