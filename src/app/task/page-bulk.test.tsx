// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  QueryClient,
  QueryClientProvider,
  type UseMutationOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  invalidate: vi.fn(),
  projectInvalidate: vi.fn(),
  detailInvalidate: vi.fn(),
  sessionRead: vi.fn(),
  taskRead: vi.fn(),
  projectRead: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  layoutRender: vi.fn(),
  staleEdit: null as null | (() => void),
  writes: Object.fromEntries(
    ['create', 'update', 'delete', 'bulkComplete', 'bulkDelete', 'bulkUpdateStatus'].map((name) => [
      name,
      vi.fn<(variables: Variables) => Promise<unknown>>(),
    ]),
  ) as Record<Operation, ReturnType<typeof vi.fn<(variables: Variables) => Promise<unknown>>>>,
}));
const params = new URLSearchParams();
const router = { push: mocks.push, replace: mocks.replace };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/task',
  useSearchParams: () => params,
}));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => {
    mocks.layoutRender();
    return <main>{children}</main>;
  },
}));
vi.mock('@/component/task/task-card', () => ({
  TaskCard: ({
    id,
    title,
    onClick,
    onEdit,
  }: {
    id: string;
    title: string;
    onClick: (id: string) => void;
    onEdit: (id: string) => void;
  }) => {
    mocks.staleEdit = () => onEdit(id);
    return (
      <article>
        {title}
        <button type="button" onClick={() => onClick(id)}>
          Open {title}
        </button>
      </article>
    );
  },
}));
vi.mock('@/component/task/task-dialog', () => ({ TaskDialog: () => null }));
vi.mock('@/component/task/task-detail-dialog', () => ({
  TaskDetailDialog: ({
    open,
    taskId,
    onAuthExpired,
  }: {
    open: boolean;
    taskId: string | null;
    onAuthExpired?: () => void;
  }) =>
    open ? (
      <div data-testid="task-detail">
        Detail:{taskId}
        <button type="button" onClick={onAuthExpired}>
          Report detail 401
        </button>
      </div>
    ) : null,
}));
const tasks = ['a', 'b'].map((id) => ({
  id,
  title: `Task ${id.toUpperCase()}`,
  projectId: 'p',
  status: 'TODO',
  priority: 'MEDIUM',
  description: null,
  dueDate: null,
  assignee: null,
  timeSpentMinutes: 0,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}));
