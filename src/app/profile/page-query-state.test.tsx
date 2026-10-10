// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './page';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refetch: vi.fn(),
  query: {
    data: undefined as
      | undefined
      | {
          name: string;
          email: string;
          avatar: null;
          role: 'MEMBER';
          isActive: boolean;
          createdAt: Date;
          updatedAt: Date;
        },
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  options: null as null | {
    retry?: (failureCount: number, error: unknown) => boolean;
  },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/component/ui/loading-spinner', () => ({
  PageLoadingSpinner: () => <div>loading</div>,
}));
vi.mock('@/component/ui/avatar', () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarImage: () => null,
}));
vi.mock('@/component/ui/user-badges', () => ({
  ActiveStatusBadge: () => null,
  UserRoleBadge: () => null,
}));
vi.mock('@/trpc/react', () => ({
  api: {
    auth: {
      getCurrentUser: {
        useQuery: (
          _input: undefined,
          options: {
            retry?: (failureCount: number, error: unknown) => boolean;
          },
        ) => {
          mocks.options = options;
          return mocks.query;
        },
      },
    },
  },
}));

beforeEach(() => {
  mocks.push.mockReset();
  mocks.refetch.mockReset();
  mocks.options = null;
  Object.assign(mocks.query, {
    data: undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: mocks.refetch,
  });
});

describe('プロフィール取得失敗の表示', () => {
  it('正常応答で利用者がいない場合はログイン画面へ移す', async () => {
    render(<ProfilePage />);

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('プロフィールを取得できませんでした')).not.toBeInTheDocument();
  });

  it('初回500を未ログイン扱いにせず、再読み込みできる', async () => {
    const error = { data: { httpStatus: 500 } };
    Object.assign(mocks.query, { isError: true, error });

    render(<ProfilePage />);

    expect(await screen.findByText('プロフィールを取得できませんでした')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(mocks.options?.retry?.(0, error)).toBe(true);
  });

  it('401だけを未ログインとしてログイン画面へ移す', async () => {
    const error = Object.assign(new Error('expired'), {
      data: { httpStatus: 401 },
    });
    Object.assign(mocks.query, { isError: true, error });

    render(<ProfilePage />);

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('プロフィールを取得できませんでした')).not.toBeInTheDocument();
    expect(mocks.options?.retry?.(0, error)).toBe(false);
  });

  it('403をログイン画面へ送らず、権限エラーとして表示する', async () => {
    const error = Object.assign(new Error('inactive'), {
      data: { httpStatus: 403 },
    });
    Object.assign(mocks.query, { isError: true, error });

    render(<ProfilePage />);

    expect(await screen.findByText('プロフィールを表示する権限がありません')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.options?.retry?.(0, error)).toBe(false);
  });

  it('再取得だけ失敗した場合は前回のプロフィールを残して警告する', async () => {
    Object.assign(mocks.query, {
      data: {
        name: '利用者',
        email: 'user@example.test',
        avatar: null,
        role: 'MEMBER',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      },
      isError: true,
      error: new Error('offline'),
    });

    render(<ProfilePage />);

    expect(await screen.findByText('利用者')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('表示は前回取得時の内容です');
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
