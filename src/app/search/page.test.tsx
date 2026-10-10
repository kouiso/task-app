// @vitest-environment jsdom

import {
  QueryClient,
  QueryClientProvider,
  type UseMutationOptions,
  useMutation,
} from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SearchPage from './page';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
  searchQuery: vi.fn(),
  refetch: vi.fn(),
  sessionQuery: vi.fn(),
  projectOptionsQuery: vi.fn(),
  memberProjectsQuery: vi.fn(),
  assigneeOptionsQuery: vi.fn(),
  refetchSession: vi.fn(),
  refetchProjectOptions: vi.fn(),
  refetchMemberProjects: vi.fn(),
  refetchAssigneeOptions: vi.fn(),
  deleteMutate: vi.fn<(variables: { id: string }) => Promise<unknown>>(),
  invalidateSearch: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  latestDialogConfirm: undefined as (() => void) | undefined,
  latestTaskEdit: undefined as (() => void) | undefined,
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
    title,
    id,
    canEdit,
    canDelete,
    onEdit,
    onDelete,
  }: {
    title: string;
    id: string;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }) => {
    mocks.latestTaskEdit = () => onEdit(id);
    return (
      <div>
        <p>{title}</p>
        {canEdit ? (
          <button type="button" onClick={() => onEdit(id)}>
            編集
          </button>
        ) : null}
        {canDelete ? (
          <button type="button" onClick={() => onDelete(id)}>
            削除
          </button>
        ) : null}
      </div>
    );
  },
}));
vi.mock('@/component/ui/delete-confirm-dialog', () => ({
  DeleteConfirmDialog: ({
    open,
    onOpenChange,
    onConfirm,
    isPending,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isPending: boolean;
  }) => {
    mocks.latestDialogConfirm = onConfirm;
    return open ? (
      <div role="dialog">
        <button type="button" onClick={() => onOpenChange(false)}>
          キャンセル
        </button>
        <button type="button" disabled={isPending} onClick={onConfirm}>
          削除を確定
        </button>
      </div>
    ) : null;
  },
}));
vi.mock('@/component/ui/loading-spinner', () => ({
  PageLoadingSpinner: () => <p>読み込み中</p>,
}));
vi.mock('react-hot-toast', () => ({
  default: { error: mocks.toastError, success: mocks.toastSuccess },
}));
vi.mock('@/trpc/react', () => ({
  api: {
    useUtils: () => ({ search: { search: { invalidate: mocks.invalidateSearch } } }),
    auth: { getSession: { useQuery: mocks.sessionQuery } },
    search: {
      getUserProjects: { useQuery: mocks.projectOptionsQuery },
      getProjectMembers: { useQuery: mocks.assigneeOptionsQuery },
      search: { useQuery: mocks.searchQuery },
    },
    project: { getAll: { useQuery: mocks.memberProjectsQuery } },
    task: {
      delete: {
        useMutation: (options: UseMutationOptions<unknown, unknown, { id: string }>) =>
          useMutation({ ...options, mutationFn: mocks.deleteMutate }),
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

const cachedTaskResults = {
  totalCount: 1,
  projects: [],
  tasks: [
    {
      id: 'task-1',
      title: '権限付きタスク',
      description: null,
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      dueDate: null,
      assignee: null,
      projectId: 'clh12345678901234567890123',
    },
  ],
};

let client: QueryClient;
function pageElement() {
  return (
    <QueryClientProvider client={client}>
      <SearchPage />
    </QueryClientProvider>
  );
}

function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const session = { user: { id: 'user-1' } };
const memberProjects = [
  {
    id: 'clh12345678901234567890123',
    members: [{ userId: 'user-1', role: 'OWNER' as const }],
  },
];
const projectOptions = [{ id: 'clh12345678901234567890123', name: '既存プロジェクト' }];
const assigneeOptions = [
  { id: 'clh98765432109876543210987', name: '担当者', email: 'member@example.com' },
];

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

function supportQueryResult<T>(
  data: T | undefined,
  refetch: ReturnType<typeof vi.fn>,
  status?: number,
  isFetching = false,
  failureStatus?: number,
) {
  return {
    data,
    isLoading: false,
    isError: status !== undefined,
    isFetching,
    error: status === undefined ? null : { data: { httpStatus: status } },
    failureReason: failureStatus === undefined ? null : { data: { httpStatus: failureStatus } },
    refetch,
  };
}

beforeEach(() => {
  mocks.searchParams = new URLSearchParams('keyword=api');
  mocks.push.mockReset();
  mocks.replace.mockReset();
  mocks.refetch.mockReset();
  mocks.refetchSession.mockReset();
  mocks.refetchProjectOptions.mockReset();
  mocks.refetchMemberProjects.mockReset();
  mocks.refetchAssigneeOptions.mockReset();
  mocks.deleteMutate.mockReset().mockResolvedValue({});
  mocks.invalidateSearch.mockReset().mockResolvedValue(undefined);
  mocks.toastError.mockReset();
  mocks.toastSuccess.mockReset();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  mocks.latestDialogConfirm = undefined;
  mocks.latestTaskEdit = undefined;
  mocks.sessionQuery.mockReset().mockReturnValue(supportQueryResult(session, mocks.refetchSession));
  mocks.projectOptionsQuery
    .mockReset()
    .mockReturnValue(supportQueryResult(projectOptions, mocks.refetchProjectOptions));
  mocks.memberProjectsQuery
    .mockReset()
    .mockReturnValue(supportQueryResult(memberProjects, mocks.refetchMemberProjects));
  mocks.assigneeOptionsQuery
    .mockReset()
    .mockReturnValue(supportQueryResult(assigneeOptions, mocks.refetchAssigneeOptions));
  mocks.searchQuery.mockReset().mockReturnValue(queryResult());
});

afterEach(() => {
  client.clear();
});

describe('検索条件と取得エラー', () => {
  it('プロジェクトの検索結果へTabで移動でき、詳細のリンク先を持つ', async () => {
    const user = userEvent.setup();
    render(pageElement());

    const projectLink = screen.getByRole('link', { name: /秘密プロジェクト/ });
    expect(projectLink).toHaveAttribute(
      'href',
      `/project?projectId=${cachedResults.projects[0]?.id}`,
    );
    for (let step = 0; step < 30 && document.activeElement !== projectLink; step += 1) {
      await user.tab();
    }
    expect(projectLink).toHaveFocus();
  });

  it('不正なprojectIdとassignedToをAPIへ送らずURLから除く', async () => {
    mocks.searchParams = new URLSearchParams('projectId=abc&assignedTo=user-1');
    render(pageElement());

    const searchCall = mocks.searchQuery.mock.calls[0];
    if (!searchCall) throw new Error('SEARCH_QUERY_NOT_CALLED');
    const [input, options] = searchCall;
    expect(input.projectId).toBeUndefined();
    expect(input.assignedTo).toBeUndefined();
    expect(options.enabled).toBe(false);
    expect(screen.getByText('検索条件を入力して検索してください')).toBeInTheDocument();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/search', { scroll: false }));
  });

  it('初回500を未入力案内にせず再試行できる', () => {
    mocks.searchQuery.mockReturnValue(queryResult(500, null));
    render(pageElement());

    expect(screen.getByText('検索に失敗しました')).toBeInTheDocument();
    expect(screen.queryByText('検索条件を入力して検索してください')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it('再取得500ではキャッシュ済み結果と警告を表示する', () => {
    mocks.searchQuery.mockReturnValue(queryResult(500));
    render(pageElement());

    expect(screen.getByText('秘密プロジェクト')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      '取得できませんでした。前回の検索結果です。',
    );
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it.each([
    [401, 'ログインの有効期限が切れました', 'ログイン画面へ', '/login'],
    [403, 'この検索結果を見る権限がありません', '検索条件をクリア', '/search'],
  ] as const)('%sではキャッシュ済み結果を隠して再試行しない', (status, message, button, route) => {
    mocks.searchQuery.mockReturnValue(queryResult(status));
    render(pageElement());

    expect(screen.queryByText('秘密プロジェクト')).not.toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(mocks.push).toHaveBeenCalledWith(route);
    expect(mocks.refetch).not.toHaveBeenCalled();
    const searchCall = mocks.searchQuery.mock.calls[0];
    if (!searchCall) throw new Error('SEARCH_QUERY_NOT_CALLED');
    expect(searchCall[1].retry(0, { data: { httpStatus: status } })).toBe(false);
  });
});

describe('検索を支えるデータの取得エラー', () => {
  const supportCases = [
    {
      name: 'プロジェクト選択肢',
      query: mocks.projectOptionsQuery,
      refetch: mocks.refetchProjectOptions,
      cachedData: projectOptions,
      message: 'プロジェクトの選択肢を取得できませんでした',
    },
    {
      name: '担当者選択肢',
      query: mocks.assigneeOptionsQuery,
      refetch: mocks.refetchAssigneeOptions,
      cachedData: assigneeOptions,
      message: '担当者の選択肢を取得できませんでした',
    },
    {
      name: 'ログインユーザー',
      query: mocks.sessionQuery,
      refetch: mocks.refetchSession,
      cachedData: session,
      message: '操作権限を確認できませんでした',
    },
    {
      name: 'プロジェクト権限',
      query: mocks.memberProjectsQuery,
      refetch: mocks.refetchMemberProjects,
      cachedData: memberProjects,
      message: '操作権限を確認できませんでした',
    },
  ] as const;

  it.each(supportCases)('$nameの初回500を空データに見せず、対象だけ再試行する', (testCase) => {
    testCase.query.mockReturnValue(supportQueryResult(undefined, testCase.refetch, 500));
    render(pageElement());

    const alert = screen.getByRole('alert', { name: testCase.message });
    expect(alert).toBeInTheDocument();
    if (testCase.name === 'プロジェクト選択肢') {
      expect(screen.getByRole('combobox', { name: 'プロジェクト' })).toBeDisabled();
    }
    if (testCase.name === '担当者選択肢') {
      expect(screen.getByRole('combobox', { name: '担当者' })).toBeDisabled();
    }
    fireEvent.click(screen.getByRole('button', { name: `${testCase.name}を再試行` }));
    expect(testCase.refetch).toHaveBeenCalledOnce();
    for (const other of supportCases.filter((candidate) => candidate.name !== testCase.name)) {
      expect(other.refetch).not.toHaveBeenCalled();
    }
  });

  it.each(supportCases)('$nameの再取得500ではキャッシュと古い旨の警告を残す', (testCase) => {
    if (testCase.name === 'プロジェクト選択肢') {
      mocks.searchParams = new URLSearchParams('keyword=api&projectId=clh12345678901234567890123');
    }
    if (testCase.name === '担当者選択肢') {
      mocks.searchParams = new URLSearchParams('keyword=api&assignedTo=clh98765432109876543210987');
    }
    testCase.query.mockReturnValue(supportQueryResult(testCase.cachedData, testCase.refetch, 500));
    mocks.searchQuery.mockReturnValue({ ...queryResult(), data: cachedTaskResults });
    render(pageElement());

    expect(screen.getByRole('alert', { name: testCase.message })).toHaveTextContent(
      '前回取得時の内容',
    );
    if (testCase.name === 'プロジェクト選択肢') {
      expect(screen.getByRole('combobox', { name: 'プロジェクト' })).toHaveTextContent(
        '既存プロジェクト',
      );
    }
    if (testCase.name === '担当者選択肢') {
      expect(screen.getByRole('combobox', { name: '担当者' })).toHaveTextContent('担当者');
    }
    if (testCase.name === 'ログインユーザー' || testCase.name === 'プロジェクト権限') {
      expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
    }
  });

  it('再試行中は連打を防ぎ、復旧後に警告を消す', () => {
    mocks.projectOptionsQuery.mockReturnValue(
      supportQueryResult(projectOptions, mocks.refetchProjectOptions, 500, true),
    );
    const { rerender } = render(pageElement());

    expect(screen.getByRole('button', { name: 'プロジェクト選択肢を再試行' })).toBeDisabled();

    mocks.projectOptionsQuery.mockReturnValue(
      supportQueryResult(projectOptions, mocks.refetchProjectOptions),
    );
    rerender(pageElement());
    expect(
      screen.queryByRole('alert', { name: 'プロジェクトの選択肢を取得できませんでした' }),
    ).not.toBeInTheDocument();
  });

  it('401ではキャッシュ済み検索結果を隠し、支援クエリを再試行しない', () => {
    const status = 401;
    mocks.sessionQuery.mockReturnValue(supportQueryResult(session, mocks.refetchSession, status));
    render(pageElement());

    expect(screen.queryByText('秘密プロジェクト')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'プロジェクト' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: '担当者' })).toBeDisabled();
    expect(screen.getByText('ログインの有効期限が切れました')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'ログインユーザーを再試行' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ログイン画面へ' }));
    expect(mocks.push).toHaveBeenCalledWith('/login');
    expect(mocks.refetchSession).not.toHaveBeenCalled();
    expect(mocks.sessionQuery.mock.calls[0]?.[1].retry(0, { data: { httpStatus: 401 } })).toBe(
      false,
    );
  });

  it('403では検索結果を残して操作権限だけを隠し、再試行しない', () => {
    mocks.sessionQuery.mockReturnValue(supportQueryResult(session, mocks.refetchSession, 403));
    mocks.searchQuery.mockReturnValue({ ...queryResult(), data: cachedTaskResults });
    render(pageElement());

    expect(screen.getByText('権限付きタスク')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'プロジェクト' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: '担当者' })).toBeDisabled();
    expect(screen.getByText('検索条件に必要な情報を見る権限がありません')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'ログインユーザーを再試行' }),
    ).not.toBeInTheDocument();
    expect(mocks.refetchSession).not.toHaveBeenCalled();
    expect(mocks.sessionQuery.mock.calls[0]?.[1].retry(0, { data: { httpStatus: 403 } })).toBe(
      false,
    );
  });

  it('401の再試行中もfailureReasonからキャッシュ済み検索結果を隠す', () => {
    mocks.sessionQuery.mockReturnValue(
      supportQueryResult(session, mocks.refetchSession, undefined, true, 401),
    );
    render(pageElement());

    expect(screen.queryByText('秘密プロジェクト')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'プロジェクト' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: '担当者' })).toBeDisabled();
    expect(screen.getByText('ログインの有効期限が切れました')).toBeInTheDocument();
  });

  it('未ログインではキャッシュ済み検索結果を隠してログインへ進める', () => {
    mocks.sessionQuery.mockReturnValue(supportQueryResult(null, mocks.refetchSession));
    render(pageElement());

    expect(screen.queryByText('秘密プロジェクト')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'プロジェクト' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: '担当者' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'ログイン画面へ' }));
    expect(mocks.push).toHaveBeenCalledWith('/login');
  });
});

describe('削除確認中の権限更新', () => {
  const openDeleteDialog = () => {
    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    expect(screen.getByRole('button', { name: '削除を確定' })).toBeInTheDocument();
    const staleConfirm = mocks.latestDialogConfirm;
    if (!staleConfirm) throw new Error('DELETE_CONFIRM_NOT_CAPTURED');
    return staleConfirm;
  };

  it.each([
    [
      'ログインユーザー500',
      () =>
        mocks.sessionQuery.mockReturnValue(supportQueryResult(session, mocks.refetchSession, 500)),
    ],
    [
      'プロジェクト権限500',
      () =>
        mocks.memberProjectsQuery.mockReturnValue(
          supportQueryResult(memberProjects, mocks.refetchMemberProjects, 500),
        ),
    ],
    [
      'ログインユーザー401',
      () =>
        mocks.sessionQuery.mockReturnValue(supportQueryResult(session, mocks.refetchSession, 401)),
    ],
    [
      'ログインユーザー403',
      () =>
        mocks.sessionQuery.mockReturnValue(supportQueryResult(session, mocks.refetchSession, 403)),
    ],
    [
      '未ログイン',
      () => mocks.sessionQuery.mockReturnValue(supportQueryResult(null, mocks.refetchSession)),
    ],
    [
      '検索結果401',
      () => mocks.searchQuery.mockReturnValue({ ...queryResult(401), data: cachedTaskResults }),
    ],
    [
      '検索結果403',
      () => mocks.searchQuery.mockReturnValue({ ...queryResult(403), data: cachedTaskResults }),
    ],
  ] as const)('%sへの遷移で確認を閉じ、保持済み確認からも削除しない', async (_name, failQuery) => {
    mocks.searchQuery.mockReturnValue({ ...queryResult(), data: cachedTaskResults });
    const { rerender } = render(pageElement());
    const staleConfirm = openDeleteDialog();

    failQuery();
    rerender(pageElement());

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '削除を確定' })).not.toBeInTheDocument(),
    );
    act(() => staleConfirm());
    expect(mocks.deleteMutate).not.toHaveBeenCalled();
  });

  it('OWNERからVIEWERへの更新で確認を閉じ、編集と削除を止める', async () => {
    mocks.searchQuery.mockReturnValue({ ...queryResult(), data: cachedTaskResults });
    const { rerender } = render(pageElement());
    const staleEdit = mocks.latestTaskEdit;
    if (!staleEdit) throw new Error('TASK_EDIT_NOT_CAPTURED');
    const staleConfirm = openDeleteDialog();

    mocks.memberProjectsQuery.mockReturnValue(
      supportQueryResult(
        [{ ...memberProjects[0], members: [{ userId: 'user-1', role: 'VIEWER' as const }] }],
        mocks.refetchMemberProjects,
      ),
    );
    rerender(pageElement());

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '削除を確定' })).not.toBeInTheDocument(),
    );
    act(() => staleConfirm());
    act(() => staleEdit());
    expect(mocks.deleteMutate).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalledWith('/task?taskId=task-1&edit=true');
    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
  });

  it('選択肢だけの500では許可済み削除を1回送信し、送信中は開き直さない', async () => {
    const pending = deferred();
    mocks.deleteMutate.mockReturnValue(pending.promise);
    mocks.projectOptionsQuery.mockReturnValue(
      supportQueryResult(projectOptions, mocks.refetchProjectOptions, 500),
    );
    mocks.searchQuery.mockReturnValue({ ...queryResult(), data: cachedTaskResults });
    render(pageElement());
    openDeleteDialog();

    fireEvent.click(screen.getByRole('button', { name: '削除を確定' }));
    await waitFor(() => expect(mocks.deleteMutate).toHaveBeenCalledOnce());
    expect(mocks.deleteMutate.mock.calls[0]?.[0]).toEqual({ id: 'task-1' });

    // 送信中は確認が開いたまま確定ボタンが無効になり、開き直しも再送信も起きない
    expect(screen.getByRole('button', { name: '削除を確定' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    expect(mocks.deleteMutate).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve({}));
  });
});

