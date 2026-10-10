// @vitest-environment jsdom
import {
  QueryClient,
  QueryClientProvider,
  type UseMutationOptions,
  useMutation,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectPage from '@/app/project/page';
import { DeleteConfirmDialog } from '@/component/ui/delete-confirm-dialog';

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
  currentUserStatus: null as number | null,
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
          useQuery: () => ({
            ...query(currentUser),
            isFetching: mocks.currentUserFetching,
            isError: mocks.currentUserStatus !== null,
            error: mocks.currentUserStatus === null ? null : serverError(mocks.currentUserStatus),
          }),
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
  const codes: Record<number, string> = {
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    409: 'CONFLICT',
    500: 'INTERNAL_SERVER_ERROR',
  };
  return Object.assign(new Error('PRIVATE_DATABASE_OR_VALIDATION_DETAIL'), {
    data: { httpStatus: status, code: codes[status] },
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
async function openCreate() {
  fireEvent.click(screen.getByRole('button', { name: '新規プロジェクト' }));
  const input = screen.getByRole('textbox', { name: 'プロジェクト名' });
  fireEvent.change(input, { target: { value: 'Unsaved project' } });
  return input;
}
function submitForm(input: HTMLElement) {
  const form = input.closest('form');
  if (!form) throw new Error('Expected actual ProjectDialog form');
  fireEvent.submit(form);
}
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((media: string) => ({
      matches: false,
      media,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: () => true,
    })),
  );
  mocks.search = '';
  mocks.currentUserFetching = false;
  mocks.currentUserStatus = null;
  mocks.push.mockReset();
  for (const mock of [mocks.allInvalidate, mocks.detailInvalidate, mocks.availableInvalidate])
    mock.mockReset().mockResolvedValue(undefined);
  for (const write of Object.values(mocks.writes)) write.mockReset().mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  toast.remove();
  vi.unstubAllGlobals();
  for (const client of clients.splice(0)) client.clear();
});

