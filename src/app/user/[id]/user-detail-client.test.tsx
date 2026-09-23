// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserDetailClient } from './user-detail-client';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  currentUserQuery: vi.fn(),
  userQuery: vi.fn(),
  refetchCurrentUser: vi.fn(),
  refetchUser: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/component/ui/loading-spinner', () => ({
  PageLoadingSpinner: () => <p>読み込み中</p>,
}));
vi.mock('@/trpc/react', () => ({
  api: {
    auth: { getCurrentUser: { useQuery: mocks.currentUserQuery } },
    user: { getById: { useQuery: mocks.userQuery } },
  },
}));

const currentUser = { id: 'admin-1', role: 'ADMIN' };
const user = {
  id: 'user-1',
  name: '保存済みユーザー',
  email: 'saved@example.com',
  avatar: null,
  role: 'USER',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  projects: [],
  assignedTasks: [],
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
  mocks.push.mockReset();
  mocks.refetchCurrentUser.mockReset();
  mocks.refetchUser.mockReset();
  mocks.currentUserQuery
    .mockReset()
    .mockReturnValue(queryResult(currentUser, undefined, mocks.refetchCurrentUser));
  mocks.userQuery.mockReset().mockReturnValue(queryResult(user, undefined, mocks.refetchUser));
});

describe('ユーザー詳細の取得状態', () => {
  it('初回500を永久ローディングにしない', () => {
    mocks.userQuery.mockReturnValue(queryResult(undefined, 500, mocks.refetchUser));
    render(<UserDetailClient userId="user-1" />);
    expect(screen.getByText('ユーザー情報を取得できませんでした')).toBeInTheDocument();
    expect(screen.queryByText('読み込み中')).not.toBeInTheDocument();
  });

  it('再取得500では前回データを残して再試行できる', () => {
    mocks.userQuery.mockReturnValue(queryResult(user, 500, mocks.refetchUser));
    render(<UserDetailClient userId="user-1" />);
    expect(screen.getByText('保存済みユーザー')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('前回取得時の内容です');
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.refetchCurrentUser).toHaveBeenCalledOnce();
    expect(mocks.refetchUser).toHaveBeenCalledOnce();
  });

  it.each([
    [401, 'ログインの有効期限が切れました'],
    [403, 'このユーザーを見る権限がありません'],
  ] as const)('%sではキャッシュ済み詳細を隠して再試行しない', (status, message) => {
    mocks.userQuery.mockReturnValue(queryResult(user, status, mocks.refetchUser));
    render(<UserDetailClient userId="user-1" />);
    expect(screen.queryByText('保存済みユーザー')).not.toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(mocks.userQuery.mock.calls[0][1].retry(0, { data: { httpStatus: status } })).toBe(false);
  });

  it('利用者情報の401でもキャッシュ済み詳細を隠す', () => {
    mocks.currentUserQuery.mockReturnValue(queryResult(currentUser, 401, mocks.refetchCurrentUser));
    render(<UserDetailClient userId="user-1" />);
    expect(screen.queryByText('保存済みユーザー')).not.toBeInTheDocument();
    expect(screen.getByText('ログインの有効期限が切れました')).toBeInTheDocument();
  });
});
