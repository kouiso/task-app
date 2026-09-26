// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDetailDialog } from '../task-detail-dialog';

const state = vi.hoisted(() => ({ role: 'MEMBER', authorId: 'user-1' }));
const mutations = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));
const mutationOptions = vi.hoisted(() => ({
  create: {} as { onSuccess?: () => void },
  update: {} as { onSuccess?: () => void },
  delete: {} as { onSuccess?: () => void },
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
      create: {
        useMutation: (options?: { onSuccess?: () => void }) => {
          mutationOptions.create = options ?? {};
          return { mutate: mutations.create, isPending: false };
        },
      },
      update: {
        useMutation: (options?: { onSuccess?: () => void }) => {
          mutationOptions.update = options ?? {};
          return { mutate: mutations.update, isPending: false };
        },
      },
      delete: {
        useMutation: (options?: { onSuccess?: () => void }) => {
          mutationOptions.delete = options ?? {};
          return { mutate: mutations.delete, isPending: false };
        },
      },
    },
  },
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const dialog = <TaskDetailDialog open taskId="task-1" onClose={() => {}} />;

beforeEach(() => {
  state.role = 'MEMBER';
  state.authorId = 'user-1';
  mutations.create.mockClear();
  mutations.update.mockClear();
  mutations.delete.mockClear();
  vi.mocked(toast).mockClear();
  vi.mocked(toast.success).mockClear();
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
    await user.click(screen.getByRole('button', { name: '削除' }));
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

describe('送信後の下書きと成功通知', () => {
  it('投稿の送信後に書き足すと、成功しても下書きを残して警告を出す', async () => {
    const user = userEvent.setup();
    render(dialog);
    const textbox = screen.getByRole('textbox', { name: 'コメント本文' });

    await user.type(textbox, '最初の本文');
    await user.click(screen.getByRole('button', { name: 'コメント投稿' }));
    expect(mutations.create).toHaveBeenCalledWith({
      content: '最初の本文',
      taskId: 'task-1',
    });

    // 送信待ちの間に書き足す
    await user.type(textbox, '追記');

    act(() => mutationOptions.create.onSuccess?.());

    expect(toast.success).toHaveBeenCalledWith('コメントを投稿しました');
    expect(toast).toHaveBeenCalledWith(
      '送信後の変更は保存されていません。このまま投稿すると別のコメントになります',
    );
    expect(textbox).toHaveValue('最初の本文追記');
  });

  it('編集を始めても、進行中の投稿成功は作成フォームをリセットする', async () => {
    // 作成と編集の世代が分離されていることの確認。
    // 共有だと編集開始で世代が進み、投稿成功時に reset が呼ばれず下書きが残る。
    const user = userEvent.setup();
    render(dialog);
    const textbox = screen.getByRole('textbox', { name: 'コメント本文' });

    await user.type(textbox, '投稿中の下書き');
    await user.click(screen.getByRole('button', { name: 'コメント投稿' }));
    expect(mutations.create).toHaveBeenCalledTimes(1);

    // 投稿が返る前に別コメントの編集を始める（編集用の世代だけが進む）
    await user.click(screen.getByRole('button', { name: 'コメントを編集' }));
    expect(screen.getByDisplayValue('元のコメント')).toBeInTheDocument();

    act(() => mutationOptions.create.onSuccess?.());

    expect(toast.success).toHaveBeenCalledWith('コメントを投稿しました');
    expect(textbox).toHaveValue('');
    // 編集中のフォームはそのまま残る
    expect(screen.getByDisplayValue('元のコメント')).toBeInTheDocument();
  });

  it('投稿を閉じて開き直すと、古い投稿成功は新しい下書きを消さない', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<TaskDetailDialog open taskId="task-1" onClose={onClose} />);
    const textbox = screen.getByRole('textbox', { name: 'コメント本文' });

    await user.type(textbox, '最初の下書き');
    await user.click(screen.getByRole('button', { name: 'コメント投稿' }));
    expect(mutations.create).toHaveBeenCalledTimes(1);

    // 閉じる操作で下書きは一度リセットされ、開き直して別の下書きを書く
    // （作成用の世代が進む）
    await user.click(screen.getByRole('button', { name: '閉じる' }));
    rerender(<TaskDetailDialog open={false} taskId="task-1" onClose={onClose} />);
    rerender(<TaskDetailDialog open taskId="task-1" onClose={onClose} />);
    const reopenedTextbox = screen.getByRole('textbox', { name: 'コメント本文' });
    await user.type(reopenedTextbox, '別の下書き');

    act(() => mutationOptions.create.onSuccess?.());

    expect(toast.success).toHaveBeenCalledWith('コメントを投稿しました');
    expect(toast).not.toHaveBeenCalled();
    expect(reopenedTextbox).toHaveValue('別の下書き');
  });

  it('更新の送信後に書き足すと、編集を閉じずに警告を出す', async () => {
    const user = userEvent.setup();
    render(dialog);

    await user.click(screen.getByRole('button', { name: 'コメントを編集' }));
    const editTextbox = screen.getByDisplayValue('元のコメント');
    await user.click(screen.getByRole('button', { name: '更新' }));
    expect(mutations.update).toHaveBeenCalledWith({
      id: 'comment-1',
      content: '元のコメント',
    });

    // 送信待ちの間に書き足す
    await user.type(editTextbox, '追記');

    act(() => mutationOptions.update.onSuccess?.());

    expect(toast.success).toHaveBeenCalledWith('コメントを更新しました');
    expect(toast).toHaveBeenCalledWith(
      '送信後の変更は保存されていません。もう一度更新すると反映されます',
    );
    expect(editTextbox).toHaveValue('元のコメント追記');
    expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument();
  });

  it('更新の送信後に変更がなければ編集を閉じて成功トーストを出す', async () => {
    const user = userEvent.setup();
    render(dialog);

    await user.click(screen.getByRole('button', { name: 'コメントを編集' }));
    await user.click(screen.getByRole('button', { name: '更新' }));

    act(() => mutationOptions.update.onSuccess?.());

    expect(toast.success).toHaveBeenCalledWith('コメントを更新しました');
    expect(toast).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('元のコメント')).not.toBeInTheDocument();
  });

  it('編集をやり直した後の古い更新成功は、新しい編集を閉じない', async () => {
    const user = userEvent.setup();
    render(dialog);

    await user.click(screen.getByRole('button', { name: 'コメントを編集' }));
    await user.click(screen.getByRole('button', { name: '更新' }));
    expect(mutations.update).toHaveBeenCalledTimes(1);

    // 取り消して編集し直す（編集用の世代が2回進む）
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    await user.click(screen.getByRole('button', { name: 'コメントを編集' }));
    const editTextbox = screen.getByDisplayValue('元のコメント');
    await user.type(editTextbox, '書き直し');

    act(() => mutationOptions.update.onSuccess?.());

    // 成功通知は出るが、新しい編集セッションには触れない
    expect(toast.success).toHaveBeenCalledWith('コメントを更新しました');
    expect(editTextbox).toHaveValue('元のコメント書き直し');
    expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument();
  });

  it('削除の成功時に成功トーストを出す', async () => {
    const user = userEvent.setup();
    render(dialog);

    await user.click(screen.getByRole('button', { name: 'コメントを削除' }));
    await user.click(screen.getByRole('button', { name: '削除' }));
    expect(mutations.delete).toHaveBeenCalledWith({ id: 'comment-1' });

    act(() => mutationOptions.delete.onSuccess?.());

    expect(toast.success).toHaveBeenCalledWith('コメントを削除しました');
  });
});
