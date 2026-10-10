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
  searchParams: new URLSearchParams(),
  emptyTasks: false,
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
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/task',
  useSearchParams: () => mocks.searchParams,
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
vi.mock('@/component/task/task-dialog', () => ({
  TaskDialog: ({
    open,
    onClose,
    onSubmit,
    initialData,
    isPending = false,
  }: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Variables) => void;
    initialData?: Variables;
    isPending?: boolean;
  }) =>
    open ? (
      <div role="dialog" aria-label="task form">
        <span>Editing:{String(initialData?.['id'] ?? 'new')}</span>
        <button type="button" onClick={onClose}>
          Close form
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            onSubmit({
              ...(initialData?.['id']
                ? { id: initialData['id'], expectedUpdatedAt: initialData['expectedUpdatedAt'] }
                : {}),
              title: String(initialData?.['title'] ?? 'Created'),
              status: 'TODO',
              priority: 'MEDIUM',
              projectId: 'p',
            })
          }
        >
          Submit form
        </button>
      </div>
    ) : null,
}));
vi.mock('@/component/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
  }) => (
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));
vi.mock('@/component/ui/delete-confirm-dialog', () => ({ DeleteConfirmDialog: () => null }));
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
        getProjectMembers: {
          useQuery: () =>
            staticQuery([{ id: 'owner', name: 'Owner', email: 'owner@example.test' }]),
        },
      },
      task: {
        getAll: { useQuery: () => staticQuery(mocks.emptyTasks ? [] : tasks) },
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
function mount() {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <TaskPage />
      <Toaster />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.searchParams = new URLSearchParams();
  mocks.emptyTasks = false;
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

it('pending task creation blocks a second submission', async () => {
  const pending = deferred();
  mocks.writes.create.mockReturnValue(pending.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: '新規タスク' }));
  const submit = screen.getByRole('button', { name: 'Submit form' });
  fireEvent.click(submit);
  await waitFor(() => expect(mocks.writes.create).toHaveBeenCalledTimes(1)); // positive control: first click submits
  expect(submit).toBeDisabled();
  fireEvent.click(submit);
  expect(mocks.writes.create).toHaveBeenCalledTimes(1);
  await act(async () => pending.resolve({ id: 'new-task' }));
});

it('delayed A update preserves the newer B form and refreshes A', async () => {
  const pending = deferred();
  mocks.writes.update.mockReturnValue(pending.promise);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  expect(screen.getByText('Editing:a')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
  await waitFor(() => expect(mocks.writes.update).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Close form' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task B' }));
  expect(screen.getByText('Editing:b')).toBeInTheDocument(); // positive control: B really is open
  await act(async () => pending.resolve({ id: 'new-task' }));
  await waitFor(() => expect(screen.getByText('Editing:b')).toBeInTheDocument());
  expect(mocks.detailInvalidate).toHaveBeenCalledWith(
    { id: 'a' },
    expect.anything(),
    expect.anything(),
  );
  expect(mocks.detailInvalidate).not.toHaveBeenCalledWith(
    { id: 'b' },
    expect.anything(),
    expect.anything(),
  );
});

it('rejected task create shows fixed failure guidance', async () => {
  mocks.writes.create.mockRejectedValue(
    Object.assign(new Error('PRIVATE_BACKEND_403'), {
      data: { code: 'FORBIDDEN', httpStatus: 403 },
    }),
  );
  mount();
  fireEvent.click(screen.getByRole('button', { name: '新規タスク' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
  await waitFor(() =>
    expect(client.getMutationCache().findAll({ mutationKey: ['create'] })[0]?.state.status).toBe(
      'error',
    ),
  );
  expect(screen.getByRole('dialog', { name: 'task form' })).toBeInTheDocument(); // positive control: failed request returned and form remains
  expect(
    screen.getByText('タスクの作成を実行できません。権限と対象の最新の状態を確認してください。'),
  ).toBeInTheDocument();
  expect(screen.queryByText('PRIVATE_BACKEND_403')).not.toBeInTheDocument();
});

it.each([
  'create',
  'update',
] as const)('%s401 hides protected page and does not retry', async (op) => {
  mocks.writes[op].mockRejectedValue(
    Object.assign(new Error('SECRET'), { data: { httpStatus: 401 } }),
  );
  mount();
  fireEvent.click(
    screen.getByRole('button', { name: op === 'create' ? '新規タスク' : 'Edit Task A' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
  expect(await screen.findByRole('button', { name: 'ログイン画面へ' })).toBeInTheDocument();
  expect(screen.queryByText('Task A')).not.toBeInTheDocument();
  expect(mocks.writes[op]).toHaveBeenCalledTimes(1);
});

it('update409 keeps form, refreshes submitted target and gives fixed recovery', async () => {
  mocks.writes.update.mockRejectedValue(
    Object.assign(new Error('SECRET'), { data: { httpStatus: 409 } }),
  );
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
  expect(
    await screen.findByText(
      'タスクの更新を現在の状態では実行できません。入力を控えてから画面を閉じ、最新の表示で開き直してください。',
    ),
  ).toBeInTheDocument();
  expect(screen.getByText('Editing:a')).toBeInTheDocument();
  await waitFor(() =>
    expect(mocks.detailInvalidate).toHaveBeenCalledWith(
      { id: 'a' },
      expect.anything(),
      expect.anything(),
    ),
  );
  expect(mocks.invalidate).toHaveBeenCalled();
});

it('successful update and failed refresh remain a successful write', async () => {
  mocks.invalidate.mockRejectedValue(new Error('refresh failed'));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Task A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit form' }));
  expect(
    await screen.findByText(
      '最新の表示を取得できませんでした。再表示して操作結果を確認してください。',
    ),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(client.getMutationCache().findAll({ mutationKey: ['update'] })[0]?.state.status).toBe(
      'success',
    ),
  );
  expect(screen.queryByText(/タスクの更新の結果を確認できません/)).not.toBeInTheDocument();
});

it('unfiltered empty results retain first-task guidance', async () => {
  mocks.emptyTasks = true;
  mount();
  expect(await screen.findByText('最初のタスクを作成しましょう！')).toBeVisible();
});

it.each([
  { index: 0, value: 'p', label: 'project' },
  { index: 1, value: 'TODO', label: 'status' },
  { index: 2, value: 'HIGH', label: 'priority' },
  { index: 3, value: 'owner', label: 'assignee' },
])('filtered empty results omit first-task guidance: $label', async ({ index, value }) => {
  mocks.emptyTasks = true;
  mount();
  const control = screen.getAllByRole('combobox')[index];
  if (!control) throw new Error(`Missing filter control ${index}`);
  fireEvent.change(control, { target: { value } });
  expect(await screen.findByText('タスクが見つかりません。')).toBeVisible();
  expect(screen.queryByText('最初のタスクを作成しましょう！')).not.toBeInTheDocument();
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