const projects = [
  { id: 'p', name: 'Owner project', members: [{ userId: 'owner', role: 'OWNER' }] },
];
function query<T>(data: T) {
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
          useQuery: (_input: unknown, options: Record<string, unknown> = {}) =>
            useQuery({
              ...options,
              queryKey: ['session'],
              queryFn: mocks.sessionRead,
              initialData: { user: { id: 'owner' } },
              staleTime: Infinity,
            }),
        },
      },
      project: {
        getAll: {
          useQuery: (_input: unknown, options: Record<string, unknown> = {}) =>
            useQuery({
              ...options,
              queryKey: ['projects'],
              queryFn: mocks.projectRead,
              initialData: projects,
              staleTime: Infinity,
            }),
        },
      },
      search: { getProjectMembers: { useQuery: () => query([]) } },
      task: {
        getAll: {
          useQuery: (_input: unknown, options: Record<string, unknown> = {}) =>
            useQuery({
              ...options,
              queryKey: ['tasks'],
              queryFn: mocks.taskRead,
              initialData: tasks,
              staleTime: Infinity,
            }),
        },
        getById: { useQuery: () => query(null) },
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
function error(status: 401 | 403 | 404) {
  return Object.assign(
    new Error(
      status === 403
        ? 'この操作を行う権限がありません'
        : status === 404
          ? '対象のタスクが見つかりません'
          : 'ログインが必要です',
    ),
    {
      data: {
        httpStatus: status,
        code: { 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND' }[status],
      },
    },
  );
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
function captureClickHandler(element: HTMLElement): () => void {
  const reactPropsKey = Object.keys(element).find((key) => key.startsWith('__reactProps$'));
  if (!reactPropsKey) throw new Error('React click props were not found');
  const props = (element as unknown as Record<string, { onClick?: () => void }>)[reactPropsKey];
  if (!props?.onClick) throw new Error('React click handler was not found');
  return props.onClick;
}
function select(id: 'A' | 'B') {
  fireEvent.click(screen.getByRole('checkbox', { name: `Task ${id}を選択` }));
}
async function invoke(operation: Operation) {
  if (operation === 'bulkComplete')
    fireEvent.click(screen.getByRole('button', { name: '完了にする' }));
  if (operation === 'bulkUpdateStatus') {
    fireEvent.keyDown(screen.getByRole('button', { name: 'ステータス変更' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: '進行中' }));
  }
  if (operation === 'bulkDelete') {
    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '削除' }));
  }
}
async function settled() {
  await waitFor(() => expect(client.isMutating()).toBe(0));
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.staleEdit = null;
  for (const fn of Object.values(mocks.writes)) fn.mockResolvedValue({ count: 1 });
  mocks.detailInvalidate.mockResolvedValue(undefined);
  mocks.sessionRead.mockResolvedValue({ user: { id: 'owner' } });
  mocks.taskRead.mockResolvedValue(tasks);
  mocks.projectRead.mockResolvedValue(projects);
  mocks.invalidate.mockImplementation((_input, filters, options) =>
    client.invalidateQueries({ ...filters, queryKey: ['tasks'] }, options),
  );
  mocks.projectInvalidate.mockImplementation((_input, filters, options) =>
    client.invalidateQueries({ ...filters, queryKey: ['projects'] }, options),
  );
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});
afterEach(() => {
  cleanup();
  toast.remove();
  client?.clear();
  vi.unstubAllGlobals();
});
for (const operation of ['bulkComplete', 'bulkUpdateStatus', 'bulkDelete'] as const) {
  it(`${operation}: success control sends A and clears selection after success`, async () => {
    const pending = deferred();
    mocks.writes[operation].mockReturnValue(pending.promise);
    mount();
    select('A');
    await invoke(operation);
    await waitFor(() => expect(mocks.writes[operation]).toHaveBeenCalledTimes(1));
    expect(mocks.writes[operation].mock.calls[0]?.[0]).toEqual(
      operation === 'bulkUpdateStatus' ? { ids: ['a'], status: 'IN_PROGRESS' } : { ids: ['a'] },
    );
    await act(async () => pending.resolve({ count: 1 }));
    await settled();
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Task Aを選択' })).not.toBeChecked(),
    );
    expect(mocks.invalidate).toHaveBeenCalled();
  });
  it(`${operation}: 403 produces visible failure feedback`, async () => {
    mocks.writes[operation].mockRejectedValue(error(403));
    mount();
    select('A');
    await invoke(operation);
    await waitFor(() => expect(mocks.writes[operation]).toHaveBeenCalledTimes(1));
    await settled();
    const label = {
      bulkComplete: 'タスクの一括完了',
      bulkUpdateStatus: 'タスクのステータス変更',
      bulkDelete: 'タスクの一括削除',
    }[operation];
    await waitFor(() =>
      expect(
        screen.getByText(`${label}を実行できません。権限と対象の最新の状態を確認してください。`),
      ).toBeInTheDocument(),
    );
  });
}
it('bulkDelete: 404 preserves the confirmation dialog for the failed target', async () => {
  const pending = deferred();
  mocks.writes.bulkDelete.mockReturnValue(pending.promise);
  mount();
  select('A');
  await invoke('bulkDelete');
  await waitFor(() => expect(mocks.writes.bulkDelete).toHaveBeenCalledTimes(1));
  await act(async () => pending.reject(error(404)));
  await settled();
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeInTheDocument());
  expect(screen.getByRole('checkbox', { name: 'Task Aを選択', hidden: true })).toBeChecked();
});
it('bulkComplete: late A success does not clear B selected while A is pending', async () => {
  const pending = deferred();
  mocks.writes.bulkComplete.mockReturnValue(pending.promise);
  mount();
  select('A');
  await invoke('bulkComplete');
  await waitFor(() => expect(mocks.writes.bulkComplete).toHaveBeenCalledTimes(1));
  select('A');
  select('B');
  expect(screen.getByRole('checkbox', { name: 'Task Bを選択' })).toBeChecked();
  await act(async () => pending.resolve({ count: 1 }));
  await settled();
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Task Bを選択' })).toBeChecked());
});
it('bulkComplete: two same-tick clicks send only once', async () => {
  const pending = deferred();
  mocks.writes.bulkComplete.mockReturnValue(pending.promise);
  mount();
  select('A');
  const button = screen.getByRole('button', { name: '完了にする' });
  act(() => {
    button.click();
    button.click();
  });
  await waitFor(() => expect(mocks.writes.bulkComplete).toHaveBeenCalled());
  const callsBeforeSettlement = mocks.writes.bulkComplete.mock.calls.length;
  await act(async () => pending.resolve({ count: 1 }));
  await settled();
  expect(callsBeforeSettlement).toBe(1);
});
it('bulkComplete: 401 hides previously rendered protected task data', async () => {
  mocks.writes.bulkComplete.mockRejectedValue(error(401));
  mount();
  select('A');
  await invoke('bulkComplete');
  await waitFor(() => expect(mocks.writes.bulkComplete).toHaveBeenCalledTimes(1));
  await settled();
  await waitFor(() => expect(screen.queryByText('Task A')).not.toBeInTheDocument());
  expect(screen.queryByText('Task B')).not.toBeInTheDocument();
});

