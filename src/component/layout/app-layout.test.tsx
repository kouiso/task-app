// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from './app-layout';

const mocks = vi.hoisted(() => ({
  logoutOptions: null as null | { onSuccess?: () => unknown },
  mutate: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
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
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, ...props }: ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
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
        useQuery: () => ({
          data: { user: { name: '利用者', role: 'MEMBER', avatar: null } },
          isLoading: false,
        }),
      },
      logout: {
        useMutation: (options: { onSuccess?: () => unknown }) => {
          mocks.logoutOptions = options;
          return { mutate: mocks.mutate };
        },
      },
    },
  },
}));

beforeEach(() => {
  mocks.logoutOptions = null;
  mocks.mutate.mockReset();
  mocks.push.mockReset();
  mocks.refresh.mockReset();
  mocks.mutate.mockImplementation(() => mocks.logoutOptions?.onSuccess?.());
});

describe('ログアウト時のクエリ破棄', () => {
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

    render(
      <QueryClientProvider client={queryClient}>
        <AppLayout>
          <div>private screen</div>
        </AppLayout>
      </QueryClientProvider>,
    );
    const logoutButtons = screen.getAllByRole('button', { name: 'ログアウト' });
    fireEvent.click(logoutButtons[logoutButtons.length - 1]);

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
});
