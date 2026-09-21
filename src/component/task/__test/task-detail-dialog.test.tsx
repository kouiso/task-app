// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDetailDialog } from '../task-detail-dialog';

const state = vi.hoisted(() => ({ role: 'MEMBER', authorId: 'user-1' }));
const mutation = vi.hoisted(() => vi.fn());
vi.mock('@/trpc/react', () => ({
  api: {
    useUtils: () => ({ task: { getById: { invalidate: vi.fn() } } }),
    auth: { getSession: { useQuery: () => ({ data: { user: { id: 'user-1' } } }) } },
    task: {
      getById: {
        useQuery: () => ({
          data: {
            id: 'task-1',
            title: 'タスク',
            description: '',
            status: 'TODO',
            priority: 'MEDIUM',
            project: { name: 'プロジェクト', members: [{ userId: 'user-1', role: state.role }] },
            comments: [
              {
                id: 'comment-1',
                userId: state.authorId,
                content: '元のコメント',
                createdAt: '2026-01-01T00:00:00.000Z',
                user: { name: '作者', email: 'author@example.com', avatar: null },
              },
            ],
          },
        }),
      },
    },
    comment: {
      create: { useMutation: () => ({ mutate: mutation, isPending: false }) },
      update: { useMutation: () => ({ mutate: mutation, isPending: false }) },
      delete: { useMutation: () => ({ mutate: mutation, isPending: false }) },
    },
  },
}));

const dialog = <TaskDetailDialog open taskId="task-1" onClose={() => {}} />;

beforeEach(() => {
  state.role = 'MEMBER';
  state.authorId = 'user-1';
  mutation.mockClear();
});

describe('コメント操作の権限', () => {
  it.each(['OWNER', 'ADMIN', 'MEMBER'])('%sの作者は編集と削除を操作できる', async (role) => {
    state.role = role;
    const user = userEvent.setup();
    render(dialog);
    await user.click(screen.getByRole('button', { name: 'コメントを編集' }));
    await user.click(screen.getByRole('button', { name: '更新' }));
    expect(mutation).toHaveBeenCalledWith({ id: 'comment-1', content: '元のコメント' });
    await user.click(screen.getByRole('button', { name: 'コメントを削除' }));
    await user.click(screen.getByRole('button', { name: '削除', exact: true }));
    expect(mutation).toHaveBeenCalledWith({ id: 'comment-1' });
  });

  it('VIEWERは作者でも編集・削除・投稿を表示しない', () => {
    state.role = 'VIEWER';
    render(dialog);
    expect(screen.getByText('元のコメント')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'コメントを編集' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'コメントを削除' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'コメント投稿' })).not.toBeInTheDocument();
  });

  it('編集権限があっても他人のコメント操作は表示しない', () => {
    state.authorId = 'other-user';
    render(dialog);
    expect(screen.queryByRole('button', { name: 'コメントを編集' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'コメントを削除' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'コメント投稿' })).toBeInTheDocument();
  });

  it.each([
    '編集',
    '削除',
  ])('%s中にVIEWERへ降格すると操作を閉じ、再昇格しても復元しない', async (action) => {
    const user = userEvent.setup();
    const { rerender } = render(dialog);
    await user.click(screen.getByRole('button', { name: `コメントを${action}` }));
    state.role = 'VIEWER';
    rerender(<TaskDetailDialog open taskId="task-1" onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: '更新' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    state.role = 'MEMBER';
    rerender(<TaskDetailDialog open taskId="task-1" onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: '更新' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mutation).not.toHaveBeenCalled();
  });
});
