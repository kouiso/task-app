// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  mutate: vi.fn(),
  updateMutation: vi.fn(() => ({ mutate: mocks.mutate, isPending: false, error: null })),
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

const admin = { id: 'admin-1', role: 'ADMIN' };
const managedUser = {
  ...user,
  id: 'user-2',
  role: 'USER',
  isActive: false,
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
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  mocks.push.mockReset();
  mocks.refresh.mockReset();
  mocks.refetchCurrentUser.mockReset();
  mocks.refetchUser.mockReset();
  mocks.mutate.mockReset();
  mocks.currentUserQuery
    .mockReset()
    .mockReturnValue(queryResult(currentUser, undefined, mocks.refetchCurrentUser));
  mocks.userQuery.mockReset().mockReturnValue(queryResult(user, undefined, mocks.refetchUser));
  mocks.updateMutation.mockClear();
});

function renderManagedUser() {
  mocks.currentUserQuery.mockReturnValue(queryResult(admin, undefined, mocks.refetchCurrentUser));
  mocks.userQuery.mockReturnValue(queryResult(managedUser, undefined, mocks.refetchUser));
  return render(<UserEditClient userId="user-2" />);
}

function captureSubmitHandler(form: HTMLFormElement) {
  const reactPropsKey = Object.keys(form).find((key) => key.startsWith('__reactProps$'));
  if (!reactPropsKey) throw new Error('React form props were not found');
  const props = (form as unknown as Record<string, { onSubmit?: (event: unknown) => unknown }>)[
    reactPropsKey
  ];
  if (!props?.onSubmit) throw new Error('React submit handler was not found');
  return props.onSubmit;
}

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
    const queryOptions = mocks.userQuery.mock.calls[0]?.[1] as
      | { retry: (failureCount: number, error: unknown) => boolean }
      | undefined;
    if (!queryOptions) {
      throw new Error('USER_QUERY_OPTIONS_MISSING');
    }
    expect(queryOptions.retry(0, { data: { httpStatus: status } })).toBe(false);
  });
});

describe('ユーザー編集フォームの再取得', () => {
  it('初回取得した値ですべての入力欄を初期化する', () => {
    renderManagedUser();

    expect(screen.getByLabelText(/名前/)).toHaveValue(managedUser.name);
    expect(screen.getByLabelText('アバターURL（任意）')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'ロール' })).toHaveTextContent('ユーザー');
    expect(screen.getByRole('checkbox', { name: 'アクティブ' })).not.toBeChecked();
  });

  it('同じ利用者の再取得では編集途中の名前を守り、未編集項目を更新する', async () => {
    const view = renderManagedUser();
    fireEvent.change(screen.getByLabelText(/名前/), { target: { value: '入力途中の名前' } });
    mocks.userQuery.mockReturnValue(
      queryResult(
        {
          ...managedUser,
          name: 'サーバー側の名前',
          avatar: 'https://example.com/server-avatar.png',
          role: 'ADMIN',
          isActive: true,
        },
        undefined,
        mocks.refetchUser,
      ),
    );

    view.rerender(<UserEditClient userId="user-2" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/名前/)).toHaveValue('入力途中の名前');
      expect(screen.getByLabelText('アバターURL（任意）')).toHaveValue(
        'https://example.com/server-avatar.png',
      );
      expect(screen.getByRole('combobox', { name: 'ロール' })).toHaveTextContent('管理者');
      expect(screen.getByRole('checkbox', { name: 'アクティブ' })).toBeChecked();
    });
  });

  it('同じ利用者の再取得でも選択したロールを保ち、未編集の名前を更新する', async () => {
    const view = renderManagedUser();
    fireEvent.click(screen.getByRole('combobox', { name: 'ロール' }));
    fireEvent.click(screen.getByRole('option', { name: '管理者' }));
    expect(screen.getByRole('combobox', { name: 'ロール' })).toHaveTextContent('管理者');

    const refreshedUser = { ...managedUser, name: '最新の名前' };
    mocks.userQuery.mockReturnValue(queryResult(refreshedUser, undefined, mocks.refetchUser));
    view.rerender(<UserEditClient userId="user-2" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/名前/)).toHaveValue('最新の名前');
      expect(screen.getByRole('combobox', { name: 'ロール' })).toHaveTextContent('管理者');
      expect(screen.getByRole('checkbox', { name: 'アクティブ' })).not.toBeChecked();
    });
    fireEvent.click(screen.getByRole('button', { name: '更新' }));
    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        id: 'user-2',
        name: '最新の名前',
        avatar: null,
        role: 'ADMIN',
      }),
    );
  });

  it('同じ利用者の再取得でも選択した有効状態を保ち、未編集の画像を更新する', async () => {
    const view = renderManagedUser();
    fireEvent.click(screen.getByRole('checkbox', { name: 'アクティブ' }));
    expect(screen.getByRole('checkbox', { name: 'アクティブ' })).toBeChecked();

    const refreshedUser = { ...managedUser, avatar: 'https://example.com/latest.png' };
    mocks.userQuery.mockReturnValue(queryResult(refreshedUser, undefined, mocks.refetchUser));
    view.rerender(<UserEditClient userId="user-2" />);

    await waitFor(() => {
      expect(screen.getByLabelText('アバターURL（任意）')).toHaveValue(refreshedUser.avatar);
      expect(screen.getByRole('checkbox', { name: 'アクティブ' })).toBeChecked();
      expect(screen.getByRole('combobox', { name: 'ロール' })).toHaveTextContent('ユーザー');
    });
    fireEvent.click(screen.getByRole('button', { name: '更新' }));
    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        id: 'user-2',
        name: managedUser.name,
        avatar: refreshedUser.avatar,
        isActive: true,
      }),
    );
  });

  it('別の利用者へ移動した場合は編集途中の値を持ち越さない', async () => {
    const view = renderManagedUser();
    fireEvent.change(screen.getByLabelText(/名前/), { target: { value: '利用者Aの入力途中' } });
    fireEvent.change(screen.getByLabelText('アバターURL（任意）'), {
      target: { value: 'https://example.com/draft.png' },
    });
    mocks.userQuery.mockReturnValue(
      queryResult(
        {
          ...managedUser,
          id: 'user-3',
          name: '利用者B',
          avatar: 'https://example.com/user-b.png',
          role: 'ADMIN',
          isActive: true,
        },
        undefined,
        mocks.refetchUser,
      ),
    );

    view.rerender(<UserEditClient userId="user-3" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/名前/)).toHaveValue('利用者B');
      expect(screen.getByLabelText('アバターURL（任意）')).toHaveValue(
        'https://example.com/user-b.png',
      );
      expect(screen.getByRole('combobox', { name: 'ロール' })).toHaveTextContent('管理者');
      expect(screen.getByRole('checkbox', { name: 'アクティブ' })).toBeChecked();
    });
  });
});

