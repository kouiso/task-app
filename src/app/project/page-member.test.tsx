// @vitest-environment jsdom
import {
  QueryClient,
  QueryClientProvider,
  type UseMutationOptions,
  useMutation,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectPage from '@/app/project/page';

type Variables = Record<string, unknown>;
type Operation =
  | 'create'
  | 'update'
  | 'delete'
  | 'addMember'
  | 'removeMember'
  | 'updateMemberRole'
  | 'archive'
  | 'unarchive';
const mocks = vi.hoisted(() => ({
  search: '',
  push: vi.fn(),
  currentUserFetching: false,
  allInvalidate: vi.fn(),
  detailInvalidate: vi.fn(),
  availableInvalidate: vi.fn(),
  writes: Object.fromEntries(
    [
      'create',
      'update',
      'delete',
      'addMember',
      'removeMember',
      'updateMemberRole',
      'archive',
      'unarchive',
    ].map((name) => [name, vi.fn<(variables: Variables) => Promise<unknown>>()]),
  ) as Record<Operation, ReturnType<typeof vi.fn<(variables: Variables) => Promise<unknown>>>>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const currentUser = { id: 'owner', name: 'Owner', email: 'owner@example.test' };
function project(id = 'a') {
  return {
    id,
    name: `Project ${id.toUpperCase()}`,
    description: null,
    color: '#1976d2',
    isArchived: false,
    startDate: null,
    endDate: null,
    members: [
      { id: `${id}-owner`, userId: 'owner', role: 'OWNER', user: currentUser },
      {
        id: `${id}-member`,
        userId: 'member',
        role: 'MEMBER',
        user: { id: 'member', name: 'Member', email: 'member@example.test' },
      },
    ],
    tasks: [],
  };
}
function query<T>(data: T) {
  return {
    data,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}
vi.mock('@/trpc/react', () => {
  const mutation = (operation: Operation) => ({
    useMutation: (options: UseMutationOptions<unknown, Error, Variables, unknown>) =>
      useMutation({
        ...options,
        mutationKey: [operation],
        mutationFn: mocks.writes[operation],
      }),
  });
  return {
    api: {
      useUtils: () => ({
        project: {
          getAll: { invalidate: mocks.allInvalidate },
          getById: { invalidate: mocks.detailInvalidate },
          getAvailableUsers: { invalidate: mocks.availableInvalidate },
        },
      }),
      auth: {
        getCurrentUser: {
          useQuery: () => ({ ...query(currentUser), isFetching: mocks.currentUserFetching }),
        },
      },
      project: {
        getAll: { useQuery: () => query([project('a'), project('b')]) },
        getById: { useQuery: ({ id }: { id: string }) => query(project(id)) },
        getAvailableUsers: {
          useQuery: () =>
            query([{ id: 'new-member', name: 'New Member', email: 'new@example.test' }]),
        },
        ...Object.fromEntries(
          (
            [
              'create',
              'update',
              'delete',
              'addMember',
              'removeMember',
              'updateMemberRole',
              'archive',
              'unarchive',
            ] as const
          ).map((operation) => [operation, mutation(operation)]),
        ),
      },
    },
  };
});

function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function serverError(status: number) {
  return Object.assign(new Error('PRIVATE_DATABASE_OR_VALIDATION_DETAIL'), {
    data: {
      httpStatus: status,
      code: {
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        409: 'CONFLICT',
        500: 'INTERNAL_SERVER_ERROR',
      }[status],
    },
  });
}
const clients: QueryClient[] = [];
function renderPage() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  clients.push(client);
  const tree = () => (
    <QueryClientProvider client={client}>
      <ProjectPage />
      <Toaster />
    </QueryClientProvider>
  );
  const view = render(tree());
  return {
    client,
    navigate: (id: string | null) => {
      mocks.search = id ? `projectId=${id}` : '';
      view.rerender(tree());
    },
  };
}
const browserMethods = [
  'scrollIntoView',
  'hasPointerCapture',
  'setPointerCapture',
  'releasePointerCapture',
] as const;
const originalBrowserMethods = new Map(
  browserMethods.map(
    (name) => [name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)] as const,
  ),
);
beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: () => true,
  }));
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  mocks.search = 'projectId=a';
  mocks.currentUserFetching = false;
  mocks.push.mockReset();
  for (const mock of [mocks.allInvalidate, mocks.detailInvalidate, mocks.availableInvalidate])
    mock.mockReset().mockResolvedValue(undefined);
  for (const write of Object.values(mocks.writes)) write.mockReset().mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  toast.remove();
  vi.unstubAllGlobals();
  for (const [name, descriptor] of originalBrowserMethods) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLElement.prototype, name);
  }
  for (const client of clients.splice(0)) client.clear();
});