it('selection revision: reselecting the same A while its request is pending survives old success', async () => {
  const pending = deferred();
  mocks.writes.bulkComplete.mockReturnValue(pending.promise);
  mount();
  select('A');
  await invoke('bulkComplete');
  await waitFor(() => expect(mocks.writes.bulkComplete).toHaveBeenCalledTimes(1));
  select('A');
  select('A');
  expect(screen.getByRole('checkbox', { name: 'Task Aを選択' })).toBeChecked();
  await act(async () => pending.resolve({ count: 1 }));
  await settled();
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Task Aを選択' })).toBeChecked());
});

for (const second of ['bulkUpdateStatus', 'bulkDelete'] as const) {
  for (const reverse of [false, true]) {
    it(`shared synchronous lock: ${reverse ? `${second} then completion` : `completion then ${second}`} in one tick sends only first`, async () => {
      const pending = deferred();
      const firstOperation = reverse ? second : 'bulkComplete';
      const blockedOperation = reverse ? 'bulkComplete' : second;
      mocks.writes[firstOperation].mockReturnValue(pending.promise);
      mount();
      select('A');
      const complete = screen.getByRole('button', { name: '完了にする' });
      let secondary: HTMLElement;
      if (second === 'bulkUpdateStatus') {
        fireEvent.keyDown(screen.getByRole('button', { name: 'ステータス変更' }), { key: 'Enter' });
        secondary = await screen.findByRole('menuitem', { name: '進行中' });
      } else {
        fireEvent.click(screen.getByRole('button', { name: '削除' }));
        secondary = within(screen.getByRole('alertdialog')).getByRole('button', { name: '削除' });
      }
      // 無効化の描画前にも共有ガードが二重送信を止めることを確かめるためです。
      act(() => {
        if (reverse) {
          secondary.click();
          complete.click();
        } else {
          complete.click();
          secondary.click();
        }
      });
      await waitFor(() => expect(mocks.writes[firstOperation]).toHaveBeenCalledTimes(1));
      const secondaryCalls = mocks.writes[blockedOperation].mock.calls.length;
      await act(async () => pending.resolve({ count: 1 }));
      await settled();
      expect(secondaryCalls).toBe(0);
    });
  }
}

