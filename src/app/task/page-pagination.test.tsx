// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ReactNode, StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskPage from '@/app/task/page';

type TaskInput = {
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  limit?: number;
  offset?: number;
};

type MutationOptions = {
  onMutate?: (variables: Record<string, unknown>) => unknown;
  onSuccess?: (
    data: unknown,
    variables: Record<string, unknown>,
    context: unknown,
  ) => void | Promise<void>;
};

const mocks = vi.hoisted(() => ({
  params: new URLSearchParams(),
  pageZero: [] as Array<Record<string, unknown>>,
  pageOne: [] as Array<Record<string, unknown>>,
  fetching: false,
  routerReplace: vi.fn(),
  taskInputs: [] as TaskInput[],
  pendingUpdate: null as null | {
    options: MutationOptions;
    variables: Record<string, unknown>;
    context: unknown;
  },
}));

const PROJECT_ONE_ID = 'cm11111111111111111111111';
const PROJECT_TWO_ID = 'cm22222222222222222222222';

const buildTask = (index: number) => ({
  id: `task-${index}`,
  title: `Task ${index}`,
  projectId: PROJECT_ONE_ID,
  status: 'TODO',
  priority: 'MEDIUM',
  description: null,
  dueDate: null,
  estimatedHours: null,
  assigneeId: null,
  assignee: null,
  timeSpentMinutes: 0,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

const projects = [
  {
    id: PROJECT_ONE_ID,
    name: 'Project',
    members: [{ userId: 'owner', role: 'OWNER' }],
  },
];

const query = <T,>(data: T) => ({
  data,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/task',
  useRouter: () => ({ push: vi.fn(), replace: mocks.routerReplace }),
  useSearchParams: () => mocks.params,
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/component/task/task-card', () => ({
  TaskCard: ({
    id,
    title,
    onEdit,
    onClick,
  }: {
    id: string;
    title: string;
    onEdit: (id: string) => void;
    onClick: (id: string) => void;
  }) => (
    <article>
      <span>{title}</span>
      <button type="button" onClick={() => onEdit(id)}>
        Edit {title}
      </button>
      <button type="button" onClick={() => onClick(id)}>
        Open {title}
      </button>
    </article>
  ),
}));
vi.mock('@/component/task/task-detail-dialog', () => ({
  TaskDetailDialog: ({
    open,
    taskId,
    onClose,
  }: {
    open: boolean;
    taskId: string | null;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="task detail">
        <span>Detail:{taskId}</span>
        <button type="button" onClick={onClose}>
          Close detail
        </button>
      </div>
    ) : null,
}));
vi.mock('@/component/task/task-dialog', () => ({
  TaskDialog: ({
    open,
    initialData,
    onSubmit,
  }: {
    open: boolean;
    initialData?: Record<string, unknown>;
    onSubmit: (data: Record<string, unknown>, isCurrent: () => boolean) => void;
  }) =>
    open ? (
      <div role="dialog">
        <span>Editing:{String(initialData?.['id'] ?? 'new')}</span>
        <button
          type="button"
          onClick={() =>
            onSubmit(
              {
                id: initialData?.['id'],
                title: initialData?.['title'] ?? 'Task',
                status: 'TODO',
                priority: 'MEDIUM',
                projectId: PROJECT_ONE_ID,
              },
              () => true,
            )
          }
        >
          Submit
        </button>
      </div>
    ) : null,
}));
vi.mock('@/component/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));
vi.mock('@/component/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    checked?: boolean | 'indeterminate';
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked === true}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}));
vi.mock('@/component/ui/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <span>{children}</span>,
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
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
}));
vi.mock('@/component/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/component/ui/delete-confirm-dialog', () => ({ DeleteConfirmDialog: () => null }));
vi.mock('@/component/ui/loading-spinner', () => ({ PageLoadingSpinner: () => <div>loading</div> }));
vi.mock('@/trpc/react', () => {
  const mutation = (operation: string) => ({
    useMutation: (options: MutationOptions) => ({
      mutate: (variables: Record<string, unknown>) => {
        const context = options.onMutate?.(variables);
        if (operation === 'update') mocks.pendingUpdate = { options, variables, context };
      },
      isPending: false,
    }),
  });
  return {
    api: {
      auth: {
        getSession: {
          useQuery: () => ({ data: { user: { id: 'owner' } }, isSuccess: true, error: null }),
        },
      },
      project: { getAll: { useQuery: () => query(projects) } },
      search: {
        getProjectMembers: {
          useQuery: () => query([{ id: 'owner', name: 'Owner', email: 'owner@example.test' }]),
        },
      },
      task: {
        getAll: {
          useQuery: (input: TaskInput) => {
            mocks.taskInputs.push(input);
            return {
              ...query(input.offset === 100 ? mocks.pageOne : mocks.pageZero),
              isFetching: mocks.fetching,
            };
          },
        },
        getById: { useQuery: () => query(null) },
        create: mutation('create'),
        update: mutation('update'),
        delete: mutation('delete'),
        bulkComplete: mutation('bulkComplete'),
        bulkDelete: mutation('bulkDelete'),
        bulkUpdateStatus: mutation('bulkUpdateStatus'),
      },
      useUtils: () => ({
        task: {
          getAll: { invalidate: vi.fn().mockResolvedValue(undefined) },
          getById: { invalidate: vi.fn().mockResolvedValue(undefined) },
        },
        project: { getAll: { invalidate: vi.fn().mockResolvedValue(undefined) } },
      }),
    },
  };
});

