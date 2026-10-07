// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskPage from './page';

interface ErrorShape {
  data?: { httpStatus?: number };
  message?: string;
}

const mocks = vi.hoisted(() => ({
  createOptions: null as null | { onError?: (error: ErrorShape) => void },
  updateOptions: null as null | { onError?: (error: ErrorShape) => void },
  deleteOptions: null as null | {
    onSuccess?: () => void;
    onError?: (error: ErrorShape) => void;
  },
  deleteTask: vi.fn(),
  invalidateTasks: vi.fn(),
  replace: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/task',
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('react-hot-toast', () => ({ default: { error: mocks.toastError } }));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/component/task/task-card', () => ({
  TaskCard: ({ title, onDelete }: { title: string; onDelete: (id: string) => void }) => (
    <div>
      <span>{title}</span>
      <button type="button" onClick={() => onDelete('task-1')}>
        タスクを削除
      </button>
    </div>
  ),
}));
vi.mock('@/component/task/task-detail-dialog', () => ({ TaskDetailDialog: () => null }));
vi.mock('@/component/task/task-dialog', () => ({ TaskDialog: () => null }));
vi.mock('@/component/ui/delete-confirm-dialog', () => ({
  DeleteConfirmDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) =>
    open ? (
      <button type="button" onClick={onConfirm}>
        削除を確定
      </button>
    ) : null,
}));
vi.mock('@/component/ui/loading-spinner', () => ({ PageLoadingSpinner: () => <div>loading</div> }));
vi.mock('@/component/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));
vi.mock('@/component/ui/checkbox', () => ({ Checkbox: () => null }));
vi.mock('@/component/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/component/ui/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock('@/component/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));
vi.mock('@/trpc/react', () => ({
  api: {
    auth: { getSession: { useQuery: () => ({ data: { user: { id: 'user-1' } } }) } },
    project: {
      getAll: {
        useQuery: () => ({
          data: [
            {
              id: 'project-1',
              name: 'Project',
              members: [{ userId: 'user-1', role: 'OWNER' }],
            },
          ],
        }),
      },
    },
    search: { getProjectMembers: { useQuery: () => ({ data: [] }) } },
    task: {
      getById: { useQuery: () => ({ data: undefined }) },
      getAll: {
        useQuery: () => ({
          data: [
            {
              id: 'task-1',
              title: '削除対象',
              description: null,
              status: 'TODO',
              priority: 'MEDIUM',
              dueDate: null,
              assignee: null,
              projectId: 'project-1',
              timeSpentMinutes: 0,
            },
          ],
          isLoading: false,
        }),
      },
      create: {
        useMutation: (options: { onError?: (error: ErrorShape) => void }) => {
          mocks.createOptions = options;
          return { mutate: vi.fn() };
        },
      },
      update: {
        useMutation: (options: { onError?: (error: ErrorShape) => void }) => {
          mocks.updateOptions = options;
          return { mutate: vi.fn() };
        },
      },
      delete: {
        useMutation: (options: {
          onSuccess?: () => void;
          onError?: (error: ErrorShape) => void;
        }) => {
          mocks.deleteOptions = options;
          return { mutate: mocks.deleteTask, isPending: false };
        },
      },
      bulkComplete: { useMutation: () => ({ mutate: vi.fn() }) },
      bulkDelete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      bulkUpdateStatus: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    useUtils: () => ({ task: { getAll: { invalidate: mocks.invalidateTasks } } }),
  },
}));

beforeEach(() => {
  mocks.createOptions = null;
  mocks.updateOptions = null;
  mocks.deleteOptions = null;
  mocks.deleteTask.mockReset();
  mocks.invalidateTasks.mockReset();
  mocks.replace.mockReset();
  mocks.toastError.mockReset();
});

describe('タスク削除の失敗表示', () => {
  it('削除要求と確定済みエラーを利用者へ伝える', () => {
    render(<TaskPage />);

    fireEvent.click(screen.getByRole('button', { name: 'タスクを削除' }));
    fireEvent.click(screen.getByRole('button', { name: '削除を確定' }));
    expect(mocks.deleteTask).toHaveBeenCalledWith({ id: 'task-1' });

    act(() => {
      mocks.deleteOptions?.onError?.({
        data: { httpStatus: 403 },
        message: '削除権限がありません',
      });
    });
    expect(mocks.toastError).toHaveBeenCalledWith('削除権限がありません');
  });

  it('結果不明の通信失敗では一覧を再取得する', () => {
    render(<TaskPage />);

    act(() => {
      mocks.deleteOptions?.onError?.({ message: 'network error' });
    });

    expect(mocks.toastError).toHaveBeenCalledWith(
      '応答を確認できませんでした。一覧を更新して結果を確認してください。',
    );
    expect(mocks.invalidateTasks).toHaveBeenCalledOnce();
  });

  it('401 の失敗は通常の失敗と区別して再ログインが必要と伝える', () => {
    render(<TaskPage />);

    act(() => {
      mocks.deleteOptions?.onError?.({ data: { httpStatus: 401 }, message: 'UNAUTHORIZED' });
    });

    expect(mocks.toastError).toHaveBeenCalledWith('ログインの有効期限が切れました');
  });

  it('削除が成功するまで確認ダイアログは開いたままにする', () => {
    render(<TaskPage />);

    fireEvent.click(screen.getByRole('button', { name: 'タスクを削除' }));
    fireEvent.click(screen.getByRole('button', { name: '削除を確定' }));
    expect(mocks.deleteTask).toHaveBeenCalledWith({ id: 'task-1' });

    // ダイアログを閉じるのは成功の確認後。失敗時に消えたように見せない
    act(() => {
      mocks.deleteOptions?.onSuccess?.();
    });
    expect(screen.queryByRole('button', { name: '削除を確定' })).not.toBeInTheDocument();
  });
});

describe('タスク保存の失敗表示', () => {
  it('作成・更新の失敗は失敗トーストを出す', () => {
    render(<TaskPage />);

    act(() => {
      mocks.createOptions?.onError?.({ data: { httpStatus: 500 }, message: '作成エラー' });
    });
    expect(mocks.toastError).toHaveBeenCalledWith('作成エラー');

    act(() => {
      mocks.updateOptions?.onError?.({ data: { httpStatus: 500 }, message: '更新エラー' });
    });
    expect(mocks.toastError).toHaveBeenCalledWith('更新エラー');
  });

  it('401 の失敗は通常の失敗と区別して再ログインが必要と伝える', () => {
    render(<TaskPage />);

    act(() => {
      mocks.createOptions?.onError?.({ data: { httpStatus: 401 }, message: 'UNAUTHORIZED' });
    });
    expect(mocks.toastError).toHaveBeenCalledWith('ログインの有効期限が切れました');

    act(() => {
      mocks.updateOptions?.onError?.({ data: { httpStatus: 401 }, message: 'UNAUTHORIZED' });
    });
    expect(mocks.toastError).toHaveBeenCalledWith('ログインの有効期限が切れました');
  });
});
