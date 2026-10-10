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
import MyTaskPage from '@/app/my-task/page';
import TaskPage from '@/app/task/page';

type Variables = Record<string, unknown>;
type Operation =
  | 'create'
  | 'update'
  | 'delete'
  | 'bulkComplete'
  | 'bulkDelete'
  | 'bulkUpdateStatus';
const mocks = vi.hoisted(() => ({
  validationWait: null as Promise<void> | null,
  validationStarted: vi.fn(),
  invalidate: vi.fn(),
  detailInvalidate: vi.fn(),
  projectInvalidate: vi.fn(),
  writes: Object.fromEntries(
    ['create', 'update', 'delete', 'bulkComplete', 'bulkDelete', 'bulkUpdateStatus'].map((name) => [
      name,
      vi.fn<(variables: Variables) => Promise<unknown>>(),
    ]),
  ) as Record<Operation, ReturnType<typeof vi.fn<(variables: Variables) => Promise<unknown>>>>,
}));
vi.mock('@hookform/resolvers/zod', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hookform/resolvers/zod')>();
  return {
    ...actual,
    zodResolver: (...args: Parameters<typeof actual.zodResolver>) => {
      const resolver = actual.zodResolver(...args);
      return async (...values: Parameters<typeof resolver>) => {
        const result = await resolver(...values);
        mocks.validationStarted();
        await mocks.validationWait;
        return result;
      };
    },
  };
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/task',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/component/task/task-card', () => ({
  TaskCard: ({
    id,
    title,
    onEdit,
  }: {
    id: string;
    title: string;
    onEdit: (id: string) => void;
  }) => (
    <article>
      {title}
      <button type="button" onClick={() => onEdit(id)}>
        Edit {title}
      </button>
    </article>
  ),
}));
vi.mock('@/component/task/task-detail-dialog', () => ({ TaskDetailDialog: () => null }));
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
        getCurrentUser: { useQuery: () => staticQuery({ id: 'owner' }) },
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
      project: { getAll: { useQuery: () => staticQuery(projects) } },
      search: {
        getProjectMembers: { useQuery: () => staticQuery([]) },
        getMembersByProject: { useQuery: () => staticQuery([]) },
      },
      task: {
        getAll: { useQuery: () => staticQuery(tasks) },
        getById: { useQuery: () => staticQuery(null) },
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
function mount(Page = TaskPage) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <Page />
      <Toaster />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.validationWait = null;
  for (const fn of Object.values(mocks.writes)) fn.mockResolvedValue({});
  mocks.invalidate.mockResolvedValue(undefined);
  mocks.detailInvalidate.mockResolvedValue(undefined);
  mocks.projectInvalidate.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  toast.remove();
  client?.clear();
});

it('actual form: successful unchanged update closes and refreshes submitted A', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  expect(screen.getByPlaceholderText('タスクのタイトルを入力')).toHaveValue('Task A');
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(mocks.detailInvalidate).toHaveBeenCalledWith(
    { id: 'a' },
    expect.anything(),
    expect.anything(),
  );
});
it('actual form: newer same-A input survives old success', async () => {
  const pending = deferred();
  mocks.writes.update.mockReturnValue(pending.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  const field = screen.getByPlaceholderText('タスクのタイトルを入力');
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  expect(field).toBeEnabled();
  fireEvent.change(field, { target: { value: 'New unsent A' } });
  expect(field).toHaveValue('New unsent A');
  await act(async () => pending.resolve({ id: 'a' }));
  await waitFor(() =>
    expect(client.getMutationCache().findAll({ mutationKey: ['update'] })[0]?.state.status).toBe(
      'success',
    ),
  );
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(field).toHaveValue('New unsent A');
  expect(
    screen.getByText(
      '送信後に入力した変更は保存されていません。入力内容を別の場所にコピーしてから、タスク編集画面を閉じて開き直し、もう一度保存してください。',
    ),
  ).toBeInTheDocument();
});
it('actual form: same tick duplicate submit runs a single mutation', async () => {
  const pending = deferred();
  mocks.writes.update.mockReturnValue(pending.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  const form = screen.getByPlaceholderText('タスクのタイトルを入力').closest('form');
  if (!form) throw new Error('form absent');
  fireEvent.submit(form);
  fireEvent.submit(form);
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  await act(async () => pending.resolve({ id: 'a' }));
  expect(mocks.writes.update).toHaveBeenCalledTimes(1);
});
it('actual form: close and reopen same A with same text retains new session', async () => {
  const pending = deferred();
  mocks.writes.update.mockReturnValue(pending.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  const field = screen.getByPlaceholderText('タスクのタイトルを入力');
  fireEvent.change(field, { target: { value: 'temporary' } });
  fireEvent.change(field, { target: { value: 'Task A' } });
  await act(async () => pending.resolve({ id: 'a' }));
  await waitFor(() =>
    expect(client.getMutationCache().findAll({ mutationKey: ['update'] })[0]?.state.status).toBe(
      'success',
    ),
  );
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(field).toHaveValue('Task A');
  expect(screen.getByText('「Task A」を更新しました。')).toBeInTheDocument();
  expect(
    screen.getByText(
      '送信後に入力した変更は保存されていません。入力内容を別の場所にコピーしてから、タスク編集画面を閉じて開き直し、もう一度保存してください。',
    ),
  ).toBeInTheDocument();
});

it('actual create: informs that newer input is unsaved and another submit creates another task', async () => {
  const pending = deferred();
  mocks.writes.create.mockReturnValue(pending.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: '新規タスク' }));
  const field = screen.getByPlaceholderText('タスクのタイトルを入力');
  fireEvent.change(field, { target: { value: 'Submitted title' } });
  fireEvent.click(screen.getByRole('button', { name: '作成' }));
  await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1));
  fireEvent.change(field, { target: { value: 'New unsaved title' } });
  await act(async () => pending.resolve({ id: 'created-task' }));
  await waitFor(() =>
    expect(client.getMutationCache().findAll({ mutationKey: ['create'] })[0]?.state.status).toBe(
      'success',
    ),
  );
  expect(field).toHaveValue('New unsaved title');
  expect(
    screen.getByText(
      '送信後に入力を変えた場合、その変更は保存されていません。このまま作成すると別のタスクになります。',
    ),
  ).toBeInTheDocument();
});