async function choose(trigger: HTMLElement, label: string) {
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  const option = await screen.findByRole('option', { name: label });
  fireEvent.keyDown(option, { key: 'Enter' });
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
}
async function openMemberAdd() {
  fireEvent.click(screen.getByRole('button', { name: 'メンバー追加' }));
  const dialog = screen.getByRole('dialog');
  await choose(within(dialog).getByRole('combobox', { name: 'ユーザー' }), 'New Member');
  return dialog;
}
function openRemove() {
  fireEvent.click(screen.getByRole('button', { name: 'Memberをプロジェクトから削除' }));
  return screen.getByRole('alertdialog');
}

describe('Independent member interactions with actual ProjectDetailView, Radix and TanStack mutation', () => {
  it('does not show a removal confirmation for A over project B', () => {
    const view = renderPage();
    openRemove();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    view.navigate('b');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mocks.writes.removeMember).not.toHaveBeenCalled();
  });
  it('sends only one addMember from two synchronous submit clicks', async () => {
    const pending = deferred();
    mocks.writes.addMember.mockReturnValue(pending.promise);
    renderPage();
    const dialog = await openMemberAdd();
    const submit = within(dialog).getByRole('button', { name: 'メンバー追加' });
    act(() => {
      fireEvent.click(submit);
      fireEvent.click(submit);
    });
    await waitFor(() => expect(mocks.writes.addMember).toHaveBeenCalled());
    expect(mocks.writes.addMember).toHaveBeenCalledTimes(1);
    expect(mocks.writes.addMember.mock.calls[0]?.[0]).toEqual({
      projectId: 'a',
      userId: 'new-member',
      role: 'MEMBER',
    });
    expect(submit).toBeDisabled();
    await act(async () => pending.resolve({}));
  });

  it('cannot submit selection made in project A after navigating to B', async () => {
    const view = renderPage();
    await openMemberAdd();
    view.navigate('b');
    // 別のプロジェクトへ追加しないことが条件なので、閉じる場合も選択を消す場合も許容します。
    const remaining = screen.queryByRole('dialog');
    if (remaining) {
      const submit = within(remaining).getByRole('button', { name: 'メンバー追加' });
      fireEvent.click(submit);
      await act(async () => {
        await Promise.resolve();
      });
      expect(submit).toBeDisabled();
    }
    expect(mocks.writes.addMember).not.toHaveBeenCalled();
  });

  it('does not close a newly reopened confirmation for the same member when old remove succeeds', async () => {
    const pending = deferred();
    mocks.writes.removeMember.mockReturnValue(pending.promise);
    renderPage();
    const dialog = openRemove();
    fireEvent.click(within(dialog).getByRole('button', { name: '削除' }));
    await waitFor(() => expect(mocks.writes.removeMember).toHaveBeenCalledTimes(1));
    const pendingDialog = screen.queryByRole('alertdialog');
    if (pendingDialog) fireEvent.keyDown(pendingDialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    openRemove();
    await act(async () => pending.resolve({}));
    await waitFor(() =>
      expect(mocks.detailInvalidate.mock.calls.map((call) => call[0])).toContainEqual({ id: 'a' }),
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(mocks.writes.removeMember).toHaveBeenCalledTimes(1);
  });

  it('shows role write rejection safely and invalidates submitted A after navigation to B', async () => {
    const pending = deferred();
    mocks.writes.updateMemberRole.mockReturnValue(pending.promise);
    const view = renderPage();
    await choose(screen.getByRole('combobox', { name: 'Memberの権限' }), '管理者');
    await waitFor(() => expect(mocks.writes.updateMemberRole).toHaveBeenCalledTimes(1));
    expect(mocks.writes.updateMemberRole.mock.calls[0]?.[0]).toEqual({
      projectId: 'a',
      userId: 'member',
      role: 'ADMIN',
    });
    view.navigate('b');
    await act(async () => pending.reject(serverError(403)));
    await waitFor(() =>
      expect(mocks.detailInvalidate.mock.calls.map((call) => call[0])).toContainEqual({ id: 'a' }),
    );
    expect(mocks.detailInvalidate.mock.calls.map((call) => call[0])).not.toContainEqual({
      id: 'b',
    });
    expect(screen.getByText('Project B')).toBeInTheDocument();
    expect(screen.getByText(/権限|許可/)).toBeInTheDocument();
    expect(screen.queryByText('PRIVATE_DATABASE_OR_VALIDATION_DETAIL')).not.toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
