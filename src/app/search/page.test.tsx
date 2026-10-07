// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchPage from './page';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
  searchQuery: vi.fn(),
  refetch: vi.fn(),
  deleteTask: vi.fn(),
  deleteOptions: null as null | {
    onSuccess?: () => void;
    onError?: (error: { data?: { httpStatus?: number }; message?: string }) => void;
  },
  toastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => mocks.searchParams,
}));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/component/task/task-card', () => ({
  TaskCard: ({
    id,
    title,
    onDelete,
  }: {
    id: string;
    title: string;
    onDelete: (id: string) => void;
  }) => (
    <div>
      <p>{title}</p>
      <button type="button" onClick={() => onDelete(id)}>
        タスクを削除
      </button>
    </div>
  ),
}));
vi.mock('@/component/ui/delete-confirm-dialog', () => ({
  DeleteConfirmDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) =>
    open ? (
      <button type="button" onClick={onConfirm}>
        削除を確定
      </button>
    ) : null,
}));
vi.mock('react-hot-toast', () => ({ default: { error: mocks.toastError } }));
vi.mock('@/component/ui/loading-spinner', () => ({
  PageLoadingSpinner: () => <p>読み込み中</p>,
}));
vi.mock('@/trpc/react', () => ({
  api: {
    useUtils: () => ({ search: { search: { invalidate: vi.fn() } } }),
    auth: { getSession: { useQuery: () => ({ data: { user: { id: 'user-1' } } }) } },
    search: {
      getUserProjects: { useQuery: () => ({ data: [] }) },
      getProjectMembers: { useQuery: () => ({ data: [] }) },
      search: { useQuery: mocks.searchQuery },
    },
    project: { getAll: { useQuery: () => ({ data: [] }) } },
    task: {
      delete: {
        useMutation: (options: {
          onSuccess?: () => void;
          onError?: (error: { data?: { httpStatus?: number }; message?: string }) => void;
        }) => {
          mocks.deleteOptions = options;
          return { mutate: mocks.deleteTask, isPending: false };
        },
      },
    },
  },
}));

const cachedResults = {
  totalCount: 1,
  tasks: [],
  projects: [
    {
      id: 'clh12345678901234567890123',
      name: '秘密プロジェクト',
      description: null,
      _count: { tasks: 0 },
      members: [],
    },
  ],
};

function queryResult(status?: number, data: typeof cachedResults | null = cachedResults) {
  return {
    data: data ?? undefined,
    isLoading: false,
    isError: status !== undefined,
    isFetching: false,
    error: status === undefined ? null : { data: { httpStatus: status } },
    refetch: mocks.refetch,
  };
}

beforeEach(() => {
  mocks.searchParams = new URLSearchParams('keyword=api');
  mocks.push.mockReset();
  mocks.replace.mockReset();
  mocks.refetch.mockReset();
  mocks.deleteTask.mockReset();
  mocks.deleteOptions = null;
  mocks.toastError.mockReset();
  mocks.searchQuery.mockReset().mockReturnValue(queryResult());
});

describe('検索条件と取得エラー', () => {
  it('不正なprojectIdとassignedToをAPIへ送らずURLから除く', async () => {
    mocks.searchParams = new URLSearchParams('projectId=abc&assignedTo=user-1');
    render(<SearchPage />);

    const [input, options] = mocks.searchQuery.mock.calls[0];
    expect(input.projectId).toBeUndefined();
    expect(input.assignedTo).toBeUndefined();
    expect(options.enabled).toBe(false);
    expect(screen.getByText('検索条件を入力して検索してください')).toBeInTheDocument();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/search', { scroll: false }));
  });

  it('初回500を未入力案内にせず再試行できる', () => {
    mocks.searchQuery.mockReturnValue(queryResult(500, null));
    render(<SearchPage />);

    expect(screen.getByText('検索に失敗しました')).toBeInTheDocument();
    expect(screen.queryByText('検索条件を入力して検索してください')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it('再取得500ではキャッシュ済み結果と警告を表示する', () => {
    mocks.searchQuery.mockReturnValue(queryResult(500));
    render(<SearchPage />);

    expect(screen.getByText('秘密プロジェクト')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('前回取得時の内容です');
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it.each([
    [401, 'ログインの有効期限が切れました', 'ログイン画面へ', '/login'],
    [403, 'この検索結果を見る権限がありません', '検索条件をクリア', '/search'],
  ] as const)('%sではキャッシュ済み結果を隠して再試行しない', (status, message, button, route) => {
    mocks.searchQuery.mockReturnValue(queryResult(status));
    render(<SearchPage />);

    expect(screen.queryByText('秘密プロジェクト')).not.toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(mocks.push).toHaveBeenCalledWith(route);
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(mocks.searchQuery.mock.calls[0][1].retry(0, { data: { httpStatus: status } })).toBe(
      false,
    );
  });
});

describe('キーワード入力', () => {
  it('IME変換確定のEnterを無視し、通常のEnterではすぐURLを更新する', async () => {
    mocks.searchParams = new URLSearchParams();
    render(<SearchPage />);
    const input = screen.getByRole('textbox', { name: 'キーワード' });

    fireEvent.change(input, { target: { value: '検索' } });
    mocks.replace.mockClear();
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(mocks.replace).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter', isComposing: false });
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith('/search?keyword=%E6%A4%9C%E7%B4%A2', {
        scroll: false,
      }),
    );
  });
});

describe('タスク削除', () => {
  const taskResult = {
    id: 'task-1',
    title: '削除対象のタスク',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: null,
    assignee: null,
    projectId: 'project-1',
  };

  it('削除が成功するまで確認ダイアログは開いたままにする', () => {
    mocks.searchQuery.mockReturnValue(
      queryResult(undefined, { totalCount: 1, projects: [], tasks: [taskResult] as never[] }),
    );
    render(<SearchPage />);

    fireEvent.click(screen.getByRole('button', { name: 'タスクを削除' }));
    fireEvent.click(screen.getByRole('button', { name: '削除を確定' }));
    expect(mocks.deleteTask).toHaveBeenCalledWith({ id: 'task-1' });

    // 失敗時に「消えたように見える」のを防ぐため、成功するまで閉じない
    expect(screen.getByRole('button', { name: '削除を確定' })).toBeInTheDocument();

    act(() => mocks.deleteOptions?.onSuccess?.());
    expect(screen.queryByRole('button', { name: '削除を確定' })).not.toBeInTheDocument();
  });

  it('削除の失敗は失敗トーストを出し、401は再ログインを促す', () => {
    render(<SearchPage />);

    act(() => mocks.deleteOptions?.onError?.({ data: { httpStatus: 500 }, message: '削除エラー' }));
    expect(mocks.toastError).toHaveBeenCalledWith('削除エラー');

    act(() =>
      mocks.deleteOptions?.onError?.({ data: { httpStatus: 401 }, message: 'UNAUTHORIZED' }),
    );
    expect(mocks.toastError).toHaveBeenCalledWith('ログインの有効期限が切れました');
  });
});
