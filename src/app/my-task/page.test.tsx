// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyTasksPage from '@/app/my-task/page';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  projects: vi.fn(),
  tasks: vi.fn(),
  push: vi.fn(),
  updateOptions: null as null | {
    onError?: (error: ErrorShape, variables: { id: string }) => void;
  },
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
  TaskDialog: ({
    open,
    initialData,
    projects,
  }: {
    open: boolean;
    initialData?: { title?: string; projectId?: string };
    projects: Array<{ id: string; name: string }>;
  }) =>
    open ? (
      <div>
        <p>編集中: {initialData?.title}</p>
        <p>現在のプロジェクト: {initialData?.projectId}</p>
        <div data-testid="task-dialog-projects">
          {projects.map((project) => (
            <span key={project.id}>{project.name}</span>
          ))}
        </div>
      </div>
    ) : null,
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
        useMutation: (options: {
          onError?: (error: ErrorShape, variables: { id: string }) => void;
        }) => {
          mocks.updateOptions = options;
          return { mutate: vi.fn() };
        },
      },
      delete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    useUtils: () => ({
      task: {
        getAll: { invalidate: vi.fn() },
        getById: { invalidate: vi.fn() },
      },
      project: { getAll: { invalidate: vi.fn() } },
    }),
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

  it('取得401を固定して全ページクエリを停止する', async () => {
    mocks.currentUser.mockReturnValue(queryResult(401, user));
    render(<MyTasksPage />);

    await waitFor(() => {
      expect(mocks.currentUser).toHaveBeenLastCalledWith(
        undefined,
        expect.objectContaining({ enabled: false }),
      );
      expect(mocks.projects).toHaveBeenLastCalledWith(
        undefined,
        expect.objectContaining({ enabled: false }),
      );
      expect(mocks.tasks).toHaveBeenLastCalledWith(
        expect.any(Object),
        expect.objectContaining({ enabled: false }),
      );
    });
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
      mocks.updateOptions?.onError?.(
        { data: { httpStatus: 500 }, message: '更新失敗' },
        { id: task.id },
      );
    });
    expect(screen.getByText('編集中: 前回取得したタスク')).toBeInTheDocument();
  });
});

describe('マイタスクの編集先プロジェクト', () => {
  it('編集権限のあるプロジェクトだけを候補にし、VIEWERを表示しない', () => {
    mocks.projects.mockReturnValue(
      queryResult(undefined, [
        { id: 'project-1', name: 'Owner Project', members: [{ userId: user.id, role: 'OWNER' }] },
        { id: 'project-2', name: 'Admin Project', members: [{ userId: user.id, role: 'ADMIN' }] },
        { id: 'project-3', name: 'Member Project', members: [{ userId: user.id, role: 'MEMBER' }] },
        { id: 'project-4', name: 'Viewer Project', members: [{ userId: user.id, role: 'VIEWER' }] },
      ]),
    );

    render(<MyTasksPage />);
    fireEvent.click(screen.getByRole('button', { name: '編集' }));

    const choices = within(screen.getByTestId('task-dialog-projects'));
    expect(choices.getByText('Owner Project')).toBeInTheDocument();
    expect(choices.getByText('Admin Project')).toBeInTheDocument();
    expect(choices.getByText('Member Project')).toBeInTheDocument();
    expect(choices.queryByText('Viewer Project')).not.toBeInTheDocument();
    expect(screen.getByText('現在のプロジェクト: project-1')).toBeInTheDocument();
  });
});

describe('マイタスクの日付グループ', () => {
  it('完了・キャンセル済みを期限グループから分け、未完了タスクの日付順を保つ', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    mocks.tasks.mockReturnValue(
      queryResult(undefined, [
        { ...task, id: 'active-past', title: '期限切れの作業', dueDate: yesterday },
        { ...task, id: 'active-today', title: '今日の作業', dueDate: today },
        { ...task, id: 'active-future', title: '今後の作業', dueDate: tomorrow },
        { ...task, id: 'active-undated', title: '期限なしの作業' },
        { ...task, id: 'done-past', title: '完了した作業', status: 'DONE', dueDate: yesterday },
        {
          ...task,
          id: 'cancelled-future',
          title: 'キャンセルした作業',
          status: 'CANCELLED',
          dueDate: tomorrow,
        },
      ]),
    );

    render(<MyTasksPage />);

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      '期限切れ (1)',
      '今日が期限 (1)',
      '今後の予定 (1)',
      '期限なし (1)',
      '完了済み (1)',
      'キャンセル済み (1)',
    ]);
    expect(screen.getByText('完了した作業')).toBeInTheDocument();
    expect(screen.getByText('キャンセルした作業')).toBeInTheDocument();
  });
});