describe('削除結果に応じた確認ダイアログ', () => {
  const confirmTaskDelete = () => {
    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(screen.getByRole('button', { name: '削除を確定' }));
  };
  const renderWithTask = () => {
    mocks.searchQuery.mockReturnValue({ ...queryResult(), data: cachedTaskResults });
    render(pageElement());
  };

  it('確定後は結果が返るまで確認を開いたままにし、成功時だけ閉じる', async () => {
    const pending = deferred();
    mocks.deleteMutate.mockReturnValue(pending.promise);
    renderWithTask();

    confirmTaskDelete();
    await waitFor(() => expect(mocks.deleteMutate).toHaveBeenCalledOnce());
    expect(mocks.deleteMutate.mock.calls[0]?.[0]).toEqual({ id: 'task-1' });
    expect(screen.getByRole('button', { name: '削除を確定' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除を確定' })).toBeDisabled();

    await act(async () => pending.resolve({}));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '削除を確定' })).not.toBeInTheDocument(),
    );
    expect(mocks.invalidateSearch).toHaveBeenCalled();
  });

  it('失敗が分かった時は確認を開いたまま分類済みメッセージを出す', async () => {
    const pending = deferred();
    mocks.deleteMutate.mockReturnValue(pending.promise);
    renderWithTask();

    confirmTaskDelete();
    await act(async () => pending.reject({ data: { httpStatus: 403 }, message: 'forbidden' }));

    expect(screen.getByRole('button', { name: '削除を確定' })).toBeInTheDocument();
    expect(mocks.toastError).toHaveBeenCalledWith(
      'タスクの削除を実行できません。権限と対象の最新の状態を確認してください。',
    );
    expect(mocks.invalidateSearch).toHaveBeenCalled();
  });

  it('401ではログイン期限切れを表示し、以後の削除操作を止める', async () => {
    const pending = deferred();
    mocks.deleteMutate.mockReturnValue(pending.promise);
    renderWithTask();

    confirmTaskDelete();
    await act(async () => pending.reject({ data: { httpStatus: 401 }, message: 'unauthorized' }));

    await waitFor(() =>
      expect(screen.getByText('ログインの有効期限が切れました')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: '削除を確定' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ログイン画面へ' }));
    expect(mocks.push).toHaveBeenCalledWith('/login');
    expect(mocks.deleteMutate).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateSearch).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it('401の直後は再描画前の編集ハンドラーも同期的に止める', async () => {
    const pending = deferred();
    mocks.deleteMutate.mockReturnValue(pending.promise);
    renderWithTask();
    const retainedEdit = mocks.latestTaskEdit;
    if (!retainedEdit) throw new Error('編集ハンドラーを取得できませんでした');
    confirmTaskDelete();
    await waitFor(() => expect(mocks.deleteMutate).toHaveBeenCalledOnce());
    const onError = client.getMutationCache().getAll()[0]?.options.onError;
    if (!onError) throw new Error('削除のエラーハンドラーを取得できませんでした');
    const error = { data: { httpStatus: 401 }, message: 'unauthorized' };
    act(() => {
      void onError(error, { id: 'task-1' }, undefined, {
        client,
        mutationKey: undefined,
        meta: undefined,
      });
      retainedEdit();
    });
    expect(mocks.push).not.toHaveBeenCalledWith('/task?taskId=task-1&edit=true');
    await act(async () => pending.reject(error));
  });

  it('結果が不明なネットワークエラーでは失敗と断言せず検索を再取得する', async () => {
    const pending = deferred();
    mocks.deleteMutate.mockReturnValue(pending.promise);
    renderWithTask();

    confirmTaskDelete();
    await act(async () => pending.reject({ message: 'Network request failed' }));

    expect(screen.getByRole('button', { name: '削除を確定' })).toBeInTheDocument();
    expect(mocks.toastError).toHaveBeenCalledWith(
      'タスクの削除の結果を確認できません。最新の表示で操作結果を確認してから、必要な場合だけ再実行してください。',
    );
    expect(mocks.invalidateSearch).toHaveBeenCalled();
  });

  it('送信中にキャンセルした確認を、後から届いた成功応答で再び閉じない', async () => {
    const pending = deferred();
    mocks.deleteMutate.mockReturnValue(pending.promise);
    renderWithTask();

    confirmTaskDelete();
    await waitFor(() => expect(mocks.deleteMutate).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(screen.queryByRole('button', { name: '削除を確定' })).not.toBeInTheDocument();

    await act(async () => pending.resolve({}));
    expect(screen.queryByRole('button', { name: '削除を確定' })).not.toBeInTheDocument();
    expect(mocks.invalidateSearch).toHaveBeenCalled();
  });
});

describe('キーワード入力', () => {
  it('IME変換確定のEnterを無視し、通常のEnterではすぐURLを更新する', async () => {
    mocks.searchParams = new URLSearchParams();
    render(pageElement());
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