describe('Project page mutations with actual forms, Radix dialogs and mutation lifecycle', () => {
  it('keeps create input after an unknown outcome and displays safe feedback', async () => {
    const pending = deferred();
    mocks.writes.create.mockReturnValue(pending.promise);
    renderPage();
    const input = await openCreate();
    submitForm(input);
    await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1));
    await act(async () => pending.reject(new Error('PRIVATE_NETWORK_DETAIL')));
    await waitFor(() =>
      expect(screen.getByText(/結果.*(不明|確認)|確認.*(結果|でき)/)).toBeInTheDocument(),
    );
    expect(screen.getByRole('textbox', { name: 'プロジェクト名' })).toHaveValue('Unsaved project');
    expect(screen.queryByText('PRIVATE_NETWORK_DETAIL')).not.toBeInTheDocument();
    expect(mocks.allInvalidate).toHaveBeenCalled();
  });
  it('allows only one create from two synchronous form submits', async () => {
    const pending = deferred();
    mocks.writes.create.mockReturnValue(pending.promise);
    renderPage();
    const input = await openCreate();
    submitForm(input);
    submitForm(input);
    await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: /作成|保存中|送信中/ })).toBeDisabled();
    await act(async () => pending.resolve({}));
  });
  it('keeps a reopened edit of the same project intact when the old save resolves', async () => {
    const pending = deferred();
    mocks.writes.update.mockReturnValue(pending.promise);
    const { client } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Project Aを編集' }));
    let input = screen.getByRole('textbox', { name: 'プロジェクト名' });
    fireEvent.change(input, { target: { value: 'First edit' } });
    submitForm(input);
    await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    fireEvent.click(screen.getByRole('button', { name: 'Project Aを編集' }));
    input = screen.getByRole('textbox', { name: 'プロジェクト名' });
    fireEvent.change(input, { target: { value: 'New unsaved edit' } });
    await act(async () => pending.resolve({}));
    await waitFor(() =>
      expect(client.getMutationCache().find({ mutationKey: ['update'] })?.state.status).toBe(
        'success',
      ),
    );
    expect(screen.getByRole('textbox', { name: 'プロジェクト名' })).toHaveValue('New unsaved edit');
    expect(mocks.detailInvalidate.mock.calls.map(([input]) => input)).toContainEqual({ id: 'a' });
  });
  it('retains the actual deletion confirmation through pending and rejection', async () => {
    const pending = deferred();
    mocks.writes.delete.mockReturnValue(pending.promise);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Project Aを削除' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '削除' }));
    await waitFor(() => expect(mocks.writes.delete).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await act(async () => pending.reject(serverError(500)));
    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeEnabled());
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.queryByText('PRIVATE_DATABASE_OR_VALIDATION_DETAIL')).not.toBeInTheDocument();
  });
  it('hides protected content on 401 and stays gated across later data and navigation', async () => {
    mocks.search = 'projectId=a';
    mocks.writes.archive.mockRejectedValue(serverError(401));
    const view = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'アーカイブ' }));
    await waitFor(() =>
      expect(screen.getByText('ログインの有効期限が切れました')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Project A')).not.toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.allInvalidate).not.toHaveBeenCalled();
    expect(mocks.detailInvalidate).not.toHaveBeenCalled();
    mocks.currentUserFetching = true;
    view.navigate('b');
    expect(screen.queryByText('Project B')).not.toBeInTheDocument();
    const login = screen.getByRole('button', { name: 'ログイン画面へ' });
    expect(login).toBeEnabled();
    fireEvent.click(login);
    expect(mocks.push).toHaveBeenCalledWith('/login');
  });
  it('invalidates submitted A without navigating away from B when archive A resolves', async () => {
    const pending = deferred();
    mocks.writes.archive.mockReturnValue(pending.promise);
    mocks.search = 'projectId=a';
    const view = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'アーカイブ' }));
    await waitFor(() => expect(mocks.writes.archive).toHaveBeenCalledTimes(1));
    view.navigate('b');
    await act(async () => pending.resolve({}));
    await waitFor(() =>
      expect(mocks.detailInvalidate.mock.calls.map(([input]) => input)).toContainEqual({ id: 'a' }),
    );
    expect(mocks.detailInvalidate.mock.calls.map(([input]) => input)).not.toContainEqual({
      id: 'b',
    });
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByText('Project B')).toBeInTheDocument();
  });
  it('does not hide readable detail after a write-only 403', async () => {
    mocks.search = 'projectId=a';
    mocks.writes.archive.mockRejectedValue(serverError(403));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'アーカイブ' }));
    await waitFor(() =>
      expect(mocks.detailInvalidate.mock.calls.map(([input]) => input)).toContainEqual({ id: 'a' }),
    );
    expect(screen.getByText('Project A')).toBeInTheDocument();
    expect(screen.queryByText('このプロジェクトを見る権限がありません')).not.toBeInTheDocument();
    expect(screen.queryByText('PRIVATE_DATABASE_OR_VALIDATION_DETAIL')).not.toBeInTheDocument();
  });
  it('refreshes a deleted project opened while its deletion was pending', async () => {
    const pending = deferred();
    mocks.writes.delete.mockReturnValue(pending.promise);
    const view = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Project Aを削除' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '削除' }));
    await waitFor(() => expect(mocks.writes.delete).toHaveBeenCalledTimes(1));
    view.navigate('a');
    await act(async () => pending.resolve({}));
    await waitFor(() =>
      expect(mocks.detailInvalidate.mock.calls.map(([input]) => input)).toContainEqual({ id: 'a' }),
    );
    expect(mocks.push).toHaveBeenCalledWith('/project');
  });
  it('does not let an older successful archive navigate after a later write confirms 401', async () => {
    const archive = deferred();
    const remove = deferred();
    mocks.writes.archive.mockReturnValue(archive.promise);
    mocks.writes.removeMember.mockReturnValue(remove.promise);
    mocks.search = 'projectId=a';
    const { client } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'アーカイブ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Memberをプロジェクトから削除' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '削除' }));
    await waitFor(() => expect(mocks.writes.removeMember).toHaveBeenCalledTimes(1));
    await act(async () => remove.reject(serverError(401)));
    await waitFor(() =>
      expect(screen.getByText('ログインの有効期限が切れました')).toBeInTheDocument(),
    );
    await act(async () => archive.resolve({}));
    await waitFor(() =>
      expect(client.getMutationCache().find({ mutationKey: ['archive'] })?.state.status).toBe(
        'success',
      ),
    );
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('ログインの有効期限が切れました')).toBeInTheDocument();
  });
  it('treats an unstructured transport 401 as unknown without claiming verified auth expiry', async () => {
    mocks.search = 'projectId=a';
    mocks.writes.archive.mockRejectedValue(
      Object.assign(new Error('PRIVATE_HTTP_401'), { status: 401 }),
    );
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'アーカイブ' }));
    await waitFor(() =>
      expect(mocks.detailInvalidate.mock.calls.map(([input]) => input)).toContainEqual({ id: 'a' }),
    );
    expect(screen.queryByText('ログインの有効期限が切れました')).not.toBeInTheDocument();
    expect(screen.getByText('Project A')).toBeInTheDocument();
    expect(screen.queryByText('PRIVATE_HTTP_401')).not.toBeInTheDocument();
    expect(screen.getByText(/結果.*(不明|確認)|確認.*(結果|でき)/)).toBeInTheDocument();
  });
  it('does not navigate from a late write after a current-user query confirms 401', async () => {
    const pending = deferred();
    mocks.writes.archive.mockReturnValue(pending.promise);
    mocks.search = 'projectId=a';
    const view = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'アーカイブ' }));
    await waitFor(() => expect(mocks.writes.archive).toHaveBeenCalledTimes(1));
    mocks.currentUserStatus = 401;
    view.navigate('a');
    expect(screen.getByText('ログインの有効期限が切れました')).toBeInTheDocument();
    await act(async () => pending.resolve({}));
    await waitFor(() =>
      expect(view.client.getMutationCache().find({ mutationKey: ['archive'] })?.state.status).toBe(
        'success',
      ),
    );
    expect(mocks.push).not.toHaveBeenCalled();
    mocks.currentUserStatus = null;
    view.navigate('b');
    expect(screen.getByText('ログインの有効期限が切れました')).toBeInTheDocument();
    expect(screen.queryByText('Project B')).not.toBeInTheDocument();
  });
  it('preserves automatic close for default shared confirmation consumers', () => {
    const confirm = vi.fn();
    function DefaultConsumer() {
      const [open, setOpen] = useState(true);
      return (
        <DeleteConfirmDialog
          open={open}
          onOpenChange={setOpen}
          onConfirm={confirm}
          isPending={false}
        />
      );
    }
    render(<DefaultConsumer />);
    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
