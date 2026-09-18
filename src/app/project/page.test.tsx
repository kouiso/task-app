// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectPage from './page';

const mocks = vi.hoisted(() => ({
  search: '',
  push: vi.fn(),
  currentUserQuery: vi.fn(),
  projectsQuery: vi.fn(),
  detailQuery: vi.fn(),
  availableUsersQuery: vi.fn(),
  refetchCurrentUser: vi.fn(),
  refetchProjects: vi.fn(),
  refetchDetail: vi.fn(),
  getAllInvalidate: vi.fn(),
  getByIdInvalidate: vi.fn(),
  addMemberOnSuccess: undefined as undefined | (() => void),
  removeMemberOnSuccess: undefined as undefined | (() => void),
  mutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/component/ui/loading-spinner', () => ({
  PageLoadingSpinner: () => <p>読み込み中</p>,
}));
vi.mock('@/component/project/project-detail-view', () => ({
  ProjectDetailView: ({ projectDetail }: { projectDetail?: { name: string } }) => (
    <p>{projectDetail ? `詳細:${projectDetail.name}` : '詳細:データなし'}</p>
  ),
}));
vi.mock('@/component/project/project-card', () => ({
  ProjectCard: ({ name }: { name: string }) => <p>{`カード:${name}`}</p>,
}));
vi.mock('@/component/project/project-dialog', () => ({ ProjectDialog: () => null }));
vi.mock('@/component/ui/delete-confirm-dialog', () => ({ DeleteConfirmDialog: () => null }));

vi.mock('@/trpc/react', () => ({
  api: {
    useUtils: () => ({
      project: {
        getAll: { invalidate: mocks.getAllInvalidate },
        getById: { invalidate: mocks.getByIdInvalidate },
      },
    }),
    auth: { getCurrentUser: { useQuery: mocks.currentUserQuery } },
    project: {
      getAll: { useQuery: mocks.projectsQuery },
      getById: { useQuery: mocks.detailQuery },
      getAvailableUsers: { useQuery: mocks.availableUsersQuery },
      create: { useMutation: mocks.mutation },
      update: { useMutation: mocks.mutation },
      delete: { useMutation: mocks.mutation },
      addMember: {
        useMutation: (options: { onSuccess: () => void }) => {
          mocks.addMemberOnSuccess = options.onSuccess;
          return mocks.mutation();
        },
      },
      removeMember: {
        useMutation: (options: { onSuccess: () => void }) => {
          mocks.removeMemberOnSuccess = options.onSuccess;
          return mocks.mutation();
        },
      },
      updateMemberRole: { useMutation: mocks.mutation },
      archive: { useMutation: mocks.mutation },
      unarchive: { useMutation: mocks.mutation },
    },
  },
}));

const currentUser = { id: 'user-1' };
const project = {
  id: 'project-1',
  name: '保存済みプロジェクト',
  description: null,
  color: '#1976D2',
  isArchived: false,
  startDate: null,
  endDate: null,
  members: [{ id: 'member-1', userId: 'user-1', role: 'OWNER', user: currentUser }],
  tasks: [],
};

function queryResult<T>(data: T, status?: number, refetch = vi.fn()) {
  return {
    data,
    isLoading: false,
    isError: status !== undefined,
    isFetching: false,
    error: status === undefined ? null : { data: { httpStatus: status } },
    refetch,
  };
}

beforeEach(() => {
  mocks.search = '';
  mocks.push.mockReset();
  mocks.refetchCurrentUser.mockReset();
  mocks.refetchProjects.mockReset();
  mocks.refetchDetail.mockReset();
  mocks.getAllInvalidate.mockReset();
  mocks.getByIdInvalidate.mockReset();
  mocks.addMemberOnSuccess = undefined;
  mocks.removeMemberOnSuccess = undefined;
  mocks.currentUserQuery
    .mockReset()
    .mockReturnValue(queryResult(currentUser, undefined, mocks.refetchCurrentUser));
  mocks.projectsQuery
    .mockReset()
    .mockReturnValue(queryResult([project], undefined, mocks.refetchProjects));
  mocks.detailQuery
    .mockReset()
    .mockReturnValue(queryResult(project, undefined, mocks.refetchDetail));
  mocks.availableUsersQuery.mockReset().mockReturnValue(queryResult([]));
  mocks.mutation.mockClear();
});