beforeEach(() => {
  mocks.params = new URLSearchParams();
  mocks.pageZero = Array.from({ length: 100 }, (_, index) => buildTask(index + 1));
  mocks.pageOne = [buildTask(101)];
  mocks.fetching = false;
  mocks.routerReplace.mockReset();
  mocks.taskInputs = [];
  mocks.pendingUpdate = null;
});

describe('タスク一覧のページ移動', () => {
  it('初回のURLフィルターを1ページ目の取得条件として読み込む', async () => {
    mocks.params = new URLSearchParams(`project=${PROJECT_ONE_ID}&status=DONE`);
    const view = render(
      <StrictMode>
        <TaskPage />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(mocks.taskInputs.at(-1)).toMatchObject({
        projectId: PROJECT_ONE_ID,
        status: 'DONE',
        limit: 100,
        offset: 0,
      });
    });
    expect(mocks.routerReplace).not.toHaveBeenCalled();

    mocks.params = new URLSearchParams(`project=${PROJECT_ONE_ID}&status=DONE`);
    view.rerender(<TaskPage />);
    await waitFor(() => {
      expect(mocks.taskInputs.at(-1)).toMatchObject({
        projectId: PROJECT_ONE_ID,
        status: 'DONE',
        offset: 0,
      });
    });
    expect(mocks.routerReplace).not.toHaveBeenCalled();
  });

  it('不正なURLステータスはStrict Modeでも正規URLへ取り除く', async () => {
    mocks.params = new URLSearchParams('status=INVALID');
    render(
      <StrictMode>
        <TaskPage />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(mocks.routerReplace).toHaveBeenCalledWith('/task', { scroll: false });
    });
  });

  it.each([
    '',
    'foo',
  ])('不正なURLプロジェクト %j はallへ戻し、有効な条件は保つ', async (project) => {
    mocks.params = new URLSearchParams({ project, status: 'DONE' });
    render(
      <StrictMode>
        <TaskPage />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(mocks.taskInputs.at(-1)).toMatchObject({ status: 'DONE', limit: 100, offset: 0 });
      expect(mocks.taskInputs.at(-1)?.projectId).toBeUndefined();
      expect(mocks.routerReplace).toHaveBeenCalledWith('/task?status=DONE', { scroll: false });
    });
  });

  it('詳細を閉じた直後のフィルター変更でもtaskIdを復活させず、他の条件を保つ', async () => {
    mocks.params = new URLSearchParams('taskId=task-1&status=TODO');
    render(<TaskPage />);

    expect(await screen.findByText('Detail:task-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close detail' }));
    expect(mocks.routerReplace).toHaveBeenLastCalledWith('/task?status=TODO', { scroll: false });

    const statusFilter = screen.getAllByRole('combobox')[1];
    if (!statusFilter) throw new Error('Missing status filter');
    fireEvent.change(statusFilter, { target: { value: 'DONE' } });

    await waitFor(() => {
      expect(mocks.routerReplace).toHaveBeenLastCalledWith('/task?status=DONE', { scroll: false });
    });
    expect(screen.queryByText('Detail:task-1')).not.toBeInTheDocument();
  });

  it('詳細を閉じてURL反映後に同じtaskIdへ履歴移動すると再び開く', async () => {
    mocks.params = new URLSearchParams('taskId=task-1&status=TODO');
    const view = render(<TaskPage />);
    expect(await screen.findByText('Detail:task-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close detail' }));
    mocks.params = new URLSearchParams('status=TODO');
    view.rerender(<TaskPage />);
    expect(screen.queryByText('Detail:task-1')).not.toBeInTheDocument();

    mocks.params = new URLSearchParams('taskId=task-1&status=TODO');
    view.rerender(<TaskPage />);
    expect(await screen.findByText('Detail:task-1')).toBeInTheDocument();
  });

  it('閉じたtaskIdのURL反映前でも別taskIdへの移動は開く', async () => {
    mocks.params = new URLSearchParams('taskId=task-1');
    const view = render(<TaskPage />);
    expect(await screen.findByText('Detail:task-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close detail' }));
    mocks.params = new URLSearchParams('taskId=task-2');
    view.rerender(<TaskPage />);

    expect(await screen.findByText('Detail:task-2')).toBeInTheDocument();
  });

  it('edit遷移でdismissalを解除し、同じtaskIdの詳細へ戻ると開く', async () => {
    mocks.params = new URLSearchParams('taskId=task-1');
    const view = render(<TaskPage />);
    expect(await screen.findByText('Detail:task-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close detail' }));
    mocks.params = new URLSearchParams('taskId=task-1&edit=true');
    view.rerender(<TaskPage />);
    expect(screen.queryByText('Detail:task-1')).not.toBeInTheDocument();

    mocks.params = new URLSearchParams('taskId=task-1');
    view.rerender(<TaskPage />);
    expect(await screen.findByText('Detail:task-1')).toBeInTheDocument();
  });

  it('101件目へ進んで戻れ、ページ移動時に表示中ページの選択を消す', () => {
    render(<TaskPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Task 1を選択' }));
    expect(screen.getByText('(1件選択中)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.getByText('Task 101')).toBeInTheDocument();
    expect(screen.queryByText('(1件選択中)')).not.toBeInTheDocument();
    expect(mocks.taskInputs.at(-1)).toMatchObject({ limit: 100, offset: 100 });

    fireEvent.click(screen.getByRole('button', { name: '前へ' }));
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(mocks.taskInputs.at(-1)).toMatchObject({ limit: 100, offset: 0 });
  });

  it('100件ちょうどの次ページが空でも全体の空表示にせず戻り方を示す', () => {
    mocks.pageOne = [];
    render(<TaskPage />);

    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    expect(screen.getByText('このページにはタスクがありません。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '前へ' })).toBeEnabled();
    expect(screen.queryByText('最初のタスクを作成しましょう！')).not.toBeInTheDocument();
  });

  it.each([
    { index: 0, value: PROJECT_ONE_ID, expected: { projectId: PROJECT_ONE_ID } },
    { index: 1, value: 'DONE', expected: { status: 'DONE' } },
    { index: 2, value: 'HIGH', expected: { priority: 'HIGH' } },
    { index: 3, value: 'owner', expected: { assigneeId: 'owner' } },
  ])('フィルター変更で1ページ目へ戻る: $value', ({ index, value, expected }) => {
    render(<TaskPage />);
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    const filter = screen.getAllByRole('combobox')[index];
    if (!filter) throw new Error(`Missing filter ${index}`);
    fireEvent.change(filter, { target: { value } });

    expect(mocks.taskInputs.at(-1)).toMatchObject({ ...expected, limit: 100, offset: 0 });
  });

  it('取得中は前後ページへ移動できない', () => {
    mocks.fetching = true;
    render(<TaskPage />);

    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled();
  });

  it('旧ページの更新応答が新ページで開いたフォームを閉じない', async () => {
    render(<TaskPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Task 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(mocks.pendingUpdate).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Task 101' }));
    expect(screen.getByText('Editing:task-101')).toBeInTheDocument();

    const pending = mocks.pendingUpdate;
    if (!pending) throw new Error('update was not captured');
    await act(async () => {
      await pending.options.onSuccess?.({}, pending.variables, pending.context);
    });

    await waitFor(() => expect(screen.getByText('Editing:task-101')).toBeInTheDocument());
  });

  it('URLのフィルター変更をページ境界として選択と旧フォーム応答を破棄する', async () => {
    const view = render(<TaskPage />);
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Task 101を選択' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Task 101' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(mocks.pendingUpdate).not.toBeNull();

    mocks.params = new URLSearchParams(`project=${PROJECT_TWO_ID}`);
    view.rerender(<TaskPage />);

    await waitFor(() => {
      expect(mocks.taskInputs.at(-1)).toMatchObject({
        projectId: PROJECT_TWO_ID,
        limit: 100,
        offset: 0,
      });
    });
    expect(mocks.routerReplace).not.toHaveBeenCalledWith('/task', { scroll: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Task 1' }));
    expect(screen.getByText('Editing:task-1')).toBeInTheDocument();

    const pending = mocks.pendingUpdate;
    if (!pending) throw new Error('update was not captured');
    await act(async () => {
      await pending.options.onSuccess?.({}, pending.variables, pending.context);
    });
    await waitFor(() => expect(screen.getByText('Editing:task-1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.getByRole('checkbox', { name: 'Task 101を選択' })).not.toBeChecked();
  });

  it.each([
    { index: 0, value: PROJECT_ONE_ID, url: `project=${PROJECT_ONE_ID}` },
    { index: 1, value: 'DONE', url: 'status=DONE' },
  ])('UIフィルターのURL追随で新しい1ページ目のフォームを閉じない: $value', async ({
    index,
    value,
    url,
  }) => {
    const view = render(<TaskPage />);
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    const filter = screen.getAllByRole('combobox')[index];
    if (!filter) throw new Error(`Missing filter ${index}`);
    fireEvent.change(filter, { target: { value } });
    await waitFor(() => expect(mocks.routerReplace).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Edit Task 1' }));
    expect(screen.getByText('Editing:task-1')).toBeInTheDocument();

    mocks.params = new URLSearchParams(url);
    view.rerender(<TaskPage />);

    await waitFor(() => expect(screen.getByText('Editing:task-1')).toBeInTheDocument());
  });
});