it('confirmation snapshot: refetch removing A cannot silently change confirmed A+B into only B', async () => {
  mount();
  select('A');
  select('B');
  fireEvent.click(screen.getByRole('button', { name: '削除' }));
  expect(screen.getByRole('alertdialog')).toHaveTextContent('2件');
  await act(async () => {
    client.setQueryData(['tasks'], [tasks[1]]);
  });
  await waitFor(() => expect(screen.queryByText('Task A')).not.toBeInTheDocument());
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '削除' }));
  await act(async () => {});
  await settled();
  const sent = mocks.writes.bulkDelete.mock.calls;
  expect(
    sent.some(([variables]) => JSON.stringify(variables['ids']) === JSON.stringify(['b'])),
  ).toBe(false);
  expect(sent).toHaveLength(1);
  expect(sent[0]?.[0]).toEqual({ ids: ['a', 'b'] });
});

for (const operation of ['bulkComplete', 'bulkUpdateStatus', 'bulkDelete'] as const) {
  it(`${operation}: unknown result advises checking actual state without automatic mutation retry`, async () => {
    mocks.writes[operation].mockRejectedValue(new Error('PRIVATE_TRANSPORT_DETAIL'));
    mount();
    select('A');
    await invoke(operation);
    await waitFor(() => expect(mocks.writes[operation]).toHaveBeenCalledTimes(1));
    await settled();
    expect(
      client
        .getMutationCache()
        .getAll()
        .filter((m) => m.options.mutationKey?.[0] === operation)
        .every((m) => m.options.retry === false || m.options.retry === 0),
    ).toBe(true);
    await waitFor(() =>
      expect(
        screen.queryAllByText(/結果.*確認|確認.*結果|状態.*確認|確認.*状態/).length,
      ).toBeGreaterThan(0),
    );
    expect(screen.queryByText('PRIVATE_TRANSPORT_DETAIL')).not.toBeInTheDocument();
    expect(mocks.writes[operation]).toHaveBeenCalledTimes(1);
  });
  it(`${operation}: 403 refreshes roles and stops offering OWNER-only actions after downgrade`, async () => {
    mocks.projectRead.mockResolvedValue([
      { ...projects[0], members: [{ userId: 'owner', role: 'VIEWER' }] },
    ]);
    mocks.writes[operation].mockRejectedValue(error(403));
    mount();
    select('A');
    await invoke(operation);
    await waitFor(() => expect(mocks.writes[operation]).toHaveBeenCalledTimes(1));
    await settled();
    await waitFor(() => expect(mocks.projectRead).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.queryByRole('checkbox', { name: 'Task Aを選択', hidden: true }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('button', { name: '完了にする', hidden: true }),
    ).not.toBeInTheDocument();
  });
}

it('new contract: pending delete can cancel but cannot reopen until settled; then B can be confirmed', async () => {
  const pending = deferred();
  mocks.writes.bulkDelete.mockReturnValue(pending.promise);
  mount();
  select('A');
  await invoke('bulkDelete');
  await waitFor(() => expect(mocks.writes.bulkDelete).toHaveBeenCalledTimes(1));
  const cancel = within(screen.getByRole('alertdialog')).getByRole('button', {
    name: 'キャンセル',
  });
  expect(cancel).toBeEnabled();
  fireEvent.click(cancel);
  select('A');
  select('B');
  const deleteTrigger = screen.getByRole('button', { name: '削除' });
  expect(deleteTrigger).toBeDisabled();
  fireEvent.click(deleteTrigger);
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(mocks.writes.bulkDelete).toHaveBeenCalledTimes(1);
  await act(async () => pending.resolve({ count: 1 }));
  await settled();
  await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeEnabled());
  expect(screen.getByRole('checkbox', { name: 'Task Bを選択' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: '削除' }));
  const dialog = screen.getByRole('alertdialog');
  expect(dialog).toHaveTextContent('1件');
  fireEvent.click(within(dialog).getByRole('button', { name: '削除' }));
  await waitFor(() => expect(mocks.writes.bulkDelete).toHaveBeenCalledTimes(2));
  expect(mocks.writes.bulkDelete.mock.calls[1]?.[0]).toEqual({ ids: ['b'] });
});
it('new contract: every bulk trigger is disabled while completion is pending but selections remain usable', async () => {
  const pending = deferred();
  mocks.writes.bulkComplete.mockReturnValue(pending.promise);
  mount();
  select('A');
  await invoke('bulkComplete');
  await waitFor(() => expect(mocks.writes.bulkComplete).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole('button', { name: '完了にする' })).toBeDisabled());
  expect(screen.getByRole('button', { name: 'ステータス変更' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '削除' })).toBeDisabled();
  select('B');
  expect(screen.getByRole('checkbox', { name: 'Task Bを選択' })).toBeChecked();
  await act(async () => pending.resolve({ count: 1 }));
  await settled();
});
it('new contract: a refetch cannot replace the original confirmation snapshot IDs', async () => {
  mount();
  select('A');
  select('B');
  fireEvent.click(screen.getByRole('button', { name: '削除' }));
  expect(screen.getByRole('alertdialog')).toHaveTextContent('2件');
  await act(async () => {
    client.setQueryData(['tasks'], [tasks[1]]);
  });
  await waitFor(() => expect(screen.queryByText('Task A')).not.toBeInTheDocument());
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '削除' }));
  await waitFor(() => expect(mocks.writes.bulkDelete).toHaveBeenCalledTimes(1));
  expect(mocks.writes.bulkDelete.mock.calls[0]?.[0]).toEqual({ ids: ['a', 'b'] });
});
for (const operation of ['bulkComplete', 'bulkUpdateStatus', 'bulkDelete'] as const) {
  it(`new contract: ${operation} unknown result refreshes submitted detail IDs despite newer selection`, async () => {
    const pending = deferred();
    mocks.writes[operation].mockReturnValue(pending.promise);
    mount();
    select('A');
    await invoke(operation);
    await waitFor(() => expect(mocks.writes[operation]).toHaveBeenCalledTimes(1));
    if (operation === 'bulkDelete') {
      fireEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'キャンセル' }),
      );
    }
    select('A');
    select('B');
    await act(async () => pending.reject(new Error('PRIVATE_TRANSPORT_DETAIL')));
    await settled();
    await waitFor(() =>
      expect(mocks.detailInvalidate.mock.calls.map((call) => call[0])).toContainEqual({ id: 'a' }),
    );
    expect(mocks.detailInvalidate.mock.calls.map((call) => call[0])).not.toContainEqual({
      id: 'b',
    });
    expect(mocks.writes[operation]).toHaveBeenCalledTimes(1);
  });
}