describe('プロジェクト詳細の取得状態', () => {
  it.each([
    ['追加', () => mocks.addMemberOnSuccess],
    ['削除', () => mocks.removeMemberOnSuccess],
  ] as const)('メンバー%s成功時は詳細と一覧の人数を再取得する', (_operation, callbackOf) => {
    mocks.search = 'projectId=project-1';

    render(<ProjectPage />);
    callbackOf()?.();

    expect(callbackOf()).toBeTypeOf('function');
    expect(mocks.getAllInvalidate).toHaveBeenCalledOnce();
    expect(mocks.getByIdInvalidate).toHaveBeenCalledWith({ id: 'project-1' });
  });

  it('詳細の初回取得中は「見つかりません」ではなくローディングを表示する', () => {
    mocks.search = 'projectId=project-1';
    mocks.detailQuery.mockReturnValue({
      ...queryResult(undefined, undefined, mocks.refetchDetail),
      isLoading: true,
      isFetching: true,
    });

    render(<ProjectPage />);

    expect(screen.getByText('読み込み中')).toBeInTheDocument();
    expect(screen.queryByText('詳細:データなし')).not.toBeInTheDocument();
    expect(screen.queryByText('プロジェクトが見つかりません')).not.toBeInTheDocument();
  });

  it('詳細の初回500をnot foundや空表示にしない', () => {
    mocks.search = 'projectId=project-1';
    mocks.detailQuery.mockReturnValue(queryResult(undefined, 500, mocks.refetchDetail));

    render(<ProjectPage />);

    expect(screen.getByText('プロジェクトを取得できませんでした')).toBeInTheDocument();
    expect(screen.queryByText(/詳細:/)).not.toBeInTheDocument();
    expect(screen.queryByText('プロジェクトが見つかりません')).not.toBeInTheDocument();
  });

  it('詳細の再取得500では前回データと警告を表示する', () => {
    mocks.search = 'projectId=project-1';
    mocks.detailQuery.mockReturnValue(queryResult(project, 500, mocks.refetchDetail));

    render(<ProjectPage />);

    expect(screen.getByText('詳細:保存済みプロジェクト')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('前回取得時の内容です');
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.refetchDetail).toHaveBeenCalledOnce();
  });

  it.each([
    [401, 'ログインの有効期限が切れました', 'ログイン画面へ', '/login'],
    [403, 'このプロジェクトを見る権限がありません', 'プロジェクト一覧へ', '/project'],
  ] as const)('%sではキャッシュ済み詳細を隠して再試行しない', (status, message, button, route) => {
    mocks.search = 'projectId=project-1';
    mocks.detailQuery.mockReturnValue(queryResult(project, status, mocks.refetchDetail));

    render(<ProjectPage />);

    expect(screen.queryByText('詳細:保存済みプロジェクト')).not.toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(mocks.push).toHaveBeenCalledWith(route);
    expect(mocks.refetchDetail).not.toHaveBeenCalled();

    const retry = mocks.detailQuery.mock.calls[0][1].retry;
    expect(retry(0, { data: { httpStatus: status } })).toBe(false);
  });

  it('利用者情報の401でもキャッシュ済み詳細を隠す', () => {
    mocks.search = 'projectId=project-1';
    mocks.currentUserQuery.mockReturnValue(queryResult(currentUser, 401, mocks.refetchCurrentUser));

    render(<ProjectPage />);

    expect(screen.queryByText('詳細:保存済みプロジェクト')).not.toBeInTheDocument();
    expect(screen.getByText('ログインの有効期限が切れました')).toBeInTheDocument();
    expect(mocks.currentUserQuery.mock.calls[0][1].retry(0, { data: { httpStatus: 401 } })).toBe(
      false,
    );
  });

  it('404ではキャッシュ済み詳細を隠して一覧へ戻す', () => {
    mocks.search = 'projectId=project-1';
    mocks.detailQuery.mockReturnValue(queryResult(project, 404, mocks.refetchDetail));

    render(<ProjectPage />);

    expect(screen.queryByText('詳細:保存済みプロジェクト')).not.toBeInTheDocument();
    expect(screen.getByText('プロジェクトが見つかりません')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'プロジェクト一覧へ' }));
    expect(mocks.push).toHaveBeenCalledWith('/project');
    expect(mocks.detailQuery.mock.calls[0][1].retry(0, { data: { httpStatus: 404 } })).toBe(false);
  });
});

describe('プロジェクト一覧の取得状態', () => {
  it('初回500を0件の成功として表示しない', () => {
    mocks.projectsQuery.mockReturnValue(queryResult(undefined, 500, mocks.refetchProjects));

    render(<ProjectPage />);

    expect(screen.getByText('プロジェクトを取得できませんでした')).toBeInTheDocument();
    expect(screen.queryByText('プロジェクトが見つかりません。')).not.toBeInTheDocument();
  });

  it('再取得500では前回データと警告を表示する', () => {
    mocks.projectsQuery.mockReturnValue(queryResult([project], 500, mocks.refetchProjects));

    render(<ProjectPage />);

    expect(screen.getByText('カード:保存済みプロジェクト')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('前回取得時の内容です');
  });

  it('401ではキャッシュ済み一覧を隠す', () => {
    mocks.projectsQuery.mockReturnValue(queryResult([project], 401, mocks.refetchProjects));

    render(<ProjectPage />);

    expect(screen.queryByText('カード:保存済みプロジェクト')).not.toBeInTheDocument();
    expect(screen.getByText('ログインの有効期限が切れました')).toBeInTheDocument();
    expect(mocks.projectsQuery.mock.calls[0][1].retry(0, { data: { httpStatus: 401 } })).toBe(
      false,
    );
  });
});
