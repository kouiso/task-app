// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  QueryClient,
  QueryClientProvider,
  type UseMutationOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TaskPage from '@/app/my-task/page';

type Variables = Record<string, unknown>;
type Operation =
  | 'create'
  | 'update'
  | 'delete'
  | 'bulkComplete'
  | 'bulkDelete'
  | 'bulkUpdateStatus';
const mocks = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
  detail: vi.fn(),
  submit: null as null | ((data: Variables) => void),
  invalidate: vi.fn(),
  detailInvalidate: vi.fn(),
  projectInvalidate: vi.fn(),
  queryEnabled: { currentUser: true, projects: true, tasks: true },
  currentUserStatus: undefined as number | undefined,
  writes: Object.fromEntries(
    ['create', 'update', 'delete', 'bulkComplete', 'bulkDelete', 'bulkUpdateStatus'].map((name) => [
      name,
      vi.fn<(variables: Variables) => Promise<unknown>>(),
    ]),
  ) as Record<Operation, ReturnType<typeof vi.fn<(variables: Variables) => Promise<unknown>>>>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mocks.replace }),
  usePathname: () => '/task',
  useSearchParams: () => mocks.params,
}));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/component/task/task-card', () => ({
  TaskCard: ({
    id,
    title,
    onEdit,
    onDelete,
  }: {
    id: string;
    title: string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <article>
      {title}
      <button type="button" onClick={() => onDelete(id)}>
        Delete {title}
      </button>
      <button type="button" onClick={() => onEdit(id)}>
        Edit {title}
      </button>
    </article>
  ),
}));
vi.mock('@/component/task/task-detail-dialog', () => ({ TaskDetailDialog: () => null }));
// Real DeleteConfirmDialog and Radix are loaded.
const tasks = ['a', 'b'].map((id) => ({
  id,
  title: `Task ${id.toUpperCase()}`,
  projectId: 'p',
  status: 'TODO',
  priority: 'MEDIUM',
  description: null,
  dueDate: null,
  estimatedHours: null,
  assigneeId: null,
  assignee: null,
  timeSpentMinutes: 0,
  updatedAt: new Date(`2026-01-0${id === 'a' ? 1 : 2}T00:00:00Z`),
}));
const projects = [{ id: 'p', name: 'Owner', members: [{ userId: 'owner', role: 'OWNER' }] }];
function staticQuery<T>(data: T) {
  return {
    data,
    isLoading: false,
    isFetching: false,
    error: null,
    isError: false,
    refetch: vi.fn(),
  };
}
vi.mock('@/trpc/react', () => {
  const mutation = (operation: Operation) => ({
    useMutation: (options: UseMutationOptions<unknown, Error, Variables>) =>
      useMutation({ ...options, mutationKey: [operation], mutationFn: mocks.writes[operation] }),
  });
  return {
    api: {
      useUtils: () => ({
        task: {
          getAll: { invalidate: mocks.invalidate },
          getById: { invalidate: mocks.detailInvalidate },
        },
        project: { getAll: { invalidate: mocks.projectInvalidate } },
      }),
      auth: {
        getCurrentUser: {
          useQuery: (_input: unknown, options: { enabled?: boolean }) => {
            mocks.queryEnabled.currentUser = options.enabled !== false;
            const result = staticQuery({ id: 'owner' });
            return mocks.currentUserStatus === undefined
              ? result
              : {
                  ...result,
                  isError: true,
                  error: {
                    data: { httpStatus: mocks.currentUserStatus, code: 'UNAUTHORIZED' },
                  },
                };
          },
        },
        getSession: {
          useQuery: (_input: unknown, options: object) =>
            useQuery({
              queryKey: ['session'],
              queryFn: async () => ({ user: { id: 'owner' } }),
              initialData: { user: { id: 'owner' } },
              staleTime: Infinity,
              ...options,
            }),
        },
      },
      project: {
        getAll: {
          useQuery: (_input: unknown, options: { enabled?: boolean }) => {
            mocks.queryEnabled.projects = options.enabled !== false;
            return staticQuery(projects);
          },
        },
      },
      search: {
        getMembersByProject: { useQuery: () => staticQuery([]) },
        getProjectMembers: { useQuery: () => staticQuery([]) },
      },
      task: {
        getAll: {
          useQuery: (_input: unknown, options: { enabled?: boolean }) => {
            mocks.queryEnabled.tasks = options.enabled !== false;
            return staticQuery(tasks);
          },
        },
        getById: {
          useQuery: (input: { id: string }, options: object) =>
            useQuery({
              queryKey: ['linked', input.id],
              queryFn: () => mocks.detail(input.id),
              ...options,
            }),
        },
        ...Object.fromEntries(
          ['create', 'update', 'delete', 'bulkComplete', 'bulkDelete', 'bulkUpdateStatus'].map(
            (op) => [op, mutation(op as Operation)],
          ),
        ),
      },
    },
  };
});
let client: QueryClient;
function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function mount() {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(pageTree());
}
function pageTree() {
  return (
    <QueryClientProvider client={client}>
      <TaskPage />
      <Toaster />
    </QueryClientProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.params = new URLSearchParams();
  mocks.detail.mockImplementation(async (id: string) => tasks.find((t) => t.id === id));
  for (const fn of Object.values(mocks.writes)) fn.mockResolvedValue({});
  mocks.invalidate.mockResolvedValue(undefined);
  mocks.detailInvalidate.mockResolvedValue(undefined);
  mocks.projectInvalidate.mockResolvedValue(undefined);
  mocks.queryEnabled = { currentUser: true, projects: true, tasks: true };
  mocks.currentUserStatus = undefined;
});
afterEach(() => {
  cleanup();
  toast.remove();
  client?.clear();
});

