// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from './app-layout';

const mocks = vi.hoisted(() => ({
  logoutOptions: null as null | {
    onSuccess?: () => unknown;
    onError?: (error: unknown) => unknown;
    onSettled?: () => unknown;
  },
  logoutPending: false,
  dialogOpenChange: null as null | ((open: boolean) => void),
  mutate: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  refetch: vi.fn(),
  sessionQuery: {
    data: { user: { name: '利用者', role: 'MEMBER', avatar: null } } as
      | { user: { name: string; role: string; avatar: null } }
      | undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  sessionQueryOptions: null as null | { retry?: (failureCount: number, error: unknown) => boolean },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock('./quick-search', () => ({ QuickSearch: () => null }));
vi.mock('@/component/ui/user-badges', () => ({ UserRoleBadge: () => null }));
vi.mock('@/component/ui/loading-spinner', () => ({ PageLoadingSpinner: () => <div>loading</div> }));
vi.mock('@/component/ui/avatar', () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  AvatarImage: () => null,
}));
vi.mock('@/component/ui/button', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock('@/component/ui/alert-dialog', () => ({
  AlertDialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => {
    mocks.dialogOpenChange = onOpenChange ?? null;
    return open === false ? null : <div role="dialog">{children}</div>;
  },
  AlertDialogAction: ({ children, ...props }: ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  AlertDialogCancel: ({ children, ...props }: ComponentProps<'button'>) => (
    <button type="button" {...props} onClick={() => mocks.dialogOpenChange?.(false)}>
      {children}
    </button>
  ),
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
vi.mock('@/component/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => null,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/component/ui/sheet', () => ({
  Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/trpc/react', () => ({
  api: {
    auth: {
      getSession: {
        useQuery: (
          _input: undefined,
          options: { retry?: (failureCount: number, error: unknown) => boolean },
        ) => {
          mocks.sessionQueryOptions = options;
          return mocks.sessionQuery;
        },
      },
      logout: {
        useMutation: (options: NonNullable<typeof mocks.logoutOptions>) => {
          mocks.logoutOptions = options;
          return { mutate: mocks.mutate, isPending: mocks.logoutPending };
        },
      },
    },
  },
}));

beforeEach(() => {
  mocks.logoutOptions = null;
  mocks.logoutPending = false;
  mocks.dialogOpenChange = null;
  mocks.mutate.mockReset();
  mocks.push.mockReset();
  mocks.refresh.mockReset();
  mocks.refetch.mockReset();
  mocks.sessionQueryOptions = null;
  Object.assign(mocks.sessionQuery, {
    data: { user: { name: '利用者', role: 'MEMBER', avatar: null } },
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: mocks.refetch,
  });
  mocks.mutate.mockImplementation(async () => {
    await mocks.logoutOptions?.onSuccess?.();
    await mocks.logoutOptions?.onSettled?.();
  });
});

const renderLayout = (
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) =>
  render(
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <div>private screen</div>
      </AppLayout>
    </QueryClientProvider>,
  );

const openLogoutDialog = () => {
  const button = screen.getAllByRole('button', { name: 'ログアウト' })[0];
  if (!button) throw new Error('LOGOUT_TRIGGER_MISSING');
  fireEvent.click(button);
  return screen.getByRole('dialog');
};

const getLogoutSubmit = () => {
  const button = screen.getAllByRole('button', { name: 'ログアウト' }).at(-1);
  if (!button) throw new Error('LOGOUT_SUBMIT_MISSING');
  return button;
};

describe('ログアウト処理', () => {
  it('進行中の取得を止め、古いデータを消してからログイン画面へ移る', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['private', 'cached'], { owner: 'previous-user' });
    let requestAborted = false;
    let finishRequest: (value: { owner: string }) => void = () => {};
    const pending = queryClient
      .fetchQuery({
        queryKey: ['private', 'pending'],
        queryFn: ({ signal }) =>
          new Promise<{ owner: string }>((resolve) => {
            finishRequest = resolve;
            signal.addEventListener('abort', () => {
              requestAborted = true;
            });
          }),
      })
      .catch(() => undefined);
    const order: string[] = [];
    const cancel = queryClient.cancelQueries.bind(queryClient);
    const clear = queryClient.clear.bind(queryClient);
    vi.spyOn(queryClient, 'cancelQueries').mockImplementation(async () => {
      order.push('cancel');
      await cancel();
    });
    vi.spyOn(queryClient, 'clear').mockImplementation(() => {
      order.push('clear');
      clear();
    });
    mocks.push.mockImplementation(() => order.push('push'));

    renderLayout(queryClient);
    openLogoutDialog();
    fireEvent.click(getLogoutSubmit());

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/login'));
    expect(order).toEqual(['cancel', 'clear', 'push']);
    expect(requestAborted).toBe(true);
    expect(queryClient.getQueryData(['private', 'cached'])).toBeUndefined();
    expect(queryClient.getQueryState(['private', 'pending'])).toBeUndefined();

    finishRequest({ owner: 'previous-user' });
    await pending;
    expect(queryClient.getQueryData(['private', 'pending'])).toBeUndefined();
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it('失敗時はキャッシュと現在画面を保ち、ダイアログ内で再試行できる', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['private', 'cached'], { owner: 'current-user' });
    mocks.mutate.mockImplementationOnce(async () => {
      await mocks.logoutOptions?.onError?.(new Error('network down'));
      await mocks.logoutOptions?.onSettled?.();
    });

    renderLayout(queryClient);
    openLogoutDialog();
    fireEvent.click(getLogoutSubmit());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ログアウトの完了を確認できませんでした。通信状況を確認して、もう一度お試しください。',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(queryClient.getQueryData(['private', 'cached'])).toEqual({ owner: 'current-user' });
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'もう一度試す' })).toBeEnabled();
  });

  it('応答を受け取れなかった後も再試行が成功すれば安全な順番で画面を移す', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const order: string[] = [];
    vi.spyOn(queryClient, 'cancelQueries').mockImplementation(async () => {
      order.push('cancel');
    });
    vi.spyOn(queryClient, 'clear').mockImplementation(() => {
      order.push('clear');
    });
    mocks.push.mockImplementation(() => order.push('push'));
    mocks.refresh.mockImplementation(() => order.push('refresh'));
    mocks.mutate
      .mockImplementationOnce(async () => {
        await mocks.logoutOptions?.onError?.(new Error('response lost'));
        await mocks.logoutOptions?.onSettled?.();
      })
      .mockImplementationOnce(async () => {
        await mocks.logoutOptions?.onSuccess?.();
        await mocks.logoutOptions?.onSettled?.();
      });

    renderLayout(queryClient);
    openLogoutDialog();
    fireEvent.click(getLogoutSubmit());
    fireEvent.click(await screen.findByRole('button', { name: 'もう一度試す' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/login'));
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(order).toEqual(['cancel', 'clear', 'push', 'refresh']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('同じ描画中の連続操作でも再送信とダイアログ終了を止める', () => {
    mocks.mutate.mockImplementation(() => undefined);

    renderLayout();
    openLogoutDialog();
    const submit = getLogoutSubmit();
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(mocks.mutate).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('送信中はキャンセルと再送信を無効にする', () => {
    mocks.logoutPending = true;

    renderLayout();
    openLogoutDialog();

    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ログアウト中...' })).toBeDisabled();
  });
});

describe('セッション取得失敗の表示', () => {
  it('正常応答の未ログイン状態はログイン画面へ移す', async () => {
    Object.assign(mocks.sessionQuery, { data: undefined, isError: false, error: null });

    renderLayout();

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('ログイン情報を確認できませんでした')).not.toBeInTheDocument();
  });

  it('通信失敗を未ログイン扱いにせず、再読み込みできる', async () => {
    Object.assign(mocks.sessionQuery, {
      data: undefined,
      isError: true,
      error: new Error('network down'),
    });

    renderLayout();

    expect(await screen.findByText('ログイン情報を確認できませんでした')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(mocks.sessionQueryOptions?.retry?.(0, new Error('network down'))).toBe(true);
    expect(mocks.sessionQueryOptions?.retry?.(2, new Error('network down'))).toBe(true);
    expect(mocks.sessionQueryOptions?.retry?.(3, new Error('network down'))).toBe(false);
  });

  it('401だけを未ログインとしてログイン画面へ移す', async () => {
    const error = Object.assign(new Error('expired'), { data: { httpStatus: 401 } });
    Object.assign(mocks.sessionQuery, { data: undefined, isError: true, error });

    renderLayout();

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('ログイン情報を確認できませんでした')).not.toBeInTheDocument();
    expect(mocks.sessionQueryOptions?.retry?.(0, error)).toBe(false);
  });

  it('403をログイン画面へ送らず、権限エラーとして表示する', async () => {
    const error = Object.assign(new Error('forbidden'), { data: { httpStatus: 403 } });
    Object.assign(mocks.sessionQuery, { data: undefined, isError: true, error });

    renderLayout();

    expect(await screen.findByText('画面を表示する権限がありません')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.sessionQueryOptions?.retry?.(0, error)).toBe(false);
  });

  it('再取得だけ失敗した場合は前回の画面を残して警告する', async () => {
    Object.assign(mocks.sessionQuery, { isError: true, error: new Error('offline') });

    renderLayout();

    expect(await screen.findByText('private screen')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      '最新のログイン情報を確認できませんでした。表示は前回取得時の内容です。',
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
