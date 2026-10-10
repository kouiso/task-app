// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyTasksPage from '@/app/my-task/page';

type TaskInput = { status?: string; projectId?: string; limit?: number; offset?: number };

const mocks = vi.hoisted(() => ({
  pageZero: [] as Array<Record<string, unknown>>,
  pageOne: [] as Array<Record<string, unknown>>,
  fetching: false,
  taskInputs: [] as TaskInput[],
  changeTab: (_value: string) => {},
}));

const buildTask = (index: number) => ({
  id: `task-${index}`,
  title: `My Task ${index}`,
  projectId: 'project-1',
  status: 'TODO',
  priority: 'MEDIUM',
  description: null,
  dueDate: null,
  estimatedHours: null,
  assigneeId: 'owner',
  assignee: null,
  timeSpentMinutes: 0,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

const query = <T,>(data: T) => ({
  data,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/component/task/task-card', () => ({
  TaskCard: ({ title }: { title: string }) => <article>{title}</article>,
}));
vi.mock('@/component/task/task-dialog', () => ({ TaskDialog: () => null }));
vi.mock('@/component/ui/delete-confirm-dialog', () => ({ DeleteConfirmDialog: () => null }));
vi.mock('@/component/ui/loading-spinner', () => ({ PageLoadingSpinner: () => <div>loading</div> }));
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
vi.mock('@/component/ui/tabs', () => ({
  Tabs: ({
    children,
    onValueChange,
  }: {
    children: ReactNode;
    onValueChange: (value: string) => void;
  }) => {
    mocks.changeTab = onValueChange;
    return <div>{children}</div>;
  },
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ value, children }: { value: string; children: ReactNode }) => (
    <button type="button" data-value={value} onClick={() => mocks.changeTab(value)}>
      {children}
    </button>
  ),
}));
vi.mock('@/trpc/react', () => ({
  api: {
    auth: { getCurrentUser: { useQuery: () => query({ id: 'owner' }) } },
    project: {
      getAll: {
        useQuery: () =>
          query([
            {
              id: 'project-1',
              name: 'Project',
              members: [{ userId: 'owner', role: 'OWNER' }],
            },
          ]),
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
      update: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      delete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    useUtils: () => ({
      task: {
        getAll: { invalidate: vi.fn().mockResolvedValue(undefined) },
        getById: { invalidate: vi.fn().mockResolvedValue(undefined) },
      },
      project: { getAll: { invalidate: vi.fn().mockResolvedValue(undefined) } },
    }),
  },
}));

beforeEach(() => {
  mocks.pageZero = Array.from({ length: 100 }, (_, index) => buildTask(index + 1));
  mocks.pageOne = [buildTask(101)];
  mocks.fetching = false;
  mocks.taskInputs = [];
  mocks.changeTab = () => {};
});

describe('マイタスクのページ移動', () => {
  it('101件目へ進んで戻れる', () => {
    render(<MyTasksPage />);

    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.getByText('My Task 101')).toBeInTheDocument();
    expect(mocks.taskInputs.at(-1)).toMatchObject({ limit: 100, offset: 100 });

    fireEvent.click(screen.getByRole('button', { name: '前へ' }));
    expect(screen.getByText('My Task 1')).toBeInTheDocument();
    expect(mocks.taskInputs.at(-1)).toMatchObject({ limit: 100, offset: 0 });
  });

  it('100件ちょうどの次ページが空でも全体の空表示にしない', () => {
    mocks.pageOne = [];
    render(<MyTasksPage />);

    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    expect(screen.getByText('このページにはタスクがありません。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '前へ' })).toBeEnabled();
    expect(screen.queryByText('条件に合うタスクはありません')).not.toBeInTheDocument();
  });

  it('プロジェクト変更で1ページ目へ戻る', () => {
    render(<MyTasksPage />);
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'project-1' } });

    expect(mocks.taskInputs.at(-1)).toMatchObject({
      projectId: 'project-1',
      limit: 100,
      offset: 0,
    });
  });

  it('ステータス変更で1ページ目へ戻る', () => {
    render(<MyTasksPage />);
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    fireEvent.click(screen.getByRole('button', { name: '完了' }));

    expect(mocks.taskInputs.at(-1)).toMatchObject({ status: 'DONE', limit: 100, offset: 0 });
  });

  it('取得中は次ページへ移動できない', () => {
    mocks.fetching = true;
    render(<MyTasksPage />);

    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled();
  });
});