it('control: ordinary update sends A and closes only after success', async () => {
  const p = deferred();
  mocks.writes.update.mockReturnValue(p.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  expect(mocks.writes.update.mock.calls[0][0]).toMatchObject({ id: 'a', title: 'Task A' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await act(async () => p.resolve({ id: 'a' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(mocks.invalidate).toHaveBeenCalledTimes(1);
  expect(screen.getByText('「Task A」を更新しました。')).toBeInTheDocument();
});
it('old A success preserves newly opened B form', async () => {
  const p = deferred();
  mocks.writes.update.mockReturnValue(p.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task B' }));
  expect(screen.getByRole('textbox', { name: 'タイトル' })).toHaveValue('Task B');
  await act(async () => p.resolve({ id: 'a' }));
  await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
  expect(screen.getByRole('textbox', { name: 'タイトル' })).toHaveValue('Task B');
  expect(screen.getByText('「Task A」を更新しました。')).toBeInTheDocument();
  expect(screen.queryByText(/続けて更新する場合は、入力を控え/)).not.toBeInTheDocument();
});
it('old A success preserves newer same-A input', async () => {
  const p = deferred();
  mocks.writes.update.mockReturnValue(p.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByRole('textbox', { name: 'タイトル' }), {
    target: { value: 'Newer draft' },
  });
  await act(async () => p.resolve({ id: 'a' }));
  await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
  expect(screen.getByRole('textbox', { name: 'タイトル' })).toHaveValue('Newer draft');
  expect(
    screen.getByText(
      '送信後に入力した変更は保存されていません。入力内容を別の場所にコピーしてから、タスク編集画面を閉じて開き直し、もう一度保存してください。',
    ),
  ).toBeInTheDocument();
  expect(screen.getByText('「Task A」を更新しました。')).toBeInTheDocument();
});

it('old A success identifies saved A and warns after A is closed and reopened', async () => {
  const p = deferred();
  mocks.writes.update.mockReturnValue(p.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  expect(screen.getByRole('textbox', { name: 'タイトル' })).toHaveValue('Task A');
  await act(async () => p.resolve({ id: 'a' }));
  expect(screen.getByRole('textbox', { name: 'タイトル' })).toHaveValue('Task A');
  expect(screen.getByText('「Task A」を更新しました。')).toBeInTheDocument();
  expect(
    screen.getByText(
      '送信後に入力した変更は保存されていません。入力内容を別の場所にコピーしてから、タスク編集画面を閉じて開き直し、もう一度保存してください。',
    ),
  ).toBeInTheDocument();
});
it('same-tick real form submit dispatches only one update', async () => {
  const p = deferred();
  mocks.writes.update.mockReturnValue(p.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  const form = screen.getByRole('textbox', { name: 'タイトル' }).closest('form');
  expect(form).not.toBeNull();
  if (!form) throw new Error('task form missing');
  act(() => {
    fireEvent.submit(form);
    fireEvent.submit(form);
  });
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalled());
  expect(mocks.writes.update).toHaveBeenCalledTimes(1);
  await act(async () => p.resolve({ id: 'a' }));
});
it.each([
  401, 403,
])('update %s does not expose raw server error and supplies fixed recovery', async (status) => {
  mocks.writes.update.mockRejectedValue(
    Object.assign(new Error('PRIVATE_SERVER_DETAIL'), {
      data: { httpStatus: status, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' },
    }),
  );
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  if (status === 401) {
    await screen.findByRole('button', { name: 'ログイン画面へ' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  } else {
    await screen.findByText(
      'タスクの更新を実行できません。権限と対象の最新の状態を確認してください。',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mocks.projectInvalidate).toHaveBeenCalled();
  }
  expect(screen.queryByText('PRIVATE_SERVER_DETAIL')).not.toBeInTheDocument();
});

it('pending delete can be cancelled while its lock blocks another delete target', async () => {
  const p = deferred();
  mocks.writes.delete.mockReturnValue(p.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Delete Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '削除' }));
  await waitFor(() => expect(mocks.writes.delete).toHaveBeenCalledTimes(1));
  const cancel = screen.getByRole('button', { name: 'キャンセル' });
  expect(cancel).toBeEnabled();
  fireEvent.click(cancel);
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Delete Task B' }));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  await act(async () => p.resolve({ id: 'a' }));
  await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Delete Task B' }));
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
});

it('delete failure keeps confirmation and uses fixed recovery without raw server detail', async () => {
  mocks.writes.delete.mockRejectedValue(
    Object.assign(new Error('PRIVATE_DELETE_DETAIL'), {
      data: { httpStatus: 403, code: 'FORBIDDEN' },
    }),
  );
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Delete Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '削除' }));
  await screen.findByText(
    'タスクの削除を実行できません。権限と対象の最新の状態を確認してください。',
  );
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  expect(screen.queryByText('PRIVATE_DELETE_DETAIL')).not.toBeInTheDocument();
  expect(mocks.projectInvalidate).toHaveBeenCalled();
});

it('401 during success refresh enters sticky auth gate and suppresses all page queries', async () => {
  mocks.invalidate.mockRejectedValue(
    Object.assign(new Error('expired during refresh'), {
      data: { httpStatus: 401, code: 'UNAUTHORIZED' },
    }),
  );
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await screen.findByRole('button', { name: 'ログイン画面へ' });
  expect(mocks.queryEnabled).toEqual({ currentUser: false, projects: false, tasks: false });
  expect(screen.queryByText('Task A')).not.toBeInTheDocument();
});

it('query 401 before pending update success suppresses all stale success notices', async () => {
  const p = deferred();
  mocks.writes.update.mockReturnValue(p.promise);
  const view = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  mocks.currentUserStatus = 401;
  view.rerender(pageTree());
  await screen.findByRole('button', { name: 'ログイン画面へ' });
  await act(async () => p.resolve({ id: 'a' }));
  expect(screen.queryByText('「Task A」を更新しました。')).not.toBeInTheDocument();
  expect(screen.queryByText(/その変更は保存されていません/)).not.toBeInTheDocument();
  expect(
    screen.queryByText(/送信した内容を保存しました。現在の入力は未保存です/),
  ).not.toBeInTheDocument();
  expect(screen.queryByText('Task A')).not.toBeInTheDocument();
});

it('successful update stays successful when its submitted-target refresh fails', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.detailInvalidate.mockRejectedValue(new Error('PRIVATE_REFRESH_DETAIL'));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(
    await screen.findByText(
      '最新の表示を取得できませんでした。再表示して操作結果を確認してください。',
    ),
  ).toBeInTheDocument();
  expect(screen.getByText('「Task A」を更新しました。')).toBeInTheDocument();
  expect(screen.queryByText('PRIVATE_REFRESH_DETAIL')).not.toBeInTheDocument();
  expect(mocks.detailInvalidate).toHaveBeenCalledWith(
    { id: 'a' },
    { refetchType: 'active' },
    { throwOnError: true },
  );
  expect(consoleError).toHaveBeenCalled();
  consoleError.mockRestore();
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});
