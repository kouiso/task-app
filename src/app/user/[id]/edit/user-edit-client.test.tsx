// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserEditClient } from './user-edit-client';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  currentUserQuery: vi.fn(),
  userQuery: vi.fn(),
  refetchCurrentUser: vi.fn(),
  refetchUser: vi.fn(),
  invalidate: vi.fn(),
  updateMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false, error: null })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/component/ui/loading-spinner', () => ({
  PageLoadingSpinner: () => <p>読み込み中</p>,
}));
vi.mock('@/trpc/react', () => ({
  api: {
    useUtils: () => ({
      user: { getById: { invalidate: mocks.invalidate }, getAll: { invalidate: mocks.invalidate } },
      auth: {
        getCurrentUser: { invalidate: mocks.invalidate },
        getSession: { invalidate: mocks.invalidate },
      },
    }),
    auth: { getCurrentUser: { useQuery: mocks.currentUserQuery } },
    user: {
      getById: { useQuery: mocks.userQuery },
      update: { useMutation: mocks.updateMutation },
    },
  },
}));

const currentUser = { id: 'user-1', role: 'USER' };
const user = {
  id: 'user-1',
  name: '保存済みユーザー',
  email: 'saved@example.com',
  avatar: null,
  role: 'USER',
  isActive: true,
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
  mocks.refresh.mockReset();
  mocks.refetchCurrentUser.mockReset();
  mocks.refetchUser.mockReset();
  mocks.currentUserQuery
    .mockReset()
    .mockReturnValue(queryResult(currentUser, undefined, mocks.refetchCurrentUser));
  mocks.userQuery.mockReset().mockReturnValue(queryResult(user, undefined, mocks.refetchUser));
  mocks.updateMutation.mockClear();
});

describe('ユーザー編集の取得状態', () => {
  it('利用者情報の初回500を永久ローディングにしない', () => {
    mocks.currentUserQuery.mockReturnValue(queryResult(undefined, 500, mocks.refetchCurrentUser));
    render(<UserEditClient userId="user-1" />);
    expect(screen.getByText('ユーザー情報を取得できませんでした')).toBeInTheDocument();
    expect(screen.queryByText('読み込み中')).not.toBeInTheDocument();
  });

  it('詳細の初回500を永久ローディングにしない', () => {
    mocks.userQuery.mockReturnValue(queryResult(undefined, 500, mocks.refetchUser));
    render(<UserEditClient userId="user-1" />);
    expect(screen.getByText('ユーザー情報を取得できませんでした')).toBeInTheDocument();
  });

  it('再取得500では入力内容を保持して再試行できる', () => {
    const view = render(<UserEditClient userId="user-1" />);
    fireEvent.change(screen.getByLabelText(/名前/), { target: { value: '入力途中の名前' } });
    mocks.userQuery.mockReturnValue(queryResult(user, 500, mocks.refetchUser));
    view.rerender(<UserEditClient userId="user-1" />);
    expect(screen.getByLabelText(/名前/)).toHaveValue('入力途中の名前');
    expect(screen.getByRole('alert')).toHaveTextContent('入力内容は保持されています');
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.refetchUser).toHaveBeenCalledOnce();
  });

  it.each([
    [401, 'ログインの有効期限が切れました'],
    [403, 'このユーザーを編集する権限がありません'],
  ] as const)('%sではキャッシュ済みフォームを隠す', (status, message) => {
    mocks.userQuery.mockReturnValue(queryResult(user, status, mocks.refetchUser));
    render(<UserEditClient userId="user-1" />);
    expect(screen.queryByDisplayValue('保存済みユーザー')).not.toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(mocks.userQuery.mock.calls[0][1].retry(0, { data: { httpStatus: status } })).toBe(false);
  });
});
