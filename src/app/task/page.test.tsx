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
  deleteOptions: null as null | {
    onError?: (error: ErrorShape, variables: { id: string }) => void;
  },
  deleteTask: vi.fn(),
  invalidateTasks: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  searchParams: '',
  retrySession: vi.fn(),
  retryUsers: vi.fn(),
  retryLinkedTask: vi.fn(),
  retryProjects: vi.fn(),
  retryTasks: vi.fn(),
  sessionQuery: {
    data: { user: { id: 'user-1' } } as { user: { id: string } } | undefined,
    error: null as ErrorShape | null,
    isFetching: false,
    isSuccess: true,
  },
  usersQuery: {
    data: [] as Array<{ id: string; name: string | null; email: string }> | undefined,
    error: null as ErrorShape | null,
    isFetching: false,
  },
  linkedTaskQuery: {
    data: undefined as
      | {
          id: string;
          title: string;
          description: string | null;
          status: 'TODO';
          priority: 'MEDIUM';
          projectId: string;
          dueDate: Date | null;
          estimatedHours: number | null;
          assigneeId: string | null;
          updatedAt: Date;
        }
      | undefined,
    error: null as ErrorShape | null,
    isFetching: false,
  },
  projectQuery: {
    data: [
      {
        id: 'project-1',
        name: 'Project',
        members: [{ userId: 'user-1', role: 'OWNER' }],
      },
    ] as
      | Array<{
          id: string;
          name: string;
          members: Array<{ userId: string; role: string }>;
        }>
      | undefined,
    error: null as ErrorShape | null,
    isFetching: false,
  },
  taskQuery: {
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
    ] as
      | Array<{
          id: string;
          title: string;
          description: null;
          status: string;
          priority: string;
          dueDate: null;
          assignee: null;
          projectId: string;
          timeSpentMinutes: number;
        }>
      | undefined,
    error: null as ErrorShape | null,
    isFetching: false,
    isLoading: false,
  },
  toastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/task',
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
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
    auth: {
      getSession: {
        useQuery: () => ({ ...mocks.sessionQuery, refetch: mocks.retrySession }),
      },
    },
    project: {
      getAll: {
        useQuery: () => ({
          ...mocks.projectQuery,
          refetch: mocks.retryProjects,
        }),
      },
    },
    search: {
      getProjectMembers: {
        useQuery: () => ({ ...mocks.usersQuery, refetch: mocks.retryUsers }),
      },
    },
    task: {
      getById: {
        useQuery: () => ({ ...mocks.linkedTaskQuery, refetch: mocks.retryLinkedTask }),
      },
      getAll: {
        useQuery: () => ({
          ...mocks.taskQuery,
          refetch: mocks.retryTasks,
        }),
      },
      create: { useMutation: () => ({ mutate: vi.fn() }) },
      update: { useMutation: () => ({ mutate: vi.fn() }) },
      delete: {
        useMutation: (options: {
          onError?: (error: ErrorShape, variables: { id: string }) => void;
        }) => {
          mocks.deleteOptions = options;
          return { mutate: mocks.deleteTask, isPending: false };
        },
      },
      bulkComplete: { useMutation: () => ({ mutate: vi.fn() }) },
      bulkDelete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      bulkUpdateStatus: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    useUtils: () => ({
      task: {
        getAll: { invalidate: mocks.invalidateTasks },
        getById: { invalidate: vi.fn().mockResolvedValue(undefined) },
      },
      project: { getAll: { invalidate: vi.fn().mockResolvedValue(undefined) } },
    }),
  },
}));

beforeEach(() => {
  mocks.deleteOptions = null;
  mocks.deleteTask.mockReset();
  mocks.invalidateTasks.mockReset();
  mocks.invalidateTasks.mockResolvedValue(undefined);
  mocks.searchParams = '';
  mocks.sessionQuery.data = { user: { id: 'user-1' } };
  mocks.sessionQuery.error = null;
  mocks.sessionQuery.isFetching = false;
  mocks.sessionQuery.isSuccess = true;
  mocks.usersQuery.data = [];
  mocks.usersQuery.error = null;
  mocks.usersQuery.isFetching = false;
  mocks.linkedTaskQuery.data = undefined;
  mocks.linkedTaskQuery.error = null;
  mocks.linkedTaskQuery.isFetching = false;
  mocks.projectQuery.data = [
    {
      id: 'project-1',
      name: 'Project',
      members: [{ userId: 'user-1', role: 'OWNER' }],
    },
  ];
  mocks.projectQuery.error = null;
  mocks.projectQuery.isFetching = false;
  mocks.taskQuery.data = [
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
  ];
  mocks.taskQuery.error = null;
  mocks.taskQuery.isFetching = false;
  mocks.taskQuery.isLoading = false;
  mocks.replace.mockReset();
  mocks.push.mockReset();
  mocks.retrySession.mockReset();
  mocks.retrySession.mockResolvedValue(undefined);
  mocks.retryUsers.mockReset();
  mocks.retryUsers.mockResolvedValue(undefined);
  mocks.retryLinkedTask.mockReset();
  mocks.retryLinkedTask.mockResolvedValue(undefined);
  mocks.retryProjects.mockReset();
  mocks.retryProjects.mockResolvedValue(undefined);
  mocks.retryTasks.mockReset();
  mocks.retryTasks.mockResolvedValue(undefined);
  mocks.toastError.mockReset();
});