describe('管理者の選択更新payload', () => {
  it('名前だけの保存では古いroleとisActiveを送り直さない', async () => {
    renderManagedUser();
    fireEvent.change(screen.getByLabelText(/名前/), { target: { value: '新しい名前' } });
    fireEvent.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        id: 'user-2',
        name: '新しい名前',
        avatar: null,
      }),
    );
  });

  it('画像だけの保存では古いroleとisActiveを送り直さない', async () => {
    renderManagedUser();
    fireEvent.change(screen.getByLabelText('アバターURL（任意）'), {
      target: { value: 'https://example.com/new-avatar.png' },
    });
    fireEvent.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        id: 'user-2',
        name: managedUser.name,
        avatar: 'https://example.com/new-avatar.png',
      }),
    );
  });

  it('roleだけを変えた場合はroleだけを追加する', async () => {
    renderManagedUser();
    fireEvent.click(screen.getByRole('combobox', { name: 'ロール' }));
    fireEvent.click(screen.getByRole('option', { name: '管理者' }));
    fireEvent.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        id: 'user-2',
        name: managedUser.name,
        avatar: null,
        role: 'ADMIN',
      }),
    );
  });

  it('isActiveだけを変えた場合はisActiveだけを追加する', async () => {
    renderManagedUser();
    fireEvent.click(screen.getByRole('checkbox', { name: 'アクティブ' }));
    fireEvent.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        id: 'user-2',
        name: managedUser.name,
        avatar: null,
        isActive: true,
      }),
    );
  });

  it('管理者本人の保存でもroleとisActiveを送らない', async () => {
    mocks.currentUserQuery.mockReturnValue(queryResult(admin, undefined, mocks.refetchCurrentUser));
    mocks.userQuery.mockReturnValue(
      queryResult(
        { ...managedUser, id: admin.id, role: 'ADMIN', isActive: true },
        undefined,
        mocks.refetchUser,
      ),
    );
    render(<UserEditClient userId={admin.id} />);
    fireEvent.change(screen.getByLabelText(/名前/), { target: { value: '管理者本人' } });
    fireEvent.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        id: admin.id,
        name: '管理者本人',
        avatar: null,
      }),
    );
  });

  it.each([
    ['利用者が未取得', undefined],
    ['編集権限が消えた', { id: 'admin-1', role: 'USER' }],
  ] as const)('%s後は古いsubmit callbackでも送信しない', async (_label, nextCurrentUser) => {
    const view = renderManagedUser();
    const form = screen.getByRole('button', { name: '更新' }).closest('form');
    if (!form) throw new Error('Edit form was not found');
    const staleSubmit = captureSubmitHandler(form);

    mocks.currentUserQuery.mockReturnValue(
      queryResult(nextCurrentUser, undefined, mocks.refetchCurrentUser),
    );
    view.rerender(<UserEditClient userId="user-2" />);
    await act(async () => {
      await staleSubmit({ preventDefault: vi.fn(), persist: vi.fn() });
    });

    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('Aで捕捉したsubmit callbackをBへ遷移後に呼んでもAへBの値を送らない', async () => {
    const view = renderManagedUser();
    const form = screen.getByRole('button', { name: '更新' }).closest('form');
    if (!form) throw new Error('Edit form was not found');
    const staleSubmit = captureSubmitHandler(form);

    const nextUser = {
      ...managedUser,
      id: 'user-3',
      name: '別の利用者',
      role: 'ADMIN',
      isActive: true,
    };
    mocks.userQuery.mockReturnValue(queryResult(nextUser, undefined, mocks.refetchUser));
    view.rerender(<UserEditClient userId="user-3" />);
    await waitFor(() => expect(screen.getByLabelText(/名前/)).toHaveValue('別の利用者'));

    await act(async () => {
      await staleSubmit({ preventDefault: vi.fn(), persist: vi.fn() });
    });

    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
