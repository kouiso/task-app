// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportPage from './page';

const mocks = vi.hoisted(() => ({ query: vi.fn(), push: vi.fn(), refetch: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: () => null,
}));
vi.mock('@/trpc/react', () => ({
  api: { report: { getOverview: { useQuery: mocks.query } } },
}));

const overview = {
  totalTasks: 7,
  completionRate: 50,
  totalTimeSpent: 120,
  averageTimePerTask: 30,
  statusData: [],
  priorityData: [],
  projectStats: [],
};

function queryResult(status?: number, data: typeof overview | undefined = overview) {
  return {
    data,
    isLoading: false,
    isError: status !== undefined,
    isFetching: false,
    error: status === undefined ? null : { data: { httpStatus: status } },
    refetch: mocks.refetch,
  };
}

beforeEach(() => {
  mocks.query.mockReset();
  mocks.push.mockReset();
  mocks.refetch.mockReset();
  mocks.query.mockReturnValue(queryResult());
});

describe('レポート概要の取得エラー', () => {
  it('初回500を0件の成功として表示しない', () => {
    mocks.query.mockReturnValue({ ...queryResult(500), data: undefined });
    render(<ReportPage />);

    expect(screen.getByText('レポートを取得できませんでした')).toBeInTheDocument();
    expect(screen.queryByText('タスク数')).not.toBeInTheDocument();
  });

  it('再取得の500では直前のデータと警告を表示する', () => {
    mocks.query.mockReturnValue(queryResult(500));
    render(<ReportPage />);

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText(/最新のレポートを取得できませんでした/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it.each([
    [401, 'ログインの有効期限が切れました', 'ログイン画面へ', '/login'],
    [403, 'このレポートを見る権限がありません', 'プロジェクト一覧へ', '/project'],
  ] as const)('%sではキャッシュを隠して再取得しない', (status, message, button, route) => {
    mocks.query.mockReturnValue(queryResult(status));
    render(<ReportPage />);

    expect(screen.queryByText('タスク数')).not.toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(mocks.push).toHaveBeenCalledWith(route);
    expect(mocks.refetch).not.toHaveBeenCalled();

    const retry = mocks.query.mock.calls[0][1].retry;
    expect(retry(0, { data: { httpStatus: status } })).toBe(false);
  });
});