describe('タスク一覧の取得失敗', () => {
  it('初回のログイン情報取得500で権限を空扱いにせず、失敗したqueryだけ再試行する', () => {
    mocks.sessionQuery.data = undefined;
    mocks.sessionQuery.error = { data: { httpStatus: 500 } };

    render(<TaskPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('ログイン情報を取得できませんでした');
    expect(screen.queryByText('削除対象')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.retrySession).toHaveBeenCalledOnce();
    expect(mocks.retryTasks).not.toHaveBeenCalled();
    expect(mocks.retryProjects).not.toHaveBeenCalled();
  });

  it('キャッシュ済みログイン情報を500後も権限判定に使い、古い可能性を示す', () => {
    mocks.sessionQuery.error = { data: { httpStatus: 500 } };

    render(<TaskPage />);

    expect(screen.getByRole('button', { name: '新規タスク' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('前回取得時の権限で表示しています');
  });

  it('担当者候補の初回500を空の候補として扱わず、再試行できる', () => {
    mocks.usersQuery.data = undefined;
    mocks.usersQuery.error = { data: { httpStatus: 500 } };

    render(<TaskPage />);

    expect(screen.getByText('削除対象')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('担当者候補を取得できませんでした');
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.retryUsers).toHaveBeenCalledOnce();
    expect(mocks.retrySession).not.toHaveBeenCalled();
  });

  it('キャッシュ済み担当者候補を500後も残し、古い可能性を示す', () => {
    mocks.usersQuery.data = [{ id: 'user-2', name: '担当者A', email: 'a@example.com' }];
    mocks.usersQuery.error = { data: { httpStatus: 500 } };

    render(<TaskPage />);

    expect(screen.getByText('担当者A')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('前回取得時の候補です');
  });

  it('URL指定した編集対象の初回500を黙って閉じず、再試行できる', () => {
    mocks.searchParams = 'taskId=task-1&edit=true';
    mocks.linkedTaskQuery.error = { data: { httpStatus: 500 } };

    render(<TaskPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('編集するタスクを取得できませんでした');
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.retryLinkedTask).toHaveBeenCalledOnce();
  });

  it('キャッシュ済み編集対象を500後も残し、古い可能性を示す', () => {
    mocks.searchParams = 'taskId=task-1&edit=true';
    mocks.linkedTaskQuery.data = {
      id: 'task-1',
      title: '編集対象',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      projectId: 'project-1',
      dueDate: null,
      estimatedHours: null,
      assigneeId: null,
      updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    };
    mocks.linkedTaskQuery.error = { data: { httpStatus: 500 } };

    render(<TaskPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('前回取得時の内容です');
  });

  it('支援queryの再取得中はその再試行を無効にする', () => {
    mocks.usersQuery.data = undefined;
    mocks.usersQuery.error = { data: { httpStatus: 500 } };
    mocks.usersQuery.isFetching = true;

    render(<TaskPage />);

    expect(screen.getByRole('button', { name: '再試行' })).toBeDisabled();
  });

  it('ログイン情報の401ではキャッシュ済み一覧と再試行を隠す', () => {
    mocks.sessionQuery.error = { data: { httpStatus: 401 } };

    render(<TaskPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('ログインの有効期限が切れました');
    expect(screen.queryByText('削除対象')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '再試行' })).not.toBeInTheDocument();
  });

  it('担当者候補の403ではキャッシュ済み一覧と再試行を隠す', () => {
    mocks.usersQuery.data = [{ id: 'user-2', name: '担当者A', email: 'a@example.com' }];
    mocks.usersQuery.error = { data: { httpStatus: 403 } };

    render(<TaskPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('表示する権限がありません');
    expect(screen.queryByText('削除対象')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '再試行' })).not.toBeInTheDocument();
  });

  it('初回のタスク取得500を空一覧にせず、再試行できる', () => {
    mocks.taskQuery.data = undefined;
    mocks.taskQuery.error = { data: { httpStatus: 500 } };

    render(<TaskPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('タスクを取得できませんでした');
    expect(screen.queryByText('タスクが見つかりません。')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.retryTasks).toHaveBeenCalledOnce();
    expect(mocks.retryProjects).not.toHaveBeenCalled();
  });

  it('キャッシュ済みタスクを500後も残し、古い可能性と再試行を示す', () => {
    mocks.taskQuery.error = { data: { httpStatus: 500 } };

    render(<TaskPage />);

    expect(screen.getByText('削除対象')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      '最新のタスクを取得できませんでした。前回取得時の内容です。',
    );
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.retryTasks).toHaveBeenCalledOnce();
  });

  it('初回のプロジェクト取得500で選択肢や権限を空扱いにしない', () => {
    mocks.projectQuery.data = undefined;
    mocks.projectQuery.error = { data: { httpStatus: 500 } };

    render(<TaskPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('プロジェクトを取得できませんでした');
    expect(screen.queryByText('削除対象')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.retryProjects).toHaveBeenCalledOnce();
    expect(mocks.retryTasks).not.toHaveBeenCalled();
  });

  it('キャッシュ済みプロジェクトを500後も権限判定に使い、古い可能性を示す', () => {
    mocks.projectQuery.error = { data: { httpStatus: 500 } };

    render(<TaskPage />);

    expect(screen.getByText('削除対象')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新規タスク' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      '最新のプロジェクトを取得できませんでした。前回取得時の内容です。',
    );
  });

  it('失敗した必須queryの再取得中は再試行を無効にする', () => {
    mocks.taskQuery.data = undefined;
    mocks.taskQuery.error = { data: { httpStatus: 500 } };
    mocks.taskQuery.isFetching = true;

    render(<TaskPage />);

    expect(screen.getByRole('button', { name: '再試行' })).toBeDisabled();
  });

  it('再試行後に取得できたタスク一覧へ復帰する', () => {
    mocks.taskQuery.data = undefined;
    mocks.taskQuery.error = { data: { httpStatus: 500 } };
    const view = render(<TaskPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('タスクを取得できませんでした');

    mocks.taskQuery.data = [
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
    ];
    mocks.taskQuery.error = null;
    view.rerender(<TaskPage />);

    expect(screen.getByText('削除対象')).toBeInTheDocument();
    expect(screen.queryByText('タスクを取得できませんでした。')).not.toBeInTheDocument();
  });

  it('403ではキャッシュ済みの保護データと再試行を表示しない', () => {
    mocks.taskQuery.error = { data: { httpStatus: 403 } };

    render(<TaskPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('表示する権限がありません');
    expect(screen.queryByText('削除対象')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '再試行' })).not.toBeInTheDocument();
  });

  it('401ではキャッシュ済みの保護データを隠してログインを案内する', () => {
    mocks.taskQuery.error = { data: { httpStatus: 401 } };

    render(<TaskPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('ログインの有効期限が切れました');
    expect(screen.queryByText('削除対象')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '再試行' })).not.toBeInTheDocument();
  });
});

describe('タスク削除の失敗表示', () => {
  it('削除要求と確定済みエラーを利用者へ伝える', async () => {
    render(<TaskPage />);

    fireEvent.click(screen.getByRole('button', { name: 'タスクを削除' }));
    fireEvent.click(screen.getByRole('button', { name: '削除を確定' }));
    expect(mocks.deleteTask).toHaveBeenCalledWith({ id: 'task-1' });

    await act(async () => {
      await mocks.deleteOptions?.onError?.(
        {
          data: { httpStatus: 403 },
          message: 'PRIVATE_BACKEND_MESSAGE',
        },
        { id: 'task-1' },
      );
    });
    expect(mocks.toastError).not.toHaveBeenCalledWith('PRIVATE_BACKEND_MESSAGE');
    expect(mocks.toastError).toHaveBeenCalledWith(
      'タスクの削除を実行できません。権限と対象の最新の状態を確認してください。',
    );
  });

  it('結果不明の通信失敗では一覧を再取得する', async () => {
    render(<TaskPage />);

    fireEvent.click(screen.getByRole('button', { name: 'タスクを削除' }));
    fireEvent.click(screen.getByRole('button', { name: '削除を確定' }));
    await act(async () => {
      await mocks.deleteOptions?.onError?.({ message: 'network error' }, { id: 'task-1' });
    });

    expect(mocks.toastError).toHaveBeenCalledWith(
      'タスクの削除の結果を確認できません。最新の表示で操作結果を確認してから、必要な場合だけ再実行してください。',
    );
    expect(mocks.invalidateTasks).toHaveBeenCalledOnce();
  });
});
