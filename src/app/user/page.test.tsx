// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UsersPage from './page';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  currentUserQuery: vi.fn(),
  usersQuery: vi.fn(),
  refetchCurrentUser: vi.fn(),
  refetchUsers: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/component/ui/loading-spinner', () => ({
  PageLoadingSpinner: () => <p>読み込み中</p>,
}));

vi.mock('@/trpc/react', () => ({
  api: {
    auth: { getCurrentUser: { useQuery: mocks.currentUserQuery } },
    user: { getAll: { useQuery: mocks.usersQuery } },
  },
}));

const admin = { id: 'admin-1', role: 'ADMIN' };
const users = [
  {
    id: 'user-1',
    name: '保存済みユーザー',
    email: 'saved@example.com',
    role: 'USER',
    isActive: true,
    avatar: null,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
  },
];

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
  mocks.push.mockReset();
  mocks.refetchCurrentUser.mockReset();
  mocks.refetchUsers.mockReset();
  mocks.currentUserQuery
    .mockReset()
    .mockReturnValue(queryResult(admin, undefined, mocks.refetchCurrentUser));
  mocks.usersQuery.mockReset().mockReturnValue(queryResult(users, undefined, mocks.refetchUsers));
});

describe('ユーザー一覧の取得状態', () => {
  it('利用者情報の初回500を権限不足として表示しない', () => {
    mocks.currentUserQuery.mockReturnValue(queryResult(undefined, 500, mocks.refetchCurrentUser));

    render(<UsersPage />);

    expect(screen.getByText('ユーザー一覧を取得できませんでした')).toBeInTheDocument();
    expect(screen.queryByText('アクセス権限がありません')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));
    expect(mocks.refetchCurrentUser).toHaveBeenCalledOnce();
  });

  it('一覧の初回500を0件の成功として表示しない', () => {
    mocks.usersQuery.mockReturnValue(queryResult(undefined, 500, mocks.refetchUsers));

    render(<UsersPage />);

    expect(screen.getByText('ユーザー一覧を取得できませんでした')).toBeInTheDocument();
    expect(screen.queryByText('ユーザーが見つかりませんでした')).not.toBeInTheDocument();
  });

  it('再取得500では前回の一覧と警告を表示して再試行できる', () => {
    mocks.usersQuery.mockReturnValue(queryResult(users, 500, mocks.refetchUsers));

    render(<UsersPage />);

    expect(screen.getByText('保存済みユーザー')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('前回取得時の内容です');
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.refetchCurrentUser).toHaveBeenCalledOnce();
    expect(mocks.refetchUsers).toHaveBeenCalledOnce();
  });

  it.each([
    [401, 'ログインの有効期限が切れました', 'ログイン画面へ', '/login'],
    [403, 'アクセス権限がありません', null, null],
  ] as const)('%sではキャッシュ済み一覧を隠して再試行しない', (status, message, button, route) => {
    mocks.usersQuery.mockReturnValue(queryResult(users, status, mocks.refetchUsers));

    render(<UsersPage />);

    expect(screen.queryByText('保存済みユーザー')).not.toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(mocks.usersQuery.mock.calls[0][1].retry(0, { data: { httpStatus: status } })).toBe(
      false,
    );

    if (button && route) {
      fireEvent.click(screen.getByRole('button', { name: button }));
      expect(mocks.push).toHaveBeenCalledWith(route);
    }
    expect(mocks.refetchUsers).not.toHaveBeenCalled();
  });

  it('利用者情報の401ではキャッシュ済み一覧を隠す', () => {
    mocks.currentUserQuery.mockReturnValue(queryResult(admin, 401, mocks.refetchCurrentUser));

    render(<UsersPage />);

    expect(screen.queryByText('保存済みユーザー')).not.toBeInTheDocument();
    expect(screen.getByText('ログインの有効期限が切れました')).toBeInTheDocument();
    expect(mocks.currentUserQuery.mock.calls[0][1].retry(0, { data: { httpStatus: 401 } })).toBe(
      false,
    );
  });

  it('一般ユーザー情報を伴う再取得500では管理画面を表示しない', () => {
    mocks.currentUserQuery.mockReturnValue(
      queryResult({ id: 'user-1', role: 'USER' }, 500, mocks.refetchCurrentUser),
    );

    render(<UsersPage />);

    expect(screen.getByText('アクセス権限がありません')).toBeInTheDocument();
    expect(screen.queryByText('保存済みユーザー')).not.toBeInTheDocument();
  });
});