it('old A success identifies submitted A while the newer B form stays open', async () => {
  const pending = deferred();
  mocks.writes.update.mockReturnValue(pending.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task B' }));
  const field = screen.getByPlaceholderText('タスクのタイトルを入力');
  expect(field).toHaveValue('Task B');
  await act(async () => pending.resolve({ id: 'a' }));
  await waitFor(() =>
    expect(client.getMutationCache().findAll({ mutationKey: ['update'] })[0]?.state.status).toBe(
      'success',
    ),
  );
  expect(screen.getByText('「Task A」を更新しました。')).toBeInTheDocument();
  expect(screen.queryByText('「Task B」を更新しました。')).not.toBeInTheDocument();
  expect(
    screen.queryByText(
      '送信後に入力した変更は保存されていません。入力内容を別の場所にコピーしてから、タスク編集画面を閉じて開き直し、もう一度保存してください。',
    ),
  ).not.toBeInTheDocument();
  expect(field).toHaveValue('Task B');
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

it.each([
  ['task', TaskPage],
  ['my-task', MyTaskPage],
])('%s: delayed validation from closed A cannot write into reopened B', async (_route, Page) => {
  let release = () => {};
  mocks.validationWait = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount(Page);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.validationStarted).toHaveBeenCalledTimes(1));
  expect(mocks.writes.update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task B' }));
  await act(async () => release());
  expect(mocks.writes.update).not.toHaveBeenCalled();
  expect(mocks.writes.create).not.toHaveBeenCalled();
  expect(screen.getByPlaceholderText('タスクのタイトルを入力')).toHaveValue('Task B');
  mocks.validationWait = null;
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  expect(mocks.writes.update.mock.calls[0]?.[0]).toEqual(
    expect.objectContaining({ id: 'b', title: 'Task B' }),
  );
});

it.each([
  ['task', TaskPage],
  ['my-task', MyTaskPage],
])('%s: input changed during validation stays unsaved until fresh submit', async (_route, Page) => {
  let release = () => {};
  mocks.validationWait = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount(Page);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.validationStarted).toHaveBeenCalledTimes(1));
  const field = screen.getByPlaceholderText('タスクのタイトルを入力');
  fireEvent.change(field, { target: { value: 'New unsaved A' } });
  await act(async () => release());
  expect(mocks.writes.update).not.toHaveBeenCalled();
  expect(mocks.writes.create).not.toHaveBeenCalled();
  expect(field).toHaveValue('New unsaved A');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  mocks.validationWait = null;
  fireEvent.click(screen.getByRole('button', { name: '更新' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  expect(mocks.writes.update.mock.calls[0]?.[0]).toEqual(
    expect.objectContaining({ id: 'a', title: 'New unsaved A' }),
  );
});