for (const operation of ['bulkComplete', 'bulkUpdateStatus'] as const) {
  it(`additional: ${operation} preserves same-ID reselection while select-all preserves existing versions`, async () => {
    const pending = deferred();
    mocks.writes[operation].mockReturnValue(pending.promise);
    mount();
    select('A');
    await invoke(operation);
    await waitFor(() => expect(mocks.writes[operation]).toHaveBeenCalledTimes(1));
    select('A');
    select('A');
    fireEvent.click(screen.getByRole('checkbox', { name: '表示中のタスクをすべて選択' }));
    await act(async () => pending.resolve({ count: 1 }));
    await settled();
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Task Aを選択' })).toBeChecked(),
    );
    expect(screen.getByRole('checkbox', { name: 'Task Bを選択' })).toBeChecked();
  });
}
it('additional: select-all does not revise already selected A; old completion clears A but keeps newly selected B', async () => {
  const pending = deferred();
  mocks.writes.bulkComplete.mockReturnValue(pending.promise);
  mount();
  select('A');
  await invoke('bulkComplete');
  await waitFor(() => expect(mocks.writes.bulkComplete).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('checkbox', { name: '表示中のタスクをすべて選択' }));
  await act(async () => pending.resolve({ count: 1 }));
  await settled();
  await waitFor(() =>
    expect(screen.getByRole('checkbox', { name: 'Task Aを選択' })).not.toBeChecked(),
  );
  expect(screen.getByRole('checkbox', { name: 'Task Bを選択' })).toBeChecked();
});
it('additional: actual delete success removes submitted A even if A was reselected after cancellation', async () => {
  const pending = deferred();
  mocks.writes.bulkDelete.mockReturnValue(pending.promise);
  mount();
  select('A');
  await invoke('bulkDelete');
  await waitFor(() => expect(mocks.writes.bulkDelete).toHaveBeenCalledTimes(1));
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'キャンセル' }),
  );
  select('A');
  select('A');
  select('B');
  await act(async () => pending.resolve({ count: 1 }));
  await settled();
  await waitFor(() =>
    expect(screen.getByRole('checkbox', { name: 'Task Aを選択' })).not.toBeChecked(),
  );
  expect(screen.getByRole('checkbox', { name: 'Task Bを選択' })).toBeChecked();
});
it('additional: pending cancel then 403 never reopens delete confirmation', async () => {
  const pending = deferred();
  mocks.writes.bulkDelete.mockReturnValue(pending.promise);
  mount();
  select('A');
  await invoke('bulkDelete');
  await waitFor(() => expect(mocks.writes.bulkDelete).toHaveBeenCalledTimes(1));
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'キャンセル' }),
  );
  await act(async () => pending.reject(error(403)));
  await settled();
  await waitFor(() => expect(mocks.projectRead).toHaveBeenCalled());
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});
it('additional: refresh rejection keeps successful write successful and releases lock', async () => {
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    mocks.invalidate.mockRejectedValue(new Error('SYNTHETIC_REFETCH_FAILURE'));
    mount();
    select('A');
    await invoke('bulkComplete');
    await waitFor(() => expect(mocks.writes.bulkComplete).toHaveBeenCalledTimes(1));
    await settled();
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Task Aを選択' })).not.toBeChecked(),
    );
    expect(
      client
        .getMutationCache()
        .getAll()
        .find((m) => m.options.mutationKey?.[0] === 'bulkComplete')?.state.status,
    ).toBe('success');
    await waitFor(() =>
      expect(screen.queryAllByText(/最新の表示を取得できません/).length).toBeGreaterThan(0),
    );
    expect(screen.queryByText(/一括完了.*実行できません/)).not.toBeInTheDocument();
    select('B');
    await invoke('bulkComplete');
    await waitFor(() => expect(mocks.writes.bulkComplete).toHaveBeenCalledTimes(2));
    await settled();
  } finally {
    logged.mockRestore();
  }
});
it('additional: real task query 401 hides retained data, suppresses retries and disables protected queries', async () => {
  mount();
  expect(screen.getByText('Task A')).toBeInTheDocument();
  mocks.taskRead.mockRejectedValue(error(401));
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['tasks'] });
  });
  await waitFor(() => expect(screen.queryByText('Task A')).not.toBeInTheDocument());
  expect(mocks.taskRead).toHaveBeenCalledTimes(1);
  for (const key of ['tasks', 'projects', 'session'])
    expect(
      client
        .getQueryCache()
        .find({ queryKey: [key] })
        ?.isActive(),
    ).toBe(false);
  expect(client.getQueryData(['tasks'])).toEqual(tasks);
});
it('additional: successful null session hides protected data and disables further protected queries', async () => {
  mount();
  expect(screen.getByText('Task A')).toBeInTheDocument();
  mocks.sessionRead.mockResolvedValue(null);
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['session'] });
  });
  await waitFor(() => expect(screen.queryByText('Task A')).not.toBeInTheDocument());
  expect(mocks.sessionRead).toHaveBeenCalledTimes(1);
  for (const key of ['tasks', 'projects', 'session'])
    expect(
      client
        .getQueryCache()
        .find({ queryKey: [key] })
        ?.isActive(),
    ).toBe(false);
});

