// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyTasksPage from './page';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  projects: vi.fn(),
  tasks: vi.fn(),
  push: vi.fn(),
  updateOptions: null as null | { onError?: (error: ErrorShape) => void },
}));

interface ErrorShape {
  data?: { httpStatus?: number };
  message?: string;
}

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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
    <div>
      <span>{title}</span>
      <button type="button" onClick={() => onEdit(id)}>
        編集
      </button>
    </div>
  ),
}));
vi.mock('@/component/task/task-dialog', () => ({
  TaskDialog: ({ open, initialData }: { open: boolean; initialData?: { title?: string } }) =>
    open ? <div>編集中: {initialData?.title}</div> : null,
}));
vi.mock('@/component/ui/delete-confirm-dialog', () => ({ DeleteConfirmDialog: () => null }));
vi.mock('@/component/ui/loading-spinner', () => ({ PageLoadingSpinner: () => <div>loading</div> }));
vi.mock('@/component/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));
vi.mock('@/component/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));
vi.mock('@/trpc/react', () => ({
  api: {
    auth: { getCurrentUser: { useQuery: mocks.currentUser } },
    project: { getAll: { useQuery: mocks.projects } },
    task: {
      getAll: { useQuery: mocks.tasks },
      update: {
        useMutation: (options: { onError?: (error: ErrorShape) => void }) => {
          mocks.updateOptions = options;
          return { mutate: vi.fn() };
        },
      },
      delete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    useUtils: () => ({ task: { getAll: { invalidate: vi.fn() } } }),
  },
}));

const user = { id: 'user-1' };
const task = {
  id: 'task-1',
  title: '前回取得したタスク',
  description: null,
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  assignee: null,
  assigneeId: 'user-1',
  estimatedHours: null,
  timeSpentMinutes: 0,
  projectId: 'project-1',
  updatedAt: new Date('2026-09-01T00:00:00.000Z'),
};
const projects = [
  { id: 'project-1', name: 'Project', members: [{ userId: 'user-1', role: 'OWNER' }] },
];

function queryResult(status?: number, data?: unknown) {
  return {
    data,
    isLoading: false,
    isError: status !== undefined,
    error:
      status === undefined ? null : { data: { httpStatus: status }, message: 'request failed' },
    refetch: vi.fn(),
  };
}

beforeEach(() => {
  mocks.currentUser.mockReturnValue(queryResult(undefined, user));
  mocks.projects.mockReturnValue(queryResult(undefined, projects));
  mocks.tasks.mockReturnValue(queryResult(undefined, [task]));
  mocks.push.mockReset();
  mocks.updateOptions = null;
});

describe('マイタスクの取得エラー', () => {
  it('初回500を空の成功として表示しない', () => {
    mocks.tasks.mockReturnValue(queryResult(500, undefined));
    render(<MyTasksPage />);

    expect(screen.queryByText('前回取得したタスク')).not.toBeInTheDocument();
    expect(screen.getByText('タスクを取得できませんでした')).toBeInTheDocument();
  });

  it('再取得の500では直前のタスクとフィルターを残す', () => {
    mocks.tasks.mockReturnValue(queryResult(500, [task]));
    render(<MyTasksPage />);

    expect(screen.getByText('前回取得したタスク')).toBeInTheDocument();
    expect(screen.getByText(/最新の情報を取得できませんでした/)).toBeInTheDocument();
    expect(screen.getByText('すべて')).toBeInTheDocument();
    expect(screen.getByText('すべてのプロジェクト')).toBeInTheDocument();
  });

  it.each([401, 403])('キャッシュがあっても%sなら保護データを隠す', (status) => {
    mocks.tasks.mockReturnValue(queryResult(status, [task]));
    render(<MyTasksPage />);

    expect(screen.queryByText('前回取得したタスク')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        status === 401 ? 'ログインの有効期限が切れました' : 'このデータを見る権限がありません',
      ),
    ).toBeInTheDocument();
  });

  it.each([401, 403])('別クエリが500でも%sを優先して保護データを隠す', (status) => {
    mocks.currentUser.mockReturnValue(queryResult(500, user));
    mocks.tasks.mockReturnValue(queryResult(status, [task]));
    render(<MyTasksPage />);

    expect(screen.queryByText('前回取得したタスク')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        status === 401 ? 'ログインの有効期限が切れました' : 'このデータを見る権限がありません',
      ),
    ).toBeInTheDocument();
  });

  it.each([401, 403])('プロジェクト一覧だけが%sでも保護データを隠す', (status) => {
    mocks.projects.mockReturnValue(queryResult(status, projects));
    render(<MyTasksPage />);
    expect(screen.queryByText('前回取得したタスク')).not.toBeInTheDocument();
    expect(screen.queryByText('Project')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        status === 401 ? 'ログインの有効期限が切れました' : 'このデータを見る権限がありません',
      ),
    ).toBeInTheDocument();
  });

  it('更新失敗後も編集中の入力元とダイアログを保持する', () => {
    render(<MyTasksPage />);
    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    expect(screen.getByText('編集中: 前回取得したタスク')).toBeInTheDocument();

    act(() => {
      mocks.updateOptions?.onError?.({ data: { httpStatus: 500 }, message: '更新失敗' });
    });
    expect(screen.getByText('編集中: 前回取得したタスク')).toBeInTheDocument();
  });
});
