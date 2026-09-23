// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDetailDialog } from '../task-detail-dialog';

const state = vi.hoisted(() => ({ role: 'MEMBER', authorId: 'user-1' }));
const mutations = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));
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
      create: { useMutation: () => ({ mutate: mutations.create, isPending: false }) },
      update: { useMutation: () => ({ mutate: mutations.update, isPending: false }) },
      delete: { useMutation: () => ({ mutate: mutations.delete, isPending: false }) },
    },
  },
}));

const dialog = <TaskDetailDialog open taskId="task-1" onClose={() => {}} />;

beforeEach(() => {
  state.role = 'MEMBER';
  state.authorId = 'user-1';
  mutations.create.mockClear();
  mutations.update.mockClear();
  mutations.delete.mockClear();
});

describe('コメント操作の権限', () => {
  it.each(['OWNER', 'ADMIN', 'MEMBER'])('%sの作者は編集と削除を操作できる', async (role) => {
    state.role = role;
    const user = userEvent.setup();
    render(dialog);
    await user.click(screen.getByRole('button', { name: 'コメントを編集' }));
    await user.click(screen.getByRole('button', { name: '更新' }));
    expect(mutations.update).toHaveBeenCalledWith({ id: 'comment-1', content: '元のコメント' });
    await user.click(screen.getByRole('button', { name: 'コメントを削除' }));
    await user.click(screen.getByRole('button', { name: '削除', exact: true }));
    expect(mutations.delete).toHaveBeenCalledWith({ id: 'comment-1' });
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
    expect(mutations.update).not.toHaveBeenCalled();
    expect(mutations.delete).not.toHaveBeenCalled();
  });

  it('空白だけの新規コメントは送信せず、通常入力はtrimして送信する', async () => {
    const user = userEvent.setup();
    render(dialog);
    const textbox = screen.getByRole('textbox', { name: 'コメント本文' });
    const submit = screen.getByRole('button', { name: 'コメント投稿' });

    await user.type(textbox, '   ');
    expect(submit).toBeDisabled();
    const form = textbox.closest('form');
    if (!form) throw new Error('コメント投稿フォームが見つかりません');
    fireEvent.submit(form);
    expect(mutations.create).not.toHaveBeenCalled();

    await user.clear(textbox);
    await user.type(textbox, '  新しいコメント  ');
    await user.click(submit);
    expect(mutations.create).toHaveBeenCalledWith({
      content: '新しいコメント',
      taskId: 'task-1',
    });
  });

  it('編集でも空白だけなら更新せず、通常入力は既存ガードでtrimして送信する', async () => {
    const user = userEvent.setup();
    render(dialog);
    await user.click(screen.getByRole('button', { name: 'コメントを編集' }));
    const editTextbox = screen.getByDisplayValue('元のコメント');
    const update = screen.getByRole('button', { name: '更新' });

    await user.clear(editTextbox);
    await user.type(editTextbox, '   ');
    expect(update).toBeDisabled();
    await user.click(update);
    expect(mutations.update).not.toHaveBeenCalled();

    await user.clear(editTextbox);
    await user.type(editTextbox, '  更新したコメント  ');
    await user.click(update);
    expect(mutations.update).toHaveBeenCalledWith({
      id: 'comment-1',
      content: '更新したコメント',
    });
  });
});