it('root: actual refetch failure is reported without reclassifying the successful write', async () => {
  mount();
  client.setQueryDefaults(['tasks'], { retryDelay: 0 });
  mocks.taskRead.mockRejectedValue(
    Object.assign(new Error('synthetic network unavailable'), { data: { httpStatus: 500 } }),
  );
  select('A');
  await invoke('bulkComplete');
  await settled();
  await waitFor(() => expect(mocks.taskRead).toHaveBeenCalledTimes(4));
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await waitFor(() =>
    expect(
      screen.getByText('最新の表示を取得できませんでした。再表示して操作結果を確認してください。'),
    ).toBeInTheDocument(),
  );
  expect(
    client.getMutationCache().findAll({ mutationKey: ['bulkComplete'] })[0]?.state.status,
  ).toBe('success');
  expect(mocks.writes.bulkComplete).toHaveBeenCalledTimes(1);
});
it('root: successful bulk deletion closes only the deleted task detail', async () => {
  const pending = deferred();
  mocks.writes.bulkDelete.mockReturnValue(pending.promise);
  mount();
  select('A');
  await invoke('bulkDelete');
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'キャンセル' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open Task A' }));
  expect(screen.getByTestId('task-detail')).toHaveTextContent('Detail:a');
  await act(async () => pending.resolve({ count: 1 }));
  await settled();
  await waitFor(() => expect(screen.queryByTestId('task-detail')).not.toBeInTheDocument());
});
it('root: old bulk deletion must retain a different current task detail', async () => {
  const pending = deferred();
  mocks.writes.bulkDelete.mockReturnValue(pending.promise);
  mount();
  select('A');
  await invoke('bulkDelete');
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'キャンセル' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open Task B' }));
  await act(async () => pending.resolve({ count: 1 }));
  await settled();
  expect(screen.getByTestId('task-detail')).toHaveTextContent('Detail:b');
});

it('root: more than100 selected tasks cannot trigger any bulk write', async () => {
  mount();
  act(() =>
    client.setQueryData(
      ['tasks'],
      Array.from({ length: 101 }, (_, i) => ({ ...tasks[0], id: `task-${i}`, title: `Task ${i}` })),
    ),
  );
  await screen.findByText('Task 100');
  fireEvent.click(screen.getByRole('checkbox', { name: '表示中のタスクをすべて選択' }));
  expect(
    screen.getByText('一括操作は100件までです。選択する件数を減らしてください。'),
  ).toBeInTheDocument();
  for (const name of ['完了にする', 'ステータス変更', '削除'])
    expect(screen.getByRole('button', { name })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '完了にする' }));
  expect(mocks.writes.bulkComplete).not.toHaveBeenCalled();
  expect(mocks.writes.bulkDelete).not.toHaveBeenCalled();
  expect(mocks.writes.bulkUpdateStatus).not.toHaveBeenCalled();
});

it('detail reported 401 hides page cache and all dialogs without redirect', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Open Task A' }));
  expect(screen.getByTestId('task-detail')).toHaveTextContent('Detail:a');
  fireEvent.click(screen.getByRole('button', { name: 'Report detail 401' }));
  await waitFor(() => expect(screen.queryByText('Task A')).not.toBeInTheDocument());
  expect(screen.queryByTestId('task-detail')).not.toBeInTheDocument();
  expect(mocks.push).not.toHaveBeenCalled();
  expect(mocks.replace).not.toHaveBeenCalled();
  for (const key of ['tasks', 'projects', 'session'])
    expect(
      client
        .getQueryCache()
        .find({ queryKey: [key] })
        ?.isActive(),
    ).toBe(false);
});

it('stale create and edit callbacks cannot reopen forms after auth expiry', async () => {
  mount();
  const staleCreate = captureClickHandler(screen.getByRole('button', { name: '新規タスク' }));
  const staleEdit = mocks.staleEdit;
  if (!staleEdit) throw new Error('Stale edit callback was not captured');

  fireEvent.click(screen.getByRole('button', { name: 'Open Task A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Report detail 401' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('main')).toContainElement(screen.getByRole('alert'));
  mocks.layoutRender.mockClear();

  act(() => {
    staleCreate();
    staleEdit();
  });

  expect(mocks.layoutRender).not.toHaveBeenCalled();
});
